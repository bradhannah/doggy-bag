# Quickstart Guide: 008-misc-fixes-improvements

## Overview

This feature branch contains 8 improvements and fixes. This guide provides the fastest path to implementing each item.

**IMPORTANT**: Each item includes a **Manual Testing Gate** that MUST pass before proceeding to the next item or marking complete.

---

## Prerequisites

```bash
# Ensure you're on the correct branch
git checkout 008-misc-fixes-improvements

# Install dependencies
bun install

# Start development servers
make dev
```

---

## Code Coverage Requirements

**CRITICAL**: All changes must maintain minimum code coverage thresholds.

### Baseline Metrics (Before Starting)

Record these before making any changes:

```bash
# Backend test count
cd api && bun test 2>&1 | grep -E "^\s*[0-9]+ pass"
# Current: ~512 passing

# Frontend test count
bunx vitest run 2>&1 | grep -E "Tests.*passed"
# Current: 200 passing

# Total target: 600+ tests
```

### Coverage Commands

```bash
# Run backend tests with summary
make test-backend

# Run frontend tests with summary
make test-frontend

# Run frontend tests with coverage report (requires Node.js)
npx vitest run --coverage

# Open coverage HTML report
open coverage/index.html
```

### Coverage Thresholds

| Metric                 | Minimum      | Current                               |
| ---------------------- | ------------ | ------------------------------------- |
| Backend tests          | 500+ passing | ~512                                  |
| Frontend tests         | 190+ passing | 200                                   |
| Total tests            | 600+         | ~712                                  |
| Frontend line coverage | 80%          | Check via `npx vitest run --coverage` |

### Per-Item Test Requirements

Each item that adds or modifies code MUST include corresponding tests:

| Item                 | Required Tests                                            |
| -------------------- | --------------------------------------------------------- |
| #7 Remove Undo       | Delete `src/stores/undo.test.ts` (10 tests removed is OK) |
| #1 Due Day Bug       | Update existing occurrence tests to verify fix            |
| #6 Payment Method    | Add validation tests for `payment_method` field           |
| #8 Category Required | Add validation tests for required `category_id`           |
| #5 Savings Tracking  | Add tests for new `is_savings`/`is_investment` validation |
| #4 Dashboard Balance | Add store/component tests for balance display             |
| #3 Section Headers   | Add tests for stats calculation                           |
| #2 Hide Paid Toggle  | Add tests for `hidePaidBills` store                       |

---

## Implementation Order

Recommended order based on dependencies:

1. **Item #7**: Remove Undo (cleanup, no dependencies)
2. **Item #1**: Fix due_day bug (backend-only, enables other items)
3. **Item #6**: Add payment_method field (schema change)
4. **Item #8**: Make category_id required (schema change)
5. **Item #5**: Savings tracking (new feature, PaymentSource changes)
6. **Item #4**: Dashboard starting balance (UI only)
7. **Item #3**: Section headers with stats (UI only)
8. **Item #2**: Hide paid bills toggle (UI only)

---

## Item #7: Remove Undo Feature

**Type**: Cleanup | **Priority**: P3 | **Est**: 30 min

### Files to DELETE

```bash
rm api/src/services/undo-service.ts
rm api/src/routes/handlers/undo.handlers.ts
rm src/stores/undo.ts
rm data/entities/undo.json
rm -rf tests/unit/undo*
rm -rf tests/integration/undo*
```

### Files to Modify

1. `api/src/routes/index.ts` - Remove undo routes
2. `api/src/types/index.ts` - Remove `UndoEntityType`, `UndoEntry` types
3. Any component importing from undo store

### Search Commands

```bash
# Find all undo references
rg -l "undo" --type ts --type svelte
rg "UndoEntry|UndoEntityType|undo-service|undo.handlers"
```

### Manual Testing Gate - Item #7

**STOP: Complete ALL checks before proceeding**

