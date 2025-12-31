// Detailed Month Store - Manages detailed monthly view data
import { writable, derived } from 'svelte/store';
import { apiClient } from '../lib/api/client';

// Types matching the API response
export interface Payment {
  id: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface BillInstanceDetailed {
  id: string;
  bill_id: string | null;
  name: string;
  expected_amount: number;
  actual_amount: number | null;
  payments: Payment[];
  total_paid: number;
  remaining: number;
  is_paid: boolean;
  is_adhoc: boolean;
  due_date: string | null;
  is_overdue: boolean;
  days_overdue: number | null;
  payment_source: {
    id: string;
    name: string;
  } | null;
  category_id: string;
}

export interface IncomeInstanceDetailed {
  id: string;
  income_id: string | null;
  name: string;
  expected_amount: number;
  actual_amount: number | null;
  is_paid: boolean;
  is_adhoc: boolean;
  due_date: string | null;
  is_overdue: boolean;
  payment_source: {
    id: string;
    name: string;
  } | null;
  category_id: string;
}

export interface CategorySection {
  category: {
    id: string;
    name: string;
    color: string;
    sort_order: number;
  };
  items: BillInstanceDetailed[] | IncomeInstanceDetailed[];
  subtotal: {
    expected: number;
    actual: number;
  };
}

export interface SectionTally {
  expected: number;
  actual: number;
  remaining: number;
}

export interface DetailedMonthData {
  month: string;
  billSections: CategorySection[];
  incomeSections: CategorySection[];
  tallies: {
    bills: SectionTally;
    income: SectionTally;
  };
  leftover: number;
  bankBalances: Record<string, number>;
  lastUpdated: string;
}

interface DetailedMonthState {
  data: DetailedMonthData | null;
  loading: boolean;
  error: string | null;
  currentMonth: string | null;
}

function createDetailedMonthStore() {
  const { subscribe, set, update } = writable<DetailedMonthState>({
    data: null,
    loading: false,
    error: null,
    currentMonth: null
  });

  return {
    subscribe,

    async loadMonth(month: string): Promise<void> {
      update(state => ({ ...state, loading: true, error: null, currentMonth: month }));
      
      try {
        const data = await apiClient.get(`/api/months/${month}/detailed`);
        update(state => ({
          ...state,
          data,
          loading: false,
          error: null
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load detailed month data';
        update(state => ({
          ...state,
          loading: false,
          error: message
        }));
      }
    },

    async refresh(): Promise<void> {
      const currentState = await new Promise<DetailedMonthState>(resolve => {
        const unsubscribe = subscribe(state => {
          resolve(state);
          unsubscribe();
        });
      });
      
      if (currentState.currentMonth) {
        await this.loadMonth(currentState.currentMonth);
      }
    },

    clear(): void {
      set({
        data: null,
        loading: false,
        error: null,
        currentMonth: null
      });
    }
  };
}

export const detailedMonth = createDetailedMonthStore();

// Derived stores for convenient access
export const detailedMonthData = derived(detailedMonth, $state => $state.data);
export const detailedMonthLoading = derived(detailedMonth, $state => $state.loading);
export const detailedMonthError = derived(detailedMonth, $state => $state.error);
