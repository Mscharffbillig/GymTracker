import { formatDuration } from '../utils/duration';
import { Exercise, ExerciseLog, WeightUnit } from '../types';

export interface ProgressSuggestion {
  weight: number | null;
  durationSeconds: number | null;
  message: string;
}

function weightIncrementFor(exercise: Exercise, unit: WeightUnit): number {
  const isLowerBody = exercise.category === 'legs';
  if (unit === 'kg') return isLowerBody ? 5 : 2.5;
  return isLowerBody ? 10 : 5;
}

function durationIncrementFor(durationSeconds: number): number {
  const raw = Math.round(durationSeconds * 0.1);
  return Math.max(5, Math.round(raw / 5) * 5);
}

function mostRecentLog(exerciseId: string, logs: ExerciseLog[]): ExerciseLog | null {
  const matching = logs.filter((l) => l.exerciseId === exerciseId);
  if (matching.length === 0) return null;
  return matching.reduce((latest, current) =>
    new Date(current.date) > new Date(latest.date) ? current : latest
  );
}

const NO_HISTORY: ProgressSuggestion = {
  weight: null,
  durationSeconds: null,
  message: 'No history yet — log a starting effort.',
};

export function getProgressSuggestion(
  exercise: Exercise,
  logs: ExerciseLog[],
  unit: WeightUnit
): ProgressSuggestion {
  const last = mostRecentLog(exercise.id, logs);
  if (!last) return NO_HISTORY;

  if (exercise.trackingType === 'time') {
    const validSets = last.sets.filter((s) => s.durationSeconds > 0);
    if (validSets.length === 0) return NO_HISTORY;

    const topDuration = Math.max(...validSets.map((s) => s.durationSeconds));
    const allMetTarget = validSets.every((s) => s.durationSeconds >= last.targetDurationSeconds);
    const increment = durationIncrementFor(topDuration);

    if (allMetTarget) {
      const suggested = topDuration + increment;
      return {
        weight: null,
        durationSeconds: suggested,
        message: `Held the full time last time — try ${formatDuration(suggested)} (+${formatDuration(increment)}).`,
      };
    }

    return {
      weight: null,
      durationSeconds: topDuration,
      message: `Came up short last time — repeat ${formatDuration(topDuration)} and aim for ${formatDuration(last.targetDurationSeconds)}.`,
    };
  }

  const validSets = last.sets.filter((s) => s.reps > 0);
  if (validSets.length === 0) return NO_HISTORY;

  const topWeight = Math.max(...validSets.map((s) => s.weight));
  const allMetTarget = validSets.every((s) => s.reps >= last.targetReps);
  const increment = weightIncrementFor(exercise, unit);

  if (allMetTarget) {
    const suggested = topWeight + increment;
    return {
      weight: suggested,
      durationSeconds: null,
      message: `Hit all reps last time — try ${suggested} ${unit} (+${increment}).`,
    };
  }

  return {
    weight: topWeight,
    durationSeconds: null,
    message: `Missed target reps last time — repeat ${topWeight} ${unit} and aim for ${last.targetReps} reps.`,
  };
}
