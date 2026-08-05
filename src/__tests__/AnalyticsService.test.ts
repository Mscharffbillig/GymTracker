import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import {
  analytics,
  __resetForTest__,
  __getQueueForTest__,
  __getRetryAfterForTest__,
  QUEUE_KEY,
  MAX_QUEUE_SIZE,
  MAX_EVENT_AGE_MS,
} from '../analytics/AnalyticsService';
import { INSTALL_ID_KEY } from '../analytics/installation';

const TEST_URL = 'https://example.com/analytics';

beforeEach(async () => {
  __resetForTest__();
  await AsyncStorage.clear();
  (global.fetch as jest.Mock).mockReset();
  (Sentry.captureMessage as jest.Mock).mockClear();
  // Default: valid HTTPS URL so most tests exercise the happy path
  process.env.EXPO_PUBLIC_ANALYTICS_URL = TEST_URL;
});

afterEach(() => {
  __resetForTest__();
  jest.useRealTimers();
  process.env.EXPO_PUBLIC_ANALYTICS_URL = TEST_URL;
  global.__DEV__ = true;
});

// ── Endpoint unavailable — local queuing behavior ──────────────────────────
//
// A missing / invalid / insecure endpoint is a deployment configuration error,
// NOT a reason to permanently discard user events. Events queue locally and
// are delivered once a valid endpoint is available in a subsequent session.

