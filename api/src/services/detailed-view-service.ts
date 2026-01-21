// Detailed View Service - Generates comprehensive monthly view data
// Groups bills/incomes by category with tallies and derived fields

import { MonthsServiceImpl } from './months-service';
import { BillsServiceImpl } from './bills-service';
import { IncomesServiceImpl } from './incomes-service';
import { CategoriesServiceImpl } from './categories-service';
import { PaymentSourcesServiceImpl } from './payment-sources-service';
import type { MonthsService } from './months-service';
import type { BillsService } from './bills-service';
import type { IncomesService } from './incomes-service';
import type { CategoriesService } from './categories-service';
import type { PaymentSourcesService } from './payment-sources-service';
import type {
  BillInstance,
  IncomeInstance,
  Category,
  Bill,
  Income,
  PaymentSource,
  DetailedMonthResponse,
  CategorySection,
  BillInstanceDetailed,
  IncomeInstanceDetailed,
  SectionTally,
  PayoffSummary,
} from '../types';
import { getOverdueBills } from '../utils/overdue-bills';
import { calculateDueDate, isOverdue, getDaysOverdue } from '../utils/due-date';
import {
  calculateRegularBillsTally,
  calculateAdhocBillsTally,
  calculateRegularIncomeTally,
  calculateAdhocIncomeTally,
  combineTallies,
  getEffectiveBillAmount,
  getEffectiveIncomeAmount,
} from '../utils/tally';
import { calculateUnifiedLeftover, hasActualsEntered } from '../utils/leftover';
import { sumOccurrencePayments } from '../utils/occurrences';

export interface DetailedViewService {
  getDetailedMonth(month: string): Promise<DetailedMonthResponse>;
}

export class DetailedViewServiceImpl implements DetailedViewService {
  private monthsService: MonthsService;
  private billsService: BillsService;
  private incomesService: IncomesService;
  private categoriesService: CategoriesService;
  private paymentSourcesService: PaymentSourcesService;

  constructor() {
    this.monthsService = new MonthsServiceImpl();
    this.billsService = new BillsServiceImpl();
    this.incomesService = new IncomesServiceImpl();
    this.categoriesService = new CategoriesServiceImpl();
    this.paymentSourcesService = new PaymentSourcesServiceImpl();
  }

