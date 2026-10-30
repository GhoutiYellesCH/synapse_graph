import React from 'react';
import {
  FolderOpen,
  RefreshCw,
  Settings,
  Terminal,
  ExternalLink,
  Code,
  FileText,
  Unlink,
  Layers,
} from 'lucide-react';
import { EditorSettings, GraphData } from '../types';

interface TopBarProps {
  vaultPath: string | null;
  graphData: GraphData | null;
  isLoading: boolean;
  orphanFilter: 'all' | 'highlight' | 'only' | 'hide';
  setOrphanFilter: (filter: 'all' | 'highlight' | 'only' | 'hide') => void;
  editorSettings: EditorSettings;
  onOpenVaultDialog: () => void;
  onRefreshVault: () => void;
  onOpenVaultInEditor: () => void;
  onOpenSettings: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  vaultPath,
  graphData,
  isLoading,
  orphanFilter,
  setOrphanFilter,
  editorSettings,
  onOpenVaultDialog,
  onRefreshVault,
  onOpenVaultInEditor,
  onOpenSettings,
}) => {
  const vaultName = vaultPath ? vaultPath.split('/').filter(Boolean).pop() || vaultPath : null;

  const getEditorIcon = () => {
    switch (editorSettings.preferredEditor) {
      case 'nvim':
        return <Terminal className="w-4 h-4 text-emerald-400" />;
      case 'code':
        return <Code className="w-4 h-4 text-sky-400" />;
      case 'emacs':
        return <FileText className="w-4 h-4 text-purple-400" />;
      default:
        return <ExternalLink className="w-4 h-4 text-amber-400" />;
    }
  };

  const getEditorLabel = () => {
    switch (editorSettings.preferredEditor) {
      case 'nvim':
        return 'Neovim';
      case 'code':
        return 'VS Code';
      case 'emacs':
        return 'Emacs';
      case 'custom':
        return 'Custom';
      default:
        return 'System';
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="app-brand">
          <Layers className="brand-icon" />
          <span className="brand-title">Obsidian Graph</span>
        </div>

        <button
          className="btn btn-vault"
          onClick={onOpenVaultDialog}
          title={vaultPath || 'Choose vault folder'}
        >
          <FolderOpen className="w-4 h-4" />
          <span className="vault-label">
            {vaultName ? vaultName : 'Open Vault...'}
          </span>
        </button>

        {vaultPath && (
          <button
            className={`btn btn-icon ${isLoading ? 'is-loading' : ''}`}
            onClick={onRefreshVault}
            title="Refresh Vault Scan"
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="topbar-center">
        {graphData && (
          <div className="stats-cluster">
            <div className="stat-pill">
              <span className="stat-num">{graphData.total_files}</span>
              <span className="stat-label">Notes</span>
            </div>
            <div className="stat-pill">
              <span className="stat-num">{graphData.link_count}</span>
              <span className="stat-label">Links</span>
            </div>
            <button
              className={`stat-pill stat-orphan ${
                orphanFilter === 'only'
                  ? 'is-active-filter'
                  : orphanFilter === 'highlight'
                  ? 'is-highlighting'
                  : ''
              }`}
              onClick={() => {
                if (orphanFilter === 'all') setOrphanFilter('only');
                else if (orphanFilter === 'only') setOrphanFilter('highlight');
                else setOrphanFilter('all');
              }}
              title="Click to toggle Orphan filter: Show only unconnected notes"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span className="stat-num">{graphData.orphan_count}</span>
              <span className="stat-label">
                {orphanFilter === 'only' ? 'Orphans (Filtered)' : 'Orphans'}
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="topbar-right">
        {vaultPath && (
          <button
            className="btn btn-editor-vault"
            onClick={onOpenVaultInEditor}
            title={`Open entire vault folder in ${getEditorLabel()}`}
          >
            {getEditorIcon()}
            <span>Open in {getEditorLabel()}</span>
          </button>
        )}

        <button
          className="btn btn-icon"
          onClick={onOpenSettings}
          title="Editor & App Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
