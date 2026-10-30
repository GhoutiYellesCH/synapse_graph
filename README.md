# Obsidian Graph Viewer (Desktop Tauri App)

A standalone, high-performance graph viewer for Obsidian vaults built with **Tauri v2**, **Rust**, **React**, and **force-graph**.

Designed specifically for users who want to visualize their entire Obsidian knowledge graph, explore connections, and **audit unconnected/orphan notes**—without a heavy embedded text editor. When you need to write or edit, notes open instantly in your favorite external editor: **Neovim**, **Emacs**, **VS Code**, or your custom terminal command.

---

## 🌟 Key Features

1. **Vault Scanner & Link Resolver (Rust Engine)**:
   - Blazing-fast recursive vault traversal (~0.02s for hundreds of notes).
   - Resolves both Obsidian `[[wikilinks]]` (including `[[Note|Alias]]` and `[[Note#Section]]`) and standard markdown `[text](target.md)` links.
   - Extracts YAML frontmatter tags (`tags: [...]`) and inline `#tags`.
   - Resolves links across subfolders using Obsidian's shortest-path resolution.

2. **Orphan & Unconnected Notes Focus**:
   - Specifically highlights notes with degree 0 (0 incoming backlinks and 0 outgoing links) so you can view leftover ideas.
   - **One-click filters**:
     - **All Notes**: Standard full graph view.
     - **Highlight Orphans**: Pulses and glows all unconnected notes with bright amber rings.
     - **Orphans Only**: Isolates and displays only unconnected notes to audit backlog.
     - **Hide Orphans**: Focuses strictly on connected clusters.

3. **External Editor Integration**:
   - **Neovim**: Opens the note inside Kitty, Xterm, Alacritty, or Gnome Terminal (`kitty -e nvim <file>`).
   - **VS Code**: Opens the note via `code --reuse-window <file>`.
   - **Emacs**: Connects via `emacsclient -n <file>` or `emacs <file>`.
   - **Custom Command**: Configure custom terminal strings with `{file}` and `{vault}` placeholders (e.g. `kitty -e nvim "{file}"` or `alacritty -e nvim +1 "{file}"`).
   - **Double-Click Action**: Double clicking any node in the graph immediately opens the note in your preferred editor.
   - **Open Vault in Editor**: Quick button to open the whole vault workspace in your editor.

4. **Obsidian Dark Aesthetic & Physics Controls**:
   - Obsidian-inspired dark glassmorphism UI (`#121214` space dark).
   - Node radius dynamically scales with connectivity degree.
   - Neighbor highlighting on hover: cursor focus dims unrelated nodes and illuminates 1st-degree neighbors and connecting edges.
   - Real-time search filter (matches note titles, paths, excerpts, or tags).
   - Folder and Tag multi-filtering.
   - Force physics sliders: Node Repulsion, Link Distance, and Center Gravity.
   - Pan, Zoom In/Out, Fit-to-screen, and Pause/Resume simulation.

5. **Read-Only Inspector Panel**:
   - Slide-out inspector on node selection.
   - View file metadata (file size, modified timestamp, relative path).
   - Inbound Backlinks & Outgoing links list (clickable chips to navigate the network).
   - Read-only note preview with formatted text.
   - Quick launcher buttons for Neovim, VS Code, Emacs, Default system app, and File Manager reveal.

---

## 🚀 Running & Developing

### Development Mode (with hot-reload):
```bash
npm run tauri dev
```

### Pre-built Native Binary:
A built binary is ready at:
```bash
./src-tauri/target/debug/tauri-app
```

### Build Debian Package:
```bash
npm run tauri build -- --debug
# The .deb package will be created in src-tauri/target/debug/bundle/deb/
```

---

## 📁 Included Sample Vault

A sample vault with interconnected notes and 5 unconnected orphan notes is available in `./sample_vault`:
- `sample_vault/Index.md`
- `sample_vault/Architecture.md`
- `sample_vault/Rust Backend.md`
- `sample_vault/Frontend UI.md`
- `sample_vault/Orphan Ideas.md` *(Orphan note)*
- `sample_vault/Random Thought - 2026.md` *(Orphan note)*
- `sample_vault/Leftover Bookmark.md` *(Orphan note)*
- `sample_vault/Draft Post.md` *(Orphan note)*
- `sample_vault/Research/Unconnected Paper.md` *(Orphan note)*
- `sample_vault/Research/Graph Theory.md`
