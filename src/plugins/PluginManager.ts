import React from 'react';
import { GraphData, GraphNode, EditorType } from '../types';

export interface TopBarButtonDef {
  id: string;
  label: string;
  icon?: string;
  title?: string;
  onClick: () => void;
}

export interface InspectorPanelDef {
  id: string;
  title: string;
  render: (node: GraphNode, graphData: GraphData | null) => React.ReactNode;
}

export interface CornerWidgetRenderProps {
  graphData: GraphData | null;
  vaultPath: string | null;
  orphanFilter: 'all' | 'highlight' | 'only' | 'hide';
  setOrphanFilter: (filter: 'all' | 'highlight' | 'only' | 'hide') => void;
}

export interface CornerWidgetDef {
  id: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  render: (props: CornerWidgetRenderProps) => React.ReactNode;
}

export type NodeColorDecorator = (node: GraphNode) => string | null;

export interface PluginContext {
  getVaultPath: () => string | null;
  getGraphData: () => GraphData | null;
  getSelectedNode: () => GraphNode | null;
  selectNode: (node: GraphNode | null) => void;
  openNote: (filePath: string, editor?: EditorType) => void;
  addCustomCSS: (id: string, css: string) => void;
  removeCustomCSS: (id: string) => void;
  registerTopBarButton: (button: TopBarButtonDef) => () => void;
  registerInspectorPanel: (panel: InspectorPanelDef) => () => void;
  registerCornerWidget: (widget: CornerWidgetDef) => () => void;
  registerNodeColorDecorator: (decorator: NodeColorDecorator) => () => void;
  on: (event: string, handler: (payload: any) => void) => () => void;
  emit: (event: string, payload?: any) => void;
}

export interface RegisteredPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  enabled: boolean;
  isCustom?: boolean;
  code?: string;
  onLoad?: (context: PluginContext) => void;
  onUnload?: () => void;
  cleanupFns?: Array<() => void>;
}

class PluginRegistry {
  private plugins: Map<string, RegisteredPlugin> = new Map();
  private eventListeners: Map<string, Set<(payload: any) => void>> = new Map();
  private topBarButtons: Map<string, TopBarButtonDef> = new Map();
  private inspectorPanels: Map<string, InspectorPanelDef> = new Map();
  private cornerWidgets: Map<string, CornerWidgetDef> = new Map();
  private nodeColorDecorators: Set<NodeColorDecorator> = new Set();
  private changeSubscribers: Set<() => void> = new Set();

  // References to external state getters
  private vaultPathGetter: () => string | null = () => null;
  private graphDataGetter: () => GraphData | null = () => null;
  private selectedNodeGetter: () => GraphNode | null = () => null;
  private selectNodeAction: (node: GraphNode | null) => void = () => {};
  private openNoteAction: (filePath: string, editor?: EditorType) => void = () => {};

  public setHostGetters(options: {
    getVaultPath: () => string | null;
    getGraphData: () => GraphData | null;
    getSelectedNode: () => GraphNode | null;
    selectNode: (node: GraphNode | null) => void;
    openNote: (filePath: string, editor?: EditorType) => void;
  }) {
    this.vaultPathGetter = options.getVaultPath;
    this.graphDataGetter = options.getGraphData;
    this.selectedNodeGetter = options.getSelectedNode;
    this.selectNodeAction = options.selectNode;
    this.openNoteAction = options.openNote;
  }

  public subscribe(cb: () => void) {
    this.changeSubscribers.add(cb);
    return () => {
      this.changeSubscribers.delete(cb);
    };
  }

  private notify() {
    this.changeSubscribers.forEach((cb) => cb());
  }

  public registerPlugin(plugin: RegisteredPlugin) {
    this.plugins.set(plugin.id, plugin);
    if (plugin.enabled) {
      this.activatePlugin(plugin.id);
    }
    this.notify();
  }

