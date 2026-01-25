# Data Model: Occurrence-Only Payment Model

**Feature**: 014-occurrence-only-simplify
**Date**: 2026-01-25

## Overview

This document defines the data model changes for migrating from a Payments+Occurrences hybrid model to an Occurrence-only model. The key change is removing the `Payment` type entirely and consolidating all transaction tracking into the `Occurrence` entity.

---

## Entity Changes

### Occurrence (MODIFIED)

The `Occurrence` entity is enhanced to capture payment information directly, eliminating the need for nested `Payment` objects.

#### Current Interface

```typescript
interface Occurrence {
  id: string;
  sequence: number;
  expected_date: string; // YYYY-MM-DD
  expected_amount: number; // Cents
  is_closed: boolean;
  closed_date?: string; // When closed (YYYY-MM-DD)
  notes?: string;
  payments: Payment[]; // ← TO BE REMOVED
  is_adhoc: boolean;
  created_at: string;
  updated_at: string;
}
```

#### New Interface

```typescript
interface Occurrence {
  id: string;
  sequence: number;
  expected_date: string; // YYYY-MM-DD - when payment is due
  expected_amount: number; // Cents - amount to be paid
  is_closed: boolean; // True = paid
  closed_date?: string; // YYYY-MM-DD - actual payment date
  payment_source_id?: string; // ← NEW: Which account was used (moved from Payment)
  notes?: string; // Optional notes
  is_adhoc: boolean; // True if manually added
  created_at: string;
  updated_at: string;
}
```

#### Field Changes Summary

| Field               | Change  | Reason                                                           |
| ------------------- | ------- | ---------------------------------------------------------------- |
| `payments`          | REMOVED | Core of this feature - occurrences now represent single payments |
| `payment_source_id` | ADDED   | Moved from Payment to track which account was used               |

---

### Payment (REMOVED)

The `Payment` type is removed entirely.

#### Removed Interface

```typescript
// ❌ REMOVE - No longer needed
interface Payment {
  id: string;
  amount: number;
  date: string;
  payment_source_id?: string;
  created_at: string;
}
```

---

### BillInstance (UNCHANGED)

No changes to `BillInstance`. It continues to contain an array of `Occurrence` objects.

```typescript
interface BillInstance {
  id: string;
  bill_id: string | null;
  month: string;
  billing_period: string;
  expected_amount: number; // Sum of occurrence expected_amounts
  occurrences: Occurrence[]; // Updated Occurrence type (no payments)
  is_default: boolean;
  is_closed: boolean; // True when ALL occurrences closed
  is_adhoc: boolean;
  is_payoff_bill?: boolean;
  payoff_source_id?: string;
  goal_id?: string;
  closed_date?: string;
  name?: string;
  category_id?: string;
  payment_source_id?: string;
  metadata?: EntityMetadata;
  created_at: string;
  updated_at: string;
}
```

---

### IncomeInstance (UNCHANGED)

No changes to `IncomeInstance`. Same pattern as `BillInstance`.

```typescript
interface IncomeInstance {
  id: string;
  income_id: string | null;
  month: string;
  billing_period: string;
  expected_amount: number;
  occurrences: Occurrence[]; // Updated Occurrence type (no payments)
  is_default: boolean;
  is_closed: boolean;
  is_adhoc: boolean;
  closed_date?: string;
  name?: string;
  category_id?: string;
  payment_source_id?: string;
  metadata?: EntityMetadata;
  created_at: string;
  updated_at: string;
}
```

---

## Behavioral Semantics

### Closing an Occurrence

**Meaning**: Closing an occurrence means the `expected_amount` has been paid.

| State  | `is_closed` | `closed_date`  | Interpretation                    |
| ------ | ----------- | -------------- | --------------------------------- |
| Open   | `false`     | `undefined`    | Payment pending                   |
| Closed | `true`      | `"YYYY-MM-DD"` | Paid in full at `expected_amount` |

### Calculating Paid Amounts

**Formula**: Sum of `expected_amount` for all closed occurrences.

```typescript
function getPaidAmount(occurrences: Occurrence[]): number {
  return occurrences
    .filter((occ) => occ.is_closed)
    .reduce((sum, occ) => sum + occ.expected_amount, 0);
}
```

This matches the existing payoff bill behavior, now applied uniformly to all bills.

### Partial Payments via Split

When a user pays less than the expected amount:

1. Original occurrence: `expected_amount` reduced to paid amount, marked closed
2. New occurrence: Created with remaining amount, left open

**Example**:

```
Before split:
  Occurrence A: expected_amount = $300, is_closed = false

After split (user pays $100):
  Occurrence A: expected_amount = $100, is_closed = true, closed_date = "2026-01-25"
  Occurrence B: expected_amount = $200, is_closed = false, is_adhoc = true
```

