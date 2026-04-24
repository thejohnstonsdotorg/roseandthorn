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
| Framework | Expo (React Native) + dev client | Fastest path to iOS/Android; Skia + local modules require `expo prebuild` (left Expo Go for v1.4) |
| Navigation | Imperative screen router (`useState` in `App.tsx`) | Keeps pass-prompt overlay logic simple; no declarative stack needed for MVP |
| State | Zustand | Lightweight, no boilerplate, works offline |
| Storage | `expo-sqlite` | Native SQLite, zero-config in Expo, handles relational data well |
| Styling | NativeWind (Tailwind for RN) | Rapid UI development, consistent design system |
| Haptics | `expo-haptics` | Subtle physical feedback enhances the ritual feel (v1.1) |
| Graphics | `@shopify/react-native-skia` | Procedural generative art (v1.4); deterministic Skia canvas for entry artwork |
| Image storage | `expo-file-system` | PNG blobs for generated images; only file:// URI stored in SQLite (v1.4) |
| Image display | `expo-image` | Cached, efficient image rendering for artwork in History/Summary (v1.4) |
| AI image gen | `modules/expo-mediapipe-image-gen` | Custom local Expo Module wrapping MediaPipe SD 1.5; opt-in Android only (v1.4) |

### Data Model (SQLite)
```
Family
  id, name, created_at, theme_color

Member
  id, family_id, name, avatar_emoji, created_at

Session
  id, family_id, date, closing_word, created_at

Rose
  id, session_id, member_id, content, deepening_prompt, deepening_answer, created_at,
  image_uri, image_seed, image_source, image_prompt

Thorn
  id, session_id, member_id, content, deepening_prompt, deepening_answer, created_at,
  image_uri, image_seed, image_source, image_prompt

app_settings
  key, value
```

### Sync Strategy
- **v1 (current):** Export family database as a plain JSON payload via system Share sheet. New phone imports to seed its local DB. Zero friction: no encryption, no passphrase.
- **v1.2:** QR code export with camera-based import on a second phone.
- **Future v2:** Local network sync via Bonjour/mDNS for true multi-device live sessions.

---

## Phase 3: Scaffold Implementation ✅

### Completed
- [x] Bootstrap Expo project with TypeScript template
- [x] Install dependencies: `expo-sqlite`, `expo-haptics`, `expo-sharing`, `zustand`, `nativewind`, `lucide-react-native`
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
- **Physical device testing is critical.** The pass-around UX cannot be validated on a simulator. Since v1.4, requires dev client via `npx expo run:android` (Expo Go no longer works — Skia requires a native build).

---

## Phase 4: Future Iterations & Roadmap

### v1.1 — Polish & Delight
- [ ] Animated transitions between speakers (gentle page curl or fade)
- [ ] Haptic "pass" heartbeat when handing the phone to the next person
- [ ] Streak counter: "You've shared 5 nights in a row!"
- [ ] Voice-to-text input (`expo-speech` or native module)
- [ ] ~~Photo attachment per Rose/Thorn~~ → superseded by v1.4 Generative Imagery (AI-generated or procedural art per entry)

### v1.2 — Multi-Device Join
- [ ] QR code export with larger data capacity (chunked QRs)
- [ ] Import via camera on second phone (`expo-camera`)
- [ ] Conflict resolution: simple "last-write-wins" for session data

### v1.3 — Richer Reflections
- [ ] Weekly summary view: "This week your family had 12 Roses and 4 Thorns"
- [ ] Mood trend chart (simple line graph over time)
- [ ] Custom family prompts: let users add their own deepening questions
- [ ] "Gratitude jar": collect small appreciations between dinner sessions

