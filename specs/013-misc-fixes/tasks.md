# Implementation Tasks: Miscellaneous Fixes & Improvements

**Feature**: `013-misc-fixes`
**Branch**: `013-misc-fixes`

## Implementation Strategy

- **Phase 1 (Setup)**: Initialize new directories and core types.
- **Phase 2 (Foundational)**: Implement shared services and data models that multiple stories depend on (Savings Goals, Insurance Updates).
- **Phase 3+ (User Stories)**: Execute user stories in priority order (P1 -> P2 -> P3).
- **Testing**: Manual verification steps provided in `quickstart.md`. No automated tests required unless specified.

## Phase 1: Setup

- [x] T001 Create `src/components/Projections` directory for US2
- [x] T002 Create `src/components/Savings` directory for US7
- [x] T003 [P] Create `data/entities/savings-goals.json` with empty array
- [x] T004 [P] Update `src/types/insurance.ts` to add `SubmissionStatus` 'awaiting_previous'
- [x] T005 [P] Update `src/types/insurance.ts` to add `plans` array to `FamilyMember`
- [x] T006 [P] Update `src/types/insurance.ts` to remove `priority` from `InsurancePlan`

## Phase 2: Foundational

**Goal**: Establish core backend services and data models.

- [x] T007 [US7] Create `api/src/services/savings-goals-service.ts` with CRUD operations
- [x] T008 [US7] Register `SavingsGoalsController` in `api/src/index.ts` (or equivalent router)
- [x] T009 [US8] Update `api/src/services/family-members-service.ts` to handle `plans` array migration (lazy load)
- [x] T010 [US2] Create `api/src/services/projections-service.ts` for histogram calculation logic

## Phase 3: User Story 2 - Monthly Projection Histogram (P1)

**Goal**: Visual projection of available funds to identify deficits.

- [x] T011 [US2] Implement `getProjection(month)` in `api/src/services/projections-service.ts`
- [x] T012 [US2] Create `api/src/controllers/ProjectionsController.ts` endpoint
- [x] T013 [P] [US2] Create `src/stores/projections.ts` frontend store
- [x] T014 [US2] Create `src/components/Projections/HistogramChart.svelte` (SVG implementation)
- [x] T015 [US2] Create `src/components/Projections/ProjectionsPage.svelte` main view
- [ ] T016 [US2] Add "Projections" link to main navigation in `src/routes/+layout.svelte`
- [ ] T017 [US2] Implement "Daily Run Rate" input and reactivity in `ProjectionsPage.svelte`

## Phase 4: User Story 6 - Bug Fix: Partial Payments (High)

**Goal**: Fix "Add Payment" drawer showing 0 paid for bills.

- [ ] T018 [US6] Modify `api/src/services/detailed-view-service.ts` to flatten `occurrences` into `payments` array for `BillInstanceDetailed`
- [ ] T019 [US6] Modify `api/src/services/detailed-view-service.ts` to flatten `occurrences` into `payments` array for `IncomeInstanceDetailed`
- [ ] T020 [US6] Verify `TransactionsDrawer.svelte` correctly displays flattened payments

## Phase 5: User Story 1 - Auto-Select Balance Field (P2)

**Goal**: UX polish for Budget left pane inputs.

- [ ] T021 [US1] Update `src/components/Budget/AccountRow.svelte` (or equivalent) to add `on:focus` handler
- [ ] T022 [US1] Implement `select()` call on input focus for balance fields

## Phase 6: User Story 3 - Quick Filter (P2)

**Goal**: Ctrl+F filter for Budget items.

- [ ] T023 [US3] Create `src/components/Budget/FilterBar.svelte` component
- [ ] T024 [US3] Add `Ctrl+F` / `Cmd+F` window event listener in `src/routes/budget/+page.svelte`
- [ ] T025 [P] [US3] Implement fuzzy search logic in `src/utils/search.ts` (or inline)
- [ ] T026 [US3] Wire up filter state to `BillList` and `IncomeList` components

## Phase 7: User Story 4 & 5 - Payment Prompt & Notes (P2)

**Goal**: Enhanced "Close" flow with dates and notes.

- [ ] T027 [US4] Update `api/src/services/bills-service.ts` (and incomes) to accept `closed_date` and `notes` in close endpoint
- [ ] T028 [US4] Create `src/components/Budget/CloseTransactionModal.svelte` with Date and Note inputs
- [ ] T029 [US4] Update "Close" button in `BillRow.svelte` to trigger the new modal
- [ ] T030 [US5] Update `BillRow.svelte` to display inline notes if present
- [ ] T031 [US5] Update `ItemDetailsDrawer.svelte` to show/edit notes

## Phase 8: User Story 7 - Savings Goals (P2)

**Goal**: Track long-term goals with virtual buckets.

- [ ] T032 [US7] Create `src/components/Savings/SavingsGoalsPage.svelte`
- [ ] T033 [US7] Create `src/components/Savings/GoalCard.svelte` with progress bar and temperature status
- [ ] T034 [US7] Create `src/components/Savings/CreateGoalModal.svelte` with schedule wizard
- [ ] T035 [US7] Implement "Buy That Thing" logic in `api/src/services/savings-goals-service.ts` (transaction creation)
- [ ] T036 [US7] Implement "Auto-Create Bill" logic in `CreateGoalModal.svelte` (calls Bills API)

## Phase 9: User Story 8 - Insurance Priorities (P2)

**Goal**: Per-member plan ordering.

- [x] T037 [US8] Update `src/components/Setup/FamilyMemberForm.svelte` to add "Insurance Plans" reorderable list
- [x] T038 [US8] Update `src/components/Setup/InsurancePlanForm.svelte` to remove "Priority" field
- [x] T039 [US8] Update `api/src/services/insurance-claims-service.ts` `create` method to auto-generate submissions based on member plans

## Phase 10: User Story 9 - Submission Waterfall (P2)

**Goal**: Auto-calculate secondary claims.

- [x] T040 [US9] Update `api/src/services/insurance-claims-service.ts` `updateSubmission` to handle cascade logic
- [x] T041 [US9] Update `src/components/Insurance/SubmissionCard.svelte` to display 'Awaiting Previous' status distinctly
- [x] T042 [US9] Disable editing for 'Awaiting Previous' submissions in UI

## Phase 11: User Story 10 - Easy Portal Access (P2)

**Goal**: Open portals in external browser.

- [x] T043 [US10] Update `src/components/Insurance/SubmissionCard.svelte` to add "Go to Portal" button
- [x] T044 [US10] Implement `open(url)` call using `@tauri-apps/plugin-opener` in the button handler

## Phase 12: Polish

- [ ] T045 Check all new pages for mobile responsiveness
- [ ] T046 Run `make lint` and fix any issues
- [ ] T047 Verify data migration for Family Members works on startup

## Dependencies

- **US8** blocks **US9** (Waterfall depends on Per-Member Priorities)
- **US7** blocks **US2** (Projections should include Savings Goals logic ideally, but spec didn't strictly link them. Treated as independent for now.)
- **US6** is independent bug fix.
- **US1, US3, US4, US5** are independent UX improvements.

## Parallelization Examples

- **US2 (Histogram)**: Backend (`T011`) and Frontend (`T014`) can be built in parallel.
- **US7 (Goals)**: Backend (`T007`) and Frontend (`T032`) can be built in parallel.
- **US1 & US3**: Completely independent, can be done by different devs.
