// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Sentry so the analytics service's captureMessage() calls are interceptable
// without hitting the real SDK. The mock is reset per-test via jest.clearAllMocks()
// or manual .mockClear() calls where deduplication is under test.
jest.mock('@sentry/react-native', () => ({
  __esModule: true,
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  init: jest.fn(),
  wrap: (Component) => Component,
  withScope: jest.fn(),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: '1.0.0',
      android: { versionCode: 1 },
    },
  },
}));

// Mock react-native Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'android',
  Version: 34,
  select: (spec) => spec.android ?? spec.default,
}));

// Silence console.log in tests (MockFeedbackService logs in __DEV__)
global.__DEV__ = true;

// Global fetch mock — override per test as needed
global.fetch = jest.fn();
