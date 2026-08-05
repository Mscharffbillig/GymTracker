import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getInstallationId, clearInstallationId } from './installation';
import { AnalyticsEvent, IAnalyticsService, QueuedEvent, SafeValue } from './types';
import { ConsentState } from '../types';
import { resolveAnalyticsEndpoint } from '../utils/url';

export const QUEUE_KEY = '@gymtracker/analyticsQueue';
export const MAX_QUEUE_SIZE = 500;
export const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BATCH_SIZE = 20;
const MAX_RETRIES = 5;
const FLUSH_DEBOUNCE_MS = 5_000;
const REQUEST_TIMEOUT_MS = 10_000;

// Singleton state
let _enabled = false;             // consent is 'allowed' — controls local event collection
let _endpointUrl: string | null = null; // resolved once per session; null = unavailable
let _diagnosticSent = false;      // Sentry deduplication flag
let _installId: string | null = null;
let _queue: QueuedEvent[] = [];
let _flushTimer: ReturnType<typeof setTimeout> | null = null;
let _isFlushing = false;
let _initialized = false;
let _retryAfterMs = 0;
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

/**
 * Emits a one-time diagnostic when the analytics endpoint is misconfigured.
 * In dev: logs to console. In production: sends a single Sentry event.
 * Never includes the raw URL or any personal data.
 */
function _emitEndpointDiagnostic(reason: 'missing' | 'invalid' | 'insecure'): void {
  if (__DEV__) {
    console.warn(
      `[Analytics] Endpoint configuration error (${reason}) — events will be queued locally but not transmitted until a valid endpoint is deployed.`
    );
  }
  if (_diagnosticSent) return;
  _diagnosticSent = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native') as {
      captureMessage?: (msg: string, ctx?: object) => void;
    };
    Sentry.captureMessage?.('analytics_endpoint_unavailable', {
      level: 'warning',
      tags: { reason },
    });
  } catch {
    // Sentry not available — silently skip
  }
}

type BatchOutcome =
  | { outcome: 'success' }
  | { outcome: 'drop' }
  | { outcome: 'retry'; retryAfterMs?: number }
  | { outcome: 'split' };

async function sendBatch(events: QueuedEvent[]): Promise<BatchOutcome> {
  // _endpointUrl is guaranteed non-null — flushQueue() guards before calling sendBatch()
  const url = _endpointUrl!;

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

    if (status >= 200 && status < 300) return { outcome: 'success' };

    // Permanent payload/client errors from a live endpoint — discard
    if (status === 400 || status === 404 || status === 422) return { outcome: 'drop' };

    if (status === 413) return { outcome: 'split' };

    if (status === 408 || status === 425 || status === 429) {
      const retryAfterMs = parseRetryAfter(
        (res as Response & { headers?: { get?: (k: string) => string | null } }).headers?.get?.(
          'Retry-After'
        )
      );
      return { outcome: 'retry', retryAfterMs };
    }

    return { outcome: 'retry' };
  } catch {
    clearTimeout(timeout);
    return { outcome: 'retry' };
  }
}

async function flushQueue(): Promise<void> {
  if (_isFlushing || !_enabled || _queue.length === 0) return;
  // Endpoint not yet configured: hold events locally for the next session
  // that has a valid deployment. Do not drop or retry — just wait.
  if (!_endpointUrl) return;
  if (Date.now() < _retryAfterMs) return;

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
        _currentBatchSize = BATCH_SIZE;
        break;

      case 'drop':
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
          _currentBatchSize = half;
        } else {
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

function _resolveEndpoint(): void {
  const result = resolveAnalyticsEndpoint(process.env.EXPO_PUBLIC_ANALYTICS_URL);
  if (result.configured) {
    _endpointUrl = result.url;
  } else {
    _emitEndpointDiagnostic(result.reason);
  }
}

export const analytics: IAnalyticsService = {
  async initialize(consent: ConsentState): Promise<void> {
    if (_initialized) return;
    _initialized = true;

    const result = resolveAnalyticsEndpoint(process.env.EXPO_PUBLIC_ANALYTICS_URL);
    if (result.configured) {
      _endpointUrl = result.url;
    }

    if (consent === 'allowed') {
      // Emit diagnostic when consent is active but endpoint is misconfigured.
      // Events are still collected locally and will send once a valid endpoint
      // is deployed via OTA or a new build.
      if (!result.configured) {
        _emitEndpointDiagnostic(result.reason);
      }
      _enabled = true;
      [_installId, _queue] = await Promise.all([getInstallationId(), loadQueue()]);
      pruneExpiredEvents();
      if (_queue.length > 0 && _endpointUrl) scheduleFlush();
    }
  },

  async setConsent(state: ConsentState): Promise<void> {
    if (state === 'allowed' && !_enabled) {
      // Re-resolve the endpoint in case initialize() was called with a non-allowed
      // consent state and _endpointUrl was never set.
      if (!_endpointUrl) {
        _resolveEndpoint();
      }
      _enabled = true;
      [_installId, _queue] = await Promise.all([getInstallationId(), loadQueue()]);
      pruneExpiredEvents();
      if (_queue.length > 0 && _endpointUrl) scheduleFlush();
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
    if (_queue.length >= MAX_QUEUE_SIZE) return;
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
  _endpointUrl = null;
  _diagnosticSent = false;
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
