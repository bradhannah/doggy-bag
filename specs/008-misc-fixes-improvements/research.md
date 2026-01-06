# Research: Miscellaneous Fixes and Improvements

**Feature**: 008-misc-fixes-improvements
**Date**: 2026-01-05
**Status**: Complete

## Overview

This document consolidates research and decisions made during specification for the 8 items in this feature branch. Most decisions were resolved during the `/speckit.specify` phase through interactive discussion.

---

## Item #1: Due Date Bug Fix

### Research Question

Why do monthly bills/incomes show due date as 1st regardless of configured `day_of_month`?

### Investigation

- **Root Cause**: Field name mismatch in `api/src/utils/occurrences.ts`
- `generateBillOccurrences()` passes `bill.due_day` (line 17)
- `generateIncomeOccurrences()` passes `income.due_day` (line 33)
- Actual data is stored in `day_of_month` field
- `due_day` field is always `undefined`, so defaults to 1

### Decision

**Use `day_of_month` as single source of truth, remove `due_day` field entirely**

### Rationale

- `day_of_month` is already used in validation, bill creation, and existing data
- `due_day` was marked as "NEW" but never properly integrated
- Removing `due_day` eliminates redundancy and confusion
- No data migration needed - existing bills already have `day_of_month`

### Alternatives Considered

1. **Keep both fields, sync them** - Rejected: adds complexity, no benefit
2. **Rename `day_of_month` to `due_day`** - Rejected: requires data migration

---

## Item #2: Hide Paid Bills Toggle

### Research Question

What should "paid" mean for the toggle, and how should categories behave?

### Decision

**Use `is_closed` as the trigger, collapse fully-closed categories to header-only**

### Rationale

- `is_closed` is the user-controlled "done" flag
- Collapsing (not hiding) categories maintains context
- Clickable headers allow expansion if needed
- Completed categories already sort to bottom

### Implementation Pattern

- New store: `hidePaidBills` in `src/stores/ui.ts` (matches `compactMode` pattern)
- Persist to localStorage with key `budgetforfun-hide-paid-bills`
- Filter in `CategorySection.svelte` based on `item.is_closed`
- Track `expandedClosedCategories` set for manual expansion

### Alternatives Considered

1. **Use `total_paid >= expected_amount`** - Rejected: doesn't handle edge cases (forgiven bills, disputes)
2. **Hide entire categories** - Rejected: loses context of what was paid

---

## Item #3: Section Headers with Summary Stats

### Research Question

What statistics should be shown and how should they be calculated?

### Decision

**Show 4 stats: count remaining, amount paid/received, amount remaining, progress bar**

### Calculation Logic

| Stat             | Formula                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Count remaining  | `items.filter(i => !i.is_closed).length` / `items.length`                                         |
| Amount paid      | `items.reduce((sum, i) => sum + i.total_paid, 0)`                                                 |
| Amount remaining | `items.filter(i => !i.is_closed).reduce((sum, i) => sum + (i.expected_amount - i.total_paid), 0)` |
| Progress %       | `closedCount / totalCount * 100`                                                                  |

### Rationale

- "X/Y left" format emphasizes remaining work
- Dollar amounts provide budget context
- Progress bar gives visual quick-scan
- Matches existing tally calculation patterns

### Alternatives Considered

1. **Show percentages only** - Rejected: loses dollar context
2. **Separate paid/total amounts** - Rejected: too many numbers

---

## Item #4: Dashboard Starting Balance

### Research Question

How to display bank balances on Dashboard without duplicating Detailed View complexity?

### Decision

**Add single "Starting Balance" row above Income, show formula hint below leftover**

### Data Source

- Use existing `leftoverBreakdown.bankBalances` from detailed-month store
- Dashboard may need to fetch `leftoverBreakdown` instead of just `$leftover`

### Rationale

- Minimal change to existing Dashboard layout
- Explains the math visually (Balance + Income - Bills = Leftover)
- Consistent with Detailed View's leftover breakdown

### Alternatives Considered

1. **Horizontal compact row** - Rejected: user preferred keeping progress bars
2. **Separate "Cash Position" card** - Rejected: adds complexity

---

## Item #5: Savings & Investments Page

### Research Question

How to track savings/investments separately from budget?

### Decision

**New page with two boolean flags (`is_savings`, `is_investment`) on PaymentSource**

### Data Model

```typescript
// PaymentSource additions
is_savings?: boolean;      // Track on Savings page
is_investment?: boolean;   // Track on Savings page

// MonthlyData additions
savings_balances_start: Record<string, number>;  // Start of month
savings_balances_end: Record<string, number>;    // End of month
```

### Behavior

- Selecting Savings or Investment auto-enables `exclude_from_leftover`
- `pay_off_monthly` is dimmed (not applicable)
- Start balance auto-populates from previous month's End
- Start can be overridden if needed

