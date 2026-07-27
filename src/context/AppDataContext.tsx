import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../data/storage';
import { BUILT_IN_EXERCISES } from '../data/exerciseCatalog';
import { generateId } from '../utils/id';
import { darkColors, lightColors, ThemeColors } from '../theme';
import { analytics } from '../analytics/AnalyticsService';
import { trackAppOpened, trackProgramCreated, trackWorkoutCompleted, trackSetLogged } from '../analytics/events';
import { setDiagnosticsConsent } from '../diagnostics';
import {
  Day,
  DayExercise,
  DraftWorkout,
  Exercise,
  ExerciseCategory,
  ExerciseLog,
  MuscleGroup,
  Settings,
  SetLog,
  TrackingType,
  WeightEntry,
} from '../types';

interface AppDataContextValue {
  loading: boolean;
  days: Day[];
  exercises: Exercise[];
  logs: ExerciseLog[];
  settings: Settings;
  colors: ThemeColors;

  addDay: (name: string) => Day;
  renameDay: (dayId: string, name: string) => void;
  deleteDay: (dayId: string) => void;
  moveDay: (dayId: string, direction: 'up' | 'down') => void;

  addExerciseToDay: (
    dayId: string,
    exerciseId: string,
    targetSets: number,
    targetReps: number,
    targetDurationSeconds: number
  ) => void;
  addExercisesToDay: (
    dayId: string,
    entries: Array<{ exerciseId: string; targetSets: number; targetReps: number; targetDurationSeconds: number }>
  ) => void;
  updateDayExercise: (
    dayId: string,
    dayExerciseId: string,
    targetSets: number,
    targetReps: number,
    targetDurationSeconds: number
  ) => void;
  removeExerciseFromDay: (dayId: string, dayExerciseId: string) => void;
  moveDayExercise: (dayId: string, dayExerciseId: string, direction: 'up' | 'down') => void;

  addCustomExercise: (
    name: string,
    category: ExerciseCategory,
    muscleGroup: MuscleGroup | null,
    secondaryMuscleGroups: MuscleGroup[],
    trackingType: TrackingType,
    isBodyweight?: boolean
  ) => Exercise;
  getExerciseById: (exerciseId: string) => Exercise | undefined;

  saveWorkoutLog: (
    dayId: string,
    entries: Array<{ exerciseId: string; targetReps: number; targetDurationSeconds: number; sets: SetLog[]; note?: string }>
  ) => void;
  getLogsForExercise: (exerciseId: string) => ExerciseLog[];
  deleteLog: (logId: string) => void;
  updateExerciseLog: (logId: string, sets: SetLog[]) => void;

  updateSettings: (settings: Settings) => void;

  draftWorkout: DraftWorkout | null;
  saveDraftWorkout: (draft: DraftWorkout) => void;
  clearDraftWorkout: () => void;
  setAlternativeExercise: (dayId: string, dayExerciseId: string, altExerciseId: string | null) => void;

