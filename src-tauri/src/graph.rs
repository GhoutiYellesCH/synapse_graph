use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub id: String,
    pub name: String,
    pub path: String,
    pub rel_path: String,
    pub extension: String,
    pub size: u64,
    pub modified: u64,
    pub tags: Vec<String>,
    pub excerpt: String,
    pub incoming_count: usize,
    pub outgoing_count: usize,
    pub is_orphan: bool,
    pub is_ghost: bool,
    pub folder: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Link {
    pub source: String,
    pub target: String,
    pub label: Option<String>,
    pub is_unresolved: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphData {
    pub nodes: Vec<Node>,
    pub links: Vec<Link>,
    pub total_files: usize,
    pub orphan_count: usize,
    pub link_count: usize,
    pub tags: Vec<String>,
    pub folders: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanOptions {
    pub include_non_markdown: bool,
    pub include_ghost_nodes: bool,
}

impl Default for ScanOptions {
    fn default() -> Self {
        Self {
            include_non_markdown: false,
            include_ghost_nodes: false,
        }
    }
}

pub fn scan_vault(vault_path_str: &str, options: ScanOptions) -> Result<GraphData, String> {
    let vault_root = Path::new(vault_path_str);
    if !vault_root.exists() || !vault_root.is_dir() {
        return Err(format!("Directory does not exist: {}", vault_path_str));
    }

    let wikilink_re = Regex::new(r"!?\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]").unwrap();
    let mdlink_re = Regex::new(r"!?\[([^\]]*)\]\(([^)]+)\)").unwrap();
    let tag_re = Regex::new(r"(?:^|\s)#([a-zA-Z0-9_\-/\p{L}]+)").unwrap();
    let frontmatter_re = Regex::new(r"(?s)^---\r?\n(.*?)\r?\n---").unwrap();

    // Map: normalized path without ext -> Node
    let mut files_raw: Vec<(PathBuf, String, String, u64, u64, String, Vec<String>, Vec<(String, Option<String>)>)> = Vec::new();
    let mut all_tags: HashSet<String> = HashSet::new();
    let mut all_folders: HashSet<String> = HashSet::new();

    // Lookup index:
    // 1. Exact relative path without extension (lowercase) -> canonical ID
    // 2. Base file name without extension (lowercase) -> canonical ID
    let mut lookup_by_rel: HashMap<String, String> = HashMap::new();
    let mut lookup_by_name: HashMap<String, Vec<String>> = HashMap::new();

    for entry in WalkDir::new(vault_root)
        .follow_links(true)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            // Ignore hidden folders, obsidian system folders, git, node_modules
            if name.starts_with('.') && name != "." {
                return false;
            }
            if name == "node_modules" || name == "target" || name == "dist" {
                return false;
            }
            true
        })
    {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();
        let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();
        let is_md = ext == "md" || ext == "markdown";

        if !is_md && !options.include_non_markdown {
            continue;
        }

        let rel_path = match path.strip_prefix(vault_root) {
            Ok(p) => p.to_string_lossy().replace('\\', "/"),
            Err(_) => continue,
        };

        let file_stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
        let file_name = path.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();

        let metadata = match fs::metadata(path) {
            Ok(m) => m,
            Err(_) => continue,
        };

        let size = metadata.len();
        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let folder = Path::new(&rel_path)
            .parent()
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_default();
        if !folder.is_empty() {
            all_folders.insert(folder.clone());
        }

        let id = rel_path.clone();

        // Index for linking
        let rel_no_ext = if let Some(idx) = rel_path.rfind('.') {
            &rel_path[..idx]
        } else {
            &rel_path
        };
        lookup_by_rel.insert(rel_no_ext.to_lowercase(), id.clone());
        lookup_by_name.entry(file_stem.to_lowercase()).or_default().push(id.clone());

        let mut tags: HashSet<String> = HashSet::new();
        let mut links: Vec<(String, Option<String>)> = Vec::new();
        let mut excerpt = String::new();

        if is_md {
            if let Ok(content) = fs::read_to_string(path) {
                // Parse frontmatter
                let mut body = content.as_str();
                if let Some(caps) = frontmatter_re.captures(&content) {
                    if let Some(fm) = caps.get(1) {
                        parse_frontmatter_tags(fm.as_str(), &mut tags);
                    }
                    body = &content[caps.get(0).unwrap().end()..];
                }

                // Excerpt (first non-empty 250 chars)
                let clean_body = body.trim();
                let chars: Vec<char> = clean_body.chars().collect();
                if chars.len() > 250 {
                    excerpt = chars[..250].iter().collect();
                    excerpt.push_str("...");
                } else {
                    excerpt = clean_body.to_string();
                }

                // Inline tags
                for cap in tag_re.captures_iter(body) {
                    if let Some(t) = cap.get(1) {
                        let tag_str = t.as_str().trim_matches('/');
                        if !tag_str.is_empty() && !tag_str.chars().all(|c| c.is_ascii_digit()) {
                            tags.insert(tag_str.to_string());
                        }
                    }
                }

                // Parse wikilinks
                for cap in wikilink_re.captures_iter(body) {
                    if let Some(target) = cap.get(1) {
                        let target_clean = target.as_str().trim().to_string();
                        let label = cap.get(2).map(|m| m.as_str().trim().to_string());
                        if !target_clean.is_empty() {
                            links.push((target_clean, label));
                        }
                    }
                }

                // Parse standard markdown links (relative links)
                for cap in mdlink_re.captures_iter(body) {
                    if let Some(target) = cap.get(2) {
                        let target_str = target.as_str().trim();
                        // Ignore web urls, anchors
                        if !target_str.starts_with("http://")
                            && !target_str.starts_with("https://")
                            && !target_str.starts_with('#')
                            && !target_str.starts_with("mailto:")
                        {
                            let label = cap.get(1).map(|m| m.as_str().trim().to_string());
                            let clean_link = target_str.split('#').next().unwrap_or("").trim();
                            if !clean_link.is_empty() {
                                links.push((clean_link.to_string(), label));
                            }
                        }
                    }
                }
            }
        }

        for t in &tags {
            all_tags.insert(t.clone());
        }

        let tags_vec: Vec<String> = tags.into_iter().collect();
        files_raw.push((path.to_path_buf(), id, file_name, size, modified, excerpt, tags_vec, links));
    }

    // Resolve links
    let mut resolved_links: Vec<Link> = Vec::new();
    let mut incoming_counts: HashMap<String, usize> = HashMap::new();
    let mut outgoing_counts: HashMap<String, usize> = HashMap::new();
    let mut seen_edges: HashSet<(String, String)> = HashSet::new();
    let mut ghost_nodes: HashMap<String, Node> = HashMap::new();

    for (_path, source_id, _name, _size, _mod, _excerpt, _tags, links) in &files_raw {
        for (target_raw, label) in links {
            let target_clean = target_raw.trim().replace('\\', "/");
            let target_no_ext = if let Some(idx) = target_clean.rfind('.') {
                &target_clean[..idx]
            } else {
                &target_clean
            };
            let target_lower = target_no_ext.to_lowercase();

            // Try resolving by relative path first, then by filename
            let resolved_target_id = if let Some(id) = lookup_by_rel.get(&target_lower) {
                Some(id.clone())
            } else if let Some(candidates) = lookup_by_name.get(&target_lower) {
                candidates.first().cloned()
            } else {
                // If target has path separators, check just the file stem
                let stem = Path::new(&target_clean)
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                if !stem.is_empty() {
                    lookup_by_name.get(&stem).and_then(|c| c.first().cloned())
                } else {
                    None
                }
            };

            match resolved_target_id {
                Some(target_id) => {
                    // Do not create duplicate edges in the same direction
                    if source_id != &target_id && seen_edges.insert((source_id.clone(), target_id.clone())) {
                        *outgoing_counts.entry(source_id.clone()).or_insert(0) += 1;
                        *incoming_counts.entry(target_id.clone()).or_insert(0) += 1;
                        resolved_links.push(Link {
                            source: source_id.clone(),
                            target: target_id,
                            label: label.clone(),
                            is_unresolved: false,
                        });
                    }
                }
                None => {
                    // Ghost / uncreated note
                    if options.include_ghost_nodes {
                        let ghost_id = format!("ghost:{}", target_clean);
                        if seen_edges.insert((source_id.clone(), ghost_id.clone())) {
                            *outgoing_counts.entry(source_id.clone()).or_insert(0) += 1;
                            *incoming_counts.entry(ghost_id.clone()).or_insert(0) += 1;

                            ghost_nodes.entry(ghost_id.clone()).or_insert_with(|| Node {
                                id: ghost_id.clone(),
                                name: target_clean.clone(),
                                path: "".to_string(),
                                rel_path: target_clean.clone(),
                                extension: "uncreated".to_string(),
                                size: 0,
                                modified: 0,
                                tags: Vec::new(),
                                excerpt: "Uncreated note linked in vault".to_string(),
                                incoming_count: 0,
                                outgoing_count: 0,
                                is_orphan: false,
                                is_ghost: true,
                                folder: "".to_string(),
                            });

                            resolved_links.push(Link {
                                source: source_id.clone(),
                                target: ghost_id,
                                label: label.clone(),
                                is_unresolved: true,
                            });
                        }
                    }
                }
            }
        }
    }

    let mut final_nodes: Vec<Node> = Vec::new();
    let mut orphan_count = 0;

    for (path, id, name, size, modified, excerpt, tags, _links) in files_raw {
        let in_cnt = *incoming_counts.get(&id).unwrap_or(&0);
        let out_cnt = *outgoing_counts.get(&id).unwrap_or(&0);
        let is_orphan = in_cnt == 0 && out_cnt == 0;
        if is_orphan {
            orphan_count += 1;
        }

        let folder = Path::new(&id)
            .parent()
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_default();

        let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("").to_string();

        final_nodes.push(Node {
            id,
            name,
            path: path.to_string_lossy().to_string(),
            rel_path: path.strip_prefix(vault_root).unwrap_or(&path).to_string_lossy().replace('\\', "/"),
            extension: ext,
            size,
            modified,
            tags,
            excerpt,
            incoming_count: in_cnt,
            outgoing_count: out_cnt,
            is_orphan,
            is_ghost: false,
            folder,
        });
    }

    if options.include_ghost_nodes {
        for (ghost_id, mut gnode) in ghost_nodes {
            gnode.incoming_count = *incoming_counts.get(&ghost_id).unwrap_or(&0);
            gnode.outgoing_count = *outgoing_counts.get(&ghost_id).unwrap_or(&0);
            final_nodes.push(gnode);
        }
    }

    let mut sorted_tags: Vec<String> = all_tags.into_iter().collect();
    sorted_tags.sort();

    let mut sorted_folders: Vec<String> = all_folders.into_iter().collect();
    sorted_folders.sort();

    let total_files = final_nodes.len();
    let link_count = resolved_links.len();

    Ok(GraphData {
        nodes: final_nodes,
        links: resolved_links,
        total_files,
        orphan_count,
        link_count,
        tags: sorted_tags,
        folders: sorted_folders,
    })
}

