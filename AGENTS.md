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

## Roadmap and what to work on next

All planned features, deferred work, and versioned milestones (v1.1 through v2.0) live in [PLAN.md](./PLAN.md). That file is the single source of truth for the roadmap. Do not duplicate roadmap content here — update PLAN.md instead.

## Running and verifying

```bash
npm install
npx expo start        # scan with Expo Go on a physical device
node_modules/.bin/tsc --noEmit   # type check; must exit 0
```

Physical device testing is required — the pass-around UX cannot be validated in a simulator.

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
| `stores/familyStore.ts` | Zustand store; SQLite-backed family and member CRUD |
| `stores/sessionStore.ts` | Zustand store; in-memory session flow state |
| `db/schema.ts` | SQLite table definitions (family, member, session, rose, thorn) |
| `db/migrations.ts` | `getDatabase()` singleton and `resetDatabase()` |
| `lib/prompts.ts` | Curated prompt banks; `getRandomPrompt` avoids repeats within a session |
| `lib/theme.ts` | Warm amber/rose/emerald color tokens |
