// Detailed View Service - month totals
// Insurance items (flagged ad-hoc) and credit card payoff bills (flagged regular) have
// their own tallies. The totals must count each of them once.

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { DetailedViewServiceImpl } from './detailed-view-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type {
  BillInstance,
  IncomeInstance,
  InsuranceClaim,
  MonthlyData,
  Occurrence,
} from '../types';

const month = '2026-10';
const now = '2026-10-01T00:00:00.000Z';

function closedOcc(id: string, amount: number): Occurrence {
  return {
    id,
    sequence: 1,
    expected_date: `${month}-05`,
    expected_amount: amount,
    is_closed: true,
    closed_date: `${month}-05`,
    is_adhoc: true,
    created_at: now,
    updated_at: now,
  };
}

const adhocBill: BillInstance = {
  id: 'bill-adhoc',
  bill_id: null,
  month,
  billing_period: 'monthly',
  expected_amount: 5000,
  occurrences: [closedOcc('occ-bill', 5000)],
  is_default: false,
  is_closed: true,
  is_adhoc: true,
  name: 'Hardware store',
  category_id: 'cat',
  created_at: now,
  updated_at: now,
};

const payoffBill: BillInstance = {
  id: 'bill-payoff',
  bill_id: null,
  month,
  billing_period: 'monthly',
  expected_amount: 30000,
  occurrences: [closedOcc('occ-payoff', 30000)],
  is_default: true,
  is_closed: true,
  is_adhoc: false,
  is_payoff_bill: true,
  payoff_source_id: 'ps-card',
  name: 'Visa Payments',
  category_id: 'cat',
  created_at: now,
  updated_at: now,
};

const adhocIncome: IncomeInstance = {
  id: 'income-adhoc',
  income_id: null,
  month,
  billing_period: 'monthly',
  expected_amount: 2000,
  occurrences: [closedOcc('occ-income', 2000)],
  is_default: false,
  is_closed: true,
  is_adhoc: true,
  name: 'Garage sale',
  created_at: now,
  updated_at: now,
};

const paidClaim: InsuranceClaim = {
  id: 'claim-1',
  claim_number: 1,
  family_member_id: 'fm',
  family_member_name: 'Brad',
  category_id: 'massage',
  category_name: 'Massage Therapy',
  service_date: `${month}-02`,
  total_amount: 13560,
  status: 'closed',
  documents: [],
  submissions: [
    {
      id: 'sub-1',
      plan_id: 'plan',
      plan_snapshot: { name: 'Canada Life AWS' },
      status: 'paid',
      amount_claimed: 13560,
      amount_reimbursed: 12400,
      date_resolved: `${month}-10`,
      date_paid: `${month}-12`,
      documents_sent: [],
    },
  ],
  is_expected: false,
  bill_paid: true,
  bill_paid_date: `${month}-02`,
  created_at: now,
  updated_at: now,
};

describe('DetailedViewService totals', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `detailed-view-totals-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'months'), { recursive: true });
    StorageServiceImpl.initialize(testDir);

    const entities: Record<string, unknown> = {
      'insurance-claims.json': [paidClaim],
      'payment-sources.json': [
        {
          id: 'ps-checking',
          name: 'Checking',
          type: 'bank_account',
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: 'ps-card',
          name: 'Visa',
          type: 'credit_card',
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ],
      'categories.json': [],
      'bills.json': [],
      'incomes.json': [],
    };
    for (const [file, data] of Object.entries(entities)) {
      await writeFile(join(testDir, 'entities', file), JSON.stringify(data));
    }
    const monthly: MonthlyData = {
      month,
      bill_instances: [adhocBill, payoffBill],
      income_instances: [adhocIncome],
      variable_expenses: [],
      free_flowing_expenses: [],
      bank_balances: { 'ps-checking': 500000 },
      is_read_only: false,
      created_at: now,
      updated_at: now,
    };
    await writeFile(join(testDir, 'months', `${month}.json`), JSON.stringify(monthly));
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('insurance and payoff items are counted once in the totals', async () => {
    const { tallies } = await new DetailedViewServiceImpl().getDetailedMonth(month);

    expect(tallies.insuranceExpenses.actual).toBe(13560);
    expect(tallies.insuranceReimbursements.actual).toBe(12400);
    expect(tallies.ccPayoffs.actual).toBe(30000);
    expect(tallies.adhocBills.actual).toBe(5000);
    expect(tallies.bills.actual).toBe(0);
    expect(tallies.adhocIncome.actual).toBe(2000);

    // ad-hoc $50 + payoff $300 + clinic bill $135.60
    expect(tallies.totalExpenses.actual).toBe(48560);
    expect(tallies.totalExpenses.expected).toBe(43560);
    // ad-hoc $20 + reimbursement $124
    expect(tallies.totalIncome.actual).toBe(14400);
  });
});