  public async getDetailedMonth(month: string): Promise<DetailedMonthResponse> {
    // Fetch all required data in parallel
    const [monthlyData, bills, incomes, categories, paymentSources] = await Promise.all([
      this.monthsService.getMonthlyData(month),
      this.billsService.getAll(),
      this.incomesService.getAll(),
      this.categoriesService.getAll(),
      this.paymentSourcesService.getAll(),
    ]);

    if (!monthlyData) {
      throw new Error(`Monthly data for ${month} not found`);
    }

    // Create lookup maps
    const billsMap = new Map(bills.map((b) => [b.id, b]));
    const incomesMap = new Map(incomes.map((i) => [i.id, i]));
    const paymentSourcesMap = new Map(paymentSources.map((ps) => [ps.id, ps]));
    // Include 'bill', 'variable', and 'savings_goal' category types for expenses
    const billCategories = categories.filter(
      (c) => c.type === 'bill' || c.type === 'variable' || c.type === 'savings_goal'
    );
    const incomeCategories = categories.filter((c) => c.type === 'income');

    // Build detailed bill instances
    const detailedBillInstances = this.buildDetailedBillInstances(
      monthlyData.bill_instances,
      billsMap,
      paymentSourcesMap,
      month
    );

    // Build detailed income instances
    const detailedIncomeInstances = this.buildDetailedIncomeInstances(
      monthlyData.income_instances,
      incomesMap,
      paymentSourcesMap,
      month
    );

    // Group by category
    const billSections = this.groupBillsByCategory(detailedBillInstances, billCategories, billsMap);
    const incomeSections = this.groupIncomesByCategory(
      detailedIncomeInstances,
      incomeCategories,
      incomesMap
    );

    // Calculate tallies with breakdown
    const billsTally = calculateRegularBillsTally(monthlyData.bill_instances);
    const adhocBillsTally = calculateAdhocBillsTally(monthlyData.bill_instances);

    // Calculate CC Payoffs tally (bills with is_payoff_bill = true)
    const payoffBills = monthlyData.bill_instances.filter((bi) => bi.is_payoff_bill === true);
    const ccPayoffsTally: SectionTally = {
      expected: payoffBills.reduce((sum, bi) => sum + (bi.expected_amount || 0), 0),
      actual: payoffBills.reduce((sum, bi) => {
        // Sum of all payments from occurrences
        return sum + sumOccurrencePayments(bi.occurrences || []);
      }, 0),
      remaining: 0,
    };
    ccPayoffsTally.remaining = ccPayoffsTally.expected - ccPayoffsTally.actual;

    // Total expenses includes bills + adhoc + CC payoffs
    const totalExpensesTally = combineTallies(
      combineTallies(billsTally, adhocBillsTally),
      ccPayoffsTally
    );

    const incomeTally = calculateRegularIncomeTally(monthlyData.income_instances);
    const adhocIncomeTally = calculateAdhocIncomeTally(monthlyData.income_instances);
    const totalIncomeTally = combineTallies(incomeTally, adhocIncomeTally);

    // Calculate leftover using unified calculation (pass payment sources to filter excluded accounts)
    const leftoverResult = calculateUnifiedLeftover(monthlyData, paymentSources);
    const hasActuals = hasActualsEntered(monthlyData);

    const overdueBills = getOverdueBills(detailedBillInstances, month);

    // Build payoff summaries
    const payoffSummaries: PayoffSummary[] = payoffBills.map((bi) => {
      const paymentSource = bi.payoff_source_id ? paymentSourcesMap.get(bi.payoff_source_id) : null;
      // Sum payments from occurrences
      const paid = sumOccurrencePayments(bi.occurrences || []);
      const balance = bi.expected_amount || 0;
      return {
        paymentSourceId: bi.payoff_source_id || '',
        paymentSourceName: paymentSource?.name || 'Unknown',
        balance,
        paid,
        remaining: balance - paid,
      };
    });

    return {
      month,
      billSections,
      incomeSections,
      tallies: {
        bills: billsTally,
        adhocBills: adhocBillsTally,
        ccPayoffs: ccPayoffsTally,
        totalExpenses: totalExpensesTally,
        income: incomeTally,
        adhocIncome: adhocIncomeTally,
        totalIncome: totalIncomeTally,
      },
      leftover: leftoverResult.leftover,
      leftoverBreakdown: {
        bankBalances: leftoverResult.bankBalances,
        remainingIncome: leftoverResult.remainingIncome,
        remainingExpenses: leftoverResult.remainingExpenses,
        leftover: leftoverResult.leftover,
        isValid: leftoverResult.isValid,
        hasActuals: hasActuals,
        missingBalances:
          leftoverResult.missingBalances.length > 0 ? leftoverResult.missingBalances : undefined,
        errorMessage: leftoverResult.errorMessage,
      },
      overdue_bills: overdueBills,
      payoffSummaries,
      bankBalances: monthlyData.bank_balances,
      lastUpdated: monthlyData.updated_at,
    };
  }

