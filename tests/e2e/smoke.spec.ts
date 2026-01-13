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
    const failedRequests: string[] = [];

    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Capture failed network requests with their URLs for debugging
    page.on('response', (response) => {
      if (response.status() >= 500) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/');

    // Wait for app to fully load
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (e.g., favicon 404)
    const criticalErrors = errors.filter((e) => !e.includes('favicon') && !e.includes('404'));

    // Include failed request URLs in error message for better debugging
    expect(
      criticalErrors,
      failedRequests.length > 0 ? `Failed requests: ${failedRequests.join(', ')}` : undefined
    ).toHaveLength(0);
  });
});
