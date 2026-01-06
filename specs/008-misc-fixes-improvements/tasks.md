# Tasks: Miscellaneous Fixes and Improvements

**Branch**: `008-misc-fixes-improvements` | **Date**: 2026-01-05 | **Spec**: [spec.md](./spec.md)
**Input**: Design documents from `/specs/008-misc-fixes-improvements/`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US8)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `api/src/`
- **Frontend**: `src/`
- **Tests**: Co-located with source files
- **Types**: `api/src/types/index.ts` (backend), `src/types/api.ts` (frontend)

---

## Phase 1: Setup & Cleanup

**Purpose**: Clean codebase foundation before feature work

### US7: Remove Unused Undo Feature (Priority: P3 - First for cleanup)

**Goal**: Remove all dead undo code to simplify codebase and eliminate TypeScript errors

**Independent Test**: App compiles without undo code, `/api/undo` returns 404

- [ ] T001 [P] [US7] Delete `api/src/services/undo-service.ts`
- [ ] T002 [P] [US7] Delete `api/src/routes/handlers/undo.handlers.ts`
- [ ] T003 [P] [US7] Delete `src/stores/undo.ts`
- [ ] T004 [P] [US7] Delete `src/stores/undo.test.ts`
- [ ] T005 [P] [US7] Delete `data/entities/undo.json`
- [ ] T006 [US7] Remove undo route registration from `api/src/routes/index.ts`
- [ ] T007 [US7] Remove `UndoEntityType` and `UndoEntry` types from `api/src/types/index.ts`
- [ ] T008 [US7] Remove undo button and Ctrl+Z handler from `src/components/Navigation.svelte`
- [ ] T009 [US7] Search and remove any remaining undo imports: `rg -l "undo" api/src src/`
- [ ] T010 [US7] Verify `make test-backend` passes
- [ ] T011 [US7] Verify `make test-frontend` passes (190+ tests after undo.test.ts removal)
- [ ] T012 [US7] Verify `make build` succeeds with no TypeScript errors
- [ ] T013 [US7] Manual test: `curl http://localhost:3000/api/undo` returns 404

**Checkpoint**: Undo feature completely removed, all tests pass

---

## Phase 2: US1 - Fix Due Date Bug (Priority: P1) - MVP

**Goal**: Monthly bills/incomes use `day_of_month` correctly for occurrence dates

**Independent Test**: Create bill with `day_of_month: 15`, verify occurrence shows 15th

### Implementation for US1

- [ ] T014 [US1] Fix `api/src/utils/occurrences.ts` to use `bill.day_of_month` instead of `bill.due_day`
- [ ] T015 [US1] Fix `api/src/utils/occurrences.ts` to use `income.day_of_month` instead of `income.due_day`
- [ ] T016 [US1] Remove `due_day?: number` from Bill interface in `api/src/types/index.ts`
- [ ] T017 [US1] Remove `due_day?: number` from Income interface in `api/src/types/index.ts`
- [ ] T018 [US1] Update any occurrence tests that reference `due_day` in `api/src/utils/occurrences.test.ts`
- [ ] T019 [US1] Verify `make test-backend` passes
- [ ] T020 [US1] Manual test: Create bill with `day_of_month: 15`, check occurrence date via curl
- [ ] T021 [US1] Manual test: Create bill with `day_of_month: 31` for February, verify adjusted to 28/29

**Checkpoint**: Due dates display correctly for all billing periods

---

## Phase 3: US6 - Auto/Manual Payment Badge (Priority: P3)

**Goal**: Bills display colored badge indicating autopay or manual payment

**Independent Test**: Create bill with `payment_method: 'auto'`, verify green badge appears

### Implementation for US6

- [ ] T022 [US6] Add `PaymentMethod` type (`'auto' | 'manual'`) to `api/src/types/index.ts`
- [ ] T023 [US6] Add `payment_method: PaymentMethod` field to Bill interface in `api/src/types/index.ts`
- [ ] T024 [US6] Add `payment_method` validation (required, enum check) in `api/src/services/bills-service.ts`
- [ ] T025 [US6] Add tests for `payment_method` validation in `api/src/services/bills-service.test.ts` (minimum 3 tests)
- [ ] T026 [US6] Update frontend Bill type in `src/types/api.ts` to include `payment_method`
- [ ] T027 [US6] Add payment_method dropdown to bill form in `src/routes/bills/+page.svelte`
- [ ] T028 [US6] Add Auto/Manual badge component to bill row in `src/components/DetailedView/BillRow.svelte` (or equivalent)
- [ ] T029 [US6] Style badges: green for 'auto', amber for 'manual' (scoped CSS)
- [ ] T030 [US6] Verify `make test-backend` passes
- [ ] T031 [US6] Manual test: POST bill without `payment_method` returns 400
- [ ] T032 [US6] Manual test: Bills config page shows Auto/Manual dropdown
- [ ] T033 [US6] Manual test: Detailed View shows colored badges

