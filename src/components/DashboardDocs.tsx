import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Terminal,
  Cpu,
  Sparkles,
  Zap,
  Code,
  FileCode,
  CheckCircle2,
  Plus,
  Trash2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { GraphData, SnippetInfo } from '../types';
import {
  deleteCssSnippet,
  getAppConfigDir,
  listCssSnippets,
  openConfigFolder,
  writeCssSnippet,
} from '../services/api';

interface DashboardDocsProps {
  vaultPath: string | null;
  graphData: GraphData | null;
  onOpenVaultDialog: () => void;
}

export const DashboardDocs: React.FC<DashboardDocsProps> = ({
  vaultPath,
  graphData,
  onOpenVaultDialog,
}) => {
  const [configDir, setConfigDir] = useState<string>('~/.config/synapse-graph');
  const [snippets, setSnippets] = useState<SnippetInfo[]>([]);
  const [activeSnippets, setActiveSnippets] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('synapse_active_snippets');
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
    return new Set(['accent-glow.css']);
  });

  const [newSnippetName, setNewSnippetName] = useState('');
  const [newSnippetCode, setNewSnippetCode] = useState(`/* Custom CSS Snippet */\n:root {\n  --accent-color: #38bdf8;\n}\n`);
  const [showAddSnippet, setShowAddSnippet] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Load config directory and snippets from disk
  const refreshSnippets = async () => {
    try {
      const dir = await getAppConfigDir();
      setConfigDir(dir);
      const list = await listCssSnippets();
      setSnippets(list);
    } catch (e) {
      console.error('Failed to load snippets from disk:', e);
    }
  };

  useEffect(() => {
    refreshSnippets();
  }, []);

  // Apply active snippets into DOM
  useEffect(() => {
    // Remove existing snippet style elements
    document.querySelectorAll('[data-synapse-snippet]').forEach((el) => el.remove());

    snippets.forEach((snippet) => {
      if (activeSnippets.has(snippet.filename)) {
        const style = document.createElement('style');
        style.setAttribute('data-synapse-snippet', snippet.filename);
        style.textContent = snippet.content;
        document.head.appendChild(style);
      }
    });

    localStorage.setItem(
      'synapse_active_snippets',
      JSON.stringify(Array.from(activeSnippets))
    );
  }, [activeSnippets, snippets]);

  const handleToggleSnippet = (filename: string) => {
    const next = new Set(activeSnippets);
    if (next.has(filename)) {
      next.delete(filename);
    } else {
      next.add(filename);
    }
    setActiveSnippets(next);
  };

  const handleCreateSnippet = async () => {
    if (!newSnippetName.trim()) return;
    const cleanName = newSnippetName.endsWith('.css')
      ? newSnippetName.trim()
      : `${newSnippetName.trim()}.css`;

    try {
      await writeCssSnippet(cleanName, newSnippetCode);
      setShowAddSnippet(false);
      setNewSnippetName('');
      await refreshSnippets();
      setActiveSnippets(new Set(activeSnippets).add(cleanName));
    } catch (e) {
      alert(`Error saving snippet: ${e}`);
    }
  };

  const handleDeleteSnippet = async (filename: string) => {
    if (confirm(`Delete snippet "${filename}" from disk?`)) {
      try {
        await deleteCssSnippet(filename);
        const next = new Set(activeSnippets);
        next.delete(filename);
        setActiveSnippets(next);
        await refreshSnippets();
      } catch (e) {
        alert(`Error deleting snippet: ${e}`);
      }
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  // Metrics calculations
  const totalNotes = graphData?.nodes.length || 0;
  const totalLinks = graphData?.links.length || 0;
  const totalOrphans = graphData?.orphan_count || 0;
  const density =
    totalNotes > 1
      ? ((2 * totalLinks) / (totalNotes * (totalNotes - 1)) * 100).toFixed(2)
      : '0.00';
  const avgDegree =
    totalNotes > 0 ? ((2 * totalLinks) / totalNotes).toFixed(1) : '0.0';

  return (
    <div className="dashboard-container">
      {/* Hero Banner */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Synapse Graph v1.0.0</span>
          </div>
          <h1 className="hero-title">Synapse Knowledge Dashboard</h1>
          <p className="hero-subtitle">
            High-performance standalone Markdown knowledge graph visualizer and orphan note auditor.
            Created by <strong className="text-white">Ghouti Yelles Chaouche</strong>.
          </p>

          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={onOpenVaultDialog}>
              <FolderOpen className="w-4 h-4" />
              <span>{vaultPath ? 'Switch Vault' : 'Open Vault Folder'}</span>
            </button>
            <button
              className="btn-hero-secondary"
              onClick={() => openConfigFolder()}
              title="Open ~/.config/synapse-graph in file manager"
            >
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Open Config Folder</span>
            </button>
          </div>
        </div>

        <div className="hero-vault-card">
          <div className="vault-card-header">
            <span className="card-tag">Active Vault</span>
            <span className="vault-path-text" title={vaultPath || 'No vault loaded'}>
              {vaultPath || 'No vault opened yet'}
            </span>
          </div>
          <div className="vault-stats-grid">
            <div className="stat-pill">
              <span className="stat-val">{totalNotes}</span>
              <span className="stat-lbl">Notes</span>
            </div>
            <div className="stat-pill">
              <span className="stat-val">{totalLinks}</span>
              <span className="stat-lbl">Links</span>
            </div>
            <div className="stat-pill orphan-pill">
              <span className="stat-val text-amber-400">{totalOrphans}</span>
              <span className="stat-lbl">Orphans</span>
            </div>
            <div className="stat-pill">
              <span className="stat-val text-cyan-400">{density}%</span>
              <span className="stat-lbl">Density</span>
            </div>
            <div className="stat-pill">
              <span className="stat-val text-indigo-400">{avgDegree}</span>
              <span className="stat-lbl">Avg Links</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Dashboard Panels */}
      <div className="dashboard-grid">
        {/* Panel 1: Native CLI Mode Guide */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title-wrap">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h3 className="card-title">Native CLI Mode</h3>
            </div>
            <span className="card-badge">Installed Command</span>
          </div>
          <div className="card-body">
            <p className="card-text">
              Synapse Graph is installed natively into your system <code>/usr/bin/synapse-graph</code>.
              You can open any folder as a vault from your shell or terminal:
            </p>

            <div
              className="code-snippet-box"
              onClick={() => handleCopy('synapse-graph ~/Documents/Notes')}
              title="Click to copy"
            >
              <code>synapse-graph ~/Documents/Notes</code>
              <span className="copy-indicator">
                {copiedCmd === 'synapse-graph ~/Documents/Notes' ? 'Copied!' : 'Copy'}
              </span>
            </div>

            <div
              className="code-snippet-box mt-2"
              onClick={() => handleCopy('synapse-graph .')}
              title="Click to copy"
            >
              <code>synapse-graph .</code>
              <span className="copy-indicator">
                {copiedCmd === 'synapse-graph .' ? 'Copied!' : 'Copy'}
              </span>
            </div>

            <div className="cli-features-list">
              <div className="feature-row">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Instant startup with automatic vault scanning</span>
              </div>
              <div className="feature-row">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Restores per-vault colors, forces, and filter configuration</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Config & File Storage Hierarchy */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title-wrap">
              <Cpu className="w-4 h-4 text-purple-400" />
              <h3 className="card-title">Storage & Config System</h3>
            </div>
            <button
              className="btn-icon-refresh"
              onClick={() => openConfigFolder()}
              title="Open ~/.config/synapse-graph"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
          <div className="card-body">
            <p className="card-text">
              All user configurations, per-vault settings, and mods are stored cleanly inside your Linux home directory:
            </p>

            <div className="dir-tree">
              <div className="tree-item">
                <code className="tree-path">~/.config/synapse-graph/</code>
                <span className="tree-desc">Base configuration folder</span>
              </div>
              <div className="tree-item sub">
                <code className="tree-path">├── vault_data/</code>
                <span className="tree-desc">Per-vault remembered forces, colors & state</span>
              </div>
              <div className="tree-item sub">
                <code className="tree-path">├── plugins/</code>
                <span className="tree-desc">User mods & extensible JavaScript scripts</span>
              </div>
              <div className="tree-item sub">
                <code className="tree-path">└── snippets/</code>
                <span className="tree-desc">Custom CSS snippets directory</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 3: CSS Snippets Manager */}
        <div className="dashboard-card full-width">
          <div className="card-header">
            <div className="card-title-wrap">
              <FileCode className="w-4 h-4 text-pink-400" />
              <h3 className="card-title">CSS Snippets Hub</h3>
              <span className="badge-count">{snippets.length} on disk</span>
            </div>
            <div className="card-actions">
              <button
                className="btn-card-action"
                onClick={() => setShowAddSnippet(!showAddSnippet)}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Snippet</span>
              </button>
              <button
                className="btn-card-action"
                onClick={refreshSnippets}
                title="Refresh snippets from ~/.config/synapse-graph/snippets/"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="card-body">
            <p className="card-text">
              Drop <code>.css</code> files into <code>{configDir}/snippets/</code> or create them below.
              Toggle them on and off individually without restarting:
            </p>

            {showAddSnippet && (
              <div className="new-snippet-panel">
                <div className="snippet-input-row">
                  <input
                    type="text"
                    placeholder="snippet-name.css"
                    value={newSnippetName}
                    onChange={(e) => setNewSnippetName(e.target.value)}
                    className="drawer-select"
                  />
                  <div className="snippet-actions">
                    <button
                      className="btn-hero-secondary small"
                      onClick={() => setShowAddSnippet(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-hero-primary small"
                      onClick={handleCreateSnippet}
                    >
                      Save to Snippets
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={newSnippetCode}
                  onChange={(e) => setNewSnippetCode(e.target.value)}
                  className="custom-css-textarea mt-2"
                />
              </div>
            )}

            <div className="snippets-grid">
              {snippets.map((snip) => {
                const isActive = activeSnippets.has(snip.filename);
                return (
                  <div
                    key={snip.filename}
                    className={`snippet-card ${isActive ? 'active' : ''}`}
                  >
                    <div className="snippet-header">
                      <span className="snippet-name">{snip.filename}</span>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => handleToggleSnippet(snip.filename)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    <div className="snippet-footer">
                      <span className="snippet-bytes">
                        {snip.content.length} characters
                      </span>
                      <button
                        className="btn-delete-snippet"
                        onClick={() => handleDeleteSnippet(snip.filename)}
                        title="Delete snippet file from disk"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel 4: Keyboard & Mouse Navigation Guide */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title-wrap">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="card-title">Navigation & Controls</h3>
            </div>
          </div>
          <div className="card-body">
            <table className="shortcuts-table">
              <tbody>
                <tr>
                  <td><kbd>Left Drag</kbd></td>
                  <td>Pan and rotate around graph space</td>
                </tr>
                <tr>
                  <td><kbd>Scroll Wheel</kbd></td>
                  <td>Smooth zoom in / zoom out</td>
                </tr>
                <tr>
                  <td><kbd>Hover Node</kbd></td>
                  <td>Highlights 1st-degree neighbors and connects</td>
                </tr>
                <tr>
                  <td><kbd>Single Click</kbd></td>
                  <td>Inspect note metadata, links & preview</td>
                </tr>
                <tr>
                  <td><kbd>Double Click</kbd></td>
                  <td>Open directly in Neovim, VS Code, or Emacs</td>
                </tr>
                <tr>
                  <td><kbd>Right Click</kbd></td>
                  <td>Quick-launch in default external editor</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel 5: Plugin Architecture Guide */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title-wrap">
              <Code className="w-4 h-4 text-blue-400" />
              <h3 className="card-title">Plugin Modding API</h3>
            </div>
          </div>
          <div className="card-body">
            <p className="card-text">
              Custom JavaScript mods placed in <code>~/.config/synapse-graph/plugins/*.js</code> receive a rich <code>context</code>:
            </p>

            <ul className="api-hook-list">
              <li>
                <code>context.registerInspectorPanel(panel)</code>: Add custom cards to note inspector.
              </li>
              <li>
                <code>context.registerNodeColorDecorator(fn)</code>: Dynamic node color tints.
              </li>
              <li>
                <code>context.openNote(path, editor)</code>: Programmatic editor launcher.
              </li>
              <li>
                <code>context.on('vault-loaded', cb)</code>: Lifecycle event listener.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer / About Card */}
      <div className="dashboard-footer-card">
        <div className="footer-left">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="footer-title">Synapse Graph — Open Source & Clean Room Architecture</div>
            <div className="footer-desc">
              Built from scratch with zero proprietary code or trademark encumbrance.
              Designed and developed by <strong>Ghouti Yelles Chaouche</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
