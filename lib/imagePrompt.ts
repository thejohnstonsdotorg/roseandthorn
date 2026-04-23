/**
 * lib/imagePrompt.ts
 *
 * Converts a Rose/Thorn text entry into a concise image-generation prompt.
 * Each member has a personal emoji that becomes their cartoon character avatar
 * in the generated image — so Dad's fox, Mom's flower, and the kid's dragon
 * all appear in scenes from their day.
 *
 * SD 1.5 tuned: short prompts (<20 tokens) run faster and produce sharper
 * results than long descriptive ones. We keep it tight.
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

/**
 * Maps an emoji to a plain-English noun that SD 1.5 understands well.
 * SD was trained on English captions, not Unicode codepoints — describing the
 * character in words produces dramatically better results than embedding the
 * raw emoji glyph in the prompt.
 */
const EMOJI_TO_CHARACTER: Record<string, string> = {
  // Animals
  '🐶': 'cute dog', '🐱': 'cute cat', '🐭': 'cute mouse', '🐹': 'cute hamster',
  '🐰': 'cute bunny', '🦊': 'cute fox', '🐻': 'cute bear', '🐼': 'cute panda',
  '🐨': 'cute koala', '🐯': 'cute tiger', '🦁': 'cute lion', '🐮': 'cute cow',
  '🐷': 'cute pig', '🐸': 'cute frog', '🐵': 'cute monkey', '🐔': 'cute chicken',
  '🐧': 'cute penguin', '🐦': 'cute bird', '🦆': 'cute duck', '🦅': 'majestic eagle',
  '🦉': 'wise owl', '🦇': 'cute bat', '🐺': 'cute wolf', '🐗': 'cute boar',
  '🐴': 'cute horse', '🦄': 'magical unicorn', '🐝': 'cute bee', '🐛': 'cute worm',
  '🦋': 'cute butterfly', '🐌': 'cute snail', '🐞': 'cute ladybug', '🐜': 'cute ant',
  '🦗': 'cute cricket', '🕷': 'cute spider', '🐢': 'cute turtle', '🐍': 'cute snake',
  '🦎': 'cute lizard', '🦕': 'cute dinosaur', '🦖': 'cute T-rex', '🐊': 'cute crocodile',
  '🐉': 'cute dragon', '🐲': 'cute dragon',
  '🐳': 'cute whale', '🐬': 'cute dolphin', '🐟': 'cute fish', '🐠': 'cute tropical fish',
  '🦈': 'cute shark', '🐙': 'cute octopus', '🦑': 'cute squid', '🦞': 'cute lobster',
  '🦀': 'cute crab', '🐡': 'cute pufferfish',
  // Fantasy / fun
  '🧸': 'cute teddy bear', '🤖': 'cute robot', '👾': 'cute alien monster',
  '👻': 'cute ghost', '🎃': 'cute jack-o-lantern', '🧟': 'cute zombie',
  '🧙': 'cute wizard', '🧚': 'cute fairy', '🧜': 'cute mermaid', '🧛': 'cute vampire',
  // Nature / objects as characters
  '🌵': 'cute cactus character', '🌴': 'cute palm tree character',
  '🍄': 'cute mushroom character', '⭐': 'cute star character',
  '🌙': 'cute moon character', '☀️': 'cute sun character',
  '🌈': 'cute rainbow character', '❄️': 'cute snowflake character',
  // Food characters
  '🍕': 'cute pizza slice character', '🍔': 'cute burger character',
  '🌮': 'cute taco character', '🍦': 'cute ice cream character',
  '🎂': 'cute cake character', '🍩': 'cute donut character',
  // People / faces — fall back to plain cartoon character
  '🙂': 'cartoon character', '😀': 'happy cartoon character',
  '😎': 'cool cartoon character', '🤩': 'excited cartoon character',
  '🥳': 'party cartoon character', '🧑': 'cartoon person',
  '👦': 'cartoon boy', '👧': 'cartoon girl', '👨': 'cartoon man', '👩': 'cartoon woman',
};

function emojiToCharacter(emoji: string): string {
  return EMOJI_TO_CHARACTER[emoji] ?? 'cartoon character';
}

/**
 * Extracts up to `maxKeywords` meaningful words from the entry text.
 * Kept tight (4 words) so the total prompt stays under ~20 tokens for speed.
 */
function extractKeywords(text: string, maxKeywords: number = 4): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, maxKeywords);
}

/**
 * Builds a concise emoji-character image-gen prompt.
 *
 * Format: "{character} {action}, {style}, {mood_modifier}"
 * Example: "cute fox celebrating a promotion, cartoon 3D render, warm golden light"
 * Example: "cute dragon struggling with homework, cartoon 3D render, moody cool shadows"
 *
 * @param text        The raw Rose or Thorn entry text.
 * @param mood        'rose' or 'thorn'.
 * @param memberEmoji The member's chosen emoji avatar (e.g. '🦊').
 */
export function buildImagePrompt(text: string, mood: PromptMood, memberEmoji?: string): string {
  const character = emojiToCharacter(memberEmoji ?? '🙂');
  const keywords = extractKeywords(text);

  // Style is tight — SD 1.5 responds well to "cartoon 3D render" without extra descriptors
  const style = 'cartoon 3D render, vibrant colors';
  const moodModifier = mood === 'rose' ? 'warm golden light, cheerful' : 'cool blue light, dramatic';

  if (keywords.length === 0) {
    const action = mood === 'rose' ? 'celebrating joyfully' : 'looking frustrated';
    return `${character} ${action}, ${style}, ${moodModifier}`;
  }

  const scene = keywords.join(' ');
  const action = mood === 'rose' ? `celebrating ${scene}` : `struggling with ${scene}`;
  return `${character} ${action}, ${style}, ${moodModifier}`;
}
