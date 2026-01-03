#!/usr/bin/env bun
/**
 * Generate Anonymized Sample Data for BudgetForFun
 * 
 * Creates realistic but fake budget data for demos and testing.
 * Run with: bun run scripts/generate-sample-data.ts [output-dir]
 * 
 * Default output: ./sample-data/
 */

// Use Bun's native crypto for UUID generation
function randomUUID(): string {
  return crypto.randomUUID();
}

// ============================================================================
// Types
// ============================================================================

type BillingPeriod = 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';
type PaymentSourceType = 'bank_account' | 'credit_card' | 'line_of_credit' | 'cash';
type CategoryType = 'bill' | 'income' | 'variable';

interface PaymentSource {
  id: string;
  name: string;
  type: PaymentSourceType;
  balance: number;
  is_active: boolean;
  exclude_from_leftover?: boolean;
  pay_off_monthly?: boolean;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  is_predefined: boolean;
  sort_order: number;
  color: string;
  type: CategoryType;
  created_at: string;
  updated_at: string;
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  billing_period: BillingPeriod;
  start_date?: string;
  day_of_month?: number;
  payment_source_id: string;
  category_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Income {
  id: string;
  name: string;
  amount: number;
  billing_period: BillingPeriod;
  start_date?: string;
  day_of_month?: number;
  payment_source_id: string;
  category_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Helpers
// ============================================================================

const now = new Date().toISOString();

function cents(dollars: number): number {
  return Math.round(dollars * 100);
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================================
// Sample Data Generation
// ============================================================================

// Categories (use same IDs as predefined for consistency)
const categories: Category[] = [
  { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Housing', type: 'bill', is_predefined: true, sort_order: 0, color: '#3b82f6', created_at: now, updated_at: now },
  { id: '550e8400-e29b-41d4-a716-4466554402', name: 'Utilities', type: 'bill', is_predefined: true, sort_order: 1, color: '#10b981', created_at: now, updated_at: now },
  { id: '550e8400-e29b-41d4-a716-4466554403', name: 'Food & Groceries', type: 'variable', is_predefined: true, sort_order: 2, color: '#f59e0b', created_at: now, updated_at: now },
  { id: '550e8400-e29b-41d4-a716-4466554404', name: 'Transportation', type: 'variable', is_predefined: true, sort_order: 3, color: '#8b5cf6', created_at: now, updated_at: now },
  { id: '550e8400-e29b-41d4-a716-4466554405', name: 'Insurance', type: 'bill', is_predefined: true, sort_order: 4, color: '#ef4444', created_at: now, updated_at: now },
  { id: '550e8400-e29b-41d4-a716-4466554406', name: 'Entertainment', type: 'variable', is_predefined: true, sort_order: 5, color: '#ec4899', created_at: now, updated_at: now },
  { id: '550e8400-e29b-41d4-a716-4466554407', name: 'Healthcare', type: 'bill', is_predefined: true, sort_order: 6, color: '#06b6d4', created_at: now, updated_at: now },
  { id: '550e8400-e29b-41d4-a716-4466554408', name: 'Other', type: 'bill', is_predefined: true, sort_order: 7, color: '#6b7280', created_at: now, updated_at: now },
  { id: '550e8400-e29b-41d4-a716-446655440101', name: 'Salary', type: 'income', is_predefined: true, sort_order: 0, color: '#22c55e', created_at: now, updated_at: now },
  { id: '550e8400-e29b-41d4-a716-446655440102', name: 'Side Income', type: 'income', is_predefined: true, sort_order: 1, color: '#84cc16', created_at: now, updated_at: now },
  { id: '550e8400-e29b-41d4-a716-446655440103', name: 'Other Income', type: 'income', is_predefined: true, sort_order: 2, color: '#14b8a6', created_at: now, updated_at: now },
];

// Payment Sources
const paymentSources: PaymentSource[] = [
  {
    id: randomUUID(),
    name: 'Primary Checking',
    type: 'bank_account',
    balance: cents(4532.18),
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: randomUUID(),
    name: 'Savings Account',
    type: 'bank_account',
    balance: cents(12500.00),
    is_active: true,
    exclude_from_leftover: true, // Emergency fund, don't count in budget
    created_at: now,
    updated_at: now
  },
  {
    id: randomUUID(),
    name: 'Rewards Credit Card',
    type: 'credit_card',
    balance: cents(1847.23),
    is_active: true,
    pay_off_monthly: true,
    created_at: now,
    updated_at: now
  },
  {
    id: randomUUID(),
    name: 'Travel Card',
    type: 'credit_card',
    balance: cents(523.45),
    is_active: true,
    pay_off_monthly: true,
    created_at: now,
    updated_at: now
  },
  {
    id: randomUUID(),
    name: 'Cash',
    type: 'cash',
    balance: cents(150.00),
    is_active: true,
    created_at: now,
    updated_at: now
  }
];

// Get payment source IDs for reference
const checkingId = paymentSources[0].id;
const rewardsCCId = paymentSources[2].id;
const travelCCId = paymentSources[3].id;

// Get category IDs
const housingCatId = categories[0].id;
const utilitiesCatId = categories[1].id;
const transportCatId = categories[3].id;
const insuranceCatId = categories[4].id;
const entertainmentCatId = categories[5].id;
const healthcareCatId = categories[6].id;
const otherCatId = categories[7].id;
const salaryCatId = categories[8].id;
const sideIncomeCatId = categories[9].id;

// Bills - realistic sample data
const bills: Bill[] = [
  // Housing
  {
    id: randomUUID(),
    name: 'Rent',
    amount: cents(1850.00),
    billing_period: 'monthly',
    day_of_month: 1,
    payment_source_id: checkingId,
    category_id: housingCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: randomUUID(),
    name: 'Renters Insurance',
    amount: cents(28.00),
    billing_period: 'monthly',
    day_of_month: 15,
    payment_source_id: rewardsCCId,
    category_id: housingCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  // Utilities
  {
    id: randomUUID(),
    name: 'Electric',
    amount: cents(125.00),
    billing_period: 'monthly',
    day_of_month: 20,
    payment_source_id: checkingId,
    category_id: utilitiesCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: randomUUID(),
    name: 'Internet',
    amount: cents(79.99),
    billing_period: 'monthly',
    day_of_month: 5,
    payment_source_id: rewardsCCId,
    category_id: utilitiesCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: randomUUID(),
    name: 'Cell Phone',
    amount: cents(85.00),
    billing_period: 'monthly',
    day_of_month: 12,
    payment_source_id: rewardsCCId,
    category_id: utilitiesCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: randomUUID(),
    name: 'Water/Sewer',
    amount: cents(45.00),
    billing_period: 'monthly',
    day_of_month: 25,
    payment_source_id: checkingId,
    category_id: utilitiesCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  // Transportation
  {
    id: randomUUID(),
    name: 'Car Payment',
    amount: cents(425.00),
    billing_period: 'monthly',
    day_of_month: 15,
    payment_source_id: checkingId,
    category_id: transportCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: randomUUID(),
    name: 'Car Insurance',
    amount: cents(138.00),
    billing_period: 'monthly',
    day_of_month: 1,
    payment_source_id: checkingId,
    category_id: insuranceCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: randomUUID(),
    name: 'Gas',
    amount: cents(200.00),
    billing_period: 'bi_weekly',
    start_date: '2025-01-03', // Friday
    payment_source_id: rewardsCCId,
    category_id: transportCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  // Insurance
  {
    id: randomUUID(),
    name: 'Health Insurance',
    amount: cents(280.00),
    billing_period: 'monthly',
    day_of_month: 1,
    payment_source_id: checkingId,
    category_id: insuranceCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  // Entertainment
  {
    id: randomUUID(),
    name: 'Streaming Bundle',
    amount: cents(25.99),
    billing_period: 'monthly',
    day_of_month: 8,
    payment_source_id: rewardsCCId,
    category_id: entertainmentCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: randomUUID(),
    name: 'Music Subscription',
    amount: cents(10.99),
    billing_period: 'monthly',
    day_of_month: 15,
    payment_source_id: rewardsCCId,
    category_id: entertainmentCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: randomUUID(),
    name: 'Gym Membership',
    amount: cents(49.99),
    billing_period: 'monthly',
    day_of_month: 1,
    payment_source_id: rewardsCCId,
    category_id: healthcareCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  // Other
  {
    id: randomUUID(),
    name: 'Cloud Storage',
    amount: cents(2.99),
    billing_period: 'monthly',
    day_of_month: 10,
    payment_source_id: rewardsCCId,
    category_id: otherCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: randomUUID(),
    name: 'Password Manager',
    amount: cents(3.00),
    billing_period: 'monthly',
    day_of_month: 20,
    payment_source_id: rewardsCCId,
    category_id: otherCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
];

// Incomes
const incomes: Income[] = [
  {
    id: randomUUID(),
    name: 'Main Job',
    amount: cents(3250.00),
    billing_period: 'bi_weekly',
    start_date: '2025-01-10', // Friday payday
    payment_source_id: checkingId,
    category_id: salaryCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: randomUUID(),
    name: 'Freelance Work',
    amount: cents(500.00),
    billing_period: 'monthly',
    day_of_month: 28, // End of month payment
    payment_source_id: checkingId,
    category_id: sideIncomeCatId,
    is_active: true,
    created_at: now,
    updated_at: now
  },
];

// ============================================================================
// Output
// ============================================================================

async function main() {
  const outputDir = Bun.argv[2] || './sample-data';
  
  // Create output directories using Bun's shell
  await Bun.spawn(['mkdir', '-p', `${outputDir}/entities`, `${outputDir}/months`]).exited;
  
  // Write entity files
  await Bun.write(
    `${outputDir}/entities/categories.json`,
    JSON.stringify(categories, null, 2)
  );
  
  await Bun.write(
    `${outputDir}/entities/payment-sources.json`,
    JSON.stringify(paymentSources, null, 2)
  );
  
  await Bun.write(
    `${outputDir}/entities/bills.json`,
    JSON.stringify(bills, null, 2)
  );
  
  await Bun.write(
    `${outputDir}/entities/incomes.json`,
    JSON.stringify(incomes, null, 2)
  );
  
  // Write empty undo file
  await Bun.write(`${outputDir}/entities/undo.json`, '[]');
  
  // Write .gitkeep files
  await Bun.write(`${outputDir}/months/.gitkeep`, '');
  
  console.log('Sample data generated successfully!');
  console.log(`Output directory: ${outputDir}`);
  console.log('');
  console.log('Summary:');
  console.log(`  - ${categories.length} categories`);
  console.log(`  - ${paymentSources.length} payment sources`);
  console.log(`  - ${bills.length} bills`);
  console.log(`  - ${incomes.length} incomes`);
  console.log('');
  console.log('Monthly totals (approximate):');
  const monthlyBills = bills.reduce((sum, b) => {
    if (b.billing_period === 'monthly') return sum + b.amount;
    if (b.billing_period === 'bi_weekly') return sum + (b.amount * 2.17); // avg 2.17 per month
    if (b.billing_period === 'weekly') return sum + (b.amount * 4.33);
    return sum + b.amount;
  }, 0);
  const monthlyIncome = incomes.reduce((sum, i) => {
    if (i.billing_period === 'monthly') return sum + i.amount;
    if (i.billing_period === 'bi_weekly') return sum + (i.amount * 2.17);
    if (i.billing_period === 'weekly') return sum + (i.amount * 4.33);
    return sum + i.amount;
  }, 0);
  console.log(`  - Expected expenses: $${(monthlyBills / 100).toFixed(2)}`);
  console.log(`  - Expected income: $${(monthlyIncome / 100).toFixed(2)}`);
  console.log(`  - Estimated savings: $${((monthlyIncome - monthlyBills) / 100).toFixed(2)}`);
}

main().catch(console.error);
