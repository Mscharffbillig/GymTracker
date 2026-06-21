import { Exercise, ExerciseCategory, MuscleGroup, TrackingType } from '../types';

type CatalogEntry = [string, ExerciseCategory, MuscleGroup | null, TrackingType?];

const builtIn: CatalogEntry[] = [
  // Chest
  ['Barbell Bench Press', 'chest', 'chestLower'],
  ['Incline Barbell Bench Press', 'chest', 'chestUpper'],
  ['Decline Bench Press', 'chest', 'chestLower'],
  ['Dumbbell Bench Press', 'chest', 'chestLower'],
  ['Incline Dumbbell Press', 'chest', 'chestUpper'],
  ['Dumbbell Flyes', 'chest', 'chestLower'],
  ['Cable Chest Fly', 'chest', 'chestLower'],
  ['Push-Up', 'chest', 'chestLower'],
  ['Chest Dip', 'chest', 'chestLower'],
  ['Pec Deck Machine', 'chest', 'chestLower'],

  // Back
  ['Deadlift', 'back', 'lowerBack'],
  ['Barbell Row', 'back', 'lats'],
  ['Pull-Up', 'back', 'lats'],
  ['Chin-Up', 'back', 'lats'],
  ['Lat Pulldown', 'back', 'lats'],
  ['Seated Cable Row', 'back', 'lats'],
  ['T-Bar Row', 'back', 'lats'],
  ['Single-Arm Dumbbell Row', 'back', 'lats'],
  ['Face Pull', 'back', 'traps'],
  ['Back Extension', 'back', 'lowerBack'],

  // Shoulders
  ['Overhead Press', 'shoulders', 'delts'],
  ['Dumbbell Shoulder Press', 'shoulders', 'delts'],
  ['Arnold Press', 'shoulders', 'delts'],
  ['Lateral Raise', 'shoulders', 'delts'],
  ['Front Raise', 'shoulders', 'delts'],
  ['Rear Delt Fly', 'shoulders', 'delts'],
  ['Cable Lateral Raise', 'shoulders', 'delts'],
  ['Upright Row', 'shoulders', 'delts'],
  ['Barbell Shrug', 'shoulders', 'traps'],

  // Legs
  ['Back Squat', 'legs', 'quads'],
  ['Front Squat', 'legs', 'quads'],
  ['Goblet Squat', 'legs', 'quads'],
  ['Leg Press', 'legs', 'quads'],
  ['Romanian Deadlift', 'legs', 'hamstrings'],
  ['Walking Lunge', 'legs', 'quads'],
  ['Bulgarian Split Squat', 'legs', 'quads'],
  ['Leg Extension', 'legs', 'quads'],
  ['Leg Curl', 'legs', 'hamstrings'],
  ['Calf Raise', 'legs', 'calves'],
  ['Hip Thrust', 'legs', 'glutes'],

  // Arms
  ['Barbell Curl', 'arms', 'biceps'],
  ['Dumbbell Curl', 'arms', 'biceps'],
  ['Hammer Curl', 'arms', 'biceps'],
  ['Preacher Curl', 'arms', 'biceps'],
  ['Cable Curl', 'arms', 'biceps'],
  ['Tricep Pushdown', 'arms', 'triceps'],
  ['Skull Crusher', 'arms', 'triceps'],
  ['Close-Grip Bench Press', 'arms', 'triceps'],
  ['Overhead Tricep Extension', 'arms', 'triceps'],
  ['Tricep Dip', 'arms', 'triceps'],

  // Core
  ['Plank', 'core', 'core', 'time'],
  ['Side Plank', 'core', 'core', 'time'],
  ['Hanging Leg Raise', 'core', 'core'],
  ['Cable Crunch', 'core', 'core'],
  ['Sit-Up', 'core', 'core'],
  ['Russian Twist', 'core', 'core'],
  ['Ab Wheel Rollout', 'core', 'core'],

  // Cardio (time-based, no specific muscle group)
  ['Running', 'cardio', null, 'time'],
  ['Cycling', 'cardio', null, 'time'],
  ['Swimming', 'cardio', null, 'time'],
  ['Jump Rope', 'cardio', null, 'time'],
  ['Rowing Machine', 'cardio', null, 'time'],
  ['Stair Climber', 'cardio', null, 'time'],
  ['Elliptical', 'cardio', null, 'time'],
];

export const BUILT_IN_EXERCISES: Exercise[] = builtIn.map(
  ([name, category, muscleGroup, trackingType], index) => ({
    id: `builtin-${index}`,
    name,
    category,
    muscleGroup,
    trackingType: trackingType ?? 'reps',
    isCustom: false,
  })
);

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  legs: 'Legs',
  arms: 'Arms',
  core: 'Core',
  cardio: 'Cardio',
  other: 'Other',
};

export const CATEGORIES: ExerciseCategory[] = [
  'chest',
  'back',
  'shoulders',
  'legs',
  'arms',
  'core',
  'cardio',
  'other',
];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chestUpper: 'Upper Chest',
  chestLower: 'Lower Chest',
  lats: 'Lats',
  traps: 'Traps',
  lowerBack: 'Lower Back',
  delts: 'Delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  core: 'Core',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
};

export const CATEGORY_TO_MUSCLE_GROUPS: Record<ExerciseCategory, MuscleGroup[]> = {
  chest: ['chestUpper', 'chestLower'],
  back: ['lats', 'traps', 'lowerBack'],
  shoulders: ['delts', 'traps'],
  arms: ['biceps', 'triceps'],
  core: ['core'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves'],
  cardio: [],
  other: [],
};
