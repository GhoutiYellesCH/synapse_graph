mod config;
mod editor;
mod graph;
mod semantic;

use base64::Engine;
use config::{
    delete_css_snippet_from_disk, delete_disk_plugin_from_disk, get_app_config_dir,
    list_css_snippets_from_disk, list_disk_plugins_from_disk, load_vault_config_from_disk,
    save_vault_config_to_disk, write_css_snippet_to_disk, write_disk_plugin_to_disk,
    DiskPluginInfo, SnippetInfo, VaultConfigData,
};
use editor::{check_available_editors, open_note, reveal_in_file_manager, AvailableEditors};
use graph::{scan_vault, GraphData, ScanOptions};
use semantic::{query_antigravity, AntigravityAiResult};
use std::fs;
use std::path::Path;

#[tauri::command]
fn get_cli_vault_path_command() -> Option<String> {
    let args: Vec<String> = std::env::args().collect();
    let mut i = 1;
    while i < args.len() {
        let arg = &args[i];
        if (arg == "-v" || arg == "--vault") && i + 1 < args.len() {
            let candidate = &args[i + 1];
            let p = Path::new(candidate);
            if p.is_dir() {
                return Some(
                    p.canonicalize()
                        .unwrap_or(p.to_path_buf())
                        .to_string_lossy()
                        .to_string(),
                );
            }
        } else if !arg.starts_with('-') {
            let p = Path::new(arg);
            if p.is_dir() {
                return Some(
                    p.canonicalize()
                        .unwrap_or(p.to_path_buf())
                        .to_string_lossy()
                        .to_string(),
                );
            }
        }
        i += 1;
    }
    None
}

#[tauri::command]
fn read_image_base64_command(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| format!("Failed to read image file: {}", e))?;
    let ext = Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        _ => "image/png",
    };
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

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

// Config & Persistence Commands
#[tauri::command]
fn get_config_dir_command() -> String {
    get_app_config_dir().to_string_lossy().to_string()
}

#[tauri::command]
fn load_vault_config_command(vault_path: String) -> Option<VaultConfigData> {
    load_vault_config_from_disk(&vault_path)
}

#[tauri::command]
fn save_vault_config_command(config: VaultConfigData) -> Result<(), String> {
    save_vault_config_to_disk(config)
}

#[tauri::command]
fn list_css_snippets_command() -> Vec<SnippetInfo> {
    list_css_snippets_from_disk()
}

#[tauri::command]
fn write_css_snippet_command(filename: String, content: String) -> Result<(), String> {
    write_css_snippet_to_disk(&filename, &content)
}

#[tauri::command]
fn delete_css_snippet_command(filename: String) -> Result<(), String> {
    delete_css_snippet_from_disk(&filename)
}

#[tauri::command]
fn list_disk_plugins_command() -> Vec<DiskPluginInfo> {
    list_disk_plugins_from_disk()
}

#[tauri::command]
fn write_disk_plugin_command(filename: String, code: String) -> Result<(), String> {
    write_disk_plugin_to_disk(&filename, &code)
}

#[tauri::command]
fn delete_disk_plugin_command(filename: String) -> Result<(), String> {
    delete_disk_plugin_from_disk(&filename)
}

#[tauri::command]
fn open_config_folder_command() -> Result<(), String> {
    let dir = get_app_config_dir();
    reveal_in_file_manager(&dir.to_string_lossy())
}

#[tauri::command]
fn run_antigravity_query_command(
    vault_path: String,
    query: String,
    vault_notes_summary: Option<String>,
) -> Result<AntigravityAiResult, String> {
    let summary = vault_notes_summary.unwrap_or_default();
    query_antigravity(&vault_path, &query, &summary)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|a| a == "-h" || a == "--help") {
        println!("Synapse Graph - Standalone High-Performance Knowledge Graph Visualizer");
        println!("Developer: Ghouti Yelles Chaouche");
        println!();
        println!("Usage: synapse-graph [OPTIONS] [VAULT_PATH]");
        println!();
        println!("Arguments:");
        println!("  [VAULT_PATH]        Path to any folder to open immediately as a Markdown vault");
        println!();
        println!("Options:");
        println!("  -v, --vault <PATH>  Specify the vault folder directory");
        println!("  -h, --help          Print this help message");
        println!();
        println!("Config directory: ~/.config/synapse-graph/");
        println!("  - Plugins: ~/.config/synapse-graph/plugins/");
        println!("  - Snippets: ~/.config/synapse-graph/snippets/");
        println!("  - Vault Data: ~/.config/synapse-graph/vault_data/");
        println!();
        return;
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_cli_vault_path_command,
            read_image_base64_command,
            scan_vault_command,
            read_note_content,
            open_in_editor_command,
            open_vault_command,
            get_available_editors_command,
            reveal_path_command,
            get_config_dir_command,
            load_vault_config_command,
            save_vault_config_command,
            list_css_snippets_command,
            write_css_snippet_command,
            delete_css_snippet_command,
            list_disk_plugins_command,
            write_disk_plugin_command,
            delete_disk_plugin_command,
            open_config_folder_command,
            run_antigravity_query_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running synapse-graph");
}