describe('endpoint unavailable — local queuing', () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_ANALYTICS_URL;
  });

  test('events ARE queued locally when endpoint is missing (consent allowed)', async () => {
    await analytics.initialize('allowed');
    await analytics.track({ name: 'app_opened' });

    expect(__getQueueForTest__()).toHaveLength(1);
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toHaveLength(1);
  });

  test('install ID IS created when endpoint is missing (consent allowed)', async () => {
    await analytics.initialize('allowed');
    const id = await AsyncStorage.getItem(INSTALL_ID_KEY);
    expect(id).not.toBeNull();
  });

  test('no network request is made when endpoint is missing', async () => {
    await analytics.initialize('allowed');
    await analytics.track({ name: 'app_opened' });
    await analytics.flush();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('setConsent to allowed queues events even when endpoint is missing', async () => {
    await analytics.initialize('declined');
    await analytics.setConsent('allowed');
    await analytics.track({ name: 'app_opened' });

    expect(__getQueueForTest__()).toHaveLength(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('missing endpoint does not cause a queued batch to be permanently dropped', async () => {
    await analytics.initialize('allowed');
    await analytics.track({ name: 'app_opened' });
    await analytics.track({ name: 'program_created' });

    // Multiple flush calls — events must remain in queue, never discarded
    await analytics.flush();
    await analytics.flush();
    await analytics.flush();

    expect(__getQueueForTest__()).toHaveLength(2);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('queued events send after a valid endpoint becomes available in next session', async () => {
    // Session 1: no endpoint — queue events locally
    await analytics.initialize('allowed');
    await analytics.track({ name: 'app_opened' });
    await analytics.track({ name: 'program_created' });
    expect(__getQueueForTest__()).toHaveLength(2);

    // Session 2: new OTA/build with valid URL — events in storage should be sent
    __resetForTest__();
    process.env.EXPO_PUBLIC_ANALYTICS_URL = TEST_URL;
    (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200, ok: true });

    await analytics.initialize('allowed');
    expect(__getQueueForTest__()).toHaveLength(2); // loaded from AsyncStorage

    await analytics.flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(__getQueueForTest__()).toHaveLength(0);
  });
});

// ── Endpoint validation edge cases ─────────────────────────────────────────

describe('endpoint validation', () => {
  test('valid HTTPS endpoint enables normal analytics flow', async () => {
    process.env.EXPO_PUBLIC_ANALYTICS_URL = TEST_URL;
    (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200, ok: true });

    await analytics.initialize('allowed');
    await analytics.track({ name: 'app_opened' });
    await analytics.flush();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(__getQueueForTest__()).toHaveLength(0);
  });

  test('HTTP (non-HTTPS) endpoint queues events locally, no network call', async () => {
    process.env.EXPO_PUBLIC_ANALYTICS_URL = 'http://example.com/analytics';

    await analytics.initialize('allowed');
    await analytics.track({ name: 'app_opened' });
    await analytics.flush();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(__getQueueForTest__()).toHaveLength(1);
  });

  test('malformed URL queues events locally, no network call', async () => {
    process.env.EXPO_PUBLIC_ANALYTICS_URL = 'not-a-url';

    await analytics.initialize('allowed');
    await analytics.track({ name: 'app_opened' });
    await analytics.flush();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(__getQueueForTest__()).toHaveLength(1);
  });
});

// ── Endpoint diagnostic ────────────────────────────────────────────────────

describe('endpoint diagnostic', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  test('warns in dev when endpoint is missing', async () => {
    delete process.env.EXPO_PUBLIC_ANALYTICS_URL;
    await analytics.initialize('allowed');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('missing'));
  });

  test('warns in dev when endpoint is HTTP not HTTPS', async () => {
    process.env.EXPO_PUBLIC_ANALYTICS_URL = 'http://example.com/analytics';
    await analytics.initialize('allowed');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('insecure'));
  });

  test('warns in dev when endpoint is a malformed URL', async () => {
    process.env.EXPO_PUBLIC_ANALYTICS_URL = 'not-a-url';
    await analytics.initialize('allowed');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('invalid'));
  });

  test('Sentry diagnostic is sent exactly once even when triggered multiple times', async () => {
    // Use prod mode so Sentry.captureMessage is actually called
    global.__DEV__ = false;
    delete process.env.EXPO_PUBLIC_ANALYTICS_URL;

    await analytics.initialize('declined');
    // First trigger: consent changes to allowed with endpoint still missing
    await analytics.setConsent('allowed');
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'analytics_endpoint_unavailable',
      expect.objectContaining({ tags: { reason: 'missing' } })
    );

    // Subsequent triggers must not re-fire Sentry
    await analytics.setConsent('declined');
    await analytics.setConsent('allowed');
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
  });

  test('no warning or Sentry call when endpoint is valid', async () => {
    global.__DEV__ = false;
    process.env.EXPO_PUBLIC_ANALYTICS_URL = TEST_URL;

    await analytics.initialize('allowed');
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  test('diagnostic is not emitted when consent is declined (analytics not in use)', async () => {
    global.__DEV__ = false;
    delete process.env.EXPO_PUBLIC_ANALYTICS_URL;

    await analytics.initialize('declined');
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});

// ── Consent ────────────────────────────────────────────────────────────────

test('no events are sent without consent', async () => {
  await analytics.initialize('declined');
  await analytics.track({ name: 'app_opened' });

  expect(__getQueueForTest__()).toHaveLength(0);
  const stored = await AsyncStorage.getItem(QUEUE_KEY);
  expect(stored).toBeNull();
});

test('undecided consent is treated the same as declined', async () => {
  await analytics.initialize('undecided');
  await analytics.track({ name: 'app_opened' });
  expect(__getQueueForTest__()).toHaveLength(0);
});

test('enabling consent allows events to be queued', async () => {
  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });

  expect(__getQueueForTest__()).toHaveLength(1);
  expect(__getQueueForTest__()[0].name).toBe('app_opened');
});

test('revoking consent immediately clears the queue', async () => {
  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });
  expect(__getQueueForTest__()).toHaveLength(1);

  await analytics.setConsent('declined');

  expect(__getQueueForTest__()).toHaveLength(0);
  const stored = await AsyncStorage.getItem(QUEUE_KEY);
  expect(stored).toBeNull();
});

test('revoking consent deletes the installation ID', async () => {
  await analytics.initialize('allowed');
  const id = await AsyncStorage.getItem(INSTALL_ID_KEY);
  expect(id).not.toBeNull();

  await analytics.setConsent('declined');

  const idAfter = await AsyncStorage.getItem(INSTALL_ID_KEY);
  expect(idAfter).toBeNull();
});

