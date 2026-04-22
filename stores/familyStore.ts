import { create } from 'zustand';
import { getDatabase } from '../db/migrations';

export interface Member {
  id: number;
  name: string;
  avatar_emoji: string;
}

export interface Family {
  id: number;
  name: string;
  theme_color: string;
}

interface FamilyState {
  family: Family | null;
  members: Member[];
  loaded: boolean;
  loadFamily: () => Promise<void>;
  createFamily: (name: string, themeColor?: string) => Promise<void>;
  addMember: (name: string, avatarEmoji?: string) => Promise<void>;
  removeMember: (id: number) => Promise<void>;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  family: null,
  members: [],
  loaded: false,

  async loadFamily() {
    const db = await getDatabase();
    const families = await db.getAllAsync<{ id: number; name: string; theme_color: string }>(
      'SELECT id, name, theme_color FROM family LIMIT 1'
    );
    if (families.length > 0) {
      const family = families[0];
      const members = await db.getAllAsync<Member>(
        'SELECT id, name, avatar_emoji FROM member WHERE family_id = ?',
        [family.id]
      );
      set({ family, members, loaded: true });
    } else {
      set({ family: null, members: [], loaded: true });
    }
  },

  async createFamily(name: string, themeColor = 'amber') {
    const db = await getDatabase();
    const now = Date.now();
    const result = await db.runAsync(
      'INSERT INTO family (name, created_at, theme_color) VALUES (?, ?, ?)',
      [name, now, themeColor]
    );
    const family = { id: result.lastInsertRowId, name, theme_color: themeColor };
    set({ family });
  },

  async addMember(name: string, avatarEmoji = '🙂') {
    const db = await getDatabase();
    const family = get().family;
    if (!family) return;
    const now = Date.now();
    const result = await db.runAsync(
      'INSERT INTO member (family_id, name, avatar_emoji, created_at) VALUES (?, ?, ?, ?)',
      [family.id, name, avatarEmoji, now]
    );
    const member: Member = { id: result.lastInsertRowId, name, avatar_emoji: avatarEmoji };
    set((state) => ({ members: [...state.members, member] }));
  },

  async removeMember(id: number) {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM member WHERE id = ?', [id]);
    set((state) => ({ members: state.members.filter((m) => m.id !== id) }));
  },
}));
