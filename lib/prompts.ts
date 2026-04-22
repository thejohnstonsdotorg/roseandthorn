export interface Prompt {
  category: 'appreciation' | 'generosity' | 'curiosity';
  text: string;
}

export const rosePrompts: Prompt[] = [
  { category: 'appreciation', text: 'What about that moment are you most grateful for?' },
  { category: 'generosity', text: 'Did someone else help make that happen? Tell us about them.' },
  { category: 'curiosity', text: 'What did you learn about yourself in that moment?' },
  { category: 'appreciation', text: 'If you could relive that moment, what would you notice more?' },
  { category: 'generosity', text: 'Who would love to hear about this rose?' },
  { category: 'curiosity', text: 'How did that moment change the rest of your day?' },
];

export const thornPrompts: Prompt[] = [
  { category: 'generosity', text: 'Is there a kinder way to look at that moment?' },
  { category: 'curiosity', text: 'What might you try differently tomorrow?' },
  { category: 'appreciation', text: 'Even in that thorn, was there a small hidden rose?' },
  { category: 'generosity', text: 'What would you say to a friend who had this same thorn?' },
  { category: 'curiosity', text: 'What did this thorn teach you?' },
  { category: 'appreciation', text: 'What strength did you discover in yourself because of this?' },
];

export function getRandomPrompt(prompts: Prompt[], usedTexts: Set<string>): Prompt {
  const unused = prompts.filter((p) => !usedTexts.has(p.text));
  const pool = unused.length > 0 ? unused : prompts;
  return pool[Math.floor(Math.random() * pool.length)];
}
