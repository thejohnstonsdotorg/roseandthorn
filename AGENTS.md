# Agent Instructions — Rose & Thorn

This file provides guidance for AI agents working on this codebase.

## Project overview

Rose & Thorn is an Expo (React Native) app for a family dinner ritual. A single phone is passed around the table; each person enters a Rose (highlight) and Thorn (lowlight) for their day, with follow-up deepening prompts. All data is stored locally in SQLite. See [README.md](./README.md) for setup and [PLAN.md](./PLAN.md) for the full development plan and roadmap.

## Architecture

- **Screen router:** `App.tsx` uses a `useState` string union and a `renderScreen()` switch — NOT React Navigation declarative stacks. Do not refactor to `<Stack.Navigator>`. The imperative approach is intentional because it keeps the `PassPrompt` full-screen overlay simple.
- **State:** Two Zustand stores — `familyStore` (SQLite-backed family/member CRUD) and `sessionStore` (in-memory session flow). Do not introduce additional state libraries.
- **Database:** `db/migrations.ts` exports a `getDatabase()` singleton. All SQLite access goes through this function. Schema is in `db/schema.ts`.
- **Styling:** NativeWind (`className` props) alongside inline `style` props using tokens from `lib/theme.ts`. LSP may show "No overload matches" errors on `className` — these are false positives. Use `tsc --noEmit` as the source of truth for type correctness.

## Critical invariants

- **Rose → Thorn lifecycle:** `RoseScreen` calls `sessionStore.addEntry()` to create a partial entry (rose fields only). `ThornScreen` calls `sessionStore.updateLastEntry()` to populate thorn fields on that same entry. If screen order ever changes, this coupling must be preserved.
- **`familyStore.loadFamily()`** must always set `family: null, members: []` when no family exists in SQLite. Do not add an early return that skips the `set()` call — this would leave stale state after "Reset All Data".
- **`resetDatabase()`** drops and recreates all tables in the same SQLite connection. The `db` singleton does not need to be cleared.
- **Generative imagery is procedural-first.** `lib/proceduralArt.ts` runs synchronously (<100ms) and is always the default path. The MediaPipe AI backend (`modules/expo-mediapipe-image-gen/`) is opt-in via Settings and must never block screen transitions.
- **Image files live in `expo-file-system`**, not SQLite. Only the file:// URI and metadata (seed, source, prompt) are stored in the `rose`/`thorn` tables. Naming: `{rose|thorn}-{sessionId}-{memberId}-{source}.png`.
- **`lib/imageGen.ts` interface is the only entry point** for image generation. Callers never call procedural or MediaPipe backends directly. This keeps the AI backend swappable when LiteRT-LM eventually ships image generation.
- **DB migrations use `PRAGMA user_version`** to version the schema. `resetDatabase()` still drops and recreates; migrations only run on existing databases that predate a schema version. Never bypass the migration layer.

## Roadmap and what to work on next

All planned features, deferred work, and versioned milestones (v1.1 through v2.0) live in [PLAN.md](./PLAN.md). That file is the single source of truth for the roadmap. Do not duplicate roadmap content here — update PLAN.md instead.

## Running and verifying

**This project uses a dev client, not Expo Go.** `@shopify/react-native-skia` and local Expo Modules require a custom native build.

```bash
npm install
npx expo prebuild --platform android   # regenerate android/ after pulling (gitignored, CNG)
npx expo run:android                   # build dev client and launch on connected Pixel 9
node_modules/.bin/tsc --noEmit         # type check; must exit 0
```

- `android/` and `ios/` are gitignored (Expo CNG). Regenerate with `npx expo prebuild` after pulling.
- After adding or updating native deps (Skia, Expo Modules), a full `expo run:android` rebuild is required — JS-only reload is not enough.
- Physical device testing on Pixel 9+ is required — the pass-around UX cannot be validated in a simulator.

## File map

| File | Purpose |
|------|---------|
| `App.tsx` | Screen router + pass-and-play flow state |
| `screens/HomeScreen.tsx` | Welcome screen; conditionally shows "Create Family" CTA |
| `screens/SetupScreen.tsx` | First-launch family + member creation |
| `screens/SessionStartScreen.tsx` | Toggle who is present tonight |
| `screens/RoseScreen.tsx` | Rose input + deepening prompt; calls `addEntry()` |
| `screens/ThornScreen.tsx` | Thorn input + deepening prompt; calls `updateLastEntry()` |
| `screens/SummaryScreen.tsx` | Session recap, closing word, persists session to SQLite |
| `screens/HistoryScreen.tsx` | Scrollable list of past sessions |
| `screens/SettingsScreen.tsx` | Add/remove members, JSON export, reset all data |
| `components/PassPrompt.tsx` | Full-screen "Pass the phone to [Name]" overlay |
| `components/DeepeningPrompt.tsx` | Follow-up question card with category badge |
| `components/EntryArtwork.tsx` | Renders procedural Skia canvas or AI-generated image; hosts ✨ Regenerate button |
| `stores/familyStore.ts` | Zustand store; SQLite-backed family and member CRUD |
| `stores/sessionStore.ts` | Zustand store; in-memory session flow state |
| `db/schema.ts` | SQLite table definitions (family, member, session, rose, thorn) |
| `db/migrations.ts` | `getDatabase()` singleton, `resetDatabase()`, and `PRAGMA user_version` migration layer |
| `lib/prompts.ts` | Curated prompt banks; `getRandomPrompt` avoids repeats within a session |
| `lib/theme.ts` | Warm amber/rose/emerald color tokens |
| `lib/proceduralArt.ts` | Deterministic Skia-based generative art; seeds from member name + text + date |
| `lib/imagePrompt.ts` | Converts Rose/Thorn text to a concise image-gen prompt string |
| `lib/imageGen.ts` | Thin interface for image generation; dispatches to procedural or MediaPipe backend |
| `modules/expo-mediapipe-image-gen/` | Local Expo Module wrapping MediaPipe Image Generator (opt-in AI backend) |
