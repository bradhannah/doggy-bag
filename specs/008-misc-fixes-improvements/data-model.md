# Data Model: Miscellaneous Fixes and Improvements

**Feature**: 008-misc-fixes-improvements
**Date**: 2026-01-05
**Status**: Complete

## Overview

This document defines the data model changes required for the 8 items in this feature branch. Changes affect 4 existing entities and introduce 1 new UI state store.

---

## Entity Changes

### Bill (Modified)

**Location**: `api/src/types/index.ts`

#### Current Definition

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
  category_id?: string; // Currently optional
  due_day?: number; // TO BE REMOVED
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

#### New Definition

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
  category_id: string; // NOW REQUIRED (Item #8)
  payment_method: PaymentMethod; // NEW REQUIRED (Item #6)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type PaymentMethod = 'auto' | 'manual'; // NEW TYPE
```

#### Changes Summary

| Field            | Change              | Item |
| ---------------- | ------------------- | ---- |
| `due_day`        | REMOVED             | #1   |
| `category_id`    | Optional → Required | #8   |
| `payment_method` | NEW Required        | #6   |

#### Validation Rules

- `category_id`: Must reference existing category, required
- `payment_method`: Must be `'auto'` or `'manual'`, required
- `day_of_month`: 1-31, adjusted for short months

---

### Income (Modified)

**Location**: `api/src/types/index.ts`

#### Current Definition

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
  category_id?: string; // Currently optional
  due_day?: number; // TO BE REMOVED
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

#### New Definition

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
  category_id: string; // NOW REQUIRED (Item #8)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

#### Changes Summary

| Field         | Change              | Item |
| ------------- | ------------------- | ---- |
| `due_day`     | REMOVED             | #1   |
| `category_id` | Optional → Required | #8   |

#### Validation Rules

- `category_id`: Must reference existing category, required
- `day_of_month`: 1-31, adjusted for short months

---

### PaymentSource (Modified)

**Location**: `api/src/types/index.ts`

#### Current Definition

```typescript
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
```

#### New Definition

```typescript
interface PaymentSource {
  id: string;
  name: string;
  type: PaymentSourceType;
  balance: number;
  is_active: boolean;
  exclude_from_leftover?: boolean;
  pay_off_monthly?: boolean;
  is_savings?: boolean; // NEW (Item #5)
  is_investment?: boolean; // NEW (Item #5)
  created_at: string;
  updated_at: string;
}
```

#### Changes Summary

| Field           | Change       | Item |
| --------------- | ------------ | ---- |
| `is_savings`    | NEW Optional | #5   |
| `is_investment` | NEW Optional | #5   |

#### Validation Rules

- `is_savings` and `is_investment` are mutually exclusive with `pay_off_monthly`
- When `is_savings=true` or `is_investment=true`, `exclude_from_leftover` is auto-enabled
- Only one of `is_savings` or `is_investment` can be true (not both)

#### Business Logic

```typescript
// Auto-enable exclude_from_leftover when savings/investment
if (source.is_savings || source.is_investment) {
  source.exclude_from_leftover = true;
}

