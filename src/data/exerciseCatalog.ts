import { Exercise, ExerciseCategory, MuscleGroup, TrackingType } from '../types';

type CatalogEntry = [string, ExerciseCategory, MuscleGroup | null, MuscleGroup[]?, TrackingType?];

// CRITICAL: Built-in exercise IDs are positional (builtin-${index}).
// NEVER insert into the middle of this array or reorder existing entries —
// doing so shifts all subsequent indices and breaks saved log references.
// Only ever append new exercises at the end.
const builtIn: CatalogEntry[] = [
  // ── ORIGINAL 0–63 ─────────────────────────────────────────────────────────

  // Chest (0–9)
  ['Barbell Bench Press',          'chest', 'chestLower', ['chestUpper', 'delts', 'triceps']],
  ['Incline Barbell Bench Press',  'chest', 'chestUpper', ['delts', 'triceps']],
  ['Decline Bench Press',          'chest', 'chestLower', ['triceps', 'delts']],
  ['Dumbbell Bench Press',         'chest', 'chestLower', ['chestUpper', 'delts', 'triceps']],
  ['Incline Dumbbell Press',       'chest', 'chestUpper', ['delts', 'triceps']],
  ['Dumbbell Flyes',               'chest', 'chestLower', ['chestUpper', 'delts']],
  ['Cable Chest Fly',              'chest', 'chestLower', ['chestUpper']],
  ['Push-Up',                      'chest', 'chestLower', ['chestUpper', 'delts', 'triceps', 'core']],
  ['Chest Dip',                    'chest', 'chestLower', ['triceps', 'delts']],
  ['Pec Deck Machine',             'chest', 'chestLower', ['chestUpper']],

  // Back (10–19)
  ['Deadlift',                     'back',  'lowerBack',  ['glutes', 'hamstrings', 'traps', 'core']],
  ['Barbell Row',                  'back',  'lats',       ['traps', 'biceps', 'lowerBack']],
  ['Pull-Up',                      'back',  'lats',       ['biceps', 'traps', 'core']],
  ['Chin-Up',                      'back',  'lats',       ['biceps', 'core']],
  ['Lat Pulldown',                 'back',  'lats',       ['biceps', 'traps']],
  ['Seated Cable Row',             'back',  'lats',       ['traps', 'biceps']],
  ['T-Bar Row',                    'back',  'lats',       ['traps', 'biceps', 'lowerBack']],
  ['Single-Arm Dumbbell Row',      'back',  'lats',       ['traps', 'biceps']],
  ['Face Pull',                    'back',  'traps',      ['delts']],
  ['Back Extension',               'back',  'lowerBack',  ['glutes', 'hamstrings']],

  // Shoulders (20–28)
  ['Overhead Press',               'shoulders', 'delts',  ['triceps', 'traps', 'core']],
  ['Dumbbell Shoulder Press',      'shoulders', 'delts',  ['triceps', 'traps']],
  ['Arnold Press',                 'shoulders', 'delts',  ['triceps']],
  ['Lateral Raise',                'shoulders', 'delts',  []],
  ['Front Raise',                  'shoulders', 'delts',  ['chestUpper']],
  ['Rear Delt Fly',                'shoulders', 'delts',  ['traps']],
  ['Cable Lateral Raise',          'shoulders', 'delts',  []],
  ['Upright Row',                  'shoulders', 'delts',  ['traps', 'biceps']],
  ['Barbell Shrug',                'shoulders', 'traps',  []],

  // Legs (29–39)
  ['Back Squat',                   'legs', 'quads',        ['glutes', 'hamstrings', 'core', 'lowerBack']],
  ['Front Squat',                  'legs', 'quads',        ['core', 'glutes', 'delts']],
  ['Goblet Squat',                 'legs', 'quads',        ['glutes', 'core']],
  ['Leg Press',                    'legs', 'quads',        ['glutes', 'hamstrings']],
  ['Romanian Deadlift',            'legs', 'hamstrings',   ['glutes', 'lowerBack']],
  ['Walking Lunge',                'legs', 'quads',        ['glutes', 'hamstrings', 'core']],
  ['Bulgarian Split Squat',        'legs', 'quads',        ['glutes', 'hamstrings']],
  ['Leg Extension',                'legs', 'quads',        []],
  ['Leg Curl',                     'legs', 'hamstrings',   []],
  ['Calf Raise',                   'legs', 'calves',       []],
  ['Hip Thrust',                   'legs', 'glutes',       ['hamstrings', 'core']],

  // Arms (40–49)
  ['Barbell Curl',                 'arms', 'biceps',       ['lowerBack']],
  ['Dumbbell Curl',                'arms', 'biceps',       []],
  ['Hammer Curl',                  'arms', 'biceps',       []],
  ['Preacher Curl',                'arms', 'biceps',       []],
  ['Cable Curl',                   'arms', 'biceps',       []],
  ['Tricep Pushdown',              'arms', 'triceps',      []],
  ['Skull Crusher',                'arms', 'triceps',      []],
  ['Close-Grip Bench Press',       'arms', 'triceps',      ['chestLower', 'delts']],
  ['Overhead Tricep Extension',    'arms', 'triceps',      []],
  ['Tricep Dip',                   'arms', 'triceps',      ['chestLower', 'delts']],

  // Core (50–56)
  ['Plank',                        'core', 'core',         ['lowerBack', 'glutes'], 'time'],
  ['Side Plank',                   'core', 'core',         ['hipAdductors'], 'time'],
  ['Hanging Leg Raise',            'core', 'core',         ['hipAdductors']],
  ['Cable Crunch',                 'core', 'core',         []],
  ['Sit-Up',                       'core', 'core',         ['hipAdductors']],
  ['Russian Twist',                'core', 'core',         []],
  ['Ab Wheel Rollout',             'core', 'core',         ['lats', 'lowerBack']],

  // Cardio (57–63)
  ['Running',                      'cardio', null, [], 'time'],
  ['Cycling',                      'cardio', null, [], 'time'],
  ['Swimming',                     'cardio', null, [], 'time'],
  ['Jump Rope',                    'cardio', null, [], 'time'],
  ['Rowing Machine',               'cardio', null, [], 'time'],
  ['Stair Climber',                'cardio', null, [], 'time'],
  ['Elliptical',                   'cardio', null, [], 'time'],

  // ── BATCH 1 ADDITIONS 64–121 ──────────────────────────────────────────────

  // Chest (64–67)
  ['Cable Crossover',              'chest', 'chestUpper',  ['chestLower', 'delts']],
  ['Machine Chest Press',          'chest', 'chestLower',  ['chestUpper', 'delts', 'triceps']],
  ['Incline Push-Up',              'chest', 'chestUpper',  ['delts', 'triceps']],
  ['Landmine Press',               'chest', 'chestUpper',  ['delts', 'triceps']],

  // Back (68–73)
  ['Straight-Arm Pulldown',        'back',  'lats',        ['triceps', 'core']],
  ['Chest-Supported Row',          'back',  'lats',        ['traps', 'biceps']],
  ['Pendlay Row',                  'back',  'lats',        ['traps', 'lowerBack', 'biceps']],
  ['Rack Pull',                    'back',  'lowerBack',   ['traps', 'glutes', 'hamstrings']],
  ['Good Morning',                 'back',  'hamstrings',  ['lowerBack', 'glutes']],
  ['Superman',                     'back',  'lowerBack',   ['glutes']],

  // Shoulders (74–77)
  ['Seated Dumbbell Press',        'shoulders', 'delts',   ['triceps']],
  ['Machine Shoulder Press',       'shoulders', 'delts',   ['triceps']],
  ['Dumbbell Shrug',               'shoulders', 'traps',   []],
  ['Y-Raise',                      'shoulders', 'delts',   ['traps']],

  // Legs (78–89)
  ['Hack Squat',                   'legs', 'quads',        ['glutes', 'hamstrings']],
  ['Sumo Squat',                   'legs', 'quads',        ['glutes', 'hipAdductors']],
  ['Sumo Deadlift',                'legs', 'glutes',       ['quads', 'hipAdductors', 'hamstrings']],
  ['Hip Adductor Machine',         'legs', 'hipAdductors', []],
  ['Step-Up',                      'legs', 'quads',        ['glutes', 'hamstrings']],
  ['Nordic Hamstring Curl',        'legs', 'hamstrings',   ['glutes']],
  ['Single-Leg Romanian Deadlift', 'legs', 'hamstrings',   ['glutes', 'lowerBack', 'core']],
  ['Glute Bridge',                 'legs', 'glutes',       ['hamstrings', 'core']],
  ['Donkey Kick',                  'legs', 'glutes',       []],
  ['Lateral Band Walk',            'legs', 'hipAdductors', ['glutes']],
  ['Cable Hip Adduction',          'legs', 'hipAdductors', []],
  ['Box Jump',                     'legs', 'quads',        ['glutes', 'calves']],

  // Arms (90–97)
  ['EZ Bar Curl',                  'arms', 'biceps',       []],
  ['Concentration Curl',           'arms', 'biceps',       []],
  ['Incline Dumbbell Curl',        'arms', 'biceps',       []],
  ['Reverse Curl',                 'arms', 'biceps',       []],
  ['Tricep Kickback',              'arms', 'triceps',      []],
  ['Cable Tricep Extension',       'arms', 'triceps',      []],
  ['Diamond Push-Up',              'arms', 'triceps',      ['chestUpper', 'delts']],
  ['Wrist Curl',                   'arms', 'biceps',       []],

  // Core (98–109)
  ['Bicycle Crunch',               'core', 'core',         []],
  ['Oblique Crunch',               'core', 'core',         []],
  ['Cable Wood Chop',              'core', 'core',         ['delts']],
  ['Pallof Press',                 'core', 'core',         []],
  ['Decline Sit-Up',               'core', 'core',         []],
  ['L-Sit',                        'core', 'core',         ['triceps'], 'time'],
  ['Dragon Flag',                  'core', 'core',         []],
  ['Hanging Knee Raise',           'core', 'core',         []],
  ['Side Bend',                    'core', 'core',         []],
  ['Hollow Body Hold',             'core', 'core',         [], 'time'],
  ['Dead Bug',                     'core', 'core',         ['lowerBack']],
  ['Bird Dog',                     'core', 'core',         ['lowerBack', 'glutes']],

  // Cardio (110–117)
  ['Treadmill',                    'cardio', null, [], 'time'],
  ['HIIT',                         'cardio', null, [], 'time'],
  ['Battle Ropes',                 'cardio', null, [], 'time'],
  ['Walking',                      'cardio', null, [], 'time'],
  ['Hiking',                       'cardio', null, [], 'time'],
  ['Assault Bike',                 'cardio', null, [], 'time'],
  ['Sprint Intervals',             'cardio', null, [], 'time'],
  ['Ski Erg',                      'cardio', null, [], 'time'],

  // Other (118–121)
  ["Farmer's Carry",               'other', null,    []],
  ['Kettlebell Swing',             'other', 'glutes', ['hamstrings', 'lowerBack', 'core']],
  ['Medicine Ball Slam',           'core',  'core',   ['delts', 'lats']],
  ['Sled Push',                    'other', null,    []],

  // ── NEW IN BATCH 3 — append only, never reorder above this line ───────────

  // Chest new (122–125)
  ['Decline Dumbbell Press',       'chest', 'chestLower',  ['triceps', 'delts']],
  ['Cable Fly High-to-Low',        'chest', 'chestLower',  ['chestUpper']],
  ['Cable Fly Low-to-High',        'chest', 'chestUpper',  ['chestLower', 'delts']],
  ['Wide Push-Up',                 'chest', 'chestLower',  ['chestUpper', 'delts']],

  // Back new (126–132)
  ['Meadows Row',                  'back',  'lats',        ['traps', 'biceps']],
  ['Seal Row',                     'back',  'lats',        ['traps', 'biceps']],
  ['Inverted Row',                 'back',  'lats',        ['traps', 'biceps', 'core']],
  ['Wide-Grip Lat Pulldown',       'back',  'lats',        ['traps', 'biceps']],
  ['Close-Grip Lat Pulldown',      'back',  'lats',        ['biceps']],
  ['Cable Pull-Over',              'back',  'lats',        ['chestLower', 'core']],
  ['Dumbbell Pull-Over',           'back',  'lats',        ['chestLower', 'triceps']],

  // Shoulders new (133–135)
  ['Cable Upright Row',            'shoulders', 'delts',   ['traps', 'biceps']],
  ['Prone Y-T-W',                  'shoulders', 'traps',   ['delts', 'lowerBack']],
  ['Band Pull-Apart',              'shoulders', 'delts',   ['traps']],

  // Legs new (136–148)
  ['Barbell Hip Thrust',           'legs', 'glutes',       ['hamstrings', 'quads', 'core']],
  ['Cable Kickback',               'legs', 'glutes',       ['hamstrings']],
  ['Reverse Hyper',                'legs', 'glutes',       ['hamstrings', 'lowerBack']],
  ['Curtsy Lunge',                 'legs', 'glutes',       ['hipAdductors', 'quads']],
  ['Cable Pull-Through',           'legs', 'glutes',       ['hamstrings', 'lowerBack']],
  ['Copenhagen Plank',             'core', 'hipAdductors', ['core'], 'time'],
  ['Frog Pump',                    'legs', 'glutes',       ['hipAdductors', 'hamstrings']],
  ['Cossack Squat',                'legs', 'quads',        ['hipAdductors', 'glutes']],
  ['Wide-Stance Leg Press',        'legs', 'quads',        ['hipAdductors', 'glutes']],
  ['Sissy Squat',                  'legs', 'quads',        []],
  ['Seated Calf Raise',            'legs', 'calves',       []],
  ['Single-Leg Calf Raise',        'legs', 'calves',       []],
  ['Reverse Lunge',                'legs', 'quads',        ['glutes', 'hamstrings']],

  // Arms new (149–157)
  ['Spider Curl',                  'arms', 'biceps',       []],
  ['Bayesian Curl',                'arms', 'biceps',       []],
  ['Cable Overhead Tricep Extension', 'arms', 'triceps',   []],
  ['Rope Pushdown',                'arms', 'triceps',      []],
  ['Single-Arm Pushdown',          'arms', 'triceps',      []],
  ['JM Press',                     'arms', 'triceps',      ['chestLower']],
  ['Tate Press',                   'arms', 'triceps',      []],
  ['Lying Tricep Extension',       'arms', 'triceps',      []],
  ['Cross-Body Curl',              'arms', 'biceps',       []],

  // Core new (158–163)
  ['Toes to Bar',                  'core', 'core',         ['lats', 'hipAdductors']],
  ['Stir the Pot',                 'core', 'core',         [], 'time'],
  ['Landmine Rotation',            'core', 'core',         ['delts', 'lats']],
  ['V-Up',                         'core', 'core',         []],
  ['Reverse Crunch',               'core', 'core',         []],
  ['Turkish Get-Up',               'core', 'core',         ['delts', 'glutes', 'triceps']],

  // Neck new (164–167)
  ['Neck Flexion',                 'other', 'neck',        []],
  ['Neck Extension',               'other', 'neck',        ['traps']],
  ['Neck Lateral Flexion',         'other', 'neck',        ['traps']],
  ['Neck Harness',                 'other', 'neck',        ['traps']],
];

export const BUILT_IN_EXERCISES: Exercise[] = builtIn.map(
  ([name, category, muscleGroup, secondaryMuscleGroups, trackingType], index) => ({
    id: `builtin-${index}`,
    name,
    category,
    muscleGroup,
    secondaryMuscleGroups: secondaryMuscleGroups ?? [],
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
  neck: 'Neck',
};

export const CATEGORY_TO_MUSCLE_GROUPS: Record<ExerciseCategory, MuscleGroup[]> = {
  chest: ['chestUpper', 'chestLower'],
  back: ['lats', 'traps', 'lowerBack'],
  shoulders: ['delts', 'traps'],
  arms: ['biceps', 'triceps'],
  core: ['core', 'hipAdductors'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves', 'hipAdductors'],
  cardio: [],
  other: ['neck'],
};
