import React, { useState } from 'react';
import {
  Search,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  Filter,
  Eye,
  Layers,
  Zap,
  Plus,
  Trash2,
  RotateCcw,
  Palette,
  Image as ImageIcon,
  Puzzle,
  Sparkles,
  Bot,
  CircleDot,
  Network,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import {
  AntigravityAiResult,
  ColorGroup,
  DisplaySettings,
  ForceSettings,
  GraphLayoutMode,
} from '../types';

interface ControlsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSemanticMode: boolean;
  setIsSemanticMode: (val: boolean) => void;
  layoutMode: GraphLayoutMode;
  setLayoutMode: (mode: GraphLayoutMode) => void;
  onTriggerAntigravityQuery: () => void;
  isAiThinking: boolean;
  aiResult: AntigravityAiResult | null;
  onClearAiResult: () => void;
  onSelectNodeByName: (name: string) => void;
  orphanFilter: 'all' | 'highlight' | 'only' | 'hide';
  setOrphanFilter: (filter: 'all' | 'highlight' | 'only' | 'hide') => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  selectedFolder: string | null;
  setSelectedFolder: (folder: string | null) => void;
  availableTags: string[];
  availableFolders: string[];
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  showGhostNotes: boolean;
  setShowGhostNotes: (show: boolean) => void;
  colorGroups: ColorGroup[];
  setColorGroups: React.Dispatch<React.SetStateAction<ColorGroup[]>>;
  displaySettings: DisplaySettings;
  setDisplaySettings: React.Dispatch<React.SetStateAction<DisplaySettings>>;
  forceSettings: ForceSettings;
  setForceSettings: React.Dispatch<React.SetStateAction<ForceSettings>>;
  onResetForces: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onOpenSettingsTab: (tab: 'dashboard' | 'editor' | 'theme' | 'background' | 'plugins') => void;
}

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

