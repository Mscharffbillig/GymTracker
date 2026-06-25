@AGENTS.md

# GymTracker — Project Context for Future Sessions

A local-only Android gym workout tracker built with Expo/React Native. No
backend, no accounts — everything persists in `AsyncStorage` on-device. Built
for the user (Mike) and tested by sideloading release APKs onto his and his
buddy's phones.

**Repo:** https://github.com/Mscharffbillig/GymTracker.git (`main` branch)
**Local path:** `C:\Coding\GetGainz\GymTracker`

## Tech stack

- Expo SDK 56, React Native 0.85.3, React 19.2.3, TypeScript
- `@react-navigation` (bottom-tabs + native-stack) — 4 tabs: Program, Progress,
  Body, Settings
- `@react-native-async-storage/async-storage` for all persistence
- `react-native-svg` for the custom progress chart
- `react-native-body-highlighter` for the anatomical Muscle Map (front/back
  SVG body figure with tappable, colorable regions)
- No backend, no auth, no network calls anywhere in the app

## How to build & run (things that bit us before)

- **Native android/ios folders are gitignored** (`/android`, `/ios`) — they're
  regenerated via `npx expo prebuild` / `npx expo run:android`, not checked in.
- `index.ts` **must** start with `import 'react-native-gesture-handler';`
  before anything else. Missing this silently kills ALL touch input on
  Android with no error — cost a lot of debugging time once already. Don't
  remove it.
- Dev workflow: boot the `Pixel_9_Pro` AVD (already created in Android
  Studio), then `npx expo run:android --device Pixel_9_Pro`. If port 8081 is
  already taken by a stray leftover `node` process from a previous session,
  kill it first (`Get-NetTCPConnection -LocalPort 8081 ... | Stop-Process`) —
  `expo run:android` silently skips starting Metro if the port's busy and the
  app won't load any JS.
- **Never run plain `npx expo start --android`** (or `--ios`) when a physical
  device is also plugged in — it defaults to opening **Expo Go** on whichever
  device it picks, which can install Expo Go onto the user's actual phone
  unprompted (happened once; user asked to leave the stray Expo Go install
  alone rather than auto-uninstall it). Always target the emulator explicitly
  with `--device Pixel_9_Pro` or run a plain `npx expo start` (no platform
  flag) and let the already-installed dev client connect itself.
- Release build: `cd android && ./gradlew assembleRelease` →
  `android/app/build/outputs/apk/release/app-release.apk`. Release is signed
  with the debug keystore (fine for personal sideloading, not for Play
  Store). Install via `adb install -r <path>` once a phone is connected
  (`adb devices` to check first — the user's phone connects/disconnects
  between sessions).
- Screenshots via `adb shell screencap` then `adb pull` (don't redirect
  `screencap` stdout directly through PowerShell — it corrupts the PNG via
  UTF-16 mangling). Resize large screenshots before reading them back — this
  conversation has hit the multi-image context limit (max ~2000px dimension)
  more than once.
- `npx tsc --noEmit` before every test pass — keeps the type system honest
  across the many cross-file contracts described below.

## Architecture

