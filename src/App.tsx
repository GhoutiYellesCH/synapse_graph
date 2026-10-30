import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { Controls } from './components/Controls';
import { GraphCanvas } from './components/GraphCanvas';
import { Inspector } from './components/Inspector';
import { SettingsModal } from './components/SettingsModal';
import { EditorSettings, EditorType, GraphData, GraphNode } from './types';
import {
  openInEditor,
  openVaultInEditor,
  pickVaultFolder,
  revealPath,
  scanVault,
} from './services/api';
import './App.css';

const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  preferredEditor: 'nvim',
  customCommand: 'kitty -e nvim "{file}"',
  doubleClickAction: 'editor',
};

export const App: React.FC = () => {
  // Vault state
  const [vaultPath, setVaultPath] = useState<string | null>(() => {
    return localStorage.getItem('obsidian_vault_path');
  });
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [orphanFilter, setOrphanFilter] = useState<'all' | 'highlight' | 'only' | 'hide'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(false);
  const [showGhostNotes, setShowGhostNotes] = useState(false);

  // Physics settings
  const [chargeStrength, setChargeStrength] = useState(180);
  const [linkDistance, setLinkDistance] = useState(70);
  const [centerStrength, setCenterStrength] = useState(0.12);
  const [isPaused, setIsPaused] = useState(false);

  // Zoom action trigger
  const [zoomAction, setZoomAction] = useState<{
    action: 'in' | 'out' | 'fit';
    timestamp: number;
  } | null>(null);

  // Selected note for inspector
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Editor settings
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => {
    try {
      const saved = localStorage.getItem('obsidian_editor_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_EDITOR_SETTINGS;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Save settings
  const handleSaveSettings = (newSettings: EditorSettings) => {
    setEditorSettings(newSettings);
    localStorage.setItem('obsidian_editor_settings', JSON.stringify(newSettings));
  };

  // Scan vault function
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
        localStorage.setItem('obsidian_vault_path', path);
        setVaultPath(path);
      } catch (err: any) {
        setErrorMessage(typeof err === 'string' ? err : err?.message || 'Failed to scan vault');
      } finally {
        setIsLoading(false);
      }
    },
    [showGhostNotes]
  );

  // Load vault on initial mount if saved
  useEffect(() => {
    if (vaultPath) {
      executeScan(vaultPath);
    }
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

  // Launch note in external editor
  const handleOpenInEditor = async (filePath: string, editor: EditorType) => {
    if (!vaultPath) return;
    try {
      await openInEditor(
        filePath,
        vaultPath,
        editor,
        editor === 'custom' ? editorSettings.customCommand : undefined
      );
    } catch (err: any) {
      alert(`Could not launch editor: ${err}`);
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

  return (
    <div className="app-layout">
      {/* Top Bar */}
      <TopBar
        vaultPath={vaultPath}
        graphData={graphData}
        isLoading={isLoading}
        orphanFilter={orphanFilter}
        setOrphanFilter={setOrphanFilter}
        editorSettings={editorSettings}
        onOpenVaultDialog={handleOpenVaultDialog}
        onRefreshVault={() => vaultPath && executeScan(vaultPath)}
        onOpenVaultInEditor={handleOpenVaultInEditor}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main View Area */}
      <main className="main-viewport">
        {/* Floating Controls Overlay */}
        <Controls
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
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
          chargeStrength={chargeStrength}
          setChargeStrength={setChargeStrength}
          linkDistance={linkDistance}
          setLinkDistance={setLinkDistance}
          centerStrength={centerStrength}
          setCenterStrength={setCenterStrength}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused(!isPaused)}
          onZoomIn={() => setZoomAction({ action: 'in', timestamp: Date.now() })}
          onZoomOut={() => setZoomAction({ action: 'out', timestamp: Date.now() })}
          onFitView={() => setZoomAction({ action: 'fit', timestamp: Date.now() })}
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
          chargeStrength={chargeStrength}
          linkDistance={linkDistance}
          centerStrength={centerStrength}
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
          vaultPath={vaultPath || ''}
          onClose={() => setSelectedNode(null)}
          onSelectNode={setSelectedNode}
          onOpenInEditor={handleOpenInEditor}
          onRevealPath={handleRevealPath}
        />
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={editorSettings}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
};

export default App;
