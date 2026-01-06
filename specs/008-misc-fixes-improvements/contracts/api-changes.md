# API Contract Changes: Miscellaneous Fixes and Improvements

**Feature**: 008-misc-fixes-improvements
**Date**: 2026-01-05
**Status**: Design

## Overview

This document defines API contract changes for the 8 items in this feature branch. Changes are minimal - primarily entity schema modifications with one new endpoint for savings data.

---

## Schema Changes

### Bill Entity

**Endpoints Affected**: `POST /api/bills`, `PUT /api/bills/:id`

#### Request Body Changes

```typescript
// BEFORE
interface CreateBillRequest {
  name: string;
  amount: number;
  billing_period: BillingPeriod;
  start_date?: string;
  day_of_month?: number;
  recurrence_week?: number;
  recurrence_day?: number;
  payment_source_id: string;
  category_id?: string; // OPTIONAL
  due_day?: number; // TO BE REMOVED
  is_active?: boolean;
}

// AFTER
interface CreateBillRequest {
  name: string;
  amount: number;
  billing_period: BillingPeriod;
  start_date?: string;
  day_of_month?: number;
  recurrence_week?: number;
  recurrence_day?: number;
  payment_source_id: string;
  category_id: string; // NOW REQUIRED
  payment_method: PaymentMethod; // NEW REQUIRED
  is_active?: boolean;
}

type PaymentMethod = 'auto' | 'manual';
```

#### Validation Changes

| Field            | Rule                                 | HTTP Status     |
| ---------------- | ------------------------------------ | --------------- |
| `category_id`    | Required, must exist                 | 400 Bad Request |
| `payment_method` | Required, must be 'auto' or 'manual' | 400 Bad Request |
| `due_day`        | No longer accepted (ignored if sent) | N/A             |

#### Response Body Changes

```typescript
// Response includes new field
interface BillResponse {
  // ... existing fields ...
  category_id: string; // Always present
  payment_method: PaymentMethod; // NEW
  // due_day removed from response
}
```

---

### Income Entity

**Endpoints Affected**: `POST /api/incomes`, `PUT /api/incomes/:id`

#### Request Body Changes

```typescript
// BEFORE
interface CreateIncomeRequest {
  name: string;
  amount: number;
  billing_period: BillingPeriod;
  start_date?: string;
  day_of_month?: number;
  recurrence_week?: number;
  recurrence_day?: number;
  payment_source_id: string;
  category_id?: string; // OPTIONAL
  due_day?: number; // TO BE REMOVED
  is_active?: boolean;
}

// AFTER
interface CreateIncomeRequest {
  name: string;
  amount: number;
  billing_period: BillingPeriod;
  start_date?: string;
  day_of_month?: number;
  recurrence_week?: number;
  recurrence_day?: number;
  payment_source_id: string;
  category_id: string; // NOW REQUIRED
  is_active?: boolean;
}
```

#### Validation Changes

| Field         | Rule                                 | HTTP Status     |
| ------------- | ------------------------------------ | --------------- |
| `category_id` | Required, must exist                 | 400 Bad Request |
| `due_day`     | No longer accepted (ignored if sent) | N/A             |

---

### PaymentSource Entity

**Endpoints Affected**: `POST /api/payment-sources`, `PUT /api/payment-sources/:id`

#### Request Body Changes

```typescript
// BEFORE
interface CreatePaymentSourceRequest {
  name: string;
  type: PaymentSourceType;
  balance: number;
  is_active?: boolean;
  exclude_from_leftover?: boolean;
  pay_off_monthly?: boolean;
}

// AFTER
interface CreatePaymentSourceRequest {
  name: string;
  type: PaymentSourceType;
  balance: number;
  is_active?: boolean;
  exclude_from_leftover?: boolean;
  pay_off_monthly?: boolean;
  is_savings?: boolean; // NEW OPTIONAL
  is_investment?: boolean; // NEW OPTIONAL
}
```

#### Validation Changes

| Field                          | Rule                                        | HTTP Status     |
| ------------------------------ | ------------------------------------------- | --------------- |
| `is_savings`                   | Cannot be true if `pay_off_monthly` is true | 400 Bad Request |
| `is_investment`                | Cannot be true if `pay_off_monthly` is true | 400 Bad Request |
| `is_savings` + `is_investment` | Mutually exclusive (only one can be true)   | 400 Bad Request |

#### Business Logic

- When `is_savings=true` or `is_investment=true`, `exclude_from_leftover` is automatically set to `true`
- Savings/investment accounts are excluded from standard bank balance displays

---

### MonthlyData Entity

**Endpoints Affected**: `GET /api/months/:month`, `PUT /api/months/:month`

#### Response Body Changes

