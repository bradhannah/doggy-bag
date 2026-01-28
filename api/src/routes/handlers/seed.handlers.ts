// Seed Defaults Handler - Creates example entities for first-time users

import { PaymentSourcesServiceImpl } from '../../services/payment-sources-service';
import { BillsServiceImpl } from '../../services/bills-service';
import { IncomesServiceImpl } from '../../services/incomes-service';
import { CategoriesServiceImpl } from '../../services/categories-service';
import type { CategoryType } from '../../types';

// Service instances
const paymentSourcesService = new PaymentSourcesServiceImpl();
const billsService = new BillsServiceImpl();
const incomesService = new IncomesServiceImpl();
const categoriesService = new CategoriesServiceImpl();

// Default payment sources
const DEFAULT_PAYMENT_SOURCES = [
  { name: 'Main Checking', type: 'bank_account' as const },
  { name: 'Credit Card', type: 'credit_card' as const },
  { name: 'Cash', type: 'cash' as const },
];

// Default bill categories (with sort_order and color for 002-detailed-monthly-view)
const DEFAULT_BILL_CATEGORIES = [
  {
    name: 'Home',
    sort_order: 0,
    color: '#3b82f6',
    type: 'bill' as CategoryType,
    is_predefined: true,
  },
  {
    name: 'Debt',
    sort_order: 1,
    color: '#ef4444',
    type: 'bill' as CategoryType,
    is_predefined: true,
  },
  {
    name: 'Utilities',
    sort_order: 2,
    color: '#f59e0b',
    type: 'bill' as CategoryType,
    is_predefined: true,
  },
  {
    name: 'Streaming',
    sort_order: 3,
    color: '#8b5cf6',
    type: 'bill' as CategoryType,
    is_predefined: true,
  },
  {
    name: 'Transportation',
    sort_order: 4,
    color: '#10b981',
    type: 'bill' as CategoryType,
    is_predefined: true,
  },
  {
    name: 'Entertainment',
    sort_order: 5,
    color: '#ec4899',
    type: 'bill' as CategoryType,
    is_predefined: true,
  },
  {
    name: 'Insurance',
    sort_order: 6,
    color: '#06b6d4',
    type: 'bill' as CategoryType,
    is_predefined: true,
  },
  {
    name: 'Subscriptions',
    sort_order: 7,
    color: '#6366f1',
    type: 'bill' as CategoryType,
    is_predefined: true,
  },
  {
    name: 'Variable',
    sort_order: 8,
    color: '#f97316',
    type: 'bill' as CategoryType,
    is_predefined: true,
  },
  {
    name: 'Ad-hoc',
    sort_order: 9,
    color: '#64748b',
    type: 'bill' as CategoryType,
    is_predefined: true,
  },
  {
    name: 'Insurance Expense',
    sort_order: 10,
    color: '#14b8a6',
    type: 'bill' as CategoryType,
    is_predefined: true,
  },
];

// Default income categories (NEW for 002-detailed-monthly-view)
const DEFAULT_INCOME_CATEGORIES = [
  {
    name: 'Salary',
    sort_order: 0,
    color: '#10b981',
    type: 'income' as CategoryType,
    is_predefined: true,
  },
  {
    name: 'Freelance/Contract',
    sort_order: 1,
    color: '#8b5cf6',
    type: 'income' as CategoryType,
    is_predefined: true,
  },
  {
    name: 'Investment',
    sort_order: 2,
    color: '#3b82f6',
    type: 'income' as CategoryType,
    is_predefined: true,
  },
  {
    name: 'Government',
    sort_order: 3,
    color: '#f59e0b',
    type: 'income' as CategoryType,
    is_predefined: true,
  },
  {
    name: 'Other',
    sort_order: 4,
    color: '#64748b',
    type: 'income' as CategoryType,
    is_predefined: true,
  },
  {
    name: 'Ad-hoc',
    sort_order: 5,
    color: '#ec4899',
    type: 'income' as CategoryType,
    is_predefined: true,
  },
  {
    name: 'Insurance Reimbursement',
    sort_order: 6,
    color: '#14b8a6',
    type: 'income' as CategoryType,
    is_predefined: true,
  },
];

// Default bills (amounts in cents)
const DEFAULT_BILLS = [
  { name: 'Rent/Mortgage', amount: 150000, billing_period: 'monthly' as const, day_of_month: 1 },
  { name: 'Electric', amount: 12500, billing_period: 'monthly' as const, day_of_month: 15 },
  { name: 'Internet', amount: 7500, billing_period: 'monthly' as const, day_of_month: 20 },
  { name: 'Car Insurance', amount: 15000, billing_period: 'monthly' as const, day_of_month: 5 },
  {
    name: 'Streaming Services',
    amount: 4500,
    billing_period: 'monthly' as const,
    day_of_month: 10,
  },
  { name: 'Phone', amount: 8500, billing_period: 'monthly' as const, day_of_month: 25 },
];

// Default incomes (amounts in cents)
const DEFAULT_INCOMES = [
  {
    name: 'Salary',
    amount: 250000,
    billing_period: 'bi_weekly' as const,
    start_date: '2025-01-03',
  }, // $2,500 bi-weekly
  { name: 'Side Gig', amount: 50000, billing_period: 'monthly' as const, day_of_month: 15 }, // $500/month on the 15th
];

