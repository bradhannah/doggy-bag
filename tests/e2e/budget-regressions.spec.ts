import { test, expect, type Page } from '@playwright/test';

const now = new Date();
const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
const nextMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;

async function savingsFixture(page: Page, missing = false) {
  const writes: Record<string, unknown>[] = [];
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/api/payment-sources') {
      return route.fulfill({
        json: [
          {
            id: 'savings',
            name: 'Emergency fund',
            type: 'bank_account',
            is_savings: true,
            is_active: true,
          },
        ],
      });
    }
    if (url.pathname.endsWith('/push-savings-balances')) {
      const body = route.request().postDataJSON();
      writes.push(body);
      return route.fulfill({
        json: { destinationMonth: nextMonth, requiresConfirmation: !body.overwrite },
      });
    }
    if (url.pathname === `/api/months/${month}/savings`) {
      return route.fulfill({
        json: {
          month,
          exists: !missing,
          is_read_only: false,
          spending_accounts: [{ id: 'checking', name: 'Checking' }],
          accounts: [
            {
              id: 'savings',
              name: 'Emergency fund',
              is_active: true,
              is_investment: false,
              start: 100000,
              end: 0,
              planned: 20000,
              recorded: 0,
              entries: [],
            },
          ],
        },
      });
    }
    return route.fulfill({ status: 404, json: { error: 'Monthly data not found' } });
  });
  return writes;
}

test('Enter on Cancel cancels a balance overwrite', async ({ page }) => {
  const writes = await savingsFixture(page);
  await page.goto('/savings');
  await expect(page.getByRole('textbox', { name: 'Emergency fund final balance' })).toHaveValue(
    '0.00'
  );
  await page.getByRole('button', { name: 'Push Final to Next Month' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
  await expect(cancel).toBeFocused();
  await cancel.press('Enter');
  await expect(dialog).toBeHidden();
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ finalBalances: { savings: 0 }, overwrite: false });
});

test('a missing Savings month offers an actionable creation state', async ({ page }) => {
  await savingsFixture(page, true);
  await page.goto('/savings');
  await expect(page.getByRole('button', { name: 'Create Month', exact: true })).toBeVisible();
  await expect(page.getByText('Month Not Created', { exact: true })).toBeVisible();
});
