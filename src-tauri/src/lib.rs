mod editor;
mod graph;

use editor::{check_available_editors, open_note, reveal_in_file_manager, AvailableEditors};
use graph::{scan_vault, GraphData, ScanOptions};
use std::fs;

#[tauri::command]
fn scan_vault_command(vault_path: String, options: Option<ScanOptions>) -> Result<GraphData, String> {
    let opts = options.unwrap_or_default();
    scan_vault(&vault_path, opts)
}

#[tauri::command]
fn read_note_content(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn open_in_editor_command(
    file_path: String,
    vault_path: String,
    editor: String,
    custom_cmd: Option<String>,
) -> Result<(), String> {
    open_note(&file_path, &vault_path, &editor, custom_cmd.as_deref())
}

#[tauri::command]
fn open_vault_command(
    vault_path: String,
    editor: String,
    custom_cmd: Option<String>,
) -> Result<(), String> {
    open_note(&vault_path, &vault_path, &editor, custom_cmd.as_deref())
}

#[tauri::command]
fn get_available_editors_command() -> AvailableEditors {
    check_available_editors()
}

#[tauri::command]
fn reveal_path_command(path: String) -> Result<(), String> {
    reveal_in_file_manager(&path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_vault_command,
            read_note_content,
            open_in_editor_command,
            open_vault_command,
            get_available_editors_command,
            reveal_path_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
