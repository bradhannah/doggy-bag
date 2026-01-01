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
  is_closed: boolean;
  is_adhoc: boolean;
  due_date: string | null;
  closed_date: string | null;
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
  payments: Payment[];
  total_received: number;
  remaining: number;
  is_paid: boolean;
  is_closed: boolean;
  is_adhoc: boolean;
  due_date: string | null;
  closed_date: string | null;
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

export interface LeftoverBreakdown {
  bankBalances: number;
  actualIncome: number;
  actualBills: number;
  variableExpenses: number;
  freeFlowingExpenses: number;
  totalExpenses: number;
  leftover: number;
  hasActuals: boolean;
}

export interface DetailedMonthData {
  month: string;
  billSections: CategorySection[];
  incomeSections: CategorySection[];
  tallies: {
    bills: SectionTally;           // Regular bills (with expected amounts)
    adhocBills: SectionTally;      // Ad-hoc bills (actual only)
    totalExpenses: SectionTally;   // Combined total
    income: SectionTally;          // Regular income
    adhocIncome: SectionTally;     // Ad-hoc income
    totalIncome: SectionTally;     // Combined total
  };
  leftover: number;
  leftoverBreakdown: LeftoverBreakdown;
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
      // Get current state synchronously
      let currentMonth: string | null = null;
      const unsubscribe = subscribe(state => {
        currentMonth = state.currentMonth;
      });
      unsubscribe(); // Immediately unsubscribe after getting the value
      