  private buildDetailedBillInstances(
    instances: BillInstance[],
    billsMap: Map<string, Bill>,
    paymentSourcesMap: Map<string, PaymentSource>,
    month: string
  ): BillInstanceDetailed[] {
    return instances.map((instance) => {
      const bill = instance.bill_id ? billsMap.get(instance.bill_id) : null;
      const paymentSourceId = instance.payment_source_id || bill?.payment_source_id;
      const paymentSource = paymentSourceId ? paymentSourcesMap.get(paymentSourceId) : null;

      // Calculate due date from first occurrence or bill's day_of_month
      const firstOccurrence = instance.occurrences?.[0];
      const dueDay = bill?.day_of_month;
      const calculatedDueDate = calculateDueDate(month, dueDay);
      const dueDate = firstOccurrence?.expected_date || calculatedDueDate || null;

      // Calculate total paid and remaining
      const totalPaid = getEffectiveBillAmount(instance);
      const remaining = Math.max(0, instance.expected_amount - totalPaid);

      // Determine if overdue
      const overdueStatus = isOverdue(dueDate || undefined, instance.is_closed);
      const daysOverdueValue = overdueStatus && dueDate ? getDaysOverdue(dueDate) : null;

      // Compute actual_amount from occurrences
      const actualAmount = sumOccurrencePayments(instance.occurrences || []);

      return {
        id: instance.id,
        bill_id: instance.bill_id,
        name: instance.name || bill?.name || 'Unknown Bill',
        billing_period: instance.billing_period || bill?.billing_period || 'monthly',
        expected_amount: instance.expected_amount,
        actual_amount: actualAmount,
        occurrences: instance.occurrences || [],
        occurrence_count: (instance.occurrences || []).length,
        is_extra_occurrence_month:
          instance.billing_period === 'bi_weekly'
            ? (instance.occurrences || []).length > 2
            : instance.billing_period === 'weekly'
              ? (instance.occurrences || []).length > 4
              : false,
        total_paid: totalPaid,
        remaining,
        is_closed: instance.is_closed,
        is_adhoc: instance.is_adhoc,
        is_payoff_bill: instance.is_payoff_bill ?? false,
        payoff_source_id: instance.payoff_source_id,
        due_date: dueDate,
        closed_date: instance.closed_date ?? null,
        is_overdue: overdueStatus,
        days_overdue: daysOverdueValue,
        payment_source: paymentSource ? { id: paymentSource.id, name: paymentSource.name } : null,
        category_id: instance.category_id || bill?.category_id || '',
        payment_method: bill?.payment_method,
        metadata: instance.metadata,
      };
    });
  }

  private buildDetailedIncomeInstances(
    instances: IncomeInstance[],
    incomesMap: Map<string, Income>,
    paymentSourcesMap: Map<string, PaymentSource>,
    month: string
  ): IncomeInstanceDetailed[] {
    return instances.map((instance) => {
      const income = instance.income_id ? incomesMap.get(instance.income_id) : null;
      const paymentSourceId = instance.payment_source_id || income?.payment_source_id;
      const paymentSource = paymentSourceId ? paymentSourcesMap.get(paymentSourceId) : null;

      // Calculate due date from first occurrence or income's day_of_month
      const firstOccurrence = instance.occurrences?.[0];
      const dueDay = income?.day_of_month;
      const calculatedDueDate = calculateDueDate(month, dueDay);
      const dueDate = firstOccurrence?.expected_date || calculatedDueDate || null;

      // Determine if overdue (for income, this means "expected but not received")
      const overdueStatus = isOverdue(dueDate || undefined, instance.is_closed);

      // Calculate total received from occurrence payments
      const totalReceived = getEffectiveIncomeAmount(instance);
      const remaining = Math.max(0, instance.expected_amount - totalReceived);

      // Compute actual_amount from occurrences
      const actualAmount = sumOccurrencePayments(instance.occurrences || []);

      return {
        id: instance.id,
        income_id: instance.income_id,
        name: instance.name || income?.name || 'Unknown Income',
        billing_period: instance.billing_period || income?.billing_period || 'monthly',
        expected_amount: instance.expected_amount,
        actual_amount: actualAmount,
        occurrences: instance.occurrences || [],
        occurrence_count: (instance.occurrences || []).length,
        is_extra_occurrence_month:
          instance.billing_period === 'bi_weekly'
            ? (instance.occurrences || []).length > 2
            : instance.billing_period === 'weekly'
              ? (instance.occurrences || []).length > 4
              : false,
        total_received: totalReceived,
        remaining,
        is_closed: instance.is_closed,
        is_adhoc: instance.is_adhoc,
        due_date: dueDate,
        closed_date: instance.closed_date ?? null,
        is_overdue: overdueStatus,
        payment_source: paymentSource ? { id: paymentSource.id, name: paymentSource.name } : null,
        category_id: instance.category_id || income?.category_id || '',
        metadata: instance.metadata,
      };
    });
  }

