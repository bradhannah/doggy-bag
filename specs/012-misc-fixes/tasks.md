# Tasks: Miscellaneous Fixes Round 4

**Input**: Design documents from `/specs/012-misc-fixes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-endpoints.md, quickstart.md

**Tests**: Tests are NOT explicitly requested in this feature specification. Tasks focus on implementation.

**Organization**: Tasks are grouped by user story (10 stories total) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US10)
- Exact file paths included in descriptions

## Path Conventions

- **Frontend**: `src/` (Svelte components, stores, routes)
- **Backend**: `api/src/` (Bun services, handlers, types)
- **Tauri**: `src-tauri/` (Rust config)
- **Data**: `data/entities/` (JSON storage)

---

## Phase 1: Setup (Version Sync & Type Foundations)

**Purpose**: Synchronize versions and establish shared type definitions

- [ ] T001 Update version to 0.3.0 in `src-tauri/tauri.conf.json` (source of truth)
- [ ] T002 [P] Update version to 0.3.0 in `src-tauri/Cargo.toml`
- [ ] T003 [P] Update version to 0.3.0 in `package.json` (root)
- [ ] T004 [P] Update version to 0.3.0 in `api/package.json`
- [ ] T005 Add `payment_method` type to Income in `api/src/types/index.ts`
- [ ] T006 [P] Add `'investment'` to PaymentSourceType in `api/src/types/index.ts`
- [ ] T007 [P] Add insurance entity types (InsurancePlan, InsuranceCategory, InsuranceClaim, ClaimDocument, ClaimSubmission) to `api/src/types/index.ts`
- [ ] T008 [P] Add insurance entity types to frontend in `src/types/api.ts`
- [ ] T009 Add `note` field to backup type in `api/src/types/index.ts`
- [ ] T010 Add `savings_contributions` field to MonthlyData type in `api/src/types/index.ts`

---

## Phase 2: Foundational (Shared Migrations & Services)

**Purpose**: Backend migrations and shared service changes that multiple stories depend on

**⚠️ CRITICAL**: Stories 4, 8, 9 depend on these migrations being complete

- [ ] T011 Add migration logic for `payment_method` default to Income in `api/src/services/incomes-service.ts`
- [ ] T012 Add migration for `type=investment` from `bank_account+is_investment` in `api/src/services/payment-sources-service.ts`
- [ ] T013 Add migration to clear `interest_rate` when `is_variable_rate=true` in `api/src/services/payment-sources-service.ts`
- [ ] T014 Add TODO comments for future cleanup of migrations in `api/src/services/payment-sources-service.ts`

**Checkpoint**: Migrations ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Insurance Claims Tracking (Priority: P1)

**Goal**: Full insurance claims lifecycle management with plans, categories, documents, and submissions

**Independent Test**: Create insurance plans, submit a claim with documents, track through approval to closed status

### Backend - Types & Services

- [ ] T015 [US1] Create insurance plans service in `api/src/services/insurance-plans-service.ts`
- [ ] T016 [P] [US1] Create insurance categories service with predefined seeding in `api/src/services/insurance-categories-service.ts`
- [ ] T017 [US1] Create insurance claims service with status auto-calculation in `api/src/services/insurance-claims-service.ts`
- [ ] T018 [US1] Add claim_number auto-increment logic in `api/src/services/insurance-claims-service.ts`
- [ ] T019 [US1] Add document upload/download handling with sortable filename format in `api/src/services/insurance-claims-service.ts`
- [ ] T020 [US1] Add submission creation with plan_snapshot in `api/src/services/insurance-claims-service.ts`
- [ ] T021 [US1] Add claim status auto-calculation (draft/in_progress/closed) in `api/src/services/insurance-claims-service.ts`

### Backend - Handlers & Routes

- [ ] T022 [US1] Create insurance plans handlers (CRUD) in `api/src/routes/handlers/insurance-plans.handlers.ts`
- [ ] T023 [P] [US1] Create insurance categories handlers (CRUD + predefined protection) in `api/src/routes/handlers/insurance-categories.handlers.ts`
- [ ] T024 [US1] Create insurance claims handlers (CRUD + filters) in `api/src/routes/handlers/insurance-claims.handlers.ts`
- [ ] T025 [US1] Add claims summary endpoint handler in `api/src/routes/handlers/insurance-claims.handlers.ts`
- [ ] T026 [US1] Add document upload/download handlers in `api/src/routes/handlers/insurance-claims.handlers.ts`
- [ ] T027 [US1] Add submission CRUD handlers in `api/src/routes/handlers/insurance-claims.handlers.ts`
- [ ] T028 [US1] Register all insurance routes in `api/src/routes/index.ts`

### Frontend - Stores

- [ ] T029 [P] [US1] Create insurance plans store in `src/stores/insurance-plans.ts`
- [ ] T030 [P] [US1] Create insurance categories store in `src/stores/insurance-categories.ts`
- [ ] T031 [US1] Create insurance claims store with filtering in `src/stores/insurance-claims.ts`

### Frontend - Manage Components

- [ ] T032 [P] [US1] Create InsurancePlanForm component in `src/components/Setup/InsurancePlanForm.svelte`
- [ ] T033 [P] [US1] Create InsurancePlansList component in `src/components/Setup/InsurancePlansList.svelte`
- [ ] T034 [P] [US1] Create InsuranceCategoryForm component in `src/components/Setup/InsuranceCategoryForm.svelte`
- [ ] T035 [P] [US1] Create InsuranceCategoriesList component in `src/components/Setup/InsuranceCategoriesList.svelte`
- [ ] T036 [US1] Add Insurance Plans and Insurance Categories tabs to `src/components/Setup/SetupPage.svelte`

### Frontend - Claims Page Components

- [ ] T037 [US1] Create InsuranceClaimsPage component in `src/components/Insurance/InsuranceClaimsPage.svelte`
- [ ] T038 [US1] Create ClaimsList component with filters in `src/components/Insurance/ClaimsList.svelte`
- [ ] T039 [US1] Create ClaimDetail component in `src/components/Insurance/ClaimDetail.svelte`
- [ ] T040 [US1] Create ClaimForm component in `src/components/Insurance/ClaimForm.svelte`
- [ ] T041 [US1] Create SubmissionCard component in `src/components/Insurance/SubmissionCard.svelte`
- [ ] T042 [US1] Create DocumentUpload component in `src/components/Insurance/DocumentUpload.svelte`
- [ ] T043 [US1] Create ClaimsSummary component in `src/components/Insurance/ClaimsSummary.svelte`

### Frontend - Navigation & Route

- [ ] T044 [US1] Add Insurance Claims route in `src/routes/insurance/+page.svelte`
- [ ] T045 [US1] Add Insurance Claims nav item to `src/components/Navigation.svelte`

### Data Storage

- [ ] T046 [P] [US1] Create empty insurance-plans.json in `data/entities/insurance-plans.json`
- [ ] T047 [P] [US1] Create empty insurance-categories.json in `data/entities/insurance-categories.json`
- [ ] T048 [P] [US1] Create empty insurance-claims.json in `data/entities/insurance-claims.json`
- [ ] T049 [US1] Create documents directory structure at `data/documents/insurance/receipts/`

**Checkpoint**: Insurance Claims feature fully functional - can create plans, categories, claims with documents and submissions

---

## Phase 4: User Story 2 - Savings Page Redesign (Priority: P2)

**Goal**: New Savings page with Contribution column, Est. EOM calculation, and auto-save

**Independent Test**: Navigate to Savings, enter contribution values, verify Est. EOM updates and values auto-save on blur

### Backend

- [ ] T050 [US2] Add `savings_contributions` to MonthlyData in `api/src/services/months-service.ts`
- [ ] T051 [US2] Modify month creation to copy previous Final to new Start in `api/src/services/months-service.ts`
- [ ] T052 [US2] Update savings-balances endpoint to accept contributions in `api/src/routes/handlers/months.handlers.ts`

### Frontend

- [ ] T053 [US2] Redesign Savings page with new columns (Account, Start, Contribution, Est. EOM, Final) in `src/routes/savings/+page.svelte`
- [ ] T054 [US2] Implement Est. EOM calculation (Start + Contribution) in `src/routes/savings/+page.svelte`
- [ ] T055 [US2] Implement auto-save on field blur in `src/routes/savings/+page.svelte`
- [ ] T056 [US2] Style Contribution with green (positive) or red (negative) in `src/routes/savings/+page.svelte`
- [ ] T057 [US2] Update months store to handle contributions in `src/stores/months.ts`

**Checkpoint**: Savings page redesign complete - contribution column works with auto-save

---

## Phase 5: User Story 3 - Unsaved Changes Confirmation (Priority: P2)

**Goal**: Confirmation modal when clicking backdrop with unsaved changes on any edit drawer

**Independent Test**: Open any edit drawer, make changes, click backdrop, verify confirmation modal appears with Save/Discard/Cancel

### Implementation

- [ ] T058 [US3] Implement dirty tracking pattern in `src/components/Setup/BillForm.svelte`
- [ ] T059 [P] [US3] Implement dirty tracking pattern in `src/components/Setup/IncomeForm.svelte`
- [ ] T060 [P] [US3] Implement dirty tracking pattern in `src/components/Setup/PaymentSourceForm.svelte`
- [ ] T061 [P] [US3] Implement dirty tracking pattern in `src/components/Setup/CategoryForm.svelte`
- [ ] T062 [P] [US3] Implement dirty tracking pattern in `src/components/DetailedView/AdHocForm.svelte`
- [ ] T063 [US3] Modify Drawer component to accept dirty check callback in `src/components/Setup/Drawer.svelte`
- [ ] T064 [US3] Add confirmation modal (Save/Discard/Cancel) using existing ConfirmDialog pattern

**Checkpoint**: All 5 forms have unsaved changes confirmation

---

## Phase 6: User Story 4 - Auto/Manual Pills in Manage Lists (Priority: P3)

**Goal**: Display Auto/Manual payment method pills in Manage > Bills and Manage > Incomes lists

**Independent Test**: View Manage > Bills and Manage > Incomes, verify pills display correctly for Auto/Manual

### Implementation

- [ ] T065 [US4] Add payment_method field to IncomeForm in `src/components/Setup/IncomeForm.svelte`
- [ ] T066 [US4] Add Auto/Manual pill display to `src/components/Setup/BillsListByCategory.svelte`
- [ ] T067 [US4] Add Auto/Manual pill display to `src/components/Setup/IncomesListByCategory.svelte`
- [ ] T068 [US4] Update incomes store to include payment_method in `src/stores/incomes.ts`

**Checkpoint**: Auto/Manual pills visible in both Manage lists

---

## Phase 7: User Story 5 - Allow $0 Amounts (Priority: P3)

**Goal**: Allow $0 amounts for bills and incomes while keeping >$0 requirement for payments/transactions

**Independent Test**: Create a bill with $0 amount, verify it saves successfully

### Backend

- [ ] T069 [US5] Update bill amount validation from >=100 to >=0 in `api/src/services/validation.ts`
- [ ] T070 [US5] Update income amount validation from >0 to >=0 in `api/src/services/validation.ts`

### Frontend

- [ ] T071 [P] [US5] Update BillForm min amount validation in `src/components/Setup/BillForm.svelte`
- [ ] T072 [P] [US5] Update IncomeForm min amount validation in `src/components/Setup/IncomeForm.svelte`
- [ ] T073 [P] [US5] Update BillRow inline edit validation in `src/components/DetailedView/BillRow.svelte`
- [ ] T074 [P] [US5] Update IncomeRow inline edit validation in `src/components/DetailedView/IncomeRow.svelte`
- [ ] T075 [P] [US5] Update OccurrenceRow inline edit validation in `src/components/DetailedView/OccurrenceRow.svelte`
- [ ] T076 [P] [US5] Update AdHocForm validation in `src/components/DetailedView/AdHocForm.svelte`

**Checkpoint**: $0 amounts work for bills and incomes

---

## Phase 8: User Story 6 - Hide System Categories (Priority: P3)

**Goal**: Hide Uncategorized and Credit Card Payoffs from Manage panels, require category selection

**Independent Test**: View Manage > Bills, verify Uncategorized and Credit Card Payoffs sections not shown

### Backend

- [ ] T077 [US6] Add category_id required validation for bills in `api/src/services/validation.ts`
- [ ] T078 [US6] Add category_id required validation for incomes in `api/src/services/validation.ts`

### Frontend

- [ ] T079 [US6] Filter out Uncategorized and Credit Card Payoffs in `src/components/Setup/BillsListByCategory.svelte`
- [ ] T080 [US6] Filter out Uncategorized in `src/components/Setup/IncomesListByCategory.svelte`
- [ ] T081 [US6] Make category required in BillForm in `src/components/Setup/BillForm.svelte`
- [ ] T082 [US6] Make category required in IncomeForm in `src/components/Setup/IncomeForm.svelte`

**Checkpoint**: System categories hidden, category required on forms

---

## Phase 9: User Story 7 - Fix Version Reporting (Priority: P3)

**Goal**: Read version dynamically from tauri.conf.json instead of hardcoded fallback

**Independent Test**: Check Settings > About, verify version matches src-tauri/tauri.conf.json

### Implementation

- [ ] T083 [US7] Modify version-service.ts to read from tauri.conf.json in `api/src/services/version-service.ts`
- [ ] T084 [US7] Remove hardcoded version fallback in `api/src/services/version-service.ts`
- [ ] T085 [US7] Update homebrew-release skill with all version locations in `.opencode/skill/homebrew-release/SKILL.md`

**Checkpoint**: Version displays correctly from single source of truth

---

## Phase 10: User Story 8 - Backup Notes (Priority: P3)

**Goal**: Add optional notes to manual backups with display in backup list

**Independent Test**: Click Backup Now, enter a note, verify note icon appears in backup list

### Backend

- [ ] T086 [US8] Modify manual backup handler to accept note parameter in `api/src/routes/handlers/backup.handlers.ts`
- [ ] T087 [US8] Store note in backup file metadata in `api/src/services/version-service.ts`
- [ ] T088 [US8] Return note in backup list response in `api/src/routes/handlers/backup.handlers.ts`

### Frontend

- [ ] T089 [US8] Add backup note modal before creating backup in `src/routes/settings/+page.svelte`
- [ ] T090 [US8] Add note icon to backup list items in `src/routes/settings/+page.svelte`
- [ ] T091 [US8] Add note content display on hover/click in `src/routes/settings/+page.svelte`

**Checkpoint**: Backup notes work end-to-end

---

## Phase 11: User Story 9 - Investment Account Type (Priority: P3)

**Goal**: Add Investment Account as a proper PaymentSourceType with migration from bank_account+is_investment

**Independent Test**: Create a new payment source, select Investment Account from dropdown, verify it works

### Implementation

- [ ] T092 [US9] Add Investment Account to type dropdown with icon in `src/components/Setup/PaymentSourceForm.svelte`
- [ ] T093 [US9] Auto-hide Savings/Investment checkboxes when type=investment in `src/components/Setup/PaymentSourceForm.svelte`
- [ ] T094 [US9] Update payment-sources store for new type in `src/stores/payment-sources.ts`

**Checkpoint**: Investment Account type works with migration

---

## Phase 12: User Story 10 - Variable Rate Disables Interest Rate (Priority: P3)

**Goal**: Disable Interest Rate field when Variable Rate is checked, with migration to clear stale values

**Independent Test**: Check Variable Rate checkbox, verify Interest Rate becomes disabled (grayed out)

### Implementation

- [ ] T095 [US10] Disable Interest Rate field when Variable Rate checked in `src/components/Setup/PaymentSourceForm.svelte`
- [ ] T096 [US10] Clear interest_rate from save payload when is_variable_rate=true in `src/components/Setup/PaymentSourceForm.svelte`
- [ ] T097 [US10] Add TODO comment for migration cleanup in `api/src/services/payment-sources-service.ts`

**Checkpoint**: Variable Rate correctly disables Interest Rate

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, documentation, and validation

- [ ] T098 [P] Update swagger.json with all new insurance endpoints in `api/openapi/swagger.json`
- [ ] T099 [P] Verify all CSS uses theme variables (no hardcoded colors) in new components
- [ ] T100 Run `make test` to ensure all tests pass
- [ ] T101 Run `make lint` and fix any issues
- [ ] T102 Manual testing of all 10 user stories per quickstart.md testing strategy

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - version sync and type definitions
- **Phase 2 (Foundational)**: Depends on Phase 1 - migrations for multiple stories
- **Phase 3-12 (User Stories)**: All depend on Phase 2 completion
  - User stories can proceed in priority order (P1 → P2 → P3)
  - Many can run in parallel if team capacity allows
- **Phase 13 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

| Story                        | Priority | Can Start After | Dependencies on Other Stories |
| ---------------------------- | -------- | --------------- | ----------------------------- |
| US1 (Insurance Claims)       | P1       | Phase 2         | None                          |
| US2 (Savings Redesign)       | P2       | Phase 2         | None                          |
| US3 (Unsaved Changes)        | P2       | Phase 2         | None                          |
| US4 (Auto/Manual Pills)      | P3       | Phase 2         | None                          |
| US5 ($0 Amounts)             | P3       | Phase 2         | None                          |
| US6 (Hide System Categories) | P3       | Phase 2         | None                          |
| US7 (Version Fix)            | P3       | Phase 1         | None (no Phase 2 dependency)  |
| US8 (Backup Notes)           | P3       | Phase 2         | None                          |
| US9 (Investment Type)        | P3       | Phase 2         | Needs T012 migration          |
| US10 (Variable Rate)         | P3       | Phase 2         | Needs T013 migration          |

### Files Modified by Multiple Tasks

| File                                            | Tasks                        | Resolution                                                            |
| ----------------------------------------------- | ---------------------------- | --------------------------------------------------------------------- |
| `api/src/services/validation.ts`                | T069, T070, T077, T078       | Execute T069-T070 (US5) before T077-T078 (US6)                        |
| `api/src/services/payment-sources-service.ts`   | T012, T013, T014, T097       | Execute in task order (all Phase 2 + US10)                            |
| `src/components/Setup/PaymentSourceForm.svelte` | T060, T092, T093, T095, T096 | Execute T060 (US3) first, then T092-T096 (US9/US10)                   |
| `src/components/Setup/BillForm.svelte`          | T058, T071, T081             | Execute T058 (US3) first, then T071 (US5), then T081 (US6)            |
| `src/components/Setup/IncomeForm.svelte`        | T059, T065, T072, T082       | Execute T059 (US3), then T065 (US4), then T072 (US5), then T082 (US6) |

### Parallel Opportunities

**Within Phase 1** (all parallelizable):

- T002, T003, T004 (version files)
- T006, T007, T008 (type definitions)

**Within Phase 3 - US1** (Insurance Claims):

- T029, T030, T031 (stores)
- T032, T033, T034, T035 (Manage components)
- T046, T047, T048 (data files)

**Cross-Story Parallelism** (after Phase 2):

- US7 (Version Fix) has no Phase 2 dependency, can start during Phase 2
- US1-US6 and US8-US10 can all start in parallel after Phase 2

---

## Implementation Strategy

### Recommended Order (Per Quickstart.md)

**Phase A: Quick Wins (~2 hours)**

1. US7 - Version Fix (30 min) - T083-T085
2. US5 - $0 Amounts (30 min) - T069-T076
3. US6 - Hide System Categories (45 min) - T077-T082
4. US10 - Variable Rate (15 min) - T095-T097

**Phase B: Enhancements (~5.5 hours)** 5. US4 - Auto/Manual Pills (1 hour) - T065-T068 6. US8 - Backup Notes (1 hour) - T086-T091 7. US9 - Investment Type (1.5 hours) - T092-T094 8. US3 - Unsaved Changes (2 hours) - T058-T064

**Phase C: Major Feature (~5 hours)** 9. US1 - Insurance Claims (5 hours) - T015-T049

**Phase D: Page Redesign (~2 hours)** 10. US2 - Savings Redesign (2 hours) - T050-T057

### MVP Scope

**Minimum Viable Feature Set**: Complete US1 (Insurance Claims) alone for core value delivery.

**Quick Wins MVP**: Complete US5, US6, US7, US10 for immediate bug fixes and improvements (~2 hours).

---

## Task Summary

| Phase     | Story                        | Tasks          | Estimated Time |
| --------- | ---------------------------- | -------------- | -------------- |
| 1         | Setup                        | T001-T010 (10) | 30 min         |
| 2         | Foundational                 | T011-T014 (4)  | 30 min         |
| 3         | US1 - Insurance Claims       | T015-T049 (35) | 5 hours        |
| 4         | US2 - Savings Redesign       | T050-T057 (8)  | 2 hours        |
| 5         | US3 - Unsaved Changes        | T058-T064 (7)  | 2 hours        |
| 6         | US4 - Auto/Manual Pills      | T065-T068 (4)  | 1 hour         |
| 7         | US5 - $0 Amounts             | T069-T076 (8)  | 30 min         |
| 8         | US6 - Hide System Categories | T077-T082 (6)  | 45 min         |
| 9         | US7 - Version Fix            | T083-T085 (3)  | 30 min         |
| 10        | US8 - Backup Notes           | T086-T091 (6)  | 1 hour         |
| 11        | US9 - Investment Type        | T092-T094 (3)  | 1.5 hours      |
| 12        | US10 - Variable Rate         | T095-T097 (3)  | 15 min         |
| 13        | Polish                       | T098-T102 (5)  | 30 min         |
| **Total** |                              | **102 tasks**  | **~15 hours**  |

---

## Notes

- All tasks follow checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
- [P] tasks can run in parallel (different files, no dependencies)
- [Story] label maps to user stories US1-US10 from spec.md
- Each user story is independently testable per its acceptance criteria
- Commit after each completed user story for incremental delivery
- Stop at any checkpoint to validate story independently