```
App.tsx                        — providers (GestureHandlerRootView > SafeAreaProvider > AppDataProvider), loading splash, StatusBar
src/
  types.ts                     — all shared types (see Data model below)
  theme.ts                     — light/dark color palettes, spacing, radius, font styles
  utils/
    id.ts                      — generateId() (timestamp+random, no uuid dep)
    duration.ts                — formatDuration/toSeconds/splitSeconds for mm:ss handling
  data/
    storage.ts                 — thin AsyncStorage read/write wrapper, one key per collection, merges saved Settings with defaults so new fields don't break old data
    exerciseCatalog.ts         — BUILT_IN_EXERCISES (~63 entries), CATEGORY_LABELS, CATEGORY_TO_MUSCLE_GROUPS, MUSCLE_GROUP_LABELS
    overload.ts                 — getProgressSuggestion(): the progressive-overload engine (weight AND duration AND bodyweight-reps variants)
    muscleMap.ts                — getAllMuscleGroupStatuses(): recency/program-coverage status per MuscleGroup
    bodySlugMap.ts              — maps our MuscleGroup enum to react-native-body-highlighter's Slug enum, builds the `data` prop for <Body>, colorblind-safe palette
  context/
    AppDataContext.tsx          — single context holding all app state + every mutator; this is the only place that touches AsyncStorage
  navigation/
    types.ts                    — ProgramStackParamList / ProgressStackParamList / BodyStackParamList / SettingsStackParamList / RootTabParamList
    RootNavigator.tsx            — bottom tabs, each wrapping its own native-stack
  components/                   — Button, ScreenContainer (SafeAreaView wrapper), EmptyState, PromptModal (single text field), TargetModal (sets+reps OR rounds+duration), WeightChart (generic line chart, used for both weight and duration progress)
  screens/
    DaysListScreen, DayDetailScreen, ExercisePickerScreen, WorkoutSessionScreen, ExerciseHistoryScreen   — Program tab
    WorkoutLogScreen                                                                                      — Progress tab (global session log)
    BodyMapScreen                                                                                         — Body tab
    SettingsScreen                                                                                        — Settings tab
```

## Data model (`src/types.ts`)

- `Exercise { id, name, category, muscleGroup, trackingType, isCustom }`
  - `category`: chest/back/shoulders/legs/arms/core/cardio/other — drives the
    picker filter chips and the legacy weight-increment "isLowerBody" check.
  - `muscleGroup`: granular anatomical tag (chestUpper/chestLower/lats/traps/
    lowerBack/delts/biceps/triceps/core/glutes/quads/hamstrings/calves) or
    `null` for cardio/other. Drives the Muscle Map. **Independent of
    `category`** — deliberately dual-tagged so the picker's broad filters and
    the anatomical map can evolve separately.
  - `trackingType`: `'reps' | 'time'`. Time-based exercises (cardio, planks)
    log rounds+duration instead of sets+reps+weight.
- `DayExercise { id, exerciseId, targetSets, targetReps, targetDurationSeconds }`
  — both rep and duration target fields always present; whichever is unused
  for that exercise's trackingType just sits at 0.
- `SetLog { reps, weight, durationSeconds }` — same "all fields always
  present" pattern.
- `ExerciseLog { id, exerciseId, dayId, date, targetReps, targetDurationSeconds, sets[] }`
  — one per exercise per session; `saveWorkoutLog` only keeps entries where at
  least one set has real data.
- `Settings { unit, theme, freshDays, recentDays }` — `freshDays`/`recentDays`
  are the user-customizable Muscle Map recency thresholds (Settings screen has
  chip pickers for both).

## Key business logic

**Progressive overload** (`data/overload.ts`, `getProgressSuggestion`):
looks at the most recent log for an exercise and gates entirely on whether
the **final set** met the target (not just "every set" — a buddy-feedback fix,
since the last set is the real fatigue test). If the final set fell short, it
suggests repeating the same weight/duration and says so explicitly. If met:
weight increment is `topWeight * (5% legs / 2.5% everything else)`, rounded to
a real plate size (5lb/2.5kg), with a 1.5x bonus if the final set beat target
by 3+ reps. Bodyweight exercises (topWeight === 0) get a rep-count suggestion
instead of a weight suggestion. Time-based exercises get an analogous
duration suggestion (10% increment, floor 5s).