// Validation: can't be savings/investment AND pay_off_monthly
if ((source.is_savings || source.is_investment) && source.pay_off_monthly) {
  throw ValidationError('Savings/Investment accounts cannot have pay_off_monthly enabled');
}
```

---

### MonthlyData (Modified)

**Location**: `api/src/types/index.ts`

#### Current Definition

```typescript
interface MonthlyData {
  month: string;
  bill_instances: BillInstance[];
  income_instances: IncomeInstance[];
  variable_expenses: VariableExpense[];
  free_flowing_expenses: FreeFlowingExpense[];
  bank_balances: Record<string, number>;
  is_read_only: boolean;
  created_at: string;
  updated_at: string;
}
```

#### New Definition

```typescript
interface MonthlyData {
  month: string;
  bill_instances: BillInstance[];
  income_instances: IncomeInstance[];
  variable_expenses: VariableExpense[];
  free_flowing_expenses: FreeFlowingExpense[];
  bank_balances: Record<string, number>;
  savings_balances_start: Record<string, number>; // NEW (Item #5)
  savings_balances_end: Record<string, number>; // NEW (Item #5)
  is_read_only: boolean;
  created_at: string;
  updated_at: string;
}
```

#### Changes Summary

| Field                    | Change       | Item |
| ------------------------ | ------------ | ---- |
| `savings_balances_start` | NEW Optional | #5   |
| `savings_balances_end`   | NEW Optional | #5   |

#### Data Structure

```typescript
// Example
{
  "month": "2026-01",
  "savings_balances_start": {
    "ps-savings-001": 1250000,    // $12,500.00 in cents
    "ps-401k-001": 4520000        // $45,200.00 in cents
  },
  "savings_balances_end": {
    "ps-savings-001": 1280000,    // $12,800.00 in cents
    "ps-401k-001": 4610000        // $46,100.00 in cents
  }
}
```

#### Auto-Population Logic

```typescript
// When loading a new month, auto-populate start from previous month's end
async function getStartBalances(month: string): Promise<Record<string, number>> {
  const previousMonth = getPreviousMonth(month);
  const previousData = await loadMonth(previousMonth);

  if (previousData?.savings_balances_end) {
    return { ...previousData.savings_balances_end };
  }

  // If no previous data, return empty (user enters manually)
  return {};
}
```

---

## Types to Remove

### UndoEntityType (Item #7)

**Location**: `api/src/types/index.ts`

```typescript
// TO BE REMOVED
type UndoEntityType =
  | 'bill'
  | 'income'
  | 'variable_expense'
  | 'free_flowing_expense'
  | 'payment_source'
  | 'bill_instance'
  | 'income_instance';
```

### UndoEntry (Item #7)

**Location**: `api/src/types/index.ts`

```typescript
// TO BE REMOVED
interface UndoEntry {
  id: string;
  entity_type: UndoEntityType;
  entity_id: string;
  old_value: unknown;
  new_value: unknown;
  timestamp: string;
}
```

---

## New Types

### PaymentMethod (Item #6)

**Location**: `api/src/types/index.ts`

```typescript
type PaymentMethod = 'auto' | 'manual';
```

---

## UI State (Frontend)

### hidePaidBills Store (Item #2)

**Location**: `src/stores/ui.ts`

```typescript
// New store following existing compactMode pattern
function createHidePaidBillsStore() {
  const STORAGE_KEY = 'budgetforfun-hide-paid-bills';

  const { subscribe, set, update } = writable<boolean>(false);

  // Initialize from localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      set(stored === 'true');
    }
  }

  return {
    subscribe,
    toggle: () => {
      update((current) => {
        const next = !current;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, String(next));
        }
        return next;
      });
    },
    set: (value: boolean) => {
      set(value);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(value));
      }
    },
  };
}

export const hidePaidBills = createHidePaidBillsStore();
```

### expandedClosedCategories State (Item #2)

**Location**: `src/components/DetailedView/DetailedMonthView.svelte` (local state)

```typescript
// Track which closed categories have been manually expanded
let expandedClosedCategories: Set<string> = new Set();

function toggleClosedCategory(categoryId: string) {
  if (expandedClosedCategories.has(categoryId)) {
    expandedClosedCategories.delete(categoryId);
  } else {
    expandedClosedCategories.add(categoryId);
  }
  expandedClosedCategories = expandedClosedCategories; // Trigger reactivity
}
```

---

## Computed/Derived Values

### Section Stats (Item #3)

**Location**: `src/components/DetailedView/DetailedMonthView.svelte`

```typescript
interface SectionStats {
  totalCount: number;
  closedCount: number;
  remainingCount: number;
  amountPaid: number;
  amountRemaining: number;
  progressPercent: number;
}

