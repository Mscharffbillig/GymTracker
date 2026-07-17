// Allowed primitive values — prevents complex objects from accidentally entering the pipeline
export type SafeValue = string | number | boolean | null;

export type DurationBucket =
  | '<5min'
  | '5-15min'
  | '15-30min'
  | '30-60min'
  | '60-90min'
  | '>90min';

export function bucketDuration(seconds: number): DurationBucket {
  if (seconds < 300) return '<5min';
  if (seconds < 900) return '5-15min';
  if (seconds < 1800) return '15-30min';
  if (seconds < 3600) return '30-60min';
  if (seconds < 5400) return '60-90min';
  return '>90min';
}

// Allowed property bag — exercise names, weights, reps, notes are structurally excluded
interface AllowedProperties {
  screen_name?: string;
  workout_duration_bucket?: DurationBucket;
  exercise_count?: number;
  set_count?: number;
  error_code?: string;
}

// Discriminated union — TypeScript enforces that only declared properties per event are valid.
// Adding exercise names, exact weights, or free text triggers a compile-time error.
export type AnalyticsEvent =
  | { name: 'app_opened' }
  | { name: 'onboarding_started' }
  | { name: 'onboarding_completed' }
  | { name: 'program_created' }
  | { name: 'program_selected' }
  | { name: 'workout_started'; properties: Pick<AllowedProperties, 'exercise_count'> }
  | {
      name: 'workout_completed';
      properties: Pick<AllowedProperties, 'exercise_count' | 'set_count' | 'workout_duration_bucket'>;
    }
  | { name: 'workout_abandoned' }
  | { name: 'set_logged'; properties: Pick<AllowedProperties, 'set_count'> }
  | { name: 'exercise_added_to_workout' }
  | { name: 'progression_suggestion_shown' }
  | { name: 'progression_suggestion_accepted' }
  | { name: 'statistics_viewed' }
  | { name: 'muscle_heatmap_viewed' }
  | { name: 'exercise_history_viewed' }
  | { name: 'feedback_opened' }
  | { name: 'feedback_submitted' }
  | { name: 'feedback_failed'; properties: Pick<AllowedProperties, 'error_code'> }
  | { name: 'error_recorded'; properties: Pick<AllowedProperties, 'error_code'> }
  | { name: 'screen_viewed'; properties: Pick<AllowedProperties, 'screen_name'> };

export type AnalyticsEventName = AnalyticsEvent['name'];

export interface QueuedEvent {
  id: string;
  name: AnalyticsEventName;
  properties: Record<string, SafeValue>;
  timestamp: string;
  retryCount: number;
  retryAfter?: number; // Unix ms — don't retry before this time
}

export interface IAnalyticsService {
  initialize(consent: import('../types').ConsentState): Promise<void>;
  setConsent(state: import('../types').ConsentState): Promise<void>;
  track(event: AnalyticsEvent): Promise<void>;
  trackScreen(screenName: string): void;
  recordError(errorCode: string, context?: string): void;
  flush(): Promise<void>;
  reset(): Promise<void>;
}
