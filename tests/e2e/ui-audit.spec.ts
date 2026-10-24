import { test, expect, type Page } from '@playwright/test';
import { UI_MONTH } from './ui-month';

// Opt-in screenshot pass for before/after UI comparisons:
//   UI_AUDIT=before npx playwright test --project=ui
// Images land in ui-audit/<label>/ (git-ignored; Playwright wipes test-results/ each run).

// Tests are type-checked without Node types, so read the env through globalThis.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env;
const label = env?.UI_AUDIT;
test.skip(!label, 'Set UI_AUDIT=<label> to capture screenshots');

const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
];
const NAV_PAGES = [
  'Dashboard',
  'Savings',
  'Goals',
  'Insurance',
  'Projections',
  'Calendar',
  'Todos',
  'Notes',
  'Manage',
  'Settings',
];

async function shoot(page: Page, name: string, theme: string, width: number) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  await page.screenshot({
    path: `ui-audit/${label}/${theme}-${width}-${name}.png`,
    fullPage: true,
  });
}

for (const theme of ['dark', 'light']) {
  for (const viewport of VIEWPORTS) {
    test(`${theme} ${viewport.width}px`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.addInitScript((mode) => {
        localStorage.setItem('doggybag-theme-mode', mode);
      }, theme);
      await page.setViewportSize(viewport);

      await page.goto(`/month/${UI_MONTH}`);
      await expect(
        page.getByRole('heading', { name: 'Bills', exact: true, level: 2 })
      ).toBeVisible();
      await shoot(page, 'budget', theme, viewport.width);

      await page.getByRole('button', { name: 'Record payment' }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await shoot(page, 'record-payment', theme, viewport.width);
      await page.keyboard.press('Escape');

      // Client-side navigation keeps the seeded month selected.
      for (const name of NAV_PAGES) {
        await page.getByRole('link', { name, exact: true }).first().click();
        await shoot(page, name.toLowerCase(), theme, viewport.width);
      }
    });
  }
}