### Rationale

- Two booleans allow clear classification (vs. single enum)
- Separate fields allow "neither" state (regular account)
- Auto-carry reduces data entry
- Dedicated page keeps budget view clean

### Alternatives Considered

1. **New PaymentSourceType values** - Rejected: user preferred separate booleans
2. **Show in sidebar** - Rejected: user wanted dedicated page
3. **Track only end-of-month** - Rejected: need start for change calculation

---

## Item #6: Auto/Manual Payment Badge

### Research Question

How to indicate autopay status on bills?

### Decision

**Required `payment_method: 'auto' | 'manual'` field with colored badge**

### Visual Design

| Value    | Badge    | Color                                          |
| -------- | -------- | ---------------------------------------------- |
| `auto`   | "Auto"   | Green (matches existing success colors)        |
| `manual` | "Manual" | Orange/Amber (matches existing warning colors) |

### Rationale

- Required field ensures all bills have classification
- Colored badges match existing "Ad-hoc" badge pattern
- Display-only for now (no behavioral changes)

### Migration Consideration

- Existing bills need `payment_method` value
- Options: default to `'manual'` (safer) or require user assignment
- **Decision**: Default existing bills to `'manual'` during migration

### Alternatives Considered

1. **Optional field** - Rejected: would leave some bills unmarked
2. **Icon only** - Rejected: text is clearer
3. **Apply to incomes too** - Rejected: user wanted bills only

---

## Item #7: Remove Undo Feature

### Research Question

Is the undo feature functional or dead code?

### Investigation

- Undo service: Fully implemented in `api/src/services/undo-service.ts`
- Undo types: Defined in `api/src/types/index.ts`
- Undo routes: Registered in `api/src/routes/index.ts`
- Undo store: Implemented in `src/stores/undo.ts`
- Undo UI: Button in `src/components/Navigation.svelte`
- **Critical gap**: `pushChange()` is NEVER called by any service

### Decision

**Delete all undo-related code**

### Files to Delete

- `api/src/services/undo-service.ts`
- `api/src/routes/handlers/undo.handlers.ts`
- `src/stores/undo.ts`
- `src/stores/undo.test.ts`
- `data/entities/undo.json`

### Files to Modify

- `api/src/types/index.ts` - Remove `UndoEntityType`, `UndoEntry`
- `api/src/routes/index.ts` - Remove undo route registration
- `src/components/Navigation.svelte` - Remove undo button and Ctrl+Z handler

### Rationale

- Dead code is technical debt
- Never wired up = no loss of functionality
- Simplifies codebase and removes pre-existing TypeScript errors

### Alternatives Considered

1. **Implement it** - Rejected: significant effort, low value for budget app
2. **Defer** - Rejected: dead code should be removed

---

## Item #8: Config Page Styling

### Research Question

How to make Bills/Incomes config pages consistent with DetailedMonthView?

### Decision

**Match DetailedMonthView styling, remove collapse, require categories**

### Styling Changes

| Property        | Current           | New                                     |
| --------------- | ----------------- | --------------------------------------- |
| Background      | Minimal           | Colored tint (`hexToRgba(color, 0.08)`) |
| Border radius   | None              | 8px                                     |
| Left border     | 3px               | 4px                                     |
| Color indicator | Border only       | Border + 12x12 color square             |
| Category name   | UPPERCASE 0.75rem | Normal case 1rem                        |
| Collapse arrow  | Text `>` / `v`    | Removed                                 |

### Validation Changes

- `category_id` becomes required for Bill
- `category_id` becomes required for Income
- Form dropdowns have no empty option

### Rationale

- Visual consistency improves UX (Constitution Principle XIII)
- Collapse arrows were misleading (suggested functionality that wasn't needed)
- Required categories ensures clean data organization

### Migration Consideration

- Existing bills/incomes without categories need assignment
- **Decision**: Migration script or UI prompt to assign categories

### Alternatives Considered

1. **Keep collapse with better icons** - Rejected: collapse not needed
2. **Allow uncategorized but hide section** - Rejected: categories should be required

---

## Summary of Key Decisions

| Item | Key Decision                                                       |
| ---- | ------------------------------------------------------------------ |
| #1   | Use `day_of_month`, remove `due_day`                               |
| #2   | `is_closed` trigger, collapsible headers, localStorage persistence |
| #3   | 4 stats: count, paid, remaining, progress bar                      |
| #4   | Starting Balance row above Income, formula hint below leftover     |
| #5   | Two booleans, separate page, auto-carry start balance              |
| #6   | Required field, colored badges, default `'manual'` for existing    |
| #7   | Delete all undo code                                               |
| #8   | Match DetailedMonthView, no collapse, require categories           |

---

## No Outstanding Clarifications

All NEEDS CLARIFICATION items were resolved during the specification phase. No further research required.