interface SeedResult {
  seeded: boolean;
  message: string;
  created: {
    paymentSources: number;
    bills: number;
    incomes: number;
    categories: number;
  };
}

export function createSeedDefaultsHandler() {
  return async (_req: Request): Promise<Response> => {
    try {
      // Check if entities already exist
      const existingPaymentSources = await paymentSourcesService.getAll();
      const existingBills = await billsService.getAll();
      const existingIncomes = await incomesService.getAll();
      const existingCategories = await categoriesService.getAll();

      // Only seed if ALL entity types are empty
      if (
        existingPaymentSources.length > 0 ||
        existingBills.length > 0 ||
        existingIncomes.length > 0
      ) {
        const result: SeedResult = {
          seeded: false,
          message: 'Data already exists. Clear existing data before seeding defaults.',
          created: { paymentSources: 0, bills: 0, incomes: 0, categories: 0 },
        };
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Create categories first (needed for bill/income assignment later)
      let categoriesCreated = 0;
      const createdBillCategories: Array<{ name: string; id: string }> = [];
      const createdIncomeCategories: Array<{ name: string; id: string }> = [];

      if (existingCategories.length === 0) {
        // Create bill categories
        for (const cat of DEFAULT_BILL_CATEGORIES) {
          const created = await categoriesService.create(cat);
          createdBillCategories.push({ name: cat.name, id: created.id });
          categoriesCreated++;
        }
        // Create income categories
        for (const cat of DEFAULT_INCOME_CATEGORIES) {
          const created = await categoriesService.create(cat);
          createdIncomeCategories.push({ name: cat.name, id: created.id });
          categoriesCreated++;
        }
        console.log(`[SeedHandler] Created ${categoriesCreated} default categories`);
      } else {
        // Use existing categories
        for (const cat of existingCategories) {
          if (cat.type === 'bill') {
            createdBillCategories.push({ name: cat.name, id: cat.id });
          } else if (cat.type === 'income') {
            createdIncomeCategories.push({ name: cat.name, id: cat.id });
          }
        }
      }

      // Get default category IDs for bills and incomes
      const homeCategoryId = createdBillCategories.find((c) => c.name === 'Home')?.id;
      const utilitiesCategoryId = createdBillCategories.find((c) => c.name === 'Utilities')?.id;
      const transportationCategoryId = createdBillCategories.find(
        (c) => c.name === 'Transportation'
      )?.id;
      const streamingCategoryId = createdBillCategories.find((c) => c.name === 'Streaming')?.id;
      const subscriptionsCategoryId = createdBillCategories.find(
        (c) => c.name === 'Subscriptions'
      )?.id;
      const salaryCategoryId = createdIncomeCategories.find((c) => c.name === 'Salary')?.id;
      const freelanceCategoryId = createdIncomeCategories.find(
        (c) => c.name === 'Freelance/Contract'
      )?.id;

      // Fallback to first category if specific one not found
      const defaultBillCategoryId = homeCategoryId || createdBillCategories[0]?.id;
      const defaultIncomeCategoryId = salaryCategoryId || createdIncomeCategories[0]?.id;

      if (!defaultBillCategoryId || !defaultIncomeCategoryId) {
        throw new Error('Failed to find or create required categories');
      }

      // Create payment sources and track their IDs
      const createdPaymentSources: Array<{ name: string; id: string }> = [];
      for (const ps of DEFAULT_PAYMENT_SOURCES) {
        const created = await paymentSourcesService.create(ps);
        createdPaymentSources.push({ name: ps.name, id: created.id });
      }

      // Get the Main Checking ID for bills and incomes
      const mainCheckingId = createdPaymentSources.find((ps) => ps.name === 'Main Checking')?.id;

      if (!mainCheckingId) {
        throw new Error('Failed to create Main Checking payment source');
      }

      // Create bills with category assignments
      // Map bill names to categories
      const billCategoryMap: Record<string, string> = {
        'Rent/Mortgage': homeCategoryId || defaultBillCategoryId,
        Electric: utilitiesCategoryId || defaultBillCategoryId,
        Internet: utilitiesCategoryId || defaultBillCategoryId,
        'Car Insurance': transportationCategoryId || defaultBillCategoryId,
        'Streaming Services': streamingCategoryId || defaultBillCategoryId,
        Phone: subscriptionsCategoryId || defaultBillCategoryId,
      };

      for (const bill of DEFAULT_BILLS) {
        await billsService.create({
          ...bill,
          payment_source_id: mainCheckingId,
          category_id: billCategoryMap[bill.name] || defaultBillCategoryId,
        });
      }

      // Create incomes with category assignments
      const incomeCategoryMap: Record<string, string> = {
        Salary: salaryCategoryId || defaultIncomeCategoryId,
        'Side Gig': freelanceCategoryId || defaultIncomeCategoryId,
      };

      for (const income of DEFAULT_INCOMES) {
        await incomesService.create({
          ...income,
          payment_source_id: mainCheckingId,
          category_id: incomeCategoryMap[income.name] || defaultIncomeCategoryId,
        });
      }

      const result: SeedResult = {
        seeded: true,
        message: 'Successfully seeded default entities',
        created: {
          paymentSources: DEFAULT_PAYMENT_SOURCES.length,
          bills: DEFAULT_BILLS.length,
          incomes: DEFAULT_INCOMES.length,
          categories: categoriesCreated,
        },
      };

      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error seeding defaults:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to seed defaults',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}