**Checkpoint**: Payment method badge displays correctly on all bills

---

## Phase 4: US8 - Required Categories & Config Styling (Priority: P3)

**Goal**: Bills/Incomes require categories, config pages match DetailedMonthView styling

**Independent Test**: POST bill without `category_id` returns 400, config page headers match DetailedMonthView

### Implementation for US8

- [ ] T034 [US8] Update Bill interface: change `category_id?: string` to `category_id: string` in `api/src/types/index.ts`
- [ ] T035 [US8] Update Income interface: change `category_id?: string` to `category_id: string` in `api/src/types/index.ts`
- [ ] T036 [US8] Add `category_id` required validation in `api/src/services/bills-service.ts`
- [ ] T037 [US8] Add `category_id` required validation in `api/src/services/incomes-service.ts`
- [ ] T038 [US8] Add tests for required `category_id` in `api/src/services/bills-service.test.ts` (minimum 2 tests)
- [ ] T039 [US8] Add tests for required `category_id` in `api/src/services/incomes-service.test.ts` (minimum 2 tests)
- [ ] T040 [US8] Update frontend Bill/Income types in `src/types/api.ts`
- [ ] T041 [US8] Update category dropdown to be required (no empty option) in `src/routes/bills/+page.svelte`
- [ ] T042 [US8] Update category dropdown to be required (no empty option) in `src/routes/incomes/+page.svelte`
- [ ] T043 [US8] Restyle category headers in `src/components/Setup/BillsListByCategory.svelte` to match DetailedMonthView
- [ ] T044 [US8] Restyle category headers in `src/components/Setup/IncomesListByCategory.svelte` to match DetailedMonthView
- [ ] T045 [US8] Remove collapse arrows from category headers in config pages
- [ ] T046 [US8] Verify `make test-backend` passes
- [ ] T047 [US8] Manual test: POST bill without `category_id` returns 400
- [ ] T048 [US8] Manual test: POST income without `category_id` returns 400
- [ ] T049 [US8] Manual test: Bills config page has consistent styling

**Checkpoint**: Categories required, config pages visually consistent

---

## Phase 5: US5 - Savings & Investments Tracking (Priority: P3)

**Goal**: Dedicated page to track savings/investment account balances month-over-month

**Independent Test**: Navigate to /savings, enter balances, verify change calculation

### Backend Implementation for US5

- [ ] T050 [P] [US5] Add `is_savings?: boolean` to PaymentSource interface in `api/src/types/index.ts`
- [ ] T051 [P] [US5] Add `is_investment?: boolean` to PaymentSource interface in `api/src/types/index.ts`
- [ ] T052 [P] [US5] Add `savings_balances_start: Record<string, number>` to MonthlyData in `api/src/types/index.ts`
- [ ] T053 [P] [US5] Add `savings_balances_end: Record<string, number>` to MonthlyData in `api/src/types/index.ts`
- [ ] T054 [US5] Add validation rules for `is_savings`/`is_investment` in `api/src/services/payment-sources-service.ts`:
  - Mutually exclusive with `pay_off_monthly`
  - Only one of `is_savings` or `is_investment` can be true
  - Auto-set `exclude_from_leftover` when savings/investment
- [ ] T055 [US5] Add tests for savings/investment validation in `api/src/services/payment-sources-service.test.ts` (minimum 8 tests)
- [ ] T056 [US5] Create `GET /api/payment-sources/savings` endpoint in `api/src/routes/handlers/payment-sources.handlers.ts`
- [ ] T057 [US5] Create `PUT /api/months/:month/savings-balances` endpoint in `api/src/routes/handlers/months.handlers.ts`
- [ ] T058 [US5] Add auto-populate logic for start balances from previous month's end

### Frontend Implementation for US5