### v1.4 — Generative Imagery
- [x] `lib/proceduralArt.ts` — deterministic Skia-based art per entry; palette biased by mood (rose: amber/warm, thorn: emerald/cool); seed from member name + text + date
- [x] `lib/imagePrompt.ts` — converts Rose/Thorn text + member emoji to an emoji-character image-gen prompt; emoji mapped to plain-English SD 1.5 character description (e.g. 🦊 → "cute fox celebrating…")
- [x] `lib/imageGen.ts` — thin interface for image generation; dispatches to procedural or MediaPipe backend; swappable for future LiteRT-LM backend
- [x] `components/EntryArtwork.tsx` — renders procedural art PNG; "✨ Regenerate with AI" button if MediaPipe available; spinner stays visible during generation (fixed visibility bug)
- [x] `components/EmojiPicker.tsx` — bottom-sheet modal with 50 curated emoji avatars for member character selection
- [x] DB migration layer (`PRAGMA user_version`) + image columns on `rose` and `thorn` tables (`image_uri`, `image_seed`, `image_source`, `image_prompt`) + `app_settings` table
- [x] `modules/expo-mediapipe-image-gen/` — local Expo Module (Kotlin + TS bridge); SD 1.5 inference via MediaPipe; model download with resume support; `ImageGenerator` singleton (eliminates 3–8 s cold-load per call); JPEG 85 encoding (faster than PNG 100)
- [x] Settings → "AI Images" toggle: off by default, explicit consent with 1.9 GB download warning
- [x] `SummaryScreen` — display entry artwork alongside text; ✨ regenerate button per entry
- [x] `HistoryScreen` — thumbnail artwork per session entry
- [x] `hooks/useEntryImage.ts` — orchestrates image generation and AI regeneration per entry; `memberEmoji` threaded through to prompt builder
- [x] `stores/settingsStore.ts` — SQLite-backed settings store for AI Images preference
- [x] `familyStore.updateMember()` — persists `avatar_emoji` changes to SQLite
- [x] SetupScreen emoji picker — each member chooses their character during family creation; auto-assigned distinct default emoji
- [x] SettingsScreen emoji picker — tap member's emoji badge to reassign character at any time
- [x] MediaPipe model download fully implemented (SD 1.5 EMA bins hosted on GitHub Releases)
- [x] Generation speed optimizations: singleton generator, 6 iterations (down from 20), JPEG 85 encoding, short ~15-token prompts
- [ ] 6-month image purge policy (v1.4.1)
- [ ] Export images in JSON export (v1.4.1)

### v2.0 — Connected Family
- [ ] Optional end-to-end encrypted cloud backup (no accounts, just a family key)
- [ ] Remote family members: join a session via link/video call integration
- [ ] Kids mode: larger buttons, picture-based emotion picker, shorter prompts
- [ ] Theming engine: seasonal palettes, holiday-specific skins

---

## Confirmed Decisions
1. **Voice Input:** Text input only for MVP. Voice-to-text deferred to v1.1.
2. **Export Security:** Zero friction — plain JSON export, no encryption or passphrase.
3. **Photo Attachments:** Deferred to v1.1; now superseded by v1.4 Generative Imagery.
4. **GitHub Repo:** `thejohnstonsdotorg/roseandthorn` (note: org is `thejohnstonsdotorg`, not `johnstonsdotorg`).
5. **Generative Imagery:** Procedural Skia art default + opt-in AI backends. The app is offline-first by default and remains fully usable with no network. There are now three image generation paths behind `lib/imageGen.ts`: (1) **Procedural** — always on, <100 ms, no download; (2) **MediaPipe on-device** — opt-in, SD 1.5, ~3–8 s, strictly offline, 1.9 GB download; (3) **Cloud** — opt-in, FLUX.1 schnell via family's own BYO API key (fal.ai / Fireworks / Together AI / Replicate / WaveSpeed), <2 s on home Wi-Fi. Cloud was added in v1.5 to address MediaPipe's latency on Pixel 10 Pro. When LiteRT-LM ships a first-party image generation model, add it as another backend without schema or UI changes.
6. **Emoji character avatars:** Each member's `avatar_emoji` drives the AI image subject (e.g. 🦊 → "cute fox celebrating…"). The emoji→character mapping lives in `lib/imagePrompt.ts`. SD 1.5 responds better to plain-English character descriptions than raw emoji glyphs. Prompts are intentionally kept to ~15 tokens for speed.

---

## MVP Success Criteria
- [ ] A family can create their group in < 60 seconds.
- [ ] A full Rose + Thorn session for 4 people takes < 10 minutes.
- [ ] Deepening prompts feel meaningful, not robotic (varied, warm tone).
- [ ] History is browsable by date.
- [ ] Export/import works between two phones.
