# Quickstart: Occurrence-Only Payment Model

**Feature**: 014-occurrence-only-simplify
**Date**: 2026-01-25

## What This Feature Does

This feature simplifies the payment tracking model by:

1. **Removing the Payment data structure** - No more nested `payments[]` arrays inside occurrences
2. **Unifying the payment model** - All bills and incomes now work like payoff bills (close = paid)
3. **Adding split workflow** - For partial payments, split one occurrence into two
4. **Simplifying the UI** - New streamlined edit drawer, fewer buttons on line items

## Key Concept: Occurrence = Payment

**Before**: An occurrence could have multiple payments inside it

```
Occurrence ($300 expected)
├── Payment #1: $100 on Jan 10
├── Payment #2: $100 on Jan 15
└── Payment #3: $100 on Jan 20
```

**After**: Each occurrence IS a payment

```
Occurrence #1: $100, closed Jan 10 ✓
Occurrence #2: $100, closed Jan 15 ✓
Occurrence #3: $100, closed Jan 20 ✓
```

## Quick Reference

### Closing an Occurrence

**API Call**:

```bash
curl -X POST http://localhost:3000/api/months/2026-01/bills/inst-123/occurrences/occ-456/close \
  -H "Content-Type: application/json" \
  -d '{
    "closed_date": "2026-01-25",
    "payment_source_id": "ps-789",
    "notes": "Paid via checking"
  }'
```

**Result**: Occurrence marked as paid for its `expected_amount`.

### Splitting an Occurrence (Partial Payment)

When paying less than expected:

```bash
curl -X POST http://localhost:3000/api/months/2026-01/bills/inst-123/occurrences/occ-456/split \
  -H "Content-Type: application/json" \
  -d '{
    "paid_amount": 10000,
    "closed_date": "2026-01-25",
    "payment_source_id": "ps-789"
  }'
```

**Result**:

- Original occurrence closed at $100 (10000 cents)
- New occurrence created for remainder (open)

### Updating an Occurrence

```bash
curl -X PUT http://localhost:3000/api/months/2026-01/bills/inst-123/occurrences/occ-456 \
  -H "Content-Type: application/json" \
  -d '{
    "expected_amount": 35000,
    "expected_date": "2026-01-20",
    "payment_source_id": "ps-789"
  }'
```

## Data Model Summary

### Occurrence Fields

| Field               | Type    | Description                        |
| ------------------- | ------- | ---------------------------------- |
| `id`                | string  | Unique identifier                  |
| `sequence`          | number  | Order within instance (1, 2, 3...) |
| `expected_date`     | string  | Due date (YYYY-MM-DD)              |
| `expected_amount`   | number  | Amount in cents                    |
| `is_closed`         | boolean | True = paid                        |
| `closed_date`       | string? | When paid (YYYY-MM-DD)             |
| `payment_source_id` | string? | Which account used                 |
| `notes`             | string? | Optional notes                     |
| `is_adhoc`          | boolean | True if user-added                 |

### REMOVED Fields

- `payments[]` - No longer exists on occurrences

## Frontend Changes

### New Component: OccurrenceEditDrawer

Replaces TransactionsDrawer for editing occurrence details.

**Props**:

- `open`, `month`, `instanceId`, `occurrence`, `type`

**Actions**:

- Edit amount, date, notes, payment source
- Close occurrence
- Split occurrence (if closing for different amount)

### Button Changes on Line Items

| Old                                           | New                             |
| --------------------------------------------- | ------------------------------- |
| Close + Pay Full + Edit + Add + Info + Delete | Close (primary) + Overflow menu |

## Migration

Existing payment data is automatically migrated on first app launch:

1. Sum of payments → closed occurrence at that amount
2. Partial payments → split into closed + open occurrences
3. `payments[]` arrays removed

## Testing

```bash
# Run all tests
make test

# Run backend tests only
make test-backend

# Test specific occurrence functionality
bun test api/src/utils/tally.test.ts
bun test api/src/utils/occurrences.test.ts
```

## Files Changed

### Backend

- `api/src/types/index.ts` - Remove Payment, update Occurrence
- `api/src/utils/tally.ts` - New calculation logic
- `api/src/utils/occurrences.ts` - Remove payment functions
- `api/src/services/months-service.ts` - Add split, remove payment CRUD
- `api/src/routes/handlers/instances.handlers.ts` - New endpoints

### Frontend

- `src/stores/detailed-month.ts` - Remove payment methods
- `src/components/DetailedView/OccurrenceEditDrawer.svelte` - NEW
- `src/components/DetailedView/TransactionsDrawer.svelte` - DELETE
- `src/components/DetailedView/BillRow.svelte` - Updated buttons
- `src/components/DetailedView/IncomeRow.svelte` - Updated buttons

## Common Scenarios

### Scenario 1: Pay a Monthly Bill in Full

1. User clicks "Close" on the occurrence
2. System shows confirmation with date picker
3. User confirms → occurrence closed

### Scenario 2: Pay Less Than Expected

1. User clicks "Close" on $300 occurrence
2. User enters $100 as amount
3. System prompts: "Split into $100 + $200?"
4. User confirms → original closed at $100, new occurrence for $200

### Scenario 3: Add Extra Payment

1. User clicks "Add Occurrence" on bill
2. New ad-hoc occurrence created
3. User edits amount and closes it