- [ ] T059 [US5] Update PaymentSource type in `src/types/api.ts`
- [ ] T060 [US5] Update MonthlyData type in `src/types/api.ts`
- [ ] T061 [US5] Add is_savings/is_investment checkboxes to `src/components/Setup/PaymentSourceForm.svelte`
- [ ] T062 [US5] Dim `pay_off_monthly` when savings/investment selected in payment source form
- [ ] T063 [US5] Create `src/routes/savings/+page.svelte` with:
  - Savings accounts section
  - Investment accounts section
  - Start/end balance inputs per account
  - Change calculation display ($ and %)
- [ ] T064 [US5] Add "Savings" link to navigation in `src/components/Navigation.svelte`
- [ ] T065 [US5] Filter savings/investment accounts from budget sidebar in `src/components/DetailedView/SummarySidebar.svelte`
- [ ] T066 [US5] Verify `make test-backend` passes
- [ ] T067 [US5] Verify `make test-frontend` passes
- [ ] T068 [US5] Manual test: Create savings account, verify excluded from leftover
- [ ] T069 [US5] Manual test: Navigate to /savings, enter balances
- [ ] T070 [US5] Manual test: Verify change calculation shows correctly

**Checkpoint**: Savings page functional, accounts properly excluded from budget

---

## Phase 6: US4 - Dashboard Starting Balance (Priority: P2)

**Goal**: Dashboard displays bank balances to explain leftover calculation

**Independent Test**: Dashboard shows "Starting Balance" row above Income

### Implementation for US4

- [ ] T071 [US4] Add Starting Balance display to `src/routes/+page.svelte` (or Dashboard component)
- [ ] T072 [US4] Fetch leftoverBreakdown to get bank balances
- [ ] T073 [US4] Filter out savings/investment accounts from Starting Balance display
- [ ] T074 [US4] Add formula hint "(Starting + Income - Bills)" below leftover amount
- [ ] T075 [US4] Add tests for balance filtering logic in `src/stores/detailed-month.test.ts` (minimum 2 tests)
- [ ] T076 [US4] Verify `make test-frontend` passes
- [ ] T077 [US4] Manual test: Dashboard shows Starting Balance row
- [ ] T078 [US4] Manual test: Savings accounts NOT shown in Starting Balance

**Checkpoint**: Dashboard clearly shows complete financial picture

---

## Phase 7: US3 - Section Headers with Stats (Priority: P2)

**Goal**: Bills/Income section headers show progress stats

**Independent Test**: Bills header shows "X/Y left", dollar amounts, progress bar

### Implementation for US3

- [ ] T079 [US3] Create `calculateBillStats()` helper function in `src/components/DetailedView/DetailedMonthView.svelte`
- [ ] T080 [US3] Create `calculateIncomeStats()` helper function in `src/components/DetailedView/DetailedMonthView.svelte`
- [ ] T081 [US3] Add stats header component for Bills section showing:
  - "X/Y left" count
  - Amount paid
  - Amount remaining
  - Progress bar
- [ ] T082 [US3] Add stats header component for Income section showing:
  - "X/Y received" count
  - Amount received
  - Amount pending
  - Progress bar
- [ ] T083 [US3] Style progress bars with scoped CSS
- [ ] T084 [US3] Add tests for stats calculation (minimum 4 tests: normal, all paid, none paid, empty)
- [ ] T085 [US3] Verify `make test-frontend` passes
- [ ] T086 [US3] Manual test: Bills header shows correct stats
- [ ] T087 [US3] Manual test: Mark bill as paid, verify stats update

**Checkpoint**: Section headers provide at-a-glance budget progress

---

## Phase 8: US2 - Hide Paid Bills Toggle (Priority: P2)

**Goal**: Toggle to hide closed items and collapse fully-paid categories

**Independent Test**: Toggle ON hides closed items, fully-paid categories collapse to header

### Implementation for US2