| #   | Test                                    | Expected Result                                            | Pass? |
| --- | --------------------------------------- | ---------------------------------------------------------- | ----- |
| 1   | `make test-backend`                     | All backend tests pass                                     | [ ]   |
| 2   | `make test-frontend`                    | All frontend tests pass (190+ after removing undo.test.ts) | [ ]   |
| 3   | `make build`                            | Build succeeds with no TypeScript errors                   | [ ]   |
| 4   | `curl http://localhost:3000/api/undo`   | Returns 404 Not Found                                      | [ ]   |
| 5   | `rg -l "undo" api/src src/`             | No results (all references removed)                        | [ ]   |
| 6   | Open app in browser, navigate all pages | No console errors related to undo                          | [ ]   |

**Coverage Check**: Frontend tests should be ~190 (10 undo tests removed from 200)

**Gate Status**: [ ] PASSED - Proceed to Item #1

---

## Item #1: Fix Due Day Bug

**Type**: Bug Fix | **Priority**: P1 | **Est**: 30 min

### Problem

Monthly bills show due date as 1st instead of configured `day_of_month`.

### Files to Modify

1. `api/src/services/occurrences.ts` - Fix occurrence generation
2. `api/src/types/index.ts` - Remove `due_day` field

### Steps

```typescript
// 1. In occurrences.ts, find where expected_date is calculated
// WRONG: Uses due_day or defaults to 1
// RIGHT: Should use bill.day_of_month

// 2. Remove due_day from Bill and Income interfaces in types/index.ts
// Search for: due_day?: number;
// Remove those lines
```

### Manual Testing Gate - Item #1

**STOP: Complete ALL checks before proceeding**

#### Backend API Tests (curl)

```bash
# Test 1: Create a bill with day_of_month = 15
curl -X POST http://localhost:3000/api/bills \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Bill Day 15",
    "amount": 10000,
    "billing_period": "monthly",
    "day_of_month": 15,
    "payment_source_id": "<valid-id>",
    "category_id": "<valid-id>",
    "is_active": true
  }'

# Test 2: Get detailed view and check occurrence date
curl http://localhost:3000/api/detailed-view/2026-01 | jq '.billSections[].items[] | select(.name | contains("Test Bill Day 15")) | .occurrences[].expected_date'
# Expected: "2026-01-15"

# Test 3: Test day 28 (month boundary)
curl -X POST http://localhost:3000/api/bills \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Bill Day 28",
    "amount": 5000,
    "billing_period": "monthly",
    "day_of_month": 28,
    "payment_source_id": "<valid-id>",
    "category_id": "<valid-id>",
    "is_active": true
  }'

curl http://localhost:3000/api/detailed-view/2026-02 | jq '.billSections[].items[] | select(.name | contains("Test Bill Day 28")) | .occurrences[].expected_date'
# Expected: "2026-02-28"
```

| #   | Test                                | Expected Result                              | Pass? |
| --- | ----------------------------------- | -------------------------------------------- | ----- |
| 1   | `make test-backend`                 | All backend tests pass                       | [ ]   |
| 2   | `make test-frontend`                | All frontend tests pass                      | [ ]   |
| 3   | `make build`                        | No TypeScript errors                         | [ ]   |
| 4   | Create bill with `day_of_month: 15` | API returns 201                              | [ ]   |
| 5   | Check occurrence via curl           | `expected_date` is `2026-01-15`              | [ ]   |
| 6   | Create bill with `day_of_month: 28` | Works for Feb (short month)                  | [ ]   |
| 7   | Open Detailed View in browser       | Bills show correct due dates                 | [ ]   |
| 8   | `due_day` field removed from types  | `rg "due_day" api/src/types` returns nothing | [ ]   |

**Coverage Check**: Existing occurrence tests should still pass; update any tests that referenced `due_day`

**Gate Status**: [ ] PASSED - Proceed to Item #6

---

## Item #6: Auto/Manual Payment Badge

