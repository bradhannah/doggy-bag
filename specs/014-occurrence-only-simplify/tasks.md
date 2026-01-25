# Tasks: Occurrence-Only Payment Model & UI Simplification

**Input**: Design documents from `/specs/014-occurrence-only-simplify/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/occurrence-api.md, quickstart.md

**Tests**: Test tasks are included. This project follows TDD per the constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `api/src/` (Bun HTTP server)
- **Frontend**: `src/` (Svelte 5 + SvelteKit)
- **Desktop**: `src-tauri/` (Tauri/Rust)
- **Tests**: Co-located with source files (`*.test.ts`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare codebase for occurrence-only model changes

- [x] T001 Create feature branch verification and ensure clean working state
- [x] T002 [P] Document breaking API changes in api/CHANGELOG.md (payments endpoints removed)
- [x] T003 [P] Create backup script for user data in api/src/migrations/backup.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data model and type changes that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

### Type System Changes

- [ ] T004 Remove Payment interface from api/src/types/index.ts
- [ ] T005 Update Occurrence interface in api/src/types/index.ts (remove payments[], add payment_source_id)
- [ ] T006 Update Occurrence type in src/stores/detailed-month.ts to match backend

### Backend Calculation Logic

- [ ] T007 Update getEffectiveBillAmount() in api/src/utils/tally.ts to use closed occurrences instead of payments
- [ ] T008 Update getEffectiveIncomeAmount() in api/src/utils/tally.ts to use closed occurrences
- [ ] T009 Remove sumOccurrencePayments() function from api/src/utils/occurrences.ts
- [ ] T010 Update generateOccurrences() in api/src/utils/occurrences.ts to remove payments[] initialization
- [ ] T011 Update hasActualsEntered() in api/src/utils/leftover.ts to check is_closed instead of payments.length

### Backend Endpoint Removal

- [ ] T012 Remove createBillOccurrencePaymentHandler() from api/src/routes/handlers/instances.handlers.ts
- [ ] T013 Remove createIncomeOccurrencePaymentHandler() from api/src/routes/handlers/instances.handlers.ts
- [ ] T014 Remove createDeleteBillOccurrencePaymentHandler() from api/src/routes/handlers/instances.handlers.ts
- [ ] T015 Remove createDeleteIncomeOccurrencePaymentHandler() from api/src/routes/handlers/instances.handlers.ts
- [ ] T016 Remove payment routes from api/src/routes/index.ts

### Frontend Store Cleanup

- [ ] T017 Remove addPaymentToOccurrence() method from src/stores/detailed-month.ts
- [ ] T018 Remove removePaymentFromOccurrence() method from src/stores/detailed-month.ts
- [ ] T019 Simplify updateBillClosedStatus() in src/stores/detailed-month.ts (no payment recalculation)
- [ ] T020 Simplify updateIncomeClosedStatus() in src/stores/detailed-month.ts (no payment recalculation)

### Test Updates for Foundational Changes

- [ ] T021 Update api/src/utils/tally.test.ts - remove payment-based tests, add occurrence-based tests
- [ ] T022 Update api/src/utils/occurrences.test.ts - remove sumOccurrencePayments tests
- [ ] T023 Update src/stores/detailed-month.test.ts - remove payment method tests
- [ ] T024 Run make test-backend && make test-frontend to verify foundational changes pass

**Checkpoint**: Foundation ready - data model is occurrence-only, payment code removed. User story implementation can now begin.

---

## Phase 3: User Story 1 - Close Occurrence as Payment (Priority: P1)

**Goal**: User can close an occurrence to mark the full expected amount as paid. This is the core behavioral change.

**Independent Test**: Close any open occurrence via API and verify:

1. Occurrence is_closed = true
2. closed_date is set
3. Bill totals update correctly (sum closed occurrence expected_amounts)

### Tests for User Story 1

- [ ] T025 [P] [US1] Write contract test for close endpoint with payment_source_id in api/src/routes/handlers/instances.handlers.test.ts
- [ ] T026 [P] [US1] Write unit test for close occurrence updating bill totals in api/src/utils/tally.test.ts

### Implementation for User Story 1

- [ ] T027 [US1] Add payment_source_id to close occurrence request body in api/src/routes/handlers/instances.handlers.ts
- [ ] T028 [US1] Update closeBillOccurrenceHandler() to accept and save payment_source_id in api/src/routes/handlers/instances.handlers.ts
- [ ] T029 [US1] Update closeIncomeOccurrenceHandler() to accept and save payment_source_id in api/src/routes/handlers/instances.handlers.ts
- [ ] T030 [US1] Update months-service.ts to persist payment_source_id on occurrence close
- [ ] T031 [US1] Verify instance is_closed updates when all occurrences closed in api/src/services/months-service.ts
- [ ] T032 [US1] Run make test-backend to verify US1 implementation

**Checkpoint**: Closing an occurrence now represents full payment. API fully functional for close workflow.

---

## Phase 4: User Story 2 - Split Occurrence for Partial Payment (Priority: P1)

**Goal**: User can pay less than expected, splitting the occurrence into closed (paid) + open (remainder).

**Independent Test**: Split a $300 occurrence with $100 paid via API and verify:

1. Original occurrence: expected_amount = $100, is_closed = true
2. New occurrence: expected_amount = $200, is_closed = false, is_adhoc = true
3. Both occurrences appear in instance

### Tests for User Story 2

- [ ] T033 [P] [US2] Write contract test for split endpoint in api/src/routes/handlers/instances.handlers.test.ts
- [ ] T034 [P] [US2] Write unit test for split validation (amount > 0, amount < expected) in api/src/utils/occurrences.test.ts
- [ ] T035 [P] [US2] Write integration test for split updating bill totals in api/src/utils/tally.test.ts

### Implementation for User Story 2

- [ ] T036 [US2] Create splitBillOccurrenceHandler() in api/src/routes/handlers/instances.handlers.ts
- [ ] T037 [US2] Create splitIncomeOccurrenceHandler() in api/src/routes/handlers/instances.handlers.ts
- [ ] T038 [US2] Add POST /split routes in api/src/routes/index.ts
- [ ] T039 [US2] Implement split logic in api/src/services/months-service.ts (close original, create new)
- [ ] T040 [US2] Add validation: paid_amount > 0 and < expected_amount
- [ ] T041 [US2] Assign correct sequence number to new occurrence
- [ ] T042 [US2] Set new occurrence expected_date to end of month
- [ ] T043 [US2] Add splitOccurrence() method to src/stores/detailed-month.ts
- [ ] T044 [US2] Add split API call to src/lib/api/client.ts
- [ ] T045 [US2] Run make test to verify US2 implementation

**Checkpoint**: Partial payment via split is fully functional. Both P1 stories complete.

---

## Phase 5: User Story 3 - Unified Edit & Close Modal (Priority: P2)

**Goal**: Single modal combines editing fields with 3 close options, replacing TransactionsDrawer.

**Independent Test**: Open EditCloseModal, verify:

1. Fields editable: amount, date, payment source, notes
2. Three radio options visible: "Paid in Full", "Paid Nothing", "Partial Payment"
3. "Save Without Closing" updates without closing
4. "Close" closes based on selected option

### Tests for User Story 3

- [ ] T046 [P] [US3] Write component test for EditCloseModal in src/components/DetailedView/EditCloseModal.test.ts
- [ ] T047 [P] [US3] Write component test for SplitConfirmModal in src/components/DetailedView/SplitConfirmModal.test.ts

### Implementation for User Story 3

- [ ] T048 [P] [US3] Create EditCloseModal.svelte in src/components/DetailedView/EditCloseModal.svelte
- [ ] T049 [P] [US3] Create SplitConfirmModal.svelte in src/components/DetailedView/SplitConfirmModal.svelte
- [ ] T050 [US3] Implement amount/date/source/notes edit fields in EditCloseModal
- [ ] T051 [US3] Implement 3 radio options (Paid in Full, Paid Nothing, Partial Payment)
- [ ] T052 [US3] Implement conditional amount field for Partial Payment option
- [ ] T053 [US3] Wire "Save Without Closing" to update occurrence API
- [ ] T054 [US3] Wire "Close" button to close/split based on selected option
- [ ] T055 [US3] Connect SplitConfirmModal to trigger on Partial Payment confirmation
- [ ] T056 [US3] Add success toast messages after operations
- [ ] T057 [US3] Delete TransactionsDrawer.svelte from src/components/DetailedView/TransactionsDrawer.svelte
- [ ] T058 [US3] Update all references to TransactionsDrawer to use EditCloseModal
- [ ] T059 [US3] Run make test-frontend to verify US3 implementation

**Checkpoint**: Unified Edit & Close Modal fully functional. TransactionsDrawer removed.

---

## Phase 6: User Story 4 - Add Ad-hoc Occurrence (Priority: P2)

**Goal**: User can add unscheduled occurrences to any bill/income at the instance level.

**Independent Test**: Click "+ Add Occurrence" on a bill, verify:

1. New ad-hoc occurrence created with default values
2. Occurrence shows "ad-hoc" badge
3. Occurrence can be edited and closed normally

### Tests for User Story 4

- [ ] T060 [P] [US4] Write integration test for add ad-hoc occurrence in api/src/routes/handlers/instances.handlers.test.ts

### Implementation for User Story 4

- [ ] T061 [US4] Move "+ Add Occurrence" button to instance level in src/components/DetailedView/OccurrenceCard.svelte
- [ ] T062 [US4] Ensure ad-hoc occurrences display badge in src/components/DetailedView/OccurrenceRow.svelte
- [ ] T063 [US4] Verify ad-hoc occurrence inherits correct default values
- [ ] T064 [US4] Run make test to verify US4 implementation

**Checkpoint**: Ad-hoc occurrence creation works at instance level.

---

## Phase 7: User Story 5 - Consolidated Line Item Buttons (Priority: P2)

**Goal**: Reduce button clutter with primary button + overflow menu pattern.

**Independent Test**: View any occurrence row and verify:

1. Open occurrence: "Edit" button (primary) + overflow menu (View Details, Delete)
2. Closed occurrence: "Reopen" button (primary) + overflow menu (View Details, Delete)
3. Touch targets are appropriately sized

### Tests for User Story 5

- [ ] T065 [P] [US5] Write component test for overflow menu in src/components/DetailedView/OccurrenceRow.test.ts
- [ ] T066 [P] [US5] Write component test for DeleteConfirmModal in src/components/DetailedView/DeleteConfirmModal.test.ts
- [ ] T067 [P] [US5] Write component test for ReopenConfirmModal in src/components/DetailedView/ReopenConfirmModal.test.ts

### Implementation for User Story 5

- [ ] T068 [P] [US5] Create DeleteConfirmModal.svelte in src/components/DetailedView/DeleteConfirmModal.svelte
- [ ] T069 [P] [US5] Create ReopenConfirmModal.svelte in src/components/DetailedView/ReopenConfirmModal.svelte
- [ ] T070 [P] [US5] Create OccurrenceDetailsDrawer.svelte in src/components/DetailedView/OccurrenceDetailsDrawer.svelte
- [ ] T071 [US5] Update BillRow.svelte with new button layout (Edit + overflow menu)
- [ ] T072 [US5] Update IncomeRow.svelte with new button layout (Edit + overflow menu)
- [ ] T073 [US5] Update OccurrenceRow.svelte with new button layout (Edit/Reopen + overflow menu)
- [ ] T074 [US5] Implement overflow menu with "View Details" and "Delete" options
- [ ] T075 [US5] Wire "View Details" to OccurrenceDetailsDrawer
- [ ] T076 [US5] Wire "Delete" to DeleteConfirmModal (with confirmation)
- [ ] T077 [US5] Wire "Reopen" button to ReopenConfirmModal (with confirmation)
- [ ] T078 [US5] Ensure delete works for ALL occurrences (scheduled and ad-hoc)
- [ ] T079 [US5] Run make test-frontend to verify US5 implementation

**Checkpoint**: Consolidated button layout complete. All P2 stories done.

---

## Phase 8: User Story 6 - Data Migration (Priority: P3)

**Goal**: Existing users' payment data is automatically migrated to occurrence-only model.

**Independent Test**: Run migration on backup data with payments and verify:

1. Fully paid occurrences: is_closed = true, expected_amount = sum of payments
2. Partially paid occurrences: split into closed + open occurrences
3. All historical totals remain accurate

### Tests for User Story 6

- [ ] T080 [P] [US6] Write unit test for migration logic in api/src/migrations/remove-payments.test.ts
- [ ] T081 [P] [US6] Write integration test for migration endpoint in api/src/routes/handlers/migration.handlers.test.ts

### Implementation for User Story 6

- [ ] T082 [US6] Create migration script in api/src/migrations/remove-payments.ts
- [ ] T083 [US6] Implement migration logic: fully paid → close occurrence
- [ ] T084 [US6] Implement migration logic: partially paid → split occurrences
- [ ] T085 [US6] Implement migration logic: no payments → remove empty payments array
- [ ] T086 [US6] Add backup creation before migration runs
- [ ] T087 [US6] Add version flag to prevent re-running migration
- [ ] T088 [US6] Create POST /api/migrate/payments-to-occurrences endpoint in api/src/routes/index.ts
- [ ] T089 [US6] Add dry_run option to migration endpoint
- [ ] T090 [US6] Test migration with sample data containing various payment scenarios
- [ ] T091 [US6] Run make test to verify US6 implementation

**Checkpoint**: Migration complete. All user stories implemented.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, documentation, and validation

- [ ] T092 [P] Update quickstart.md with final API examples
- [ ] T093 [P] Remove any remaining payment-related dead code
- [ ] T094 [P] Ensure all new components use CSS variables (no hardcoded colors)
- [ ] T095 [P] Ensure all new components use CSS spacing variables (no hardcoded pixels)
- [ ] T096 Run make lint && make format to ensure code quality
- [ ] T097 Run full test suite: make test
- [ ] T098 Manual E2E validation of all user stories per spec.md acceptance criteria
- [ ] T099 Verify mobile responsiveness of new modals and button layouts
- [ ] T100 Update any E2E tests in tests/e2e/ affected by UI changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 (Close) and US2 (Split) are both P1 - complete sequentially (US2 depends on US1)
  - US3-US5 are P2 - can proceed in parallel after P1 complete
  - US6 (Migration) is P3 - can start anytime after Foundational, but best done last
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

```
Foundational (Phase 2)
    │
    ├── US1: Close Occurrence (P1) ← Must complete first
    │       │
    │       └── US2: Split Occurrence (P1) ← Depends on US1 close logic
    │               │
    │               ├── US3: Edit & Close Modal (P2) ← Uses close/split
    │               ├── US4: Add Ad-hoc (P2) ← Independent
    │               ├── US5: Consolidated Buttons (P2) ← Uses close/reopen
    │               │
    │               └── US6: Migration (P3) ← Can run anytime
    │
    └── Polish (Phase 9)
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Backend before frontend
- Core implementation before UI integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 2 (Foundational)**:

