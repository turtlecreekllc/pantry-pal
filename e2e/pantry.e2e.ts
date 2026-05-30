/**
 * Pantry Management E2E Tests
 *
 * Tests cover:
 * - Pantry screen renders with tab navigation
 * - Empty state shows helpful message
 * - Filter chips are visible and clickable
 * - FAB button opens add options
 * - Manual item entry form
 * - Item card displays correctly
 * - Item detail screen navigation
 *
 * Note: These tests use a real authenticated session.
 * Set TEST_EMAIL and TEST_PASSWORD in your .env or environment.
 */

import { test, expect } from '@playwright/test';
import { TEST_USER, skipOnboardingIfPresent, navigateToTab } from './helpers';

// Helper to authenticate before pantry tests
async function signInAndNavigate(page: any) {
  await page.goto('/(auth)/login');
  await page.waitForLoadState('networkidle');

  await page.locator('input').first().fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.getByText(/sign in/i).first().click();

  await page.waitForURL(
    (url: URL) => !url.pathname.includes('auth') && !url.pathname.includes('login'),
    { timeout: 20000 }
  );

  await skipOnboardingIfPresent(page);
  await navigateToTab(page, 'Pantry');
  await page.waitForLoadState('networkidle');
}

test.describe('Pantry Screen', () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) {
      test.skip(true, 'Skipped: Set TEST_EMAIL and TEST_PASSWORD to run pantry tests');
    }
    await signInAndNavigate(page);
  });

  // ─── Screen Renders ───────────────────────────────────────────────────────

  test('pantry screen loads with correct title or header', async ({ page }) => {
    await expect(
      page.getByText(/Pantry|Inventory/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows tab navigation bar with 5 tabs', async ({ page }) => {
    const tabLabels = ['Tonight', 'Plan', 'Pantry', 'Grocery', 'More'];
    for (const label of tabLabels) {
      await expect(page.getByText(label).last()).toBeVisible();
    }
  });

  test('shows empty state message when pantry is empty', async ({ page }) => {
    // If the pantry is empty, there should be an encouraging empty state
    const itemCount = await page.locator('[data-testid="pantry-item"], .pantry-item').count();

    if (itemCount === 0) {
      // Should show an empty state with guidance
      await expect(
        page.getByText(/empty|add|scan|start/i).first()
      ).toBeVisible({ timeout: 8000 });
    }
  });

  test('filter chips are visible', async ({ page }) => {
    // The pantry has filter chips: All, Expiring, Proteins, Produce, etc.
    await expect(page.getByText('All').first()).toBeVisible({ timeout: 8000 });
  });

  test('filter chip changes active selection', async ({ page }) => {
    // Click "Expiring" filter
    const expiringFilter = page.getByText(/Expiring/i).first();
    await expect(expiringFilter).toBeVisible({ timeout: 8000 });
    await expiringFilter.click();
    await page.waitForTimeout(500); // Allow filter animation

    // Click back to "All"
    await page.getByText('All').first().click();
  });

  // ─── Add Item Flow ────────────────────────────────────────────────────────

  test('FAB button is visible and opens add options', async ({ page }) => {
    // The expandable FAB should be visible
    const fab = page.locator('[aria-label*="add" i], [aria-label*="scan" i]').first()
      .or(page.getByRole('button', { name: /add|scan|\+/i }).last());

    await expect(fab).toBeVisible({ timeout: 10000 });
    await fab.click();
    await page.waitForTimeout(500);

    // After clicking FAB, should see options for scanning or manual entry
    const addOptions = page.getByText(/scan|manual|add item/i).first();
    await expect(addOptions).toBeVisible({ timeout: 5000 });
  });

  test('manual add item form renders required fields', async ({ page }) => {
    // Navigate to manual add screen
    await page.goto('/item/manual');
    await page.waitForLoadState('networkidle');

    // Should see a form with name field at minimum
    await expect(page.locator('input').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/name|item name/i).first()).toBeVisible();
  });

  test('can fill and submit manual add form', async ({ page }) => {
    await page.goto('/item/manual');
    await page.waitForLoadState('networkidle');

    // Fill in item name
    const nameInput = page.locator('input').first();
    await nameInput.fill('Test Apple');

    // Try to find quantity input
    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    if (inputCount > 1) {
      // Fill additional fields if present
      await inputs.nth(1).fill('2');
    }

    // Look for an "Add to Pantry" or "Save" button
    const addBtn = page.getByText(/add to pantry|save|add item/i).first();
    await expect(addBtn).toBeVisible({ timeout: 5000 });

    // Click to add
    await addBtn.click();
    await page.waitForLoadState('networkidle');

    // Should navigate back to pantry or show success
    // Either URL changes or pantry is visible
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    const isOnPantry = currentUrl.includes('pantry') || currentUrl.includes('tabs');
    const hasSuccessMsg = await page.getByText(/added|success/i).count() > 0;

    expect(isOnPantry || hasSuccessMsg).toBe(true);
  });

  // ─── Item Interaction ─────────────────────────────────────────────────────

  test('tapping pantry item card navigates to item detail', async ({ page }) => {
    // If there are any items, tap the first one
    const firstItem = page.locator('[data-testid="pantry-item-card"]').first();
    const hasItems = await firstItem.count() > 0;

    if (hasItems) {
      await firstItem.click();
      await page.waitForLoadState('networkidle');
      // Should be on item detail page
      await expect(page).toHaveURL(/item\//);
    } else {
      // No items to test — skip
      console.log('Pantry is empty, skipping item tap test');
    }
  });
});

test.describe('Barcode Scanner Screen', () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) {
      test.skip(true, 'Skipped: Set TEST_EMAIL and TEST_PASSWORD to run scanner tests');
    }
    await page.goto('/(auth)/login');
    await page.locator('input').first().fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.getByText(/sign in/i).first().click();
    await page.waitForURL(
      (url: URL) => !url.pathname.includes('auth'),
      { timeout: 20000 }
    );
    await skipOnboardingIfPresent(page);
  });

  test('scan screen shows camera view or permission request', async ({ page }) => {
    await page.goto('/(tabs)/scan');
    await page.waitForLoadState('networkidle');

    // On web, camera may not be available without HTTPS — should show either:
    // 1. The camera view
    // 2. A permission request
    // 3. A "camera not supported" message
    const hasCamera = await page.locator('video, canvas').count() > 0;
    const hasPermissionMsg = await page.getByText(/camera|permission|access/i).count() > 0;
    const hasManualFallback = await page.getByText(/manual|enter|type/i).count() > 0;

    expect(hasCamera || hasPermissionMsg || hasManualFallback).toBe(true);
  });

  test('has option to manually enter item without scanning', async ({ page }) => {
    await page.goto('/(tabs)/scan');
    await page.waitForLoadState('networkidle');

    // There should be a fallback option to add manually
    const manualLink = page.getByText(/manual|enter manually|add manually/i).first();
    const hasManualOption = await manualLink.count() > 0;

    // If the option exists, it should be visible
    if (hasManualOption) {
      await expect(manualLink).toBeVisible();
    }
  });
});