  weightLog: WeightEntry[];
  addWeightEntry: (weight: number) => void;
  deleteWeightEntry: (id: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<Day[]>([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [settings, setSettings] = useState<Settings>({
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
  });
  const [draftWorkout, setDraftWorkout] = useState<DraftWorkout | null>(null);
  const [weightLog, setWeightLog] = useState<WeightEntry[]>([]);
  const colors = settings.theme === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    (async () => {
      const [loadedDays, loadedCustom, loadedLogs, loadedSettings, loadedDraft, loadedWeightLog] = await Promise.all([
        storage.loadDays(),
        storage.loadCustomExercises(),
        storage.loadLogs(),
        storage.loadSettings(),
        storage.loadDraftWorkout(),
        storage.loadWeightLog(),
      ]);
      setDays(loadedDays);
      setCustomExercises(loadedCustom);
      setLogs(loadedLogs);
      setSettings(loadedSettings);
      setDraftWorkout(loadedDraft);
      setWeightLog(loadedWeightLog);
      setLoading(false);
      setDiagnosticsConsent(loadedSettings.diagnosticsEnabled === 'allowed');
      await analytics.initialize(loadedSettings.analyticsEnabled);
      trackAppOpened();
    })();
  }, []);

  const exercises = useMemo(
    () => [...BUILT_IN_EXERCISES, ...customExercises],
    [customExercises]
  );

  function persistDays(next: Day[]) {
    setDays(next);
    storage.saveDays(next);
  }

  function persistCustomExercises(next: Exercise[]) {
    setCustomExercises(next);
    storage.saveCustomExercises(next);
  }

  function persistLogs(next: ExerciseLog[]) {
    setLogs(next);
    storage.saveLogs(next);
  }

  function addDay(name: string): Day {
    const day: Day = { id: generateId(), name, order: days.length, exercises: [] };
    persistDays([...days, day]);
    trackProgramCreated();
    return day;
  }

  function renameDay(dayId: string, name: string) {
    persistDays(days.map((d) => (d.id === dayId ? { ...d, name } : d)));
  }

  function deleteDay(dayId: string) {
    persistDays(days.filter((d) => d.id !== dayId));
  }

  function moveDay(dayId: string, direction: 'up' | 'down') {
    const sorted = [...days].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((d) => d.id === dayId);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (index === -1 || swapWith < 0 || swapWith >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[swapWith];
    const aOrder = a.order;
    a.order = b.order;
    b.order = aOrder;
    persistDays(sorted);
  }

  function addExerciseToDay(
    dayId: string,
    exerciseId: string,
    targetSets: number,
    targetReps: number,
    targetDurationSeconds: number
  ) {
    const dayExercise: DayExercise = {
      id: generateId(),
      exerciseId,
      targetSets,
      targetReps,
      targetDurationSeconds,
    };
    persistDays(
      days.map((d) => (d.id === dayId ? { ...d, exercises: [...d.exercises, dayExercise] } : d))
    );
  }

  function addExercisesToDay(
    dayId: string,
    entries: Array<{ exerciseId: string; targetSets: number; targetReps: number; targetDurationSeconds: number }>
  ) {
    const newExercises: DayExercise[] = entries.map((e) => ({
      id: generateId(),
      exerciseId: e.exerciseId,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      targetDurationSeconds: e.targetDurationSeconds,
    }));
    persistDays(
      days.map((d) => (d.id === dayId ? { ...d, exercises: [...d.exercises, ...newExercises] } : d))
    );
  }

  function updateDayExercise(
    dayId: string,
    dayExerciseId: string,
    targetSets: number,
    targetReps: number,
    targetDurationSeconds: number
  ) {
    persistDays(
      days.map((d) =>
        d.id === dayId
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.id === dayExerciseId
                  ? { ...e, targetSets, targetReps, targetDurationSeconds }
                  : e
              ),
            }
          : d
      )
    );
  }

  function removeExerciseFromDay(dayId: string, dayExerciseId: string) {
    persistDays(
      days.map((d) =>
        d.id === dayId
          ? { ...d, exercises: d.exercises.filter((e) => e.id !== dayExerciseId) }
          : d
      )
    );
  }

  function moveDayExercise(dayId: string, dayExerciseId: string, direction: 'up' | 'down') {
    persistDays(
      days.map((d) => {
        if (d.id !== dayId) return d;
        const list = [...d.exercises];
        const index = list.findIndex((e) => e.id === dayExerciseId);
        const swapWith = direction === 'up' ? index - 1 : index + 1;
        if (index === -1 || swapWith < 0 || swapWith >= list.length) return d;
        [list[index], list[swapWith]] = [list[swapWith], list[index]];
        return { ...d, exercises: list };
      })
    );
  }

  function addCustomExercise(
    name: string,
    category: ExerciseCategory,
    muscleGroup: MuscleGroup | null,
    secondaryMuscleGroups: MuscleGroup[],
    trackingType: TrackingType,
    isBodyweight?: boolean
  ): Exercise {
    const exercise: Exercise = {
      id: `custom-${generateId()}`,
      name,
      category,
      muscleGroup,
      secondaryMuscleGroups,
      trackingType,
      isCustom: true,
      isBodyweight: isBodyweight ?? false,
    };
    persistCustomExercises([...customExercises, exercise]);
    return exercise;
  }

  function getExerciseById(exerciseId: string): Exercise | undefined {
    return exercises.find((e) => e.id === exerciseId);
  }

  function saveWorkoutLog(
    dayId: string,
    entries: Array<{
      exerciseId: string;
      targetReps: number;
      targetDurationSeconds: number;
      sets: SetLog[];
      note?: string;
    }>
  ) {
    const date = new Date().toISOString();
    const newLogs: ExerciseLog[] = entries
      .filter((entry) => entry.sets.some((s) => s.reps > 0 || s.weight > 0 || s.durationSeconds > 0))
      .map((entry) => ({
        id: generateId(),
        exerciseId: entry.exerciseId,
        dayId,
        date,
        targetReps: entry.targetReps,
        targetDurationSeconds: entry.targetDurationSeconds,
        sets: entry.sets,
        note: entry.note || undefined,
      }));
    persistLogs([...logs, ...newLogs]);

    // Analytics: count-only, no exercise names or weights
    const totalSets = newLogs.reduce((n, l) => n + l.sets.length, 0);
    trackWorkoutCompleted(newLogs.length, totalSets, 0); // duration tracked in WorkoutSessionScreen
    if (totalSets > 0) trackSetLogged(totalSets);
  }

