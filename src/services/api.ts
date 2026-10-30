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