**Muscle Map** (`data/muscleMap.ts` + `data/bodySlugMap.ts` +
`screens/BodyMapScreen.tsx`): for each of the 13 tracked `MuscleGroup`s,
computes days-since-last-trained → `'fresh' | 'recent' | 'stale' | 'none'`
using the user's configurable thresholds, plus which program exercises target
it and a weight-progress label. `bodySlugMap.ts` then maps each MuscleGroup to
one or more `react-native-body-highlighter` slugs (e.g. `core` → both `abs`
and `obliques`; `chestUpper`+`chestLower` both → `chest`) and picks a color.
Two display modes, toggled on-screen:
  - **Completed** (default): colored by actual training recency, using the
    Okabe-Ito colorblind-safe palette (`#0072B2` fresh → `#56B4E9` recent →
    `#E69F00` stale) — deliberately hue-shifted, not just opacity, so it reads
    for all common color-vision deficiencies.
  - **Projected**: colored violet (`#9B5DE5`) if ANY exercise in the user's
    program targets that muscle, regardless of training history — answers
    "what will this routine never hit" independent of whether they've done it
    yet.
Tapping a body region opens a modal with per-muscle-group detail (handles the
many-to-one chest case by showing both Upper/Lower Chest breakdowns).

## Feature changelog (chronological, oldest first)

1. Initial build: Days → exercises → sets/reps/weight logging, AsyncStorage
   persistence, basic progressive overload (flat +5/+10), light theme only,
   single-stack nav.
2. Dark mode (now default) + light/dark toggle, bottom tabs (Program/
   Progress/Settings), global Workout Log screen, per-exercise progress
   chart, fixed a keyboard-covers-input bug and a chip-text-clipping bug.
3. Added a 4th "Body" tab — initially a hand-rolled SVG humanoid (crude
   rounded rectangles), recency-colored, with a "muscle growth" visual scale
   effect tied to weight progression.
4. User asked for more anatomical detail (upper/lower pecs, lats, delts,
   bicep/tricep, glutes/quads/hamstrings/calves, etc.) — added the
   `muscleGroup` field to `Exercise`, retagged the whole catalog, redesigned
   the hand-rolled SVG with 13 distinct regions.
5. User asked for a *realistic* body, not crude shapes — swapped the
   hand-rolled SVG for `react-native-body-highlighter` (real anatomical
   artwork). **This dropped the "muscles visually grow" scaling effect** (the
   library only supports per-region color, not per-region transforms) — the
   weight-progress text in the tap modal is the replacement.
6. Added time-based exercise tracking (`trackingType`), a Cardio category,
   ~7 cardio exercises + Plank/Side Plank retagged, rounds+duration UI in
   TargetModal and WorkoutSessionScreen, duration-aware history/chart/log
   formatting, duration-based progressive overload.
7. Committed and pushed to the new GitHub repo for the first time.
8. Buddy-test feedback round (latest): exercise reordering within a day,
   delete-entry capability in both history screens, colorblind-safe Muscle
   Map palette (replaced opacity-of-one-hue with the Okabe-Ito hue
   progression), customizable fresh/recent day thresholds in Settings,
   Projected-vs-Completed Muscle Map toggle, and the final-set-aware
   percentage-based overload rewrite described above.

## Where things stand right now

- Code is committed and pushed (`main`, commit `917bc9b` as of this writing).
- A release APK reflecting everything above has been built and is ready at
  `android/app/build/outputs/apk/release/app-release.apk` — **but the user's
  phone was disconnected the last time we checked**, so the freshest APK has
  not yet been confirmed installed. Before doing anything else in a new
  session, run `adb devices` and offer to install if it's connected.
- No automated tests exist — verification has always been manual via the
  `Pixel_9_Pro` emulator (screenshots + `uiautomator dump` for exact tap
  coordinates) plus a final adb install onto the real phone.

## Open ideas not yet built

- The "muscles visually grow with weight" effect was explicitly dropped when
  switching to `react-native-body-highlighter` (see changelog #5). If this is
  ever revisited, it'd need either a library that supports per-region
  transforms, or layering custom scaled overlays on top of the library's SVG.
- Nothing else is currently pending — the last session closed out every item
  from the most recent feedback round.
