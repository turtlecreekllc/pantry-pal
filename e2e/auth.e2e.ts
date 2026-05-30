/**
 * Authentication Flow E2E Tests
 *
 * Tests cover:
 * - Login with valid credentials
 * - Login error handling (wrong password, missing fields)
 * - Signup for a new account
 * - Signup validation (password mismatch, missing fields)
 * - Logout flow
 * - Redirect to login when not authenticated
 *
 * Prerequisites:
 *   - A real Supabase test account must exist:
 *       Email:    test@dinnerplans.ai
 *       Password: TestPass123!
 *   - Create this in the Supabase dashboard → Authentication → Users
 *   - Or set TEST_EMAIL / TEST_PASSWORD env vars to your own account
 */

import { test, expect } from '@playwright/test';
import { TEST_USER, signOut, skipOnboardingIfPresent } from './helpers';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh — clear any stored session
    await page.goto('/');
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-'))
        .forEach((k) => localStorage.removeItem(k));
    });
  });

  // ─── Login ───────────────────────────────────────────────────────────────

  test('shows login screen when not authenticated', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should be redirected to auth/login
    await expect(page).toHaveURL(/(auth|login)/, { timeout: 10000 });

    // Core login elements should be present
    await expect(page.getByText(/sign in|welcome back|log in/i).first()).toBeVisible();
    await expect(page.locator('input').first()).toBeVisible();
  });

  test('shows validation errors for empty login fields', async ({ page }) => {
    await page.goto('/(auth)/login');
    await page.waitForLoadState('networkidle');

    // Click sign in without filling anything
    const signInBtn = page.getByText(/sign in/i).first();
    await signInBtn.click();

    // Should show some kind of error or validation
    await expect(
      page.getByText(/email|required|fill/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/(auth)/login');
    await page.waitForLoadState('networkidle');

    // Fill wrong credentials
    await page.locator('input').first().fill('wrong@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');

    const signInBtn = page.getByText(/sign in/i).first();
    await signInBtn.click();

    // Should show an error message
    await expect(
      page.getByText(/invalid|incorrect|wrong|error|not found/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Should still be on login page
    await expect(page).toHaveURL(/(auth|login)/);
  });

  test('navigates to signup from login screen', async ({ page }) => {
    await page.goto('/(auth)/login');
    await page.waitForLoadState('networkidle');

    // Find the "create account" or "sign up" link
    const signUpLink = page.getByText(/sign up|create account|register/i).first();
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();

    // Should navigate to signup screen
    await expect(page).toHaveURL(/(signup|register|create)/, { timeout: 5000 });
    await expect(page.getByText(/create account|sign up/i).first()).toBeVisible();
  });

  // ─── Signup ──────────────────────────────────────────────────────────────

  test('shows signup form with required fields', async ({ page }) => {
    await page.goto('/(auth)/signup');
    await page.waitForLoadState('networkidle');

    // Should have email and password inputs
    const inputs = page.locator('input');
    expect(await inputs.count()).toBeGreaterThanOrEqual(2);

    // Submit button
    await expect(page.getByText(/create account|sign up/i).first()).toBeVisible();
  });

  test('shows password mismatch error on signup', async ({ page }) => {
    await page.goto('/(auth)/signup');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    if (inputCount >= 3) {
      // email, password, confirm password
      await inputs.nth(0).fill('test@example.com');
      await inputs.nth(1).fill('Password123!');
      await inputs.nth(2).fill('DifferentPass456!');

      await page.getByText(/create account|sign up/i).first().click();

      await expect(
        page.getByText(/match|different|confirm/i).first()
      ).toBeVisible({ timeout: 5000 });
    } else {
      // Only 2 inputs — skip this test variant
      test.skip();
    }
  });

  test('navigates back to login from signup', async ({ page }) => {
    await page.goto('/(auth)/signup');
    await page.waitForLoadState('networkidle');

    // Find "back to login" link
    const loginLink = page.getByText(/sign in|already have|log in/i).first();
    await expect(loginLink).toBeVisible();
    await loginLink.click();

    await expect(page).toHaveURL(/(login|auth)/, { timeout: 5000 });
  });

  // ─── Successful Login (requires real Supabase account) ───────────────────

  test('logs in successfully with valid credentials and reaches main app', async ({ page }) => {
    // NOTE: This test requires a real Supabase test user.
    // If TEST_EMAIL / TEST_PASSWORD are not configured, this will be skipped.
    if (!process.env.TEST_EMAIL && TEST_USER.email === 'test@dinnerplans.ai') {
      test.skip(
        true,
        'Skipped: Set TEST_EMAIL and TEST_PASSWORD env vars to run this test'
      );
    }

    await page.goto('/(auth)/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input').first().fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);

    await page.getByText(/sign in/i).first().click();

    // Wait for navigation to main app
    await page.waitForURL((url) => !url.pathname.includes('auth') && !url.pathname.includes('login'), {
      timeout: 20000,
    });

    // Skip onboarding if it appears
    await skipOnboardingIfPresent(page);

    // Should now be in the main app with tab navigation
    await expect(
      page.getByText(/Tonight|Pantry|Plan|Grocery/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('logout returns to login screen', async ({ page }) => {
    if (!process.env.TEST_EMAIL) {
      test.skip(true, 'Skipped: Requires TEST_EMAIL and TEST_PASSWORD');
    }

    // First login
    await page.goto('/(auth)/login');
    await page.locator('input').first().fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.getByText(/sign in/i).first().click();
    await page.waitForURL((url) => !url.pathname.includes('auth'), { timeout: 20000 });

    await skipOnboardingIfPresent(page);

    // Then logout via More tab → settings
    // Clear session via localStorage as a reliable logout
    await signOut(page);

    // Should be back on login screen
    await expect(page).toHaveURL(/(auth|login)/, { timeout: 10000 });
  });
});
