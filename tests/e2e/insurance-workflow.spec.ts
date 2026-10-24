import { test, expect, type APIRequestContext } from '@playwright/test';

// One claim through both plans: primary approves part, the secondary is sent what's
// left, the money is marked received from the Budget, and the secondary denies.

// A month of its own, far from "now", so other flows that generate the current month
// are unaffected. Decisions are dated inside it so they count in this month's Budget.
const month = '2031-03';
const serviceDate = `${month}-01`;
const decidedDate = `${month}-10`;

async function post<T>(request: APIRequestContext, path: string, data: unknown): Promise<T> {
  const response = await request.post(path, { data });
  expect(response.status(), `${path}: ${await response.text()}`).toBeLessThan(300);
  return (await response.json()) as T;
}

async function seedClaim(request: APIRequestContext) {
  const stamp = Date.now();
  const category = await post<{ id: string }>(request, '/api/insurance-categories', {
    name: `E2E Massage ${stamp}`,
    icon: '💆',
    sort_order: 50,
    is_active: true,
  });
  const primary = await post<{ id: string }>(request, '/api/insurance-plans', {
    name: `Canada Life ${stamp}`,
    is_active: true,
  });
  const secondary = await post<{ id: string }>(request, '/api/insurance-plans', {
    name: `Empire Life ${stamp}`,
    is_active: true,
  });
  const member = await post<{ id: string; plans: string[] }>(request, '/api/family-members', {
    name: `E2E Person ${stamp}`,
    plans: [primary.id, secondary.id],
  });
  expect(member.plans).toEqual([primary.id, secondary.id]);

  const claim = await post<{ id: string; claim_number: number }>(request, '/api/insurance-claims', {
    family_member_id: member.id,
    category_id: category.id,
    service_date: serviceDate,
    total_amount: 13560,
    expected_reimbursement: 12400,
  });

  const generated = await request.post(`/api/months/${month}/generate`, { data: {} });
  expect(generated.status()).toBe(201);
  return { claim, primary: `Canada Life ${stamp}`, secondary: `Empire Life ${stamp}` };
}

test('a claim moves from the primary plan to the secondary', async ({ page, request }) => {
  const { claim, primary, secondary } = await seedClaim(request);
  const nextStep = page.getByRole('region', { name: 'Next step' });

  await page.goto(`/insurance?claim=${claim.id}`);
  await expect(nextStep).toContainText(`Submit $135.60 to ${primary}`);
  await expect(page.getByText(`Starts when ${primary} decides`)).toBeVisible();

  // Send it to the primary plan
  await nextStep.getByRole('button', { name: 'Mark submitted' }).click();
  const decision = page.getByText('Record the decision').locator('..');
  await expect(decision).toBeVisible();

  // The approved amount starts at the estimate; approve it
  await expect(decision.getByLabel('Approved amount')).toHaveValue('124.00');
  await decision.getByLabel('Decided on').fill(decidedDate);
  await decision.getByRole('button', { name: 'Approve $124.00' }).click();

  // The secondary now claims only what's left
  await expect(nextStep).toContainText(`Submit the remaining $11.60 to ${secondary}`);
  const money = page.getByRole('region', { name: 'Money' });
  await expect(money).toContainText('Owed to you');
  await expect(money).toContainText('$124.00');
  await expect(money).toContainText('+ up to $11.60 more');

  // The Budget counts the approval this month and shows the secondary without an amount
  await page.goto(`/month/${month}`);
  const reimbursement = page.getByRole('button', { name: 'Mark received' });
  await expect(reimbursement).toBeVisible();
  await expect(page.getByText('Not submitted').first()).toBeVisible();
  await reimbursement.click();
  await expect(page.getByText(`${primary} payment received`)).toBeVisible();

  // Back on the claim: the secondary is submitted, then denies
  await page.goto(`/insurance?claim=${claim.id}`);
  await nextStep.getByRole('button', { name: 'Mark submitted' }).click();
  await page
    .getByText('Record the decision')
    .locator('..')
    .getByRole('button', { name: 'Denied' })
    .click();

  await expect(page.getByRole('region', { name: 'Next step' })).toHaveCount(0);
  await expect(page.locator('.detail-header .badge')).toHaveText('Done');
  await expect(money).toContainText('$124.00');
});
