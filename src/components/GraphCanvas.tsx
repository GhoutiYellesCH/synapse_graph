import React, { useEffect, useRef, useState, useMemo } from 'react';
import ForceGraph from 'force-graph';
import { forceCollide, forceRadial } from 'd3-force';
import {
  ColorGroup,
  DisplaySettings,
  EditorSettings,
  EditorType,
  ForceSettings,
  GraphData,
  GraphLayoutMode,
  GraphNode,
  LearningConnection,
} from '../types';
import { pluginRegistry } from '../plugins/PluginManager';

type ForceGraphInstance = any;

interface GraphCanvasProps {
  graphData: GraphData | null;
  searchQuery: string;
  orphanFilter: 'all' | 'highlight' | 'only' | 'hide';
  selectedTag: string | null;
  selectedFolder: string | null;
  showLabels: boolean;
  showGhostNotes: boolean;
  colorGroups: ColorGroup[];
  displaySettings: DisplaySettings;
  forceSettings: ForceSettings;
  layoutMode: GraphLayoutMode;
  semanticScores?: Map<string, number>;
  aiMatchedNodeIds?: Set<string>;
  aiLearningConnections?: LearningConnection[];
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
  colorGroups,
  displaySettings,
  forceSettings,
  layoutMode,
  semanticScores = new Map(),
  aiMatchedNodeIds = new Set(),
  aiLearningConnections = [],
  isPaused,
  selectedNode,
  editorSettings,
  onSelectNode,
  onOpenInEditor,
  zoomActionTrigger,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphInstance | null>(null);

  // Keep latest state in refs to avoid recreating graph simulation
  const onSelectNodeRef = useRef(onSelectNode);
  onSelectNodeRef.current = onSelectNode;

  const onOpenInEditorRef = useRef(onOpenInEditor);
  onOpenInEditorRef.current = onOpenInEditor;

  const editorSettingsRef = useRef(editorSettings);
  editorSettingsRef.current = editorSettings;

  const selectedNodeRef = useRef(selectedNode);
  selectedNodeRef.current = selectedNode;

  const showLabelsRef = useRef(showLabels);
  showLabelsRef.current = showLabels;

  const orphanFilterRef = useRef(orphanFilter);
  orphanFilterRef.current = orphanFilter;

  const colorGroupsRef = useRef(colorGroups);
  colorGroupsRef.current = colorGroups;

  const displaySettingsRef = useRef(displaySettings);
  displaySettingsRef.current = displaySettings;

  const layoutModeRef = useRef(layoutMode);
  layoutModeRef.current = layoutMode;

  const semanticScoresRef = useRef(semanticScores);
  semanticScoresRef.current = semanticScores;

  const aiMatchedNodeIdsRef = useRef(aiMatchedNodeIds);
  aiMatchedNodeIdsRef.current = aiMatchedNodeIds;

  const aiLearningConnectionsRef = useRef(aiLearningConnections);
  aiLearningConnectionsRef.current = aiLearningConnections;

  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const hoverNodeRef = useRef<GraphNode | null>(null);
  hoverNodeRef.current = hoverNode;

  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const highlightNodesRef = useRef<Set<string>>(new Set());
  highlightNodesRef.current = highlightNodes;

  const [highlightLinks, setHighlightLinks] = useState<Set<any>>(new Set());
  const highlightLinksRef = useRef<Set<any>>(new Set());
  highlightLinksRef.current = highlightLinks;

