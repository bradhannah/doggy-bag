# Research: Occurrence-Only Payment Model & UI Simplification

**Feature**: 014-occurrence-only-simplify
**Date**: 2026-01-25

## Executive Summary

This document captures research findings for migrating from the current hybrid Payments+Occurrences model to an Occurrence-only model, along with UI simplification patterns for the new OccurrenceEditDrawer.

---

## 1. Current Payment Architecture Analysis

### Decision: Remove `Payment` type and `payments[]` array entirely

**Rationale**:

- The current architecture uses a hybrid model where Payments are nested inside Occurrences (`occurrence.payments[]`)
- Payoff bills already use an occurrence-only model (closed occurrence = payment) which proves the pattern works
- Removing payments eliminates redundant data structures and simplifies both code and UX

**Alternatives Considered**:

| Alternative                                | Reason Rejected                                           |
| ------------------------------------------ | --------------------------------------------------------- |
| Keep payments for historical tracking      | User confirmed KISS principle - simpler model preferred   |
| Add `actual_amount` alongside `payments[]` | Creates dual-source-of-truth problems                     |
| Deprecate gradually                        | No benefit to keeping legacy code; clean break is cleaner |

### Current Data Flow

```
Bill → BillInstance → Occurrence[] → Payment[]
                                      └── amount, date, payment_source_id
```

### New Data Flow

```
Bill → BillInstance → Occurrence[]
                      └── expected_amount, is_closed, closed_date, payment_source_id
```

---

## 2. Calculation Logic Migration

### Decision: Modify `tally.ts` to calculate from occurrence state, not payment sums

**Current Implementation** (api/src/utils/tally.ts:16-33):

```typescript
// Regular bills sum payments
return sumOccurrencePayments(bill.occurrences); // Line 32
```

**New Implementation**:

```typescript
// Regular bills sum expected_amount of closed occurrences (like payoff bills already do)
return bill.occurrences
  .filter((occ) => occ.is_closed)
  .reduce((sum, occ) => sum + occ.expected_amount, 0);
```

**Rationale**: Payoff bills already use this pattern (tally.ts:25-29). Unifying regular bills to match simplifies the codebase.

### Key Functions Requiring Modification

| File                           | Function                     | Lines    | Change                                                 |
| ------------------------------ | ---------------------------- | -------- | ------------------------------------------------------ |
| `api/src/utils/tally.ts`       | `getEffectiveBillAmount()`   | 16-33    | Remove payments summing, use closed occurrence pattern |
| `api/src/utils/tally.ts`       | `getEffectiveIncomeAmount()` | 82-88    | Same as above                                          |
| `api/src/utils/occurrences.ts` | `sumOccurrencePayments()`    | 321-326  | REMOVE entirely                                        |
| `api/src/utils/occurrences.ts` | `generateOccurrences()`      | 51-62    | Remove `payments: []` initialization                   |
| `api/src/utils/leftover.ts`    | `hasActualsEntered()`        | ~77, ~91 | Check `is_closed` instead of `payments.length > 0`     |

---

## 3. API Endpoints Changes

### Decision: Remove payment CRUD endpoints, modify close endpoint to support split workflow

**Endpoints to REMOVE**:

| Method | Endpoint                                                                | Handler                                        | Lines     |
| ------ | ----------------------------------------------------------------------- | ---------------------------------------------- | --------- |
| POST   | `/api/months/:month/bills/:id/occurrences/:occId/payments`              | `createBillOccurrencePaymentHandler()`         | 1370-1495 |
| POST   | `/api/months/:month/incomes/:id/occurrences/:occId/payments`            | `createIncomeOccurrencePaymentHandler()`       | 1498-1610 |
| DELETE | `/api/months/:month/bills/:id/occurrences/:occId/payments/:paymentId`   | `createDeleteBillOccurrencePaymentHandler()`   | 2078-2158 |
| DELETE | `/api/months/:month/incomes/:id/occurrences/:occId/payments/:paymentId` | `createDeleteIncomeOccurrencePaymentHandler()` | 2161-2241 |

**Endpoints to MODIFY**:

| Method | Endpoint                        | Change                                                                    |
| ------ | ------------------------------- | ------------------------------------------------------------------------- |
| POST   | `/.../occurrences/:occId/close` | Accept optional `amount` param; if different from expected, trigger split |
| PUT    | `/.../occurrences/:occId`       | Add `payment_source_id` field support                                     |

**New Endpoint (for split workflow)**:

