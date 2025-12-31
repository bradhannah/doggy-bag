# API Contract: Partial Payments Endpoints

**Feature**: [spec.md](../spec.md)  
**Date**: 2025-12-31

---

## Overview

New endpoints for tracking partial payments toward bills. Payments are stored as an embedded array within BillInstance.

---

## Endpoints

### POST /api/months/:month/bills/:billInstanceId/payments

**Description**: Adds a partial payment to a bill instance.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | string | Yes | Month in YYYY-MM format |
| billInstanceId | string | Yes | Bill instance ID |

**Request Body**:
```typescript
interface AddPaymentRequest {
  amount: number;      // Required, positive (in cents)
  date: string;        // Required, ISO date (YYYY-MM-DD)
}
```

**Response**: `201 Created`
```typescript
interface AddPaymentResponse {
  payment: Payment;
  billInstance: BillInstance;
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  created_at: string;
}
```

**Behavior**:
- Generates UUID for payment id
- Appends to billInstance.payments array
- Updates billInstance.updated_at
- Does NOT automatically mark bill as paid
- Total payments can exceed expected_amount (overpayment allowed)

**Errors**:
- `400 Bad Request`: Invalid amount (must be positive)
- `400 Bad Request`: Invalid date format
- `404 Not Found`: Month or bill instance not found

**Example Request**:
```json
{
  "amount": 12000,
  "date": "2025-01-05"
}
```

**Example Response**:
```json
{
  "payment": {
    "id": "pay-abc123",
    "amount": 12000,
    "date": "2025-01-05",
    "created_at": "2025-01-05T10:30:00Z"
  },
  "billInstance": {
    "id": "bi-gas-jan",
    "bill_id": "bill-gas",
    "month": "2025-01",
    "expected_amount": 30000,
    "actual_amount": null,
    "payments": [
      { "id": "pay-abc123", "amount": 12000, "date": "2025-01-05", "created_at": "2025-01-05T10:30:00Z" }
    ],
    "is_paid": false,
    "is_adhoc": false,
    "updated_at": "2025-01-05T10:30:00Z"
  }
}
```

---

### DELETE /api/months/:month/bills/:billInstanceId/payments/:paymentId

**Description**: Removes a payment from a bill instance.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | string | Yes | Month in YYYY-MM format |
| billInstanceId | string | Yes | Bill instance ID |
| paymentId | string | Yes | Payment ID to remove |

**Response**: `200 OK`
```typescript
interface DeletePaymentResponse {
  billInstance: BillInstance;
}
```

**Errors**:
- `404 Not Found`: Month, bill instance, or payment not found

**Behavior**:
- Removes payment from payments array
- Updates billInstance.updated_at
- Supports undo (adds to undo stack)

---

### PUT /api/months/:month/bills/:billInstanceId/payments/:paymentId

**Description**: Updates an existing payment.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | string | Yes | Month in YYYY-MM format |
| billInstanceId | string | Yes | Bill instance ID |
| paymentId | string | Yes | Payment ID to update |

**Request Body**:
```typescript
interface UpdatePaymentRequest {
  amount?: number;     // Positive (in cents)
  date?: string;       // ISO date (YYYY-MM-DD)
}
```

**Response**: `200 OK`
```typescript
interface UpdatePaymentResponse {
  payment: Payment;
  billInstance: BillInstance;
}
```

**Errors**:
- `400 Bad Request`: Invalid amount or date
- `404 Not Found`: Month, bill instance, or payment not found

---

## Bill Instance Updates for Partial Payments

### PUT /api/months/:month/bills/:billInstanceId

**Description**: Extended to support actual_amount and is_paid updates.

**Extended Request Body**:
```typescript
interface UpdateBillInstanceRequest {
  actual_amount?: number;    // NEW: User-entered actual
  is_paid?: boolean;         // Marks bill as fully paid
}
```

**Behavior**:
- Setting `actual_amount` is for non-partial payment bills
- If payments array has entries, `actual_amount` is ignored (use payments instead)
- Setting `is_paid: true` marks bill complete regardless of payments

**Interaction with Partial Payments**:
| Scenario | actual_amount | payments | is_paid | Effective Amount |
|----------|---------------|----------|---------|------------------|
| No payment entered | undefined | [] | false | 0 |
| Single actual | 15000 | [] | true | 15000 |
| Partial payments | ignored | [5000, 5000] | false | 10000 |
| Partial + complete | ignored | [5000, 5000] | true | 10000 |

---

## Calculations

### Total Paid
```typescript
function getTotalPaid(billInstance: BillInstance): number {
  if (billInstance.payments.length > 0) {
    return billInstance.payments.reduce((sum, p) => sum + p.amount, 0);
  }
  return billInstance.actual_amount ?? 0;
}
```

### Remaining Balance
```typescript
function getRemainingBalance(billInstance: BillInstance): number {
  const paid = getTotalPaid(billInstance);
  return Math.max(0, billInstance.expected_amount - paid);
}
```

### Payment Progress
```typescript
function getPaymentProgress(billInstance: BillInstance): { paid: number; expected: number; percentage: number } {
  const paid = getTotalPaid(billInstance);
  const expected = billInstance.expected_amount;
  return {
    paid,
    expected,
    percentage: expected > 0 ? Math.min(100, (paid / expected) * 100) : 0
  };
}
```

---

## UI Display Format

### Partial Payment Cell
Display format: `$X / $Y` where X is paid, Y is expected

Examples:
- No payments: `$0 / $300`
- Partial: `$120 / $300`
- Complete: `$300 / $300` (or just `$300` with checkmark)
- Overpaid: `$350 / $300` (highlight in green)

### Add Payment Button
Show "Add Payment" button when:
- Bill is not marked as paid (`is_paid: false`)
- Remaining balance > 0

---

## Validation Rules

### Payment Amount
- Must be positive (> 0)
- In cents (integers only)
- No upper limit (overpayment allowed)

### Payment Date
- Must be valid ISO date (YYYY-MM-DD)
- Should be within the bill's month (warning only, not enforced)
- Cannot be in the future (warning only, not enforced)

---

## Undo Support

All payment operations support undo:
- Add payment: Undo removes the payment
- Delete payment: Undo restores the payment
- Update payment: Undo reverts to previous values

---

**Contract Complete**
