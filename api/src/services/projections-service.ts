// Projections Service - Daily balance projections
import { PaymentSourcesServiceImpl } from './payment-sources-service';
import { DetailedViewServiceImpl } from './detailed-view-service';
import { MonthsServiceImpl } from './months-service';
import type { ProjectionResponse, BillInstanceDetailed, IncomeInstanceDetailed } from '../types';
import { calculateUnifiedLeftover } from '../utils/leftover';
import { getOverdueBills, sumOverdueBills } from '../utils/overdue-bills';

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
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    // 2. Get Monthly Data + Payment Sources for unified leftover baseline
    const [monthlyData, paymentSources] = await Promise.all([
      this.monthsService.getMonthlyData(month),
      this.paymentSourcesService.getAll(),
    ]);

    // If no monthly data exists, return an empty projection
    if (!monthlyData) {
      const days: ProjectionResponse['days'] = [];
      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${month}-${String(day).padStart(2, '0')}`;
        days.push({
          date: dateStr,
          balance: null,
          has_balance: false,
          income: 0,
          expense: 0,
          events: [],
          is_deficit: false,
        });
      }
      return {
        start_date: displayStartDate,
        end_date: endDate,
        starting_balance: 0,
        no_data: true,
        days,
        overdue_bills: [],
      };
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
    // Flatten all bill sections into a single list and cast to correct type
    const allBills = detailedData.billSections.flatMap((s) => s.items as BillInstanceDetailed[]);
    const overdueBills = getOverdueBills(allBills, month, todayStr);
    const overdueTotal = sumOverdueBills(overdueBills);

    for (const bill of allBills) {
      const occurrences = bill.occurrences || [];

      for (const occ of occurrences) {
        const dueDate = occ.expected_date;

        // In occurrence-only model, closed = paid
        if (occ.is_closed) {
          // Closed occurrence: actual expense on closed_date or due date
          const closedDate = occ.closed_date || dueDate;
          pushEvent(closedDate, {
            name: bill.name,
            amount: occ.expected_amount,
            type: 'expense',
            kind: 'actual',
          });
          continue;
        }

        // Open occurrence: scheduled expense
        if (dueDate < balanceStartDate) {
          // Overdue - schedule for balance start date
          pushEvent(balanceStartDate, {
            name: bill.name,
            amount: occ.expected_amount,
            type: 'expense',
            kind: 'scheduled',
          });
        } else {
          // Future event
          pushEvent(dueDate, {
            name: bill.name,
            amount: occ.expected_amount,
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

        // In occurrence-only model, closed = received
        if (occ.is_closed) {
          // Closed occurrence: actual income on closed_date or due date
          const closedDate = occ.closed_date || dueDate;
          pushEvent(closedDate, {
            name: income.name,
            amount: occ.expected_amount,
            type: 'income',
            kind: 'actual',
          });
          continue;
        }

        // Open occurrence: scheduled income
        // For income, "overdue" means not yet received. Assume it arrives on start date if past.
        const effectiveDate = dueDate < balanceStartDate ? balanceStartDate : dueDate;

        pushEvent(effectiveDate, {
          name: income.name,
          amount: occ.expected_amount,
          type: 'income',
          kind: 'scheduled',
        });
      }
    }

    // 5. Generate Daily Projection
    // Start with unified leftover baseline - overdue bills
    let currentBalance = startingBalance - overdueTotal;

    const days: ProjectionResponse['days'] = [];

    // Use UTC dates to avoid DST-related duplicate date issues
    const [startYear, startMonth, startDay] = displayStartDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const startUTC = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    const endUTC = new Date(Date.UTC(endYear, endMonth - 1, endDay));

    for (let d = new Date(startUTC); d <= endUTC; d.setUTCDate(d.getUTCDate() + 1)) {
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
