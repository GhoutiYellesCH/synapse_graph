import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TopBar } from './components/TopBar';
import { Controls } from './components/Controls';
import { GraphCanvas } from './components/GraphCanvas';
import { Inspector } from './components/Inspector';
import { SettingsModal } from './components/SettingsModal';
import {
  AntigravityAiResult,
  BackgroundSettings,
  ColorGroup,
  DisplaySettings,
  EditorSettings,
  EditorType,
  ForceSettings,
  GraphData,
  GraphLayoutMode,
  GraphNode,
  LearningConnection,
} from './types';
import {
  getCliVaultPath,
  listDiskPlugins,
  loadVaultConfig,
  openInEditor,
  openVaultInEditor,
  pickVaultFolder,
  revealPath,
  runAntigravityQuery,
  saveVaultConfig,
  scanVault,
} from './services/api';
import { applyCustomCSS, getStoredCustomCSS } from './services/themeManager';
import { LocalSemanticEngine } from './services/semanticSearch';
import { pluginRegistry } from './plugins/PluginManager';
import { registerBuiltinPlugins } from './plugins/builtinPlugins';
import './App.css';

const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  preferredEditor: 'second-brain',
  customCommand: 'second-brain "{vault}" "{file}"',
  doubleClickAction: 'editor',
};

const DEFAULT_FORCE_SETTINGS: ForceSettings = {
  centerStrength: 0.35,
  repelStrength: 120,
  linkDistance: 45,
  linkStrength: 1.0,
};

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  showArrows: false,
  textFadeThreshold: 1.2,
  nodeSizeMultiplier: 1.0,
  linkThicknessMultiplier: 1.0,
};

const DEFAULT_BG_SETTINGS: BackgroundSettings = {
  enabled: false,
  imageUrl: '',
  blur: 20,
  opacity: 0.75,
  applyToGraph: true,
  applyToInspector: true,
};

