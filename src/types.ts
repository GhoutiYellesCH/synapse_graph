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
  nvim: boolean;
  code: boolean;
  emacs: boolean;
  kitty: boolean;
  xterm: boolean;
  xdg_open: boolean;
}

export type EditorType = 'nvim' | 'code' | 'emacs' | 'system' | 'custom';

export interface EditorSettings {
  preferredEditor: EditorType;
  customCommand: string;
  doubleClickAction: 'editor' | 'inspector';
}
