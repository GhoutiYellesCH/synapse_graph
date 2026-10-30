import React from 'react';
import {
  FolderOpen,
  RefreshCw,
  Settings,
  Terminal,
  ExternalLink,
  Code,
  FileText,
  Layers,
} from 'lucide-react';
import { EditorSettings } from '../types';

interface TopBarProps {
  vaultPath: string | null;
  isLoading: boolean;
  editorSettings: EditorSettings;
  onOpenVaultDialog: () => void;
  onRefreshVault: () => void;
  onOpenVaultInEditor: () => void;
  onOpenSettings: () => void;
  onOpenDashboard: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  vaultPath,
  isLoading,
  editorSettings,
  onOpenVaultDialog,
  onRefreshVault,
  onOpenVaultInEditor,
  onOpenSettings,
  onOpenDashboard,
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
        <div className="app-brand" onClick={onOpenDashboard} style={{ cursor: 'pointer' }} title="Open Synapse Dashboard & Docs">
          <Layers className="brand-icon" />
          <span className="brand-title">Synapse Graph</span>
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
          title="Settings & Dashboard"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