fn parse_frontmatter_tags(fm: &str, tags: &mut HashSet<String>) {
    let mut in_tags_list = false;
    for line in fm.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("tags:") || trimmed.starts_with("tag:") {
            let val = trimmed.splitn(2, ':').nth(1).unwrap_or("").trim();
            if val.starts_with('[') && val.ends_with(']') {
                let inner = &val[1..val.len() - 1];
                for part in inner.split(',') {
                    let t = part.trim().trim_matches('"').trim_matches('\'').trim_start_matches('#');
                    if !t.is_empty() {
                        tags.insert(t.to_string());
                    }
                }
                in_tags_list = false;
            } else if !val.is_empty() {
                for part in val.split(',') {
                    let t = part.trim().trim_matches('"').trim_matches('\'').trim_start_matches('#');
                    if !t.is_empty() {
                        tags.insert(t.to_string());
                    }
                }
                in_tags_list = false;
            } else {
                in_tags_list = true;
            }
        } else if in_tags_list {
            if trimmed.starts_with("- ") {
                let t = trimmed[2..].trim().trim_matches('"').trim_matches('\'').trim_start_matches('#');
                if !t.is_empty() {
                    tags.insert(t.to_string());
                }
            } else if trimmed.contains(':') {
                in_tags_list = false;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scan_sample_vault() {
        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
        let vault_path = Path::new(&manifest_dir).parent().unwrap().join("sample_vault");
        let data = scan_vault(vault_path.to_str().unwrap(), ScanOptions::default()).unwrap();
        assert!(data.total_files >= 15);
        assert_eq!(data.orphan_count, 5);
        let orphan_names: Vec<&str> = data.nodes.iter().filter(|n| n.is_orphan).map(|n| n.name.as_str()).collect();
        assert!(orphan_names.contains(&"Orphan Ideas.md") || orphan_names.contains(&"Orphan Ideas"));
    }
}
