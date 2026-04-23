# Rose & Thorn

A React Native (Expo) app for the dinner table. One phone is passed around; family members share their daily **Rose** (highlight) and **Thorn** (lowlight). The app guides deeper reflection through curated prompts, then saves a family history that can be shared with new devices.

## What it does

- **Pass-and-play:** A single phone is passed around the table. The app prompts "Pass the phone to [Name]" between speakers.
- **Rose & Thorn ritual:** Each person types their highlight and lowlight of the day.
- **Deepening prompts:** After each Rose or Thorn, the app surfaces a follow-up question to encourage richer reflection.
- **Emoji character avatars:** Each member picks an emoji (🦊, 🐉, 🤖, …) that becomes their personal cartoon character in AI-generated artwork.
- **Generative artwork:** Every entry gets a procedural Skia illustration by default. With AI Images enabled, tapping ✨ generates a Stable Diffusion image featuring the member's emoji character in a scene from their day — all on-device, nothing sent to a server.
- **Session history:** Every session is saved locally and browsable by date.
- **Export:** Export your family's full history as JSON via the system share sheet.

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Expo (React Native) with TypeScript — dev client required |
| State | Zustand |
| Storage | expo-sqlite (offline-first SQLite) |
| Styling | NativeWind (Tailwind for React Native) + `lib/theme.ts` tokens |
| Navigation | Imperative screen router in `App.tsx` (intentional — keeps pass-prompt overlay simple) |
| Graphics | `@shopify/react-native-skia` — procedural generative art |
| AI images | `modules/expo-mediapipe-image-gen` — local Expo Module wrapping MediaPipe SD 1.5 (Android, opt-in) |
| Image storage | `expo-file-system` — file:// URIs; only URI + metadata stored in SQLite |

## Running the app

**This project uses a dev client, not Expo Go.** `@shopify/react-native-skia` and the local MediaPipe module require a custom native build.

```bash
npm install
npx expo prebuild --platform android   # regenerate android/ after pulling (gitignored, CNG)
npx expo run:android                   # build dev client and launch on connected device
node_modules/.bin/tsc --noEmit         # type check; must exit 0
```

For JS-only changes after the first build, start Metro and reload from the dev menu:

```bash
npx expo start --port 8081
# shake device → Reload
```

For Kotlin-only changes (fast path):

```bash
cd android && ./gradlew assembleDebug && cd ..
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Project structure

```
roseandthorn/
├── App.tsx                    # Imperative screen router + pass-and-play flow state
├── screens/
│   ├── HomeScreen.tsx         # Welcome / Begin Dinner
│   ├── SetupScreen.tsx        # Family name + member creation with emoji picker
│   ├── SessionStartScreen.tsx # Toggle who's at the table tonight
│   ├── RoseScreen.tsx         # Rose input + deepening prompt; fires procedural art gen
│   ├── ThornScreen.tsx        # Thorn input + deepening prompt; fires procedural art gen
│   ├── SummaryScreen.tsx      # Session recap + ✨ AI regenerate per entry + SQLite save
│   ├── HistoryScreen.tsx      # Scrollable list of past sessions with artwork thumbnails
│   └── SettingsScreen.tsx     # Members + emoji picker, AI Images toggle, export, reset
├── components/
│   ├── PassPrompt.tsx         # Full-screen "Pass the phone to [Name]" overlay
│   ├── DeepeningPrompt.tsx    # Follow-up question card with category badge
│   ├── EntryArtwork.tsx       # Renders artwork PNG; hosts ✨ Regenerate button
│   └── EmojiPicker.tsx        # Bottom-sheet modal; 50 curated emoji avatars
├── stores/
│   ├── familyStore.ts         # Zustand: family + members (SQLite-backed); updateMember()
│   ├── sessionStore.ts        # Zustand: active session flow (in-memory)
│   └── settingsStore.ts       # Zustand: AI Images toggle + model download state (SQLite-backed)
├── hooks/
│   └── useEntryImage.ts       # Orchestrates per-entry image generation + AI regeneration
├── db/
│   ├── schema.ts              # SQLite table definitions
│   └── migrations.ts          # getDatabase() singleton, resetDatabase(), PRAGMA user_version migrations
├── lib/
│   ├── prompts.ts             # Curated deepening prompt banks; non-repeating within a session
│   ├── theme.ts               # Warm amber/rose/emerald color tokens
│   ├── proceduralArt.ts       # Deterministic Skia generative art; seed from name + text + date
│   ├── imagePrompt.ts         # Emoji → SD 1.5 character prompt builder
│   └── imageGen.ts            # Thin dispatch interface: procedural | mediapipe backends
└── modules/
    └── expo-mediapipe-image-gen/   # Local Expo Module: MediaPipe SD 1.5 inference (Android)
```

## Key design decisions

- **No accounts or passwords.** Families are identified by a local name stored in SQLite.
- **Offline-first.** All data lives on-device. No network required (except optional model download for AI images).
- **Imperative router.** The `useState`-based screen router in `App.tsx` is intentional. It keeps the `PassPrompt` overlay logic simple. Do not refactor to a declarative React Navigation stack.
- **Rose → Thorn entry lifecycle.** `RoseScreen` calls `addEntry()` to create a partial `SessionEntry`. `ThornScreen` calls `updateLastEntry()` to fill in the thorn fields on the same entry. This coupling must be preserved if screen order changes.
- **Emoji characters in AI prompts.** Each member's `avatar_emoji` is mapped to a plain-English character description that SD 1.5 understands (e.g. `🦊` → `"cute fox"`). Raw emoji glyphs are not embedded in the prompt — the model was trained on English captions, not Unicode codepoints.
- **`lib/imageGen.ts` is the only entry point** for image generation. Callers never invoke procedural or MediaPipe backends directly.
- **NativeWind className LSP errors** on React Native elements are false positives. `tsc --noEmit` is the source of truth.

## Roadmap

See [PLAN.md](./PLAN.md) for the full development plan and versioned roadmap (v1.1 through v2.0).