export const App: React.FC = () => {
  // Vault state
  const [vaultPath, setVaultPath] = useState<string | null>(() => {
    return localStorage.getItem('synapse_vault_path') || localStorage.getItem('obsidian_vault_path');
  });
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSemanticMode, setIsSemanticMode] = useState(false);
  const [layoutMode, setLayoutMode] = useState<GraphLayoutMode>('spherical');

  const [orphanFilter, setOrphanFilter] = useState<'all' | 'highlight' | 'only' | 'hide'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(false);
  const [showGhostNotes, setShowGhostNotes] = useState(false);

  // Antigravity AI Assistant state
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiResult, setAiResult] = useState<AntigravityAiResult | null>(null);

  // Synapse Graph Features State
  const [colorGroups, setColorGroups] = useState<ColorGroup[]>(() => {
    try {
      const saved = localStorage.getItem('synapse_color_groups') || localStorage.getItem('obsidian_color_groups');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() => {
    try {
      const saved = localStorage.getItem('synapse_display_settings') || localStorage.getItem('obsidian_display_settings');
      if (saved) return { ...DEFAULT_DISPLAY_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_DISPLAY_SETTINGS;
  });

  const [forceSettings, setForceSettings] = useState<ForceSettings>(() => {
    try {
      const saved = localStorage.getItem('synapse_force_settings') || localStorage.getItem('obsidian_force_settings');
      if (saved) return { ...DEFAULT_FORCE_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_FORCE_SETTINGS;
  });

  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>(() => {
    try {
      const saved = localStorage.getItem('synapse_bg_settings') || localStorage.getItem('obsidian_bg_settings');
      if (saved) return { ...DEFAULT_BG_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_BG_SETTINGS;
  });

  const [isPaused, setIsPaused] = useState(false);

  // Zoom action trigger
  const [zoomAction, setZoomAction] = useState<{
    action: 'in' | 'out' | 'fit';
    timestamp: number;
  } | null>(null);

  // Selected note for inspector
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Plugin Corner Widgets (e.g. Vault Stats HUD in Bottom-Right Corner)
  const [cornerWidgets, setCornerWidgets] = useState(() => pluginRegistry.getCornerWidgets());

  useEffect(() => {
    return pluginRegistry.subscribe(() => {
      setCornerWidgets(pluginRegistry.getCornerWidgets());
    });
  }, []);

  // Editor settings
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => {
    try {
      const saved = localStorage.getItem('synapse_editor_settings') || localStorage.getItem('obsidian_editor_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!localStorage.getItem('synapse_preferred_user_set')) {
          parsed.preferredEditor = 'second-brain';
        }
        return { ...DEFAULT_EDITOR_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_EDITOR_SETTINGS;
  });

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'dashboard' | 'editor' | 'theme' | 'background' | 'plugins'>('dashboard');

  // Compute local semantic scores in real time when in semantic mode
  const semanticScores = useMemo(() => {
    if (!isSemanticMode || !searchQuery.trim() || !graphData) {
      return new Map<string, number>();
    }
    return LocalSemanticEngine.search(graphData.nodes, searchQuery);
  }, [isSemanticMode, searchQuery, graphData]);

  // AI Matched note IDs set
  const aiMatchedNodeIds = useMemo(() => {
    if (!aiResult) return new Set<string>();
    const ids = new Set<string>();
    aiResult.matched_notes.forEach((name) => {
      ids.add(name);
      const found = graphData?.nodes.find((n) => n.name === name || n.rel_path === name);
      if (found) ids.add(found.id);
    });
    return ids;
  }, [aiResult, graphData]);

  const aiLearningConnections: LearningConnection[] = useMemo(() => {
    return aiResult?.learning_connections || [];
  }, [aiResult]);

  // Trigger Antigravity CLI AI Search & Learn
  const handleTriggerAntigravityQuery = async () => {
    if (!vaultPath || !searchQuery.trim() || !graphData) return;
    setIsAiThinking(true);
    try {
      const summary = LocalSemanticEngine.buildVaultSummaryForAi(graphData.nodes, searchQuery);
      const res = await runAntigravityQuery(vaultPath, searchQuery, summary);
      setAiResult(res);
    } catch (e: any) {
      alert(`Antigravity AI error: ${e?.message || e}`);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleSelectNodeByName = (name: string) => {
    if (!graphData) return;
    const found = graphData.nodes.find(
      (n) => n.name.toLowerCase() === name.toLowerCase() || n.rel_path.toLowerCase() === name.toLowerCase()
    );
    if (found) {
      setSelectedNode(found);
      setZoomAction({ action: 'fit', timestamp: Date.now() });
    }
  };

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('synapse_color_groups', JSON.stringify(colorGroups));
  }, [colorGroups]);

  useEffect(() => {
    localStorage.setItem('synapse_display_settings', JSON.stringify(displaySettings));
  }, [displaySettings]);

  useEffect(() => {
    localStorage.setItem('synapse_force_settings', JSON.stringify(forceSettings));
  }, [forceSettings]);

  // Persist per-vault settings directly into ~/.config/synapse-graph/vault_data/<hash>.json
  useEffect(() => {
    if (!vaultPath) return;
    const timer = setTimeout(() => {
      saveVaultConfig({
        vault_path: vaultPath,
        color_groups: colorGroups,
        display_settings: displaySettings,
        force_settings: forceSettings,
        background_settings: backgroundSettings,
        orphan_filter: orphanFilter,
        last_opened: Math.floor(Date.now() / 1000),
      }).catch((e) => console.error('Failed to save per-vault config to disk:', e));
    }, 400);

    return () => clearTimeout(timer);
  }, [vaultPath, colorGroups, displaySettings, forceSettings, backgroundSettings, orphanFilter]);

  const handleSaveBackgroundSettings = (newBg: BackgroundSettings) => {
    setBackgroundSettings(newBg);
    localStorage.setItem('synapse_bg_settings', JSON.stringify(newBg));
  };

  const handleSaveEditorSettings = (newSettings: EditorSettings) => {
    setEditorSettings(newSettings);
    localStorage.setItem('synapse_editor_settings', JSON.stringify(newSettings));
  };

  const handleResetForces = () => {
    setForceSettings(DEFAULT_FORCE_SETTINGS);
  };

  // Launch note in external editor
  const handleOpenInEditor = useCallback(
    async (filePath: string, editor?: EditorType) => {
      if (!vaultPath) return;
      const targetEditor = editor || editorSettings.preferredEditor;
      try {
        await openInEditor(
          filePath,
          vaultPath,
          targetEditor,
          targetEditor === 'custom' ? editorSettings.customCommand : undefined
        );
      } catch (err: any) {
        alert(`Could not launch editor: ${err}`);
      }
    },
    [vaultPath, editorSettings]
  );

  // Setup plugin host getters
  useEffect(() => {
    pluginRegistry.setHostGetters({
      getVaultPath: () => vaultPath,
      getGraphData: () => graphData,
      getSelectedNode: () => selectedNode,
      selectNode: setSelectedNode,
      openNote: handleOpenInEditor,
    });
  }, [vaultPath, graphData, selectedNode, handleOpenInEditor]);

  // Scan vault function: Loads notes, connections, and restores per-vault config from disk
  const executeScan = useCallback(
    async (path: string) => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await scanVault(path, {
          include_non_markdown: false,
          include_ghost_nodes: showGhostNotes,
        });
        setGraphData(data);
        localStorage.setItem('synapse_vault_path', path);
        setVaultPath(path);

        // Restore saved settings for this specific vault from ~/.config/synapse-graph/vault_data/
        try {
          const savedCfg = await loadVaultConfig(path);
          if (savedCfg) {
            if (savedCfg.color_groups && savedCfg.color_groups.length > 0) {
              setColorGroups(savedCfg.color_groups);
            }
            if (savedCfg.display_settings) {
              setDisplaySettings(savedCfg.display_settings);
            }
            if (savedCfg.force_settings) {
              setForceSettings(savedCfg.force_settings);
            }
            if (savedCfg.background_settings) {
              setBackgroundSettings(savedCfg.background_settings);
            }
            if (savedCfg.orphan_filter) {
              setOrphanFilter(savedCfg.orphan_filter);
            }
          }
        } catch (cfgErr) {
          console.error('Could not load per-vault config from disk:', cfgErr);
        }

        pluginRegistry.emit('vault-loaded', { vaultPath: path, graphData: data });
      } catch (err: any) {
        setErrorMessage(typeof err === 'string' ? err : err?.message || 'Failed to scan vault');
      } finally {
        setIsLoading(false);
      }
    },
    [showGhostNotes]
  );

  // Initial Startup: Check CLI mode argument, load plugins from disk & custom CSS
  useEffect(() => {
    // 1. Register builtin plugins and restore user plugin state
    registerBuiltinPlugins();
    pluginRegistry.loadStoredState();

    // 2. Load disk plugins from ~/.config/synapse-graph/plugins/
    listDiskPlugins()
      .then((diskPlugins) => {
        diskPlugins.forEach((p) => {
          pluginRegistry.registerPlugin({
            id: `disk-${p.filename}`,
            name: p.filename.replace(/\.js$/, ''),
            version: '1.0.0',
            description: `Loaded from ~/.config/synapse-graph/plugins/${p.filename}`,
            author: 'User Mod',
            enabled: true,
            isCustom: true,
            code: p.code,
          });
        });
      })
      .catch((e) => console.error('Failed to load disk plugins:', e));

    // 3. Apply custom CSS
    applyCustomCSS(getStoredCustomCSS());

    // 4. Check CLI mode (native command line: synapse-graph /path/to/vault)
    getCliVaultPath()
      .then((cliVault) => {
        if (cliVault) {
          executeScan(cliVault);
        } else if (vaultPath) {
          executeScan(vaultPath);
        }
      })
      .catch((err) => {
        console.error('CLI args check failed:', err);
        if (vaultPath) executeScan(vaultPath);
      });
  }, []);

  // Re-scan when showGhostNotes changes
  useEffect(() => {
    if (vaultPath) {
      executeScan(vaultPath);
    }
  }, [showGhostNotes]);

  // Open directory picker
  const handleOpenVaultDialog = async () => {
    const selected = await pickVaultFolder();
    if (selected) {
      executeScan(selected);
    }
  };

  // Launch vault root in external editor
  const handleOpenVaultInEditor = async () => {
    if (!vaultPath) return;
    try {
      await openVaultInEditor(
        vaultPath,
        editorSettings.preferredEditor,
        editorSettings.preferredEditor === 'custom' ? editorSettings.customCommand : undefined
      );
    } catch (err: any) {
      alert(`Could not open vault in editor: ${err}`);
    }
  };

  // Reveal path in file manager
  const handleRevealPath = async (path: string) => {
    try {
      await revealPath(path);
    } catch (err: any) {
      alert(`Could not reveal path: ${err}`);
    }
  };

  const handleOpenSettingsTab = (tab: 'dashboard' | 'editor' | 'theme' | 'background' | 'plugins') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  return (
    <div className="app-layout">
      {/* Top Bar */}
      <TopBar
        vaultPath={vaultPath}
        isLoading={isLoading}
        editorSettings={editorSettings}
        onOpenVaultDialog={handleOpenVaultDialog}
        onRefreshVault={() => vaultPath && executeScan(vaultPath)}
        onOpenVaultInEditor={handleOpenVaultInEditor}
        onOpenSettings={() => handleOpenSettingsTab('editor')}
        onOpenDashboard={() => handleOpenSettingsTab('dashboard')}
      />

      {/* Main View Area */}
      <main className="main-viewport">
        {/* Optional Blurred Background Layer behind Graph */}
        {backgroundSettings.enabled && backgroundSettings.applyToGraph && backgroundSettings.imageUrl && (
          <div className="graph-backdrop-container">
            <div
              className="graph-backdrop-image"
              style={{
                backgroundImage: `url(${backgroundSettings.imageUrl})`,
                filter: `blur(${backgroundSettings.blur}px)`,
              }}
            />
            <div
              className="graph-backdrop-overlay"
              style={{
                background: `rgba(18, 18, 20, ${backgroundSettings.opacity})`,
              }}
            />
          </div>
        )}

        {/* Floating Controls Overlay */}
        <Controls
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSemanticMode={isSemanticMode}
          setIsSemanticMode={setIsSemanticMode}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          onTriggerAntigravityQuery={handleTriggerAntigravityQuery}
          isAiThinking={isAiThinking}
          aiResult={aiResult}
          onClearAiResult={() => setAiResult(null)}
          onSelectNodeByName={handleSelectNodeByName}
          orphanFilter={orphanFilter}
          setOrphanFilter={setOrphanFilter}
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
          selectedFolder={selectedFolder}
          setSelectedFolder={setSelectedFolder}
          availableTags={graphData?.tags || []}
          availableFolders={graphData?.folders || []}
          showLabels={showLabels}
          setShowLabels={setShowLabels}
          showGhostNotes={showGhostNotes}
          setShowGhostNotes={setShowGhostNotes}
          colorGroups={colorGroups}
          setColorGroups={setColorGroups}
          displaySettings={displaySettings}
          setDisplaySettings={setDisplaySettings}
          forceSettings={forceSettings}
          setForceSettings={setForceSettings}
          onResetForces={handleResetForces}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused(!isPaused)}
          onZoomIn={() => setZoomAction({ action: 'in', timestamp: Date.now() })}
          onZoomOut={() => setZoomAction({ action: 'out', timestamp: Date.now() })}
          onFitView={() => setZoomAction({ action: 'fit', timestamp: Date.now() })}
          onOpenSettingsTab={handleOpenSettingsTab}
        />

        {/* Error Notification */}
        {errorMessage && (
          <div className="error-toast">
            <span>{errorMessage}</span>
            <button className="error-close" onClick={() => setErrorMessage(null)}>
              ✕
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="loading-badge">
            <div className="spinner" />
            <span>Scanning vault notes & links...</span>
          </div>
        )}

        {/* Interactive Graph Canvas */}
        <GraphCanvas
          graphData={graphData}
          searchQuery={searchQuery}
          orphanFilter={orphanFilter}
          selectedTag={selectedTag}
          selectedFolder={selectedFolder}
          showLabels={showLabels}
          showGhostNotes={showGhostNotes}
          colorGroups={colorGroups}
          displaySettings={displaySettings}
          forceSettings={forceSettings}
          layoutMode={layoutMode}
          semanticScores={semanticScores}
          aiMatchedNodeIds={aiMatchedNodeIds}
          aiLearningConnections={aiLearningConnections}
          isPaused={isPaused}
          selectedNode={selectedNode}
          editorSettings={editorSettings}
          onSelectNode={setSelectedNode}
          onOpenInEditor={handleOpenInEditor}
          zoomActionTrigger={zoomAction}
        />

        {/* Slide-out Inspector Panel */}
        <Inspector
          node={selectedNode}
          graphData={graphData}
          editorSettings={editorSettings}
          backgroundSettings={backgroundSettings}
          vaultPath={vaultPath || ''}
          onClose={() => setSelectedNode(null)}
          onSelectNode={setSelectedNode}
          onOpenInEditor={handleOpenInEditor}
          onRevealPath={handleRevealPath}
        />

        {/* Core Plugin Corner Widgets (Bottom-Right: Vault Stats & Overview HUD) */}
        <div className={`plugin-corner-widgets bottom-right ${selectedNode ? 'has-inspector-open' : ''}`}>
          {cornerWidgets
            .filter((w) => w.position === 'bottom-right')
            .map((w) => (
              <React.Fragment key={w.id}>
                {w.render({
                  graphData,
                  vaultPath,
                  orphanFilter,
                  setOrphanFilter,
                })}
              </React.Fragment>
            ))}
        </div>
      </main>

      {/* Settings & Dashboard Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        initialTab={settingsTab}
        onClose={() => setIsSettingsOpen(false)}
        settings={editorSettings}
        onSaveSettings={handleSaveEditorSettings}
        backgroundSettings={backgroundSettings}
        onSaveBackgroundSettings={handleSaveBackgroundSettings}
        vaultPath={vaultPath}
        graphData={graphData}
        onOpenVaultDialog={handleOpenVaultDialog}
      />
    </div>
  );
};

export default App;
