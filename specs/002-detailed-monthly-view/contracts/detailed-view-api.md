# API Contract: Detailed Monthly View Endpoints

**Feature**: [spec.md](../spec.md)  
**Date**: 2025-12-31

---

## Overview

Endpoints for the Detailed Monthly View page, including extended bill/income instance data with due dates, tallies, and section data.

---

## Endpoints

### GET /api/months/:month/detailed

**Description**: Retrieves comprehensive data for the Detailed Monthly View.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | string | Yes | Month in YYYY-MM format |

**Response**: `200 OK`
```typescript
interface DetailedMonthResponse {
  month: string;
  billSections: CategorySection[];
  incomeSections: CategorySection[];
  tallies: {
    bills: SectionTally;
    income: SectionTally;
  };
  leftover: number;
  bankBalances: Record<string, number>;
  lastUpdated: string;
}

interface CategorySection {
  category: {
    id: string;
    name: string;
    color: string;
    sort_order: number;
  };
  items: (BillInstanceDetailed | IncomeInstanceDetailed)[];
  subtotal: {
    expected: number;
    actual: number;
  };
}

interface BillInstanceDetailed {
  id: string;
  bill_id: string | null;
  name: string;                  // From Bill or ad-hoc name
  expected_amount: number;
  actual_amount: number | null;
  payments: Payment[];
  total_paid: number;            // Calculated: sum of payments or actual_amount
  remaining: number;             // Calculated: expected - total_paid
  is_paid: boolean;
  is_adhoc: boolean;
  due_date: string | null;       // Calculated from Bill.due_day
  is_overdue: boolean;           // Calculated: past due + unpaid
  days_overdue: number | null;   // Calculated: days past due_date
  payment_source: {
    id: string;
    name: string;
  } | null;
  category_id: string;
}

interface IncomeInstanceDetailed {
  id: string;
  income_id: string | null;
  name: string;
  expected_amount: number;
  actual_amount: number | null;
  is_paid: boolean;              // "received"
  is_adhoc: boolean;
  due_date: string | null;
  is_overdue: boolean;           // Past expected date + not received
  payment_source: {
    id: string;
    name: string;
  } | null;
  category_id: string;
}

interface SectionTally {
  expected: number;
  actual: number;
  remaining: number;
}
```

**Behavior**:
- Groups bill instances by category, sorted by category.sort_order
- Groups income instances by category
- Calculates derived fields (total_paid, remaining, is_overdue)
- Includes category subtotals
- Calculates overall tallies
- Calculates leftover using actuals only

**Example Response** (abbreviated):
```json
{
  "month": "2025-01",
  "billSections": [
    {
      "category": {
        "id": "cat-home",
        "name": "Home",
        "color": "#3b82f6",
        "sort_order": 0
      },
      "items": [
        {
          "id": "bi-rent",
          "bill_id": "bill-rent",
          "name": "Rent",
          "expected_amount": 150000,
          "actual_amount": 150000,
          "payments": [],
          "total_paid": 150000,
          "remaining": 0,
          "is_paid": true,
          "is_adhoc": false,
          "due_date": "2025-01-01",
          "is_overdue": false,
          "days_overdue": null,
          "payment_source": { "id": "ps-checking", "name": "Checking" },
          "category_id": "cat-home"
        }
      ],
      "subtotal": {
        "expected": 150000,
        "actual": 150000
      }
    }
  ],
  "incomeSections": [...],
  "tallies": {
    "bills": {
      "expected": 280000,
      "actual": 230000,
      "remaining": 50000
    },
    "income": {
      "expected": 400000,
      "actual": 405000,
      "remaining": 0
    }
  },
  "leftover": 175000,
  "bankBalances": {
    "ps-checking": 350000
  },
  "lastUpdated": "2025-01-15T10:30:00Z"
}
```

---

### PUT /api/months/:month/bills/:id/actual

**Description**: Updates the actual amount for a bill instance (non-partial payment).

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | string | Yes | Month in YYYY-MM format |
| id | string | Yes | Bill instance ID |

**Request Body**:
```typescript
interface UpdateActualAmountRequest {
  actual_amount: number;    // In cents, positive
}
```

**Response**: `200 OK`
```typescript
interface UpdateActualAmountResponse {
  billInstance: BillInstanceDetailed;
}
```

**Behavior**:
- Sets actual_amount on the instance
- Clears any partial payments (either use actual_amount OR payments, not both)
- Recalculates derived fields

---