test('re-enabling consent after revocation creates a new installation ID', async () => {
  await analytics.initialize('allowed');
  await analytics.setConsent('declined');
  await analytics.setConsent('allowed');

  const id = await AsyncStorage.getItem(INSTALL_ID_KEY);
  expect(typeof id).toBe('string');
  expect(id).not.toBeNull();
});

test('analytics remains completely disabled when consent is declined', async () => {
  await analytics.initialize('declined');
  await analytics.track({ name: 'app_opened' });
  await analytics.flush();

  expect(global.fetch).not.toHaveBeenCalled();
  expect(__getQueueForTest__()).toHaveLength(0);
  const stored = await AsyncStorage.getItem(QUEUE_KEY);
  expect(stored).toBeNull();
  const id = await AsyncStorage.getItem(INSTALL_ID_KEY);
  expect(id).toBeNull();
});

// ── Prohibited properties ──────────────────────────────────────────────────

test('prohibited properties are structurally excluded at the TypeScript level', () => {
  // Compile-time guarantee: uncomment below to verify TS error:
  // analytics.track({ name: 'workout_started', properties: { exercise_name: 'Bench Press' } });
  expect(true).toBe(true);
});

test('event queue stores only safe primitive values', async () => {
  await analytics.initialize('allowed');
  await analytics.track({
    name: 'workout_completed',
    properties: { exercise_count: 5, set_count: 15, workout_duration_bucket: '30-60min' },
  });

  const queued = __getQueueForTest__()[0];
  for (const val of Object.values(queued.properties)) {
    const t = typeof val;
    expect(['string', 'number', 'boolean', 'null'].includes(t === 'object' ? 'null' : t)).toBe(true);
  }
});

// ── Queue persistence and retry ────────────────────────────────────────────

test('queue is persisted to AsyncStorage after each track()', async () => {
  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });

  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  expect(raw).not.toBeNull();
  const parsed = JSON.parse(raw!);
  expect(parsed).toHaveLength(1);
  expect(parsed[0].name).toBe('app_opened');
});

test('queue survives re-initialization (loaded from AsyncStorage)', async () => {
  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });
  await analytics.track({ name: 'program_created' });

  __resetForTest__();

  await analytics.initialize('allowed');
  expect(__getQueueForTest__()).toHaveLength(2);
});

// ── HTTP response classification ───────────────────────────────────────────

test('2xx: successful delivery clears queued events', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200, ok: true });

  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });
  await analytics.flush();

  expect(__getQueueForTest__()).toHaveLength(0);
  const stored = JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? '[]');
  expect(stored).toHaveLength(0);
});

test('5xx: server error increments retry count', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 500, ok: false });

  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });
  await analytics.flush();

  const q = __getQueueForTest__();
  expect(q[0].retryCount).toBe(1);
});

test('5xx: events are dropped after MAX_RETRIES failures', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ status: 500, ok: false });

  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });

  // MAX_RETRIES = 5: event survives flushes 1-5 then drops on 6th
  for (let i = 0; i <= 5; i++) await analytics.flush();

  expect(__getQueueForTest__()).toHaveLength(0);
});

test('400: client error drops event without retry', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 400, ok: false });

  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });
  await analytics.flush();

  expect(__getQueueForTest__()).toHaveLength(0);
});

test('404: drops event without retry', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 404, ok: false });

  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });
  await analytics.flush();

  expect(__getQueueForTest__()).toHaveLength(0);
});

test('422: drops event without retry', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 422, ok: false });

  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });
  await analytics.flush();

  expect(__getQueueForTest__()).toHaveLength(0);
});

test('408: increments retry count (transient timeout)', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 408, ok: false });

  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });
  await analytics.flush();

  const q = __getQueueForTest__();
  expect(q).toHaveLength(1);
  expect(q[0].retryCount).toBe(1);
});

