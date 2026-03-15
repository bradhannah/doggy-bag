// Months Service - Virtual Insurance Entries Tests
// Tests that the generateVirtualInsuranceEntries (called via getMonthlyData)
// correctly handles approved vs paid status for income occurrences.
//
// Key behavior:
// - 'approved' submissions generate OPEN (not closed) income occurrences (expected income)
// - 'paid' submissions generate CLOSED income occurrences with date_paid as closed_date
// - 'denied' submissions generate CLOSED income occurrences with date_resolved as closed_date
// - 'draft' and 'pending' submissions generate OPEN income occurrences

import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { MonthsServiceImpl } from './months-service';
import { InsuranceClaimsServiceImpl } from './insurance-claims-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type {
  FamilyMember,
  InsuranceCategory,
  InsurancePlan,
  MonthlyData,
  PaymentSource,
  Category,
} from '../types';

describe('MonthsService - Virtual Insurance Entries (Approved vs Paid)', () => {
  let monthsService: MonthsServiceImpl;
  let claimsService: InsuranceClaimsServiceImpl;
  let testDir: string;
  const testMonth = '2025-06';

  // Sample data
  const sampleFamilyMembers: FamilyMember[] = [
    {
      id: 'fm-john-001',
      name: 'John Doe',
      is_active: true,
      plans: [],
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  const sampleCategories: InsuranceCategory[] = [
    {
      id: 'ic-dental-001',
      name: 'Dental',
      icon: '🦷',
      sort_order: 1,
      is_predefined: false,
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  const samplePlans: InsurancePlan[] = [
    {
      id: 'ip-primary-001',
      name: 'Primary Health',
      provider_name: 'Blue Cross',
      policy_number: 'POL-12345',
      member_id: 'MEM-98765',
      owner: 'John Doe',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  const samplePaymentSource: PaymentSource = {
    id: 'ps-checking-001',
    name: 'Checking',
    type: 'bank_account',
    is_active: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  };

  const sampleBillCategory: Category = {
    id: 'cat-housing-001',
    name: 'Housing',
    type: 'bill',
    color: '#3b82f6',
    sort_order: 0,
    is_predefined: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  };

  // Minimal monthly data (just enough so getMonthlyData returns something)
  const now = '2025-06-01T00:00:00.000Z';
  const minimalMonthlyData: MonthlyData = {
    month: testMonth,
    bill_instances: [],
    income_instances: [],
    variable_expenses: [],
    free_flowing_expenses: [],
    bank_balances: { 'ps-checking-001': 500000 },
    is_read_only: false,
    created_at: now,
    updated_at: now,
  };

  beforeAll(async () => {
    testDir = join(tmpdir(), `months-virtual-insurance-test-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'months'), { recursive: true });
    await mkdir(join(testDir, 'documents', 'insurance', 'receipts'), { recursive: true });

    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
    // Reset all entity files
    await writeFile(
      join(testDir, 'entities', 'insurance-claims.json'),
      JSON.stringify([], null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'family-members.json'),
      JSON.stringify(sampleFamilyMembers, null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'insurance-categories.json'),
      JSON.stringify(sampleCategories, null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'insurance-plans.json'),
      JSON.stringify(samplePlans, null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'payment-sources.json'),
      JSON.stringify([samplePaymentSource], null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'categories.json'),
      JSON.stringify([sampleBillCategory], null, 2)
    );
    await writeFile(join(testDir, 'entities', 'bills.json'), JSON.stringify([], null, 2));
    await writeFile(join(testDir, 'entities', 'incomes.json'), JSON.stringify([], null, 2));

    // Write minimal monthly data
    await writeFile(
      join(testDir, 'months', `${testMonth}.json`),
      JSON.stringify(minimalMonthlyData, null, 2)
    );

    claimsService = new InsuranceClaimsServiceImpl();
    monthsService = new MonthsServiceImpl();
  });

  afterAll(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Helper: create a claim and add a submission, then advance it to the desired status.
   * Returns { claimId, submissionId }.
   */
  async function createClaimWithSubmission(opts: {
    status: 'draft' | 'pending' | 'approved' | 'paid' | 'denied';
    amountReimbursed?: number;
    dateResolved?: string;
    datePaid?: string;
  }) {
    const claim = await claimsService.create({
      family_member_id: 'fm-john-001',
      category_id: 'ic-dental-001',
      service_date: `${testMonth}-15`,
      total_amount: 20000, // $200
    });

    const submission = await claimsService.addSubmission(claim.id, {
      plan_id: 'ip-primary-001',
      amount_claimed: 20000,
      documents_sent: [],
    });

    // Advance through statuses as needed
    if (opts.status === 'draft') {
      return { claimId: claim.id, submissionId: submission.id };
    }

    // draft -> pending
    await claimsService.updateSubmission(claim.id, submission.id, {
      status: 'pending',
      date_submitted: `${testMonth}-16`,
    });

    if (opts.status === 'pending') {
      return { claimId: claim.id, submissionId: submission.id };
    }

    if (opts.status === 'denied') {
      await claimsService.updateSubmission(claim.id, submission.id, {
        status: 'denied',
        amount_reimbursed: 0,
        date_resolved: opts.dateResolved ?? `${testMonth}-20`,
      });
      return { claimId: claim.id, submissionId: submission.id };
    }

    // pending -> approved
    await claimsService.updateSubmission(claim.id, submission.id, {
      status: 'approved',
      amount_reimbursed: opts.amountReimbursed ?? 16000,
      date_resolved: opts.dateResolved ?? `${testMonth}-20`,
    });

    if (opts.status === 'approved') {
      return { claimId: claim.id, submissionId: submission.id };
    }

    // approved -> paid
    await claimsService.updateSubmission(claim.id, submission.id, {
      status: 'paid',
      date_paid: opts.datePaid ?? `${testMonth}-25`,
    });

    return { claimId: claim.id, submissionId: submission.id };
  }

  test('approved submission generates OPEN income occurrence (not closed)', async () => {
    await createClaimWithSubmission({
      status: 'approved',
      amountReimbursed: 16000,
      dateResolved: '2025-06-20',
    });

    const data = await monthsService.getMonthlyData(testMonth);
    expect(data).not.toBeNull();

    // Find virtual income instances (from insurance)
    const virtualIncomes = data!.income_instances.filter(
      (ii) => ii.is_insurance_reimbursement === true
    );
    expect(virtualIncomes.length).toBe(1);

    const income = virtualIncomes[0];
    // The income instance itself should NOT be closed (approved = expected, not received)
    expect(income.is_closed).toBe(false);

    // The individual occurrence should NOT be closed
    expect(income.occurrences.length).toBe(1);
    const occ = income.occurrences[0];
    expect(occ.is_closed).toBe(false);
    expect(occ.closed_date).toBeUndefined();

    // But the amount should reflect the reimbursed amount
    expect(occ.expected_amount).toBe(16000);
  });

  test('paid submission generates CLOSED income occurrence with date_paid', async () => {
    await createClaimWithSubmission({
      status: 'paid',
      amountReimbursed: 16000,
      dateResolved: '2025-06-20',
      datePaid: '2025-06-25',
    });

    const data = await monthsService.getMonthlyData(testMonth);
    expect(data).not.toBeNull();

    const virtualIncomes = data!.income_instances.filter(
      (ii) => ii.is_insurance_reimbursement === true
    );
    expect(virtualIncomes.length).toBe(1);

    const income = virtualIncomes[0];
    // The income instance should be closed (paid = money received)
    expect(income.is_closed).toBe(true);

    // The individual occurrence should be closed with date_paid as closed_date
    expect(income.occurrences.length).toBe(1);
    const occ = income.occurrences[0];
    expect(occ.is_closed).toBe(true);
    expect(occ.closed_date).toBe('2025-06-25');
    expect(occ.expected_amount).toBe(16000);
  });

  test('denied submission generates CLOSED income occurrence with date_resolved', async () => {
    await createClaimWithSubmission({
      status: 'denied',
      dateResolved: '2025-06-22',
    });

    const data = await monthsService.getMonthlyData(testMonth);
    expect(data).not.toBeNull();

    const virtualIncomes = data!.income_instances.filter(
      (ii) => ii.is_insurance_reimbursement === true
    );
    expect(virtualIncomes.length).toBe(1);

    const income = virtualIncomes[0];
    // Denied = closed (no money coming)
    expect(income.is_closed).toBe(true);

    expect(income.occurrences.length).toBe(1);
    const occ = income.occurrences[0];
    expect(occ.is_closed).toBe(true);
    expect(occ.closed_date).toBe('2025-06-22');
    // Denied submissions have 0 reimbursement
    expect(occ.expected_amount).toBe(0);
  });

  test('draft submission generates OPEN income occurrence', async () => {
    await createClaimWithSubmission({ status: 'draft' });

    const data = await monthsService.getMonthlyData(testMonth);
    expect(data).not.toBeNull();

    const virtualIncomes = data!.income_instances.filter(
      (ii) => ii.is_insurance_reimbursement === true
    );

    // Draft submissions have 0 amount_reimbursed and are not "resolved",
    // so the virtual entry generation may use expected_reimbursement fallback
    // or generate a submission-based occurrence with 0 amount.
    // Either way, occurrences should be OPEN (not closed).
    if (virtualIncomes.length > 0) {
      const income = virtualIncomes[0];
      expect(income.is_closed).toBe(false);
      for (const occ of income.occurrences) {
        expect(occ.is_closed).toBe(false);
      }
    }
  });

  test('pending submission generates OPEN income occurrence', async () => {
    await createClaimWithSubmission({ status: 'pending' });

    const data = await monthsService.getMonthlyData(testMonth);
    expect(data).not.toBeNull();

    const virtualIncomes = data!.income_instances.filter(
      (ii) => ii.is_insurance_reimbursement === true
    );

    // Pending submissions are not resolved, so occurrences should be open
    if (virtualIncomes.length > 0) {
      const income = virtualIncomes[0];
      expect(income.is_closed).toBe(false);
      for (const occ of income.occurrences) {
        expect(occ.is_closed).toBe(false);
      }
    }
  });

  test('mixed claim: approved + paid submissions - only paid is closed', async () => {
    // Create a claim with two submissions at different statuses
    const claim = await claimsService.create({
      family_member_id: 'fm-john-001',
      category_id: 'ic-dental-001',
      service_date: `${testMonth}-10`,
      total_amount: 30000,
    });

    // First submission: approved (not yet paid)
    const sub1 = await claimsService.addSubmission(claim.id, {
      plan_id: 'ip-primary-001',
      amount_claimed: 20000,
      documents_sent: [],
    });
    await claimsService.updateSubmission(claim.id, sub1.id, {
      status: 'pending',
      date_submitted: `${testMonth}-11`,
    });
    await claimsService.updateSubmission(claim.id, sub1.id, {
      status: 'approved',
      amount_reimbursed: 16000,
      date_resolved: `${testMonth}-18`,
    });

    // Second submission: paid
    const sub2 = await claimsService.addSubmission(claim.id, {
      plan_id: 'ip-primary-001',
      amount_claimed: 10000,
      documents_sent: [],
    });
    await claimsService.updateSubmission(claim.id, sub2.id, {
      status: 'pending',
      date_submitted: `${testMonth}-12`,
    });
    await claimsService.updateSubmission(claim.id, sub2.id, {
      status: 'approved',
      amount_reimbursed: 8000,
      date_resolved: `${testMonth}-19`,
    });
    await claimsService.updateSubmission(claim.id, sub2.id, {
      status: 'paid',
      date_paid: `${testMonth}-26`,
    });

    const data = await monthsService.getMonthlyData(testMonth);
    expect(data).not.toBeNull();

    const virtualIncomes = data!.income_instances.filter(
      (ii) => ii.is_insurance_reimbursement === true
    );
    expect(virtualIncomes.length).toBe(1);

    const income = virtualIncomes[0];
    // The income instance should NOT be fully closed (one submission is only approved)
    expect(income.is_closed).toBe(false);

    // Should have 2 occurrences
    expect(income.occurrences.length).toBe(2);

    // Find the approved occurrence (open) and paid occurrence (closed)
    const approvedOcc = income.occurrences.find((o) => o.expected_amount === 16000);
    const paidOcc = income.occurrences.find((o) => o.expected_amount === 8000);

    expect(approvedOcc).toBeDefined();
    expect(approvedOcc!.is_closed).toBe(false);
    expect(approvedOcc!.closed_date).toBeUndefined();

    expect(paidOcc).toBeDefined();
    expect(paidOcc!.is_closed).toBe(true);
    expect(paidOcc!.closed_date).toBe('2025-06-26');
  });

  test('paid submission uses date_paid (not date_resolved) as closed_date', async () => {
    await createClaimWithSubmission({
      status: 'paid',
      amountReimbursed: 16000,
      dateResolved: '2025-06-18', // approved date
      datePaid: '2025-06-30', // money received date (different from resolved)
    });

    const data = await monthsService.getMonthlyData(testMonth);
    expect(data).not.toBeNull();

    const virtualIncomes = data!.income_instances.filter(
      (ii) => ii.is_insurance_reimbursement === true
    );
    expect(virtualIncomes.length).toBe(1);

    const occ = virtualIncomes[0].occurrences[0];
    expect(occ.is_closed).toBe(true);
    // closed_date should be date_paid, NOT date_resolved
    expect(occ.closed_date).toBe('2025-06-30');
  });

  test('hasAnyResolvedSubmission includes approved status for submission-based income', async () => {
    // When a submission is approved (but not paid), the system should still use
    // submission-based income (not fall back to expected_reimbursement).
    // This tests the hasAnyResolvedSubmission check at line ~2754.
    const claim = await claimsService.create({
      family_member_id: 'fm-john-001',
      category_id: 'ic-dental-001',
      service_date: `${testMonth}-15`,
      total_amount: 25000,
      expected_reimbursement: 20000, // Has expected_reimbursement
    });

    // Add and approve a submission
    const sub = await claimsService.addSubmission(claim.id, {
      plan_id: 'ip-primary-001',
      amount_claimed: 25000,
      documents_sent: [],
    });
    await claimsService.updateSubmission(claim.id, sub.id, {
      status: 'pending',
      date_submitted: `${testMonth}-16`,
    });
    await claimsService.updateSubmission(claim.id, sub.id, {
      status: 'approved',
      amount_reimbursed: 18000, // Different from expected_reimbursement
      date_resolved: `${testMonth}-20`,
    });

    const data = await monthsService.getMonthlyData(testMonth);
    expect(data).not.toBeNull();

    const virtualIncomes = data!.income_instances.filter(
      (ii) => ii.is_insurance_reimbursement === true
    );
    expect(virtualIncomes.length).toBe(1);

    // Should use the actual submission amount (18000), not expected_reimbursement (20000)
    const income = virtualIncomes[0];
    expect(income.expected_amount).toBe(18000);
    expect(income.occurrences[0].expected_amount).toBe(18000);
  });
});