| Method | Endpoint                        | Purpose                                                             |
| ------ | ------------------------------- | ------------------------------------------------------------------- |
| POST   | `/.../occurrences/:occId/split` | Close original at given amount, create new occurrence for remainder |

---

## 4. Frontend Store Migration

### Decision: Remove payment store methods, update occurrence methods

**File**: `src/stores/detailed-month.ts`

**Methods to REMOVE**:

| Method                          | Lines   | Reason           |
| ------------------------------- | ------- | ---------------- |
| `addPaymentToOccurrence()`      | 451-548 | No longer needed |
| `removePaymentFromOccurrence()` | 550-654 | No longer needed |

**Methods to MODIFY**:

| Method                       | Change                              |
| ---------------------------- | ----------------------------------- |
| `updateBillClosedStatus()`   | Simplify - no payment recalculation |
| `updateIncomeClosedStatus()` | Same                                |

**Type Changes**:

```typescript
// REMOVE Payment interface (lines 7-14)
export interface Payment { ... }

// MODIFY Occurrence interface (lines 17-29)
export interface Occurrence {
  id: string;
  sequence: number;
  expected_date: string;
  expected_amount: number;
  is_closed: boolean;
  closed_date?: string;
  notes?: string;
  payment_source_id?: string;  // MOVED from Payment
  // payments: Payment[];      // REMOVED
  is_adhoc: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## 5. UI Component Strategy

### Decision: Create OccurrenceEditDrawer using shared Drawer component

**Rationale**:

- TransactionsDrawer is 1000+ lines managing payments - too complex for new model
- Shared Drawer.svelte provides built-in unsaved changes handling
- ItemDetailsDrawer stays for read-only views
- Single responsibility: OccurrenceEditDrawer edits one occurrence

**OccurrenceEditDrawer Props**:

| Prop           | Type                 | Required | Description            |
| -------------- | -------------------- | -------- | ---------------------- |
| `open`         | `boolean`            | Yes      | Controls visibility    |
| `month`        | `string`             | Yes      | YYYY-MM format         |
| `instanceId`   | `string`             | Yes      | Parent bill/income ID  |
| `occurrence`   | `Occurrence`         | Yes      | Occurrence to edit     |
| `type`         | `'bill' \| 'income'` | No       | API endpoint selection |
| `instanceName` | `string`             | No       | Display in header      |
| `readOnly`     | `boolean`            | No       | Disable editing        |

**OccurrenceEditDrawer Events**:

| Event            | Payload                            | When                              |
| ---------------- | ---------------------------------- | --------------------------------- |
| `close`          | void                               | Drawer closed                     |
| `updated`        | void                               | Occurrence saved                  |
| `splitRequested` | `{ closeAmount, remainingAmount }` | User closes with different amount |

### Decision: Consolidate line item buttons with overflow menu pattern

**Current State** (too many visible buttons):

- Close | Pay Full | Edit | Add | Info | Delete

**New State**:

- Open occurrence: "Edit" button (primary) + Overflow menu (View Details, Delete)
- Closed occurrence: "Reopen" button (primary) + Overflow menu (View Details, Delete)
- "+ Add Occurrence" button at instance card level (not per-occurrence)

### Decision: Use Modal (not Drawer) for Edit & Close

**Rationale**:

- Closing is a decisive action ("changing something")
- Modal forces user focus on the decision
- Radio button options are more prominent in centered modal
- Drawer reserved for read-only "View Details"

### Decision: Three clear close options with radio buttons

1. **Close - Paid in Full** - Mark as complete at displayed amount
2. **Close - Paid Nothing** - Mark as complete, waived/skipped
3. **Partial Payment - Keep Open** - Pay part, create new occurrence for remainder

**Key UX principle**: Make common scenarios crystal clear with radio selection that mutes/disables irrelevant fields.

### Decision: Delete available for ALL occurrences (not just ad-hoc)

User may need to delete scheduled occurrences when:

- Bill was cancelled/refunded
- Duplicate occurrence created by mistake
- Bill no longer applicable this month

All deletions require confirmation modal.

---

## 6. Split Workflow Design

### Decision: Close occurrence with prompt to split when amount differs

**User Flow**:

1. User clicks "Close" on an occurrence (expected: $300)
2. System shows close confirmation with editable amount field
3. User enters $100 (less than expected)
4. System prompts: "Split into two occurrences? $100 paid + $200 remaining"
   - Option A: "Yes, create $200 remainder" → Creates new occurrence for $200
   - Option B: "No, close at $300" → Closes at original expected amount
5. Original occurrence closed with updated expected_amount if split

**API Implementation**:

```typescript
// POST /api/months/:month/bills/:id/occurrences/:occId/split
{
  "paid_amount": 10000,      // cents - what user is paying now
  "close_date": "2026-01-25",
  "payment_source_id": "ps-123",
  "notes": "Partial payment"
}
// Response: { closedOccurrence, newOccurrence }
```

---

## 7. Data Migration Strategy

### Decision: One-time migration on app start, converting payments to occurrence state

**Migration Logic**:

```typescript
for (each occurrence with payments[]) {
  // Calculate total paid from payments
  const totalPaid = occurrence.payments.reduce((sum, p) => sum + p.amount, 0);

  if (totalPaid >= occurrence.expected_amount) {
    // Fully paid - mark closed
    occurrence.is_closed = true;
    occurrence.closed_date = lastPayment.date;
    occurrence.payment_source_id = lastPayment.payment_source_id;
  } else if (totalPaid > 0) {
    // Partially paid - split into closed + open
    const closedOcc = { ...occurrence, expected_amount: totalPaid, is_closed: true };
    const openOcc = { ...occurrence, expected_amount: expected - totalPaid, is_closed: false };
  }

  // Clear payments array
  delete occurrence.payments;
}
```

**Safety Measures**:

- Backup created before migration
- Migration is idempotent (checks for `payments` array presence)
- Version flag stored to prevent re-running

---

## 8. Files Impact Summary

### Files to DELETE

| File                                                    | Reason                     |
| ------------------------------------------------------- | -------------------------- |
| `src/components/DetailedView/TransactionsDrawer.svelte` | Replaced by EditCloseModal |

### Files to CREATE

| File                                                         | Purpose                             |
| ------------------------------------------------------------ | ----------------------------------- |
| `src/components/DetailedView/EditCloseModal.svelte`          | Unified edit & close modal          |
| `src/components/DetailedView/SplitConfirmModal.svelte`       | Confirm partial payment split       |
| `src/components/DetailedView/DeleteConfirmModal.svelte`      | Confirm occurrence deletion         |
| `src/components/DetailedView/ReopenConfirmModal.svelte`      | Confirm reopening closed occurrence |
| `src/components/DetailedView/OccurrenceDetailsDrawer.svelte` | Read-only occurrence info           |
| `api/src/migrations/remove-payments.ts`                      | One-time data migration             |

### Files to MODIFY

| File                                                | Changes                             |
| --------------------------------------------------- | ----------------------------------- |
| `api/src/types/index.ts`                            | Remove Payment, update Occurrence   |
| `api/src/utils/tally.ts`                            | Remove payment summing              |
| `api/src/utils/occurrences.ts`                      | Remove payment functions            |
| `api/src/services/months-service.ts`                | Remove payment methods, add split   |
| `api/src/routes/handlers/instances.handlers.ts`     | Remove payment endpoints            |
| `api/src/routes/index.ts`                           | Update route exports                |
| `src/stores/detailed-month.ts`                      | Remove payment store methods        |
| `src/components/DetailedView/BillRow.svelte`        | New button layout (Edit + overflow) |
| `src/components/DetailedView/IncomeRow.svelte`      | New button layout (Edit + overflow) |
| `src/components/DetailedView/OccurrenceRow.svelte`  | New button layout (Edit + overflow) |
| `src/components/DetailedView/OccurrenceCard.svelte` | + Add Occurrence at instance level  |

---

## 9. Testing Strategy

### Unit Tests to UPDATE

| Test File                           | Changes                                          |
| ----------------------------------- | ------------------------------------------------ |
| `api/src/utils/tally.test.ts`       | Remove payment-based tests, add occurrence-based |
| `api/src/utils/occurrences.test.ts` | Remove sumOccurrencePayments tests               |
| `src/stores/detailed-month.test.ts` | Remove payment method tests                      |

### New Tests to ADD

| Test                              | Purpose                                      |
| --------------------------------- | -------------------------------------------- |
| Split occurrence API test         | Verify split creates two correct occurrences |
| Migration test                    | Verify payments are correctly converted      |
| EditCloseModal component test     | Verify modal behavior and close options      |
| SplitConfirmModal component test  | Verify split confirmation flow               |
| DeleteConfirmModal component test | Verify delete confirmation                   |
| ReopenConfirmModal component test | Verify reopen confirmation                   |

### E2E Tests to UPDATE

| Test                  | Changes                          |
| --------------------- | -------------------------------- |
| Partial payment flow  | Update to use split workflow     |
| Close occurrence flow | Update to use new modal          |
| Delete occurrence     | Add test for delete confirmation |