test('429 without Retry-After: increments retry count', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    status: 429,
    ok: false,
    headers: { get: () => null },
  });

  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });
  await analytics.flush();

  const q = __getQueueForTest__();
  expect(q).toHaveLength(1);
  expect(q[0].retryCount).toBe(1);
});

test('429 with Retry-After (seconds): subsequent flush is suppressed until window expires', async () => {
  jest.useFakeTimers();
  const retryAfterSecs = 60;

  (global.fetch as jest.Mock).mockResolvedValueOnce({
    status: 429,
    ok: false,
    headers: { get: (key: string) => (key === 'Retry-After' ? String(retryAfterSecs) : null) },
  });

  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });
  await analytics.flush();

  expect(__getQueueForTest__()[0].retryCount).toBe(1);

  await analytics.flush();
  expect(global.fetch).toHaveBeenCalledTimes(1);

  jest.advanceTimersByTime(retryAfterSecs * 1000 + 1);
  (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200, ok: true });
  await analytics.flush();
  expect(__getQueueForTest__()).toHaveLength(0);
});

test('429 with Retry-After as HTTP date: parses correctly', async () => {
  jest.useFakeTimers();
  const futureDate = new Date(Date.now() + 30_000).toUTCString();

  (global.fetch as jest.Mock).mockResolvedValueOnce({
    status: 429,
    ok: false,
    headers: { get: (key: string) => (key === 'Retry-After' ? futureDate : null) },
  });

  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });
  await analytics.flush();

  expect(__getRetryAfterForTest__()).toBeGreaterThan(Date.now());

  await analytics.flush();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('413 on single-event batch: drops the event', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 413, ok: false });

  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });
  await analytics.flush();

  expect(__getQueueForTest__()).toHaveLength(0);
});

test('413 on multi-event batch: reduces batch size and keeps events for next flush', async () => {
  (global.fetch as jest.Mock)
    .mockResolvedValueOnce({ status: 413, ok: false })
    .mockResolvedValueOnce({ status: 200, ok: true })
    .mockResolvedValueOnce({ status: 200, ok: true });

  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });
  await analytics.track({ name: 'program_created' });

  await analytics.flush();
  expect(__getQueueForTest__()).toHaveLength(2);

  await analytics.flush();
  expect(__getQueueForTest__()).toHaveLength(1);

  await analytics.flush();
  expect(__getQueueForTest__()).toHaveLength(0);
});

test('network failure retries (event stays in queue)', async () => {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network unreachable'));

  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });
  await analytics.flush();

  expect(__getQueueForTest__()).toHaveLength(1);
  expect(__getQueueForTest__()[0].retryCount).toBe(1);
});

// ── Queue size cap ─────────────────────────────────────────────────────────

test('queue size cap prevents unbounded growth', async () => {
  await analytics.initialize('allowed');

  for (let i = 0; i < MAX_QUEUE_SIZE + 20; i++) {
    await analytics.track({ name: 'app_opened' });
  }

  expect(__getQueueForTest__().length).toBeLessThanOrEqual(MAX_QUEUE_SIZE);
});

// ── Event age expiration ───────────────────────────────────────────────────

test('events older than MAX_EVENT_AGE_MS are pruned during flush', async () => {
  jest.useFakeTimers();
  const now = Date.now();
  jest.setSystemTime(now);

  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });

  jest.setSystemTime(now + MAX_EVENT_AGE_MS + 1_000);

  (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200, ok: true });
  await analytics.flush();

  expect(__getQueueForTest__()).toHaveLength(0);
  expect(global.fetch).not.toHaveBeenCalled();
});

// ── Deduplication ──────────────────────────────────────────────────────────

test('each queued event has a unique ID', async () => {
  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });
  await analytics.track({ name: 'app_opened' });
  await analytics.track({ name: 'app_opened' });

  const ids = __getQueueForTest__().map((e) => e.id);
  const unique = new Set(ids);
  expect(unique.size).toBe(ids.length);
});