  function getLogsForExercise(exerciseId: string): ExerciseLog[] {
    return logs
      .filter((l) => l.exerciseId === exerciseId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  function deleteLog(logId: string) {
    persistLogs(logs.filter((l) => l.id !== logId));
  }

  function updateExerciseLog(logId: string, sets: SetLog[]) {
    persistLogs(logs.map((l) => (l.id === logId ? { ...l, sets } : l)));
  }

  function saveDraftWorkout(draft: DraftWorkout) {
    setDraftWorkout(draft);
    storage.saveDraftWorkout(draft);
  }

  function clearDraftWorkout() {
    setDraftWorkout(null);
    storage.clearDraftWorkout();
  }

  function addWeightEntry(weight: number) {
    const entry: WeightEntry = { id: generateId(), date: new Date().toISOString(), weight };
    const next = [entry, ...weightLog];
    setWeightLog(next);
    storage.saveWeightLog(next);
    const nextSettings = { ...settings, bodyWeight: weight };
    setSettings(nextSettings);
    storage.saveSettings(nextSettings);
  }

  function deleteWeightEntry(id: string) {
    const next = weightLog.filter((e) => e.id !== id);
    setWeightLog(next);
    storage.saveWeightLog(next);
    const nextWeight = next.length > 0 ? next[0].weight : 0;
    if (nextWeight !== settings.bodyWeight) {
      const nextSettings = { ...settings, bodyWeight: nextWeight };
      setSettings(nextSettings);
      storage.saveSettings(nextSettings);
    }
  }

  function setAlternativeExercise(dayId: string, dayExerciseId: string, altExerciseId: string | null) {
    persistDays(
      days.map((d) =>
        d.id === dayId
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.id === dayExerciseId
                  ? { ...e, alternativeExerciseId: altExerciseId ?? undefined }
                  : e
              ),
            }
          : d
      )
    );
  }

  const LBS_PER_KG = 2.20462;

  function updateSettings(next: Settings) {
    if (next.unit !== settings.unit) {
      const factor = next.unit === 'kg' ? 1 / LBS_PER_KG : LBS_PER_KG;
      const convert = (v: number) => Math.round(v * factor * 10) / 10;

      persistLogs(
        logs.map((log) => ({
          ...log,
          sets: log.sets.map((s) => ({ ...s, weight: s.weight ? convert(s.weight) : 0 })),
        }))
      );

      if (next.bodyWeight) {
        next = { ...next, bodyWeight: convert(next.bodyWeight) };
      }

      const convertedWeightLog = weightLog.map((e) => ({ ...e, weight: convert(e.weight) }));
      setWeightLog(convertedWeightLog);
      storage.saveWeightLog(convertedWeightLog);

      if (draftWorkout) {
        const migrateSetMap = (record: Record<string, SetLog[]>) =>
          Object.fromEntries(
            Object.entries(record).map(([k, sets]) => [
              k,
              sets.map((s) => ({ ...s, weight: s.weight ? convert(s.weight) : 0 })),
            ])
          );
        saveDraftWorkout({
          ...draftWorkout,
          setsByExercise: migrateSetMap(draftWorkout.setsByExercise),
          extraSets: migrateSetMap(draftWorkout.extraSets),
        });
      }
    }

    setSettings(next);
    storage.saveSettings(next);
    if (next.analyticsEnabled !== settings.analyticsEnabled) {
      void analytics.setConsent(next.analyticsEnabled);
    }
    if (next.diagnosticsEnabled !== settings.diagnosticsEnabled) {
      setDiagnosticsConsent(next.diagnosticsEnabled === 'allowed');
    }
  }

  const value: AppDataContextValue = {
    loading,
    days,
    exercises,
    logs,
    settings,
    colors,
    addDay,
    renameDay,
    deleteDay,
    moveDay,
    addExerciseToDay,
    addExercisesToDay,
    updateDayExercise,
    removeExerciseFromDay,
    moveDayExercise,
    addCustomExercise,
    getExerciseById,
    saveWorkoutLog,
    getLogsForExercise,
    deleteLog,
    updateExerciseLog,
    updateSettings,
    draftWorkout,
    saveDraftWorkout,
    clearDraftWorkout,
    setAlternativeExercise,
    weightLog,
    addWeightEntry,
    deleteWeightEntry,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
