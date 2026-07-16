// Typed convenience wrappers around analytics.track().
// Import these at call sites instead of calling analytics.track() directly —
// the function signatures make prohibited data structurally impossible to pass.
import { analytics } from './AnalyticsService';
import { bucketDuration } from './types';

export function trackAppOpened(): void {
  void analytics.track({ name: 'app_opened' });
}

export function trackOnboardingStarted(): void {
  void analytics.track({ name: 'onboarding_started' });
}

export function trackOnboardingCompleted(): void {
  void analytics.track({ name: 'onboarding_completed' });
}

export function trackProgramCreated(): void {
  void analytics.track({ name: 'program_created' });
}

export function trackProgramSelected(): void {
  void analytics.track({ name: 'program_selected' });
}

export function trackWorkoutStarted(exerciseCount: number): void {
  void analytics.track({ name: 'workout_started', properties: { exercise_count: exerciseCount } });
}

export function trackWorkoutCompleted(
  exerciseCount: number,
  setCount: number,
  durationSeconds: number
): void {
  void analytics.track({
    name: 'workout_completed',
    properties: {
      exercise_count: exerciseCount,
      set_count: setCount,
      workout_duration_bucket: bucketDuration(durationSeconds),
    },
  });
}

export function trackWorkoutAbandoned(): void {
  void analytics.track({ name: 'workout_abandoned' });
}

export function trackSetLogged(setCount: number): void {
  void analytics.track({ name: 'set_logged', properties: { set_count: setCount } });
}

export function trackExerciseAddedToWorkout(): void {
  void analytics.track({ name: 'exercise_added_to_workout' });
}

export function trackProgressionSuggestionShown(): void {
  void analytics.track({ name: 'progression_suggestion_shown' });
}

export function trackProgressionSuggestionAccepted(): void {
  void analytics.track({ name: 'progression_suggestion_accepted' });
}

export function trackStatisticsViewed(): void {
  void analytics.track({ name: 'statistics_viewed' });
}

export function trackMuscleHeatmapViewed(): void {
  void analytics.track({ name: 'muscle_heatmap_viewed' });
}

export function trackExerciseHistoryViewed(): void {
  void analytics.track({ name: 'exercise_history_viewed' });
}

export function trackFeedbackOpened(): void {
  void analytics.track({ name: 'feedback_opened' });
}

export function trackFeedbackSubmitted(): void {
  void analytics.track({ name: 'feedback_submitted' });
}

export function trackFeedbackFailed(errorCode: string): void {
  void analytics.track({ name: 'feedback_failed', properties: { error_code: errorCode } });
}
