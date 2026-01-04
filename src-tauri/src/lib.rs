// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use tauri::Emitter;
use tauri::Manager;
use tauri::RunEvent;
use std::path::PathBuf;
use std::sync::Mutex;

// Global state to track the sidecar process PID and port
struct SidecarState {
    pid: Option<u32>,
    port: Option<u16>,
}

impl Default for SidecarState {
    fn default() -> Self {
        Self { pid: None, port: None }
    }
}

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
//
// Phase 4: Auto-start sidecar on app launch:
// - Added read_saved_data_dir() to read from Tauri Store
// - Added relaunch_app command for restart after migration
// - Added .setup() hook to auto-start sidecar with saved data directory

/// Helper to read saved data directory from Tauri Store
/// Returns None if no setting saved or on any error
fn read_saved_data_dir(app: &tauri::AppHandle) -> Option<String> {
    let config_dir = match app.path().app_config_dir() {
        Ok(dir) => dir,
        Err(e) => {
            println!("[Tauri] Failed to get app_config_dir: {:?}", e);
            return None;
        }
    };
    let store_path = config_dir.join("settings.json");
    
    println!("[Tauri] Looking for settings at: {:?}", store_path);
    
    if !store_path.exists() {
        println!("[Tauri] Settings file does not exist");
        return None;
    }
    
    let content = match std::fs::read_to_string(&store_path) {
        Ok(c) => c,
        Err(e) => {
            println!("[Tauri] Failed to read settings file: {:?}", e);
            return None;
        }
    };
    
    println!("[Tauri] Settings file content: {}", content);
    
    let json: serde_json::Value = match serde_json::from_str(&content) {
        Ok(j) => j,
        Err(e) => {
            println!("[Tauri] Failed to parse settings JSON: {:?}", e);
            return None;
        }
    };
    
    let data_dir = json.get("dataDirectory")?.as_str().map(|s| s.to_string());
    println!("[Tauri] Read dataDirectory: {:?}", data_dir);
    data_dir
}

/// Relaunch the app (used after data directory migration)
#[tauri::command]
fn relaunch_app(app: tauri::AppHandle) {
    app.restart();
}

/// Open the WebView devtools (Debug Mode)
/// This opens the browser developer tools for the WebView
#[tauri::command]
fn open_devtools(app: tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main")
        .ok_or("Could not find main window")?;
    window.open_devtools();
    Ok(())
}

/// Close the WebView devtools
#[tauri::command]
fn close_devtools(app: tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main")
        .ok_or("Could not find main window")?;
    window.close_devtools();
    Ok(())
}

/// Check if devtools is currently open
#[tauri::command]
fn is_devtools_open(app: tauri::AppHandle) -> Result<bool, String> {
    let window = app.get_webview_window("main")
        .ok_or("Could not find main window")?;
    Ok(window.is_devtools_open())
}

/// Toggle the WebView devtools (open if closed, close if open)
#[tauri::command]
fn toggle_devtools(app: tauri::AppHandle) -> Result<bool, String> {
    let window = app.get_webview_window("main")
        .ok_or("Could not find main window")?;
    
    if window.is_devtools_open() {
        window.close_devtools();
        Ok(false) // devtools is now closed
    } else {
        window.open_devtools();
        Ok(true) // devtools is now open
    }
}

