import { test, expect, type Locator, type Page } from '@playwright/test';
import { UI_MONTH } from './ui-month';

// Geometry checks for the alignment bugs found in the October 2026 UI review.
// Each one measures rendered boxes, so it guards against centreline drift that
// unit tests cannot see.

const TOLERANCE = 1.5;

async function openBudget(page: Page) {
  await page.goto(`/month/${UI_MONTH}`);
  await expect(page.getByRole('heading', { name: 'Bills', exact: true, level: 2 })).toBeVisible();
}

async function centreY(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element has no box');
  return box.y + box.height / 2;
}

test('payment rows keep their content on the row centreline', async ({ page }) => {
  await openBudget(page);
  const rows = page.locator('.occurrence-row');
  expect(await rows.count()).toBeGreaterThan(2);

  for (const row of await rows.all()) {
    const rowBox = await row.boundingBox();
    if (!rowBox) continue;
    const rowCentre = rowBox.y + rowBox.height / 2;
    for (const child of await row.locator(':scope > *').all()) {
      const box = await child.boundingBox();
      if (!box || box.height === 0) continue;
      expect(Math.abs(box.y + box.height / 2 - rowCentre)).toBeLessThanOrEqual(TOLERANCE);
    }
  }
});

test('amounts line up in one column within each category', async ({ page }) => {
  await openBudget(page);
  const category = page.locator('[data-category]').first();
  for (const column of ['expected', 'paid']) {
    const cells = category.locator(`[data-col="${column}"]`);
    expect(await cells.count()).toBeGreaterThan(2);
    const rightEdges = new Set<number>();
    for (const cell of await cells.all()) {
      const box = await cell.boundingBox();
      if (box) rightEdges.add(Math.round(box.x + box.width));
    }
    expect([...rightEdges]).toHaveLength(1);
  }
});

test('the month title is centred in the header', async ({ page }) => {
  await openBudget(page);
  const header = page.locator('.month-picker-header');
  const title = header.locator('h1');
  const headerBox = await header.boundingBox();
  const titleBox = await title.boundingBox();
  expect(headerBox && titleBox).toBeTruthy();
  const headerCentre = headerBox!.x + headerBox!.width / 2;
  const titleCentre = titleBox!.x + titleBox!.width / 2;
  expect(Math.abs(titleCentre - headerCentre)).toBeLessThanOrEqual(2);
});

test('the summary sidebar stays below the sticky header when scrolled', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await openBudget(page);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(200);
  const headerBox = await page.locator('.month-picker-header').boundingBox();
  const sidebarBox = await page.locator('.summary-sidebar').boundingBox();
  expect(sidebarBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
});

test('every navigation link is reachable in an 800×600 window', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await openBudget(page);
  // Any part of the nav that overflows must be a real scroll container.
  const clipped = await page.locator('nav.sidebar').evaluate((nav) =>
    [nav, ...nav.querySelectorAll('*')].some((element) => {
      const overflow = getComputedStyle(element).overflowY;
      return (
        element.scrollHeight > element.clientHeight + 1 &&
        overflow !== 'auto' &&
        overflow !== 'scroll'
      );
    })
  );
  expect(clipped).toBe(false);

  const settings = page.getByRole('link', { name: 'Settings', exact: true });
  await settings.scrollIntoViewIfNeeded();
  const box = await settings.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(600);
});

// Dialog fields, selects and footer buttons share one height, and the close
// button sits on the title's centreline.
async function expectDialogAligned(page: Page) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // Measure after the open animation (it scales the dialog from 95%).
  await dialog.evaluate((element) =>
    Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished))
  );

  // An AmountInput is measured by its bordered box, not the field inside it.
  const controls = dialog.locator(
    'input:not([type="radio"], [type="checkbox"], .amount-input input), .amount-input, select, footer button'
  );
  const heights = new Set<number>();
  for (const control of await controls.all()) {
    const box = await control.boundingBox();
    if (box) heights.add(Math.round(box.height));
  }
  expect([...heights]).toHaveLength(1);

  const close = dialog.getByRole('button', { name: 'Close' });
  const title = dialog.getByRole('heading').first();
  expect(Math.abs((await centreY(close)) - (await centreY(title)))).toBeLessThanOrEqual(TOLERANCE);
}

test('record payment dialog controls share one height', async ({ page }) => {
  await openBudget(page);
  await page.getByRole('button', { name: 'Record payment' }).first().click();
  await expectDialogAligned(page);
});

test('add bill dialog controls share one height', async ({ page }) => {
  await openBudget(page);
  await page.getByRole('button', { name: 'Add bill', exact: true }).click();
  await expectDialogAligned(page);
});
