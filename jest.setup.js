// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

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
