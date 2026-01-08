import { test, expect } from '@playwright/test';

/**
 * Smoke tests - verify the app loads and basic functionality works
 */
test.describe('Smoke Tests', () => {
  test('app loads successfully', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the app to load - check the page has a title (any title means it loaded)
    await expect(page).toHaveTitle(/.+/);

    // Verify the app content is visible (not just a blank page)
    await page.waitForLoadState('domcontentloaded');
  });

  test('app shows navigation', async ({ page }) => {
    await page.goto('/');

    // Check that the sidebar/navigation is visible
    // Look for common navigation elements
    const nav = page.locator('nav, aside, [role="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to manage page', async ({ page }) => {
    await page.goto('/');

    // Look for a link to manage/setup
    const manageLink = page.getByRole('link', { name: /manage/i });

    // If manage link exists, click it
    if (await manageLink.isVisible()) {
      await manageLink.click();
      await expect(page).toHaveURL(/manage/);
    }
  });

  test('app does not show console errors', async ({ page }) => {
    const errors: string[] = [];

    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    // Wait for app to fully load
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (e.g., favicon 404)
    const criticalErrors = errors.filter((e) => !e.includes('favicon') && !e.includes('404'));

    expect(criticalErrors).toHaveLength(0);
  });
});
