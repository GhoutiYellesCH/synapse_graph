import React, { useEffect, useState } from 'react';
import {
  X,
  Terminal,
  Code,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Save,
} from 'lucide-react';
import { AvailableEditors, EditorSettings } from '../types';
import { getAvailableEditors } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EditorSettings;
  onSaveSettings: (settings: EditorSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<EditorSettings>(settings);
  const [available, setAvailable] = useState<AvailableEditors | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
    if (isOpen) {
      getAvailableEditors()
        .then(setAvailable)
        .catch(console.error);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Viewer & Editor Settings</h2>
          <button className="btn-close" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Detected Installed Tools */}
          <div className="settings-section">
            <label className="section-label">Detected Tools on System</label>
            <div className="tools-status-grid">
              <div className="tool-status-item">
                <span className="tool-name">Neovim (nvim)</span>
                {available?.nvim ? (
                  <span className="status-badge status-ok">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Installed</span>
                  </span>
                ) : (
                  <span className="status-badge status-missing">
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Not found</span>
                  </span>
                )}
              </div>

              <div className="tool-status-item">
                <span className="tool-name">Kitty Terminal</span>
                {available?.kitty ? (
                  <span className="status-badge status-ok">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Installed</span>
                  </span>
                ) : (
                  <span className="status-badge status-missing">
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Not found</span>
                  </span>
                )}
              </div>

              <div className="tool-status-item">
                <span className="tool-name">VS Code (code)</span>
                {available?.code ? (
                  <span className="status-badge status-ok">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Installed</span>
                  </span>
                ) : (
                  <span className="status-badge status-missing">
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Not found</span>
                  </span>
                )}
              </div>

              <div className="tool-status-item">
                <span className="tool-name">Emacs</span>
                {available?.emacs ? (
                  <span className="status-badge status-ok">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Installed</span>
                  </span>
                ) : (
                  <span className="status-badge status-missing">
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Not found</span>
                  </span>
                )}
              </div>

              <div className="tool-status-item">
                <span className="tool-name">Xterm</span>
                {available?.xterm ? (
                  <span className="status-badge status-ok">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Installed</span>
                  </span>
                ) : (
                  <span className="status-badge status-missing">
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Not found</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Preferred Editor Selection */}
          <div className="settings-section">
            <label className="section-label">Default External Editor</label>
            <p className="section-desc">
              When you click "Open in Editor" or double click a node in the graph, it will open in this editor:
            </p>

            <div className="editor-options-list">
              <label
                className={`editor-option-card ${
                  localSettings.preferredEditor === 'nvim' ? 'selected' : ''
                }`}
              >
                <input
                  type="radio"
                  name="preferredEditor"
                  value="nvim"
                  checked={localSettings.preferredEditor === 'nvim'}
                  onChange={() =>
                    setLocalSettings({ ...localSettings, preferredEditor: 'nvim' })
                  }
                />
                <Terminal className="option-icon text-emerald-400" />
                <div className="option-info">
                  <span className="option-title">Neovim (Terminal)</span>
                  <span className="option-desc">
                    Launches via Kitty or Xterm terminal emulator
                  </span>
                </div>
              </label>

              <label
                className={`editor-option-card ${
                  localSettings.preferredEditor === 'code' ? 'selected' : ''
                }`}
              >
                <input
                  type="radio"
                  name="preferredEditor"
                  value="code"
                  checked={localSettings.preferredEditor === 'code'}
                  onChange={() =>
                    setLocalSettings({ ...localSettings, preferredEditor: 'code' })
                  }
                />
                <Code className="option-icon text-sky-400" />
                <div className="option-info">
                  <span className="option-title">Visual Studio Code</span>
                  <span className="option-desc">Opens file via `code` command</span>
                </div>
              </label>

              <label
                className={`editor-option-card ${
                  localSettings.preferredEditor === 'emacs' ? 'selected' : ''
                }`}
              >
                <input
                  type="radio"
                  name="preferredEditor"
                  value="emacs"
                  checked={localSettings.preferredEditor === 'emacs'}
                  onChange={() =>
                    setLocalSettings({ ...localSettings, preferredEditor: 'emacs' })
                  }
                />
                <FileText className="option-icon text-purple-400" />
                <div className="option-info">
                  <span className="option-title">Emacs</span>
                  <span className="option-desc">
                    Opens via `emacsclient -n` or `emacs`
                  </span>
                </div>
              </label>

              <label
                className={`editor-option-card ${
                  localSettings.preferredEditor === 'system' ? 'selected' : ''
                }`}
              >
                <input
                  type="radio"
                  name="preferredEditor"
                  value="system"
                  checked={localSettings.preferredEditor === 'system'}
                  onChange={() =>
                    setLocalSettings({ ...localSettings, preferredEditor: 'system' })
                  }
                />
                <ExternalLink className="option-icon text-amber-400" />
                <div className="option-info">
                  <span className="option-title">System Default (xdg-open)</span>
                  <span className="option-desc">Uses Linux desktop default app handler</span>
                </div>
              </label>

              <label
                className={`editor-option-card ${
                  localSettings.preferredEditor === 'custom' ? 'selected' : ''
                }`}
              >
                <input
                  type="radio"
                  name="preferredEditor"
                  value="custom"
                  checked={localSettings.preferredEditor === 'custom'}
                  onChange={() =>
                    setLocalSettings({ ...localSettings, preferredEditor: 'custom' })
                  }
                />
                <Terminal className="option-icon text-rose-400" />
                <div className="option-info">
                  <span className="option-title">Custom Command Template</span>
                  <span className="option-desc">
                    Configure your own command with &#123;file&#125; and &#123;vault&#125;
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Custom Command Template Input */}
          {localSettings.preferredEditor === 'custom' && (
            <div className="settings-section">
              <label className="section-label">Custom Command Template</label>
              <input
                type="text"
                className="input-text"
                placeholder='e.g. kitty -e nvim "{file}"'
                value={localSettings.customCommand}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, customCommand: e.target.value })
                }
              />
              <p className="help-text">
                Placeholders: <code>&#123;file&#125;</code> = absolute file path,{' '}
                <code>&#123;vault&#125;</code> = vault root directory.
              </p>
            </div>
          )}

          {/* Double Click Behavior */}
          <div className="settings-section">
            <label className="section-label">Graph Double-Click Action</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="doubleClickAction"
                  value="editor"
                  checked={localSettings.doubleClickAction === 'editor'}
                  onChange={() =>
                    setLocalSettings({ ...localSettings, doubleClickAction: 'editor' })
                  }
                />
                <span>Directly launch external editor (Recommended for fast editing)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="doubleClickAction"
                  value="inspector"
                  checked={localSettings.doubleClickAction === 'inspector'}
                  onChange={() =>
                    setLocalSettings({ ...localSettings, doubleClickAction: 'inspector' })
                  }
                />
                <span>Open in side Inspector panel</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