- [ ] T088 [US2] Create `hidePaidBills` store in `src/stores/ui.ts` following `compactMode` pattern
- [ ] T089 [US2] Add localStorage persistence with key `budgetforfun-hide-paid-bills`
- [ ] T090 [US2] Add tests for `hidePaidBills` store in `src/stores/ui.test.ts` (minimum 4 tests)
- [ ] T091 [US2] Add toggle button to DetailedMonthView header in `src/components/DetailedView/DetailedMonthView.svelte`
- [ ] T092 [US2] Add `expandedClosedCategories: Set<string>` local state for manual expansion
- [ ] T093 [US2] Filter closed items when toggle is ON
- [ ] T094 [US2] Collapse fully-closed categories to header-only view when toggle is ON
- [ ] T095 [US2] Add "(X/X paid - click to expand)" text to collapsed category headers
- [ ] T096 [US2] Implement click handler to expand collapsed categories
- [ ] T097 [US2] Apply same logic to income sections
- [ ] T098 [US2] Verify `make test-frontend` passes
- [ ] T099 [US2] Manual test: Toggle hides closed bills
- [ ] T100 [US2] Manual test: Fully-paid category collapses to header
- [ ] T101 [US2] Manual test: Click collapsed header expands items
- [ ] T102 [US2] Manual test: Toggle state persists after refresh

**Checkpoint**: Hide paid toggle works for both bills and incomes

---

## Phase 9: Polish & Final Verification

**Purpose**: Final checks and cross-cutting concerns

- [ ] T103 Run `make test-backend` - verify 500+ tests pass
- [ ] T104 Run `make test-frontend` - verify 190+ tests pass (net +15 from baseline after undo removal)
- [ ] T105 Run `npx vitest run --coverage` - verify 80% line coverage
- [ ] T106 Run `make build` - verify no TypeScript errors
- [ ] T107 Run `make lint` - verify no linting errors
- [ ] T108 Full app smoke test - navigate all pages, no console errors
- [ ] T109 Run quickstart.md manual testing gates for all 8 items
- [ ] T110 Verify all acceptance criteria from spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (US7: Remove Undo)
    ↓
Phase 2 (US1: Due Date Bug) ← MVP CHECKPOINT
    ↓
Phase 3 (US6: Payment Badge)
    ↓
Phase 4 (US8: Categories Required)
    ↓
Phase 5 (US5: Savings Page) ← Largest feature
    ↓
Phase 6 (US4: Dashboard Balance)
    ↓
Phase 7 (US3: Section Headers)
    ↓
Phase 8 (US2: Hide Paid Toggle)
    ↓
Phase 9 (Polish)
```

### User Story Independence

After Phase 1 (cleanup), most stories can be done in any order. Recommended order based on:

1. **US1** (P1) - Critical bug fix, must be first
2. **US6, US8** (P3) - Schema changes, good to do together
3. **US5** (P3) - Largest feature, most isolated
4. **US4, US3, US2** (P2) - UI features, build on each other

### Parallel Opportunities

Within each phase, tasks marked [P] can run in parallel:

**Phase 1 (US7)**: T001-T005 can delete files in parallel
**Phase 5 (US5)**: T050-T053 can add types in parallel

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2)

1. Complete Phase 1: Remove undo code (cleanup)
2. Complete Phase 2: Fix due date bug (US1)
3. **STOP and VALIDATE**: Critical bug is fixed
4. Deploy/demo if ready

### Incremental Delivery

Each user story adds testable value:

| Phase | Story | Value Added                            |
| ----- | ----- | -------------------------------------- |
| 1     | US7   | Clean codebase, no dead code           |
| 2     | US1   | Due dates work correctly (MVP)         |
| 3     | US6   | Bills show auto/manual payment type    |
| 4     | US8   | Categories enforced, consistent UI     |
| 5     | US5   | Savings tracking page                  |
| 6     | US4   | Dashboard shows full financial picture |
| 7     | US3   | Section headers with progress stats    |
| 8     | US2   | Hide paid items toggle                 |

### Test Count Summary

| Phase     | Tests Added/Removed  | Running Total                     |
| --------- | -------------------- | --------------------------------- |
| Baseline  | -                    | ~712 (512 backend + 200 frontend) |
| US7       | -10 (undo.test.ts)   | ~702                              |
| US1       | +0 (update existing) | ~702                              |
| US6       | +3                   | ~705                              |
| US8       | +4                   | ~709                              |
| US5       | +8                   | ~717                              |
| US4       | +2                   | ~719                              |
| US3       | +4                   | ~723                              |
| US2       | +4                   | ~727                              |
| **Final** | **+15 net**          | **~727**                          |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each story is independently completable and testable
- Commit after each task or logical group
- Run manual testing gates from quickstart.md at each checkpoint
- All curl tests should be run against `http://localhost:3000`
