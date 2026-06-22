import { formatDuration } from '../utils/duration';
import { Exercise, ExerciseLog, WeightUnit } from '../types';

export interface ProgressSuggestion {
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  message: string;
}

function plateSize(unit: WeightUnit): number {
  return unit === 'kg' ? 2.5 : 5;
}

function roundToIncrement(value: number, increment: number): number {
  return Math.max(increment, Math.round(value / increment) * increment);
}

// Percentage of current working weight, rounded to a real plate increment,
// rather than a flat amount that's trivial for heavy lifts and too aggressive
// for light ones.
function weightIncrementFor(exercise: Exercise, unit: WeightUnit, topWeight: number): number {
  const isLowerBody = exercise.category === 'legs';
  const percent = isLowerBody ? 0.05 : 0.025;
  return roundToIncrement(topWeight * percent, plateSize(unit));
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
  reps: null,
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
    const finalSet = validSets[validSets.length - 1];
    const finalSetMet = finalSet.durationSeconds >= last.targetDurationSeconds;
    const increment = durationIncrementFor(topDuration);

    if (finalSetMet) {
      const suggested = topDuration + increment;
      return {
        weight: null,
        reps: null,
        durationSeconds: suggested,
        message: `Held the full time last time — try ${formatDuration(suggested)} (+${formatDuration(increment)}).`,
      };
    }

    return {
      weight: null,
      reps: null,
      durationSeconds: topDuration,
      message: `Came up short last time (${formatDuration(finalSet.durationSeconds)}/${formatDuration(last.targetDurationSeconds)}) — repeat ${formatDuration(topDuration)}.`,
    };
  }

  const validSets = last.sets.filter((s) => s.reps > 0);
  if (validSets.length === 0) return NO_HISTORY;

  const topWeight = Math.max(...validSets.map((s) => s.weight));
  const finalSet = validSets[validSets.length - 1];
  const finalSetMet = finalSet.reps >= last.targetReps;

  if (!finalSetMet) {
    return {
      weight: topWeight,
      reps: null,
      durationSeconds: null,
      message: `Your last set came up short (${finalSet.reps}/${last.targetReps} reps) — repeat ${topWeight}${unit} and aim for ${last.targetReps} reps across the board.`,
    };
  }

  const overshoot = finalSet.reps - last.targetReps;

  if (topWeight <= 0) {
    // Bodyweight exercise — progress via reps instead of an external load.
    const repIncrement = overshoot >= 3 ? 3 : 1;
    const suggestedReps = last.targetReps + repIncrement;
    return {
      weight: null,
      reps: suggestedReps,
      durationSeconds: null,
      message: `Hit all reps last time — try ${suggestedReps} reps (+${repIncrement}).`,
    };
  }

  let increment = weightIncrementFor(exercise, unit, topWeight);
  if (overshoot >= 3) {
    increment = roundToIncrement(increment * 1.5, plateSize(unit));
  }
  const suggested = topWeight + increment;

  return {
    weight: suggested,
    reps: null,
    durationSeconds: null,
    message:
      overshoot >= 3
        ? `Crushed it last time (+${overshoot} reps on your last set) — try ${suggested}${unit} (+${increment}).`
        : `Hit all reps last time — try ${suggested}${unit} (+${increment}).`,
  };
}