  private groupBillsByCategory(
    instances: BillInstanceDetailed[],
    categories: Category[],
    billsMap: Map<string, Bill>
  ): CategorySection[] {
    // Create a map of category_id -> instances
    const categoryInstancesMap = new Map<string, BillInstanceDetailed[]>();

    // Initialize with empty arrays for all categories
    for (const category of categories) {
      categoryInstancesMap.set(category.id, []);
    }

    // Also create an "uncategorized" bucket
    const uncategorizedId = '__uncategorized__';
    categoryInstancesMap.set(uncategorizedId, []);

    // Assign instances to categories
    for (const instance of instances) {
      let categoryId = instance.category_id;

      // If no category_id, try to get from the bill
      if (!categoryId && instance.bill_id) {
        const bill = billsMap.get(instance.bill_id);
        categoryId = bill?.category_id || '';
      }

      if (categoryId && categoryInstancesMap.has(categoryId)) {
        categoryInstancesMap.get(categoryId)!.push(instance);
      } else {
        categoryInstancesMap.get(uncategorizedId)!.push(instance);
      }
    }

    // Build sections, sorted by category sort_order
    // Variable category (type: 'variable') always appears last
    const sections: CategorySection[] = [];

    const sortedCategories = [...categories].sort((a, b) => {
      // Variable type always last
      if (a.type === 'variable' && b.type !== 'variable') return 1;
      if (b.type === 'variable' && a.type !== 'variable') return -1;
      // Then by sort_order
      return a.sort_order - b.sort_order;
    });

    for (const category of sortedCategories) {
      const items = categoryInstancesMap.get(category.id) || [];
      // Include empty categories so users can add ad-hoc items to them

      // Sort items within category
      const sortedItems = this.sortBillInstances(items);

      // Calculate subtotal
      const expected = items.reduce((sum, i) => sum + i.expected_amount, 0);
      const actual = items.reduce((sum, i) => sum + i.total_paid, 0);

      sections.push({
        category: {
          id: category.id,
          name: category.name,
          color: category.color,
          sort_order: category.sort_order,
          type: category.type,
        },
        items: sortedItems,
        subtotal: { expected, actual },
      });
    }

    // Add uncategorized at the end if there are any
    const uncategorizedItems = categoryInstancesMap.get(uncategorizedId) || [];
    if (uncategorizedItems.length > 0) {
      const sortedItems = this.sortBillInstances(uncategorizedItems);
      const expected = uncategorizedItems.reduce((sum, i) => sum + i.expected_amount, 0);
      const actual = uncategorizedItems.reduce((sum, i) => sum + i.total_paid, 0);

      sections.push({
        category: {
          id: uncategorizedId,
          name: 'Uncategorized',
          color: '#6b7280',
          sort_order: 999,
          type: 'bill',
        },
        items: sortedItems,
        subtotal: { expected, actual },
      });
    }

    return sections;
  }

