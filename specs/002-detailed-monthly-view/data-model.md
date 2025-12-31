# Data Model: Detailed Monthly View

**Feature**: [spec.md](./spec.md)  
**Date**: 2025-12-31  
**Extends**: [001-monthly-budget/data-model.md](../001-monthly-budget/data-model.md)

---

## Overview

This data model extends the 001-monthly-budget entities to support the Detailed Monthly View. Changes are additive (backward compatible with existing data).

---

## Entity Extensions

### Category (Extended)

**New Fields**:
```typescript
interface Category {
  id: string;
  name: string;
  is_predefined: boolean;
  sort_order: number;        // NEW: Display order (0 = first)
  color: string;             // NEW: Hex color for header accent (e.g., "#3b82f6")
  type: 'bill' | 'income';   // NEW: Distinguishes bill vs income categories
  created_at: string;
  updated_at: string;
}
```

**Validation Rules (New)**:
- `sort_order` must be >= 0
- `color` must be valid hex format (#RRGGBB or #RGB)
- `type` must be 'bill' or 'income'

**Migration**:
- Existing categories get `sort_order` based on current array position
- Existing categories get default `color` from palette
- Existing categories get `type: 'bill'` (all existing are bill categories)
- New income categories created with `type: 'income'`

**Default Bill Categories** (with colors):
| Name | sort_order | color | is_predefined |
|------|------------|-------|---------------|
| Home | 0 | #3b82f6 | true |
| Debt | 1 | #ef4444 | true |
| Utilities | 2 | #f59e0b | true |
| Streaming | 3 | #8b5cf6 | true |
| Transportation | 4 | #10b981 | true |
| Entertainment | 5 | #ec4899 | true |
| Insurance | 6 | #06b6d4 | true |
| Subscriptions | 7 | #6366f1 | true |
| Variable | 8 | #f97316 | true |
| Ad-hoc | 9 | #64748b | true |

**Default Income Categories** (new):
| Name | sort_order | color | is_predefined |
|------|------------|-------|---------------|
| Salary | 0 | #10b981 | true |
| Freelance/Contract | 1 | #8b5cf6 | true |
| Investment | 2 | #3b82f6 | true |
| Government | 3 | #f59e0b | true |
| Other | 4 | #64748b | true |
| Ad-hoc | 5 | #ec4899 | true |

---

### Bill (Extended)

**New Fields**:
```typescript
interface Bill {
  id: string;
  name: string;
  amount: number;
  billing_period: BillingPeriod;
  start_date?: string;
  day_of_month?: number;
  recurrence_week?: number;
  recurrence_day?: number;
  payment_source_id: string;
  category_id?: string;
  due_day?: number;          // NEW: Day of month when due (1-31)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**Validation Rules (New)**:
- `due_day` must be 1-31 if provided
- Due day 31 in short months → use last day of month

**Migration**:
- Existing bills get `due_day: undefined` (no due date)

---

### Income (Extended)

**New Fields**:
```typescript
interface Income {
  id: string;
  name: string;
  amount: number;
  billing_period: BillingPeriod;
  start_date?: string;
  day_of_month?: number;
  recurrence_week?: number;
  recurrence_day?: number;
  payment_source_id: string;
  category_id?: string;       // NEW: Reference to income category
  due_day?: number;           // NEW: Day of month when expected (1-31)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**Validation Rules (New)**:
- `category_id` must reference a category with `type: 'income'`
- `due_day` must be 1-31 if provided

**Migration**:
- Existing incomes get `category_id: undefined` (uncategorized)
- Existing incomes get `due_day: undefined` (no due date)

---

### Payment (New Entity)

**Description**: Represents a single payment toward a bill (for partial payment tracking).

**Fields**:
```typescript
interface Payment {
  id: string;                 // Unique identifier (UUID)
  amount: number;             // Payment amount (positive)
  date: string;               // Date of payment (ISO YYYY-MM-DD)
  created_at: string;         // ISO 8601 timestamp
}
```

**Validation Rules**:
- `amount` must be positive (> 0)
- `date` must be valid ISO date format

**Storage**: Embedded in BillInstance.payments array (not separate file)

---

### BillInstance (Extended)

**New/Modified Fields**:
```typescript
interface BillInstance {
  id: string;
  bill_id: string | null;     // MODIFIED: null for ad-hoc bills
  month: string;
  amount: number;             // DEPRECATED: use expected_amount
  expected_amount: number;    // NEW: From default bill (read-only in Detailed View)
  actual_amount?: number;     // NEW: User-entered actual (for non-partial)
  payments: Payment[];        // NEW: Array of partial payments
  is_default: boolean;
  is_paid: boolean;
  is_adhoc: boolean;          // NEW: True for one-time ad-hoc items
  due_date?: string;          // NEW: Calculated from Bill.due_day + month
  name?: string;              // NEW: For ad-hoc items (bill_id is null)
  category_id?: string;       // NEW: For ad-hoc items (no bill reference)
  payment_source_id?: string; // NEW: For ad-hoc items (no bill reference)
  created_at: string;
  updated_at: string;
}
```

**Validation Rules (New)**:
- If `is_adhoc: true`: `bill_id` must be null, `name` required
- If `is_adhoc: false`: `bill_id` must reference existing Bill
- `expected_amount` must be positive (> 0)
- `actual_amount` must be positive if provided
- `payments` array can be empty (non-partial bill)

**Calculated Fields**:
- `due_date`: Computed as `{month}-{Bill.due_day}` (e.g., "2025-01-15")
- Effective amount for leftover: `sum(payments)` if partial, else `actual_amount`, else 0

**Migration**:
- Existing instances: `expected_amount = amount`, `payments = []`, `is_adhoc = false`
- `amount` field preserved for backward compatibility but deprecated

---

### IncomeInstance (Extended)

**New/Modified Fields**:
```typescript
interface IncomeInstance {
  id: string;
  income_id: string | null;   // MODIFIED: null for ad-hoc income
  month: string;
  amount: number;             // DEPRECATED: use expected_amount
  expected_amount: number;    // NEW: From default income
  actual_amount?: number;     // NEW: User-entered actual
  is_default: boolean;
  is_paid: boolean;           // Represents "received"
  is_adhoc: boolean;          // NEW: True for one-time ad-hoc items
  due_date?: string;          // NEW: Calculated from Income.due_day + month
  name?: string;              // NEW: For ad-hoc items (income_id is null)
  category_id?: string;       // NEW: For ad-hoc items (no income reference)
  payment_source_id?: string; // NEW: For ad-hoc items (no income reference)
  created_at: string;
  updated_at: string;
}
```

**Validation Rules (New)**:
- If `is_adhoc: true`: `income_id` must be null, `name` required
- If `is_adhoc: false`: `income_id` must reference existing Income
- `expected_amount` must be positive (> 0)
- `actual_amount` must be positive if provided

**Migration**:
- Existing instances: `expected_amount = amount`, `is_adhoc = false`

---

### MonthlyData (Extended)

**Updated Structure**:
```typescript
interface MonthlyData {
  month: string;
  bill_instances: BillInstance[];      // Extended structure
  income_instances: IncomeInstance[];  // Extended structure
  variable_expenses: VariableExpense[];
  free_flowing_expenses: FreeFlowingExpense[];
  bank_balances: Record<string, number>;
  created_at: string;
  updated_at: string;
}
```

**Note**: Variable expenses and free-flowing expenses continue to work as before. In the Detailed View, variable expenses appear under "Variable" category and free-flowing under "Ad-hoc" category.

---

## Calculations

### Leftover Calculation (Updated)

**Uses actuals only**:
```typescript
function calculateLeftover(monthData: MonthlyData): number {
  // Bank balances (same as before)
  const totalBankBalances = Object.values(monthData.bank_balances)
    .reduce((sum, balance) => sum + balance, 0);
  
  // Actual income (only count actuals entered)
  const totalActualIncome = monthData.income_instances
    .reduce((sum, inc) => sum + (inc.actual_amount ?? 0), 0);
  
  // Actual expenses from bills (partial payments or actual_amount)
  const totalActualBills = monthData.bill_instances
    .reduce((sum, bill) => {
      if (bill.payments.length > 0) {
        return sum + bill.payments.reduce((s, p) => s + p.amount, 0);
      }
      return sum + (bill.actual_amount ?? 0);
    }, 0);
  
  // Variable expenses (always actual)
  const totalVariableExpenses = monthData.variable_expenses
    .reduce((sum, exp) => sum + exp.amount, 0);
  
  // Free-flowing expenses (always actual)
  const totalFreeFlowing = monthData.free_flowing_expenses
    .reduce((sum, exp) => sum + exp.amount, 0);
  
  // Leftover = bank balances + actual income - actual expenses
  return totalBankBalances + totalActualIncome - 
         (totalActualBills + totalVariableExpenses + totalFreeFlowing);
}
```

### Section Tallies

**Bills & Expenses Tally**:
```typescript
interface SectionTally {
  expected: number;   // Sum of expected_amount
  actual: number;     // Sum of effective amounts (payments or actual_amount)
  remaining: number;  // Unpaid expected + partial payment remainders
}

function calculateBillsTally(bills: BillInstance[]): SectionTally {
  return {
    expected: bills.reduce((sum, b) => sum + b.expected_amount, 0),
    actual: bills.reduce((sum, b) => {
      if (b.payments.length > 0) {
        return sum + b.payments.reduce((s, p) => s + p.amount, 0);
      }
      return sum + (b.actual_amount ?? 0);
    }, 0),
    remaining: bills.reduce((sum, b) => {
      if (b.payments.length > 0) {
        // Partial: remaining = expected - paid
        const paid = b.payments.reduce((s, p) => s + p.amount, 0);
        return sum + Math.max(0, b.expected_amount - paid);
      }
      if (!b.is_paid && b.actual_amount === undefined) {
        // Unpaid with no actual: expected is remaining
        return sum + b.expected_amount;
      }
      return sum;
    }, 0)
  };
}
```

### Due Date Calculation

```typescript
function calculateDueDate(month: string, dueDay: number | undefined): string | undefined {
  if (!dueDay) return undefined;
  
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const actualDay = Math.min(dueDay, daysInMonth);
  
  return `${month}-${String(actualDay).padStart(2, '0')}`;
}

function isOverdue(dueDate: string | undefined, isPaid: boolean): boolean {
  if (!dueDate || isPaid) return false;
  const today = new Date().toISOString().split('T')[0];
  return dueDate < today;
}

function getDaysOverdue(dueDate: string): number {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = today.getTime() - due.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
```

---

## File Storage Updates

### categories.json (Updated)

```json
{
  "categories": [
    {
      "id": "cat-home",
      "name": "Home",
      "is_predefined": true,
      "sort_order": 0,
      "color": "#3b82f6",
      "type": "bill",
      "created_at": "2025-12-31T00:00:00Z",
      "updated_at": "2025-12-31T00:00:00Z"
    },
    {
      "id": "cat-salary",
      "name": "Salary",
      "is_predefined": true,
      "sort_order": 0,
      "color": "#10b981",
      "type": "income",
      "created_at": "2025-12-31T00:00:00Z",
      "updated_at": "2025-12-31T00:00:00Z"
    }
  ]
}
```

### months/YYYY-MM.json (Updated)

```json
{
  "month": "2025-01",
  "bill_instances": [
    {
      "id": "bi-1",
      "bill_id": "bill-rent",
      "month": "2025-01",
      "expected_amount": 150000,
      "actual_amount": 150000,
      "payments": [],
      "is_default": true,
      "is_paid": true,
      "is_adhoc": false,
      "due_date": "2025-01-01",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "bi-2",
      "bill_id": "bill-gas",
      "month": "2025-01",
      "expected_amount": 30000,
      "actual_amount": null,
      "payments": [
        { "id": "pay-1", "amount": 12000, "date": "2025-01-05", "created_at": "2025-01-05T00:00:00Z" },
        { "id": "pay-2", "amount": 8000, "date": "2025-01-15", "created_at": "2025-01-15T00:00:00Z" }
      ],
      "is_default": true,
      "is_paid": false,
      "is_adhoc": false,
      "due_date": null,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-15T00:00:00Z"
    },
    {
      "id": "bi-adhoc-1",
      "bill_id": null,
      "month": "2025-01",
      "name": "Car Repair",
      "category_id": "cat-adhoc",
      "payment_source_id": "ps-visa",
      "expected_amount": 0,
      "actual_amount": 80000,
      "payments": [],
      "is_default": false,
      "is_paid": true,
      "is_adhoc": true,
      "due_date": null,
      "created_at": "2025-01-12T00:00:00Z",
      "updated_at": "2025-01-12T00:00:00Z"
    }
  ],
  "income_instances": [
    {
      "id": "ii-1",
      "income_id": "income-salary",
      "month": "2025-01",
      "expected_amount": 400000,
      "actual_amount": 405000,
      "is_default": true,
      "is_paid": true,
      "is_adhoc": false,
      "due_date": "2025-01-15",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-15T00:00:00Z"
    }
  ],
  "variable_expenses": [],
  "free_flowing_expenses": [],
  "bank_balances": {
    "ps-scotia": 350000,
    "ps-visa": -120000,
    "ps-cash": 15000
  },
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-15T00:00:00Z"
}
```

---

## Migration Strategy

### Automatic Migration on Load

When loading data files, check for missing new fields and apply defaults:

```typescript
function migrateBillInstance(instance: any): BillInstance {
  return {
    ...instance,
    expected_amount: instance.expected_amount ?? instance.amount,
    actual_amount: instance.actual_amount ?? (instance.is_paid ? instance.amount : undefined),
    payments: instance.payments ?? [],
    is_adhoc: instance.is_adhoc ?? false,
    due_date: instance.due_date ?? null
  };
}

function migrateCategory(category: any, index: number): Category {
  return {
    ...category,
    sort_order: category.sort_order ?? index,
    color: category.color ?? getDefaultColor(category.name),
    type: category.type ?? 'bill'
  };
}
```

### Seed Income Categories

On first load, if no income categories exist, create defaults:

```typescript
const defaultIncomeCategories: Category[] = [
  { id: 'cat-salary', name: 'Salary', sort_order: 0, color: '#10b981', type: 'income', is_predefined: true },
  { id: 'cat-freelance', name: 'Freelance/Contract', sort_order: 1, color: '#8b5cf6', type: 'income', is_predefined: true },
  { id: 'cat-investment', name: 'Investment', sort_order: 2, color: '#3b82f6', type: 'income', is_predefined: true },
  { id: 'cat-government', name: 'Government', sort_order: 3, color: '#f59e0b', type: 'income', is_predefined: true },
  { id: 'cat-other-income', name: 'Other', sort_order: 4, color: '#64748b', type: 'income', is_predefined: true },
  { id: 'cat-adhoc-income', name: 'Ad-hoc', sort_order: 5, color: '#ec4899', type: 'income', is_predefined: true }
];
```

---

## Type Definitions Export

Add to `api/src/types/index.ts`:

```typescript
// New types for 002-detailed-monthly-view
type CategoryType = 'bill' | 'income';

interface Payment {
  id: string;
  amount: number;
  date: string;
  created_at: string;
}

// Extended Category
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

// Export new types
export type {
  CategoryType,
  Payment,
  // ... existing exports
};
```

---

**Data Model Complete**: Ready for API contract definition.
