import { test, expect, type APIRequestContext } from '@playwright/test';

// An unfinished payment can be carried into the next month from the row menu,
// even once the month is locked. The month is far from "now" so nothing else
// generates it, and it is not the month the layout checks seed.
const MONTH = '2031-03';
const NEXT = '2031-04';

async function seed(request: APIRequestContext) {
  const checking = await (
    await request.post('/api/payment-sources', {
      data: { name: 'Move Checking', type: 'bank_account' },
    })
  ).json();
  const category = await (
    await request.post('/api/categories', {
      data: { name: 'Move Income', type: 'income', color: '#22c55e', sort_order: 0 },
    })
  ).json();
  expect((await request.post(`/api/months/${MONTH}/generate`, { data: {} })).status()).toBe(201);
  const adhoc = await request.post(`/api/months/${MONTH}/adhoc/incomes`, {
    data: { name: 'Travel reimbursement', amount: 100000, category_id: category.id },
  });
  expect(adhoc.status()).toBe(201);
  expect((await request.post(`/api/months/${MONTH}/lock`, { data: {} })).ok()).toBe(true);
  return checking.id as string;
}

test('a locked month still offers "Move to next month" on an open payment', async ({
  page,
  request,
}) => {
  await seed(request);
  await page.goto(`/month/${MONTH}`);
  await expect(page.getByRole('heading', { name: 'Income', exact: true, level: 2 })).toBeVisible();

  await page.getByRole('button', { name: 'More options for Travel reimbursement' }).click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: 'Move to next month…' })).toBeVisible();
  // The lock still hides ordinary edits.
  await expect(menu.getByRole('menuitem', { name: 'Edit plan' })).toHaveCount(0);
  await menu.getByRole('menuitem', { name: 'Move to next month…' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('April 2031');
  await dialog.getByRole('button', { name: 'Move', exact: true }).click();

  await expect(page.getByText('Travel reimbursement', { exact: true })).toHaveCount(0);

  const next = await (await request.get(`/api/months/${NEXT}`)).json();
  const moved = next.income_instances.find(
    (instance: { name?: string }) => instance.name === 'Travel reimbursement (Mar)'
  );
  expect(moved).toBeDefined();
  expect(moved.is_adhoc).toBe(true);
  expect(moved.occurrences[0]).toMatchObject({ expected_amount: 100000, is_closed: false });

  const source = await (await request.get(`/api/months/${MONTH}`)).json();
  expect(source.is_read_only).toBe(true);
  expect(
    source.income_instances.some(
      (instance: { name?: string }) => instance.name === 'Travel reimbursement'
    )
  ).toBe(false);
});