```typescript
// BEFORE
interface MonthlyDataResponse {
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

// AFTER
interface MonthlyDataResponse {
  month: string;
  bill_instances: BillInstance[];
  income_instances: IncomeInstance[];
  variable_expenses: VariableExpense[];
  free_flowing_expenses: FreeFlowingExpense[];
  bank_balances: Record<string, number>;
  savings_balances_start: Record<string, number>; // NEW
  savings_balances_end: Record<string, number>; // NEW
  is_read_only: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## New Endpoints

### GET /api/payment-sources/savings

Returns all payment sources marked as savings or investment accounts.

#### Request

```
GET /api/payment-sources/savings
```

No request body.

#### Response

```typescript
// 200 OK
interface SavingsAccountsResponse {
  savings: PaymentSource[]; // is_savings = true
  investments: PaymentSource[]; // is_investment = true
}
```

#### Example Response

```json
{
  "savings": [
    {
      "id": "ps-001",
      "name": "Emergency Fund",
      "type": "bank_account",
      "balance": 1250000,
      "is_active": true,
      "is_savings": true,
      "exclude_from_leftover": true,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ],
  "investments": [
    {
      "id": "ps-002",
      "name": "401(k)",
      "type": "bank_account",
      "balance": 4520000,
      "is_active": true,
      "is_investment": true,
      "exclude_from_leftover": true,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### PUT /api/months/:month/savings-balances

Update savings/investment balances for a specific month.

#### Request

```typescript
// PUT /api/months/2026-01/savings-balances
interface UpdateSavingsBalancesRequest {
  start?: Record<string, number>; // payment_source_id -> balance (cents)
  end?: Record<string, number>; // payment_source_id -> balance (cents)
}
```

#### Example Request

```json
{
  "start": {
    "ps-savings-001": 1250000,
    "ps-401k-001": 4520000
  },
  "end": {
    "ps-savings-001": 1280000,
    "ps-401k-001": 4610000
  }
}
```

#### Response

```typescript
// 200 OK - Returns updated MonthlyData
interface MonthlyDataResponse { ... }
```

#### Validation

| Field        | Rule                                  | HTTP Status     |
| ------------ | ------------------------------------- | --------------- |
| `start` keys | Must be valid payment source IDs      | 400 Bad Request |
| `end` keys   | Must be valid payment source IDs      | 400 Bad Request |
| Values       | Must be non-negative integers (cents) | 400 Bad Request |

---

## Removed Endpoints

### DELETE /api/undo (Item #7)

The entire undo API will be removed:

- `GET /api/undo` - List undo entries
- `POST /api/undo` - Create undo entry
- `POST /api/undo/apply` - Apply undo
- `DELETE /api/undo` - Clear undo stack

These endpoints will return `404 Not Found` after removal.

---

## DetailedMonthResponse Changes

**Endpoint**: `GET /api/detailed-view/:month`

#### Response Body Changes

```typescript
interface DetailedMonthResponse {
  // ... existing fields ...

  // BillInstanceDetailed now includes payment_method
  billSections: CategorySection[]; // Items have payment_method

  // NEW: Savings balances summary
  savingsSummary?: {
    accounts: Array<{
      id: string;
      name: string;
      type: 'savings' | 'investment';
      startBalance: number;
      endBalance: number;
      change: number;
      changePercent: number;
    }>;
    totalStartBalance: number;
    totalEndBalance: number;
    totalChange: number;
  };
}

interface BillInstanceDetailed {
  // ... existing fields ...
  payment_method: PaymentMethod; // NEW
}
```

---

## Error Response Format

All endpoints use consistent error format:

```typescript
interface ErrorResponse {
  error: string; // Machine-readable error code
  message?: string; // Human-readable message
  details?: string[]; // Validation error details
}
```

### Common HTTP Status Codes

| Status | Meaning                        |
| ------ | ------------------------------ |
| 200    | Success                        |
| 201    | Created                        |
| 204    | No Content (DELETE success)    |
| 400    | Bad Request (validation error) |
| 404    | Not Found                      |
| 500    | Internal Server Error          |

---

## Migration Endpoint

### POST /api/migrate/008

One-time migration endpoint to update existing data:

#### Request

```
POST /api/migrate/008
Content-Type: application/json

{
  "default_category_id": "cat-misc"  // Category for bills/incomes without one
}
```

#### Response

```json
{
  "success": true,
  "migrated": {
    "bills_with_payment_method": 15,
    "bills_with_category": 3,
    "incomes_with_category": 2,
    "due_day_fields_removed": 17
  }
}
```

#### Logic

1. Set `payment_method: 'manual'` on all bills without it
2. Set `category_id` on bills/incomes without one (using provided default)
3. Remove `due_day` field from all bills and incomes

---

## Backward Compatibility Notes

### Breaking Changes

1. **Bill creation/update**: `category_id` and `payment_method` now required
2. **Income creation/update**: `category_id` now required
3. **Undo API**: Completely removed

### Non-Breaking Changes

1. **PaymentSource**: New optional fields (`is_savings`, `is_investment`)
2. **MonthlyData**: New optional fields (`savings_balances_start`, `savings_balances_end`)
3. **DetailedMonthResponse**: New optional `savingsSummary` object

### Migration Path

1. Run `POST /api/migrate/008` before deploying frontend changes
2. Update frontend to always send `category_id` and `payment_method` for bills
3. Update frontend to always send `category_id` for incomes
4. Remove any undo UI components

---

## Implementation Checklist

- [ ] Update `api/src/types/index.ts` with schema changes
- [ ] Update `api/src/services/bills-service.ts` validation
- [ ] Update `api/src/services/incomes-service.ts` validation
- [ ] Update `api/src/services/payment-sources-service.ts` validation
- [ ] Add `api/src/routes/handlers/savings.handlers.ts`
- [ ] Update `api/src/routes/handlers/months.handlers.ts`
- [ ] Remove `api/src/routes/handlers/undo.handlers.ts`
- [ ] Remove `api/src/services/undo-service.ts`
- [ ] Update `api/src/routes/handlers/detailed-view.handlers.ts`
- [ ] Create migration endpoint
- [ ] Update frontend API client types
