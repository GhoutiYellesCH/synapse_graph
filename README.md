# Synapse Graph

A standalone, high-performance Markdown knowledge graph visualizer and orphan note auditor built with **Tauri v2**, **Rust**, and **React**.

Created and developed by **Ghouti Yelles Chaouche**.

---

## 🌟 Overview & Key Capabilities

- **Zero-Copyright Clean-Room Design**: An independent, trademark-free graph visualizer built from scratch without embedded text editors.
- **External Editor Workflow**: Instantly jump into **Neovim**, **Emacs**, **VS Code**, or a custom terminal command on double-click or right-click.
- **Auditing Leftover & Orphan Notes**: Dedicated 1-click filter modes (*Highlight Orphans*, *Orphans Only*, *Hide Orphans*) with glowing amber pulses.
- **Obsidian-Grade Calibrated Physics**:
  - Bounded repulsion (`distanceMax = 350`) so large vaults (~1,000+ notes) stay tightly grouped rather than blowing apart.
  - Collision physics (`d3.forceCollide`) prevents node overlaps.
  - Sliders for Center Force, Repel Force, Link Distance, and Link Force.
- **Obsidian Graph Features**:
  - Directional link arrows
  - Color groups with query syntax (`tag:#work`, `path:projects`, or text search)
  - Full-text search and folder/tag filtering
  - Node size and link thickness scaling
- **Blurred Background Image**: Custom image background with blur slider (`0-50px`) and darkness overlay for canvas and/or inspector.
- **Interactive Knowledge Dashboard & Docs**: Built-in dashboard with real-time vault analytics (density, average degree, hub rank), CLI instructions, and modding guides.
- **Live CSS Snippet System**: Dedicated `~/.config/synapse-graph/snippets/` folder for toggleable `.css` snippet files.
- **Plugin Architecture**: Extensible JavaScript mod engine with scripts stored in `~/.config/synapse-graph/plugins/`.

---

## 📁 System Configuration & Storage Hierarchy

All application state, user mods, and per-vault preferences live in standard Linux XDG config directories:

```
~/.config/synapse-graph/
├── vault_data/          # Per-vault remembered configurations (<vault_hash>.json)
│   ├── Documents_Notes_a1b2.json
│   └── My_Vault_c3d4.json
├── plugins/             # User JavaScript plugins and mods (*.js)
│   └── vault-node-badge.js
└── snippets/            # Custom CSS snippet files (*.css)
    ├── accent-glow.css
    └── custom-theme.css
```

### Automatic Per-Vault Persistence
Whenever you adjust color groups, physics forces, display settings, or background images for a specific vault, Synapse Graph automatically remembers and saves those settings in `~/.config/synapse-graph/vault_data/`. When you reopen that vault later via CLI or GUI, your customized layout is automatically restored!

---

## 📦 Ubuntu / Debian Installation (.deb Package)

Pre-packaged Debian/Ubuntu `.deb` binaries can be downloaded directly from the [GitHub Releases](https://github.com/GhoutiYellesCH/synapse-graph/releases) page:

```bash
# Install downloaded package:
sudo dpkg -i synapse-graph_1.0.0_amd64.deb

# If any dependencies are needed:
sudo apt-get install -f
```

This registers:
- `/usr/bin/synapse-graph` in your system `$PATH`
- `Synapse Graph` in your desktop applications launcher
- App icon in `/usr/share/icons/hicolor/`

---

## ⚡ Native Command-Line (CLI) Usage

Launch any folder as a Markdown vault directly from your shell:

```bash
# Open any folder as a vault
synapse-graph ~/Documents/MyNotes

# Open current directory as vault
synapse-graph .

# Using the -v / --vault flag
synapse-graph -v ~/Work/KnowledgeBase

# Display CLI help
synapse-graph --help
```

You can also run the local standalone executable directly without installing:
```bash
./synapse-graph ~/sample_vault
```

---

## 🛠️ Building From Source

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode (with hot-reload)
npm run tauri dev

# 3. Build standalone binary and .deb package
npm run tauri build
```

---

## 👤 Author & License

- **Developer**: Ghouti Yelles Chaouche
- **Application**: Synapse Graph
- **License**: MIT
