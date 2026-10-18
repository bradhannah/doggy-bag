import { expect, type Page, type APIRequestContext } from '@playwright/test';

export async function verifyRecurringReview({
  page,
  request,
}: {
  page: Page;
  request: APIRequestContext;
}) {
  const date = new Date();
  const target = new Date(date.getFullYear(), date.getMonth() + 9, 1);
  const month = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
  const account = await (
    await request.post('/api/payment-sources', {
      data: { name: 'Review checking', type: 'bank_account' },
    })
  ).json();
  const category = await (await request.post('/api/categories/ensure-goals')).json();
  const created = await request.post('/api/bills', {
    data: {
      name: 'Review Internet',
      amount: 8000,
      billing_period: 'monthly',
      day_of_month: 12,
      start_date: `${month}-01`,
      category_id: category.id,
      payment_source_id: account.id,
    },
  });
  expect(created.status()).toBe(201);
  const source = await created.json();
  expect((await request.post(`/api/months/${month}/generate`, { data: {} })).status()).toBe(201);
  const budget = await (await request.get(`/api/months/${month}`)).json();
  const instance = budget.bill_instances.find(
    (item: { bill_id: string }) => item.bill_id === source.id
  );
  expect(
    (
      await request.put(
        `/api/months/${month}/bills/${instance.id}/occurrences/${instance.occurrences[0].id}`,
        { data: { expected_amount: 9000 } }
      )
    ).ok()
  ).toBe(true);
  expect(
    (
      await request.put(`/api/bills/${source.id}`, { data: { amount: 9500, day_of_month: 15 } })
    ).ok()
  ).toBe(true);
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto(`/month/${month}`);
  await page.getByRole('button', { name: 'Review budget updates', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Review budget updates' });
  await dialog.getByRole('button', { name: /Changed entries/ }).click();
  await dialog.getByText('Review monthly overrides and changes').click();
  const row = dialog.locator('.change-row').filter({ hasText: 'Review Internet' });
  await expect(row.getByRole('radio', { name: 'Keep my monthly value — $90.00' })).toBeChecked();
  await expect(
    row.getByRole('checkbox', { name: `Update due date for ${month}-12`, exact: true })
  ).not.toBeChecked();
  await row.getByRole('checkbox', { name: `Update due date for ${month}-12`, exact: true }).check();
  await row.getByRole('radio', { name: 'Use latest recurring value — $95.00' }).check();
  await expect(row.getByText('Selected impact −$5.00')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(900);
  await dialog.getByRole('button', { name: 'Apply selected updates' }).click();
  await expect(dialog).toBeHidden();
  const saved = await (await request.get(`/api/months/${month}`)).json();
  expect(
    saved.bill_instances.find((item: { id: string }) => item.id === instance.id).occurrences[0]
  ).toMatchObject({ expected_amount: 9500, expected_date: `${month}-15` });
  expect(
    (await (await request.get(`/api/months/${month}/budget-updates`)).json()).items.some(
      (item: { operation: string }) => item.operation === 'update'
    )
  ).toBe(false);
}
