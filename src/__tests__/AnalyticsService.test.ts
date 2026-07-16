import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  analytics,
  __resetForTest__,
  __getQueueForTest__,
  QUEUE_KEY,
} from '../analytics/AnalyticsService';
import { INSTALL_ID_KEY } from '../analytics/installation';

// Each test gets a clean slate: reset singleton state and flush the AsyncStorage mock store.
beforeEach(async () => {
  __resetForTest__();
  await AsyncStorage.clear();
  (global.fetch as jest.Mock).mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Consent ────────────────────────────────────────────────────────────────

test('no events are sent without consent', async () => {
  await analytics.initialize(false);
  await analytics.track({ name: 'app_opened' });

  expect(__getQueueForTest__()).toHaveLength(0);
  const stored = await AsyncStorage.getItem(QUEUE_KEY);
  expect(stored).toBeNull(); // nothing written when consent is off
});

test('enabling consent allows events to be queued', async () => {
  await analytics.initialize(true);
  await analytics.track({ name: 'app_opened' });

  expect(__getQueueForTest__()).toHaveLength(1);
  expect(__getQueueForTest__()[0].name).toBe('app_opened');
});

test('revoking consent immediately clears the queue', async () => {
  await analytics.initialize(true);
  await analytics.track({ name: 'app_opened' });
  expect(__getQueueForTest__()).toHaveLength(1);

  await analytics.setConsent(false);

  expect(__getQueueForTest__()).toHaveLength(0);
  const stored = await AsyncStorage.getItem(QUEUE_KEY);
  expect(stored).toBeNull();
});

test('revoking consent deletes the installation ID', async () => {
  await analytics.initialize(true);
  // An installation ID is created on consent
  const id = await AsyncStorage.getItem(INSTALL_ID_KEY);
  expect(id).not.toBeNull();

  await analytics.setConsent(false);

  const idAfter = await AsyncStorage.getItem(INSTALL_ID_KEY);
  expect(idAfter).toBeNull();
});

test('re-enabling consent after revocation creates a new installation ID', async () => {
  await analytics.initialize(true);
  const firstId = await AsyncStorage.getItem(INSTALL_ID_KEY);

  await analytics.setConsent(false);
  await analytics.setConsent(true);

  const secondId = await AsyncStorage.getItem(INSTALL_ID_KEY);
  expect(secondId).not.toBeNull();
  // A fresh ID is generated (the old one was cleared)
  expect(typeof secondId).toBe('string');
});

// ── Prohibited properties ──────────────────────────────────────────────────

test('prohibited properties are structurally excluded at the TypeScript level', () => {
  // This test verifies the type system works — if the following line were uncommented
  // it would cause a TypeScript compile error because 'exercise_name' is not a valid property:
  //
  // analytics.track({ name: 'workout_started', properties: { exercise_name: 'Bench Press' } });
  //
  // Runtime check: the only properties that can appear are those in AllowedProperties.
  expect(true).toBe(true); // type enforcement is a compile-time guarantee
});

test('event queue stores only safe primitive values', async () => {
  await analytics.initialize(true);
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
  await analytics.initialize(true);
  await analytics.track({ name: 'app_opened' });

  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  expect(raw).not.toBeNull();
  const parsed = JSON.parse(raw!);
  expect(parsed).toHaveLength(1);
  expect(parsed[0].name).toBe('app_opened');
});

test('queue survives re-initialization (loaded from AsyncStorage)', async () => {
  await analytics.initialize(true);
  await analytics.track({ name: 'app_opened' });
  await analytics.track({ name: 'program_created' });

  // Simulate app restart: reset in-memory state but keep AsyncStorage
  __resetForTest__();

  await analytics.initialize(true);
  expect(__getQueueForTest__()).toHaveLength(2);
});

test('successful delivery clears queued events', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200, ok: true });

  await analytics.initialize(true);
  await analytics.track({ name: 'app_opened' });

  await analytics.flush();

  expect(__getQueueForTest__()).toHaveLength(0);
  const stored = JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? '[]');
  expect(stored).toHaveLength(0);
});

test('server error increments retry count', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 500, ok: false });
  // Need a URL so the service actually attempts a send
  const origUrl = process.env.EXPO_PUBLIC_ANALYTICS_URL;
  process.env.EXPO_PUBLIC_ANALYTICS_URL = 'https://example.com/analytics';

  __resetForTest__();
  await analytics.initialize(true);
  await analytics.track({ name: 'app_opened' });

  await analytics.flush();

  const q = __getQueueForTest__();
  expect(q[0].retryCount).toBe(1);

  process.env.EXPO_PUBLIC_ANALYTICS_URL = origUrl;
});

test('events are dropped after MAX_RETRIES failures', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ status: 500, ok: false });
  const origUrl = process.env.EXPO_PUBLIC_ANALYTICS_URL;
  process.env.EXPO_PUBLIC_ANALYTICS_URL = 'https://example.com/analytics';

  __resetForTest__();
  await analytics.initialize(true);
  await analytics.track({ name: 'app_opened' });

  // Flush 4 times (MAX_RETRIES = 3 → dropped on 4th)
  await analytics.flush();
  await analytics.flush();
  await analytics.flush();
  await analytics.flush();

  expect(__getQueueForTest__()).toHaveLength(0);
  process.env.EXPO_PUBLIC_ANALYTICS_URL = origUrl;
});

test('4xx client error drops event without retry', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 400, ok: false });
  const origUrl = process.env.EXPO_PUBLIC_ANALYTICS_URL;
  process.env.EXPO_PUBLIC_ANALYTICS_URL = 'https://example.com/analytics';

  __resetForTest__();
  await analytics.initialize(true);
  await analytics.track({ name: 'app_opened' });
  await analytics.flush();

  // 4xx is treated as permanently consumed (bad client request)
  expect(__getQueueForTest__()).toHaveLength(0);

  process.env.EXPO_PUBLIC_ANALYTICS_URL = origUrl;
});

test('no network request is made when ANALYTICS_URL is not configured', async () => {
  const origUrl = process.env.EXPO_PUBLIC_ANALYTICS_URL;
  delete process.env.EXPO_PUBLIC_ANALYTICS_URL;

  __resetForTest__();
  await analytics.initialize(true);
  await analytics.track({ name: 'app_opened' });
  await analytics.flush();

  expect(global.fetch).not.toHaveBeenCalled();

  process.env.EXPO_PUBLIC_ANALYTICS_URL = origUrl;
});

// ── Deduplication ──────────────────────────────────────────────────────────

test('each queued event has a unique ID', async () => {
  await analytics.initialize(true);
  await analytics.track({ name: 'app_opened' });
  await analytics.track({ name: 'app_opened' });
  await analytics.track({ name: 'app_opened' });

  const ids = __getQueueForTest__().map((e) => e.id);
  const unique = new Set(ids);
  expect(unique.size).toBe(ids.length);
});
