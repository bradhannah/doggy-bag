// Detailed Month Store Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock the API client before importing the store
vi.mock('../lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import {
  detailedMonth,
  detailedMonthData,
  detailedMonthLoading,
  detailedMonthError,
  type DetailedMonthData,
  type BillInstanceDetailed,
  type IncomeInstanceDetailed,
} from './detailed-month';
import { apiClient } from '../lib/api/client';

const mockGet = vi.mocked(apiClient.get);

// Sample detailed month data
const sampleBillInstance: BillInstanceDetailed = {
  id: 'bi-1',
  bill_id: 'bill-1',
  name: 'Electric',
  billing_period: 'monthly',
  expected_amount: 15000, // cents
  actual_amount: null,
  payments: [],
  occurrences: [],
  occurrence_count: 1,
  is_extra_occurrence_month: false,
  total_paid: 0,
  remaining: 15000,
  is_paid: false,
  is_closed: false,
  is_adhoc: false,
  is_payoff_bill: false,
  due_date: '2025-01-15',
  closed_date: null,
  is_overdue: false,
  days_overdue: null,
  payment_source: { id: 'ps-1', name: 'Checking' },
  category_id: 'cat-1',
};

const sampleIncomeInstance: IncomeInstanceDetailed = {
  id: 'ii-1',
  income_id: 'income-1',
  name: 'Salary',
  billing_period: 'monthly',
  expected_amount: 500000, // cents
  actual_amount: null,
  payments: [],
  occurrences: [],
  occurrence_count: 1,
  is_extra_occurrence_month: false,
  total_received: 0,
  remaining: 500000,
  is_paid: false,
  is_closed: false,
  is_adhoc: false,
  due_date: '2025-01-15',
  closed_date: null,
  is_overdue: false,
  payment_source: { id: 'ps-1', name: 'Checking' },
  category_id: 'cat-1',
};

const sampleDetailedMonthData: DetailedMonthData = {
  month: '2025-01',
  billSections: [
    {
      category: { id: 'cat-1', name: 'Utilities', color: '#ff0000', sort_order: 0 },
      items: [sampleBillInstance],
      subtotal: { expected: 15000, actual: 0 },
    },
  ],
  incomeSections: [
    {
      category: { id: 'cat-1', name: 'Primary', color: '#00ff00', sort_order: 0 },
      items: [sampleIncomeInstance],
      subtotal: { expected: 500000, actual: 0 },
    },
  ],
  tallies: {
    bills: { expected: 15000, actual: 0, remaining: 15000 },
    adhocBills: { expected: 0, actual: 0, remaining: 0 },
    ccPayoffs: { expected: 0, actual: 0, remaining: 0 },
    totalExpenses: { expected: 15000, actual: 0, remaining: 15000 },
    income: { expected: 500000, actual: 0, remaining: 500000 },
    adhocIncome: { expected: 0, actual: 0, remaining: 0 },
    totalIncome: { expected: 500000, actual: 0, remaining: 500000 },
  },
  leftover: 485000,
  leftoverBreakdown: {
    bankBalances: 0,
    remainingIncome: 500000,
    remainingExpenses: 15000,
    leftover: 485000,
    isValid: true,
  },
  payoffSummaries: [],
  bankBalances: {},
  lastUpdated: '2025-01-01T00:00:00Z',
};

