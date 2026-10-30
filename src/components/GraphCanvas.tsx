import React, { useEffect, useRef, useState, useMemo } from 'react';
import ForceGraph from 'force-graph';
import { EditorSettings, EditorType, GraphData, GraphNode } from '../types';

type ForceGraphInstance = any;

interface GraphCanvasProps {
  graphData: GraphData | null;
  searchQuery: string;
  orphanFilter: 'all' | 'highlight' | 'only' | 'hide';
  selectedTag: string | null;
  selectedFolder: string | null;
  showLabels: boolean;
  showGhostNotes: boolean;
  chargeStrength: number;
  linkDistance: number;
  centerStrength: number;
  isPaused: boolean;
  selectedNode: GraphNode | null;
  editorSettings: EditorSettings;
  onSelectNode: (node: GraphNode | null) => void;
  onOpenInEditor: (filePath: string, editor: EditorType) => void;
  zoomActionTrigger: { action: 'in' | 'out' | 'fit'; timestamp: number } | null;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  graphData,
  searchQuery,
  orphanFilter,
  selectedTag,
  selectedFolder,
  showLabels,
  showGhostNotes,
  chargeStrength,
  linkDistance,
  centerStrength,
  isPaused,
  selectedNode,
  editorSettings,
  onSelectNode,
  onOpenInEditor,
  zoomActionTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphInstance | null>(null);

  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<any>>(new Set());

