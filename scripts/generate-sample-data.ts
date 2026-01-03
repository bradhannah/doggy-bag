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
// Month Data Generation Types
// ============================================================================

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_source_id: string;
  created_at: string;
  updated_at: string;
}

interface Occurrence {
  id: string;
  sequence: number;
  expected_date: string;
  expected_amount: number;
  is_closed: boolean;
  payments: Payment[];
  is_adhoc: boolean;
  created_at: string;
  updated_at: string;
}

interface BillInstance {
  id: string;
  bill_id: string;
  month: string;
  billing_period: BillingPeriod;
  amount: number;
  expected_amount: number;
  payments: Payment[];
  occurrences: Occurrence[];
  is_default: boolean;
  is_paid: boolean;
  is_closed: boolean;
  is_adhoc: boolean;
  created_at: string;
  updated_at: string;
}

interface IncomeInstance {
  id: string;
  income_id: string;
  month: string;
  billing_period: BillingPeriod;
  amount: number;
  expected_amount: number;
  payments: Payment[];
  occurrences: Occurrence[];
  is_default: boolean;
  is_paid: boolean;
  is_closed: boolean;
  is_adhoc: boolean;
  created_at: string;
  updated_at: string;
}

interface VariableExpense {
  id: string;
  name: string;
  amount: number;
  payment_source_id: string;
  month: string;
  created_at: string;
  updated_at: string;
}

