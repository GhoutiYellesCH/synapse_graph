export interface GraphNode {
  id: string;
  name: string;
  path: string;
  rel_path: string;
  extension: string;
  size: u64number;
  modified: number;
  tags: string[];
  excerpt: string;
  incoming_count: number;
  outgoing_count: number;
  is_orphan: boolean;
  is_ghost: boolean;
  folder: string;
  // Simulation properties added by force-graph
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  radius?: number;
}

export type u64number = number;

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  label?: string | null;
  is_unresolved: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  total_files: number;
  orphan_count: number;
  link_count: number;
  tags: string[];
  folders: string[];
}

export interface ScanOptions {
  include_non_markdown: boolean;
  include_ghost_nodes: boolean;
}

export interface AvailableEditors {
  synapse: boolean;
  second_brain?: boolean;
  nvim: boolean;
  code: boolean;
  emacs: boolean;
  kitty: boolean;
  xterm: boolean;
  xdg_open: boolean;
}

export type EditorType = 'synapse' | 'second-brain' | 'nvim' | 'code' | 'emacs' | 'system' | 'custom';

export interface EditorSettings {
  preferredEditor: EditorType;
  customCommand: string;
  doubleClickAction: 'editor' | 'inspector';
}

// Obsidian Graph View Features (https://obsidian.md/help/plugins/graph)

export interface ColorGroup {
  id: string;
  query: string; // e.g. tag:#work, path:projects, or keyword
  color: string; // hex color e.g. #10b981
}

export interface DisplaySettings {
  showArrows: boolean;
  textFadeThreshold: number; // 0.1 to 3.0
  nodeSizeMultiplier: number; // 0.5 to 3.0
  linkThicknessMultiplier: number; // 0.5 to 4.0
}

export interface ForceSettings {
  centerStrength: number; // 0.0 to 1.0 (default 0.35)
  repelStrength: number; // 20 to 500 (default 120)
  linkDistance: number; // 15 to 250 (default 45)
  linkStrength: number; // 0.1 to 2.0 (default 1.0)
}

export interface BackgroundSettings {
  enabled: boolean;
  imageUrl: string;
  blur: number; // 0 to 50 px
  opacity: number; // 0.1 to 1.0
  applyToGraph: boolean;
  applyToInspector: boolean;
}

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  enabled: boolean;
  isCustom?: boolean;
  code?: string;
}

export interface VaultConfigData {
  vault_path: string;
  color_groups: ColorGroup[];
  display_settings: DisplaySettings;
  force_settings: ForceSettings;
  background_settings: BackgroundSettings;
  orphan_filter?: 'all' | 'highlight' | 'only' | 'hide';
  last_opened: number;
}

export interface SnippetInfo {
  filename: string;
  path: string;
  content: string;
}

export interface DiskPluginInfo {
  filename: string;
  path: string;
  code: string;
}

export type GraphLayoutMode = 'spherical' | 'standard';

export interface LearningConnection {
  source: string;
  target: string;
  concept: string;
}

export interface AntigravityAiResult {
  answer: string;
  matched_notes: string[];
  key_insights: string[];
  learning_connections: LearningConnection[];
}
