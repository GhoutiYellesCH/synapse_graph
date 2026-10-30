import { GraphNode } from '../types';

/**
 * Tokenizes text into normalized keywords supporting multilingual (English, Arabic, etc.),
 * stripping punctuation and markdown formatting.
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[#*`_\[\]()\-:.,!?/\\'"~]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

export interface SemanticMatch {
  nodeId: string;
  score: number; // 0.0 to 1.0
  matchedTerms: string[];
}

export class LocalSemanticEngine {
  /**
   * Scores all nodes against a natural language query or question.
   * Returns a map of nodeId -> score (0 to 1).
   */
  public static search(nodes: GraphNode[], query: string): Map<string, number> {
    const scores = new Map<string, number>();
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return scores;

    // Document frequencies
    const docFreq = new Map<string, number>();
    nodes.forEach((node) => {
      const docTokens = new Set([
        ...tokenize(node.name),
        ...tokenize(node.rel_path),
        ...tokenize(node.excerpt),
        ...node.tags.flatMap((t) => tokenize(t)),
      ]);
      docTokens.forEach((t) => {
        docFreq.set(t, (docFreq.get(t) || 0) + 1);
      });
    });

    const N = nodes.length;

    nodes.forEach((node) => {
      const titleTokens = tokenize(node.name);
      const excerptTokens = tokenize(node.excerpt);
      const tagTokens = node.tags.flatMap((t) => tokenize(t));
      const pathTokens = tokenize(node.rel_path);

      let totalScore = 0;
      let matches = 0;

      queryTokens.forEach((qt) => {
        const idf = Math.log(1 + (N - (docFreq.get(qt) || 0) + 0.5) / ((docFreq.get(qt) || 0) + 0.5));
        
        // Exact title match weight
        if (titleTokens.includes(qt)) {
          totalScore += 5.0 * idf;
          matches++;
        } else if (titleTokens.some((t) => t.includes(qt) || qt.includes(t))) {
          totalScore += 3.0 * idf;
          matches++;
        }

        // Tag match weight
        if (tagTokens.includes(qt)) {
          totalScore += 4.0 * idf;
          matches++;
        }

        // Excerpt match weight
        const excerptCount = excerptTokens.filter((t) => t === qt).length;
        if (excerptCount > 0) {
          totalScore += (1.0 + Math.log(excerptCount)) * idf;
          matches++;
        }

        // Path match weight
        if (pathTokens.includes(qt)) {
          totalScore += 2.0 * idf;
          matches++;
        }
      });

      if (matches > 0) {
        // Normalize
        const normalized = Math.min(1.0, totalScore / (queryTokens.length * 4.5));
        scores.set(node.id, normalized);
      }
    });

    return scores;
  }

  /**
   * Builds a concise summary of the most relevant notes to pass to Antigravity CLI (agy)
   * so it can reason across the vault without exceeding token limits.
   */
  public static buildVaultSummaryForAi(nodes: GraphNode[], query?: string): string {
    let candidateNodes = nodes;
    if (query && query.trim()) {
      const localScores = this.search(nodes, query);
      if (localScores.size > 0) {
        candidateNodes = nodes
          .slice()
          .sort((a, b) => (localScores.get(b.id) || 0) - (localScores.get(a.id) || 0));
      }
    }

    // Take top 40 notes
    const top = candidateNodes.slice(0, 40);
    return top
      .map((n) => {
        const cleanExcerpt = (n.excerpt || '').replace(/\s+/g, ' ').slice(0, 160);
        const tags = n.tags.length > 0 ? ` [tags: ${n.tags.join(', ')}]` : '';
        return `- Note "${n.name}" (${n.rel_path}): ${cleanExcerpt}${tags}`;
      })
      .join('\n');
  }
}
