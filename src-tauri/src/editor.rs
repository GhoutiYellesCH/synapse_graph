use std::path::Path;
use std::process::Command;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct AvailableEditors {
    pub second_brain: bool,
    pub nvim: bool,
    pub code: bool,
    pub emacs: bool,
    pub kitty: bool,
    pub xterm: bool,
    pub xdg_open: bool,
}

pub fn check_available_editors() -> AvailableEditors {
    let home = std::env::var("HOME").unwrap_or_default();
    let local_sb = format!("{}/.local/bin/second-brain", home);
    let second_brain = which_check("second-brain") || Path::new(&local_sb).exists();

    AvailableEditors {
        second_brain,
        nvim: which_check("nvim"),
        code: which_check("code"),
        emacs: which_check("emacs") || which_check("emacsclient"),
        kitty: which_check("kitty"),
        xterm: which_check("xterm"),
        xdg_open: which_check("xdg-open"),
    }
}

fn which_check(cmd: &str) -> bool {
    Command::new("which")
        .arg(cmd)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn open_note(
    file_path: &str,
    vault_path: &str,
    editor: &str,
    custom_cmd: Option<&str>,
) -> Result<(), String> {
    let path = Path::new(file_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    match editor {
        "second-brain" | "secondbrain" => {
            let home = std::env::var("HOME").unwrap_or_default();
            let local_sb = format!("{}/.local/bin/second-brain", home);
            let bin = if which_check("second-brain") {
                "second-brain".to_string()
            } else if Path::new(&local_sb).exists() {
                local_sb
            } else {
                "second-brain".to_string()
            };

            Command::new(&bin)
                .args([vault_path, file_path])
                .spawn()
                .map_err(|e| format!("Failed to launch Second Brain ('{}'): {}", bin, e))?;
            Ok(())
        }
        "nvim" | "neovim" => {
            // Check terminal emulator preference: kitty > alacritty > xterm > gnome-terminal
            if which_check("kitty") {
                Command::new("kitty")
                    .args(["-e", "nvim", file_path])
                    .spawn()
                    .map_err(|e| format!("Failed to launch nvim in kitty: {}", e))?;
            } else if which_check("xterm") {
                Command::new("xterm")
                    .args(["-e", "nvim", file_path])
                    .spawn()
                    .map_err(|e| format!("Failed to launch nvim in xterm: {}", e))?;
            } else if which_check("gnome-terminal") {
                Command::new("gnome-terminal")
                    .args(["--", "nvim", file_path])
                    .spawn()
                    .map_err(|e| format!("Failed to launch nvim in gnome-terminal: {}", e))?;
            } else if which_check("alacritty") {
                Command::new("alacritty")
                    .args(["-e", "nvim", file_path])
                    .spawn()
                    .map_err(|e| format!("Failed to launch nvim in alacritty: {}", e))?;
            } else {
                // Try nvim-qt or direct command
                Command::new("nvim")
                    .arg(file_path)
                    .spawn()
                    .map_err(|e| format!("Failed to spawn nvim: {}", e))?;
            }
            Ok(())
        }
        "code" | "vscode" => {
            Command::new("code")
                .args(["--reuse-window", file_path])
                .spawn()
                .map_err(|e| format!("Failed to launch VS Code: {}", e))?;
            Ok(())
        }
        "emacs" => {
            if which_check("emacsclient") {
                // Try emacsclient first (no wait)
                if Command::new("emacsclient")
                    .args(["-n", file_path])
                    .spawn()
                    .is_ok()
                {
                    return Ok(());
                }
            }
            Command::new("emacs")
                .arg(file_path)
                .spawn()
                .map_err(|e| format!("Failed to launch Emacs: {}", e))?;
            Ok(())
        }
        "system" | "default" => {
            Command::new("xdg-open")
                .arg(file_path)
                .spawn()
                .map_err(|e| format!("Failed to launch default viewer: {}", e))?;
            Ok(())
        }
        "custom" => {
            let tmpl = custom_cmd.unwrap_or("").trim();
            if tmpl.is_empty() {
                return Err("Custom command is empty".to_string());
            }

            let full_cmd = tmpl
                .replace("{file}", file_path)
                .replace("{vault}", vault_path);

            Command::new("sh")
                .args(["-c", &full_cmd])
                .spawn()
                .map_err(|e| format!("Failed to run custom command '{}': {}", full_cmd, e))?;
            Ok(())
        }
        _ => Err(format!("Unknown editor type: {}", editor)),
    }
}

pub fn reveal_in_file_manager(path_str: &str) -> Result<(), String> {
    let path = Path::new(path_str);
    let target = if path.is_file() {
        path.parent().unwrap_or(path)
    } else {
        path
    };

    Command::new("xdg-open")
        .arg(target)
        .spawn()
        .map_err(|e| format!("Failed to open file manager: {}", e))?;
    Ok(())
}