### PUT /api/months/:month/incomes/:id/actual

**Description**: Updates the actual amount for an income instance.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | string | Yes | Month in YYYY-MM format |
| id | string | Yes | Income instance ID |

**Request Body**:
```typescript
interface UpdateIncomeActualRequest {
  actual_amount: number;
}
```

**Response**: `200 OK`

---

### PUT /api/bills/:id

**Description**: Extended to support due_day field.

**Extended Request Body**:
```typescript
interface UpdateBillRequest {
  // ... existing fields
  due_day?: number;    // NEW: 1-31 or null to clear
}
```

**Validation**:
- `due_day` must be 1-31 if provided
- Set to `null` or omit to clear due date

---

### PUT /api/incomes/:id

**Description**: Extended to support due_day and category_id fields.

**Extended Request Body**:
```typescript
interface UpdateIncomeRequest {
  // ... existing fields
  due_day?: number;        // NEW: 1-31 or null to clear
  category_id?: string;    // NEW: income category reference
}
```

---

## Calculations Reference

### Due Date Calculation
```typescript
function calculateDueDate(month: string, dueDay: number | undefined): string | null {
  if (!dueDay) return null;
  
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const actualDay = Math.min(dueDay, daysInMonth);
  
  return `${month}-${String(actualDay).padStart(2, '0')}`;
}
```

### Overdue Check
```typescript
function isOverdue(dueDate: string | null, isPaid: boolean): boolean {
  if (!dueDate || isPaid) return false;
  const today = new Date().toISOString().split('T')[0];
  return dueDate < today;
}

function getDaysOverdue(dueDate: string): number | null {
  const today = new Date();
  const due = new Date(dueDate);
  if (due >= today) return null;
  
  const diffTime = today.getTime() - due.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
```

### Leftover Calculation
```typescript
function calculateLeftover(monthData: MonthlyData): number {
  const totalBankBalances = Object.values(monthData.bank_balances)
    .reduce((sum, balance) => sum + balance, 0);
  
  const totalActualIncome = monthData.income_instances
    .reduce((sum, inc) => sum + (inc.actual_amount ?? 0), 0);
  
  const totalActualBills = monthData.bill_instances
    .reduce((sum, bill) => {
      if (bill.payments.length > 0) {
        return sum + bill.payments.reduce((s, p) => s + p.amount, 0);
      }
      return sum + (bill.actual_amount ?? 0);
    }, 0);
  
  const totalVariableExpenses = monthData.variable_expenses
    .reduce((sum, exp) => sum + exp.amount, 0);
  
  const totalFreeFlowing = monthData.free_flowing_expenses
    .reduce((sum, exp) => sum + exp.amount, 0);
  
  return totalBankBalances + totalActualIncome - 
         (totalActualBills + totalVariableExpenses + totalFreeFlowing);
}
```

### Section Tally Calculation
```typescript
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
        const paid = b.payments.reduce((s, p) => s + p.amount, 0);
        return sum + Math.max(0, b.expected_amount - paid);
      }
      if (!b.is_paid && b.actual_amount === undefined) {
        return sum + b.expected_amount;
      }
      return sum;
    }, 0)
  };
}
```

---

## Amber Highlighting Rules

Display actual amount in amber when it differs from expected:

```typescript
function shouldHighlightActual(instance: BillInstanceDetailed): boolean {
  if (instance.actual_amount === null) return false;
  return instance.actual_amount !== instance.expected_amount;
}
```

Visual treatment:
- Amber text color (`#f59e0b`)
- Or amber background with dark text
- Tooltip: "Differs from expected by $X"

---

## Sorting Rules

### Categories
- Sort by `category.sort_order` ascending

### Items Within Category
1. is_adhoc (regular first, ad-hoc last)
2. is_paid (unpaid first)
3. due_date (soonest first, null last)
4. name (alphabetical)

```typescript
function sortBillInstances(bills: BillInstanceDetailed[]): BillInstanceDetailed[] {
  return bills.sort((a, b) => {
    // Ad-hoc last
    if (a.is_adhoc !== b.is_adhoc) return a.is_adhoc ? 1 : -1;
    // Unpaid first
    if (a.is_paid !== b.is_paid) return a.is_paid ? 1 : -1;
    // Soonest due first
    if (a.due_date && b.due_date) {
      return a.due_date.localeCompare(b.due_date);
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    // Alphabetical
    return a.name.localeCompare(b.name);
  });
}
```

---

**Contract Complete**
