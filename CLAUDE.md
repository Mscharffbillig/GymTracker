@AGENTS.md

# GymTracker — Project Context for Future Sessions

A local-only Android gym workout tracker built with Expo/React Native. No
accounts — all workout data persists in `AsyncStorage` on-device. Built for
personal use; currently sideloaded onto Mike's phone and his buddy's phone.
Targeting Google Play open beta.

**Repo:** https://github.com/Mscharffbillig/GymTracker.git (`main` branch)
**Local path:** `C:\Coding\GetGainz\GymTracker`
**Backend:** `C:\Coding\GetGainz\onlysets-backend` (Cloudflare Worker — no git repo yet)

## Tech stack

- Expo SDK 56, React Native 0.85.3, React 19.2.3, TypeScript
- `@react-navigation` (bottom-tabs + native-stack) — **5 tabs**: Program,
  Progress, Body, Profile, Settings
- `@react-native-async-storage/async-storage` for all persistence
- `react-native-svg` for the custom progress chart
- `react-native-body-highlighter` for the anatomical Muscle Map
- `@sentry/react-native` ^8.19.0 — crash reporting (consent-gated)
- Anonymous analytics + feedback → Cloudflare Worker at
  `onlysets-backend.mscharffbillig.workers.dev`

## How to build & run

- **Native android/ios folders are gitignored** — regenerated via
  `npx expo prebuild` / `npx expo run:android`.
- `index.ts` **must** start with `import 'react-native-gesture-handler';`
  before anything else. Missing this silently kills ALL touch input on Android.
- Dev: boot `Pixel_9_Pro` AVD, then `npx expo run:android --device Pixel_9_Pro`.
  Kill stray Metro on port 8081 first if needed:
  `Get-NetTCPConnection -LocalPort 8081 | ... | Stop-Process`
- **Never run plain `npx expo start --android`** with a physical device plugged
  in — it may install Expo Go on the user's phone unprompted.
- **Release APK build:**
  ```
  npx expo prebuild --platform android
  cd android && ./gradlew assembleRelease --no-daemon
  ```
  APK → `android/app/build/outputs/apk/release/app-release.apk`
- **Release AAB build** (required for Play Store):
  ```
  npx expo prebuild --platform android
  cd android && ./gradlew bundleRelease --no-daemon
  ```
  AAB → `android/app/build/outputs/bundle/release/app-release.aab`
- `SENTRY_AUTH_TOKEN` is set permanently in Windows User env vars. Sentry
  source maps upload automatically on every release build — no extra flags needed.
  The old `SENTRY_DISABLE_AUTO_UPLOAD=true` env var has been removed.
- If Android Studio has the android folder locked, use `prebuild` without
  `--clean`. Use `--clean` only when a full native reset is needed (and close
  Studio first).
- Release is signed with the debug keystore (fine for sideloading; a proper
  release keystore is needed before Play Store submission).
- Sentry source map upload: `uploadSourceMaps: true` in app.json. Auth token
  in system env as `SENTRY_AUTH_TOKEN`.
- Screenshots via `adb shell screencap` then `adb pull` (don't redirect stdout
  through PowerShell — it corrupts the PNG via UTF-16 mangling).
- `npx tsc --noEmit` before every release pass.

## Architecture

```
App.tsx                        — providers + Sentry.init (consent-gated via beforeSend/beforeBreadcrumb)
src/
  types.ts                     — all shared types (see Data model below)
  theme.ts                     — light/dark palettes, spacing, radius, font styles
  diagnostics.ts               — setDiagnosticsConsent() / isDiagnosticsConsented() for Sentry gate
  utils/
    id.ts                      — generateId()
    duration.ts                — formatDuration/toSeconds/splitSeconds
  data/
    storage.ts                 — AsyncStorage wrapper; loadSettings() merges saved with defaults so new fields don't break old installs
    exerciseCatalog.ts         — BUILT_IN_EXERCISES (~63 entries), CATEGORY_LABELS, MUSCLE_GROUP_LABELS
    overload.ts                — getProgressSuggestion(): progressive overload engine
    muscleMap.ts               — getAllMuscleGroupStatuses(): point-decay heat system per MuscleGroup
    bodySlugMap.ts             — MuscleGroup → react-native-body-highlighter Slug mapping; heat palette; simple/heatmap modes
  context/
    AppDataContext.tsx         — single context; only place that touches AsyncStorage
  navigation/
    types.ts                   — ProgramStackParamList / ProgressStackParamList / BodyStackParamList / ProfileStackParamList / SettingsStackParamList / RootTabParamList
    RootNavigator.tsx          — 5-tab bottom navigator
  components/                  — Button, ScreenContainer, EmptyState, PromptModal, TargetModal, WeightChart, ConsentModal
  screens/
    DaysListScreen, DayDetailScreen, ExercisePickerScreen, WorkoutSessionScreen, ExerciseHistoryScreen  — Program tab
    WorkoutLogScreen                                                                                     — Progress tab
    BodyMapScreen                                                                                        — Body tab (Muscle Map)
    ProfileScreen, StatsScreen                                                                           — Profile tab
    SettingsScreen, FeedbackScreen                                                                       — Settings tab
  analytics/
    AnalyticsService.ts        — batched event queue, consent-gated, posts to Cloudflare Worker
    events.ts                  — typed event helpers (trackAppOpened, trackWorkoutCompleted, etc.)
    types.ts                   — AnalyticsEvent type
```

