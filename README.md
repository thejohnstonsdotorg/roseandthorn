# Rose & Thorn

A React Native (Expo) app for the dinner table. One phone is passed around; family members share their daily **Rose** (highlight) and **Thorn** (lowlight). The app guides deeper reflection through curated prompts, then saves a family history that can be shared with new devices.

## What it does

- **Pass-and-play:** A single phone is passed around the table. The app prompts "Pass the phone to [Name]" between speakers.
- **Rose & Thorn ritual:** Each person types their highlight and lowlight of the day.
- **Deepening prompts:** After each Rose or Thorn, the app surfaces a follow-up question (appreciation, generosity, or curiosity) to encourage richer reflection.
- **Session history:** Every session is saved locally and browsable by date.
- **Export/import:** Export your family's full history as JSON via the system share sheet to seed a new phone.

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Expo (React Native) with TypeScript |
| State | Zustand |
| Storage | expo-sqlite (offline-first SQLite) |
| Styling | NativeWind (Tailwind for React Native) |
| Navigation | Imperative screen router in `App.tsx` (intentional — keeps pass-prompt overlay simple) |

## Running the app

```bash
cd roseandthorn
npm install
npx expo start
```

Then scan the QR code with **Expo Go** on your phone. Physical device testing is important — the pass-around UX can't be validated on a simulator.

## Project structure

```
roseandthorn/
├── App.tsx               # Imperative screen router + pass-and-play flow state
├── screens/              # 8 screens covering the full ritual flow
│   ├── HomeScreen.tsx    # Welcome / Begin Dinner; shows Create Family CTA if no family
│   ├── SetupScreen.tsx   # Family name + member creation (first launch)
│   ├── SessionStartScreen.tsx  # Toggle who's at the table tonight
│   ├── RoseScreen.tsx    # Rose input + deepening prompt
│   ├── ThornScreen.tsx   # Thorn input + deepening prompt
│   ├── SummaryScreen.tsx # Session recap + closing word + SQLite save
│   ├── HistoryScreen.tsx # Scrollable list of past sessions
│   └── SettingsScreen.tsx  # Add/remove members, export, reset
├── components/
│   ├── PassPrompt.tsx    # Full-screen "Pass the phone to [Name]" overlay
│   └── DeepeningPrompt.tsx  # Follow-up question card with category badge
├── stores/
│   ├── familyStore.ts    # Zustand: family + members (SQLite-backed)
│   └── sessionStore.ts   # Zustand: active session flow (in-memory)
├── db/
│   ├── schema.ts         # SQLite table definitions
│   └── migrations.ts     # getDatabase() singleton + resetDatabase()
└── lib/
    ├── prompts.ts        # Curated deepening prompt banks; non-repeating within a session
    └── theme.ts          # Warm amber/rose/emerald color tokens
```

## Key design decisions

- **No accounts or passwords.** Families are identified by a local name stored in SQLite.
- **Offline-first.** All data lives on-device. No network required.
- **Zero-friction export.** Plain JSON via system share sheet — no encryption, no passphrase.
- **Imperative router.** The `useState`-based screen router in `App.tsx` is intentional. It keeps the `PassPrompt` overlay logic simple. Do not refactor to a declarative React Navigation stack.
- **Rose → Thorn entry lifecycle.** `RoseScreen` calls `addEntry()` to create a partial `SessionEntry`. `ThornScreen` calls `updateLastEntry()` to fill in the thorn fields on the same entry. This coupling must be preserved if screen order changes.
- **NativeWind className LSP errors** on React Native elements are false positives. `tsc --noEmit` is the source of truth.

## Roadmap

See [PLAN.md](./PLAN.md) for the full development plan and versioned roadmap (v1.1 through v2.0).
