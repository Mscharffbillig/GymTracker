import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getInstallationId, clearInstallationId } from './installation';
import { AnalyticsEvent, IAnalyticsService, QueuedEvent, SafeValue } from './types';
import { ConsentState } from '../types';

export const QUEUE_KEY = '@gymtracker/analyticsQueue';
export const MAX_QUEUE_SIZE = 500;
export const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BATCH_SIZE = 20;
const MAX_RETRIES = 5;
const FLUSH_DEBOUNCE_MS = 5_000;
const REQUEST_TIMEOUT_MS = 10_000;

// Singleton state
let _enabled = false;
let _installId: string | null = null;
let _queue: QueuedEvent[] = [];
let _flushTimer: ReturnType<typeof setTimeout> | null = null;
let _isFlushing = false;
let _initialized = false;
let _retryAfterMs = 0;     // endpoint-level throttle: don't flush before this time
let _currentBatchSize = BATCH_SIZE;

function extractProperties(event: AnalyticsEvent): Record<string, SafeValue> {
  if ('properties' in event && event.properties != null) {
    return event.properties as Record<string, SafeValue>;
  }
  return {};
}

async function persistQueue(): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(_queue));
}

async function loadQueue(): Promise<QueuedEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedEvent[];
  } catch {
    return [];
  }
}

function pruneExpiredEvents(): void {
  const cutoff = Date.now() - MAX_EVENT_AGE_MS;
  _queue = _queue.filter((e) => new Date(e.timestamp).getTime() > cutoff);
}

function cancelFlush(): void {
  if (_flushTimer !== null) {
    clearTimeout(_flushTimer);
    _flushTimer = null;
  }
}

function scheduleFlush(): void {
  cancelFlush();
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    void flushQueue();
  }, FLUSH_DEBOUNCE_MS);
}

function parseRetryAfter(header: string | null | undefined): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (!isNaN(seconds) && seconds > 0) return seconds * 1000;
  const date = new Date(header).getTime();
  if (!isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

type BatchOutcome =
  | { outcome: 'success' }
  | { outcome: 'drop' }
  | { outcome: 'retry'; retryAfterMs?: number }
  | { outcome: 'split' };

async function sendBatch(events: QueuedEvent[]): Promise<BatchOutcome> {
  const url = (process.env.EXPO_PUBLIC_ANALYTICS_URL ?? '').trim();
  if (!url) return { outcome: 'retry' }; // fail closed; shouldn't reach here when _enabled

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        installationId: _installId,
        androidVersion: Platform?.Version ?? null,
        events,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const { status } = res;

    // 2xx — success
    if (status >= 200 && status < 300) return { outcome: 'success' };

    // Permanent client errors — discard without retry
    if (status === 400 || status === 404 || status === 422) return { outcome: 'drop' };

    // Payload too large — attempt with a smaller batch
    if (status === 413) return { outcome: 'split' };

    // Transient client errors with optional backoff header
    if (status === 408 || status === 425 || status === 429) {
      const retryAfterMs = parseRetryAfter(
        (res as Response & { headers?: { get?: (k: string) => string | null } }).headers?.get?.('Retry-After')
      );
      return { outcome: 'retry', retryAfterMs };
    }

    // 5xx and anything else — retry
    return { outcome: 'retry' };
  } catch {
    clearTimeout(timeout);
    return { outcome: 'retry' }; // network failure / AbortError (timeout)
  }
}