  // Filter and preprocess nodes & links (Spherical florets & Hub hierarchy)
  const filteredData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };

    const query = searchQuery.trim().toLowerCase();
    const hasSemantic = semanticScores.size > 0;

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

      // Text Search query or Semantic Score filter
      if (query && !hasSemantic) {
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

    // 2. Filter Links
    const rawLinks = graphData.links.filter((link) => {
      const srcId = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const tgtId = typeof link.target === 'object' ? (link.target as any).id : link.target;
      return validNodeIds.has(srcId) && validNodeIds.has(tgtId);
    });

    // 3. Spherical Layout Preprocessing: Hub Detection, Vogel Sunflower Florets & Halo Placement
    const isSpherical = layoutMode === 'spherical';
    const degreeMap = new Map<string, number>();
    const neighborsMap = new Map<string, Set<string>>();

    validNodes.forEach((n) => {
      degreeMap.set(n.id, n.incoming_count + n.outgoing_count);
      neighborsMap.set(n.id, new Set());
    });

    rawLinks.forEach((l) => {
      const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
      neighborsMap.get(s)?.add(t);
      neighborsMap.get(t)?.add(s);
    });

    // Identify primary hub for each subordinate note (leaf / smaller degree)
    const hubChildrenList = new Map<string, string[]>();

    validNodes.forEach((node) => {
      if (node.is_orphan) return;
      const neighbors = Array.from(neighborsMap.get(node.id) || []);
      if (neighbors.length === 0) return;

      // Find neighbor with highest degree
      let maxDeg = -1;
      let primaryHub = '';
      neighbors.forEach((nbrId) => {
        const d = degreeMap.get(nbrId) || 0;
        if (d > maxDeg) {
          maxDeg = d;
          primaryHub = nbrId;
        }
      });

      const myDeg = degreeMap.get(node.id) || 0;
      if (maxDeg > myDeg) {
        if (!hubChildrenList.has(primaryHub)) {
          hubChildrenList.set(primaryHub, []);
        }
        hubChildrenList.get(primaryHub)!.push(node.id);
      }
    });

    // Initial position seeding for clean spherical discs and outer circular halo
    if (isSpherical) {
      const orphanNodes = validNodes.filter((n) => n.is_orphan);
      const topHubs = Array.from(hubChildrenList.entries())
        .sort((a, b) => b[1].length - a[1].length);

      const nodePos = new Map<string, { x: number; y: number }>();

      if (topHubs.length > 0) {
        // Main hub at (0, 0)
        nodePos.set(topHubs[0][0], { x: 0, y: 0 });

        // Secondary hubs arranged with non-overlapping clearance
        let currentAngle = 0;
        for (let h = 1; h < topHubs.length; h++) {
          const [hubId, children] = topHubs[h];
          const hubRadius = Math.max(80, Math.sqrt(children.length) * 14 + 30);
          const mainRadius = Math.max(120, Math.sqrt(topHubs[0][1].length) * 14 + 50);
          const dist = mainRadius + hubRadius + 90;
          currentAngle += (2 * Math.PI) / Math.max(3, topHubs.length - 1);
          nodePos.set(hubId, {
            x: dist * Math.cos(currentAngle),
            y: dist * Math.sin(currentAngle),
          });
        }
      }

      // Vogel Sunflower Phyllotaxis for hub children: Golden Angle ~137.507764 deg
      const GOLDEN_ANGLE = 2.39996323;
      const SPACING = 11.5;

      hubChildrenList.forEach((children, hubId) => {
        const hPos = nodePos.get(hubId) || { x: 0, y: 0 };
        children.forEach((childId, i) => {
          const angle = i * GOLDEN_ANGLE;
          const radius = 18 + Math.sqrt(i) * SPACING;
          nodePos.set(childId, {
            x: hPos.x + radius * Math.cos(angle),
            y: hPos.y + radius * Math.sin(angle),
          });
        });
      });

      // Calculate bounding radius of connected nodes to position the outer orphan halo
      let maxConnectedDist = 260;
      nodePos.forEach((pos) => {
        const d = Math.hypot(pos.x, pos.y);
        if (d > maxConnectedDist) maxConnectedDist = d;
      });

      const haloRadius = Math.max(340, maxConnectedDist + 90);

      // Distribute orphan notes in a clean, equidistant outer circular halo
      orphanNodes.forEach((node, idx) => {
        const angle = (2 * Math.PI * idx) / (orphanNodes.length || 1);
        nodePos.set(node.id, {
          x: haloRadius * Math.cos(angle),
          y: haloRadius * Math.sin(angle),
        });
      });

      // Seed unpositioned or uninitialized nodes
      validNodes.forEach((node) => {
        const seed = nodePos.get(node.id);
        if (seed) {
          if (node.x == null || node.y == null || isNaN(node.x) || isNaN(node.y)) {
            node.x = seed.x;
            node.y = seed.y;
          }
        }
      });
    }

    const processedLinks = rawLinks.map((link) => {
      const srcId = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const tgtId = typeof link.target === 'object' ? (link.target as any).id : link.target;

      return {
        source: srcId,
        target: tgtId,
        label: link.label,
        is_unresolved: link.is_unresolved,
      };
    });

    return {
      nodes: validNodes,
      links: processedLinks,
    };
  }, [graphData, searchQuery, orphanFilter, selectedTag, selectedFolder, showGhostNotes, semanticScores, layoutMode]);

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

  // Helper to determine node color based on Obsidian Color Groups & Plugins
  const resolveNodeColor = (node: GraphNode): string => {
    // 1. Check plugin decorators first
    for (const decorator of pluginRegistry.getNodeColorDecorators()) {
      const customColor = decorator(node);
      if (customColor) return customColor;
    }

    // 2. Check Obsidian Color Groups rules
    const groups = colorGroupsRef.current;
    for (const group of groups) {
      if (!group.query.trim()) continue;
      const q = group.query.toLowerCase().trim();
      if (q.startsWith('tag:#') || q.startsWith('tag:')) {
        const targetTag = q.replace(/^tag:#?/, '');
        if (node.tags.some((t) => t.toLowerCase() === targetTag)) {
          return group.color;
        }
      } else if (q.startsWith('path:')) {
        const targetPath = q.replace(/^path:/, '');
        if (node.rel_path.toLowerCase().includes(targetPath)) {
          return group.color;
        }
      } else {
        if (
          node.name.toLowerCase().includes(q) ||
          node.rel_path.toLowerCase().includes(q) ||
          node.tags.some((t) => t.toLowerCase().includes(q))
        ) {
          return group.color;
        }
      }
    }

    // 3. Fallback standard colors
    if (node.is_orphan) return '#f59e0b'; // Amber orphan
    if (node.is_ghost) return '#64748b'; // Ghost note
    return '#818cf8'; // Connected violet-indigo
  };

  // Initialize Force Graph instance ONCE on mount
  useEffect(() => {
    if (!mountRef.current) return;

    let lastClickTime = 0;
    let lastClickedNode: GraphNode | null = null;

    const fg = new (ForceGraph as any)()(mountRef.current)
      .backgroundColor('transparent')
      .nodeId('id')
      .nodeLabel((n: GraphNode) => {
        const semScore = semanticScoresRef.current.get(n.id);
        const semText = semScore != null ? ` · Semantic Match: ${Math.round(semScore * 100)}%` : '';
        return `${n.name} (${n.incoming_count} in · ${n.outgoing_count} out)${semText}`;
      })
      .nodeCanvasObject((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const curHover = hoverNodeRef.current;
        const curSelected = selectedNodeRef.current;
        const curHighlights = highlightNodesRef.current;
        const curOrphanFilter = orphanFilterRef.current;
        const curShowLabels = showLabelsRef.current;
        const curDisplay = displaySettingsRef.current;
        const curAiMatches = aiMatchedNodeIdsRef.current;
        const curSemanticScores = semanticScoresRef.current;

        const isHovered = curHover && curHover.id === node.id;
        const isSelected = curSelected && curSelected.id === node.id;
        const isNeighbor = curHighlights.has(node.id);
        const hasActiveHover = Boolean(curHover);

        // Semantic / AI search relevance check
        const isAiMatched = curAiMatches.has(node.id) || curAiMatches.has(node.name);
        const semScore = curSemanticScores.get(node.id) || 0;
        const isSemanticallyRelevant = isAiMatched || semScore >= 0.35;
        const hasActiveSearch = curAiMatches.size > 0 || curSemanticScores.size > 0;

        // Calculate radius with node size multiplier
        const degree = node.incoming_count + node.outgoing_count;
        const baseRadius = Math.max(3.5, Math.min(18, 4 + Math.sqrt(degree) * 2));
        let radius = baseRadius * curDisplay.nodeSizeMultiplier;
        if (node.is_orphan) radius = Math.max(radius, 4.0 * curDisplay.nodeSizeMultiplier);

        const x = node.x ?? 0;
        const y = node.y ?? 0;

        // Alpha calculation
        let alpha = 1;
        if (hasActiveHover && !isNeighbor && !isHovered) {
          alpha = 0.15;
        } else if (hasActiveSearch && !isSemanticallyRelevant && !isHovered && !isSelected) {
          alpha = 0.18; // Dim un-matched nodes during AI / semantic search
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        // Resolve Color
        let nodeColor = resolveNodeColor(node);

        if (isSelected) {
          nodeColor = '#38bdf8'; // Selected cyan
        } else if (isAiMatched) {
          nodeColor = '#10b981'; // AI Citation Emerald
        } else if (semScore >= 0.5) {
          nodeColor = '#06b6d4'; // Semantic High Match Cyan
        } else if (isHovered) {
          nodeColor = '#c084fc'; // Hovered purple
        } else if (isNeighbor) {
          nodeColor = '#60a5fa'; // Neighbor blue
        }

        // Draw Semantic / AI Search Pulse Ring
        if (isSemanticallyRelevant) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 5, 0, 2 * Math.PI, false);
          ctx.strokeStyle = isAiMatched ? '#10b981' : '#06b6d4';
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }

        // Draw Outer Glow / Orphan Pulse
        if (node.is_orphan && (curOrphanFilter === 'highlight' || curOrphanFilter === 'only' || isHovered)) {
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
        ctx.strokeStyle = node.is_ghost ? '#94a3b8' : 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // Draw Label: Controlled by Show Labels or Text Fade Threshold or selection or search
        const shouldDrawLabel =
          curShowLabels ||
          isHovered ||
          isSelected ||
          isAiMatched ||
          (globalScale >= curDisplay.textFadeThreshold && !hasActiveHover) ||
          (hasActiveHover && isNeighbor);

        if (shouldDrawLabel) {
          const fontSize = Math.max(10 / globalScale, 3.5);
          ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          const label = node.name;
          const textWidth = ctx.measureText(label).width;
          const labelY = y + radius + 3;

          // Background pill
          ctx.fillStyle = 'rgba(18, 18, 22, 0.88)';
          ctx.fillRect(
            x - textWidth / 2 - 3,
            labelY - 1,
            textWidth + 6,
            fontSize + 3
          );

          // Text fill
          ctx.fillStyle =
            isSelected || isHovered || isAiMatched
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
        const curDisplay = displaySettingsRef.current;
        const radius = Math.max(6, Math.min(22, (5 + Math.sqrt(degree) * 2.2) * curDisplay.nodeSizeMultiplier));
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI, false);
        ctx.fill();
      })
      .linkCanvasObject((link: any, ctx: CanvasRenderingContext2D, _globalScale: number) => {
        const isHighlighted = highlightLinksRef.current.has(link);
        const hasActiveHover = Boolean(hoverNodeRef.current);
        const curDisplay = displaySettingsRef.current;
        const curAiConnections = aiLearningConnectionsRef.current;

        const source = link.source;
        const target = link.target;
        if (!source || !target || source.x == null || target.x == null) return;

        // Check if this link represents an AI learning connection
        const isAiLearningConnection = curAiConnections.some(
          (c) =>
            (c.source === source.name && c.target === target.name) ||
            (c.source === target.name && c.target === source.name)
        );

        let alpha = 0.35;
        let color = '#3b4252';
        let lineWidth = 0.9 * curDisplay.linkThicknessMultiplier;

        if (isAiLearningConnection) {
          alpha = 1.0;
          color = '#10b981';
          lineWidth = 2.8 * curDisplay.linkThicknessMultiplier;
        } else if (isHighlighted) {
          alpha = 0.95;
          color = '#38bdf8';
          lineWidth = 2.2 * curDisplay.linkThicknessMultiplier;
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

        if (isAiLearningConnection) {
          ctx.setLineDash([4, 2]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Directional Link Arrow (Obsidian Graph Feature)
        if (curDisplay.showArrows && !link.is_unresolved) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const length = Math.sqrt(dx * dx + dy * dy);

          if (length > 20) {
            const arrowPos = 0.65;
            const arrowX = source.x + dx * arrowPos;
            const arrowY = source.y + dy * arrowPos;
            const angle = Math.atan2(dy, dx);
            const headlen = Math.max(4, 5 * curDisplay.linkThicknessMultiplier);

            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(
              arrowX - headlen * Math.cos(angle - Math.PI / 7),
              arrowY - headlen * Math.sin(angle - Math.PI / 7)
            );
            ctx.lineTo(
              arrowX - headlen * Math.cos(angle + Math.PI / 7),
              arrowY - headlen * Math.sin(angle + Math.PI / 7)
            );
            ctx.closePath();
            ctx.fillStyle = isAiLearningConnection ? '#10b981' : isHighlighted ? '#38bdf8' : '#64748b';
            ctx.fill();
          }
        }

        ctx.restore();
      })
      .onNodeHover(handleNodeHover)
      .onNodeClick((node: GraphNode) => {
        const now = Date.now();
        const settings = editorSettingsRef.current;

        if (lastClickedNode?.id === node.id && now - lastClickTime < 350) {
          // Double click detected
          if (settings.doubleClickAction === 'editor') {
            if (!node.is_ghost && node.path) {
              onOpenInEditorRef.current(node.path, settings.preferredEditor);
            }
          } else {
            onSelectNodeRef.current(node);
          }
        } else {
          onSelectNodeRef.current(node);
        }
        lastClickTime = now;
        lastClickedNode = node;
      })
      .onNodeRightClick((node: GraphNode) => {
        if (!node.is_ghost && node.path) {
          onOpenInEditorRef.current(node.path, editorSettingsRef.current.preferredEditor);
        }
      })
      .onBackgroundClick(() => {
        onSelectNodeRef.current(null);
      });

    // Add Collision Force to tightly pack clusters without overlap
    fg.d3Force(
      'collide',
      forceCollide((node: any) => {
        const degree = (node.incoming_count || 0) + (node.outgoing_count || 0);
        const curDisplay = displaySettingsRef.current;
        const baseRadius = Math.max(3.5, Math.min(18, 4 + Math.sqrt(degree) * 2));
        return (baseRadius * curDisplay.nodeSizeMultiplier) + 2.8;
      }).iterations(2)
    );

    fgRef.current = fg;

    // Handle window resize
    const handleResize = () => {
      if (mountRef.current && fgRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        fgRef.current.width(width);
        fgRef.current.height(height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (fgRef.current) {
        try {
          fgRef.current._destructor?.();
        } catch (e) {
          console.error('Error destroying force-graph:', e);
        }
      }
    };
  }, []);

  // Update Graph Data
  const hasFittedRef = useRef(false);
  const lastGraphDataRef = useRef<GraphData | null>(null);

  useEffect(() => {
    if (!fgRef.current) return;

    if (graphData !== lastGraphDataRef.current) {
      lastGraphDataRef.current = graphData;
      hasFittedRef.current = false;
    }

    fgRef.current.graphData(filteredData);

    if (filteredData.nodes.length > 0 && !hasFittedRef.current) {
      hasFittedRef.current = true;
      setTimeout(() => {
        fgRef.current?.zoomToFit(450, 60);
      }, 400);
    }
  }, [filteredData, graphData]);

  // Update Physics forces: Spherical Sunflower Discs, Concentric Radial Halo, Bounded Repulsion
  useEffect(() => {
    if (!fgRef.current) return;

    const isSpherical = layoutMode === 'spherical';

    // Calculate dynamic halo radius based on connected cluster footprint
    let maxConnectedFootprint = 260;
    filteredData.nodes.forEach((n) => {
      if (!n.is_orphan && n.x != null && n.y != null) {
        const d = Math.hypot(n.x, n.y);
        if (d > maxConnectedFootprint) maxConnectedFootprint = d;
      }
    });

    const haloRadius = Math.max(340, maxConnectedFootprint + 90);

    // 1. Repel / Charge force with long distanceMax for smooth, unwrinkled cluster expansion
    const chargeForce = fgRef.current.d3Force('charge');
    if (chargeForce) {
      chargeForce
        .strength((node: any) =>
          node.is_orphan ? -25 : -forceSettings.repelStrength
        )
        .distanceMax(1200)
        .distanceMin(3);
    }

    // 2. Link force: Uniform distance with elastic tension keeps hub clusters in perfect circular discs
    const linkForce = fgRef.current.d3Force('link');
    if (linkForce) {
      linkForce
        .distance(forceSettings.linkDistance)
        .strength(0.55 * forceSettings.linkStrength);
    }

    // 3. Center force: Keeps origin (0, 0) strictly in center of viewport
    const centerForce = fgRef.current.d3Force('center');
    if (centerForce) {
      centerForce.x(0).y(0).strength(0.8);
    }

    // 4. Inward Gravity & Orphan Outer Concentric Halo Force
    if (isSpherical) {
      fgRef.current.d3Force(
        'radialGravity',
        forceRadial(
          (node: any) => (node.is_orphan ? haloRadius : 0),
          0,
          0
        ).strength((node: any) =>
          node.is_orphan ? 0.45 : forceSettings.centerStrength * 0.12
        )
      );
      fgRef.current.d3Force('orphanHalo', null);
    } else {
      fgRef.current.d3Force('radialGravity', null);
      fgRef.current.d3Force('orphanHalo', null);
    }

    // 5. Update Collision Force: Prevents overlapping and promotes dense circular packing
    const collideForce = fgRef.current.d3Force('collide');
    if (collideForce) {
      collideForce.radius((node: any) => {
        const degree = (node.incoming_count || 0) + (node.outgoing_count || 0);
        const curDisplay = displaySettingsRef.current;
        const baseRadius = Math.max(3.5, Math.min(18, 4 + Math.sqrt(degree) * 2));
        return (baseRadius * curDisplay.nodeSizeMultiplier) + 2.2;
      }).iterations(3);
    }

    fgRef.current.d3ReheatSimulation();
  }, [forceSettings, displaySettings.nodeSizeMultiplier, layoutMode, filteredData]);

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
      fgRef.current.zoomToFit(400, 50);
    }
  }, [zoomActionTrigger]);

  return (
    <div className="graph-canvas-container">
      {/* Dedicated leaf container for ForceGraph canvas DOM — React never touches its children */}
      <div className="graph-mount-point" ref={mountRef} />

      {/* React-managed UI overlay rendered as a sibling, not inside the mountRef */}
      {filteredData.nodes.length === 0 && (
        <div className="empty-graph-state">
          {graphData ? (
            <p className="empty-text">No notes match the current filters.</p>
          ) : (
            <div className="empty-prompt">
              <h3 className="empty-title">No Vault Loaded</h3>
              <p className="empty-subtitle">
                Select a Markdown vault folder to visualize all your notes, links, and unconnected orphans.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
