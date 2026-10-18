import { expect, type Page, type APIRequestContext } from '@playwright/test';

export async function verifyGoalLifecycle({
  page,
  request,
}: {
  page: Page;
  request: APIRequestContext;
}) {
  const date = new Date();
  const target = new Date(date.getFullYear(), date.getMonth() + 6, 1);
  const month = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
  const checking = await (
    await request.post('/api/payment-sources', {
      data: { name: 'Lifecycle Checking', type: 'bank_account' },
    })
  ).json();
  const savings = await (
    await request.post('/api/payment-sources', {
      data: { name: 'Lifecycle Savings', type: 'bank_account', is_savings: true },
    })
  ).json();
  const goalResponse = await request.post('/api/savings-goals', {
    data: { name: 'Lifecycle Emergency Fund', linked_account_id: savings.id, status: 'saving' },
  });
  expect(goalResponse.status()).toBe(201);
  const goal = await goalResponse.json();
  const category = await (await request.post('/api/categories/ensure-goals')).json();
  expect(
    (
      await request.post('/api/bills', {
        data: {
          name: 'Lifecycle Contribution',
          amount: 10000,
          billing_period: 'monthly',
          day_of_month: 20,
          effective_from: `${month}-01`,
          start_date: `${month}-01`,
          goal_id: goal.id,
          savings_account_id: savings.id,
          payment_source_id: checking.id,
          category_id: category.id,
        },
      })
    ).status()
  ).toBe(201);
  expect((await request.post(`/api/months/${month}/generate`, { data: {} })).status()).toBe(201);
  await request.put(`/api/months/${month}/bank-balances`, { data: { [checking.id]: 100000 } });
  const initial = await (await request.get(`/api/months/${month}`)).json();
  const instance = initial.bill_instances.find(
    (item: { goal_id?: string }) => item.goal_id === goal.id
  );
  expect(
    (
      await request.post(
        `/api/months/${month}/bills/${instance.id}/occurrences/${instance.occurrences[0].id}/split`,
        {
          data: {
            paid_amount: 3000,
            closed_date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
          },
        }
      )
    ).ok()
  ).toBe(true);

  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto(`/month/${month}`);
  await expect(
    page.getByRole('button', { name: 'Lifecycle Contribution', exact: true })
  ).toBeVisible();
  for (const theme of ['dark', 'light']) {
    await page.evaluate(async (mode) => {
      const modulePath = '/src/stores/theme.ts';
      const { themeMode } = await import(/* @vite-ignore */ modulePath);
      themeMode.set(mode);
    }, theme);
    for (const width of [900, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width
      );
      const record = page
        .locator('.occurrence-card')
        .filter({ hasText: 'Lifecycle Contribution' })
        .getByRole('button', { name: 'Record payment', exact: true });
      await expect(record).toBeVisible();
      const bounds = await record.boundingBox();
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      if (width === 900)
        expect((await page.locator('.summary-sidebar').boundingBox())!.width).toBeGreaterThan(500);
      const overlaps = await page.locator('.month-picker-header button').evaluateAll((buttons) => {
        const rectangles = buttons
          .map((button) => button.getBoundingClientRect())
          .filter((rect) => rect.width > 0);
        return rectangles.some((a, i) =>
          rectangles
            .slice(i + 1)
            .some(
              (b) =>
                Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
                Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
            )
        );
      });
      expect(overlaps).toBe(false);
    }
  }
  await page.goto('/goals');
  const card = page
    .locator('.goal-card')
    .filter({ has: page.getByRole('heading', { name: goal.name, exact: true }) });
  const pause = card.getByRole('button', { name: `Pause contributions to ${goal.name}` });
  await pause.click();
  let dialog = page.getByRole('dialog', { name: 'Pause contributions', exact: true });
  await expect(dialog).toBeVisible();
  const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
  await cancel.focus();
  await cancel.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(pause).toBeFocused();
  await pause.click();
  await dialog.getByRole('button', { name: 'Pause contributions', exact: true }).click();
  await expect(dialog).toBeHidden();
  const paused = await (await request.get(`/api/months/${month}`)).json();
  const pausedItem = paused.bill_instances.find((item: { id: string }) => item.id === instance.id);
  expect(pausedItem.expected_amount).toBe(3000);
  expect(pausedItem.occurrences).toHaveLength(1);
  expect(paused.bank_balances[checking.id]).toBe(100000);
  await card.getByRole('button', { name: 'Resume contributions' }).click();
  await expect(card.getByRole('button', { name: 'Complete goal', exact: true })).toBeVisible();
  const resumed = await (await request.get(`/api/months/${month}`)).json();
  expect(
    resumed.bill_instances.find((item: { id: string }) => item.id === instance.id).expected_amount
  ).toBe(10000);
  await card.getByRole('button', { name: 'Complete goal', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Complete goal', exact: true });
  await dialog.getByRole('button', { name: 'Complete goal', exact: true }).click();
  await expect(dialog).toBeHidden();
  const completed = await (await request.get(`/api/months/${month}/savings`)).json();
  const account = completed.accounts.find((item: { id: string }) => item.id === savings.id);
  expect(account).toMatchObject({ planned: 3000, recorded: 3000 });
}
