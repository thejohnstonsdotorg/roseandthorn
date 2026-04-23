# Agent Instructions — Rose & Thorn

This file provides guidance for AI agents working on this codebase.

## Project overview

Rose & Thorn is an Expo (React Native) app for a family dinner ritual. A single phone is passed around the table; each person enters a Rose (highlight) and Thorn (lowlight) for their day, with follow-up deepening prompts. All data is stored locally in SQLite. See [README.md](./README.md) for setup and [PLAN.md](./PLAN.md) for the full development plan and roadmap.

## Architecture

- **Screen router:** `App.tsx` uses a `useState` string union and a `renderScreen()` switch — NOT React Navigation declarative stacks. Do not refactor to `<Stack.Navigator>`. The imperative approach is intentional because it keeps the `PassPrompt` full-screen overlay simple.
- **State:** Three Zustand stores — `familyStore` (SQLite-backed family/member CRUD), `sessionStore` (in-memory session flow), and `settingsStore` (SQLite-backed AI Images toggle + model download state). Do not introduce additional state libraries.
- **Database:** `db/migrations.ts` exports a `getDatabase()` singleton. All SQLite access goes through this function. Schema is in `db/schema.ts`.
- **Styling:** NativeWind (`className` props) alongside inline `style` props using tokens from `lib/theme.ts`. LSP may show "No overload matches" errors on `className` — these are false positives. Use `tsc --noEmit` as the source of truth for type correctness.

## Critical invariants

- **Rose → Thorn lifecycle:** `RoseScreen` calls `sessionStore.addEntry()` to create a partial entry (rose fields only). `ThornScreen` calls `sessionStore.updateLastEntry()` to populate thorn fields on that same entry. If screen order ever changes, this coupling must be preserved.
- **`familyStore.loadFamily()`** must always set `family: null, members: []` when no family exists in SQLite. Do not add an early return that skips the `set()` call — this would leave stale state after "Reset All Data".
- **`resetDatabase()`** drops and recreates all tables in the same SQLite connection. The `db` singleton does not need to be cleared.
- **Generative imagery is procedural-first.** `lib/proceduralArt.ts` runs synchronously (<100ms) and is always the default path. The MediaPipe AI backend (`modules/expo-mediapipe-image-gen/`) is opt-in via Settings and must never block screen transitions.
- **Image files live in `expo-file-system`**, not SQLite. Only the file:// URI and metadata (seed, source, prompt) are stored in the `rose`/`thorn` tables. Naming: `{rose|thorn}-{sessionId}-{memberId}-{source}.png`.
- **`lib/imageGen.ts` interface is the only entry point** for image generation. Callers never call procedural or MediaPipe backends directly. This keeps the AI backend swappable when LiteRT-LM eventually ships image generation.
- **Emoji character avatars drive AI prompts.** Each member's `avatar_emoji` is mapped to a plain-English SD 1.5 character description in `lib/imagePrompt.ts` (e.g. `🦊` → `"cute fox"`). Raw emoji glyphs must never be embedded directly in prompts — the model was trained on English captions, not Unicode codepoints. The full mapping table lives in `imagePrompt.ts:EMOJI_TO_CHARACTER`.
- **`ImageGenerator` is a module-level singleton** in `ExpoMediaPipeImageGenModule.kt`. It is created once on first generation and reused across calls. Never call `createFromOptions()` per-request — it loads ~1.9 GB of weights and adds 3–8 s of latency. The singleton is invalidated only when `modelDir()` path changes.
- **DB migrations use `PRAGMA user_version`** to version the schema. `resetDatabase()` still drops and recreates; migrations only run on existing databases that predate a schema version. Never bypass the migration layer.

## Roadmap and what to work on next

All planned features, deferred work, and versioned milestones (v1.1 through v2.0) live in [PLAN.md](./PLAN.md). That file is the single source of truth for the roadmap. Do not duplicate roadmap content here — update PLAN.md instead.

## Running and verifying

**This project uses a dev client, not Expo Go.** `@shopify/react-native-skia` and local Expo Modules require a custom native build.

```bash
npm install
npx expo prebuild --platform android   # regenerate android/ after pulling (gitignored, CNG)
npx expo run:android                   # build dev client and launch on connected Pixel 10 Pro
node_modules/.bin/tsc --noEmit         # type check; must exit 0
```

- `android/` and `ios/` are gitignored (Expo CNG). Regenerate with `npx expo prebuild` after pulling.
- After adding or updating native deps (Skia, Expo Modules), a full `expo run:android` rebuild is required — JS-only reload is not enough.
- Physical device testing on Pixel 10 Pro (`adb devices` serial `57150DLCH001ZQ`) is required — the pass-around UX cannot be validated in a simulator.

## Device development workflow

### When to use each build path

| Change type | What to run |
|-------------|-------------|
| JS/TS only (screens, stores, hooks, lib) | Start Metro (`npx expo start`), shake device → Reload |
| Native module Kotlin/Java changed | `./android/gradlew assembleDebug` then `adb install -r` (see below) |
| New native dep added or `expo-module.config.json` changed | `npx expo prebuild --platform android` then full `npx expo run:android` |
| `app.json` plugins changed | `npx expo prebuild --platform android` then full `npx expo run:android` |

### Fast native rebuild (preferred for Kotlin-only changes)

Avoids the full Metro/Expo overhead — builds the APK directly and installs it:

