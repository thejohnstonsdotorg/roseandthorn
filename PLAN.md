# Family Rose & Thorn App — Development Plan

## Overview
A React Native (Expo) mobile app designed for the dinner table. One phone is passed around; family members share their daily Roses (highlights) and Thorns (lowlights). The app guides deeper reflection through prompts for appreciation, generosity, and curiosity, then saves a family history that can be shared with new devices.

---

## Phase 1: Ideation & Experience Design

### Core Ritual Flow
1. **Gather** — Family sits down. App opens to a warm, inviting screen. A "Begin Dinner" button starts the session.
2. **Pass** — The phone is passed to the first person.
3. **Rose** — Person records their Rose. After typing it, the app surfaces 1-2 deepening prompts:
   - *Appreciation:* "What about that moment are you most grateful for?"
   - *Generosity:* "Did someone else help make that happen?"
   - *Curiosity:* "What did you learn about yourself?"
4. **Thorn** — Person records their Thorn. Deepening prompts:
   - *Generosity:* "Is there a kinder way to look at that moment?"
   - *Curiosity:* "What might you try differently tomorrow?"
   - *Appreciation:* "Even in that thorn, was there a small hidden rose?"
5. **Next** — Phone passes to the next family member. App shows who is speaking and who is next.
6. **Close** — After everyone shares, a summary screen celebrates the session with a group reflection prompt: "What's one word to describe our family's day?"

### Key Interaction Patterns
- **Single-device, pass-and-play:** Large tap targets, minimal typing.
- **No accounts/passwords:** Families are identified by a local "Family Name" and a color/theme.
- **Offline-first:** All data stored locally in SQLite; no internet required.
- **History & onboarding new devices:** Export family history as a plain JSON file that another phone can import to seed its local DB (zero friction, no passphrase).

### Aesthetic Direction
- Warm, candlelit color palette (amber, soft rose, deep green).
- Rounded, friendly typography.
- Gentle haptic feedback on transitions (v1.1).
- No ads, no monetization distractions.

---

## Phase 2: Technical Architecture

### Stack
| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Expo (React Native) | Fastest path to iOS/Android, excellent dev experience, easy QR previews |
| Navigation | Imperative screen router (`useState` in `App.tsx`) | Keeps pass-prompt overlay logic simple; no declarative stack needed for MVP |
| State | Zustand | Lightweight, no boilerplate, works offline |
| Storage | `expo-sqlite` | Native SQLite, zero-config in Expo, handles relational data well |
| Styling | NativeWind (Tailwind for RN) | Rapid UI development, consistent design system |
| Haptics | `expo-haptics` | Subtle physical feedback enhances the ritual feel (v1.1) |

### Data Model (SQLite)
```
Family
  id, name, created_at, theme_color

Member
  id, family_id, name, avatar_emoji, created_at

Session
  id, family_id, date, closing_word, created_at

Rose
  id, session_id, member_id, content, deepening_prompt, deepening_answer, created_at

Thorn
  id, session_id, member_id, content, deepening_prompt, deepening_answer, created_at
```

### Sync Strategy
- **v1 (current):** Export family database as a plain JSON payload via system Share sheet. New phone imports to seed its local DB. Zero friction: no encryption, no passphrase.
- **v1.2:** QR code export with camera-based import on a second phone.
- **Future v2:** Local network sync via Bonjour/mDNS for true multi-device live sessions.

---

## Phase 3: Scaffold Implementation ✅

