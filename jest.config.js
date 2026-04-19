/**
 * Jest Configuration for DinnerPlans.ai
 */
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-iap|@supabase/.*)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'context/**/*.{ts,tsx}',
    // components/ excluded: React Native components require TurboModules
    // (camera, IAP, biometrics) that crash Jest — covered by E2E tests instead
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 20,
      lines: 20,
      statements: 20,
    },
  },
  testMatch: [
    '**/__tests__/**/*.(spec|test).[jt]s?(x)',
    '**/*.(spec|test).[jt]s?(x)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/@expo/vector-icons.js',
    '^expo-asset$': '<rootDir>/__mocks__/expo-asset.js',
    '^expo-font$': '<rootDir>/__mocks__/expo-font.js',
    '^react-native-safe-area-context$': '<rootDir>/__mocks__/react-native-safe-area-context.js',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/e2e/', // Playwright e2e tests - run via npm run test:e2e
  ],
  verbose: true,
};

