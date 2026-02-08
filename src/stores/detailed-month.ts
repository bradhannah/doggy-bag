// Detailed Month Store - Manages detailed monthly view data
import { writable, derived } from 'svelte/store';
import { apiClient } from '../lib/api/client';
import { getTodayDateString } from '../lib/utils/format';
import type { EntityMetadata } from './bills';

// Occurrence - individual payment instance within a billing period
// In the occurrence-only model, closing an occurrence = payment recorded
export interface Occurrence {
  id: string;
  sequence: number; // 1, 2, 3... for ordering within the month
  expected_date: string; // YYYY-MM-DD - when this occurrence is expected
  expected_amount: number; // Cents - can be edited independently per occurrence
  is_closed: boolean; // Close/Open status for this occurrence (true = paid)
  closed_date?: string; // When closed/paid (YYYY-MM-DD)
  payment_source_id?: string; // Which account was used for payment
  notes?: string; // Optional close notes
  is_adhoc: boolean; // True if manually added by user
  created_at: string;
  updated_at: string;
  // Virtual insurance occurrence fields (for reimbursement submissions)
  plan_name?: string; // Insurance plan name (e.g., "Canada Life AWS")
  claim_id?: string; // Link to InsuranceClaim
  claim_submission_id?: string; // Link to specific ClaimSubmission
}

export type BillingPeriod = 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';

export interface BillInstanceDetailed {
  id: string;
  bill_id: string | null;
  name: string;
  billing_period: BillingPeriod; // NEW: billing period type
  expected_amount: number;
  actual_amount: number | null;
  occurrences: Occurrence[]; // Individual occurrences for this instance
  occurrence_count: number; // How many occurrences in this month
  is_extra_occurrence_month: boolean; // True if more occurrences than usual
  total_paid: number;
  remaining: number;
  is_closed: boolean;
  is_adhoc: boolean;
  is_payoff_bill: boolean; // True if auto-generated from pay_off_monthly payment source
  payoff_source_id?: string; // Reference to the payment source this payoff bill is for
  goal_id?: string; // Link to SavingsGoal for ad-hoc contributions
  // Insurance expected expense linking
  claim_id?: string; // Link to InsuranceClaim for expected expenses
  is_insurance_expense?: boolean; // True if auto-generated from expected insurance expense
  is_expected_claim?: boolean; // True if from expected claim vs actual claim
  is_virtual?: boolean; // True if dynamically generated (not persisted) - e.g., insurance entries
  due_date: string | null; // DEPRECATED: use occurrence expected_date
  closed_date: string | null;
  is_overdue: boolean;
  days_overdue: number | null;
  payment_source: {
    id: string;
    name: string;
  } | null;
  category_id: string;
  payment_method?: 'auto' | 'manual'; // Payment method (auto = autopay, manual = pay manually)
  metadata?: EntityMetadata; // Point-in-time snapshot from Bill
}

export interface IncomeInstanceDetailed {
  id: string;
  income_id: string | null;
  name: string;
  billing_period: BillingPeriod; // NEW: billing period type
  expected_amount: number;
  actual_amount: number | null;
  occurrences: Occurrence[]; // Individual occurrences for this instance
  occurrence_count: number; // How many occurrences in this month
  is_extra_occurrence_month: boolean; // True if more occurrences than usual (3-paycheck month!)
  total_received: number;
  remaining: number;
  is_closed: boolean;
  is_adhoc: boolean;
  // Insurance reimbursement linking
  claim_id?: string; // Link to InsuranceClaim for expected reimbursements
  claim_submission_id?: string; // Link to specific ClaimSubmission (after conversion)
  is_insurance_reimbursement?: boolean; // True if auto-generated from expected insurance expense
  is_expected_claim?: boolean; // True if from expected claim vs actual claim
  is_virtual?: boolean; // True if dynamically generated (not persisted) - e.g., insurance entries
  due_date: string | null; // DEPRECATED: use occurrence expected_date
  closed_date: string | null;
  is_overdue: boolean;
  payment_source: {
    id: string;
    name: string;
  } | null;
  category_id: string;
  metadata?: EntityMetadata; // Point-in-time snapshot from Income
}

