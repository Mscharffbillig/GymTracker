import AsyncStorage from '@react-native-async-storage/async-storage';
import { Day, DraftWorkout, Exercise, ExerciseLog, Settings } from '../types';

const KEYS = {
  days: '@gymtracker/days',
  customExercises: '@gymtracker/customExercises',
  logs: '@gymtracker/logs',
  settings: '@gymtracker/settings',
  draftWorkout: '@gymtracker/draftWorkout',
};

const DEFAULT_SETTINGS: Settings = { unit: 'lbs', theme: 'dark', freshDays: 2, recentDays: 6, overloadEnabled: true, heatWarningThreshold: 7 };

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

export const storage = {
  loadDays: () => readJson<Day[]>(KEYS.days, []),
  saveDays: (days: Day[]) => writeJson(KEYS.days, days),

  loadCustomExercises: () => readJson<Exercise[]>(KEYS.customExercises, []),
  saveCustomExercises: (exercises: Exercise[]) => writeJson(KEYS.customExercises, exercises),

  loadLogs: () => readJson<ExerciseLog[]>(KEYS.logs, []),
  saveLogs: (logs: ExerciseLog[]) => writeJson(KEYS.logs, logs),

  loadSettings: async () => ({
    ...DEFAULT_SETTINGS,
    ...(await readJson<Partial<Settings>>(KEYS.settings, {})),
  }),
  saveSettings: (settings: Settings) => writeJson(KEYS.settings, settings),

  loadDraftWorkout: () => readJson<DraftWorkout | null>(KEYS.draftWorkout, null),
  saveDraftWorkout: (draft: DraftWorkout) => writeJson(KEYS.draftWorkout, draft),
  clearDraftWorkout: () => AsyncStorage.removeItem(KEYS.draftWorkout),
};