---

## Validation Rules

### Occurrence Validation

| Field               | Rule                                                |
| ------------------- | --------------------------------------------------- |
| `expected_amount`   | Must be > 0 cents                                   |
| `expected_date`     | Must be valid YYYY-MM-DD format                     |
| `closed_date`       | Required when `is_closed = true`                    |
| `payment_source_id` | Optional; references valid PaymentSource if present |
| `sequence`          | Must be unique within parent instance               |

### Split Validation

| Condition            | Rule                                         |
| -------------------- | -------------------------------------------- |
| Split amount         | Must be > 0 and < original `expected_amount` |
| Cannot split closed  | Occurrence must be open to split             |
| Cannot split to zero | Remaining amount must be > 0                 |

---

## State Transitions

```
┌─────────────────────────────────────────────────────────────┐
│                         OPEN                                 │
│                    (is_closed = false)                       │
└─────────────────────────────────────────────────────────────┘
        │                    │                    │
        │ Close              │ Split              │ Edit
        │ (full amount)      │ (partial)          │ (amount/date)
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    CLOSED     │    │  CLOSED +     │    │     OPEN      │
│ (is_closed=   │    │  NEW OPEN     │    │  (updated     │
│  true)        │    │  Occurrence   │    │   values)     │
└───────────────┘    └───────────────┘    └───────────────┘
        │
        │ Reopen
        ▼
┌───────────────────────────────────────────────────────────────┐
│                         OPEN                                   │
│                    (is_closed = false)                         │
│                    (closed_date = undefined)                   │
└───────────────────────────────────────────────────────────────┘
```

---

## Migration Specification

### Input: Old Format

```json
{
  "id": "occ-123",
  "expected_amount": 30000,
  "is_closed": false,
  "payments": [
    { "id": "pay-1", "amount": 10000, "date": "2026-01-10", "payment_source_id": "ps-1" },
    { "id": "pay-2", "amount": 10000, "date": "2026-01-20", "payment_source_id": "ps-1" }
  ]
}
```

### Output: New Format

**Case 1: Fully Paid (payments sum >= expected_amount)**

```json
{
  "id": "occ-123",
  "expected_amount": 30000,
  "is_closed": true,
  "closed_date": "2026-01-20",
  "payment_source_id": "ps-1"
}
```

**Case 2: Partially Paid (payments sum < expected_amount)**

```json
[
  {
    "id": "occ-123",
    "expected_amount": 20000,
    "is_closed": true,
    "closed_date": "2026-01-20",
    "payment_source_id": "ps-1"
  },
  {
    "id": "occ-456",
    "expected_amount": 10000,
    "is_closed": false,
    "is_adhoc": true
  }
]
```

**Case 3: No Payments (payments array empty)**

```json
{
  "id": "occ-123",
  "expected_amount": 30000,
  "is_closed": false
}
```

---

## Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Bill / Income                          │
│                    (Recurring Template)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ generates (per month)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BillInstance / IncomeInstance                 │
│                    (Monthly Instance)                           │
│                                                                 │
│  - expected_amount = SUM(occurrences.expected_amount)           │
│  - is_closed = ALL(occurrences.is_closed)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ contains (1:N)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Occurrence                               │
│                    (Individual Payment Event)                   │
│                                                                 │
│  - expected_amount (amount to pay)                              │
│  - is_closed (paid = true)                                      │
│  - payment_source_id (which account)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ references (N:1, optional)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PaymentSource                             │
│                    (Bank Account / Credit Card)                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## TypeScript Type Definitions

### Final Types (api/src/types/index.ts)

```typescript
// ============================================================================
// Occurrence (individual payment instance within a billing period)
// ============================================================================

interface Occurrence {
  id: string;
  sequence: number; // 1, 2, 3... for ordering within the month
  expected_date: string; // YYYY-MM-DD - when payment is due
  expected_amount: number; // Cents - amount to be paid (editable)
  is_closed: boolean; // True = paid
  closed_date?: string; // YYYY-MM-DD - when closed/paid
  payment_source_id?: string; // Which account was used for payment
  notes?: string; // Optional notes
  is_adhoc: boolean; // True if manually added by user
  created_at: string;
  updated_at: string;
}

// ❌ REMOVED: Payment interface is no longer needed
```

### Frontend Types (src/stores/detailed-month.ts)

```typescript
// ❌ REMOVED: Payment interface
// export interface Payment { ... }

export interface Occurrence {
  id: string;
  sequence: number;
  expected_date: string;
  expected_amount: number;
  is_closed: boolean;
  closed_date?: string;
  payment_source_id?: string;
  notes?: string;
  is_adhoc: boolean;
  created_at: string;
  updated_at: string;
}
```
