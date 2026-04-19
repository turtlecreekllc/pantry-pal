/**
 * E2E Test Helpers for DinnerPlans Playwright Tests
 *
 * Utilities for:
 * - Auth state management (inject/clear session)
 * - Navigation helpers
 * - Element selectors for React Native Web components
 * - Common assertions
 */

import { Page, expect } from '@playwright/test';

// ─── Config ─────────────────────────────────────────────────────────────────

export const TEST_USER = {
  email: process.env.TEST_EMAIL || 'test@dinnerplans.ai',
  password: process.env.TEST_PASSWORD || 'TestPass123!',
};

// The Supabase project ref is extracted from the URL
// URL: https://hmqphrhwplppnxknjnxy.supabase.co
const SUPABASE_PROJECT_REF = 'hmqphrhwplppnxknjnxy';
const SUPABASE_AUTH_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;

// ─── Auth Helpers ────────────────────────────────────────────────────────────

/**
 * Sign in via the login UI form.
 * Navigates to login page, fills credentials, submits, waits for redirect.
 */
export async function signInViaUI(
  page: Page,
  email: string = TEST_USER.email,
  password: string = TEST_USER.password
): Promise<void> {
  await page.goto('/');
  // Wait for either auth redirect or login screen
  await page.waitForLoadState('networkidle');

  // If already signed in, sign out first
  const isAtLogin = await page.url().then((url) => url.includes('login') || url.includes('auth'));
  if (!isAtLogin) {
    // Already logged in — sign out and re-login
    await signOut(page);
  }

  await page.goto('/(auth)/login');
  await page.waitForLoadState('networkidle');

  // Fill email
  const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[placeholder*="Email" i]').first();
  await emailInput.fill(email);

  // Fill password
  const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i], input[placeholder*="Password" i]').first();
  await passwordInput.fill(password);

  // Click sign in button
  const signInBtn = page.getByText(/sign in|log in|login/i).first();
  await signInBtn.click();

  // Wait for navigation away from auth screen
  await page.waitForURL((url) => !url.pathname.includes('auth') && !url.pathname.includes('login'), {
    timeout: 15000,
  });
}

/**
 * Sign out by clearing Supabase auth from localStorage.
 * Faster than navigating through the UI.
 */
export async function signOut(page: Page): Promise<void> {
  await page.evaluate((key) => {
    localStorage.removeItem(key);
    // Also clear any related keys
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-'))
      .forEach((k) => localStorage.removeItem(k));
  }, SUPABASE_AUTH_KEY);
  await page.reload();
  await page.waitForLoadState('networkidle');
}

/**
 * Inject a mock Supabase session into localStorage.
 * Useful for testing authenticated screens without real credentials.
 * Note: API calls to Supabase will still fail — use for UI-only tests.
 */
export async function injectMockSession(page: Page): Promise<void> {
  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'test-user-id-12345',
      email: TEST_USER.email,
      aud: 'authenticated',
      role: 'authenticated',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
  };

  await page.addInitScript(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
    },
    { key: SUPABASE_AUTH_KEY, session: mockSession }
  );
}

// ─── Navigation Helpers ───────────────────────────────────────────────────────

/**
 * Wait for the app to be fully loaded (past splash, past onboarding if any)
 */
export async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Wait for any loading spinners to disappear
  const spinner = page.locator('[data-testid="loading"], [aria-label="loading"]');
  if (await spinner.count() > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 10000 });
  }
}

/**
 * Navigate to a tab by its label text
 */
export async function navigateToTab(page: Page, tabLabel: string): Promise<void> {
  // Tab bar items are typically accessible by their text label
  const tab = page.getByText(tabLabel, { exact: true }).last();
  await tab.click();
  await page.waitForLoadState('networkidle');
}

// ─── Element Selectors ────────────────────────────────────────────────────────

/**
 * Get a React Native Text element by its content
 * On web, RN Text renders as <div> or <span> with the role="text" or no role
 */
export function getTextElement(page: Page, text: string) {
  return page.getByText(text);
}

/**
 * Get a touchable/button by its accessible label or text
 */
export function getButton(page: Page, labelOrText: string) {
  return page.getByRole('button', { name: labelOrText })
    .or(page.getByText(labelOrText));
}

// ─── Common Assertions ────────────────────────────────────────────────────────

/**
 * Assert that the app is showing the main tab navigation
 * (i.e., the user is logged in and past onboarding)
 */
export async function assertMainAppVisible(page: Page): Promise<void> {
  // At least one of the main tab labels should be visible
  const tabLabels = ['Tonight', 'Plan', 'Pantry', 'Grocery', 'More'];
  let found = false;
  for (const label of tabLabels) {
    const el = page.getByText(label);
    if (await el.count() > 0) {
      found = true;
      break;
    }
  }
  expect(found).toBe(true);
}

/**
 * Assert that the login screen is visible
 */
export async function assertLoginVisible(page: Page): Promise<void> {
  await expect(
    page.getByText(/sign in|log in|welcome back/i).first()
  ).toBeVisible({ timeout: 10000 });
}

/**
 * Skip onboarding if it appears on first launch
 */
export async function skipOnboardingIfPresent(page: Page): Promise<void> {
  // Look for common onboarding indicators
  const onboardingText = page.getByText(/get started|skip|let's go|welcome to/i).first();
  if (await onboardingText.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Find and click skip or a "continue" button
    const skipBtn = page.getByText(/skip|get started|let's go/i).first();
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click();
      await page.waitForLoadState('networkidle');
    }
  }
}
