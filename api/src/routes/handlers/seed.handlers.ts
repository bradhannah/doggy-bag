// Seed Defaults Handler - Creates example entities for first-time users

import { PaymentSourcesServiceImpl } from '../../services/payment-sources-service';
import { BillsServiceImpl } from '../../services/bills-service';
import { IncomesServiceImpl } from '../../services/incomes-service';

// Service instances
const paymentSourcesService = new PaymentSourcesServiceImpl();
const billsService = new BillsServiceImpl();
const incomesService = new IncomesServiceImpl();

// Default payment sources
const DEFAULT_PAYMENT_SOURCES = [
  { name: 'Main Checking', type: 'bank_account' as const, balance: 500000 }, // $5,000
  { name: 'Credit Card', type: 'credit_card' as const, balance: -120000 },   // -$1,200 debt
  { name: 'Cash', type: 'cash' as const, balance: 30000 }                    // $300
];

// Default bills (amounts in cents)
const DEFAULT_BILLS = [
  { name: 'Rent/Mortgage', amount: 150000, billing_period: 'monthly' as const, day_of_month: 1 },
  { name: 'Electric', amount: 12500, billing_period: 'monthly' as const, day_of_month: 15 },
  { name: 'Internet', amount: 7500, billing_period: 'monthly' as const, day_of_month: 20 },
  { name: 'Car Insurance', amount: 15000, billing_period: 'monthly' as const, day_of_month: 5 },
  { name: 'Streaming Services', amount: 4500, billing_period: 'monthly' as const, day_of_month: 10 },
  { name: 'Phone', amount: 8500, billing_period: 'monthly' as const, day_of_month: 25 }
];

// Default incomes (amounts in cents)
const DEFAULT_INCOMES = [
  { name: 'Salary', amount: 250000, billing_period: 'bi_weekly' as const, start_date: '2025-01-03' }, // $2,500 bi-weekly
  { name: 'Side Gig', amount: 50000, billing_period: 'monthly' as const, day_of_month: 15 } // $500/month on the 15th
];

interface SeedResult {
  seeded: boolean;
  message: string;
  created: {
    paymentSources: number;
    bills: number;
    incomes: number;
  };
}

export function createSeedDefaultsHandler() {
  return async (req: Request): Promise<Response> => {
    try {
      // Check if entities already exist
      const existingPaymentSources = await paymentSourcesService.getAll();
      const existingBills = await billsService.getAll();
      const existingIncomes = await incomesService.getAll();

      // Only seed if ALL entity types are empty
      if (existingPaymentSources.length > 0 || existingBills.length > 0 || existingIncomes.length > 0) {
        const result: SeedResult = {
          seeded: false,
          message: 'Data already exists. Clear existing data before seeding defaults.',
          created: { paymentSources: 0, bills: 0, incomes: 0 }
        };
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Create payment sources and track their IDs
      const createdPaymentSources: Array<{ name: string; id: string }> = [];
      for (const ps of DEFAULT_PAYMENT_SOURCES) {
        const created = await paymentSourcesService.create(ps);
        createdPaymentSources.push({ name: ps.name, id: created.id });
      }

      // Get the Main Checking ID for bills and incomes
      const mainCheckingId = createdPaymentSources.find(ps => ps.name === 'Main Checking')?.id;
      
      if (!mainCheckingId) {
        throw new Error('Failed to create Main Checking payment source');
      }

      // Create bills
      for (const bill of DEFAULT_BILLS) {
        await billsService.create({
          ...bill,
          payment_source_id: mainCheckingId
        });
      }

      // Create incomes
      for (const income of DEFAULT_INCOMES) {
        await incomesService.create({
          ...income,
          payment_source_id: mainCheckingId
        });
      }

      const result: SeedResult = {
        seeded: true,
        message: 'Successfully seeded default entities',
        created: {
          paymentSources: DEFAULT_PAYMENT_SOURCES.length,
          bills: DEFAULT_BILLS.length,
          incomes: DEFAULT_INCOMES.length
        }
      };

      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error seeding defaults:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to seed defaults',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}
