export type WeightUnit = 'lbs' | 'kg';

export type TrackingType = 'reps' | 'time';

export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'legs'
  | 'arms'
  | 'core'
  | 'cardio'
  | 'other';

export type MuscleGroup =
  | 'chestUpper'
  | 'chestLower'
  | 'lats'
  | 'traps'
  | 'lowerBack'
  | 'delts'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  muscleGroup: MuscleGroup | null;
  trackingType: TrackingType;
  isCustom: boolean;
}

export interface DayExercise {
  id: string;
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  targetDurationSeconds: number;
}

export interface Day {
  id: string;
  name: string;
  order: number;
  exercises: DayExercise[];
}

export interface SetLog {
  reps: number;
  weight: number;
  durationSeconds: number;
}

export interface ExerciseLog {
  id: string;
  exerciseId: string;
  dayId: string;
  date: string;
  targetReps: number;
  targetDurationSeconds: number;
  sets: SetLog[];
}

export type ThemeMode = 'light' | 'dark';

export interface Settings {
  unit: WeightUnit;
  theme: ThemeMode;
  freshDays: number;
  recentDays: number;
}
