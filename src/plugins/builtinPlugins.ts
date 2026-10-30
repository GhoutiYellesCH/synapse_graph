import React from 'react';
import { pluginRegistry } from './PluginManager';
import { GraphNode } from '../types';

export function registerBuiltinPlugins() {
  // 1. Vault Analytics Plugin
  pluginRegistry.registerPlugin({
    id: 'vault-analytics',
    name: 'Vault Analytics & Metrics',
    version: '1.0.0',
    description: 'Displays deep vault metrics including top linked hub notes, graph density, and connection averages.',
    author: 'Obsidian Graph Team',
    enabled: true,
    isCustom: false,
    onLoad: (ctx) => {
      ctx.registerInspectorPanel({
        id: 'vault-density-panel',
        title: '📊 Node Influence',
        render: (node, graphData) => {
          if (!graphData || graphData.nodes.length === 0) return null;
          const totalNodes = graphData.nodes.length;
          const totalDegree = node.incoming_count + node.outgoing_count;
          const rank =
            graphData.nodes
              .slice()
              .sort(
                (a, b) =>
                  b.incoming_count + b.outgoing_count - (a.incoming_count + a.outgoing_count)
              )
              .findIndex((n) => n.id === node.id) + 1;

          return React.createElement(
            'div',
            { className: 'plugin-metric-box', style: { padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '12px' } },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' } },
              React.createElement('span', { style: { color: 'var(--text-muted)' } }, 'Network Rank:'),
              React.createElement('span', { style: { fontWeight: 'bold', color: 'var(--accent-color, #818cf8)' } }, `#${rank} of ${totalNodes}`)
            ),
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between' } },
              React.createElement('span', { style: { color: 'var(--text-muted)' } }, 'Total Connections:'),
              React.createElement('span', { style: { fontWeight: 'bold', color: 'var(--text-normal)' } }, `${totalDegree} (${node.incoming_count} in · ${node.outgoing_count} out)`)
            )
          );
        },
      });
    },
  });

  // 2. Reading Time & Word Count Plugin
  pluginRegistry.registerPlugin({
    id: 'reading-time',
    name: 'Note Word Count & Reading Time',
    version: '1.0.0',
    description: 'Calculates word count and estimated reading time for inspected notes.',
    author: 'Obsidian Graph Team',
    enabled: true,
    isCustom: false,
    onLoad: (ctx) => {
      ctx.registerInspectorPanel({
        id: 'reading-stats',
        title: '⏱️ Reading Stats',
        render: (node: GraphNode) => {
          const text = node.excerpt || '';
          const words = text.trim() ? text.trim().split(/\s+/).length : 0;
          const readingMinutes = Math.max(1, Math.ceil(words / 200));

          return React.createElement(
            'div',
            { style: { display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' } },
            React.createElement('span', null, `📖 ~${words} words previewed`),
            React.createElement('span', null, `⏱️ ~${readingMinutes} min read`)
          );
        },
      });
    },
  });

  // 3. Vault Stats HUD Core Plugin (Bottom-Right Corner)
  pluginRegistry.registerPlugin({
    id: 'vault-stats-hud',
    name: 'Vault Overview HUD',
    version: '1.0.0',
    description: 'Displays live vault statistics (notes count, links count, and orphan notes auditor) in the bottom-right corner.',
    author: 'Ghouti Yelles Chaouche',
    enabled: true,
    isCustom: false,
    onLoad: (ctx) => {
      ctx.registerCornerWidget({
        id: 'vault-stats-hud-widget',
        position: 'bottom-right',
        render: ({ graphData, orphanFilter, setOrphanFilter }) => {
          if (!graphData) return null;

          return React.createElement(
            'div',
            { className: 'vault-hud-container' },
            React.createElement(
              'div',
              { className: 'vault-hud-item', title: `Total Markdown Notes: ${graphData.total_files}` },
              React.createElement('span', { className: 'vault-hud-num' }, graphData.total_files),
              React.createElement('span', { className: 'vault-hud-label' }, 'Notes')
            ),
            React.createElement(
              'div',
              { className: 'vault-hud-item', title: `Total Connections & Links: ${graphData.link_count}` },
              React.createElement('span', { className: 'vault-hud-num' }, graphData.link_count),
              React.createElement('span', { className: 'vault-hud-label' }, 'Links')
            ),
            React.createElement(
              'button',
              {
                className: `vault-hud-item vault-hud-orphan ${
                  orphanFilter === 'only'
                    ? 'active-filter'
                    : orphanFilter === 'highlight'
                    ? 'active-highlight'
                    : ''
                }`,
                onClick: () => {
                  if (orphanFilter === 'all') setOrphanFilter('only');
                  else if (orphanFilter === 'only') setOrphanFilter('highlight');
                  else setOrphanFilter('all');
                },
                title: 'Click to cycle Orphan filter: All -> Only Orphans -> Highlight Orphans',
              },
              React.createElement('span', { className: 'vault-hud-orphan-icon' }, '⚡'),
              React.createElement('span', { className: 'vault-hud-num' }, graphData.orphan_count),
              React.createElement(
                'span',
                { className: 'vault-hud-label' },
                orphanFilter === 'only' ? 'Orphans (Only)' : 'Orphans'
              )
            )
          );
        },
      });
    },
  });
}
