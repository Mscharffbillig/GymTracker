import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getInstallationId, clearInstallationId } from './installation';
import { AnalyticsEvent, IAnalyticsService, QueuedEvent, SafeValue } from './types';

const QUEUE_KEY = '@gymtracker/analyticsQueue';
const BATCH_SIZE = 20;
const MAX_RETRIES = 3;
const FLUSH_DEBOUNCE_MS = 5_000;
const REQUEST_TIMEOUT_MS = 10_000;


// Singleton state — module scope is singleton in JS/TS
let _consent = false;
let _installId: string | null = null;
let _queue: QueuedEvent[] = [];
let _flushTimer: ReturnType<typeof setTimeout> | null = null;
let _isFlushing = false;
let _initialized = false;

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

// Returns true when events should be removed from the queue (success or permanent failure).
async function sendBatch(events: QueuedEvent[]): Promise<boolean> {
  // Metro inlines EXPO_PUBLIC_* at build time; read at call time so tests can override.
  const url = (process.env.EXPO_PUBLIC_ANALYTICS_URL ?? '').trim();
  // No endpoint configured: silently consume events (no retry accumulation).
  if (!url) return true;
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
    // 2xx → success; 4xx → permanent failure (bad request), drop without retry
    return res.status >= 200 && res.status < 500;
  } catch {
    clearTimeout(timeout);
    return false; // network / timeout — retry later
  }
}

async function flushQueue(): Promise<void> {
  if (_isFlushing || !_consent || _queue.length === 0) return;
  _isFlushing = true;
  try {
    const batch = _queue.slice(0, BATCH_SIZE);
    const consumed = await sendBatch(batch);
    if (consumed) {
      const batchIds = new Set(batch.map((e) => e.id));
      _queue = _queue.filter((e) => !batchIds.has(e.id));
    } else {
      // Increment retry count; permanently drop events that exceeded the limit
      const batchIds = new Set(batch.map((e) => e.id));
      _queue = _queue
        .map((e) => (batchIds.has(e.id) ? { ...e, retryCount: e.retryCount + 1 } : e))
        .filter((e) => e.retryCount <= MAX_RETRIES);
    }
    await persistQueue();
    if (_queue.length > 0 && consumed) scheduleFlush();
  } finally {
    _isFlushing = false;
  }
}

export const analytics: IAnalyticsService = {
  async initialize(consent: boolean): Promise<void> {
    if (_initialized) return;
    _initialized = true;
    _consent = consent;
    if (consent) {
      [_installId, _queue] = await Promise.all([getInstallationId(), loadQueue()]);
      if (_queue.length > 0) scheduleFlush();
    }
  },

  async setConsent(enabled: boolean): Promise<void> {
    const wasEnabled = _consent;
    _consent = enabled;
    if (enabled && !wasEnabled) {
      [_installId, _queue] = await Promise.all([getInstallationId(), loadQueue()]);
      if (_queue.length > 0) scheduleFlush();
    } else if (!enabled) {
      cancelFlush();
      _isFlushing = false;
      _queue = [];
      _installId = null;
      await Promise.all([AsyncStorage.removeItem(QUEUE_KEY), clearInstallationId()]);
    }
  },

  async track(event: AnalyticsEvent): Promise<void> {
    if (!_consent) return;
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
    await this.setConsent(false);
    _initialized = false;
  },
};

// ── Test seam ──────────────────────────────────────────────────────────────
// Resets all module-level state. Only import in test files.
export function __resetForTest__(): void {
  cancelFlush();
  _consent = false;
  _installId = null;
  _queue = [];
  _isFlushing = false;
  _initialized = false;
}

// Expose internal queue for assertions in tests
export function __getQueueForTest__(): QueuedEvent[] {
  return [..._queue];
}

export { QUEUE_KEY };