      if (currentMonth) {
        await this.loadMonth(currentMonth);
      }
    },

    // Optimistic update for bill paid status - updates locally without re-sorting
    updateBillPaidStatus(instanceId: string, isPaid: boolean, actualAmount: number | null): void {
      update(state => {
        if (!state.data) return state;
        
        const newBillSections: CategorySection[] = state.data.billSections.map(section => {
          const billItems = section.items as BillInstanceDetailed[];
          const newItems = billItems.map(item => {
            if (item.id === instanceId) {
              return {
                ...item,
                is_paid: isPaid,
                actual_amount: actualAmount,
                total_paid: actualAmount ?? item.expected_amount,
                remaining: isPaid ? 0 : item.expected_amount - (actualAmount ?? 0)
              };
            }
            return item;
          });
          
          // Recalculate subtotal
          const expected = newItems.reduce((sum, i) => sum + i.expected_amount, 0);
          const actual = newItems.reduce((sum, i) => sum + i.total_paid, 0);
          
          return {
            ...section,
            items: newItems,
            subtotal: { expected, actual }
          };
        });
        
        return {
          ...state,
          data: {
            ...state.data,
            billSections: newBillSections
          }
        };
      });
    },

    // Optimistic update for income paid status - updates locally without re-sorting
    updateIncomePaidStatus(instanceId: string, isPaid: boolean, actualAmount?: number): void {
      update(state => {
        if (!state.data) return state;
        
        const newIncomeSections: CategorySection[] = state.data.incomeSections.map(section => {
          const incomeItems = section.items as IncomeInstanceDetailed[];
          const newItems = incomeItems.map(item => {
            if (item.id === instanceId) {
              // Use provided actualAmount, or default to expected if marking paid without amount
              const newActualAmount = isPaid 
                ? (actualAmount !== undefined ? actualAmount : item.expected_amount)
                : null;
              return {
                ...item,
                is_paid: isPaid,
                actual_amount: newActualAmount
              };
            }
            return item;
          });
          
          // Recalculate subtotal
          const expected = newItems.reduce((sum, i) => sum + i.expected_amount, 0);
          const actual = newItems.reduce((sum, i) => sum + (i.actual_amount ?? 0), 0);
          
          return {
            ...section,
            items: newItems,
            subtotal: { expected, actual }
          };
        });
        
        // Recalculate income tallies
        let regularIncomeActual = 0;
        let adhocIncomeActual = 0;
        newIncomeSections.forEach(section => {
          (section.items as IncomeInstanceDetailed[]).forEach(item => {
            if (item.is_adhoc) {
              adhocIncomeActual += item.actual_amount ?? 0;
            } else {
              regularIncomeActual += item.actual_amount ?? 0;
            }
          });
        });
        
        const newTallies = {
          ...state.data.tallies,
          income: {
            ...state.data.tallies.income,
            actual: regularIncomeActual
          },
          adhocIncome: {
            ...state.data.tallies.adhocIncome,
            actual: adhocIncomeActual
          },
          totalIncome: {
            ...state.data.tallies.totalIncome,
            actual: regularIncomeActual + adhocIncomeActual
          }
        };
        
        // Also update leftover breakdown
        const newLeftoverBreakdown = {
          ...state.data.leftoverBreakdown,
          actualIncome: regularIncomeActual + adhocIncomeActual
        };
        
        // Recalculate leftover: actualIncome + bankBalances - totalExpenses
        const bankBalancesTotal = Object.values(state.data.bankBalances).reduce((sum, val) => sum + val, 0);
        const newLeftover = (regularIncomeActual + adhocIncomeActual) + bankBalancesTotal - state.data.leftoverBreakdown.totalExpenses;
        
        return {
          ...state,
          data: {
            ...state.data,
            incomeSections: newIncomeSections,
            tallies: newTallies,
            leftover: newLeftover,
            leftoverBreakdown: {
              ...newLeftoverBreakdown,
              leftover: newLeftover,
              hasActuals: (regularIncomeActual + adhocIncomeActual) > 0 || state.data.leftoverBreakdown.totalExpenses > 0
            }
          }
        };
      });
    },

    // Optimistic update for bill close/reopen
    // When totalPaid is provided (e.g., from Pay Full), also update payment totals
    updateBillClosedStatus(instanceId: string, isClosed: boolean, totalPaid?: number): void {
      update(state => {
        if (!state.data) return state;
        
        const today = new Date().toISOString().split('T')[0];
        
        const newBillSections: CategorySection[] = state.data.billSections.map(section => {
          const billItems = section.items as BillInstanceDetailed[];
          const newItems = billItems.map(item => {
            if (item.id === instanceId) {
              const newTotalPaid = totalPaid !== undefined ? totalPaid : item.total_paid;
              return {
                ...item,
                is_closed: isClosed,
                is_paid: isClosed,
                closed_date: isClosed ? today : null,
                total_paid: newTotalPaid,
                remaining: Math.max(0, item.expected_amount - newTotalPaid)
              };
            }
            return item;
          });
          
          // Recalculate subtotal
          const expected = newItems.reduce((sum, i) => sum + i.expected_amount, 0);
          const actual = newItems.reduce((sum, i) => sum + i.total_paid, 0);
          
          return {
            ...section,
            items: newItems,
            subtotal: { expected, actual }
          };
        });
        
        return {
          ...state,
          data: {
            ...state.data,
            billSections: newBillSections
          }
        };
      });
    },

    // Optimistic update for income close/reopen
    // When totalReceived is provided (e.g., from Receive Full), also update payment totals
    updateIncomeClosedStatus(instanceId: string, isClosed: boolean, totalReceived?: number): void {
      update(state => {
        if (!state.data) return state;
        
        const today = new Date().toISOString().split('T')[0];
        
        const newIncomeSections: CategorySection[] = state.data.incomeSections.map(section => {
          const incomeItems = section.items as IncomeInstanceDetailed[];
          const newItems = incomeItems.map(item => {
            if (item.id === instanceId) {
              const newTotalReceived = totalReceived !== undefined ? totalReceived : item.total_received;
              return {
                ...item,
                is_closed: isClosed,
                is_paid: isClosed,
                closed_date: isClosed ? today : null,
                total_received: newTotalReceived,
                remaining: Math.max(0, item.expected_amount - newTotalReceived)
              };
            }
            return item;
          });
          
          // Recalculate subtotal
          const expected = newItems.reduce((sum, i) => sum + i.expected_amount, 0);
          const actual = newItems.reduce((sum, i) => sum + i.total_received, 0);
          
          return {
            ...section,
            items: newItems,
            subtotal: { expected, actual }
          };
        });
        
        return {
          ...state,
          data: {
            ...state.data,
            incomeSections: newIncomeSections
          }
        };
      });
    },

    // Optimistic update for expected amount change
    updateBillExpectedAmount(instanceId: string, newExpected: number): void {
      update(state => {
        if (!state.data) return state;
        
        const newBillSections: CategorySection[] = state.data.billSections.map(section => {
          const billItems = section.items as BillInstanceDetailed[];
          const newItems = billItems.map(item => {
            if (item.id === instanceId) {
              return {
                ...item,
                expected_amount: newExpected,
                remaining: Math.max(0, newExpected - item.total_paid)
              };
            }
            return item;
          });
          
          // Recalculate subtotal
          const expected = newItems.reduce((sum, i) => sum + i.expected_amount, 0);
          const actual = newItems.reduce((sum, i) => sum + i.total_paid, 0);
          
          return {
            ...section,
            items: newItems,
            subtotal: { expected, actual }
          };
        });
        
        return {
          ...state,
          data: {
            ...state.data,
            billSections: newBillSections
          }
        };
      });
    },

    // Optimistic update for income expected amount change
    updateIncomeExpectedAmount(instanceId: string, newExpected: number): void {
      update(state => {
        if (!state.data) return state;
        
        const newIncomeSections: CategorySection[] = state.data.incomeSections.map(section => {
          const incomeItems = section.items as IncomeInstanceDetailed[];
          const newItems = incomeItems.map(item => {
            if (item.id === instanceId) {
              return {
                ...item,
                expected_amount: newExpected,
                remaining: Math.max(0, newExpected - item.total_received)
              };
            }
            return item;
          });
          
          // Recalculate subtotal
          const expected = newItems.reduce((sum, i) => sum + i.expected_amount, 0);
          const actual = newItems.reduce((sum, i) => sum + i.total_received, 0);
          
          return {
            ...section,
            items: newItems,
            subtotal: { expected, actual }
          };
        });
        
        return {
          ...state,
          data: {
            ...state.data,
            incomeSections: newIncomeSections
          }
        };
      });
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
