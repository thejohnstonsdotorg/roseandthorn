/**
 * lib/imagePrompt.ts
 *
 * Converts a Rose/Thorn text entry into a concise image-generation prompt.
 * Rule-based for v1 — extracts key nouns/adjectives and adds a style prefix
 * appropriate to the mood.
 *
 * Future: could use ML Kit GenAI Rewriting API (Gemini Nano on-device text)
 * to reshape the prompt more intelligently.
 */

export type PromptMood = 'rose' | 'thorn';

// Stop-words that add no semantic value to the image prompt
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to',
  'by', 'in', 'of', 'up', 'out', 'my', 'me', 'i', 'we', 'it', 'is', 'was',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'with', 'that',
  'this', 'from', 'they', 'them', 'their', 'our', 'its', 'not', 'no', 'so',
  'if', 'then', 'than', 'too', 'very', 'just', 'about', 'like', 'really',
  'got', 'get', 'went', 'go', 'came', 'come', 'feel', 'felt',
]);

const ROSE_STYLE_PREFIX = 'warm watercolor illustration, golden light,';
const THORN_STYLE_PREFIX = 'moody watercolor illustration, cool shadows,';

/**
 * Extracts up to `maxKeywords` meaningful words from the entry text.
 */
function extractKeywords(text: string, maxKeywords: number = 6): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, maxKeywords);
}

/**
 * Builds a concise image-gen prompt from a Rose/Thorn entry.
 * @param text      The raw Rose or Thorn entry text from the user.
 * @param mood      'rose' (highlight) or 'thorn' (challenge).
 * @returns         A short prompt string suitable for Stable Diffusion or similar.
 */
export function buildImagePrompt(text: string, mood: PromptMood): string {
  const stylePrefix = mood === 'rose' ? ROSE_STYLE_PREFIX : THORN_STYLE_PREFIX;
  const keywords = extractKeywords(text);

  if (keywords.length === 0) {
    // Fallback for very short or symbol-only text
    return mood === 'rose'
      ? `${stylePrefix} abstract warmth and celebration`
      : `${stylePrefix} abstract quiet reflection`;
  }

  const keywordClause = keywords.join(', ');
  return `${stylePrefix} ${keywordClause}`;
}
