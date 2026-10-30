export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  css: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Obsidian Dark (Default)',
    description: 'Clean dark slate Obsidian aesthetic with violet and indigo accents.',
    css: `/* Default Obsidian Theme */
:root {
  --bg-app: #121214;
  --bg-sidebar: #18181b;
  --bg-card: #202024;
  --bg-hover: #27272a;
  --border-color: rgba(255, 255, 255, 0.08);
  --text-normal: #f4f4f5;
  --text-muted: #a1a1aa;
  --accent-color: #818cf8;
  --node-orphan: #f59e0b;
  --node-selected: #38bdf8;
  --node-neighbor: #60a5fa;
  --link-color: #3f3f46;
}`,
  },
  {
    id: 'nord',
    name: 'Nord Frost',
    description: 'Arctic, north-bluish clean palette focused on readability.',
    css: `/* Nord Theme */
:root {
  --bg-app: #242933;
  --bg-sidebar: #2e3440;
  --bg-card: #3b4252;
  --bg-hover: #434c5e;
  --border-color: rgba(216, 222, 233, 0.12);
  --text-normal: #eceff4;
  --text-muted: #d8dee9;
  --accent-color: #88c0d0;
  --node-orphan: #ebcb8b;
  --node-selected: #81a1c1;
  --node-neighbor: #8fbcbb;
  --link-color: #4c566a;
}`,
  },
  {
    id: 'dracula',
    name: 'Dracula Vampire',
    description: 'Iconic dark theme with neon pink, cyan, and deep purples.',
    css: `/* Dracula Theme */
:root {
  --bg-app: #1e1f29;
  --bg-sidebar: #282a36;
  --bg-card: #343746;
  --bg-hover: #44475a;
  --border-color: rgba(98, 114, 164, 0.25);
  --text-normal: #f8f8f2;
  --text-muted: #6272a4;
  --accent-color: #bd93f9;
  --node-orphan: #ffb86c;
  --node-selected: #8be9fd;
  --node-neighbor: #ff79c6;
  --link-color: #6272a4;
}`,
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox Dark',
    description: 'Warm retro groove with soft earthy tones and amber highlights.',
    css: `/* Gruvbox Dark */
:root {
  --bg-app: #1d2021;
  --bg-sidebar: #282828;
  --bg-card: #32302f;
  --bg-hover: #3c3836;
  --border-color: rgba(235, 219, 178, 0.12);
  --text-normal: #ebdbb2;
  --text-muted: #a89984;
  --accent-color: #fe8019;
  --node-orphan: #fabd2f;
  --node-selected: #83a598;
  --node-neighbor: #b8bb26;
  --link-color: #504945;
}`,
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    description: 'Modern twilight neon blue and magenta inspired by Tokyo at dusk.',
    css: `/* Tokyo Night */
:root {
  --bg-app: #16161e;
  --bg-sidebar: #1a1b26;
  --bg-card: #24283b;
  --bg-hover: #2f3549;
  --border-color: rgba(122, 162, 247, 0.15);
  --text-normal: #c0caf5;
  --text-muted: #7982a9;
  --accent-color: #7aa2f7;
  --node-orphan: #e0af68;
  --node-selected: #bb9af7;
  --node-neighbor: #7dcfff;
  --link-color: #3b4261;
}`,
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    description: 'Electrifying high-contrast synthwave neon yellow, pink, and cyan.',
    css: `/* Cyberpunk Neon */
:root {
  --bg-app: #0d0f18;
  --bg-sidebar: #121422;
  --bg-card: #1b1e32;
  --bg-hover: #252a46;
  --border-color: rgba(255, 0, 128, 0.3);
  --text-normal: #00f0ff;
  --text-muted: #8d96b3;
  --accent-color: #fcee0a;
  --node-orphan: #ff007f;
  --node-selected: #00f0ff;
  --node-neighbor: #7122fa;
  --link-color: #2b2e4a;
}`,
  },
];

const CUSTOM_CSS_STORAGE_KEY = 'obsidian_custom_css';
const ACTIVE_PRESET_STORAGE_KEY = 'obsidian_active_theme_preset';

export function getStoredCustomCSS(): string {
  return localStorage.getItem(CUSTOM_CSS_STORAGE_KEY) || THEME_PRESETS[0].css;
}

export function getStoredActivePresetId(): string {
  return localStorage.getItem(ACTIVE_PRESET_STORAGE_KEY) || 'default';
}

export function applyCustomCSS(css: string, presetId?: string) {
  let styleEl = document.getElementById('obsidian-custom-css') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'obsidian-custom-css';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;

  try {
    localStorage.setItem(CUSTOM_CSS_STORAGE_KEY, css);
    if (presetId) {
      localStorage.setItem(ACTIVE_PRESET_STORAGE_KEY, presetId);
    }
  } catch (e) {
    console.error('Failed to save custom CSS:', e);
  }
}