  private groupIncomesByCategory(
    instances: IncomeInstanceDetailed[],
    categories: Category[],
    incomesMap: Map<string, Income>
  ): CategorySection[] {
    // Create a map of category_id -> instances
    const categoryInstancesMap = new Map<string, IncomeInstanceDetailed[]>();

    // Initialize with empty arrays for all categories
    for (const category of categories) {
      categoryInstancesMap.set(category.id, []);
    }

    // Also create an "uncategorized" bucket
    const uncategorizedId = '__uncategorized__';
    categoryInstancesMap.set(uncategorizedId, []);

    // Assign instances to categories
    for (const instance of instances) {
      let categoryId = instance.category_id;

      // If no category_id, try to get from the income
      if (!categoryId && instance.income_id) {
        const income = incomesMap.get(instance.income_id);
        categoryId = income?.category_id || '';
      }

      if (categoryId && categoryInstancesMap.has(categoryId)) {
        categoryInstancesMap.get(categoryId)!.push(instance);
      } else {
        categoryInstancesMap.get(uncategorizedId)!.push(instance);
      }
    }

    // Build sections, sorted by category sort_order
    const sections: CategorySection[] = [];

    const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order);

    for (const category of sortedCategories) {
      const items = categoryInstancesMap.get(category.id) || [];
      // Include empty categories so users can add ad-hoc items to them

      // Sort items within category
      const sortedItems = this.sortIncomeInstances(items);

      // Calculate subtotal
      const expected = items.reduce((sum, i) => sum + i.expected_amount, 0);
      const actual = items.reduce((sum, i) => sum + (i.actual_amount ?? 0), 0);

      sections.push({
        category: {
          id: category.id,
          name: category.name,
          color: category.color,
          sort_order: category.sort_order,
          type: category.type,
        },
        items: sortedItems,
        subtotal: { expected, actual },
      });
    }

    // Add uncategorized at the end if there are any
    const uncategorizedItems = categoryInstancesMap.get(uncategorizedId) || [];
    if (uncategorizedItems.length > 0) {
      const sortedItems = this.sortIncomeInstances(uncategorizedItems);
      const expected = uncategorizedItems.reduce((sum, i) => sum + i.expected_amount, 0);
      const actual = uncategorizedItems.reduce((sum, i) => sum + (i.actual_amount ?? 0), 0);

      sections.push({
        category: {
          id: uncategorizedId,
          name: 'Uncategorized',
          color: '#6b7280',
          sort_order: 999,
          type: 'income',
        },
        items: sortedItems,
        subtotal: { expected, actual },
      });
    }

    return sections;
  }

  private sortBillInstances(items: BillInstanceDetailed[]): BillInstanceDetailed[] {
    return [...items].sort((a, b) => {
      // Ad-hoc last
      if (a.is_adhoc !== b.is_adhoc) return a.is_adhoc ? 1 : -1;
      // Open (not closed) first
      if (a.is_closed !== b.is_closed) return a.is_closed ? 1 : -1;
      // Soonest due first - use first occurrence expected_date
      const aDueDate = a.occurrences?.[0]?.expected_date;
      const bDueDate = b.occurrences?.[0]?.expected_date;
      if (aDueDate && bDueDate) {
        return aDueDate.localeCompare(bDueDate);
      }
      if (aDueDate) return -1;
      if (bDueDate) return 1;
      // Alphabetical
      return a.name.localeCompare(b.name);
    });
  }

  private sortIncomeInstances(items: IncomeInstanceDetailed[]): IncomeInstanceDetailed[] {
    return [...items].sort((a, b) => {
      // Ad-hoc last
      if (a.is_adhoc !== b.is_adhoc) return a.is_adhoc ? 1 : -1;
      // Open (not closed) first
      if (a.is_closed !== b.is_closed) return a.is_closed ? 1 : -1;
      // Soonest due first - use first occurrence expected_date
      const aDueDate = a.occurrences?.[0]?.expected_date;
      const bDueDate = b.occurrences?.[0]?.expected_date;
      if (aDueDate && bDueDate) {
        return aDueDate.localeCompare(bDueDate);
      }
      if (aDueDate) return -1;
      if (bDueDate) return 1;
      // Alphabetical
      return a.name.localeCompare(b.name);
    });
  }
}
