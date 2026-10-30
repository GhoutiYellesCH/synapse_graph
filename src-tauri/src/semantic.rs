use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningConnection {
    pub source: String,
    pub target: String,
    pub concept: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AntigravityAiResult {
    pub answer: String,
    pub matched_notes: Vec<String>,
    pub key_insights: Vec<String>,
    pub learning_connections: Vec<LearningConnection>,
}

fn find_agy_binary() -> String {
    let candidate = "/home/gotoro/.local/bin/agy";
    if std::path::Path::new(candidate).exists() {
        return candidate.to_string();
    }
    // Check if agy in PATH
    if let Ok(path_var) = std::env::var("PATH") {
        for p in path_var.split(':') {
            let full = std::path::Path::new(p).join("agy");
            if full.exists() {
                return full.to_string_lossy().to_string();
            }
        }
    }
    "agy".to_string()
}

pub fn query_antigravity(
    vault_path: &str,
    query: &str,
    vault_notes_summary: &str,
) -> Result<AntigravityAiResult, String> {
    let agy_bin = find_agy_binary();

    let prompt = format!(
        r#"You are the AI Semantic Research & Learning Engine for Synapse Graph, an intelligent Markdown knowledge visualizer.
The user is querying their Markdown vault at: {vault_path}

User Query / Question:
"{query}"

Vault Notes Context:
{vault_notes_summary}

Task:
Synthesize an insightful, coherent response to the user's question based on their notes.
Connect ideas across different notes and highlight conceptual bridges for learning.

Output ONLY valid JSON matching this schema:
{{
  "answer": "Clear markdown synthesis answering the user query based on their notes",
  "matched_notes": ["Exact note name or relative path 1", "Exact note name or relative path 2"],
  "key_insights": ["Insight 1", "Insight 2"],
  "learning_connections": [
    {{
      "source": "Exact note name 1",
      "target": "Exact note name 2",
      "concept": "Conceptual connection between these two notes"
    }}
  ]
}}
"#
    );

    let output = Command::new(&agy_bin)
        .arg("--print")
        .arg(&prompt)
        .output()
        .map_err(|e| format!("Failed to execute agy CLI at '{}': {}", agy_bin, e))?;

    if !output.status.success() {
        let err_text = String::from_utf8_lossy(&output.stderr);
        return Err(format!("agy returned error: {}", err_text));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();

    // Parse JSON from output, handling possible markdown code fence ```json ... ```
    let json_str = if let Some(start) = stdout.find("```json") {
        let rest = &stdout[start + 7..];
        if let Some(end) = rest.find("```") {
            rest[..end].trim()
        } else {
            rest.trim()
        }
    } else if let Some(start) = stdout.find('{') {
        if let Some(end) = stdout.rfind('}') {
            &stdout[start..=end]
        } else {
            &stdout
        }
    } else {
        &stdout
    };

    match serde_json::from_str::<AntigravityAiResult>(json_str) {
        Ok(res) => Ok(res),
        Err(_) => {
            // Fallback: wrap raw response into answer
            Ok(AntigravityAiResult {
                answer: stdout,
                matched_notes: vec![],
                key_insights: vec![],
                learning_connections: vec![],
            })
        }
    }
}
