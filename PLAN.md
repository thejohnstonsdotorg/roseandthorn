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

## Phase 4: Public Store Listing Readiness

Target: first public Android listing on Google Play. iOS/App Store can follow after the Android listing is live and the release process is proven.

### Current release posture
- [x] Android package name set: `com.kencjohnston.roseandthorn`
- [x] EAS project configured in `app.json`
- [x] Production build profile emits Android App Bundle (`.aab`)
- [x] Production build disables Cloud AI with `EXPO_PUBLIC_ENABLE_CLOUD_AI=false`
- [x] Release signing plugin present for EAS-managed Android credentials
- [x] Privacy policy exists at `docs/privacy.html`
- [x] App requests no runtime permissions in `app.json`
- [x] Repeatable store-readiness checks automated via `npm run store:check`
- [x] CI runs `npm run store:check` on pull requests and `master` pushes
- [x] Tagged releases run strict store-readiness checks before EAS Build/Submit
- [x] Public privacy policy URL hosted over HTTPS and reachable from the Play Console
- [ ] Production release candidate installed and smoke-tested from a Play internal test track
- [x] Store listing assets generated locally and validated by strict preflight
- [ ] Store listing assets uploaded to Play Console
- [ ] Google Play Data Safety form completed and consistent with the production build
- [ ] Public release promoted from internal/closed testing after review

### Automated Release Gates
- [x] `scripts/bump-version.mjs` keeps `package.json` and `app.json` versions in sync.
- [x] `scripts/check-store-readiness.mjs` validates repeatable release metadata: package name, version sync, permissions, production EAS config, Cloud AI production flag, privacy policy content, listing metadata, icon dimensions, feature graphic, and screenshot count/dimensions.
- [x] `npm run store:check` is non-strict for normal CI: launch assets that are not ready yet are reported as warnings so regular development is not blocked.
- [x] `npm run store:check:strict` fails on missing launch assets and is used by the tag-triggered release workflow.
- [x] `npm run release:preflight` runs typecheck plus strict store-readiness checks before manually starting a release.
- [x] `.github/workflows/ci.yml` runs typecheck and store-readiness checks on PRs and `master` pushes.
- [x] `.github/workflows/pages.yml` publishes `docs/` to GitHub Pages when docs change, after the one-time Pages setting is enabled.
- [x] `.github/workflows/release.yml` typechecks, runs strict store-readiness checks, builds the production AAB, and submits it to the Play internal testing track on semver tags.
- [x] Store listing copy is captured in `docs/store-assets/listing.json` so description/privacy URL drift is reviewable and checked.
- [x] Screenshot capture is partially automated by `npm run store:capture-screenshots`; screen navigation remains manual because it is a real-device visual QA step.

### One-Time Owner Actions
- [x] Enable GitHub Pages source: Repo → Settings → Pages → Source: GitHub Actions.
- [x] Create or verify Google Play developer account.
- [x] Create the Play Console app record.
- [x] Configure EAS/Play service account credentials for `eas submit`.
- [x] Create the first production signing credentials in EAS, if they do not already exist.
- [x] Add required GitHub Actions secret: `EXPO_TOKEN`.
- [ ] Add internal testers in Play Console.
- [ ] Complete Play Console forms that cannot be fully automated: App access, Ads, Content rating, Target audience, Data Safety, and policy declarations.
- [ ] Upload the first feature graphic and screenshot set to Play Console.

### Store Listing Assets
- [x] App name: `Rose & Thorn`
- [x] Short description (<= 80 chars): `A warm family dinner ritual for sharing daily highs and lows.`
- [x] Store copy lives in `docs/store-assets/listing.json` and is validated by `npm run store:check`.
- [x] Play listing icon: export `docs/store-assets/icon.png` as 512 x 512 PNG from `assets/icon.png` and verify it is readable at small sizes.
- [x] Feature graphic: create 1024 x 500 PNG/JPG with warm dinner-table visual language and no device frame requirement.
- [x] Draft phone screenshots generated with `npm run store:generate-screenshots` for listing setup and preflight.
- [ ] Replace draft phone screenshots with real-device screenshots from Pixel 10 Pro using `npm run store:capture-screenshots` before final production promotion.
- [ ] Screenshot set should cover: welcome/setup, session start, Rose entry, Thorn/deepening prompt, summary artwork, history, settings/privacy controls.
- [ ] Optional tablet screenshots: only if tablet layout has been checked; otherwise keep Android phone-first.

