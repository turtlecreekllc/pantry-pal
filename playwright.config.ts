import { defineConfig, devices } from '@playwright/test';

/**
 * DinnerPlans Playwright E2E Test Configuration
 *
 * Run with:
 *   npx playwright test
 *
 * Prerequisites:
 *   1. Start the Expo web server:  npx expo start --web
 *   2. In a second terminal:       npx playwright test
 *
 * Or run in headed mode to watch:
 *   npx playwright test --headed
 *
 * To run a specific file:
 *   npx playwright test e2e/auth.spec.ts
 *
 * To run with UI:
 *   npx playwright test --ui
 */

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    // Expo web dev server URL
    baseURL: process.env.APP_URL || 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    // Mobile-sized viewport since this is a mobile-first app
    viewport: { width: 390, height: 844 },
    // Increase timeouts for slow React Native Web rendering
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // NOTE: If you want Playwright to automatically start the Expo web server,
  // uncomment this section. Requires `@expo/server` or similar.
  // webServer: {
  //   command: 'npx expo start --web',
  //   url: 'http://localhost:8081',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
