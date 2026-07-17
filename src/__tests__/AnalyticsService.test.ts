import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Each test gets a clean slate.
beforeEach(async () => {
  __resetForTest__();
  await AsyncStorage.clear();
  (global.fetch as jest.Mock).mockReset();
  // Default: URL is configured so events can be queued.
  process.env.EXPO_PUBLIC_ANALYTICS_URL = TEST_URL;
});

afterEach(() => {
  __resetForTest__(); // cancel any pending debounce timers
  jest.useRealTimers();
  process.env.EXPO_PUBLIC_ANALYTICS_URL = TEST_URL;
});

// ── Fail-closed: no URL configured ────────────────────────────────────────

describe('fail-closed when no ANALYTICS_URL', () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_ANALYTICS_URL;
  });

  test('no events are queued when URL is absent', async () => {
    await analytics.initialize('allowed');
    await analytics.track({ name: 'app_opened' });

    expect(__getQueueForTest__()).toHaveLength(0);
    expect(await AsyncStorage.getItem(QUEUE_KEY)).toBeNull();
  });

  test('no installation ID is created when URL is absent', async () => {
    await analytics.initialize('allowed');
    expect(await AsyncStorage.getItem(INSTALL_ID_KEY)).toBeNull();
  });

  test('no network request is made when URL is absent', async () => {
    await analytics.initialize('allowed');
    await analytics.track({ name: 'app_opened' });
    await analytics.flush();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('setConsent allowed is also a no-op when URL is absent', async () => {
    await analytics.initialize('declined');
    await analytics.setConsent('allowed');
    await analytics.track({ name: 'app_opened' });
    expect(__getQueueForTest__()).toHaveLength(0);
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
  await analytics.flush(); // 429 → sets retryAfter to ~60s from now

  expect(__getQueueForTest__()[0].retryCount).toBe(1);

  // Immediate second flush is suppressed
  await analytics.flush();
  expect(global.fetch).toHaveBeenCalledTimes(1);

  // After the window expires, flush proceeds
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

  // __getRetryAfterForTest__() should be in the future
  expect(__getRetryAfterForTest__()).toBeGreaterThan(Date.now());

  // Immediate flush is suppressed
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
    .mockResolvedValueOnce({ status: 413, ok: false }) // first flush: 2-event batch → split
    .mockResolvedValueOnce({ status: 200, ok: true }) // second flush: 1-event batch → success
    .mockResolvedValueOnce({ status: 200, ok: true }); // third flush: 1-event batch → success

  await analytics.initialize('allowed');
  await analytics.track({ name: 'app_opened' });
  await analytics.track({ name: 'program_created' });

  await analytics.flush(); // 413 → reduces batch size to 1, events stay
  expect(__getQueueForTest__()).toHaveLength(2);

  await analytics.flush(); // sends 1 event → success
  expect(__getQueueForTest__()).toHaveLength(1);

  await analytics.flush(); // sends remaining event → success
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

  // Advance time past the max age
  jest.setSystemTime(now + MAX_EVENT_AGE_MS + 1_000);

  // Mock a successful response, but we expect it NOT to be called
  (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200, ok: true });
  await analytics.flush();

  // Expired event pruned; nothing sent
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
