// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use tauri::Emitter;
use tauri::Manager;
use std::path::PathBuf;

// Sidecar Setup (Phase 3 Implementation):
// 1. Bun binary downloaded to src-tauri/binaries/bun-sidecar-aarch64-apple-darwin
// 2. externalBin configured in src-tauri/tauri.conf.json
// 3. Shell permissions added in src-tauri/capabilities/default.json
// 4. Sidecar spawns Bun process and emits events to frontend
// 5. Test with: invoke('start_bun_sidecar') in Tauri window
//
// Phase 3.5: Configurable Data Storage:
// - Added tauri-plugin-store for persistent settings
// - Added tauri-plugin-dialog for native folder picker
// - Added tauri-plugin-fs for file system operations
// - Modified start_bun_sidecar to accept data_dir parameter

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Get the default data directory path
/// Returns ~/Documents/BudgetForFun/ for production use
#[tauri::command]
fn get_default_data_dir() -> Result<String, String> {
    let home = dirs::home_dir()
        .ok_or("Could not determine home directory")?;
    let data_dir = home.join("Documents").join("BudgetForFun");
    data_dir.to_str()
        .map(|s| s.to_string())
        .ok_or("Invalid path encoding".to_string())
}

/// Get the app's configuration directory (for storing settings)
/// This is separate from the data directory and is NOT synced to cloud
#[tauri::command]
fn get_config_dir(app: tauri::AppHandle) -> Result<String, String> {
    let config_dir = app.path().app_config_dir()
        .map_err(|e| format!("Could not get config dir: {}", e))?;
    config_dir.to_str()
        .map(|s| s.to_string())
        .ok_or("Invalid path encoding".to_string())
}

/// Start the Bun sidecar with an optional data directory
/// If data_dir is not provided, uses the default ~/Documents/BudgetForFun/
#[tauri::command]
async fn start_bun_sidecar(app: tauri::AppHandle, data_dir: Option<String>) -> Result<String, String> {
    // Determine the data directory to use
    let effective_data_dir = match data_dir {
        Some(dir) if !dir.is_empty() => dir,
        _ => {
            // Use default ~/Documents/BudgetForFun/
            let home = dirs::home_dir()
                .ok_or("Could not determine home directory")?;
            let default_dir = home.join("Documents").join("BudgetForFun");
            default_dir.to_str()
                .ok_or("Invalid path encoding")?
                .to_string()
        }
    };

    // Ensure the data directory exists
    let data_path = PathBuf::from(&effective_data_dir);
    if !data_path.exists() {
        std::fs::create_dir_all(&data_path)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }
    
    // Also ensure subdirectories exist
    let entities_dir = data_path.join("entities");
    let months_dir = data_path.join("months");
    if !entities_dir.exists() {
        std::fs::create_dir_all(&entities_dir)
            .map_err(|e| format!("Failed to create entities directory: {}", e))?;
    }
    if !months_dir.exists() {
        std::fs::create_dir_all(&months_dir)
            .map_err(|e| format!("Failed to create months directory: {}", e))?;
    }

    // Create sidecar command with DATA_DIR environment variable
    let sidecar_command = app
        .shell()
        .sidecar("bun-sidecar")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .env("DATA_DIR", &effective_data_dir);

    let (mut rx, mut _child) = sidecar_command
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    let app_clone = app.clone();
    let data_dir_for_log = effective_data_dir.clone();

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    let _ = app_clone.emit("bun-sidecar-output", Some(format!("{}", line)));
                }
                CommandEvent::Stderr(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    let _ = app_clone.emit("bun-sidecar-error", Some(format!("{}", line)));
                }
                CommandEvent::Terminated(payload) => {
                    let _ = app_clone.emit("bun-sidecar-exited", Some(format!("Exit code: {:?}", payload.code)));
                }
                _ => {}
            }
        }
    });

    Ok(format!("Bun sidecar started with DATA_DIR={}", data_dir_for_log))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            start_bun_sidecar,
            get_default_data_dir,
            get_config_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