describe('Detailed Month Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detailedMonth.clear();
  });

  describe('loadMonth', () => {
    it('loads detailed month data from API', async () => {
      mockGet.mockResolvedValue(sampleDetailedMonthData);

      await detailedMonth.loadMonth('2025-01');

      expect(mockGet).toHaveBeenCalledWith('/api/months/2025-01/detailed');
      expect(get(detailedMonthData)).toEqual(sampleDetailedMonthData);
      expect(get(detailedMonthLoading)).toBe(false);
      expect(get(detailedMonthError)).toBeNull();
    });

    it('sets loading state during fetch', async () => {
      let loadingDuringFetch = false;
      mockGet.mockImplementation(() => {
        loadingDuringFetch = get(detailedMonthLoading);
        return Promise.resolve(sampleDetailedMonthData);
      });

      await detailedMonth.loadMonth('2025-01');

      expect(loadingDuringFetch).toBe(true);
    });

    it('sets error on API failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await detailedMonth.loadMonth('2025-01');

      expect(get(detailedMonthError)).toBe('Network error');
      expect(get(detailedMonthLoading)).toBe(false);
    });
  });

  describe('updateBillPaidStatus', () => {
    beforeEach(async () => {
      mockGet.mockResolvedValue(sampleDetailedMonthData);
      await detailedMonth.loadMonth('2025-01');
    });

    it('updates bill paid status optimistically', () => {
      detailedMonth.updateBillPaidStatus('bi-1', true, 15000);

      const data = get(detailedMonthData);
      const billSection = data?.billSections[0];
      const bill = billSection?.items[0] as BillInstanceDetailed;

      expect(bill.is_paid).toBe(true);
      expect(bill.total_paid).toBe(15000);
      expect(bill.remaining).toBe(0);
    });

    it('recalculates section subtotals', () => {
      detailedMonth.updateBillPaidStatus('bi-1', true, 15000);

      const data = get(detailedMonthData);
      const billSection = data?.billSections[0];

      expect(billSection?.subtotal.actual).toBe(15000);
    });
  });

  describe('updateBillClosedStatus', () => {
    beforeEach(async () => {
      mockGet.mockResolvedValue(sampleDetailedMonthData);
      await detailedMonth.loadMonth('2025-01');
    });

    it('updates bill closed status', () => {
      detailedMonth.updateBillClosedStatus('bi-1', true, 15000);

      const data = get(detailedMonthData);
      const bill = data?.billSections[0].items[0] as BillInstanceDetailed;

      expect(bill.is_closed).toBe(true);
      expect(bill.is_paid).toBe(true);
      expect(bill.closed_date).not.toBeNull();
    });
  });

  describe('updateBillExpectedAmount', () => {
    beforeEach(async () => {
      mockGet.mockResolvedValue(sampleDetailedMonthData);
      await detailedMonth.loadMonth('2025-01');
    });

    it('updates expected amount and recalculates remaining', () => {
      detailedMonth.updateBillExpectedAmount('bi-1', 20000);

      const data = get(detailedMonthData);
      const bill = data?.billSections[0].items[0] as BillInstanceDetailed;

      expect(bill.expected_amount).toBe(20000);
      expect(bill.remaining).toBe(20000);
    });
  });

  describe('removeBillInstance', () => {
    beforeEach(async () => {
      mockGet.mockResolvedValue(sampleDetailedMonthData);
      await detailedMonth.loadMonth('2025-01');
    });

    it('removes bill from store', () => {
      detailedMonth.removeBillInstance('bi-1');

      const data = get(detailedMonthData);
      // Section should be removed since it's empty
      expect(data?.billSections.length).toBe(0);
    });
  });

  describe('updateIncomePaidStatus', () => {
    beforeEach(async () => {
      mockGet.mockResolvedValue(sampleDetailedMonthData);
      await detailedMonth.loadMonth('2025-01');
    });

    it('updates income paid status optimistically', () => {
      detailedMonth.updateIncomePaidStatus('ii-1', true, 500000);

      const data = get(detailedMonthData);
      const incomeSection = data?.incomeSections[0];
      const income = incomeSection?.items[0] as IncomeInstanceDetailed;

      expect(income.is_paid).toBe(true);
      expect(income.actual_amount).toBe(500000);
    });
  });

  describe('updateIncomeClosedStatus', () => {
    beforeEach(async () => {
      mockGet.mockResolvedValue(sampleDetailedMonthData);
      await detailedMonth.loadMonth('2025-01');
    });

    it('updates income closed status', () => {
      detailedMonth.updateIncomeClosedStatus('ii-1', true, 500000);

      const data = get(detailedMonthData);
      const income = data?.incomeSections[0].items[0] as IncomeInstanceDetailed;

      expect(income.is_closed).toBe(true);
      expect(income.is_paid).toBe(true);
    });
  });

  describe('removeIncomeInstance', () => {
    beforeEach(async () => {
      mockGet.mockResolvedValue(sampleDetailedMonthData);
      await detailedMonth.loadMonth('2025-01');
    });

    it('removes income from store', () => {
      detailedMonth.removeIncomeInstance('ii-1');

      const data = get(detailedMonthData);
      // Section should be removed since it's empty
      expect(data?.incomeSections.length).toBe(0);
    });
  });

  describe('clear', () => {
    it('resets store to initial state', async () => {
      mockGet.mockResolvedValue(sampleDetailedMonthData);
      await detailedMonth.loadMonth('2025-01');

      detailedMonth.clear();

      expect(get(detailedMonthData)).toBeNull();
      expect(get(detailedMonthLoading)).toBe(false);
      expect(get(detailedMonthError)).toBeNull();
    });
  });

  describe('refresh', () => {
    it('reloads current month', async () => {
      mockGet.mockResolvedValue(sampleDetailedMonthData);
      await detailedMonth.loadMonth('2025-01');

      mockGet.mockClear();
      mockGet.mockResolvedValue(sampleDetailedMonthData);

      await detailedMonth.refresh();

      expect(mockGet).toHaveBeenCalledWith('/api/months/2025-01/detailed');
    });

    it('does nothing if no month loaded', async () => {
      await detailedMonth.refresh();

      expect(mockGet).not.toHaveBeenCalled();
    });
  });
});
