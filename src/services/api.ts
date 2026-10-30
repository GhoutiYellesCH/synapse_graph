import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { AvailableEditors, EditorType, GraphData, ScanOptions } from '../types';

export async function pickVaultFolder(): Promise<string | null> {
  try {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: 'Select Obsidian Vault Folder',
    });

    if (typeof selected === 'string') {
      return selected;
    }
    return null;
  } catch (err) {
    console.error('Failed to open directory dialog:', err);
    return null;
  }
}

export async function scanVault(vaultPath: string, options?: ScanOptions): Promise<GraphData> {
  return await invoke<GraphData>('scan_vault_command', {
    vaultPath,
    options: options || {
      include_non_markdown: false,
      include_ghost_nodes: false,
    },
  });
}

export async function readNoteContent(filePath: string): Promise<string> {
  return await invoke<string>('read_note_content', { path: filePath });
}

export async function openInEditor(
  filePath: string,
  vaultPath: string,
  editor: EditorType,
  customCmd?: string
): Promise<void> {
  return await invoke<void>('open_in_editor_command', {
    filePath,
    vaultPath,
    editor,
    customCmd: customCmd || null,
  });
}

export async function openVaultInEditor(
  vaultPath: string,
  editor: EditorType,
  customCmd?: string
): Promise<void> {
  return await invoke<void>('open_vault_command', {
    vaultPath,
    editor,
    customCmd: customCmd || null,
  });
}

export async function getAvailableEditors(): Promise<AvailableEditors> {
  return await invoke<AvailableEditors>('get_available_editors_command');
}

export async function revealPath(path: string): Promise<void> {
  return await invoke<void>('reveal_path_command', { path });
}

export async function getCliVaultPath(): Promise<string | null> {
  try {
    return await invoke<string | null>('get_cli_vault_path_command');
  } catch (err) {
    console.error('Failed to get CLI vault path:', err);
    return null;
  }
}

export async function readImageBase64(path: string): Promise<string> {
  return await invoke<string>('read_image_base64_command', { path });
}

export async function pickImageFile(): Promise<string | null> {
  try {
    const selected = await openDialog({
      directory: false,
      multiple: false,
      title: 'Select Background Image',
      filters: [
        {
          name: 'Image Files',
          extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'],
        },
      ],
    });

    if (typeof selected === 'string') {
      return selected;
    }
    return null;
  } catch (err) {
    console.error('Failed to open image dialog:', err);
    return null;
  }
}

import { DiskPluginInfo, SnippetInfo, VaultConfigData } from '../types';

export async function getAppConfigDir(): Promise<string> {
  return await invoke<string>('get_config_dir_command');
}

export async function loadVaultConfig(vaultPath: string): Promise<VaultConfigData | null> {
  return await invoke<VaultConfigData | null>('load_vault_config_command', { vaultPath });
}

export async function saveVaultConfig(config: VaultConfigData): Promise<void> {
  return await invoke<void>('save_vault_config_command', { config });
}

export async function listCssSnippets(): Promise<SnippetInfo[]> {
  return await invoke<SnippetInfo[]>('list_css_snippets_command');
}

export async function writeCssSnippet(filename: string, content: string): Promise<void> {
  return await invoke<void>('write_css_snippet_command', { filename, content });
}

export async function deleteCssSnippet(filename: string): Promise<void> {
  return await invoke<void>('delete_css_snippet_command', { filename });
}

export async function listDiskPlugins(): Promise<DiskPluginInfo[]> {
  return await invoke<DiskPluginInfo[]>('list_disk_plugins_command');
}

export async function writeDiskPlugin(filename: string, code: string): Promise<void> {
  return await invoke<void>('write_disk_plugin_command', { filename, code });
}

export async function deleteDiskPlugin(filename: string): Promise<void> {
  return await invoke<void>('delete_disk_plugin_command', { filename });
}

export async function openConfigFolder(): Promise<void> {
  return await invoke<void>('open_config_folder_command');
}

import { AntigravityAiResult } from '../types';

export async function runAntigravityQuery(
  vaultPath: string,
  query: string,
  vaultNotesSummary?: string
): Promise<AntigravityAiResult> {
  return await invoke<AntigravityAiResult>('run_antigravity_query_command', {
    vaultPath,
    query,
    vaultNotesSummary: vaultNotesSummary || null,
  });
}
