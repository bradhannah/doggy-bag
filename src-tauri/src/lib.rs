// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// TODO: Phase 3 - Implement start_bun_sidecar command
// 1. Import shell plugin: use tauri_plugin_shell::ShellExt;
// 2. Import event handling: use tauri_plugin_shell::process::CommandEvent;
// 3. Add async command to spawn Bun sidecar from src-tauri/binaries/bun-sidecar
// 4. Download Bun binaries using: ./scripts/prepare-sidecar.sh
// 5. Add start_bun_sidecar to invoke_handler below
// 6. Update src-tauri/capabilities/default.json with shell permissions
// 7. Test with: npm run tauri build (production build)

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