**Type**: Feature | **Priority**: P3 | **Est**: 1.5 hours

### Files to Modify

1. `api/src/types/index.ts` - Add `PaymentMethod` type and `payment_method` to Bill
2. `api/src/services/bills-service.ts` - Add validation
3. `src/components/DetailedView/BillCard.svelte` (or equivalent) - Add badge
4. `src/routes/bills/+page.svelte` - Add dropdown to form

### Badge Styles

```css
.badge-auto {
  background-color: #22c55e; /* green */
  color: white;
}

.badge-manual {
  background-color: #f59e0b; /* amber */
  color: white;
}
```

### Manual Testing Gate - Item #6

**STOP: Complete ALL checks before proceeding**

#### Backend API Tests (curl)

```bash
# Test 1: Create bill WITHOUT payment_method (should fail)
curl -X POST http://localhost:3000/api/bills \
  -H "Content-Type: application/json" \
  -d '{
    "name": "No Payment Method",
    "amount": 10000,
    "billing_period": "monthly",
    "day_of_month": 1,
    "payment_source_id": "<valid-id>",
    "category_id": "<valid-id>"
  }'
# Expected: 400 Bad Request with validation error

# Test 2: Create bill with payment_method: "auto"
curl -X POST http://localhost:3000/api/bills \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Auto Pay Bill",
    "amount": 10000,
    "billing_period": "monthly",
    "day_of_month": 1,
    "payment_source_id": "<valid-id>",
    "category_id": "<valid-id>",
    "payment_method": "auto"
  }'
# Expected: 201 Created

# Test 3: Create bill with payment_method: "manual"
curl -X POST http://localhost:3000/api/bills \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Manual Pay Bill",
    "amount": 5000,
    "billing_period": "monthly",
    "day_of_month": 15,
    "payment_source_id": "<valid-id>",
    "category_id": "<valid-id>",
    "payment_method": "manual"
  }'
# Expected: 201 Created

# Test 4: Invalid payment_method value
curl -X POST http://localhost:3000/api/bills \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Method",
    "amount": 5000,
    "billing_period": "monthly",
    "payment_source_id": "<valid-id>",
    "category_id": "<valid-id>",
    "payment_method": "invalid"
  }'
# Expected: 400 Bad Request
```

| #   | Test                                      | Expected Result                    | Pass? |
| --- | ----------------------------------------- | ---------------------------------- | ----- |
| 1   | `make test-backend`                       | All backend tests pass             | [ ]   |
| 2   | `make test-frontend`                      | All frontend tests pass            | [ ]   |
| 3   | `make build`                              | No TypeScript errors               | [ ]   |
| 4   | POST bill without `payment_method`        | Returns 400 validation error       | [ ]   |
| 5   | POST bill with `payment_method: "auto"`   | Returns 201, bill created          | [ ]   |
| 6   | POST bill with `payment_method: "manual"` | Returns 201, bill created          | [ ]   |
| 7   | POST bill with invalid `payment_method`   | Returns 400 validation error       | [ ]   |
| 8   | Open Bills config page in browser         | Dropdown shows Auto/Manual options | [ ]   |
| 9   | Open Detailed View in browser             | Auto bills show GREEN badge        | [ ]   |
| 10  | Open Detailed View in browser             | Manual bills show AMBER badge      | [ ]   |

**Coverage Check**: Add tests in `api/src/services/bills-service.test.ts` for `payment_method` validation (minimum 3 new tests)

**Gate Status**: [ ] PASSED - Proceed to Item #8

---

## Item #8: Improve Bills/Incomes Config Styling

**Type**: UI/UX | **Priority**: P3 | **Est**: 2 hours

### Files to Modify

1. `src/routes/bills/+page.svelte` - Update styling, require category
2. `src/routes/incomes/+page.svelte` - Update styling, require category
3. `api/src/services/bills-service.ts` - Make category_id required
4. `api/src/services/incomes-service.ts` - Make category_id required