  // Filter nodes & links based on user filters
  const filteredData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };

    const query = searchQuery.trim().toLowerCase();

    // 1. Filter Nodes
    const validNodes = graphData.nodes.filter((node) => {
      // Ghost notes toggle
      if (!showGhostNotes && node.is_ghost) return false;

      // Orphan filter
      if (orphanFilter === 'only' && !node.is_orphan) return false;
      if (orphanFilter === 'hide' && node.is_orphan) return false;

      // Folder filter
      if (selectedFolder && node.folder !== selectedFolder) return false;

      // Tag filter
      if (selectedTag && !node.tags.includes(selectedTag)) return false;

      // Search query (matches title, path, excerpt, or tags)
      if (query) {
        const matchName = node.name.toLowerCase().includes(query);
        const matchPath = node.rel_path.toLowerCase().includes(query);
        const matchExcerpt = node.excerpt.toLowerCase().includes(query);
        const matchTag = node.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchName && !matchPath && !matchExcerpt && !matchTag) {
          return false;
        }
      }

      return true;
    });

    const validNodeIds = new Set(validNodes.map((n) => n.id));

    // 2. Filter Links (both source and target must exist in filtered nodes)
    const validLinks = graphData.links.filter((link) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source;
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
      return validNodeIds.has(srcId) && validNodeIds.has(tgtId);
    });

    return {
      nodes: validNodes,
      links: validLinks,
    };
  }, [graphData, searchQuery, orphanFilter, selectedTag, selectedFolder, showGhostNotes]);

  // Handle hover highlighting
  const handleNodeHover = (node: GraphNode | null) => {
    setHoverNode(node);
    if (!node) {
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
      return;
    }

    const neighbors = new Set<string>();
    const links = new Set<any>();

    neighbors.add(node.id);

    filteredData.links.forEach((link: any) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source;
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target;

      if (srcId === node.id) {
        neighbors.add(tgtId);
        links.add(link);
      } else if (tgtId === node.id) {
        neighbors.add(srcId);
        links.add(link);
      }
    });

    setHighlightNodes(neighbors);
    setHighlightLinks(links);
  };

  // Initialize Force Graph instance
  useEffect(() => {
    if (!containerRef.current) return;

    const fg = new (ForceGraph as any)()(containerRef.current)
      .backgroundColor('#121214')
      .nodeId('id')
      .nodeLabel((n: GraphNode) => `${n.name} (${n.incoming_count} in · ${n.outgoing_count} out)`)
      .nodeCanvasObject((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const isHovered = hoverNode && hoverNode.id === node.id;
        const isSelected = selectedNode && selectedNode.id === node.id;
        const isNeighbor = highlightNodes.has(node.id);
        const hasActiveHover = Boolean(hoverNode);

        // Calculate radius
        const degree = node.incoming_count + node.outgoing_count;
        let radius = Math.max(3.5, Math.min(16, 4 + Math.sqrt(degree) * 2));
        if (node.is_orphan) radius = Math.max(radius, 5);

        const x = node.x ?? 0;
        const y = node.y ?? 0;

        // Alpha calculation
        let alpha = 1;
        if (hasActiveHover && !isNeighbor && !isHovered) {
          alpha = 0.15;
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        // Colors
        let nodeColor = '#818cf8'; // normal connected
        if (node.is_orphan) {
          nodeColor = '#f59e0b'; // amber orphan
        } else if (node.is_ghost) {
          nodeColor = '#64748b'; // ghost
        }

        if (isSelected) {
          nodeColor = '#38bdf8'; // selected cyan
        } else if (isHovered) {
          nodeColor = '#a78bfa'; // hovered light purple
        } else if (isNeighbor) {
          nodeColor = '#60a5fa'; // neighbor blue
        }

        // Draw Outer Glow / Orphan Pulse
        if (node.is_orphan && (orphanFilter === 'highlight' || orphanFilter === 'only' || isHovered)) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 4, 0, 2 * Math.PI, false);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([3, 2]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 5, 0, 2 * Math.PI, false);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Draw Node Core
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        // Node outline
        ctx.strokeStyle = node.is_ghost ? '#94a3b8' : '#1e1e24';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Draw Label
        const shouldDrawLabel =
          showLabels ||
          isHovered ||
          isSelected ||
          (globalScale > 1.8 && !hasActiveHover) ||
          (hasActiveHover && isNeighbor);

        if (shouldDrawLabel) {
          const fontSize = Math.max(10 / globalScale, 3);
          ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          const label = node.name;
          const textWidth = ctx.measureText(label).width;
          const labelY = y + radius + 3;

          // Background pill
          ctx.fillStyle = 'rgba(18, 18, 20, 0.85)';
          ctx.fillRect(
            x - textWidth / 2 - 3,
            labelY - 1,
            textWidth + 6,
            fontSize + 3
          );

          // Text fill
          ctx.fillStyle =
            isSelected || isHovered
              ? '#ffffff'
              : node.is_orphan
              ? '#fbbf24'
              : '#e2e8f0';
          ctx.fillText(label, x, labelY);
        }

        ctx.restore();
      })
      .nodePointerAreaPaint((node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
        const degree = node.incoming_count + node.outgoing_count;
        const radius = Math.max(6, Math.min(20, 5 + Math.sqrt(degree) * 2.2));
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI, false);
        ctx.fill();
      })
      .linkCanvasObject((link: any, ctx: CanvasRenderingContext2D, _globalScale: number) => {
        const isHighlighted = highlightLinks.has(link);
        const hasActiveHover = Boolean(hoverNode);

        const source = link.source;
        const target = link.target;
        if (!source || !target || source.x == null || target.x == null) return;

        let alpha = 0.35;
        let color = '#3b4252';
        let lineWidth = 0.8;

        if (isHighlighted) {
          alpha = 0.95;
          color = '#38bdf8';
          lineWidth = 2.0;
        } else if (hasActiveHover) {
          alpha = 0.05;
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        ctx.restore();
      })
      .onNodeHover(handleNodeHover)
      .onNodeClick((node: GraphNode) => {
        onSelectNode(node);
      })
      .onNodeRightClick((node: GraphNode) => {
        // Right click opens in preferred editor directly
        if (!node.is_ghost && node.path) {
          onOpenInEditor(node.path, editorSettings.preferredEditor);
        }
      })
      .onBackgroundClick(() => {
        onSelectNode(null);
      });

    // Detect double click on node canvas
    let lastClickTime = 0;
    let lastClickedNode: GraphNode | null = null;

    fg.onNodeClick((node: GraphNode) => {
      const now = Date.now();
      if (lastClickedNode?.id === node.id && now - lastClickTime < 350) {
        // Double click detected!
        if (editorSettings.doubleClickAction === 'editor') {
          if (!node.is_ghost && node.path) {
            onOpenInEditor(node.path, editorSettings.preferredEditor);
          }
        } else {
          onSelectNode(node);
        }
      } else {
        onSelectNode(node);
      }
      lastClickTime = now;
      lastClickedNode = node;
    });

    fgRef.current = fg;

    // Handle window resize
    const handleResize = () => {
      if (containerRef.current && fgRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        fgRef.current.width(width);
        fgRef.current.height(height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (fgRef.current) {
        fgRef.current._destructor?.();
      }
    };
  }, []);

  // Update Graph Data
  useEffect(() => {
    if (!fgRef.current) return;
    fgRef.current.graphData(filteredData);
  }, [filteredData]);

  // Update Physics forces
  useEffect(() => {
    if (!fgRef.current) return;

    // d3-force charge (repulsion)
    const chargeForce = fgRef.current.d3Force('charge');
    if (chargeForce) {
      chargeForce.strength(-chargeStrength);
    }

    // d3-force link distance
    const linkForce = fgRef.current.d3Force('link');
    if (linkForce) {
      linkForce.distance(linkDistance);
    }

    // d3-force center gravity
    const centerForce = fgRef.current.d3Force('center');
    if (centerForce) {
      centerForce.strength(centerStrength);
    }

    fgRef.current.d3ReheatSimulation();
  }, [chargeStrength, linkDistance, centerStrength]);

  // Pause / Resume Physics
  useEffect(() => {
    if (!fgRef.current) return;
    if (isPaused) {
      fgRef.current.pauseAnimation();
    } else {
      fgRef.current.resumeAnimation();
    }
  }, [isPaused]);

  // Handle Zoom toolbar buttons
  useEffect(() => {
    if (!fgRef.current || !zoomActionTrigger) return;

    const currentZoom = fgRef.current.zoom();
    if (zoomActionTrigger.action === 'in') {
      fgRef.current.zoom(currentZoom * 1.35, 300);
    } else if (zoomActionTrigger.action === 'out') {
      fgRef.current.zoom(currentZoom / 1.35, 300);
    } else if (zoomActionTrigger.action === 'fit') {
      fgRef.current.zoomToFit(400, 60);
    }
  }, [zoomActionTrigger]);

  return (
    <div className="graph-canvas-container" ref={containerRef}>
      {filteredData.nodes.length === 0 && (
        <div className="empty-graph-state">
          {graphData ? (
            <p className="empty-text">No notes match the current filters.</p>
          ) : (
            <div className="empty-prompt">
              <h3 className="empty-title">No Vault Loaded</h3>
              <p className="empty-subtitle">
                Select an Obsidian vault folder to visualize all your notes, links, and unconnected orphans.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
