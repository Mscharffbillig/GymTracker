import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../data/storage';
import { BUILT_IN_EXERCISES } from '../data/exerciseCatalog';
import { generateId } from '../utils/id';
import { darkColors, lightColors, ThemeColors } from '../theme';
import {
  Day,
  DayExercise,
  Exercise,
  ExerciseCategory,
  ExerciseLog,
  MuscleGroup,
  Settings,
  SetLog,
  TrackingType,
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
  updateDayExercise: (
    dayId: string,
    dayExerciseId: string,
    targetSets: number,
    targetReps: number,
    targetDurationSeconds: number
  ) => void;
  removeExerciseFromDay: (dayId: string, dayExerciseId: string) => void;

  addCustomExercise: (
    name: string,
    category: ExerciseCategory,
    muscleGroup: MuscleGroup | null,
    trackingType: TrackingType
  ) => Exercise;
  getExerciseById: (exerciseId: string) => Exercise | undefined;

  saveWorkoutLog: (
    dayId: string,
    entries: Array<{ exerciseId: string; targetReps: number; targetDurationSeconds: number; sets: SetLog[] }>
  ) => void;
  getLogsForExercise: (exerciseId: string) => ExerciseLog[];

  updateSettings: (settings: Settings) => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<Day[]>([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [settings, setSettings] = useState<Settings>({ unit: 'lbs', theme: 'dark' });
  const colors = settings.theme === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    (async () => {
      const [loadedDays, loadedCustom, loadedLogs, loadedSettings] = await Promise.all([
        storage.loadDays(),
        storage.loadCustomExercises(),
        storage.loadLogs(),
        storage.loadSettings(),
      ]);
      setDays(loadedDays);
      setCustomExercises(loadedCustom);
      setLogs(loadedLogs);
      setSettings(loadedSettings);
      setLoading(false);
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

  function addCustomExercise(
    name: string,
    category: ExerciseCategory,
    muscleGroup: MuscleGroup | null,
    trackingType: TrackingType
  ): Exercise {
    const exercise: Exercise = {
      id: generateId(),
      name,
      category,
      muscleGroup,
      trackingType,
      isCustom: true,
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
      }));
    persistLogs([...logs, ...newLogs]);
  }

  function getLogsForExercise(exerciseId: string): ExerciseLog[] {
    return logs
      .filter((l) => l.exerciseId === exerciseId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  function updateSettings(next: Settings) {
    setSettings(next);
    storage.saveSettings(next);
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
    updateDayExercise,
    removeExerciseFromDay,
    addCustomExercise,
    getExerciseById,
    saveWorkoutLog,
    getLogsForExercise,
    updateSettings,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