function calculateBillStats(sections: CategorySection[]): SectionStats {
  const allItems = sections.flatMap((s) => s.items);
  const totalCount = allItems.length;
  const closedCount = allItems.filter((i) => i.is_closed).length;
  const remainingCount = totalCount - closedCount;

  const amountPaid = allItems.reduce((sum, i) => sum + i.total_paid, 0);
  const amountRemaining = allItems
    .filter((i) => !i.is_closed)
    .reduce((sum, i) => sum + (i.expected_amount - i.total_paid), 0);

  const progressPercent = totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 0;

  return { totalCount, closedCount, remainingCount, amountPaid, amountRemaining, progressPercent };
}
```

### Savings Change Calculation (Item #5)

**Location**: `src/routes/savings/+page.svelte`

```typescript
interface SavingsAccountDisplay {
  id: string;
  name: string;
  type: 'savings' | 'investment';
  startBalance: number; // Cents
  endBalance: number; // Cents
  change: number; // Cents (end - start)
  changePercent: number; // Percentage
}

function calculateChange(start: number, end: number): { change: number; changePercent: number } {
  const change = end - start;
  const changePercent = start > 0 ? ((end - start) / start) * 100 : 0;
  return { change, changePercent };
}
```

---

## Migration Requirements

### Existing Bills (Item #6, #8)

Bills without `payment_method` or `category_id` need migration:

```typescript
// Migration script logic
async function migrateBills() {
  const bills = await billsService.getAll();

  for (const bill of bills) {
    const updates: Partial<Bill> = {};

    // Default payment_method to 'manual' if missing
    if (!bill.payment_method) {
      updates.payment_method = 'manual';
    }

    // Require category assignment (cannot auto-assign)
    if (!bill.category_id) {
      console.warn(`Bill "${bill.name}" needs category assignment`);
      // Option: assign to default category or prompt user
    }

    if (Object.keys(updates).length > 0) {
      await billsService.update(bill.id, updates);
    }
  }
}
```

### Existing Incomes (Item #8)

Incomes without `category_id` need migration:

```typescript
// Similar to bills migration
async function migrateIncomes() {
  const incomes = await incomesService.getAll();

  for (const income of incomes) {
    if (!income.category_id) {
      console.warn(`Income "${income.name}" needs category assignment`);
    }
  }
}
```

---

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│ Category        │       │ PaymentSource   │
├─────────────────┤       ├─────────────────┤
│ id              │◄──┐   │ id              │◄──────────────────────┐
│ name            │   │   │ name            │                       │
│ type            │   │   │ type            │                       │
│ color           │   │   │ balance         │                       │
│ sort_order      │   │   │ is_savings*     │  NEW                  │
└─────────────────┘   │   │ is_investment*  │  NEW                  │
                      │   │ exclude_from... │                       │
                      │   └─────────────────┘                       │
                      │                                             │
        ┌─────────────┴─────────────┐                              │
        │                           │                              │
        ▼                           ▼                              │
┌─────────────────┐       ┌─────────────────┐                      │
│ Bill            │       │ Income          │                      │
├─────────────────┤       ├─────────────────┤                      │
│ id              │       │ id              │                      │
│ name            │       │ name            │                      │
│ amount          │       │ amount          │                      │
│ billing_period  │       │ billing_period  │                      │
│ day_of_month    │       │ day_of_month    │                      │
│ category_id*    │ REQ   │ category_id*    │  REQ (was optional)  │
│ payment_method* │ NEW   │ payment_source──┼──────────────────────┘
│ payment_source──┼───────┼─────────────────┘
└─────────────────┘       └─────────────────┘

                    ┌─────────────────┐
                    │ MonthlyData     │
                    ├─────────────────┤
                    │ month           │
                    │ bill_instances  │
                    │ income_instances│
                    │ bank_balances   │
                    │ savings_start*  │  NEW
                    │ savings_end*    │  NEW
                    └─────────────────┘
```

Legend: `*` = New or modified field, `REQ` = Changed to required