async function flushQueue(): Promise<void> {
  if (_isFlushing || !_enabled || _queue.length === 0) return;
  if (Date.now() < _retryAfterMs) return; // endpoint throttled

  _isFlushing = true;
  try {
    pruneExpiredEvents();
    if (_queue.length === 0) {
      await persistQueue();
      return;
    }

    const batch = _queue.slice(0, _currentBatchSize);
    const result = await sendBatch(batch);
    const batchIds = new Set(batch.map((e) => e.id));

    switch (result.outcome) {
      case 'success':
        _queue = _queue.filter((e) => !batchIds.has(e.id));
        _currentBatchSize = BATCH_SIZE; // restore after success
        break;

      case 'drop':
        // Permanent failure (400/404/422): discard without incrementing retry count
        _queue = _queue.filter((e) => !batchIds.has(e.id));
        break;

      case 'retry': {
        if (result.retryAfterMs != null) {
          _retryAfterMs = Date.now() + result.retryAfterMs;
        }
        _queue = _queue
          .map((e) => (batchIds.has(e.id) ? { ...e, retryCount: e.retryCount + 1 } : e))
          .filter((e) => e.retryCount <= MAX_RETRIES);
        break;
      }

      case 'split': {
        const half = Math.max(1, Math.floor(batch.length / 2));
        if (half < batch.length) {
          // Reduce batch size; keep events for next flush attempt
          _currentBatchSize = half;
        } else {
          // Already at minimum (1 event) and still too large — drop the event
          _queue = _queue.filter((e) => !batchIds.has(e.id));
        }
        break;
      }
    }

    await persistQueue();
    if (_queue.length > 0) scheduleFlush();
  } finally {
    _isFlushing = false;
  }
}

export const analytics: IAnalyticsService = {
  async initialize(consent: ConsentState): Promise<void> {
    if (_initialized) return;
    _initialized = true;

    const url = (process.env.EXPO_PUBLIC_ANALYTICS_URL ?? '').trim();
    if (!url) {
      if (__DEV__) {
        console.warn('[Analytics] EXPO_PUBLIC_ANALYTICS_URL not configured — analytics disabled.');
      }
      return; // fail closed: no install ID, no queue, no events
    }

    if (consent === 'allowed') {
      _enabled = true;
      [_installId, _queue] = await Promise.all([getInstallationId(), loadQueue()]);
      pruneExpiredEvents();
      if (_queue.length > 0) scheduleFlush();
    }
  },

  async setConsent(state: ConsentState): Promise<void> {
    const url = (process.env.EXPO_PUBLIC_ANALYTICS_URL ?? '').trim();

    if (state === 'allowed' && !_enabled) {
      if (!url) return; // fail closed
      _enabled = true;
      [_installId, _queue] = await Promise.all([getInstallationId(), loadQueue()]);
      pruneExpiredEvents();
      if (_queue.length > 0) scheduleFlush();
    } else if (state !== 'allowed' && _enabled) {
      _enabled = false;
      cancelFlush();
      _isFlushing = false;
      _queue = [];
      _installId = null;
      await Promise.all([AsyncStorage.removeItem(QUEUE_KEY), clearInstallationId()]);
    }
  },

  async track(event: AnalyticsEvent): Promise<void> {
    if (!_enabled) return;
    if (_queue.length >= MAX_QUEUE_SIZE) return; // cap: drop new events when full
    const queued: QueuedEvent = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: event.name,
      properties: extractProperties(event),
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    _queue.push(queued);
    await persistQueue();
    scheduleFlush();
  },

  trackScreen(screenName: string): void {
    void this.track({ name: 'screen_viewed', properties: { screen_name: screenName } });
  },

  recordError(errorCode: string, _context?: string): void {
    void this.track({ name: 'error_recorded', properties: { error_code: errorCode } });
  },

  async flush(): Promise<void> {
    cancelFlush();
    await flushQueue();
  },

  async reset(): Promise<void> {
    await this.setConsent('declined');
    _initialized = false;
  },
};

// ── Test seams ─────────────────────────────────────────────────────────────
export function __resetForTest__(): void {
  cancelFlush();
  _enabled = false;
  _installId = null;
  _queue = [];
  _isFlushing = false;
  _initialized = false;
  _retryAfterMs = 0;
  _currentBatchSize = BATCH_SIZE;
}

export function __getQueueForTest__(): QueuedEvent[] {
  return [..._queue];
}

export function __getRetryAfterForTest__(): number {
  return _retryAfterMs;
}
