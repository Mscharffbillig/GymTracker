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
  'neck',
];

export interface MuscleGroupStatus {
  muscleGroup: MuscleGroup;
  heat: number;
  isOverworked: boolean;
  lastTrainedDaysAgo: number | null;
  exerciseNamesInProgram: string[];
  weightProgressLabel: string | null;
}

const PRIMARY_HEAT = 3;
const SECONDARY_HEAT = 1;

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
  recentDays: number,
  heatWarningThreshold: number
): MuscleGroupStatus {
  const exerciseNamesInProgram = Array.from(
    new Set(
      days
        .flatMap((d) => d.exercises)
        .map((de) => exercises.find((e) => e.id === de.exerciseId))
        .filter(
          (e): e is Exercise =>
            !!e &&
            (e.muscleGroup === muscleGroup ||
              (e.secondaryMuscleGroups ?? []).includes(muscleGroup))
        )
        .map((e) => e.name)
    )
  );

  const now = Date.now();
  let totalHeat = 0;
  let lastTrainedDaysAgo: number | null = null;

  const relevantLogs = logs.filter((log) => {
    const daysAgo = (now - new Date(log.date).getTime()) / 86400000;
    return daysAgo <= recentDays;
  });

  for (const log of relevantLogs) {
    const exercise = exercises.find((e) => e.id === log.exerciseId);
    if (!exercise) continue;

    const daysAgo = (now - new Date(log.date).getTime()) / 86400000;
    const decay = Math.max(0, 1 - daysAgo / recentDays);

    let sessionPoints = 0;
    if (exercise.muscleGroup === muscleGroup) {
      sessionPoints = PRIMARY_HEAT;
    } else if ((exercise.secondaryMuscleGroups ?? []).includes(muscleGroup)) {
      sessionPoints = SECONDARY_HEAT;
    }

    if (sessionPoints > 0) {
      totalHeat += sessionPoints * decay;
      const daysAgoInt = Math.floor(daysAgo);
      if (lastTrainedDaysAgo === null || daysAgoInt < lastTrainedDaysAgo) {
        lastTrainedDaysAgo = daysAgoInt;
      }
    }
  }

  // weight progress: look at all-time logs for primary exercises
  const primaryExerciseIds = new Set(
    exercises
      .filter((e) => e.muscleGroup === muscleGroup)
      .map((e) => e.id)
  );
  const primaryLogs = logs
    .filter((l) => primaryExerciseIds.has(l.exerciseId))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let weightProgressLabel: string | null = null;
  if (primaryLogs.length > 1) {
    const earliestTop = topWeightOf(primaryLogs[0]);
    const latestTop = topWeightOf(primaryLogs[primaryLogs.length - 1]);
    if (earliestTop > 0 && latestTop > earliestTop) {
      weightProgressLabel = `${earliestTop}${unit} → ${latestTop}${unit}`;
    }
  }

  return {
    muscleGroup,
    heat: totalHeat,
    isOverworked: totalHeat >= heatWarningThreshold,
    lastTrainedDaysAgo,
    exerciseNamesInProgram,
    weightProgressLabel,
  };
}

export function getAllMuscleGroupStatuses(
  logs: ExerciseLog[],
  exercises: Exercise[],
  days: Day[],
  unit: WeightUnit,
  recentDays: number,
  heatWarningThreshold: number
): Record<MuscleGroup, MuscleGroupStatus> {
  const result = {} as Record<MuscleGroup, MuscleGroupStatus>;
  for (const muscleGroup of TRACKED_MUSCLE_GROUPS) {
    result[muscleGroup] = getMuscleGroupStatus(
      muscleGroup,
      logs,
      exercises,
      days,
      unit,
      recentDays,
      heatWarningThreshold
    );
  }
  return result;
}
