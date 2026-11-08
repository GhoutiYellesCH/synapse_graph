import React, { useEffect, useState } from 'react';
import {
  X,
  Terminal,
  Code,
  FileText,
  ExternalLink,
  FolderOpen,
  Unlink,
  Link as LinkIcon,
  ArrowRight,
  ArrowLeft,
  Calendar,
  HardDrive,
  Hash,
  Eye,
  Brain,
} from 'lucide-react';
import { BackgroundSettings, EditorSettings, EditorType, GraphData, GraphNode } from '../types';
import { readNoteContent } from '../services/api';
import { pluginRegistry } from '../plugins/PluginManager';

interface InspectorProps {
  node: GraphNode | null;
  graphData: GraphData | null;
  editorSettings: EditorSettings;
  backgroundSettings?: BackgroundSettings;
  vaultPath: string;
  onClose: () => void;
  onSelectNode: (node: GraphNode) => void;
  onOpenInEditor: (filePath: string, editor: EditorType) => void;
  onRevealPath: (path: string) => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  node,
  graphData,
  editorSettings,
  backgroundSettings,
  vaultPath: _vaultPath,
  onClose,
  onSelectNode,
  onOpenInEditor,
  onRevealPath,
}) => {
  const [content, setContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);

  useEffect(() => {
    if (!node || node.is_ghost || !node.path) {
      setContent(null);
      return;
    }

    let isMounted = true;
    setIsLoadingContent(true);

    readNoteContent(node.path)
      .then((text) => {
        if (isMounted) {
          setContent(text);
          setIsLoadingContent(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setContent(`Failed to load content: ${err}`);
          setIsLoadingContent(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [node]);

  if (!node) return null;

  // Find incoming and outgoing linked nodes
  const outgoingLinks = graphData?.links.filter((l) => {
    const srcId = typeof l.source === 'object' ? l.source.id : l.source;
    return srcId === node.id;
  }) || [];

  const incomingLinks = graphData?.links.filter((l) => {
    const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
    return tgtId === node.id;
  }) || [];

  const getNodeById = (id: string) => {
    return graphData?.nodes.find((n) => n.id === id);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp * 1000).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPrimaryEditorLabel = () => {
    switch (editorSettings.preferredEditor) {
      case 'synapse':
      case 'second-brain':
        return 'Synapse';
      case 'nvim':
        return 'Neovim';
      case 'code':
        return 'VS Code';
      case 'emacs':
        return 'Emacs';
      case 'custom':
        return 'Custom Editor';
      default:
        return 'Default App';
    }
  };

  const getPrimaryEditorIcon = () => {
    switch (editorSettings.preferredEditor) {
      case 'synapse':
      case 'second-brain':
        return <Brain className="w-4 h-4 text-purple-400" />;
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

  return (
    <aside
      className={`inspector-panel ${
        backgroundSettings?.enabled && backgroundSettings?.applyToInspector
          ? 'glass-background'
          : ''
      }`}
      style={
        backgroundSettings?.enabled &&
        backgroundSettings?.applyToInspector &&
        backgroundSettings?.imageUrl
          ? {
              backgroundImage: `linear-gradient(rgba(24, 24, 27, ${backgroundSettings.opacity}), rgba(24, 24, 27, ${backgroundSettings.opacity})), url(${backgroundSettings.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backdropFilter: `blur(${backgroundSettings.blur}px)`,
            }
          : undefined
      }
    >
      {/* Header */}
      <div className="inspector-header">
        <div className="inspector-title-wrap">
          <h2 className="inspector-title" title={node.name}>
            {node.name}
          </h2>
          <span className="inspector-relpath" title={node.rel_path}>
            {node.rel_path}
          </span>
        </div>
        <button className="btn-close" onClick={onClose} title="Close inspector">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Badges */}
      <div className="inspector-badges">
        {node.is_orphan ? (
          <div className="badge badge-orphan">
            <Unlink className="w-3.5 h-3.5" />
            <span>Orphan Note (No Links)</span>
          </div>
        ) : (
          <div className="badge badge-connected">
            <LinkIcon className="w-3.5 h-3.5" />
            <span>
              {node.incoming_count} in · {node.outgoing_count} out
            </span>
          </div>
        )}
        {node.is_ghost && (
          <div className="badge badge-ghost">
            <span>Uncreated Note</span>
          </div>
        )}
      </div>

      {/* External Editor Actions */}
      {!node.is_ghost && node.path && (
        <div className="inspector-section actions-section">
          <label className="section-title">Open for Editing</label>

          {/* Primary Quick Button */}
          <button
            className="btn btn-primary-editor"
            onClick={() => onOpenInEditor(node.path, editorSettings.preferredEditor)}
            title={`Open immediately in ${getPrimaryEditorLabel()}`}
          >
            {getPrimaryEditorIcon()}
            <span>Open in {getPrimaryEditorLabel()}</span>
          </button>

          {/* Secondary Editor Switchers */}
          <div className="secondary-editor-grid">
            {editorSettings.preferredEditor !== 'synapse' && editorSettings.preferredEditor !== 'second-brain' && (
              <button
                className="btn btn-secondary-editor"
                onClick={() => onOpenInEditor(node.path, 'synapse')}
                title="Open in Synapse"
              >
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span>Synapse</span>
              </button>
            )}

            {editorSettings.preferredEditor !== 'nvim' && (
              <button
                className="btn btn-secondary-editor"
                onClick={() => onOpenInEditor(node.path, 'nvim')}
                title="Open in Neovim"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Neovim</span>
              </button>
            )}

            {editorSettings.preferredEditor !== 'code' && (
              <button
                className="btn btn-secondary-editor"
                onClick={() => onOpenInEditor(node.path, 'code')}
                title="Open in VS Code"
              >
                <Code className="w-3.5 h-3.5 text-sky-400" />
                <span>VS Code</span>
              </button>
            )}

            {editorSettings.preferredEditor !== 'emacs' && (
              <button
                className="btn btn-secondary-editor"
                onClick={() => onOpenInEditor(node.path, 'emacs')}
                title="Open in Emacs"
              >
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>Emacs</span>
              </button>
            )}

            <button
              className="btn btn-secondary-editor"
              onClick={() => onOpenInEditor(node.path, 'system')}
              title="Open with system default application"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>Default</span>
            </button>

            <button
              className="btn btn-secondary-editor"
              onClick={() => onRevealPath(node.path)}
              title="Reveal in file manager"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>Folder</span>
            </button>
          </div>
        </div>
      )}

      {/* Metadata */}
      {!node.is_ghost && (
        <div className="inspector-section meta-section">
          <div className="meta-row">
            <span className="meta-label">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Size</span>
            </span>
            <span className="meta-val">{formatSize(node.size)}</span>
          </div>

          <div className="meta-row">
            <span className="meta-label">
              <Calendar className="w-3.5 h-3.5" />
              <span>Modified</span>
            </span>
            <span className="meta-val">{formatDate(node.modified)}</span>
          </div>
        </div>
      )}

      {/* Tags */}
      {node.tags && node.tags.length > 0 && (
        <div className="inspector-section">
          <label className="section-title">
            <Hash className="w-3.5 h-3.5" />
            <span>Tags ({node.tags.length})</span>
          </label>
          <div className="tags-chip-list">
            {node.tags.map((tag) => (
              <span key={tag} className="tag-chip">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Backlinks (Incoming) */}
      <div className="inspector-section">
        <label className="section-title">
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
          <span>Backlinks ({incomingLinks.length})</span>
        </label>
        {incomingLinks.length === 0 ? (
          <p className="empty-subtext">No notes link to this file.</p>
        ) : (
          <ul className="links-list">
            {incomingLinks.map((link, idx) => {
              const srcId = typeof link.source === 'object' ? link.source.id : link.source;
              const srcNode = getNodeById(srcId);
              return (
                <li key={idx} className="link-item">
                  <button
                    className="link-chip"
                    onClick={() => srcNode && onSelectNode(srcNode)}
                    title={`Jump to ${srcNode?.name || srcId}`}
                  >
                    <span className="link-name">{srcNode?.name || srcId}</span>
                    <span className="link-rel">{srcNode?.folder || ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Outgoing Links */}
      <div className="inspector-section">
        <label className="section-title">
          <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
          <span>Outgoing Links ({outgoingLinks.length})</span>
        </label>
        {outgoingLinks.length === 0 ? (
          <p className="empty-subtext">This note has no outgoing links.</p>
        ) : (
          <ul className="links-list">
            {outgoingLinks.map((link, idx) => {
              const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
              const tgtNode = getNodeById(tgtId);
              return (
                <li key={idx} className="link-item">
                  <button
                    className={`link-chip ${link.is_unresolved ? 'is-unresolved' : ''}`}
                    onClick={() => tgtNode && onSelectNode(tgtNode)}
                    title={
                      link.is_unresolved
                        ? 'Uncreated note'
                        : `Jump to ${tgtNode?.name || tgtId}`
                    }
                  >
                    <span className="link-name">
                      {tgtNode?.name || tgtId}
                      {link.is_unresolved && ' (uncreated)'}
                    </span>
                    {link.label && <span className="link-alias">| {link.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Plugin Contributed Panels */}
      {pluginRegistry.getInspectorPanels().map((panel) => {
        const rendered = panel.render(node, graphData);
        if (!rendered) return null;
        return (
          <div key={panel.id} className="inspector-section plugin-section">
            <label className="section-title">{panel.title}</label>
            <div className="plugin-panel-body">{rendered}</div>
          </div>
        );
      })}

      {/* Read-Only Note Preview */}
      {!node.is_ghost && (
        <div className="inspector-section preview-section">
          <div className="section-header-row">
            <label className="section-title">
              <Eye className="w-3.5 h-3.5" />
              <span>Note Content (Read-Only)</span>
            </label>
            <button
              className="btn-toggle-preview"
              onClick={() => setIsPreviewOpen(!isPreviewOpen)}
            >
              {isPreviewOpen ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {isPreviewOpen && (
            <div className="preview-container">
              {isLoadingContent ? (
                <div className="preview-loading">Loading note preview...</div>
              ) : (
                <pre className="preview-content">{content || node.excerpt || '(Empty note)'}</pre>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