### Completed
- [x] Bootstrap Expo project with TypeScript template
- [x] Install dependencies: `expo-sqlite`, `expo-haptics`, `expo-sharing`, `expo-barcode-scanner`, `zustand`, `nativewind`, `lucide-react-native`
- [x] Create directory structure and all core files
- [x] 8 screens: Home, Setup, SessionStart, Rose, Thorn, Summary, History, Settings
- [x] `PassPrompt` component (full-screen phone-handoff overlay)
- [x] `DeepeningPrompt` component (follow-up question with category badge)
- [x] SQLite schema + `getDatabase()` singleton + `resetDatabase()`
- [x] `familyStore` (Zustand + SQLite-backed CRUD for family and members)
- [x] `sessionStore` (Zustand in-memory session flow state)
- [x] Prompt banks (`rosePrompts`, `thornPrompts`) with non-repeating selection within a session
- [x] Warm amber/rose/emerald theme tokens
- [x] NativeWind + Babel config (manually added — `blank-typescript` template does not include `babel.config.js`)
- [x] Initialize git and push to `thejohnstonsdotorg/roseandthorn`

### Bug fixes (post-scaffold)
- [x] Remove unused React Navigation imports from `App.tsx` (dead code from earlier approach)
- [x] Add missing Add Member UI to `SettingsScreen` (state/handler existed but were never rendered)
- [x] Fix `familyStore.loadFamily()` to explicitly reset `family`/`members` to `null`/`[]` when no family exists — previously left stale state after "Reset All Data"

### Implementation notes
- **Imperative router is intentional.** `App.tsx` uses a `useState` string union (`'home' | 'setup' | ...`) and a `renderScreen()` switch. Do not refactor to `<Stack.Navigator>` — it would complicate the `PassPrompt` overlay logic.
- **Rose → Thorn entry lifecycle split:** `RoseScreen` calls `addEntry()` (partial entry, rose fields only). `ThornScreen` calls `updateLastEntry()` to fill in thorn fields on the same entry. This coupling must be preserved if screen order changes.
- **NativeWind className LSP errors** on React Native elements are false positives — the LSP doesn't pick up NativeWind's type augmentations. `tsc --noEmit` is clean and is the source of truth.
- **Physical device testing is critical.** The pass-around UX cannot be validated on a simulator. Use `npx expo start` + Expo Go.

---

## Phase 4: Future Iterations & Roadmap

### v1.1 — Polish & Delight
- [ ] Animated transitions between speakers (gentle page curl or fade)
- [ ] Haptic "pass" heartbeat when handing the phone to the next person
- [ ] Streak counter: "You've shared 5 nights in a row!"
- [ ] Voice-to-text input (`expo-speech` or native module)
- [ ] Photo attachment per Rose/Thorn (small thumbnail, stored locally)

### v1.2 — Multi-Device Join
- [ ] QR code export with larger data capacity (chunked QRs)
- [ ] Import via camera on second phone (`expo-barcode-scanner` already installed)
- [ ] Conflict resolution: simple "last-write-wins" for session data

### v1.3 — Richer Reflections
- [ ] Weekly summary view: "This week your family had 12 Roses and 4 Thorns"
- [ ] Mood trend chart (simple line graph over time)
- [ ] Custom family prompts: let users add their own deepening questions
- [ ] "Gratitude jar": collect small appreciations between dinner sessions

### v2.0 — Connected Family
- [ ] Optional end-to-end encrypted cloud backup (no accounts, just a family key)
- [ ] Remote family members: join a session via link/video call integration
- [ ] Kids mode: larger buttons, picture-based emotion picker, shorter prompts
- [ ] Theming engine: seasonal palettes, holiday-specific skins

---

## Confirmed Decisions
1. **Voice Input:** Text input only for MVP. Voice-to-text deferred to v1.1.
2. **Export Security:** Zero friction — plain JSON export, no encryption or passphrase.
3. **Photo Attachments:** Deferred to v1.1.
4. **GitHub Repo:** `thejohnstonsdotorg/roseandthorn` (note: org is `thejohnstonsdotorg`, not `johnstonsdotorg`).

---

## MVP Success Criteria
- [ ] A family can create their group in < 60 seconds.
- [ ] A full Rose + Thorn session for 4 people takes < 10 minutes.
- [ ] Deepening prompts feel meaningful, not robotic (varied, warm tone).
- [ ] History is browsable by date.
- [ ] Export/import works between two phones.
