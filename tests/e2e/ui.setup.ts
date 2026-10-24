import { test as setup, expect, type APIRequestContext } from '@playwright/test';
import { UI_MONTH } from './ui-month';

// Seeds one self-contained month for the layout checks and screenshots.
// The month is far from "now" so no functional flow generates it first.

async function createCategory(request: APIRequestContext, name: string, type: 'bill' | 'income') {
  const response = await request.post('/api/categories', {
    data: { name, type, color: type === 'bill' ? '#3b82f6' : '#22c55e', sort_order: 0 },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).id as string;
}

setup('seed the UI layout month', async ({ request }) => {
  const checkingResponse = await request.post('/api/payment-sources', {
    data: { name: 'UI Checking', type: 'bank_account' },
  });
  expect(checkingResponse.status()).toBe(201);
  const checking = await checkingResponse.json();

  const homeId = await createCategory(request, 'UI Home', 'bill');
  const salaryId = await createCategory(request, 'UI Salary', 'income');

  const bills = [
    { name: 'UI Rent', amount: 185000, day_of_month: 1 },
    { name: 'UI Internet', amount: 8900, day_of_month: 15 },
    { name: 'UI Electric', amount: 12500, day_of_month: 20 },
  ];
  const created: Record<string, string> = {};
  for (const bill of bills) {
    const response = await request.post('/api/bills', {
      data: {
        ...bill,
        billing_period: 'monthly',
        payment_source_id: checking.id,
        category_id: homeId,
      },
    });
    expect(response.status()).toBe(201);
    created[bill.name] = (await response.json()).id;
  }

  const income = await request.post('/api/incomes', {
    data: {
      name: 'UI Salary',
      amount: 325000,
      billing_period: 'bi_weekly',
      start_date: '2030-01-04',
      payment_source_id: checking.id,
      category_id: salaryId,
    },
  });
  expect(income.status()).toBe(201);

  expect((await request.post(`/api/months/${UI_MONTH}/generate`, { data: {} })).status()).toBe(201);
  expect(
    (
      await request.put(`/api/months/${UI_MONTH}/bank-balances`, {
        data: { [checking.id]: 453218 },
      })
    ).ok()
  ).toBe(true);

  const adhoc = await request.post(`/api/months/${UI_MONTH}/adhoc/bills`, {
    data: { name: 'UI Car repair', amount: 42000, category_id: homeId },
  });
  expect(adhoc.status()).toBe(201);

  // Record the rent so both open and paid rows are on screen.
  const month = await (await request.get(`/api/months/${UI_MONTH}`)).json();
  const rent = month.bill_instances.find(
    (instance: { bill_id?: string }) => instance.bill_id === created['UI Rent']
  );
  const occurrence = rent.occurrences[0];
  const close = await request.post(
    `/api/months/${UI_MONTH}/bills/${rent.id}/occurrences/${occurrence.id}/close`,
    {
      data: {
        expected_amount: occurrence.expected_amount,
        expected_date: occurrence.expected_date,
        closed_date: new Date().toISOString().slice(0, 10),
        payment_source_id: checking.id,
      },
    }
  );
  expect(close.ok()).toBe(true);
});