### Compliance & Policy
- [x] Host `docs/privacy.html` on a stable HTTPS URL: `https://thejohnstonsdotorg.github.io/roseandthorn/privacy.html`.
- [x] Update privacy policy dates before submission.
- [ ] Verify policy text matches the production build: Cloud AI is disabled in v1.0; on-device MediaPipe model download is opt-in; export leaves the device only by user action.
- [ ] Complete Play Console Data Safety as: no developer-collected/shared data, no ads, no analytics, no location, no account creation, user-initiated export only.
- [ ] Note local user-generated content exists on-device only: family/member names, Rose/Thorn text, prompts, artwork files, settings.
- [ ] Select content rating accurately. Current policy says Everyone 13+; verify the Play questionnaire outcome and update policy/listing if Google assigns a different rating.
- [ ] Declare no ads.
- [ ] Confirm target audience is families/general audience, not specifically children under 13, unless the app is prepared for the full Families policy requirements.
- [ ] Confirm the 1.9 GB optional model download is clearly disclosed in Settings and store copy so users are not surprised.

### Release Candidate Checklist
- [ ] Decide the first public version number and release code. Keep `version` aligned between `package.json` and `app.json`; EAS remote versioning handles Android versionCode.
- [ ] Run `npm install` from a clean checkout.
- [ ] Run `node_modules/.bin/tsc --noEmit` and fix all real type errors.
- [ ] Run `npm run store:check:strict` and fix all failures before tagging a release.
- [ ] Run `npx expo prebuild --platform android` to verify native project generation.
- [ ] Build a production AAB with `npm run build:android`.
- [ ] Submit to Play internal track with `npm run submit:android` or upload the `.aab` manually.
- [ ] Install through Play internal testing, not just `adb install`, to validate signing, installability, package metadata, and Play delivery.
- [ ] Smoke-test on Pixel 10 Pro: first launch, setup in < 60s, 4-person session in < 10m, summary save, history detail, settings add/remove member, emoji picker, export, reset all data.
- [ ] Test offline behavior: complete a session without internet; procedural artwork must work.
- [ ] Test opt-in on-device AI path separately: model download, cancellation/retry, generation, reset data clears toggle/files as expected.
- [ ] Confirm Cloud AI UI is absent in the production build.
- [ ] Confirm no unexpected Android permissions appear in the generated manifest or Play Console app bundle explorer.
- [ ] Confirm app startup, navigation, and text entry work with large font settings.
- [ ] Confirm app does not crash after force quit/relaunch with existing local data.

### Play Console Steps
- [x] Create or verify Google Play developer account.
- [x] Create app: default language, app name, app/game = app, free/paid = free for v1.0.
- [ ] Complete App access: no special access required.
- [ ] Complete Ads: no ads.
- [ ] Complete Content rating questionnaire.
- [ ] Complete Target audience and content questionnaire.
- [ ] Complete Data Safety with answers matching the privacy policy and production build.
- [ ] Add privacy policy URL.
- [ ] Add store listing copy and graphics.
- [ ] Create internal test release and add testers.
- [ ] Resolve all Play Console warnings or policy blocks.
- [ ] Promote to closed/open testing if required by the account's Play testing policy, then promote to production when eligible.

### Recommended Scope Before Public Listing
- [ ] Keep v1.0 Android-only and offline-first.
- [ ] Keep Cloud AI disabled for production until the privacy policy, Data Safety form, BYO-key UX, and external data transfer disclosures are updated.
- [ ] Do not block public listing on future v1.1-v2 roadmap items unless internal testing shows a launch-blocking issue.
- [ ] Treat these as launch blockers only: data loss, session persistence failure, reset/export failure, crashes, misleading privacy disclosures, unexpected permissions, impossible model download recovery, or Play policy rejection.

---

## Phase 5: Future Iterations & Roadmap

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
