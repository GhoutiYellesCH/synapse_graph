use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultConfigData {
    pub vault_path: String,
    pub color_groups: serde_json::Value,
    pub display_settings: serde_json::Value,
    pub force_settings: serde_json::Value,
    pub background_settings: serde_json::Value,
    pub orphan_filter: Option<String>,
    pub last_opened: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnippetInfo {
    pub filename: String,
    pub path: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskPluginInfo {
    pub filename: String,
    pub path: String,
    pub code: String,
}

pub fn get_app_config_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let base = PathBuf::from(home).join(".config").join("synapse-graph");
    
    // Ensure standard directories exist
    let _ = fs::create_dir_all(&base);
    let _ = fs::create_dir_all(base.join("plugins"));
    let _ = fs::create_dir_all(base.join("snippets"));
    let _ = fs::create_dir_all(base.join("vault_data"));

    // Populate initial sample snippet if none exists
    let sample_snippet = base.join("snippets").join("accent-glow.css");
    if !sample_snippet.exists() {
        let _ = fs::write(
            &sample_snippet,
            "/* Sample CSS Snippet: Custom Accent Glow */\n:root {\n  --accent-color: #38bdf8;\n  --node-selected: #00f0ff;\n}\n",
        );
    }

    // Populate initial sample plugin if none exists
    let sample_plugin = base.join("plugins").join("vault-node-badge.js");
    if !sample_plugin.exists() {
        let _ = fs::write(
            &sample_plugin,
            r#"// Synapse Graph Plugin: Vault Node Badges
context.registerInspectorPanel({
  id: 'disk-plugin-badge',
  title: '✨ Synapse Mod Active',
  render: (node) => {
    return React.createElement(
      'div',
      { style: { fontSize: '11px', color: '#10b981', padding: '4px' } },
      '🚀 Loaded from ~/.config/synapse-graph/plugins/'
    );
  }
});
"#,
        );
    }

    base
}

fn vault_path_to_filename(vault_path: &str) -> String {
    let mut safe = String::new();
    for c in vault_path.chars() {
        if c.is_alphanumeric() {
            safe.push(c);
        } else {
            safe.push('_');
        }
    }
    // Truncate to reasonable length if very long and append a simple hash
    if safe.len() > 80 {
        safe = safe[safe.len() - 80..].to_string();
    }
    let simple_hash: u64 = vault_path
        .bytes()
        .fold(0u64, |acc, b| acc.wrapping_mul(31).wrapping_add(b as u64));
    format!("{}_{:x}.json", safe, simple_hash)
}

pub fn load_vault_config_from_disk(vault_path: &str) -> Option<VaultConfigData> {
    let dir = get_app_config_dir().join("vault_data");
    let file = dir.join(vault_path_to_filename(vault_path));
    if !file.exists() {
        return None;
    }
    let content = fs::read_to_string(&file).ok()?;
    serde_json::from_str::<VaultConfigData>(&content).ok()
}

pub fn save_vault_config_to_disk(config: VaultConfigData) -> Result<(), String> {
    let dir = get_app_config_dir().join("vault_data");
    let _ = fs::create_dir_all(&dir);
    let file = dir.join(vault_path_to_filename(&config.vault_path));
    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize vault config: {}", e))?;
    fs::write(&file, json).map_err(|e| format!("Failed to write vault config: {}", e))
}

pub fn list_css_snippets_from_disk() -> Vec<SnippetInfo> {
    let dir = get_app_config_dir().join("snippets");
    let mut results = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("css") {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Some(filename) = path.file_name().and_then(|f| f.to_str()) {
                        results.push(SnippetInfo {
                            filename: filename.to_string(),
                            path: path.to_string_lossy().to_string(),
                            content,
                        });
                    }
                }
            }
        }
    }
    results.sort_by(|a, b| a.filename.cmp(&b.filename));
    results
}

pub fn write_css_snippet_to_disk(filename: &str, content: &str) -> Result<(), String> {
    let clean_name = if filename.ends_with(".css") {
        filename.to_string()
    } else {
        format!("{}.css", filename)
    };
    let file = get_app_config_dir().join("snippets").join(clean_name);
    fs::write(&file, content).map_err(|e| format!("Failed to save snippet: {}", e))
}

pub fn delete_css_snippet_from_disk(filename: &str) -> Result<(), String> {
    let file = get_app_config_dir().join("snippets").join(filename);
    if file.exists() {
        fs::remove_file(&file).map_err(|e| format!("Failed to delete snippet: {}", e))?;
    }
    Ok(())
}

pub fn list_disk_plugins_from_disk() -> Vec<DiskPluginInfo> {
    let dir = get_app_config_dir().join("plugins");
    let mut results = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("js") {
                if let Ok(code) = fs::read_to_string(&path) {
                    if let Some(filename) = path.file_name().and_then(|f| f.to_str()) {
                        results.push(DiskPluginInfo {
                            filename: filename.to_string(),
                            path: path.to_string_lossy().to_string(),
                            code,
                        });
                    }
                }
            }
        }
    }
    results.sort_by(|a, b| a.filename.cmp(&b.filename));
    results
}

pub fn write_disk_plugin_to_disk(filename: &str, code: &str) -> Result<(), String> {
    let clean_name = if filename.ends_with(".js") {
        filename.to_string()
    } else {
        format!("{}.js", filename)
    };
    let file = get_app_config_dir().join("plugins").join(clean_name);
    fs::write(&file, code).map_err(|e| format!("Failed to save plugin: {}", e))
}

pub fn delete_disk_plugin_from_disk(filename: &str) -> Result<(), String> {
    let file = get_app_config_dir().join("plugins").join(filename);
    if file.exists() {
        fs::remove_file(&file).map_err(|e| format!("Failed to delete plugin: {}", e))?;
    }
    Ok(())
}