### Style Reference

Copy card-based styling from `DetailedMonthView.svelte`:

- Dark backgrounds (#1e1e1e cards)
- Category color accents
- Consistent spacing

### Validation Change

```typescript
// BEFORE
if (data.category_id && !categories.find((c) => c.id === data.category_id)) {
  errors.push('Invalid category');
}

// AFTER
if (!data.category_id) {
  errors.push('Category is required');
} else if (!categories.find((c) => c.id === data.category_id)) {
  errors.push('Invalid category');
}
```

### Manual Testing Gate - Item #8

**STOP: Complete ALL checks before proceeding**

#### Backend API Tests (curl)

```bash
# Test 1: Create bill WITHOUT category_id (should fail)
curl -X POST http://localhost:3000/api/bills \
  -H "Content-Type: application/json" \
  -d '{
    "name": "No Category Bill",
    "amount": 10000,
    "billing_period": "monthly",
    "day_of_month": 1,
    "payment_source_id": "<valid-id>",
    "payment_method": "manual"
  }'
# Expected: 400 Bad Request - "Category is required"

# Test 2: Create income WITHOUT category_id (should fail)
curl -X POST http://localhost:3000/api/incomes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "No Category Income",
    "amount": 500000,
    "billing_period": "monthly",
    "day_of_month": 1,
    "payment_source_id": "<valid-id>"
  }'
# Expected: 400 Bad Request - "Category is required"

# Test 3: Create bill WITH category_id (should succeed)
curl -X POST http://localhost:3000/api/bills \
  -H "Content-Type: application/json" \
  -d '{
    "name": "With Category Bill",
    "amount": 10000,
    "billing_period": "monthly",
    "day_of_month": 1,
    "payment_source_id": "<valid-id>",
    "category_id": "<valid-id>",
    "payment_method": "manual"
  }'
# Expected: 201 Created
```

| #   | Test                               | Expected Result                                | Pass? |
| --- | ---------------------------------- | ---------------------------------------------- | ----- |
| 1   | `make test-backend`                | All backend tests pass                         | [ ]   |
| 2   | `make test-frontend`               | All frontend tests pass                        | [ ]   |
| 3   | `make build`                       | No TypeScript errors                           | [ ]   |
| 4   | POST bill without `category_id`    | Returns 400 "Category is required"             | [ ]   |
| 5   | POST income without `category_id`  | Returns 400 "Category is required"             | [ ]   |
| 6   | POST bill with valid `category_id` | Returns 201, bill created                      | [ ]   |
| 7   | Open Bills config page             | Category dropdown is required (red asterisk)   | [ ]   |
| 8   | Open Bills config page             | Styling matches DetailedMonthView (dark cards) | [ ]   |
| 9   | Open Incomes config page           | Category dropdown is required (red asterisk)   | [ ]   |
| 10  | Open Incomes config page           | Styling matches DetailedMonthView (dark cards) | [ ]   |
| 11  | Try to save bill without category  | Form validation prevents submission            | [ ]   |

**Coverage Check**: Add tests in `bills-service.test.ts` and `incomes-service.test.ts` for required `category_id` (minimum 2 new tests each)

**Gate Status**: [ ] PASSED - Proceed to Item #5

---

## Item #5: Savings & Investments Tracking

**Type**: Feature | **Priority**: P3 | **Est**: 4 hours

### Files to Create

1. `src/routes/savings/+page.svelte` - New page

### Files to Modify

1. `api/src/types/index.ts` - Add `is_savings`, `is_investment` to PaymentSource
2. `api/src/types/index.ts` - Add `savings_balances_start/end` to MonthlyData
3. `api/src/services/payment-sources-service.ts` - Validation for new fields
4. `api/src/routes/handlers/payment-sources.handlers.ts` - Handle new fields
5. `api/src/routes/handlers/months.handlers.ts` - Handle savings balances
6. `src/stores/payment-sources.ts` - Frontend type updates
7. Navigation - Add "Savings" link

### Validation Rules

```typescript
// Mutual exclusion with pay_off_monthly
if ((source.is_savings || source.is_investment) && source.pay_off_monthly) {
  errors.push('Savings/Investment accounts cannot have pay_off_monthly enabled');
}

// Only one of is_savings OR is_investment
if (source.is_savings && source.is_investment) {
  errors.push('Account cannot be both savings and investment');
}

// Auto-set exclude_from_leftover
if (source.is_savings || source.is_investment) {
  source.exclude_from_leftover = true;
}
```

### Manual Testing Gate - Item #5

**STOP: Complete ALL checks before proceeding**

#### Backend API Tests (curl)

```bash
# Test 1: Create savings account
curl -X POST http://localhost:3000/api/payment-sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Emergency Fund",
    "type": "bank_account",
    "balance": 1000000,
    "is_savings": true
  }'
# Expected: 201 Created, exclude_from_leftover auto-set to true

# Test 2: Create investment account
curl -X POST http://localhost:3000/api/payment-sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "401k",
    "type": "bank_account",
    "balance": 5000000,
    "is_investment": true
  }'
# Expected: 201 Created, exclude_from_leftover auto-set to true

# Test 3: Try to set BOTH is_savings AND is_investment (should fail)
curl -X POST http://localhost:3000/api/payment-sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Both",
    "type": "bank_account",
    "balance": 100000,
    "is_savings": true,
    "is_investment": true
  }'
# Expected: 400 Bad Request - mutual exclusion error

# Test 4: Try to set is_savings AND pay_off_monthly (should fail)
curl -X POST http://localhost:3000/api/payment-sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Combo",
    "type": "bank_account",
    "balance": 100000,
    "is_savings": true,
    "pay_off_monthly": true
  }'
# Expected: 400 Bad Request - mutual exclusion error

# Test 5: Get savings accounts endpoint
curl http://localhost:3000/api/payment-sources/savings
# Expected: { "savings": [...], "investments": [...] }

# Test 6: Update savings balances for a month
curl -X PUT http://localhost:3000/api/months/2026-01/savings-balances \
  -H "Content-Type: application/json" \
  -d '{
    "start": { "<savings-id>": 1000000 },
    "end": { "<savings-id>": 1050000 }
  }'
# Expected: 200 OK with updated MonthlyData
```

| #   | Test                                              | Expected Result                               | Pass? |
| --- | ------------------------------------------------- | --------------------------------------------- | ----- |
| 1   | `make test-backend`                               | All backend tests pass                        | [ ]   |
| 2   | `make test-frontend`                              | All frontend tests pass                       | [ ]   |
| 3   | `make build`                                      | No TypeScript errors                          | [ ]   |
| 4   | POST payment source with `is_savings: true`       | Returns 201, `exclude_from_leftover` auto-set | [ ]   |
| 5   | POST payment source with `is_investment: true`    | Returns 201, `exclude_from_leftover` auto-set | [ ]   |
| 6   | POST with both `is_savings` AND `is_investment`   | Returns 400 validation error                  | [ ]   |
| 7   | POST with `is_savings` AND `pay_off_monthly`      | Returns 400 validation error                  | [ ]   |
| 8   | GET `/api/payment-sources/savings`                | Returns categorized savings/investments       | [ ]   |
| 9   | PUT savings balances for month                    | Returns 200, balances saved                   | [ ]   |
| 10  | Navigate to `/savings` page                       | Page loads without errors                     | [ ]   |
| 11  | Savings page shows savings accounts               | Displays name, balance, type                  | [ ]   |
| 12  | Savings page shows investment accounts            | Displays name, balance, type                  | [ ]   |
| 13  | Enter start/end balances on page                  | Values save and persist on refresh            | [ ]   |
| 14  | Change calculation displays                       | Shows $ change and % change                   | [ ]   |
| 15  | Navigation has "Savings" link                     | Link visible and works                        | [ ]   |
| 16  | Savings accounts excluded from Dashboard leftover | Leftover calculation ignores savings          | [ ]   |

**Coverage Check**: Add tests in `payment-sources-service.test.ts` for:

- `is_savings` validation (minimum 3 tests)
- `is_investment` validation (minimum 3 tests)
- Mutual exclusion rules (minimum 2 tests)

**Gate Status**: [ ] PASSED - Proceed to Item #4

---

## Item #4: Dashboard Starting Balance

**Type**: Feature | **Priority**: P2 | **Est**: 1 hour

### Files to Modify

1. `src/routes/+page.svelte` (or dashboard component) - Add balance display

### Data Source

Use `bank_balances` from MonthlyData, filter by:

- `exclude_from_leftover !== true`
- `is_savings !== true`
- `is_investment !== true`

### UI Position

Display above income section, showing each bank account balance.

### Manual Testing Gate - Item #4

**STOP: Complete ALL checks before proceeding**

| #   | Test                                       | Expected Result                                  | Pass? |
| --- | ------------------------------------------ | ------------------------------------------------ | ----- |
| 1   | `make test-backend`                        | All backend tests pass                           | [ ]   |
| 2   | `make test-frontend`                       | All frontend tests pass                          | [ ]   |
| 3   | `make build`                               | No TypeScript errors                             | [ ]   |
| 4   | Open Dashboard/home page                   | Starting balance section visible                 | [ ]   |
| 5   | Check balance display                      | Shows each bank account with current balance     | [ ]   |
| 6   | Create savings account                     | Savings account NOT shown in starting balance    | [ ]   |
| 7   | Create investment account                  | Investment account NOT shown in starting balance | [ ]   |
| 8   | Account with `exclude_from_leftover: true` | NOT shown in starting balance                    | [ ]   |
| 9   | Regular bank account                       | Shown in starting balance with correct amount    | [ ]   |
| 10  | Multiple bank accounts                     | All regular accounts listed                      | [ ]   |
| 11  | Balance formatting                         | Shows as currency ($X,XXX.XX)                    | [ ]   |

**Coverage Check**: Add tests in `src/stores/detailed-month.test.ts` or create `src/components/Dashboard/Dashboard.test.ts` for balance filtering logic (minimum 2 tests)

**Gate Status**: [ ] PASSED - Proceed to Item #3

---

## Item #3: Section Headers with Stats

**Type**: Feature | **Priority**: P2 | **Est**: 1.5 hours

### Files to Modify

1. `src/components/DetailedView/DetailedMonthView.svelte` - Add stats to section headers

### Data Structure

```typescript
interface SectionStats {
  totalCount: number;
  closedCount: number;
  remainingCount: number;
  amountPaid: number;
  amountRemaining: number;
  progressPercent: number;
}
```

### UI Mockup

```
┌─────────────────────────────────────────────────────────┐
│ Bills                    12/15 paid | $2,450 remaining  │
│ ███████████████░░░░░ 80%                                │
└─────────────────────────────────────────────────────────┘
```

### Manual Testing Gate - Item #3

**STOP: Complete ALL checks before proceeding**

| #   | Test                          | Expected Result                        | Pass? |
| --- | ----------------------------- | -------------------------------------- | ----- |
| 1   | `make test-backend`           | All backend tests pass                 | [ ]   |
| 2   | `make test-frontend`          | All frontend tests pass                | [ ]   |
| 3   | `make build`                  | No TypeScript errors                   | [ ]   |
| 4   | Open Detailed View            | Bills section has header with stats    | [ ]   |
| 5   | Open Detailed View            | Income section has header with stats   | [ ]   |
| 6   | Header shows count            | "X/Y paid" format (e.g., "12/15 paid") | [ ]   |
| 7   | Header shows remaining amount | "$X,XXX remaining" formatted correctly | [ ]   |
| 8   | Progress bar visible          | Visual bar showing percentage complete | [ ]   |
| 9   | Mark a bill as paid           | Count updates (e.g., 12/15 → 13/15)    | [ ]   |
| 10  | Mark a bill as paid           | Progress bar advances                  | [ ]   |
| 11  | Mark a bill as paid           | Remaining amount decreases             | [ ]   |
| 12  | All bills paid                | Shows "15/15 paid" and 100% progress   | [ ]   |
| 13  | No bills in month             | Shows "0/0 paid" gracefully            | [ ]   |

**Coverage Check**: Add tests for `calculateBillStats()` and `calculateIncomeStats()` helper functions (minimum 4 tests covering normal case, all paid, none paid, empty)

**Gate Status**: [ ] PASSED - Proceed to Item #2

---

## Item #2: Hide Paid Bills Toggle

**Type**: Feature | **Priority**: P2 | **Est**: 2 hours

### Files to Create/Modify

1. `src/stores/ui.ts` - Add `hidePaidBills` store
2. `src/components/DetailedView/DetailedMonthView.svelte` - Add toggle and collapse logic

### Steps

```typescript
// 1. Add to src/stores/ui.ts (follow compactMode pattern)
export const hidePaidBills = createHidePaidBillsStore();

// 2. In DetailedMonthView.svelte:
// - Add toggle button in header
// - Track expandedClosedCategories: Set<string>
// - When hidePaidBills=true AND all items in category closed:
//   - Show collapsed header with "(3/3 paid - click to expand)"
//   - If categoryId in expandedClosedCategories, show items
```

### UI Behavior

- Toggle OFF: Show all items (current behavior)
- Toggle ON:
  - Categories with ANY unpaid items: show normally
  - Categories with ALL paid items: collapse to single header row
  - Clicking collapsed header expands temporarily

### Manual Testing Gate - Item #2

**STOP: Complete ALL checks before proceeding**

| #   | Test                                  | Expected Result                            | Pass? |
| --- | ------------------------------------- | ------------------------------------------ | ----- |
| 1   | `make test-backend`                   | All backend tests pass                     | [ ]   |
| 2   | `make test-frontend`                  | All frontend tests pass                    | [ ]   |
| 3   | `make build`                          | No TypeScript errors                       | [ ]   |
| 4   | Open Detailed View                    | Toggle button visible in header            | [ ]   |
| 5   | Toggle OFF (default)                  | All bills/incomes visible                  | [ ]   |
| 6   | Toggle ON                             | Categories with unpaid items show normally | [ ]   |
| 7   | Toggle ON, all items in category paid | Category collapses to single header        | [ ]   |
| 8   | Collapsed header text                 | Shows "(X/X paid - click to expand)"       | [ ]   |
| 9   | Click collapsed header                | Category expands to show items             | [ ]   |
| 10  | Toggle OFF again                      | All categories expand, all items visible   | [ ]   |
| 11  | Refresh page with toggle ON           | Setting persists (localStorage)            | [ ]   |
| 12  | Mixed category (some paid, some not)  | Category shows normally (not collapsed)    | [ ]   |
| 13  | Mark last unpaid item as paid         | Category collapses (if toggle ON)          | [ ]   |

**Coverage Check**: Add tests in `src/stores/ui.test.ts` for `hidePaidBills` store (minimum 4 tests: initial state, toggle, localStorage persistence, set value)

**Gate Status**: [ ] PASSED - All Items Complete!

---

## Final Verification Checklist

After completing all items, verify the entire feature branch:

### Test Count & Coverage Verification

```bash
# Backend test count (should be 500+ passing)
cd api && bun test 2>&1 | tail -5

# Frontend test count (should be 190+ passing, accounting for undo.test.ts removal)
bunx vitest run 2>&1 | tail -10

# Frontend coverage report (requires Node.js)
npx vitest run --coverage
# Verify: Lines >= 80%, Functions >= 80%, Branches >= 70%

# Open detailed coverage report
open coverage/index.html
```

### Final Test Summary

| Metric                 | Minimum | Actual    | Pass? |
| ---------------------- | ------- | --------- | ----- |
| Backend tests passing  | 500+    | **\_\_**  | [ ]   |
| Frontend tests passing | 190+    | **\_\_**  | [ ]   |
| Total tests            | 690+    | **\_\_**  | [ ]   |
| Frontend line coverage | 80%     | **\_\_**% | [ ]   |

### Functional Verification

| #   | Test                 | Expected Result                                    | Pass? |
| --- | -------------------- | -------------------------------------------------- | ----- |
| 1   | `make test-backend`  | ALL backend tests pass                             | [ ]   |
| 2   | `make test-frontend` | ALL frontend tests pass                            | [ ]   |
| 3   | `make build`         | Build succeeds, no errors                          | [ ]   |
| 4   | `make lint`          | No linting errors                                  | [ ]   |
| 5   | Full app smoke test  | All pages load without errors                      | [ ]   |
| 6   | Create new bill      | Requires category, payment_method                  | [ ]   |
| 7   | Create new income    | Requires category                                  | [ ]   |
| 8   | Detailed View        | Due dates correct, badges show, headers have stats | [ ]   |
| 9   | Hide paid toggle     | Works correctly                                    | [ ]   |
| 10  | Dashboard            | Starting balance displays                          | [ ]   |
| 11  | Savings page         | Displays and tracks balances                       | [ ]   |
| 12  | Undo feature         | Completely removed, no traces                      | [ ]   |

### New Tests Added (Checklist)

| Item                 | Tests Added                        | Count   | Pass? |
| -------------------- | ---------------------------------- | ------- | ----- |
| #7 Remove Undo       | Removed `undo.test.ts`             | -10     | [ ]   |
| #6 Payment Method    | `payment_method` validation tests  | +3      | [ ]   |
| #8 Category Required | `category_id` required tests       | +4      | [ ]   |
| #5 Savings Tracking  | `is_savings`/`is_investment` tests | +8      | [ ]   |
| #4 Dashboard Balance | Balance filtering tests            | +2      | [ ]   |
| #3 Section Headers   | Stats calculation tests            | +4      | [ ]   |
| #2 Hide Paid Toggle  | `hidePaidBills` store tests        | +4      | [ ]   |
| **Net Change**       |                                    | **+15** | [ ]   |

**FINAL STATUS**: [ ] ALL GATES PASSED - Ready for PR

---

## Common Gotchas

1. **Amounts are in cents** - Multiply user input by 100
2. **Dates are ISO strings** - Use `YYYY-MM-DD` format
3. **Month format** - Use `YYYY-MM` (e.g., "2026-01")
4. **TypeScript strict mode** - No implicit any, check all nulls
5. **Scoped CSS only** - Use `<style>` tag in Svelte, no global CSS

---

## Quick Reference: File Locations

| Concern                | Path                                                   |
| ---------------------- | ------------------------------------------------------ |
| Backend Types          | `api/src/types/index.ts`                               |
| Bills Service          | `api/src/services/bills-service.ts`                    |
| Incomes Service        | `api/src/services/incomes-service.ts`                  |
| PaymentSources Service | `api/src/services/payment-sources-service.ts`          |
| Detailed View Handler  | `api/src/routes/handlers/detailed-view.handlers.ts`    |
| Months Handler         | `api/src/routes/handlers/months.handlers.ts`           |
| Frontend API Client    | `src/lib/api/client.ts`                                |
| Frontend Types         | `src/types/api.ts`                                     |
| UI Stores              | `src/stores/*.ts`                                      |
| Detailed Month View    | `src/components/DetailedView/DetailedMonthView.svelte` |

---

## Commit Message Format

```
[008] Item #N: Brief description

- Change 1
- Change 2

Refs: 008-misc-fixes-improvements
```