```bash
# Build
cd android && ./gradlew assembleDebug && cd ..

# Install and launch (device must be connected via USB with ADB debugging on)
adb -s 57150DLCH001ZQ install -r android/app/build/outputs/apk/debug/app-debug.apk
adb -s 57150DLCH001ZQ reverse tcp:8081 tcp:8081
adb -s 57150DLCH001ZQ shell am start -n com.kencjohnston.roseandthorn/.MainActivity
```

Then start Metro separately if not already running:
```bash
npx expo start --port 8081
```

### Full clean reset (when the device is in an unknown state)

Use this when: the app shows a black screen, JS errors on launch, or you suspect stale native code is installed.

```bash
# 1. Uninstall the app from the device (also clears internal filesDir)
adb -s 57150DLCH001ZQ uninstall com.kencjohnston.roseandthorn

# 2. Prebuild to regenerate android/ with current config plugins
npx expo prebuild --platform android

# 3. Full build and install
cd android && ./gradlew assembleDebug && cd ..
adb -s 57150DLCH001ZQ install android/app/build/outputs/apk/debug/app-debug.apk
adb -s 57150DLCH001ZQ reverse tcp:8081 tcp:8081
adb -s 57150DLCH001ZQ shell am start -n com.kencjohnston.roseandthorn/.MainActivity

# 4. Start Metro if not running
npx expo start --port 8081
```

### Confirming the device has the latest build

```bash
# Check install timestamp — compare against your last build time
adb -s 57150DLCH001ZQ shell dumpsys package com.kencjohnston.roseandthorn | grep lastUpdateTime

# Read live JS logs to confirm the app reloaded from Metro
adb -s 57150DLCH001ZQ logcat "*:S" ReactNativeJS:V
```

### MediaPipe AI model persistence

The 1.9 GB SD 1.5 model is stored in the app's **external files directory** (`getExternalFilesDir(null)/mediapipe_sd15_model/`). This directory **survives APK reinstalls** — the model does not need to be re-downloaded after a `adb install -r` or `expo run:android`.

The model is **wiped only** by:
- `adb uninstall com.kencjohnston.roseandthorn` (full uninstall)
- Settings → Reset All Data (which also disables the AI toggle in SQLite)
- Manually clearing app storage in Android Settings

If the user has already downloaded the model and the toggle is re-enabled, `startModelDownload()` in `settingsStore.ts` checks `isModelDownloaded()` first and skips the download if the files are present.

### Reading device logs

```bash
# JS errors and console.log output
adb -s 57150DLCH001ZQ logcat "*:S" ReactNativeJS:V

# Native crash buffer
adb -s 57150DLCH001ZQ logcat -b crash

# MediaPipe/GPU logs during generation
adb -s 57150DLCH001ZQ logcat "*:S" ReactNativeJS:V ImageGenerator:V
```

## File map

| File | Purpose |
|------|---------|
| `App.tsx` | Screen router + pass-and-play flow state |
| `screens/HomeScreen.tsx` | Welcome screen; conditionally shows "Create Family" CTA |
| `screens/SetupScreen.tsx` | First-launch family + member creation with emoji picker |
| `screens/SessionStartScreen.tsx` | Toggle who is present tonight |
| `screens/RoseScreen.tsx` | Rose input + deepening prompt; calls `addEntry()` |
| `screens/ThornScreen.tsx` | Thorn input + deepening prompt; calls `updateLastEntry()` |
| `screens/SummaryScreen.tsx` | Session recap, closing word, persists session to SQLite |
| `screens/HistoryScreen.tsx` | Scrollable list of past sessions |
| `screens/SettingsScreen.tsx` | Add/remove members, emoji picker per member, AI Images toggle, JSON export, reset all data |
| `components/PassPrompt.tsx` | Full-screen "Pass the phone to [Name]" overlay |
| `components/DeepeningPrompt.tsx` | Follow-up question card with category badge |
| `components/EntryArtwork.tsx` | Renders procedural Skia canvas or AI-generated image; hosts ✨ Regenerate button |
| `components/EmojiPicker.tsx` | Bottom-sheet modal with 50 curated emoji avatars; used in Setup and Settings |
| `stores/familyStore.ts` | Zustand store; SQLite-backed family and member CRUD; `updateMember()` persists emoji changes |
| `stores/sessionStore.ts` | Zustand store; in-memory session flow state |
| `db/schema.ts` | SQLite table definitions (family, member, session, rose, thorn) |
| `db/migrations.ts` | `getDatabase()` singleton, `resetDatabase()`, and `PRAGMA user_version` migration layer |
| `lib/prompts.ts` | Curated prompt banks; `getRandomPrompt` avoids repeats within a session |
| `lib/theme.ts` | Warm amber/rose/emerald color tokens |
| `lib/proceduralArt.ts` | Deterministic Skia-based generative art; seeds from member name + text + date |
| `lib/imagePrompt.ts` | Converts Rose/Thorn text + `avatar_emoji` to a character-centric SD 1.5 prompt; `EMOJI_TO_CHARACTER` mapping table |
| `lib/imageGen.ts` | Thin interface for image generation; dispatches to procedural or MediaPipe backend |
| `modules/expo-mediapipe-image-gen/` | Local Expo Module wrapping MediaPipe Image Generator (opt-in AI backend) |
| `stores/settingsStore.ts` | Zustand store; AI Images toggle, model download state, SQLite-backed settings |
| `hooks/useEntryImage.ts` | Orchestrates per-entry image generation; MediaPipe availability check; ✨ regenerate action |
| `plugins/withProtobufJava.js` | Expo config plugin; substitutes `protobuf-java` for `protobuf-javalite` globally so MediaPipe's `Any$Builder.build()` resolves at runtime |