export interface CategorySection {
  category: {
    id: string;
    name: string;
    color: string;
    sort_order: number;
    type?: 'bill' | 'income' | 'variable';
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
  bankBalances: number; // Current cash position (snapshot from bank_balances)
  remainingIncome: number; // Income still expected to receive
  remainingExpenses: number; // Expenses still need to pay (including payoff bills)
  leftover: number; // bank + remainingIncome - remainingExpenses
  isValid: boolean; // False if required bank balances are missing
  hasActuals?: boolean; // True if any actuals have been entered
  missingBalances?: string[]; // IDs of payment sources missing balances
  errorMessage?: string; // Human-readable error message
}

export interface PayoffSummary {
  paymentSourceId: string;
  paymentSourceName: string;
  balance: number; // Current CC balance (expected payoff)
  paid: number; // Sum of payments made this month toward payoff
  remaining: number; // balance - paid
}

export interface DetailedMonthData {
  month: string;
  billSections: CategorySection[];
  incomeSections: CategorySection[];
  tallies: {
    bills: SectionTally; // Regular bills (with expected amounts)
    adhocBills: SectionTally; // Ad-hoc bills (actual only)
    ccPayoffs: SectionTally; // Credit card payoff bills
    insuranceExpenses: SectionTally; // Virtual insurance expense bills
    totalExpenses: SectionTally; // Combined total
    income: SectionTally; // Regular income
    adhocIncome: SectionTally; // Ad-hoc income
    insuranceReimbursements: SectionTally; // Virtual insurance reimbursement income
    totalIncome: SectionTally; // Combined total
  };
  leftover: number;
  leftoverBreakdown: LeftoverBreakdown;
  overdue_bills: { name: string; amount: number; due_date: string }[];
  payoffSummaries: PayoffSummary[]; // Summary of each CC payoff status
  insuranceExpenseSection: CategorySection | null; // Insurance expenses section
  insuranceReimbursementSection: CategorySection | null; // Insurance reimbursements section
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
    currentMonth: null,
  });

  return {
    subscribe,

    async loadMonth(month: string): Promise<void> {
      update((state) => ({ ...state, loading: true, error: null, currentMonth: month }));

      try {
        const data = await apiClient.get(`/api/months/${month}/detailed`);
        update((state) => ({
          ...state,
          data,
          loading: false,
          error: null,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load detailed month data';
        update((state) => ({
          ...state,
          loading: false,
          error: message,
        }));
      }
    },

    async refresh(): Promise<void> {
      // Get current state synchronously
      let currentMonth: string | null = null;
      const unsubscribe = subscribe((state) => {
        currentMonth = state.currentMonth;
      });
      unsubscribe(); // Immediately unsubscribe after getting the value

      if (currentMonth) {
        await this.loadMonth(currentMonth);
      }
    },

    // Optimistic update for bill close/reopen
    // When totalPaid is provided (e.g., from Pay Full), also update payment totals
    updateBillClosedStatus(
      instanceId: string,
      isClosed: boolean,
      totalPaid?: number,
      closedDate?: string
    ): void {
      update((state) => {
        if (!state.data) return state;

        const today = getTodayDateString();
        const resolvedCloseDate = closedDate ?? today;

        const newBillSections: CategorySection[] = state.data.billSections.map((section) => {
          const billItems = section.items as BillInstanceDetailed[];
          const newItems = billItems.map((item) => {
            if (item.id === instanceId) {
              const newTotalPaid = totalPaid !== undefined ? totalPaid : item.total_paid;
              return {
                ...item,
                is_closed: isClosed,
                closed_date: isClosed ? resolvedCloseDate : null,
                total_paid: newTotalPaid,
                remaining: Math.max(0, item.expected_amount - newTotalPaid),
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
            subtotal: { expected, actual },
          };
        });

        return {
          ...state,
          data: {
            ...state.data,
            billSections: newBillSections,
          },
        };
      });
    },

    // Optimistic update for income close/reopen
    // When totalReceived is provided (e.g., from Receive Full), also update payment totals
    updateIncomeClosedStatus(
      instanceId: string,
      isClosed: boolean,
      totalReceived?: number,
      closedDate?: string
    ): void {
      update((state) => {
        if (!state.data) return state;

        const today = getTodayDateString();
        const resolvedCloseDate = closedDate ?? today;

        const newIncomeSections: CategorySection[] = state.data.incomeSections.map((section) => {
          const incomeItems = section.items as IncomeInstanceDetailed[];
          const newItems = incomeItems.map((item) => {
            if (item.id === instanceId) {
              const newTotalReceived =
                totalReceived !== undefined ? totalReceived : item.total_received;
              return {
                ...item,
                is_closed: isClosed,
                closed_date: isClosed ? resolvedCloseDate : null,
                total_received: newTotalReceived,
                remaining: Math.max(0, item.expected_amount - newTotalReceived),
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
            subtotal: { expected, actual },
          };
        });

        return {
          ...state,
          data: {
            ...state.data,
            incomeSections: newIncomeSections,
          },
        };
      });
    },

    // Optimistic update for expected amount change
    updateBillExpectedAmount(instanceId: string, newExpected: number): void {
      update((state) => {
        if (!state.data) return state;

        const newBillSections: CategorySection[] = state.data.billSections.map((section) => {
          const billItems = section.items as BillInstanceDetailed[];
          const newItems = billItems.map((item) => {
            if (item.id === instanceId) {
              return {
                ...item,
                expected_amount: newExpected,
                remaining: Math.max(0, newExpected - item.total_paid),
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
            subtotal: { expected, actual },
          };
        });

        return {
          ...state,
          data: {
            ...state.data,
            billSections: newBillSections,
          },
        };
      });
    },

    // Optimistic update for income expected amount change
    updateIncomeExpectedAmount(instanceId: string, newExpected: number): void {
      update((state) => {
        if (!state.data) return state;

        const newIncomeSections: CategorySection[] = state.data.incomeSections.map((section) => {
          const incomeItems = section.items as IncomeInstanceDetailed[];
          const newItems = incomeItems.map((item) => {
            if (item.id === instanceId) {
              return {
                ...item,
                expected_amount: newExpected,
                remaining: Math.max(0, newExpected - item.total_received),
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
            subtotal: { expected, actual },
          };
        });

        return {
          ...state,
          data: {
            ...state.data,
            incomeSections: newIncomeSections,
          },
        };
      });
    },

    // Optimistic removal of a bill instance from the store
    removeBillInstance(instanceId: string): void {
      update((state) => {
        if (!state.data) return state;

        const newBillSections: CategorySection[] = state.data.billSections.map((section) => {
          const billItems = section.items as BillInstanceDetailed[];
          const newItems = billItems.filter((item) => item.id !== instanceId);

          // Recalculate subtotal
          const expected = newItems.reduce((sum, i) => sum + i.expected_amount, 0);
          const actual = newItems.reduce((sum, i) => sum + i.total_paid, 0);

          return {
            ...section,
            items: newItems,
            subtotal: { expected, actual },
          };
        });

        // Filter out empty sections
        const filteredBillSections = newBillSections.filter((section) => section.items.length > 0);

        return {
          ...state,
          data: {
            ...state.data,
            billSections: filteredBillSections,
          },
        };
      });
    },

    // Optimistic removal of an income instance from the store
    removeIncomeInstance(instanceId: string): void {
      update((state) => {
        if (!state.data) return state;

        const newIncomeSections: CategorySection[] = state.data.incomeSections.map((section) => {
          const incomeItems = section.items as IncomeInstanceDetailed[];
          const newItems = incomeItems.filter((item) => item.id !== instanceId);

          // Recalculate subtotal
          const expected = newItems.reduce((sum, i) => sum + i.expected_amount, 0);
          const actual = newItems.reduce((sum, i) => sum + i.total_received, 0);

          return {
            ...section,
            items: newItems,
            subtotal: { expected, actual },
          };
        });

        // Filter out empty sections
        const filteredIncomeSections = newIncomeSections.filter(
          (section) => section.items.length > 0
        );

        return {
          ...state,
          data: {
            ...state.data,
            incomeSections: filteredIncomeSections,
          },
        };
      });
    },

    // Optimistic update for occurrence notes (doesn't trigger full refresh)
    updateOccurrenceNotes(
      instanceId: string,
      occurrenceId: string,
      notes: string | null,
      type: 'bill' | 'income' = 'bill'
    ): void {
      // Convert null to undefined to match Occurrence.notes type
      const normalizedNotes = notes ?? undefined;

      update((state) => {
        if (!state.data) return state;

        if (type === 'bill') {
          const newBillSections: CategorySection[] = state.data.billSections.map((section) => {
            const billItems = section.items as BillInstanceDetailed[];
            const newItems = billItems.map((item) => {
              if (item.id === instanceId) {
                return {
                  ...item,
                  occurrences: item.occurrences.map((occ) =>
                    occ.id === occurrenceId ? { ...occ, notes: normalizedNotes } : occ
                  ),
                };
              }
              return item;
            });

            return {
              ...section,
              items: newItems,
            };
          });

          return {
            ...state,
            data: {
              ...state.data,
              billSections: newBillSections,
            },
          };
        } else {
          const newIncomeSections: CategorySection[] = state.data.incomeSections.map((section) => {
            const incomeItems = section.items as IncomeInstanceDetailed[];
            const newItems = incomeItems.map((item) => {
              if (item.id === instanceId) {
                return {
                  ...item,
                  occurrences: item.occurrences.map((occ) =>
                    occ.id === occurrenceId ? { ...occ, notes: normalizedNotes } : occ
                  ),
                };
              }
              return item;
            });

            return {
              ...section,
              items: newItems,
            };
          });

          return {
            ...state,
            data: {
              ...state.data,
              incomeSections: newIncomeSections,
            },
          };
        }
      });
    },

    clear(): void {
      set({
        data: null,
        loading: false,
        error: null,
        currentMonth: null,
      });
    },
  };
}

export const detailedMonth = createDetailedMonthStore();

// Derived stores for convenient access
export const detailedMonthData = derived(detailedMonth, ($state) => $state.data);
export const detailedMonthLoading = derived(detailedMonth, ($state) => $state.loading);
export const detailedMonthError = derived(detailedMonth, ($state) => $state.error);
