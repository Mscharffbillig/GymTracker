import { Day, Exercise, ExerciseLog, MuscleGroup, WeightUnit } from '../types';

export const TRACKED_MUSCLE_GROUPS: MuscleGroup[] = [
  'chestUpper',
  'chestLower',
  'lats',
  'traps',
  'lowerBack',
  'delts',
  'biceps',
  'triceps',
  'core',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
  'hipAdductors',
];

export type HighlightLevel = 'fresh' | 'recent' | 'stale' | 'none';

export interface MuscleGroupStatus {
  muscleGroup: MuscleGroup;
  daysAgo: number | null;
  highlightLevel: HighlightLevel;
  exerciseNamesInProgram: string[];
  weightProgressLabel: string | null;
}

function topWeightOf(log: ExerciseLog): number {
  const validSets = log.sets.filter((s) => s.reps > 0);
  return validSets.length > 0 ? Math.max(...validSets.map((s) => s.weight)) : 0;
}

function getMuscleGroupStatus(
  muscleGroup: MuscleGroup,
  logs: ExerciseLog[],
  exercises: Exercise[],
  days: Day[],
  unit: WeightUnit,
  freshDays: number,
  recentDays: number
): MuscleGroupStatus {
  const groupExerciseIds = new Set(
    exercises.filter((e) => e.muscleGroup === muscleGroup).map((e) => e.id)
  );

  const exerciseNamesInProgram = Array.from(
    new Set(
      days
        .flatMap((d) => d.exercises)
        .map((de) => exercises.find((e) => e.id === de.exerciseId))
        .filter((e): e is Exercise => !!e && e.muscleGroup === muscleGroup)
        .map((e) => e.name)
    )
  );

  const groupLogs = logs
    .filter((l) => groupExerciseIds.has(l.exerciseId))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (groupLogs.length === 0) {
    return {
      muscleGroup,
      daysAgo: null,
      highlightLevel: 'none',
      exerciseNamesInProgram,
      weightProgressLabel: null,
    };
  }

  const mostRecent = groupLogs[groupLogs.length - 1];
  const daysAgo = Math.floor((Date.now() - new Date(mostRecent.date).getTime()) / 86400000);
  const highlightLevel: HighlightLevel =
    daysAgo <= freshDays ? 'fresh' : daysAgo <= recentDays ? 'recent' : 'stale';

  const earliestTop = topWeightOf(groupLogs[0]);
  const latestTop = topWeightOf(mostRecent);
  const weightProgressLabel =
    groupLogs.length > 1 && earliestTop > 0 && latestTop > earliestTop
      ? `${earliestTop}${unit} → ${latestTop}${unit}`
      : null;

  return {
    muscleGroup,
    daysAgo,
    highlightLevel,
    exerciseNamesInProgram,
    weightProgressLabel,
  };
}

export function getAllMuscleGroupStatuses(
  logs: ExerciseLog[],
  exercises: Exercise[],
  days: Day[],
  unit: WeightUnit,
  freshDays: number,
  recentDays: number
): Record<MuscleGroup, MuscleGroupStatus> {
  const result = {} as Record<MuscleGroup, MuscleGroupStatus>;
  for (const muscleGroup of TRACKED_MUSCLE_GROUPS) {
    result[muscleGroup] = getMuscleGroupStatus(
      muscleGroup,
      logs,
      exercises,
      days,
      unit,
      freshDays,
      recentDays
    );
  }
  return result;
}
