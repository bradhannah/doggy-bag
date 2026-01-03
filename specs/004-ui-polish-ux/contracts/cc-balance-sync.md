# API Contract: CC Balance Sync

**Date**: 2026-01-03 | **Feature**: [spec.md](../spec.md)

## Overview

This contract documents the existing API endpoint used for updating credit card balances after a payoff payment is made. **No new API endpoints are required** - the feature uses the existing bank-balances endpoint.

---

## Endpoint: Update Bank Balances

Updates the bank balance snapshot for one or more payment sources in a specific month.

### Request

```
PUT /api/months/{month}/bank-balances
```

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `month` | string | Month in YYYY-MM format (e.g., "2026-01") |

**Request Body**:

```typescript
{
  [paymentSourceId: string]: number  // Balance in cents (negative for debt)
}
```

**Example Request**:

```json
PUT /api/months/2026-01/bank-balances
Content-Type: application/json

{
  "cc-visa-123": -30000
}
```

This sets the Visa credit card balance to -$300.00 (owed $300).

### Response

**Success (200)**:

```json
{
  "success": true,
  "bankBalances": {
    "checking-456": 150000,
    "savings-789": 500000,
    "cc-visa-123": -30000
  }
}
```

**Error (400)** - Invalid month format:

```json
{
  "error": "Invalid month format. Expected YYYY-MM"
}
```

**Error (404)** - Month not found:

```json
{
  "error": "Month 2026-01 not found"
}
```

**Error (400)** - Invalid balance value:

```json
{
  "error": "Invalid balance value for payment source cc-visa-123"
}
```

---

## Frontend Integration

### CC Balance Sync Modal Flow

```
1. User marks CC payoff bill as paid
   |
   v
2. POST /api/months/{month}/bills/{instanceId}/paid
   Response includes { instance: { is_paid: true, actual_amount: 20000 } }
   |
   v
3. Frontend detects: bill.is_cc_payoff === true
   |
   v
4. Show CCBalanceSyncModal with:
   - Payment source name
   - Current balance (from store)
   - Payment amount (from response)
   - Calculated new balance
   |
   v
5. User clicks "Update Balance"
   |
   v
6. PUT /api/months/{month}/bank-balances
   Body: { [paymentSourceId]: newBalanceCents }
   |
   v
7. Refresh data, close modal
```

### Data Requirements

To show the sync modal, frontend needs:

| Data | Source |
|------|--------|
| Payment source ID | `bill.payment_source_id` |
| Payment source name | `paymentSources.find(p => p.id === bill.payment_source_id).name` |
| Current balance | `bankBalances[paymentSourceId]` or `paymentSource.balance` |
| Payment amount | `result.instance.actual_amount` (from mark-paid response) |

### New Balance Calculation

```typescript
// For credit cards (debt accounts), balance is negative
// Payment reduces the debt (makes it less negative)
const currentBalance = -50000;  // Owes $500.00
const paymentAmount = 20000;    // Paid $200.00
const newBalance = currentBalance + paymentAmount;  // -30000 = Owes $300.00
```

---

## Type Definitions

### Bill Instance (relevant fields)

```typescript
interface BillInstance {
  id: string;
  bill_id: string;
  name: string;
  expected_amount: number;
  actual_amount?: number;
  is_paid: boolean;
  is_cc_payoff?: boolean;       // True if this is a CC payoff entry
  payment_source_id?: string;   // ID of the payment source
}
```

### Mark Paid Response

```typescript
interface MarkPaidResponse {
  success: boolean;
  instance: {
    id: string;
    is_paid: boolean;
    actual_amount: number;
  };
}
```

### Bank Balances Object

```typescript
// Key is payment source ID, value is balance in cents
// Positive for assets (bank accounts)
// Negative for debts (credit cards)
type BankBalances = Record<string, number>;
```

---

## Error Handling

### Frontend Error States

| Scenario | Handling |
|----------|----------|
| API call fails | Show toast error, keep modal open |
| Invalid balance value | Validate before sending, show inline error |
| Network timeout | Show retry option in modal |
| Payment source not found | Log error, skip modal (edge case) |

### Retry Strategy

If the balance update fails, the modal should:
1. Display the error message
2. Keep the modal open with current values
3. Allow user to retry or skip

---

## Testing

### Manual Testing

```bash
# Get current month data (includes bankBalances)
curl http://localhost:3001/api/months/2026-01 | jq '.bankBalances'

# Update a balance
curl -X PUT http://localhost:3001/api/months/2026-01/bank-balances \
  -H "Content-Type: application/json" \
  -d '{"cc-visa-123": -30000}'

# Verify update
curl http://localhost:3001/api/months/2026-01 | jq '.bankBalances'
```

### Test Cases

1. **Happy path**: Mark CC payoff paid -> Modal shows -> Update -> Balance updates
2. **Skip flow**: Mark CC payoff paid -> Modal shows -> Skip -> Balance unchanged
3. **Full payoff**: Payment equals balance -> New balance is $0.00
4. **Overpayment**: Payment exceeds balance -> New balance is positive (credit)
5. **No balance set**: Current balance is undefined -> Use payment source default

---

**Version**: 1.0.0 | **Created**: 2026-01-03
