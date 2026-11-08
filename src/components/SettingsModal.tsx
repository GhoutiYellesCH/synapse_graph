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
  Palette,
  Image as ImageIcon,
  Puzzle,
  RotateCcw,
  Plus,
  Trash2,
  FolderOpen,
  LayoutDashboard,
  Brain,
} from 'lucide-react';
import { AvailableEditors, BackgroundSettings, EditorSettings, GraphData } from '../types';
import { getAvailableEditors, pickImageFile, readImageBase64 } from '../services/api';
import {
  THEME_PRESETS,
  applyCustomCSS,
  getStoredActivePresetId,
  getStoredCustomCSS,
} from '../services/themeManager';
import { pluginRegistry } from '../plugins/PluginManager';
import { DashboardDocs } from './DashboardDocs';

interface SettingsModalProps {
  isOpen: boolean;
  initialTab?: 'dashboard' | 'editor' | 'theme' | 'background' | 'plugins';
  onClose: () => void;
  settings: EditorSettings;
  onSaveSettings: (settings: EditorSettings) => void;
  backgroundSettings: BackgroundSettings;
  onSaveBackgroundSettings: (bg: BackgroundSettings) => void;
  vaultPath: string | null;
  graphData: GraphData | null;
  onOpenVaultDialog: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  initialTab = 'dashboard',
  onClose,
  settings,
  onSaveSettings,
  backgroundSettings,
  onSaveBackgroundSettings,
  vaultPath,
  graphData,
  onOpenVaultDialog,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'editor' | 'theme' | 'background' | 'plugins'>(initialTab);
  const [localSettings, setLocalSettings] = useState<EditorSettings>(settings);
  const [available, setAvailable] = useState<AvailableEditors | null>(null);

  // Theme state
  const [activePreset, setActivePreset] = useState<string>(getStoredActivePresetId());
  const [customCSS, setCustomCSS] = useState<string>(getStoredCustomCSS());
  const [cssSuccessMsg, setCssSuccessMsg] = useState(false);

  // Background settings state
  const [localBg, setLocalBg] = useState<BackgroundSettings>(backgroundSettings);