## Data model (`src/types.ts`)

- `Settings`:
  ```typescript
  {
    unit: 'lbs' | 'kg'
    theme: 'dark' | 'light'
    gender: 'male' | 'female'           // drives Body figure in BodyMapScreen
    bodyMapStyle: 'simple' | 'heatmap'  // simple = binary worked/not; heatmap = point gradient
    overloadEnabled: boolean
    heatWarningThreshold: number        // heat pts at which muscle shows overwork warning (default 7)
    heatCooldownPerDay: number          // pts lost per 24h (default 2)
    bodyWeight: number                  // stored on device only, never transmitted
    analyticsEnabled: 'undecided' | 'allowed' | 'declined'
    diagnosticsEnabled: 'undecided' | 'allowed' | 'declined'
  }
  ```
- `DraftWorkout` — auto-saved to AsyncStorage on every state change; includes
  `completedCards?: string[]` and `collapsedCards?: string[]` for card state persistence across session resume.
- `Exercise { id, name, category, muscleGroup, secondaryMuscleGroups?, trackingType, isCustom, isBodyweight? }`
- `ExerciseLog { id, exerciseId, dayId, date, targetReps, targetDurationSeconds, sets[] }`

## Key business logic

**Progressive overload** (`data/overload.ts`): gates on whether the **final set**
met target. Weight increment = topWeight × (5% legs / 2.5% other), rounded to
plate size, with 1.5× bonus if final set beat target by 3+ reps. Bodyweight
→ rep suggestion. Time-based → 10% duration increment (floor 5s).

**Muscle Map heat system** (`data/muscleMap.ts` + `data/bodySlugMap.ts`):
- PRIMARY_HEAT = 3 pts per session, SECONDARY_HEAT = 1 pt
- Each hit decays: `max(0, pts - daysAgo × heatCooldownPerDay)`
- No time-window cutoff — decay to zero naturally
- `buildHighlighterData` respects `bodyMapStyle`: simple = binary blue/none;
  heatmap = 5-level yellow→red gradient
- `heatWarningThreshold` triggers overwork warning in modal

**All-done prompt** (`WorkoutSessionScreen`): `useEffect` fires when every
exercise ID is in `completedCards` or `skippedExercises`; shows Alert with
Keep Going / Add Exercise / Finish Routine. Re-arms when exercise count changes.

**Workout → Routine rename**: all user-visible "Workout" strings are "Routine";
internal variable names (`draftWorkout`, etc.) unchanged.

## Navigation (5 tabs)

```
RootTabParamList:
  ProgramTab   → ProgramStack   (DaysList → DayDetail → ExercisePicker → WorkoutSession → ExerciseHistory)
  ProgressTab  → ProgressStack  (WorkoutLog → ExerciseHistory → LogEdit)
  BodyTab      → BodyStack      (BodyMap)
  ProfileTab   → ProfileStack   (Profile → Stats)
  SettingsTab  → SettingsStack  (Settings → Feedback)
```

## Backend (`onlysets-backend` — Cloudflare Worker)

Deployed at `https://onlysets-backend.mscharffbillig.workers.dev`

- `POST /v1/analytics/events` — batched anonymous usage events
- `POST /v1/feedback` — user feedback; stored in D1, emails `mscharffbillig@gmail.com` via Resend
- `GET /v1/health` — DB liveness check
- D1 database: `onlysets-prod` (id: `e4df2ace-99db-4802-9d3a-ded2a9fd268e`)
- Secrets: `RESEND_API_KEY` (set via wrangler secret put)
- Deploy: `cd onlysets-backend && npx wrangler deploy`
- View feedback: Cloudflare D1 dashboard → `SELECT * FROM feedback ORDER BY created_at DESC;`

## Privacy constraints (hard rules — never violate)

- No workout data, exercise names, weights, reps, notes, body weight, or any
  user-entered free text is ever transmitted off-device.
- Analytics and crash reporting are consent-gated; default is 'undecided' (off).
- Sentry `beforeSend` returns null if diagnostics consent not granted.
- No API keys, credentials, or secrets embedded in the mobile app.

## Android adaptive icon

Foreground: `./OnlySetsAppIconv2.png` — content at 64% of canvas (inside the
66.7% safe zone). `backgroundColor: "#0D0D0D"`. If the icon is ever replaced,
use the PowerShell+System.Drawing padding script (see memory: feedback_android_icon).

## Pre-launch checklist (pending)

- [ ] Change package name from `com.anonymous.GymTracker` (breaks existing
      installs / AsyncStorage data — do last, coordinated with testers)
- [ ] Generate proper release keystore (currently using debug keystore)
- [ ] AAB build confirmed for Play Store submission
- [ ] Privacy policy hosted at public URL
- [ ] Play Console account + store listing assets
