import { test, expect } from '@playwright/test';
import { verifyGoalLifecycle } from './goal-lifecycle';
import { verifyRecurringReview } from './recurring-review';

// These flows share the disposable API's account list and must not add required
// balances while another flow is asserting its available-budget preview.
test.describe.configure({ mode: 'serial' });

test('a savings plan added after budget creation is reviewed, recorded, and reflected in Savings', async ({
  page,
  request,
}) => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const checkingResponse = await request.post('/api/payment-sources', {
    data: { name: 'Workflow Checking', type: 'bank_account' },
  });
  expect(checkingResponse.status()).toBe(201);
  const checking = await checkingResponse.json();
  const savingsResponse = await request.post('/api/payment-sources', {
    data: { name: 'Workflow Emergency Fund', type: 'bank_account', is_savings: true },
  });
  expect(savingsResponse.status()).toBe(201);
  const account = await savingsResponse.json();
  expect((await request.post(`/api/months/${month}/generate`, { data: {} })).status()).toBe(201);
  expect(
    (
      await request.put(`/api/months/${month}/bank-balances`, { data: { [checking.id]: 100000 } })
    ).ok()
  ).toBe(true);

  await page.goto(`/month/${month}`);
  await page.getByRole('link', { name: 'Savings totals', exact: true }).click();
  await expect(page).toHaveURL(/\/savings$/);
  await page.getByRole('button', { name: 'Plan a transfer', exact: true }).click();
  const planner = page.getByRole('dialog', { name: 'Plan a savings transfer' });
  await planner.getByLabel('Savings or investment account').selectOption(account.id);
  await planner.getByLabel('From spending account').selectOption(checking.id);
  await planner.getByRole('spinbutton', { name: 'Amount ($)' }).fill('200.00');
  await planner.getByRole('button', { name: 'Save recurring plan' }).click();

  const review = page.getByRole('dialog', { name: 'Review budget updates' });
  const addition = review.getByRole('checkbox', {
    name: 'Add Savings: Workflow Emergency Fund',
    exact: true,
  });
  await expect(addition).toBeChecked();
  await expect(review.getByText('$800.00', { exact: true })).toBeVisible();
  await review.getByRole('button', { name: 'Apply selected updates' }).click();
  await expect(review).toBeHidden();
  const initial = await (await request.get(`/api/months/${month}`)).json();
  expect(
    initial.bill_instances.filter(
      (item: { savings_account_id?: string }) => item.savings_account_id === account.id
    )
  ).toHaveLength(1);

  await page.getByRole('link', { name: 'Open this month’s Budget', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Savings: Workflow Emergency Fund', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Record payment', exact: true }).first().click();
  await page
    .getByRole('dialog', { name: 'Record payment' })
    .getByRole('button', { name: 'Record payment $200.00', exact: true })
    .click();
  await expect(page.getByRole('dialog', { name: 'Record payment' })).toBeHidden();
  await page.getByRole('link', { name: 'Savings totals', exact: true }).click();
  const row = page
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: /Workflow Emergency Fund/ }) });
  await expect(row.locator('td').nth(1)).toHaveText('$200.00');
  await expect(row.locator('td').nth(2)).toHaveText('$200.00');
  const summary = await (await request.get(`/api/months/${month}/savings`)).json();
  expect(summary.accounts.find((item: { id: string }) => item.id === account.id)).toMatchObject({
    planned: 20000,
    recorded: 20000,
  });
  const preview = await (await request.get(`/api/months/${month}/budget-updates`)).json();
  expect(preview.items).toHaveLength(0);
});

test(
  'goal pause/resume/completion preserve records and Budget fits laptop widths in both themes',
  verifyGoalLifecycle
);

test(
  'review explicitly replaces a monthly override and applies its selected date',
  verifyRecurringReview
);