  // Plugins state
  const [pluginsList, setPluginsList] = useState<any[]>([]);
  const [newPluginName, setNewPluginName] = useState('');
  const [newPluginDesc, setNewPluginDesc] = useState('');
  const [newPluginCode, setNewPluginCode] = useState(`// Plugin script
context.registerInspectorPanel({
  id: 'custom-tag-counter',
  title: '🏷️ Tag Counter',
  render: (node) => {
    return React.createElement('div', {
      style: { fontSize: '12px', color: 'var(--accent-color)' }
    }, 'Note has ' + node.tags.length + ' tags');
  }
});
`);
  const [showAddPlugin, setShowAddPlugin] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setLocalSettings(settings);
    setLocalBg(backgroundSettings);
    if (isOpen) {
      getAvailableEditors().then(setAvailable).catch(console.error);
      setPluginsList(pluginRegistry.getAllPlugins());
      setCustomCSS(getStoredCustomCSS());
      setActivePreset(getStoredActivePresetId());
    }
  }, [isOpen, settings, backgroundSettings]);

  if (!isOpen) return null;

  const handleSaveEditor = () => {
    onSaveSettings(localSettings);
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setActivePreset(presetId);
      setCustomCSS(preset.css);
      applyCustomCSS(preset.css, presetId);
      triggerCssToast();
    }
  };

  const handleApplyCustomCSS = () => {
    applyCustomCSS(customCSS, activePreset);
    triggerCssToast();
  };

  const triggerCssToast = () => {
    setCssSuccessMsg(true);
    setTimeout(() => setCssSuccessMsg(false), 2000);
  };

  const handlePickLocalImage = async () => {
    const selected = await pickImageFile();
    if (selected) {
      try {
        const base64Url = await readImageBase64(selected);
        const updated = { ...localBg, imageUrl: base64Url, enabled: true };
        setLocalBg(updated);
        onSaveBackgroundSettings(updated);
      } catch (e) {
        console.error('Failed to convert local image to base64:', e);
      }
    }
  };

  const handleSaveBg = (updated: BackgroundSettings) => {
    setLocalBg(updated);
    onSaveBackgroundSettings(updated);
  };

  const handleTogglePlugin = (id: string) => {
    pluginRegistry.togglePlugin(id);
    setPluginsList([...pluginRegistry.getAllPlugins()]);
  };

  const handleCreateCustomPlugin = () => {
    if (!newPluginName.trim()) return;
    const newId = 'custom-' + Date.now();
    pluginRegistry.registerPlugin({
      id: newId,
      name: newPluginName.trim(),
      version: '1.0.0',
      description: newPluginDesc.trim() || 'Custom user script',
      author: 'User',
      enabled: true,
      isCustom: true,
      code: newPluginCode,
    });
    setPluginsList([...pluginRegistry.getAllPlugins()]);
    setShowAddPlugin(false);
    setNewPluginName('');
    setNewPluginDesc('');
  };

  const handleDeleteCustomPlugin = (id: string) => {
    pluginRegistry.removeCustomPlugin(id);
    setPluginsList([...pluginRegistry.getAllPlugins()]);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card wide-card dashboard-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-tabs-header">
            <h2 className="modal-title">Synapse Workspace & Settings</h2>
            <div className="modal-nav-tabs">
              <button
                className={`modal-nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                <span>Dashboard & Docs</span>
              </button>
              <button
                className={`modal-nav-tab ${activeTab === 'editor' ? 'active' : ''}`}
                onClick={() => setActiveTab('editor')}
              >
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Editor & CLI</span>
              </button>
              <button
                className={`modal-nav-tab ${activeTab === 'theme' ? 'active' : ''}`}
                onClick={() => setActiveTab('theme')}
              >
                <Palette className="w-4 h-4 text-pink-400" />
                <span>Custom CSS</span>
              </button>
              <button
                className={`modal-nav-tab ${activeTab === 'background' ? 'active' : ''}`}
                onClick={() => setActiveTab('background')}
              >
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>Blurred Background</span>
              </button>
              <button
                className={`modal-nav-tab ${activeTab === 'plugins' ? 'active' : ''}`}
                onClick={() => setActiveTab('plugins')}
              >
                <Puzzle className="w-4 h-4 text-amber-400" />
                <span>Plugins ({pluginsList.filter((p) => p.enabled).length})</span>
              </button>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* TAB 0: Dashboard & Docs */}
          {activeTab === 'dashboard' && (
            <div className="tab-content dashboard-tab-content">
              <DashboardDocs
                vaultPath={vaultPath}
                graphData={graphData}
                onOpenVaultDialog={onOpenVaultDialog}
              />
            </div>
          )}

          {/* TAB 1: Editor & CLI */}
          {activeTab === 'editor' && (
            <div className="tab-content">
              {/* Detected System Tools */}
              <div className="settings-section">
                <label className="section-label">Detected Tools on System</label>
                <div className="tools-status-grid">
                  <div className="tool-status-item">
                    <span className="tool-name font-semibold text-purple-300">Synapse (synapse)</span>
                    {available?.synapse || available?.second_brain ? (
                      <span className="status-badge status-ok">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                        <span>Ready & Default</span>
                      </span>
                    ) : (
                      <span className="status-badge status-missing">
                        <XCircle className="w-3.5 h-3.5 text-slate-400" />
                        <span>Not found</span>
                      </span>
                    )}
                  </div>
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
                        <XCircle className="w-3.5 h-3.5 text-slate-400" />
                        <span>Not found</span>
                      </span>
                    )}
                  </div>
                  <div className="tool-status-item">
                    <span className="tool-name">Emacs (emacsclient/emacs)</span>
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
                </div>
              </div>

              {/* Preferred Editor Selection */}
              <div className="settings-section">
                <label className="section-label">Preferred External Editor</label>
                <div className="radio-grid">
                  <label className={`radio-card ${localSettings.preferredEditor === 'synapse' || localSettings.preferredEditor === 'second-brain' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="editor"
                      value="synapse"
                      checked={localSettings.preferredEditor === 'synapse' || localSettings.preferredEditor === 'second-brain'}
                      onChange={() => setLocalSettings({ ...localSettings, preferredEditor: 'synapse' })}
                    />
                    <div className="radio-card-content">
                      <div className="radio-card-title">
                        <Brain className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-300 font-semibold">Synapse (Default)</span>
                      </div>
                      <p className="radio-card-desc">Opens note in Synapse with Tokyo Night theme, Live Preview & Code Editor</p>
                    </div>
                  </label>

                  <label className={`radio-card ${localSettings.preferredEditor === 'nvim' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="editor"
                      value="nvim"
                      checked={localSettings.preferredEditor === 'nvim'}
                      onChange={() => setLocalSettings({ ...localSettings, preferredEditor: 'nvim' })}
                    />
                    <div className="radio-card-content">
                      <div className="radio-card-title">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        <span>Neovim</span>
                      </div>
                      <p className="radio-card-desc">Opens inside Kitty or terminal emulator with live line jump</p>
                    </div>
                  </label>

                  <label className={`radio-card ${localSettings.preferredEditor === 'code' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="editor"
                      value="code"
                      checked={localSettings.preferredEditor === 'code'}
                      onChange={() => setLocalSettings({ ...localSettings, preferredEditor: 'code' })}
                    />
                    <div className="radio-card-content">
                      <div className="radio-card-title">
                        <Code className="w-4 h-4 text-blue-400" />
                        <span>VS Code</span>
                      </div>
                      <p className="radio-card-desc">Opens file via <code>code -g path:line</code></p>
                    </div>
                  </label>

                  <label className={`radio-card ${localSettings.preferredEditor === 'emacs' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="editor"
                      value="emacs"
                      checked={localSettings.preferredEditor === 'emacs'}
                      onChange={() => setLocalSettings({ ...localSettings, preferredEditor: 'emacs' })}
                    />
                    <div className="radio-card-content">
                      <div className="radio-card-title">
                        <FileText className="w-4 h-4 text-purple-400" />
                        <span>Emacs</span>
                      </div>
                      <p className="radio-card-desc">Opens via <code>emacsclient -n</code> or emacs</p>
                    </div>
                  </label>

                  <label className={`radio-card ${localSettings.preferredEditor === 'custom' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="editor"
                      value="custom"
                      checked={localSettings.preferredEditor === 'custom'}
                      onChange={() => setLocalSettings({ ...localSettings, preferredEditor: 'custom' })}
                    />
                    <div className="radio-card-content">
                      <div className="radio-card-title">
                        <ExternalLink className="w-4 h-4 text-amber-400" />
                        <span>Custom Command</span>
                      </div>
                      <p className="radio-card-desc">Configure your own shell command with parameters</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Custom Command Input */}
              {localSettings.preferredEditor === 'custom' && (
                <div className="settings-section">
                  <label className="section-label">Custom Command Template</label>
                  <p className="section-hint">
                    Use <code>{'{file}'}</code> for absolute file path, <code>{'{vault}'}</code> for vault directory.
                  </p>
                  <input
                    type="text"
                    className="custom-cmd-input"
                    value={localSettings.customCommand}
                    onChange={(e) => setLocalSettings({ ...localSettings, customCommand: e.target.value })}
                    placeholder='e.g. alacritty -e nvim "{file}"'
                  />
                </div>
              )}

              {/* CLI Mode Notice */}
              <div className="settings-section">
                <label className="section-label">Native CLI Mode</label>
                <div className="cli-hint-box">
                  <code>synapse-graph /path/to/my/vault</code>
                  <p className="cli-desc">
                    Installed to <code>/usr/bin/synapse-graph</code>. Pass any folder or relative path (e.g. <code>synapse-graph .</code>) to open immediately.
                  </p>
                </div>
              </div>

              <div className="settings-actions-bar">
                <button className="btn-primary" onClick={handleSaveEditor}>
                  <Save className="w-4 h-4" />
                  <span>Save Editor Settings</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Custom CSS Theme Editor */}
          {activeTab === 'theme' && (
            <div className="tab-content">
              <div className="settings-section">
                <div className="preset-selector-header">
                  <label className="section-label">Theme Presets</label>
                  <span className="preset-subtitle">Select a pre-configured theme or write custom CSS below:</span>
                </div>
                <div className="theme-presets-grid">
                  {THEME_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      className={`preset-card ${activePreset === preset.id ? 'active' : ''}`}
                      onClick={() => handleApplyPreset(preset.id)}
                    >
                      <div className="preset-name">{preset.name}</div>
                      <div className="preset-desc">{preset.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="settings-section">
                <div className="css-editor-header">
                  <label className="section-label">Live Custom CSS Editor</label>
                  <div className="css-editor-actions">
                    <button
                      className="btn-secondary small"
                      onClick={() => handleApplyPreset('default')}
                      title="Reset to default CSS"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset to Default</span>
                    </button>
                    <button className="btn-primary small" onClick={handleApplyCustomCSS}>
                      <Save className="w-3.5 h-3.5" />
                      <span>Apply CSS</span>
                    </button>
                  </div>
                </div>

                <textarea
                  className="custom-css-textarea"
                  value={customCSS}
                  onChange={(e) => {
                    setCustomCSS(e.target.value);
                    applyCustomCSS(e.target.value);
                  }}
                  rows={14}
                  spellCheck={false}
                  placeholder="/* Enter your custom CSS here */"
                />

                {cssSuccessMsg && (
                  <div className="css-toast-applied">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Theme CSS applied and saved!</span>
                  </div>
                )}

                <div className="css-vars-cheatsheet">
                  <div className="cheatsheet-title">Available CSS Variables:</div>
                  <div className="cheatsheet-tags">
                    <code>--bg-app</code>
                    <code>--bg-sidebar</code>
                    <code>--bg-card</code>
                    <code>--border-color</code>
                    <code>--text-normal</code>
                    <code>--text-muted</code>
                    <code>--accent-color</code>
                    <code>--node-orphan</code>
                    <code>--node-selected</code>
                    <code>--node-neighbor</code>
                    <code>--link-color</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Blurred Background Image */}
          {activeTab === 'background' && (
            <div className="tab-content">
              <div className="settings-section">
                <label className="section-label">Background Image</label>
                <div className="drawer-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={localBg.enabled}
                      onChange={(e) => {
                        const updated = { ...localBg, enabled: e.target.checked };
                        handleSaveBg(updated);
                      }}
                    />
                    <span>Enable blurred background image</span>
                  </label>
                </div>
              </div>

              {localBg.enabled && (
                <>
                  <div className="settings-section">
                    <label className="section-label">Select Background Image</label>
                    <div className="bg-image-controls">
                      <button className="btn-secondary" onClick={handlePickLocalImage}>
                        <FolderOpen className="w-4 h-4" />
                        <span>Choose Local Image File...</span>
                      </button>
                      <span className="or-divider">or enter image URL:</span>
                      <input
                        type="text"
                        className="custom-cmd-input"
                        placeholder="https://images.unsplash.com/... or file path"
                        value={localBg.imageUrl}
                        onChange={(e) => {
                          const updated = { ...localBg, imageUrl: e.target.value };
                          handleSaveBg(updated);
                        }}
                      />
                    </div>

                    {localBg.imageUrl && (
                      <div className="bg-preview-card">
                        <div
                          className="bg-preview-img"
                          style={{
                            backgroundImage: `url(${localBg.imageUrl})`,
                            filter: `blur(${localBg.blur}px)`,
                          }}
                        />
                        <div
                          className="bg-preview-overlay"
                          style={{
                            background: `rgba(18, 18, 20, ${localBg.opacity})`,
                          }}
                        >
                          <span>Live Preview Effect</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="settings-section">
                    <div className="slider-item">
                      <div className="slider-label-row">
                        <span>Blur Intensity ({localBg.blur}px)</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="2"
                        value={localBg.blur}
                        onChange={(e) => {
                          const updated = { ...localBg, blur: parseInt(e.target.value, 10) };
                          handleSaveBg(updated);
                        }}
                        className="slider-range"
                      />
                    </div>

                    <div className="slider-item">
                      <div className="slider-label-row">
                        <span>Darkness Overlay ({Math.round(localBg.opacity * 100)}%)</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.95"
                        step="0.05"
                        value={localBg.opacity}
                        onChange={(e) => {
                          const updated = { ...localBg, opacity: parseFloat(e.target.value) };
                          handleSaveBg(updated);
                        }}
                        className="slider-range"
                      />
                      <span className="slider-hint">Higher values make graph nodes stand out clearly.</span>
                    </div>

                    <div className="drawer-row mt-3">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={localBg.applyToGraph}
                          onChange={(e) => {
                            const updated = { ...localBg, applyToGraph: e.target.checked };
                            handleSaveBg(updated);
                          }}
                        />
                        <span>Apply blurred background to Graph canvas</span>
                      </label>
                    </div>

                    <div className="drawer-row">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={localBg.applyToInspector}
                          onChange={(e) => {
                            const updated = { ...localBg, applyToInspector: e.target.checked };
                            handleSaveBg(updated);
                          }}
                        />
                        <span>Apply blurred glassmorphism to Note Inspector</span>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: Plugin Architecture */}
          {activeTab === 'plugins' && (
            <div className="tab-content">
              <div className="settings-section">
                <div className="plugins-header-row">
                  <div>
                    <label className="section-label">Active Plugins & Mods</label>
                    <p className="section-hint">
                      Extend graph behavior, inspect metrics, or hook into node rendering.
                    </p>
                  </div>
                  <button
                    className="btn-primary small"
                    onClick={() => setShowAddPlugin(!showAddPlugin)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Custom Plugin</span>
                  </button>
                </div>

                {showAddPlugin && (
                  <div className="new-plugin-form">
                    <h4 className="new-plugin-title">Create JavaScript Plugin</h4>
                    <div className="form-group">
                      <label>Plugin Name:</label>
                      <input
                        type="text"
                        placeholder="e.g. Hub Highlight Plugin"
                        value={newPluginName}
                        onChange={(e) => setNewPluginName(e.target.value)}
                        className="custom-cmd-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Description:</label>
                      <input
                        type="text"
                        placeholder="e.g. Highlights top nodes in bright green"
                        value={newPluginDesc}
                        onChange={(e) => setNewPluginDesc(e.target.value)}
                        className="custom-cmd-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>JavaScript Code (context API: registerInspectorPanel, registerNodeColorDecorator, on, emit):</label>
                      <textarea
                        rows={8}
                        value={newPluginCode}
                        onChange={(e) => setNewPluginCode(e.target.value)}
                        className="custom-css-textarea"
                        spellCheck={false}
                      />
                    </div>
                    <div className="form-actions">
                      <button className="btn-secondary small" onClick={() => setShowAddPlugin(false)}>
                        Cancel
                      </button>
                      <button className="btn-primary small" onClick={handleCreateCustomPlugin}>
                        Register & Save to ~/.config/synapse-graph/plugins/
                      </button>
                    </div>
                  </div>
                )}

                <div className="plugins-list">
                  {pluginsList.map((plugin) => (
                    <div key={plugin.id} className="plugin-card-item">
                      <div className="plugin-info">
                        <div className="plugin-title-row">
                          <span className="plugin-name">{plugin.name}</span>
                          <span className="plugin-ver">v{plugin.version}</span>
                          {plugin.isCustom && <span className="custom-badge">User Mod</span>}
                        </div>
                        <p className="plugin-desc">{plugin.description}</p>
                      </div>

                      <div className="plugin-actions">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={plugin.enabled}
                            onChange={() => handleTogglePlugin(plugin.id)}
                          />
                          <span className="toggle-slider" />
                        </label>
                        {plugin.isCustom && (
                          <button
                            className="btn-danger-icon"
                            onClick={() => handleDeleteCustomPlugin(plugin.id)}
                            title="Delete custom plugin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
