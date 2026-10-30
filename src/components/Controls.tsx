import React, { useState } from 'react';
import {
  Search,
  X,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  Filter,
  Unlink,
  Folder,
  Hash,
} from 'lucide-react';

interface ControlsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
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
  chargeStrength: number;
  setChargeStrength: (v: number) => void;
  linkDistance: number;
  setLinkDistance: (v: number) => void;
  centerStrength: number;
  setCenterStrength: (v: number) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  searchQuery,
  setSearchQuery,
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
  chargeStrength,
  setChargeStrength,
  linkDistance,
  setLinkDistance,
  centerStrength,
  setCenterStrength,
  isPaused,
  onTogglePause,
  onZoomIn,
  onZoomOut,
  onFitView,
}) => {
  const [isPhysicsOpen, setIsPhysicsOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  return (
    <div className="controls-container">
      {/* Search & Quick Filters Bar */}
      <div className="search-bar-wrap">
        <div className="search-input-box">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search notes, paths, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

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
            className={`filter-btn ${orphanFilter === 'highlight' ? 'active' : ''}`}
            onClick={() => setOrphanFilter('highlight')}
            title="Highlight unconnected notes with glowing amber"
          >
            Highlight Orphans
          </button>
          <button
            className={`filter-btn orphan-only-btn ${orphanFilter === 'only' ? 'active' : ''}`}
            onClick={() => setOrphanFilter('only')}
            title="Show ONLY unconnected notes (orphans)"
          >
            <Unlink className="w-3 h-3" />
            <span>Orphans Only</span>
          </button>
          <button
            className={`filter-btn ${orphanFilter === 'hide' ? 'active' : ''}`}
            onClick={() => setOrphanFilter('hide')}
            title="Hide all unconnected notes"
          >
            Hide Orphans
          </button>
        </div>

        {/* Toggle Filter & Physics Panels */}
        <div className="toggle-panels-group">
          <button
            className={`panel-toggle-btn ${isFilterPanelOpen ? 'open' : ''} ${
              selectedTag || selectedFolder ? 'has-filter' : ''
            }`}
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            title="Filter by Tags & Folders"
          >
            <Filter className="w-4 h-4" />
            {(selectedTag || selectedFolder) && <span className="active-dot" />}
          </button>

          <button
            className={`panel-toggle-btn ${isPhysicsOpen ? 'open' : ''}`}
            onClick={() => setIsPhysicsOpen(!isPhysicsOpen)}
            title="Graph Physics & View Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tags & Folders Drawer */}
      {isFilterPanelOpen && (
        <div className="drawer-panel">
          <div className="drawer-header">
            <span className="drawer-title">Filters</span>
            {(selectedTag || selectedFolder) && (
              <button
                className="clear-all-filters-btn"
                onClick={() => {
                  setSelectedTag(null);
                  setSelectedFolder(null);
                }}
              >
                Clear all filters
              </button>
            )}
          </div>

          {availableFolders.length > 0 && (
            <div className="filter-section">
              <label className="section-label">
                <Folder className="w-3.5 h-3.5" />
                <span>Folder</span>
              </label>
              <select
                className="select-input"
                value={selectedFolder || ''}
                onChange={(e) => setSelectedFolder(e.target.value || null)}
              >
                <option value="">All Folders</option>
                {availableFolders.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          )}

          {availableTags.length > 0 && (
            <div className="filter-section">
              <label className="section-label">
                <Hash className="w-3.5 h-3.5" />
                <span>Tags ({availableTags.length})</span>
              </label>
              <div className="tags-chip-list">
                {availableTags.slice(0, 30).map((tag) => (
                  <button
                    key={tag}
                    className={`tag-chip ${selectedTag === tag ? 'selected' : ''}`}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  >
                    #{tag}
                  </button>
                ))}
                {availableTags.length > 30 && (
                  <span className="tag-more-label">+{availableTags.length - 30} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Physics & Force Sliders Drawer */}
      {isPhysicsOpen && (
        <div className="drawer-panel physics-panel">
          <div className="drawer-header">
            <span className="drawer-title">Graph Settings</span>
          </div>

          <div className="setting-row">
            <label className="setting-label">
              <span>Node Repulsion</span>
              <span className="setting-val">{Math.round(chargeStrength)}</span>
            </label>
            <input
              type="range"
              min="50"
              max="600"
              value={chargeStrength}
              onChange={(e) => setChargeStrength(Number(e.target.value))}
              className="range-slider"
            />
          </div>

          <div className="setting-row">
            <label className="setting-label">
              <span>Link Distance</span>
              <span className="setting-val">{Math.round(linkDistance)}</span>
            </label>
            <input
              type="range"
              min="20"
              max="250"
              value={linkDistance}
              onChange={(e) => setLinkDistance(Number(e.target.value))}
              className="range-slider"
            />
          </div>

          <div className="setting-row">
            <label className="setting-label">
              <span>Center Gravity</span>
              <span className="setting-val">{centerStrength.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
              value={centerStrength}
              onChange={(e) => setCenterStrength(Number(e.target.value))}
              className="range-slider"
            />
          </div>

          <div className="setting-toggle-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
              <span>Show Note Labels</span>
            </label>
          </div>

          <div className="setting-toggle-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showGhostNotes}
                onChange={(e) => setShowGhostNotes(e.target.checked)}
              />
              <span>Show Uncreated / Ghost Notes</span>
            </label>
          </div>
        </div>
      )}

      {/* Floating Zoom / Navigation Toolbar */}
      <div className="zoom-toolbar">
        <button className="zoom-btn" onClick={onZoomIn} title="Zoom In (+)">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button className="zoom-btn" onClick={onZoomOut} title="Zoom Out (-)">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button className="zoom-btn" onClick={onFitView} title="Center & Fit Graph">
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          className={`zoom-btn ${isPaused ? 'paused' : ''}`}
          onClick={onTogglePause}
          title={isPaused ? 'Resume Physics' : 'Pause Physics'}
        >
          {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