  public activatePlugin(id: string) {
    const plugin = this.plugins.get(id);
    if (!plugin) return;

    plugin.enabled = true;
    plugin.cleanupFns = [];

    const context: PluginContext = {
      getVaultPath: this.vaultPathGetter,
      getGraphData: this.graphDataGetter,
      getSelectedNode: this.selectedNodeGetter,
      selectNode: this.selectNodeAction,
      openNote: this.openNoteAction,
      addCustomCSS: (cssId, css) => {
        let style = document.getElementById(`plugin-css-${cssId}`) as HTMLStyleElement | null;
        if (!style) {
          style = document.createElement('style');
          style.id = `plugin-css-${cssId}`;
          document.head.appendChild(style);
        }
        style.textContent = css;
        plugin.cleanupFns?.push(() => style?.remove());
      },
      removeCustomCSS: (cssId) => {
        document.getElementById(`plugin-css-${cssId}`)?.remove();
      },
      registerTopBarButton: (btn) => {
        this.topBarButtons.set(btn.id, btn);
        this.notify();
        const unreg = () => {
          this.topBarButtons.delete(btn.id);
          this.notify();
        };
        plugin.cleanupFns?.push(unreg);
        return unreg;
      },
      registerInspectorPanel: (panel) => {
        this.inspectorPanels.set(panel.id, panel);
        this.notify();
        const unreg = () => {
          this.inspectorPanels.delete(panel.id);
          this.notify();
        };
        plugin.cleanupFns?.push(unreg);
        return unreg;
      },
      registerCornerWidget: (widget) => {
        this.cornerWidgets.set(widget.id, widget);
        this.notify();
        const unreg = () => {
          this.cornerWidgets.delete(widget.id);
          this.notify();
        };
        plugin.cleanupFns?.push(unreg);
        return unreg;
      },
      registerNodeColorDecorator: (decorator) => {
        this.nodeColorDecorators.add(decorator);
        this.notify();
        const unreg = () => {
          this.nodeColorDecorators.delete(decorator);
          this.notify();
        };
        plugin.cleanupFns?.push(unreg);
        return unreg;
      },
      on: (event, handler) => {
        if (!this.eventListeners.has(event)) {
          this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(handler);
        const unreg = () => {
          this.eventListeners.get(event)?.delete(handler);
        };
        plugin.cleanupFns?.push(unreg);
        return unreg;
      },
      emit: (event, payload) => {
        this.emit(event, payload);
      },
    };

    try {
      if (plugin.isCustom && plugin.code) {
        // Run custom plugin script
        const runFn = new Function('context', 'React', plugin.code);
        const cleanup = runFn(context, React);
        if (typeof cleanup === 'function') {
          plugin.cleanupFns.push(cleanup);
        }
      } else if (plugin.onLoad) {
        plugin.onLoad(context);
      }
    } catch (err) {
      console.error(`Error loading plugin ${plugin.id}:`, err);
    }

    this.saveToStorage();
    this.notify();
  }

  public deactivatePlugin(id: string) {
    const plugin = this.plugins.get(id);
    if (!plugin || !plugin.enabled) return;

    plugin.enabled = false;
    if (plugin.cleanupFns) {
      plugin.cleanupFns.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          console.error(e);
        }
      });
      plugin.cleanupFns = [];
    }
    if (plugin.onUnload) {
      try {
        plugin.onUnload();
      } catch (e) {
        console.error(e);
      }
    }

    this.saveToStorage();
    this.notify();
  }

  public togglePlugin(id: string) {
    const plugin = this.plugins.get(id);
    if (!plugin) return;
    if (plugin.enabled) {
      this.deactivatePlugin(id);
    } else {
      this.activatePlugin(id);
    }
  }

  public removeCustomPlugin(id: string) {
    this.deactivatePlugin(id);
    this.plugins.delete(id);
    this.saveToStorage();
    this.notify();
  }

  public emit(event: string, payload?: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((handler) => {
        try {
          handler(payload);
        } catch (e) {
          console.error(`Error in event handler for ${event}:`, e);
        }
      });
    }
  }

  public getTopBarButtons(): TopBarButtonDef[] {
    return Array.from(this.topBarButtons.values());
  }

  public getInspectorPanels(): InspectorPanelDef[] {
    return Array.from(this.inspectorPanels.values());
  }

  public getCornerWidgets(position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'): CornerWidgetDef[] {
    const list = Array.from(this.cornerWidgets.values());
    if (position) {
      return list.filter((w) => w.position === position);
    }
    return list;
  }

  public getNodeColorDecorators(): NodeColorDecorator[] {
    return Array.from(this.nodeColorDecorators);
  }

  public getAllPlugins(): RegisteredPlugin[] {
    return Array.from(this.plugins.values());
  }

  private saveToStorage() {
    try {
      const pluginsList = Array.from(this.plugins.values()).map((p) => ({
        id: p.id,
        name: p.name,
        version: p.version,
        description: p.description,
        author: p.author,
        enabled: p.enabled,
        isCustom: p.isCustom,
        code: p.code,
      }));
      localStorage.setItem('obsidian_plugins_state', JSON.stringify(pluginsList));
    } catch (e) {
      console.error('Failed to save plugins state to localStorage:', e);
    }
  }

  public loadStoredState() {
    try {
      const saved = localStorage.getItem('obsidian_plugins_state');
      if (saved) {
        const list: Array<any> = JSON.parse(saved);
        list.forEach((item) => {
          if (item.isCustom) {
            this.registerPlugin({
              ...item,
              enabled: item.enabled ?? false,
            });
          } else {
            const existing = this.plugins.get(item.id);
            if (existing) {
              if (item.enabled && !existing.enabled) {
                this.activatePlugin(item.id);
              } else if (!item.enabled && existing.enabled) {
                this.deactivatePlugin(item.id);
              }
            }
          }
        });
      }
    } catch (e) {
      console.error('Failed to load plugins state:', e);
    }
  }
}

export const pluginRegistry = new PluginRegistry();

// Expose global ObsidianGraph for devtools and user plugins
if (typeof window !== 'undefined') {
  (window as any).ObsidianGraph = {
    pluginRegistry,
    registerPlugin: (plugin: RegisteredPlugin) => pluginRegistry.registerPlugin(plugin),
  };
}