/// Get the current sidecar port (if running)
/// Returns the port number or None if sidecar not ready
#[tauri::command]
fn get_sidecar_port(app: tauri::AppHandle) -> Option<u16> {
    let state = app.state::<Mutex<SidecarState>>();
    let state_guard = state.lock().unwrap();
    state_guard.port
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

/// Internal function to start the Bun sidecar
/// Used by both the command and the setup hook
async fn start_bun_sidecar_internal(app: &tauri::AppHandle, data_dir: Option<String>) -> Result<String, String> {
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
    // 
    // In dev mode: The sidecar is the Bun runtime, needs "run server.ts" args
    // In production: The sidecar is a compiled binary with embedded code, no args needed
    //
    // We detect dev mode by checking if resource_dir contains "target/debug" or "target/release"
    // (when running via `cargo run` or `tauri dev`)
    let resource_dir = app.path().resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;
    
    let is_dev_mode = resource_dir.to_string_lossy().contains("target/debug") 
        || resource_dir.to_string_lossy().contains("target/release");
    
    let sidecar_command = if is_dev_mode {
        // Dev mode: Use Bun runtime with script path
        // Go up from target/debug to project root, then to api/server.ts
        let server_script = resource_dir
            .parent() // target
            .and_then(|p| p.parent()) // src-tauri
            .and_then(|p| p.parent()) // project root
            .map(|p| p.join("api").join("server.ts"))
            .unwrap_or_else(|| PathBuf::from("api/server.ts"));
        
        println!("[Tauri] Dev mode: running Bun with script {:?}", server_script);
        
        app.shell()
            .sidecar("bun-sidecar")
            .map_err(|e| format!("Failed to create sidecar command: {}", e))?
            .args(["run", server_script.to_str().unwrap_or("api/server.ts")])
            .env("DATA_DIR", &effective_data_dir)
    } else {
        // Production mode: Sidecar is a compiled binary with embedded code
        // Just run it directly, no arguments needed
        println!("[Tauri] Production mode: running compiled sidecar binary");
        
        app.shell()
            .sidecar("bun-sidecar")
            .map_err(|e| format!("Failed to create sidecar command: {}", e))?
            .env("DATA_DIR", &effective_data_dir)
    };

    let (mut rx, child) = sidecar_command
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    // Store the PID in app state
    let pid = child.pid();
    {
        let state = app.state::<Mutex<SidecarState>>();
        let mut state_guard = state.lock().unwrap();
        state_guard.pid = Some(pid);
    }

    let app_clone = app.clone();
    let app_for_port = app.clone();
    let data_dir_for_log = effective_data_dir.clone();

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    
                    // Check if this is the PORT=XXXX line from the backend
                    if line.starts_with("PORT=") {
                        if let Ok(port) = line[5..].trim().parse::<u16>() {
                            println!("[Tauri] Captured backend port: {}", port);
                            
                            // Store port in state
                            {
                                let state = app_for_port.state::<Mutex<SidecarState>>();
                                let mut state_guard = state.lock().unwrap();
                                state_guard.port = Some(port);
                            }
                            
                            // Don't emit sidecar-ready yet - wait for health check
                            // The port will be used by the health check loop
                        }
                    }
                    
                    let _ = app_clone.emit("bun-sidecar-output", Some(format!("{}", line)));
                }
                CommandEvent::Stderr(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    let _ = app_clone.emit("bun-sidecar-error", Some(format!("{}", line)));
                }
                CommandEvent::Terminated(payload) => {
                    let _ = app_clone.emit("bun-sidecar-exited", Some(format!("Exit code: {:?}", payload.code)));
                    // Clear PID and port when process exits
                    let state = app_clone.state::<Mutex<SidecarState>>();
                    let mut state_guard = state.lock().unwrap();
                    state_guard.pid = None;
                    state_guard.port = None;
                }
                _ => {}
            }
        }
    });

    Ok(format!("Bun sidecar started with DATA_DIR={} (PID: {})", data_dir_for_log, pid))
}

/// Start the Bun sidecar with an optional data directory
/// If data_dir is not provided, uses the default ~/Documents/BudgetForFun/
#[tauri::command]
async fn start_bun_sidecar(app: tauri::AppHandle, data_dir: Option<String>) -> Result<String, String> {
    start_bun_sidecar_internal(&app, data_dir).await
}

/// Stop the running Bun sidecar
#[tauri::command]
async fn stop_bun_sidecar(app: tauri::AppHandle) -> Result<String, String> {
    let pid = {
        let state = app.state::<Mutex<SidecarState>>();
        let state_guard = state.lock().unwrap();
        state_guard.pid
    };
    
    match pid {
        Some(pid) => {
            // Kill the process using system command
            #[cfg(unix)]
            {
                std::process::Command::new("kill")
                    .arg("-9")
                    .arg(pid.to_string())
                    .output()
                    .map_err(|e| format!("Failed to kill sidecar: {}", e))?;
            }
            #[cfg(windows)]
            {
                std::process::Command::new("taskkill")
                    .arg("/F")
                    .arg("/PID")
                    .arg(pid.to_string())
                    .output()
                    .map_err(|e| format!("Failed to kill sidecar: {}", e))?;
            }
            
            // Clear the PID
            {
                let state = app.state::<Mutex<SidecarState>>();
                let mut state_guard = state.lock().unwrap();
                state_guard.pid = None;
            }
            
            Ok(format!("Sidecar stopped (PID: {})", pid))
        }
        None => Ok("No sidecar running".to_string())
    }
}

/// Restart the Bun sidecar with a new data directory
#[tauri::command]
async fn restart_bun_sidecar(app: tauri::AppHandle, data_dir: Option<String>) -> Result<String, String> {
    // Stop the current sidecar
    let stop_result = stop_bun_sidecar(app.clone()).await?;
    let _ = app.emit("bun-sidecar-output", Some(format!("{}", stop_result)));
    
    // Wait a bit for the port to be released
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    
    // Start with new data directory
    start_bun_sidecar(app, data_dir).await
}