interface MonthData {
  month: string;
  bill_instances: BillInstance[];
  income_instances: IncomeInstance[];
  variable_expenses: VariableExpense[];
  free_flowing_expenses: unknown[];
  bank_balances: Record<string, number>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Month Data Generation Helpers
// ============================================================================

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getBiWeeklyDatesInMonth(startDate: string, year: number, month: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  
  // Find occurrences in this month
  let current = new Date(start);
  while (current <= monthEnd) {
    if (current >= monthStart && current <= monthEnd) {
      dates.push(formatDate(current.getFullYear(), current.getMonth() + 1, current.getDate()));
    }
    current.setDate(current.getDate() + 14);
  }
  
  // Also check backwards from start date
  current = new Date(start);
  current.setDate(current.getDate() - 14);
  while (current >= monthStart) {
    if (current >= monthStart && current <= monthEnd) {
      dates.unshift(formatDate(current.getFullYear(), current.getMonth() + 1, current.getDate()));
    }
    current.setDate(current.getDate() - 14);
  }
  
  return dates;
}

function generateBillInstance(bill: Bill, monthStr: string, isPastMonth: boolean): BillInstance {
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = getDaysInMonth(year, month);
  
  let occurrences: Occurrence[] = [];
  
  if (bill.billing_period === 'monthly') {
    const day = Math.min(bill.day_of_month || 1, daysInMonth);
    const expectedDate = formatDate(year, month, day);
    const isPaid = isPastMonth || (bill.day_of_month || 1) < 15; // Past months all paid, current month paid if early
    
    const payments: Payment[] = isPaid ? [{
      id: randomUUID(),
      amount: bill.amount,
      payment_date: expectedDate,
      payment_source_id: bill.payment_source_id,
      created_at: now,
      updated_at: now
    }] : [];
    
    occurrences.push({
      id: randomUUID(),
      sequence: 1,
      expected_date: expectedDate,
      expected_amount: bill.amount,
      is_closed: isPaid,
      payments,
      is_adhoc: false,
      created_at: now,
      updated_at: now
    });
  } else if (bill.billing_period === 'bi_weekly' && bill.start_date) {
    const dates = getBiWeeklyDatesInMonth(bill.start_date, year, month);
    occurrences = dates.map((date, idx) => {
      const isPaid = isPastMonth;
      const payments: Payment[] = isPaid ? [{
        id: randomUUID(),
        amount: bill.amount,
        payment_date: date,
        payment_source_id: bill.payment_source_id,
        created_at: now,
        updated_at: now
      }] : [];
      
      return {
        id: randomUUID(),
        sequence: idx + 1,
        expected_date: date,
        expected_amount: bill.amount,
        is_closed: isPaid,
        payments,
        is_adhoc: false,
        created_at: now,
        updated_at: now
      };
    });
  }
  
  const totalAmount = occurrences.reduce((sum, o) => sum + o.expected_amount, 0);
  const allPaid = occurrences.length > 0 && occurrences.every(o => o.is_closed);
  
  return {
    id: randomUUID(),
    bill_id: bill.id,
    month: monthStr,
    billing_period: bill.billing_period,
    amount: totalAmount,
    expected_amount: totalAmount,
    payments: [],
    occurrences,
    is_default: true,
    is_paid: allPaid,
    is_closed: allPaid,
    is_adhoc: false,
    created_at: now,
    updated_at: now
  };
}

function generateIncomeInstance(income: Income, monthStr: string, isPastMonth: boolean): IncomeInstance {
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = getDaysInMonth(year, month);
  
  let occurrences: Occurrence[] = [];
  
  if (income.billing_period === 'monthly') {
    const day = Math.min(income.day_of_month || 1, daysInMonth);
    const expectedDate = formatDate(year, month, day);
    const isPaid = isPastMonth || (income.day_of_month || 1) < 15;
    
    const payments: Payment[] = isPaid ? [{
      id: randomUUID(),
      amount: income.amount,
      payment_date: expectedDate,
      payment_source_id: income.payment_source_id,
      created_at: now,
      updated_at: now
    }] : [];
    
    occurrences.push({
      id: randomUUID(),
      sequence: 1,
      expected_date: expectedDate,
      expected_amount: income.amount,
      is_closed: isPaid,
      payments,
      is_adhoc: false,
      created_at: now,
      updated_at: now
    });
  } else if (income.billing_period === 'bi_weekly' && income.start_date) {
    const dates = getBiWeeklyDatesInMonth(income.start_date, year, month);
    occurrences = dates.map((date, idx) => {
      const isPaid = isPastMonth;
      const payments: Payment[] = isPaid ? [{
        id: randomUUID(),
        amount: income.amount,
        payment_date: date,
        payment_source_id: income.payment_source_id,
        created_at: now,
        updated_at: now
      }] : [];
      
      return {
        id: randomUUID(),
        sequence: idx + 1,
        expected_date: date,
        expected_amount: income.amount,
        is_closed: isPaid,
        payments,
        is_adhoc: false,
        created_at: now,
        updated_at: now
      };
    });
  }
  
  const totalAmount = occurrences.reduce((sum, o) => sum + o.expected_amount, 0);
  const allPaid = occurrences.length > 0 && occurrences.every(o => o.is_closed);
  
  return {
    id: randomUUID(),
    income_id: income.id,
    month: monthStr,
    billing_period: income.billing_period,
    amount: totalAmount,
    expected_amount: totalAmount,
    payments: [],
    occurrences,
    is_default: true,
    is_paid: allPaid,
    is_closed: allPaid,
    is_adhoc: false,
    created_at: now,
    updated_at: now
  };
}

function generateMonthData(monthStr: string, isPastMonth: boolean): MonthData {
  const billInstances = bills.map(bill => generateBillInstance(bill, monthStr, isPastMonth));
  const incomeInstances = incomes.map(income => generateIncomeInstance(income, monthStr, isPastMonth));
  
  // Add some variable expenses for past months
  const variableExpenses: VariableExpense[] = [];
  if (isPastMonth) {
    variableExpenses.push({
      id: randomUUID(),
      name: 'Groceries',
      amount: cents(randomBetween(350, 550)),
      payment_source_id: checkingId,
      month: monthStr,
      created_at: now,
      updated_at: now
    });
    variableExpenses.push({
      id: randomUUID(),
      name: 'Dining Out',
      amount: cents(randomBetween(80, 200)),
      payment_source_id: rewardsCCId,
      month: monthStr,
      created_at: now,
      updated_at: now
    });
  }
  
  return {
    month: monthStr,
    bill_instances: billInstances,
    income_instances: incomeInstances,
    variable_expenses: variableExpenses,
    free_flowing_expenses: [],
    bank_balances: {},
    created_at: now,
    updated_at: now
  };
}

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
  
  // Generate month data files
  const monthsToGenerate = [
    { month: '2025-01', isPast: true },
    { month: '2025-02', isPast: true },
    { month: '2025-12', isPast: false }, // "Current" month for demo
  ];
  
  for (const { month, isPast } of monthsToGenerate) {
    const monthData = generateMonthData(month, isPast);
    await Bun.write(
      `${outputDir}/months/${month}.json`,
      JSON.stringify(monthData, null, 2)
    );
  }
  
  console.log('Sample data generated successfully!');
  console.log(`Output directory: ${outputDir}`);
  console.log('');
  console.log('Summary:');
  console.log(`  - ${categories.length} categories`);
  console.log(`  - ${paymentSources.length} payment sources`);
  console.log(`  - ${bills.length} bills`);
  console.log(`  - ${incomes.length} incomes`);
  console.log(`  - ${monthsToGenerate.length} month files`);
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
