// Projections Service - Daily balance projections
import { PaymentSourcesServiceImpl } from './payment-sources-service';
import { DetailedViewServiceImpl } from './detailed-view-service';
import { MonthsServiceImpl } from './months-service';
import type {
  ProjectionResponse,
  BillInstanceDetailed,
  IncomeInstanceDetailed,
  Payment,
} from '../types';
import { calculateUnifiedLeftover } from '../utils/leftover';

export interface ProjectionsService {
  getProjection(month: string): Promise<ProjectionResponse>;
}

export class ProjectionsServiceImpl implements ProjectionsService {
  private paymentSourcesService: PaymentSourcesServiceImpl;
  private detailedViewService: DetailedViewServiceImpl;
  private monthsService: MonthsServiceImpl;

  constructor() {
    this.paymentSourcesService = new PaymentSourcesServiceImpl();
    this.detailedViewService = new DetailedViewServiceImpl();
    this.monthsService = new MonthsServiceImpl();
  }

  public async getProjection(month: string): Promise<ProjectionResponse> {
    // 1. Determine date range
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const displayStartDate = `${month}-01`;
    const isCurrentMonth = todayStr.startsWith(month);
    const balanceStartDate = isCurrentMonth ? todayStr : displayStartDate;

    // Determine end date (last day of month)
    const [year, monthNum] = month.split('-').map(Number);
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${lastDay}`;

    // 2. Get Monthly Data + Payment Sources for unified leftover baseline
    const [monthlyData, paymentSources] = await Promise.all([
      this.monthsService.getMonthlyData(month),
      this.paymentSourcesService.getAll(),
    ]);

    if (!monthlyData) {
      throw new Error(`Monthly data for ${month} not found`);
    }

    const leftoverResult = calculateUnifiedLeftover(monthlyData, paymentSources);

    if (!leftoverResult.isValid) {
      throw new Error(
        leftoverResult.errorMessage || 'Enter bank balances to calculate projections'
      );
    }

    const startingBalance = leftoverResult.bankBalances;

    // 3. Get Monthly Data (Bills/Incomes)
    const detailedData = await this.detailedViewService.getDetailedMonth(month);

    // 4. Build Timeline Events
    // Map: Date -> Events[]
    interface DailyEvent {
      name: string;
      amount: number;
      type: 'income' | 'expense';
      kind: 'actual' | 'scheduled';
    }
    const eventsByDate = new Map<string, DailyEvent[]>();

    function pushEvent(date: string, event: DailyEvent) {
      const events = eventsByDate.get(date) || [];
      events.push(event);
      eventsByDate.set(date, events);
    }

    // Process Bills
    const overdueBills: { name: string; amount: number; due_date: string }[] = [];
    let overdueTotal = 0;

    // Flatten all bill sections into a single list and cast to correct type
    const allBills = detailedData.billSections.flatMap((s) => s.items as BillInstanceDetailed[]);

    for (const bill of allBills) {
      const occurrences = bill.occurrences || [];

      for (const occ of occurrences) {
        const dueDate = occ.expected_date;
        const payments = occ.payments || [];
        const paidAmount = sumPayments(payments) || 0;
        const remaining = occ.expected_amount - paidAmount;

        for (const payment of payments) {
          pushEvent(payment.date, {
            name: bill.name,
            amount: payment.amount,
            type: 'expense',
            kind: 'actual',
          });
        }

        if (occ.is_closed) {
          if (payments.length === 0 && occ.expected_amount > 0 && dueDate < todayStr) {
            pushEvent(dueDate, {
              name: bill.name,
              amount: occ.expected_amount,
              type: 'expense',
              kind: 'actual',
            });
          }
          continue;
        }

        if (remaining <= 0) continue;

        if (dueDate < balanceStartDate) {
          // Overdue
          overdueBills.push({
            name: bill.name,
            amount: remaining,
            due_date: dueDate,
          });
          overdueTotal += remaining;
          pushEvent(balanceStartDate, {
            name: bill.name,
            amount: remaining,
            type: 'expense',
            kind: 'scheduled',
          });
        } else {
          // Future event
          pushEvent(dueDate, {
            name: bill.name,
            amount: remaining,
            type: 'expense',
            kind: 'scheduled',
          });
        }
      }
    }

    // Process Incomes
    // Flatten all income sections into a single list and cast to correct type
    const allIncomes = detailedData.incomeSections.flatMap(
      (s) => s.items as IncomeInstanceDetailed[]
    );

    for (const income of allIncomes) {
      const occurrences = income.occurrences || [];

      for (const occ of occurrences) {
        const dueDate = occ.expected_date;
        const payments = occ.payments || [];
        const paidAmount = sumPayments(payments) || 0;
        const remaining = occ.expected_amount - paidAmount;

        for (const payment of payments) {
          pushEvent(payment.date, {
            name: income.name,
            amount: payment.amount,
            type: 'income',
            kind: 'actual',
          });
        }

        if (occ.is_closed) {
          if (payments.length === 0 && occ.expected_amount > 0 && dueDate < todayStr) {
            pushEvent(dueDate, {
              name: income.name,
              amount: occ.expected_amount,
              type: 'income',
              kind: 'actual',
            });
          }
          continue;
        }

        if (remaining <= 0) continue;

        // For income, "overdue" means not yet received. Assume it arrives on start date if past.
        const effectiveDate = dueDate < balanceStartDate ? balanceStartDate : dueDate;

        pushEvent(effectiveDate, {
          name: income.name,
          amount: remaining,
          type: 'income',
          kind: 'scheduled',
        });
      }
    }

    // 5. Generate Daily Projection
    // Start with unified leftover baseline - overdue bills
    let currentBalance = startingBalance - overdueTotal;

    const days: ProjectionResponse['days'] = [];

    const start = new Date(displayStartDate);
    const end = new Date(endDate);

    // Loop through days
    // Note: iterating Date object directly
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const events = eventsByDate.get(dateStr) || [];

      const isBalanceDay = dateStr >= balanceStartDate;
      let dailyIncome = 0;
      let dailyExpense = 0;

      for (const event of events) {
        if (event.type === 'income') {
          dailyIncome += event.amount;
          if (isBalanceDay) {
            currentBalance += event.amount;
          }
        } else {
          dailyExpense += event.amount;
          if (isBalanceDay) {
            currentBalance -= event.amount;
          }
        }
      }

      days.push({
        date: dateStr,
        balance: isBalanceDay ? currentBalance : null,
        has_balance: isBalanceDay,
        income: dailyIncome,
        expense: dailyExpense,
        events,
        is_deficit: isBalanceDay ? currentBalance < 0 : false,
      });
    }

    return {
      start_date: displayStartDate,
      end_date: endDate,
      starting_balance: startingBalance,
      days,
      overdue_bills: overdueBills,
    };
  }
}

// Helper to sum payments
function sumPayments(payments: Payment[] | undefined): number {
  if (!payments) return 0;
  return payments.reduce((sum, p) => sum + p.amount, 0);
}
