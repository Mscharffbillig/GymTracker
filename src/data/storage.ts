import AsyncStorage from '@react-native-async-storage/async-storage';
import { BodyMapStyle, ConsentState, Day, DraftWorkout, Exercise, ExerciseLog, Gender, Settings } from '../types';
import { BUILT_IN_EXERCISES } from './exerciseCatalog';

// Maps legacy index-based IDs (builtin-N) to stable name-based IDs
const BUILTIN_ID_MIGRATION: Record<string, string> = Object.fromEntries(
  BUILT_IN_EXERCISES.map((ex, i) => [`builtin-${i}`, ex.id])
);

function migrateExId(id: string): string {
  return BUILTIN_ID_MIGRATION[id] ?? id;
}

const KEYS = {
  days: '@gymtracker/days',
  customExercises: '@gymtracker/customExercises',
  logs: '@gymtracker/logs',
  settings: '@gymtracker/settings',
  draftWorkout: '@gymtracker/draftWorkout',
};

const DEFAULT_SETTINGS: Settings = {
  unit: 'lbs',
  theme: 'dark',
  gender: 'male',
  bodyMapStyle: 'heatmap',
  overloadEnabled: true,
  heatWarningThreshold: 7,
  heatCooldownPerDay: 2,
  bodyWeight: 0,
  analyticsEnabled: 'undecided',
  diagnosticsEnabled: 'undecided',
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function migrateConsentState(raw: unknown, fallback: ConsentState): ConsentState {
  if (raw === true || raw === 'allowed') return 'allowed';
  if (raw === false || raw === 'declined') return 'declined';
  if (raw === 'undecided') return 'undecided';
  return fallback;
}

export const storage = {
  loadDays: async (): Promise<Day[]> => {
    const raw = await readJson<Day[]>(KEYS.days, []);
    return raw.map((day) => ({
      ...day,
      exercises: day.exercises.map((de) => ({
        ...de,
        exerciseId: migrateExId(de.exerciseId),
        ...(de.alternativeExerciseId !== undefined && {
          alternativeExerciseId: migrateExId(de.alternativeExerciseId),
        }),
      })),
    }));
  },
  saveDays: (days: Day[]) => writeJson(KEYS.days, days),

  loadCustomExercises: () => readJson<Exercise[]>(KEYS.customExercises, []),
  saveCustomExercises: (exercises: Exercise[]) => writeJson(KEYS.customExercises, exercises),

  loadLogs: async (): Promise<ExerciseLog[]> => {
    const raw = await readJson<ExerciseLog[]>(KEYS.logs, []);
    return raw.map((log) => ({ ...log, exerciseId: migrateExId(log.exerciseId) }));
  },
  saveLogs: (logs: ExerciseLog[]) => writeJson(KEYS.logs, logs),

  loadSettings: async (): Promise<Settings> => {
    const saved = await readJson<Record<string, unknown>>(KEYS.settings, {});
    return {
      ...DEFAULT_SETTINGS,
      ...(saved as Partial<Settings>),
      // Migrate boolean → ConsentState for both fields
      analyticsEnabled: migrateConsentState(saved.analyticsEnabled, 'undecided'),
      diagnosticsEnabled: migrateConsentState(saved.diagnosticsEnabled, 'undecided'),
      // Migrate missing/invalid gender
      gender: (saved.gender === 'male' || saved.gender === 'female') ? saved.gender as Gender : 'male',
      // Migrate missing/invalid bodyMapStyle
      bodyMapStyle: (saved.bodyMapStyle === 'simple' || saved.bodyMapStyle === 'heatmap') ? saved.bodyMapStyle as BodyMapStyle : 'heatmap',
      // Ensure cooldown is a valid number
      heatCooldownPerDay: typeof saved.heatCooldownPerDay === 'number' && saved.heatCooldownPerDay > 0 ? saved.heatCooldownPerDay : 2,
    };
  },
  saveSettings: (settings: Settings) => writeJson(KEYS.settings, settings),

  loadDraftWorkout: async (): Promise<DraftWorkout | null> => {
    const raw = await readJson<DraftWorkout | null>(KEYS.draftWorkout, null);
    if (!raw) return null;
    return {
      ...raw,
      activeExerciseIds: Object.fromEntries(
        Object.entries(raw.activeExerciseIds).map(([k, v]) => [k, migrateExId(v)])
      ),
      extraExercises: raw.extraExercises.map((ee) => ({
        ...ee,
        exerciseId: migrateExId(ee.exerciseId),
      })),
    };
  },
  saveDraftWorkout: (draft: DraftWorkout) => writeJson(KEYS.draftWorkout, draft),
  clearDraftWorkout: () => AsyncStorage.removeItem(KEYS.draftWorkout),
};
