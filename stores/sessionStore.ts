import { create } from 'zustand';

export interface SessionEntry {
  memberId: number;
  memberName: string;
  memberEmoji: string;
  rose: string;
  rosePrompt: string;
  roseAnswer: string;
  thorn: string;
  thornPrompt: string;
  thornAnswer: string;
}

interface SessionState {
  presentMembers: { id: number; name: string; avatar_emoji: string }[];
  currentIndex: number;
  entries: SessionEntry[];
  closingWord: string;
  usedRosePrompts: Set<string>;
  usedThornPrompts: Set<string>;
  setPresentMembers: (members: { id: number; name: string; avatar_emoji: string }[]) => void;
  addEntry: (entry: SessionEntry) => void;
  updateLastEntry: (partial: Partial<SessionEntry>) => void;
  nextMember: () => void;
  setClosingWord: (word: string) => void;
  resetSession: () => void;
  markRosePromptUsed: (text: string) => void;
  markThornPromptUsed: (text: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  presentMembers: [],
  currentIndex: 0,
  entries: [],
  closingWord: '',
  usedRosePrompts: new Set<string>(),
  usedThornPrompts: new Set<string>(),

  setPresentMembers: (members) =>
    set({ presentMembers: members, currentIndex: 0, entries: [], usedRosePrompts: new Set(), usedThornPrompts: new Set() }),

  addEntry: (entry) => set((state) => ({ entries: [...state.entries, entry] })),

  updateLastEntry: (partial) =>
    set((state) => {
      const entries = [...state.entries];
      if (entries.length > 0) {
        entries[entries.length - 1] = { ...entries[entries.length - 1], ...partial };
      }
      return { entries };
    }),

  nextMember: () => set((state) => ({ currentIndex: state.currentIndex + 1 })),

  setClosingWord: (word) => set({ closingWord: word }),

  resetSession: () =>
    set({
      presentMembers: [],
      currentIndex: 0,
      entries: [],
      closingWord: '',
      usedRosePrompts: new Set(),
      usedThornPrompts: new Set(),
    }),

  markRosePromptUsed: (text) =>
    set((state) => {
      const next = new Set(state.usedRosePrompts);
      next.add(text);
      return { usedRosePrompts: next };
    }),

  markThornPromptUsed: (text) =>
    set((state) => {
      const next = new Set(state.usedThornPrompts);
      next.add(text);
      return { usedThornPrompts: next };
    }),
}));