- T004-T006 type changes can run in parallel
- T007-T011 calculation logic can run sequentially (same files)
- T012-T016 endpoint removal can run in parallel
- T017-T020 store cleanup can run sequentially (same file)
- T021-T023 test updates can run in parallel

**Phase 3-8 (User Stories)**:

- Tests within each story marked [P] can run in parallel
- Component creation marked [P] can run in parallel

---

## Parallel Example: Phase 2 Foundational

```bash
# Type changes (parallel):
Task T004: "Remove Payment interface from api/src/types/index.ts"
Task T005: "Update Occurrence interface in api/src/types/index.ts"
Task T006: "Update Occurrence type in src/stores/detailed-month.ts"

# Endpoint removal (parallel):
Task T012: "Remove createBillOccurrencePaymentHandler()"
Task T013: "Remove createIncomeOccurrencePaymentHandler()"
Task T014: "Remove createDeleteBillOccurrencePaymentHandler()"
Task T015: "Remove createDeleteIncomeOccurrencePaymentHandler()"
```

---

## Parallel Example: User Story 5

```bash
# Create all new components in parallel:
Task T068: "Create DeleteConfirmModal.svelte"
Task T069: "Create ReopenConfirmModal.svelte"
Task T070: "Create OccurrenceDetailsDrawer.svelte"

# Update row components in parallel:
Task T071: "Update BillRow.svelte with new button layout"
Task T072: "Update IncomeRow.svelte with new button layout"
Task T073: "Update OccurrenceRow.svelte with new button layout"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Close)
4. Complete Phase 4: User Story 2 (Split)
5. **STOP and VALIDATE**: Test via curl - close and split work correctly
6. Deploy/demo if ready - basic occurrence-only model works

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (no visible changes yet)
2. Add US1 + US2 → Test API endpoints → Core functionality works (MVP!)
3. Add US3 (Edit Modal) → New streamlined UI for editing/closing
4. Add US4 + US5 → Complete button consolidation
5. Add US6 (Migration) → Safe for existing users
6. Polish → Production ready

### Suggested MVP Scope

**MVP = Phase 1 + Phase 2 + Phase 3 + Phase 4**

This gives you:

- Occurrence-only data model (payments removed)
- Close occurrence endpoint working
- Split occurrence endpoint working
- All calculations using new model

The UI will still work (using existing components) but won't have the streamlined modal until Phase 5+.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Follow AGENTS.md rules: No hardcoded colors, no hardcoded pixels, use CSS variables
