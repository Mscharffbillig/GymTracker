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

  // Chest additions
  ['Cable Crossover', 'chest', 'chestUpper'],
  ['Machine Chest Press', 'chest', 'chestLower'],
  ['Incline Push-Up', 'chest', 'chestUpper'],
  ['Landmine Press', 'chest', 'chestUpper'],

  // Back additions
  ['Straight-Arm Pulldown', 'back', 'lats'],
  ['Chest-Supported Row', 'back', 'lats'],
  ['Pendlay Row', 'back', 'lats'],
  ['Rack Pull', 'back', 'lowerBack'],
  ['Good Morning', 'back', 'lowerBack'],
  ['Superman', 'back', 'lowerBack'],

  // Shoulders additions
  ['Seated Dumbbell Press', 'shoulders', 'delts'],
  ['Machine Shoulder Press', 'shoulders', 'delts'],
  ['Dumbbell Shrug', 'shoulders', 'traps'],
  ['Y-Raise', 'shoulders', 'delts'],

  // Legs additions
  ['Hack Squat', 'legs', 'quads'],
  ['Sumo Squat', 'legs', 'hipAdductors'],
  ['Sumo Deadlift', 'legs', 'hipAdductors'],
  ['Hip Adductor Machine', 'legs', 'hipAdductors'],
  ['Step-Up', 'legs', 'quads'],
  ['Nordic Hamstring Curl', 'legs', 'hamstrings'],
  ['Single-Leg Romanian Deadlift', 'legs', 'hamstrings'],
  ['Glute Bridge', 'legs', 'glutes'],
  ['Donkey Kick', 'legs', 'glutes'],
  ['Lateral Band Walk', 'legs', 'hipAdductors'],
  ['Cable Hip Adduction', 'legs', 'hipAdductors'],
  ['Box Jump', 'legs', 'quads'],

  // Arms additions
  ['EZ Bar Curl', 'arms', 'biceps'],
  ['Concentration Curl', 'arms', 'biceps'],
  ['Incline Dumbbell Curl', 'arms', 'biceps'],
  ['Reverse Curl', 'arms', 'biceps'],
  ['Tricep Kickback', 'arms', 'triceps'],
  ['Cable Tricep Extension', 'arms', 'triceps'],
  ['Diamond Push-Up', 'arms', 'triceps'],
  ['Wrist Curl', 'arms', 'biceps'],

  // Core additions
  ['Bicycle Crunch', 'core', 'core'],
  ['Oblique Crunch', 'core', 'core'],
  ['Cable Wood Chop', 'core', 'core'],
  ['Pallof Press', 'core', 'core'],
  ['Decline Sit-Up', 'core', 'core'],
  ['L-Sit', 'core', 'core', 'time'],
  ['Dragon Flag', 'core', 'core'],
  ['Hanging Knee Raise', 'core', 'core'],
  ['Side Bend', 'core', 'core'],
  ['Hollow Body Hold', 'core', 'core', 'time'],
  ['Dead Bug', 'core', 'core'],
  ['Bird Dog', 'core', 'core'],

  // Cardio additions
  ['Treadmill', 'cardio', null, 'time'],
  ['HIIT', 'cardio', null, 'time'],
  ['Battle Ropes', 'cardio', null, 'time'],
  ['Walking', 'cardio', null, 'time'],
  ['Hiking', 'cardio', null, 'time'],
  ['Assault Bike', 'cardio', null, 'time'],
  ['Sprint Intervals', 'cardio', null, 'time'],
  ['Ski Erg', 'cardio', null, 'time'],

  // Other
  ["Farmer's Carry", 'other', null],
  ['Kettlebell Swing', 'other', null],
  ['Medicine Ball Slam', 'other', 'core'],
  ['Sled Push', 'other', null],
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
  hipAdductors: 'Hip Adductors',
};

export const CATEGORY_TO_MUSCLE_GROUPS: Record<ExerciseCategory, MuscleGroup[]> = {
  chest: ['chestUpper', 'chestLower'],
  back: ['lats', 'traps', 'lowerBack'],
  shoulders: ['delts', 'traps'],
  arms: ['biceps', 'triceps'],
  core: ['core'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves', 'hipAdductors'],
  cardio: [],
  other: [],
};