export const Controls: React.FC<ControlsProps> = ({
  searchQuery,
  setSearchQuery,
  isSemanticMode,
  setIsSemanticMode,
  layoutMode,
  setLayoutMode,
  onTriggerAntigravityQuery,
  isAiThinking,
  aiResult,
  onClearAiResult,
  onSelectNodeByName,
  orphanFilter,
  setOrphanFilter,
  selectedTag,
  setSelectedTag,
  selectedFolder,
  setSelectedFolder,
  availableTags,
  availableFolders,
  showLabels,
  setShowLabels,
  showGhostNotes,
  setShowGhostNotes,
  colorGroups,
  setColorGroups,
  displaySettings,
  setDisplaySettings,
  forceSettings,
  setForceSettings,
  onResetForces,
  isPaused,
  onTogglePause,
  onZoomIn,
  onZoomOut,
  onFitView,
  onOpenSettingsTab,
}) => {
  const [activePanel, setActivePanel] = useState<'none' | 'filters' | 'groups' | 'display' | 'forces' | 'ai'>('none');

  const togglePanel = (panel: 'filters' | 'groups' | 'display' | 'forces' | 'ai') => {
    setActivePanel((prev) => (prev === panel ? 'none' : panel));
  };

  const handleAddColorGroup = () => {
    const nextColor = PRESET_COLORS[colorGroups.length % PRESET_COLORS.length];
    const newGroup: ColorGroup = {
      id: 'grp-' + Date.now(),
      query: '',
      color: nextColor,
    };
    setColorGroups([...colorGroups, newGroup]);
  };

  const handleUpdateColorGroup = (id: string, updates: Partial<ColorGroup>) => {
    setColorGroups(
      colorGroups.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  };

  const handleRemoveColorGroup = (id: string) => {
    setColorGroups(colorGroups.filter((g) => g.id !== id));
  };

  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      if (isSemanticMode) {
        onTriggerAntigravityQuery();
        setActivePanel('ai');
      }
    }
  };

  return (
    <div className="controls-container">
      {/* Top Search & Controls Bar */}
      <div className="search-bar-wrap">
        <div className={`search-input-box ${isSemanticMode ? 'semantic-mode' : ''}`}>
          {isSemanticMode ? (
            <Sparkles className="search-icon text-cyan-400" />
          ) : (
            <Search className="search-icon" />
          )}

          <input
            type="text"
            placeholder={
              isSemanticMode
                ? 'Ask a question or semantic concept (e.g. "what notes talk about learning?")...'
                : 'Search notes, paths, tags...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDownSearch}
            className="search-input"
          />

          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => {
                setSearchQuery('');
                onClearAiResult();
              }}
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Semantic Search Toggle Mode */}
          <button
            className={`semantic-mode-toggle ${isSemanticMode ? 'active' : ''}`}
            onClick={() => setIsSemanticMode(!isSemanticMode)}
            title="Toggle between Keyword Search and AI Semantic Search"
          >
            <Sparkles className="w-3 h-3" />
            <span>Semantic</span>
          </button>
        </div>

        {/* Antigravity AI Deep Search Button */}
        <button
          className={`btn-antigravity-ai ${isAiThinking ? 'is-thinking' : ''}`}
          onClick={() => {
            onTriggerAntigravityQuery();
            setActivePanel('ai');
          }}
          title="Run AI Semantic Analysis & Learning Bridge using Antigravity CLI"
          disabled={isAiThinking}
        >
          <Bot className="w-3.5 h-3.5 text-cyan-300" />
          <span>{isAiThinking ? 'Reasoning...' : 'Ask Antigravity'}</span>
        </button>

        {/* Orphan Quick Filter Buttons */}
        <div className="orphan-filter-group">
          <button
            className={`filter-btn ${orphanFilter === 'all' ? 'active' : ''}`}
            onClick={() => setOrphanFilter('all')}
            title="Show all notes"
          >
            All
          </button>
          <button
            className={`filter-btn ${orphanFilter === 'highlight' ? 'active highlight' : ''}`}
            onClick={() => setOrphanFilter('highlight')}
            title="Highlight orphan notes with glowing pulse"
          >
            Highlight Orphans
          </button>
          <button
            className={`filter-btn ${orphanFilter === 'only' ? 'active only' : ''}`}
            onClick={() => setOrphanFilter('only')}
            title="Show only unconnected orphan notes"
          >
            Orphans Only
          </button>
          <button
            className={`filter-btn ${orphanFilter === 'hide' ? 'active' : ''}`}
            onClick={() => setOrphanFilter('hide')}
            title="Hide orphan notes"
          >
            Hide Orphans
          </button>
        </div>

        {/* Spherical Layout Mode Selector */}
        <div className="layout-mode-group">
          <button
            className={`layout-mode-btn ${layoutMode === 'spherical' ? 'active' : ''}`}
            onClick={() =>
              setLayoutMode(layoutMode === 'spherical' ? 'standard' : 'spherical')
            }
            title={
              layoutMode === 'spherical'
                ? 'Obsidian Spherical Mode Active: Children orbit parent hubs in clean sunflower florets, and orphans form an outer circular halo.'
                : 'Click to enable Obsidian Spherical & Floret mode'
            }
          >
            <CircleDot className="w-3.5 h-3.5 text-indigo-400" />
            <span>{layoutMode === 'spherical' ? 'Spherical Halo' : 'Free Force'}</span>
          </button>
        </div>

        {/* Obsidian Graph Panels Toggle Buttons */}
        <div className="obsidian-graph-toggles">
          <button
            className={`panel-toggle-btn ${activePanel === 'filters' ? 'active' : ''}`}
            onClick={() => togglePanel('filters')}
            title="Filters (Search, Tags, Folders, Existing notes)"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>

          <button
            className={`panel-toggle-btn ${activePanel === 'groups' ? 'active' : ''}`}
            onClick={() => togglePanel('groups')}
            title="Groups (Color nodes by query, tag, or path)"
          >
            <Layers className="w-4 h-4" />
            <span>Groups {colorGroups.length > 0 && `(${colorGroups.length})`}</span>
          </button>

          <button
            className={`panel-toggle-btn ${activePanel === 'display' ? 'active' : ''}`}
            onClick={() => togglePanel('display')}
            title="Display (Arrows, Node size, Link thickness, Labels)"
          >
            <Eye className="w-4 h-4" />
            <span>Display</span>
          </button>

          <button
            className={`panel-toggle-btn ${activePanel === 'forces' ? 'active' : ''}`}
            onClick={() => togglePanel('forces')}
            title="Forces (Center, Repel, Link distance & strength)"
          >
            <Zap className="w-4 h-4" />
            <span>Forces</span>
          </button>

          {aiResult && (
            <button
              className={`panel-toggle-btn ai-tab-btn ${activePanel === 'ai' ? 'active' : ''}`}
              onClick={() => togglePanel('ai')}
              title="View Antigravity AI Search & Learning Results"
            >
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>AI Insights</span>
            </button>
          )}
        </div>

        {/* Quick Modal Shortcuts */}
        <div className="quick-theme-shortcuts">
          <button
            className="panel-toggle-btn icon-only"
            onClick={() => onOpenSettingsTab('dashboard')}
            title="Open Dashboard & Documentation"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
          </button>
          <button
            className="panel-toggle-btn icon-only"
            onClick={() => onOpenSettingsTab('theme')}
            title="Custom CSS Theme Editor"
          >
            <Palette className="w-4 h-4 text-pink-400" />
          </button>
          <button
            className="panel-toggle-btn icon-only"
            onClick={() => onOpenSettingsTab('background')}
            title="Blurred Background Image Settings"
          >
            <ImageIcon className="w-4 h-4 text-cyan-400" />
          </button>
          <button
            className="panel-toggle-btn icon-only"
            onClick={() => onOpenSettingsTab('plugins')}
            title="Plugin Manager & Custom Scripts"
          >
            <Puzzle className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Panel 0: Antigravity AI Learning & Semantic Search Drawer */}
      {activePanel === 'ai' && aiResult && (
        <div className="obsidian-panel-drawer ai-assistant-drawer">
          <div className="panel-drawer-header">
            <div className="ai-drawer-title-row">
              <Bot className="w-4 h-4 text-emerald-400" />
              <h4 className="drawer-title">Antigravity AI Learning Bridge</h4>
            </div>
            <div className="drawer-actions">
              <button
                className="drawer-close"
                onClick={() => setActivePanel('none')}
                title="Close AI panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="drawer-body ai-drawer-body">
            {/* AI Synthesized Answer */}
            <div className="ai-answer-card">
              <div className="ai-section-label">Synthesis & Answer:</div>
              <div className="ai-answer-text">{aiResult.answer}</div>
            </div>

            {/* Matched / Cited Notes */}
            {aiResult.matched_notes.length > 0 && (
              <div className="ai-section">
                <div className="ai-section-label">
                  Semantically Matched Notes ({aiResult.matched_notes.length}):
                </div>
                <div className="ai-notes-chips">
                  {aiResult.matched_notes.map((name) => (
                    <button
                      key={name}
                      className="ai-note-chip"
                      onClick={() => onSelectNodeByName(name)}
                      title={`Jump to note "${name}"`}
                    >
                      <span>{name}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conceptual Learning Connections */}
            {aiResult.learning_connections.length > 0 && (
              <div className="ai-section">
                <div className="ai-section-label">Learning & Conceptual Bridges:</div>
                <div className="ai-connections-list">
                  {aiResult.learning_connections.map((conn, idx) => (
                    <div key={idx} className="ai-conn-card">
                      <div className="ai-conn-nodes">
                        <span
                          className="conn-node clickable"
                          onClick={() => onSelectNodeByName(conn.source)}
                        >
                          {conn.source}
                        </span>
                        <Network className="w-3.5 h-3.5 text-cyan-400" />
                        <span
                          className="conn-node clickable"
                          onClick={() => onSelectNodeByName(conn.target)}
                        >
                          {conn.target}
                        </span>
                      </div>
                      <div className="ai-conn-concept">{conn.concept}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Insights */}
            {aiResult.key_insights.length > 0 && (
              <div className="ai-section">
                <div className="ai-section-label">Key Takeaways:</div>
                <ul className="ai-insights-list">
                  {aiResult.key_insights.map((ins, idx) => (
                    <li key={idx}>{ins}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapsible Panel 1: Obsidian Filters */}
      {activePanel === 'filters' && (
        <div className="obsidian-panel-drawer">
          <div className="panel-drawer-header">
            <h4 className="drawer-title">Filters</h4>
            <button className="drawer-close" onClick={() => setActivePanel('none')}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="drawer-body">
            <div className="drawer-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showGhostNotes}
                  onChange={(e) => setShowGhostNotes(e.target.checked)}
                />
                <span>Show unresolved / non-existing notes</span>
              </label>
            </div>

            <div className="drawer-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                />
                <span>Always show node title labels</span>
              </label>
            </div>

            {availableTags.length > 0 && (
              <div className="drawer-row select-row">
                <label className="select-label">Filter by Tag:</label>
                <select
                  value={selectedTag || ''}
                  onChange={(e) => setSelectedTag(e.target.value || null)}
                  className="drawer-select"
                >
                  <option value="">All Tags ({availableTags.length})</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>
                      #{tag}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {availableFolders.length > 0 && (
              <div className="drawer-row select-row">
                <label className="select-label">Filter by Folder:</label>
                <select
                  value={selectedFolder || ''}
                  onChange={(e) => setSelectedFolder(e.target.value || null)}
                  className="drawer-select"
                >
                  <option value="">All Folders ({availableFolders.length})</option>
                  {availableFolders.map((f) => (
                    <option key={f} value={f}>
                      📁 {f}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapsible Panel 2: Obsidian Groups (Color Rules) */}
      {activePanel === 'groups' && (
        <div className="obsidian-panel-drawer">
          <div className="panel-drawer-header">
            <h4 className="drawer-title">Groups (Node Colors)</h4>
            <div className="drawer-actions">
              <button className="drawer-add-btn" onClick={handleAddColorGroup}>
                <Plus className="w-3.5 h-3.5" />
                <span>New group</span>
              </button>
              <button className="drawer-close" onClick={() => setActivePanel('none')}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="drawer-body">
            <p className="drawer-hint">
              Query matching: <code>tag:#work</code>, <code>path:daily</code>, or any note name substring.
            </p>
            {colorGroups.length === 0 ? (
              <div className="empty-groups-notice">
                <span>No color groups defined. Click "New group" to assign custom colors to matching notes.</span>
              </div>
            ) : (
              <div className="groups-list">
                {colorGroups.map((group) => (
                  <div key={group.id} className="group-item-row">
                    <input
                      type="color"
                      value={group.color}
                      onChange={(e) => handleUpdateColorGroup(group.id, { color: e.target.value })}
                      className="group-color-picker"
                      title="Choose node color"
                    />
                    <input
                      type="text"
                      placeholder="e.g. tag:#project or path:inbox"
                      value={group.query}
                      onChange={(e) => handleUpdateColorGroup(group.id, { query: e.target.value })}
                      className="group-query-input"
                    />
                    <button
                      className="group-delete-btn"
                      onClick={() => handleRemoveColorGroup(group.id)}
                      title="Delete group"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapsible Panel 3: Obsidian Display Settings */}
      {activePanel === 'display' && (
        <div className="obsidian-panel-drawer">
          <div className="panel-drawer-header">
            <h4 className="drawer-title">Display</h4>
            <button className="drawer-close" onClick={() => setActivePanel('none')}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="drawer-body">
            <div className="drawer-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={displaySettings.showArrows}
                  onChange={(e) =>
                    setDisplaySettings({ ...displaySettings, showArrows: e.target.checked })
                  }
                />
                <span>Show directional link arrows</span>
              </label>
            </div>

            <div className="slider-item">
              <div className="slider-label-row">
                <span>Node Size ({displaySettings.nodeSizeMultiplier.toFixed(1)}x)</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={displaySettings.nodeSizeMultiplier}
                onChange={(e) =>
                  setDisplaySettings({
                    ...displaySettings,
                    nodeSizeMultiplier: parseFloat(e.target.value),
                  })
                }
                className="slider-range"
              />
            </div>

            <div className="slider-item">
              <div className="slider-label-row">
                <span>Link Thickness ({displaySettings.linkThicknessMultiplier.toFixed(1)}x)</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.2"
                value={displaySettings.linkThicknessMultiplier}
                onChange={(e) =>
                  setDisplaySettings({
                    ...displaySettings,
                    linkThicknessMultiplier: parseFloat(e.target.value),
                  })
                }
                className="slider-range"
              />
            </div>

            <div className="slider-item">
              <div className="slider-label-row">
                <span>Text Fade Threshold ({displaySettings.textFadeThreshold.toFixed(1)}x zoom)</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="3.5"
                step="0.1"
                value={displaySettings.textFadeThreshold}
                onChange={(e) =>
                  setDisplaySettings({
                    ...displaySettings,
                    textFadeThreshold: parseFloat(e.target.value),
                  })
                }
                className="slider-range"
              />
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Panel 4: Obsidian Forces */}
      {activePanel === 'forces' && (
        <div className="obsidian-panel-drawer">
          <div className="panel-drawer-header">
            <h4 className="drawer-title">Forces</h4>
            <div className="drawer-actions">
              <button className="drawer-reset-btn" onClick={onResetForces} title="Reset to standard forces">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button className="drawer-close" onClick={() => setActivePanel('none')}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="drawer-body">
            <div className="slider-item">
              <div className="slider-label-row">
                <span>Center force</span>
                <span className="slider-value">{forceSettings.centerStrength.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={forceSettings.centerStrength}
                onChange={(e) =>
                  setForceSettings({ ...forceSettings, centerStrength: parseFloat(e.target.value) })
                }
                className="slider-range"
              />
              <span className="slider-hint">Keeps nodes pulled compactly towards the center.</span>
            </div>

            <div className="slider-item">
              <div className="slider-label-row">
                <span>Repel force</span>
                <span className="slider-value">{forceSettings.repelStrength}</span>
              </div>
              <input
                type="range"
                min="30"
                max="400"
                step="10"
                value={forceSettings.repelStrength}
                onChange={(e) =>
                  setForceSettings({ ...forceSettings, repelStrength: parseInt(e.target.value, 10) })
                }
                className="slider-range"
              />
              <span className="slider-hint">Repels nodes from overlapping with bounded distance cutoff.</span>
            </div>

            <div className="slider-item">
              <div className="slider-label-row">
                <span>Link distance</span>
                <span className="slider-value">{forceSettings.linkDistance}px</span>
              </div>
              <input
                type="range"
                min="15"
                max="200"
                step="5"
                value={forceSettings.linkDistance}
                onChange={(e) =>
                  setForceSettings({ ...forceSettings, linkDistance: parseInt(e.target.value, 10) })
                }
                className="slider-range"
              />
              <span className="slider-hint">Desired spacing between connected notes.</span>
            </div>

            <div className="slider-item">
              <div className="slider-label-row">
                <span>Link force (stiffness)</span>
                <span className="slider-value">{forceSettings.linkStrength.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={forceSettings.linkStrength}
                onChange={(e) =>
                  setForceSettings({ ...forceSettings, linkStrength: parseFloat(e.target.value) })
                }
                className="slider-range"
              />
              <span className="slider-hint">How rigidly links pull interconnected clusters together.</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Canvas Controls */}
      <div className="graph-action-bar">
        <button className="canvas-tool-btn" onClick={onZoomIn} title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button className="canvas-tool-btn" onClick={onZoomOut} title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button className="canvas-tool-btn" onClick={onFitView} title="Center & Fit View">
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          className={`canvas-tool-btn ${isPaused ? 'paused-active' : ''}`}
          onClick={onTogglePause}
          title={isPaused ? 'Resume Simulation' : 'Freeze Simulation'}
        >
          {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