/// Kill the sidecar process synchronously (used during app shutdown)
fn kill_sidecar_sync(app: &tauri::AppHandle) {
    let pid = {
        let state = app.state::<Mutex<SidecarState>>();
        let state_guard = state.lock().unwrap();
        state_guard.pid
    };
    
    if let Some(pid) = pid {
        println!("[Tauri] Shutting down sidecar (PID: {})...", pid);
        
        #[cfg(unix)]
        {
            // First try graceful SIGTERM
            let _ = std::process::Command::new("kill")
                .arg("-15")  // SIGTERM for graceful shutdown
                .arg(pid.to_string())
                .output();
            
            // Give it a moment to shut down gracefully
            std::thread::sleep(std::time::Duration::from_millis(100));
            
            // Then force kill if still running
            let _ = std::process::Command::new("kill")
                .arg("-9")  // SIGKILL for force kill
                .arg(pid.to_string())
                .output();
        }
        
        #[cfg(windows)]
        {
            let _ = std::process::Command::new("taskkill")
                .arg("/F")
                .arg("/PID")
                .arg(pid.to_string())
                .output();
        }
        
        println!("[Tauri] Sidecar terminated");
        
        // Clear the state
        let state = app.state::<Mutex<SidecarState>>();
        let mut state_guard = state.lock().unwrap();
        state_guard.pid = None;
        state_guard.port = None;
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .manage(Mutex::new(SidecarState::default()))
        .invoke_handler(tauri::generate_handler![
            start_bun_sidecar,
            stop_bun_sidecar,
            restart_bun_sidecar,
            get_default_data_dir,
            get_config_dir,
            get_sidecar_port,
            relaunch_app,
            open_devtools,
            close_devtools,
            is_devtools_open,
            toggle_devtools
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // Spawn async task to start sidecar
            tauri::async_runtime::spawn(async move {
                // Read saved directory or use default
                let data_dir = read_saved_data_dir(&app_handle)
                    .or_else(|| {
                        dirs::home_dir()
                            .map(|h| h.join("Documents").join("BudgetForFun"))
                            .and_then(|p| p.to_str().map(|s| s.to_string()))
                    });
                
                println!("[Tauri Setup] Starting sidecar with data_dir: {:?}", data_dir);
                
                // Start the sidecar
                match start_bun_sidecar_internal(&app_handle, data_dir.clone()).await {
                    Ok(msg) => {
                        println!("[Tauri Setup] {}", msg);
                        
                        // Wait for the backend to be ready (health check with dynamic port)
                        let mut attempts = 0;
                        let max_attempts = 30; // 30 * 200ms = 6 seconds max wait
                        
                        loop {
                            attempts += 1;
                            
                            // Read port from state (set by stdout handler when it sees PORT=XXXX)
                            let port = {
                                let state = app_handle.state::<Mutex<SidecarState>>();
                                let state_guard = state.lock().unwrap();
                                state_guard.port
                            };
                            
                            match port {
                                Some(port) => {
                                    // Try to reach the health endpoint on the dynamic port
                                    let health_url = format!("http://localhost:{}/api/health", port);
                                    match reqwest::get(&health_url).await {
                                        Ok(response) if response.status().is_success() => {
                                            println!("[Tauri Setup] Backend is ready on port {} after {} attempts", port, attempts);
                                            // Emit sidecar-ready WITH the port number
                                            let _ = app_handle.emit("sidecar-ready", port);
                                            break;
                                        }
                                        _ => {
                                            if attempts >= max_attempts {
                                                println!("[Tauri Setup] Backend health check timed out after {} attempts", attempts);
                                                let _ = app_handle.emit("sidecar-error", "Backend failed to respond to health check");
                                                break;
                                            }
                                            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
                                        }
                                    }
                                }
                                None => {
                                    // Port not yet captured from stdout
                                    if attempts >= max_attempts {
                                        println!("[Tauri Setup] Backend port capture timed out after {} attempts", attempts);
                                        let _ = app_handle.emit("sidecar-error", "Backend failed to report port");
                                        break;
                                    }
                                    tokio::time::sleep(std::time::Duration::from_millis(200)).await;
                                }
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("[Tauri Setup] Failed to start sidecar: {}", e);
                        let _ = app_handle.emit("sidecar-error", e);
                    }
                }
            });
            
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                RunEvent::Exit => {
                    // App is exiting - kill the sidecar process
                    println!("[Tauri] App exiting, cleaning up sidecar...");
                    kill_sidecar_sync(app_handle);
                }
                RunEvent::ExitRequested { api, .. } => {
                    // Could use api.prevent_exit() here if we wanted to confirm
                    // For now, just let it proceed
                    let _ = api;
                }
                _ => {}
            }
        });
}
