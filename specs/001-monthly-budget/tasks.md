# Tasks: Monthly Budget Tracker

**Input**: Design documents from `/specs/001-monthly-budget/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test-first development is NON-NEGOTIABLE per constitution. All user stories include test tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Implementation Status Summary (Last Updated: 2025-12-31)

### Completed Phases

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Build System Setup | COMPLETE | Tauri + Svelte + Bun architecture working |
| Phase 2: OpenAPI Type Coordination | COMPLETE | tsoa, openapi-typescript, openapi-fetch integrated |
| Phase 3: Build System Validation | COMPLETE | Sidecar setup, production build tested |
| Phase 3.5: UI Component Prototyping | COMPLETE | All decisions documented in prototyping-decisions.md |
| Phase 4: Foundational Services | COMPLETE | All services implemented |

### Completed User Stories

| User Story | Status | Notes |
|------------|--------|-------|
| US0: First-Time Setup | COMPLETE | Setup page with tabs for Bills/Incomes/Payment Sources |
| US1: Set Up Monthly Bills | COMPLETE | CRUD operations, billing periods working |
| US2: Track Monthly Income | COMPLETE | CRUD operations, billing periods working |
| US3: Calculate Monthly Surplus | COMPLETE | Dashboard with leftover calculation |
| US4: Track Variable Expenses | COMPLETE | Expenses CRUD in monthly data |
| US5: Manage Payment Sources | COMPLETE | CRUD operations with balance tracking |
| US6: Generate Month With Flexible Editing | COMPLETE | Month generation, instance editing |
| US7: View Month-by-Month Breakdown | COMPLETE | Month navigation and data isolation |
| US8: Manage Bill Categories | COMPLETE | 8 pre-defined categories, custom categories |
| US9: Undo Changes | COMPLETE | 5-entry undo stack with Ctrl+Z shortcut |
| US10: Backup/Restore | COMPLETE | Export/Import with validation |
| US11: Free-Flowing Expenses (as Variable) | COMPLETE | Combined with variable expenses |

### Recently Completed Features (This Session)

1. **Backup/Restore API & UI**
   - `api/src/routes/handlers/backup.handlers.ts` - GET/POST /api/backup, POST /api/backup/validate
   - `src/components/Navigation.svelte` - Export/Import buttons in sidebar

2. **Mark as Paid for Bill/Income Instances**
   - Added `is_paid` field to BillInstance and IncomeInstance types
   - `api/src/services/months-service.ts` - toggleBillInstancePaid/toggleIncomeInstancePaid methods
   - `api/src/routes/handlers/instances.handlers.ts` - POST /api/months/:month/bills/:id/paid, POST /api/months/:month/incomes/:id/paid
   - `src/components/Dashboard/BillsCard.svelte` - Checkbox to mark bills as paid
   - `src/components/Dashboard/IncomesCard.svelte` - Checkbox to mark incomes as received

3. **Per-Month Bank Balance Editing**
   - `src/stores/months.ts` - updateBankBalances and bankBalances derived store
   - `src/components/Dashboard/PaymentSourcesCard.svelte` - Editable per-month balances

4. **Keyboard Shortcuts**
   - Ctrl+Z / Cmd+Z for undo
   - Escape to close drawers
   - Enter to submit forms

### Remaining/Optional Polish Tasks

- [ ] Responsive design for mobile/tablet
- [ ] Accessibility improvements (ARIA, screen reader labels)
- [ ] Performance optimization (lazy loading, memoization)
- [ ] E2E tests with Playwright

---

## Phase 1: Build System Setup (Infrastructure First)

**Purpose**: Initialize all three processes (Tauri, Bun, Svelte) and verify they can coexist

- [ ] T001 Initialize Tauri project with `npm create tauri-app` in repository root
- [ ] T002 Configure Tauri to use Svelte + Vite as frontend framework (update tauri.conf.json)
- [ ] T003 [P] Initialize Bun backend in `api/` directory with `bun init`
- [ ] T004 [P] Install Bun dependencies: bun-typescript, @types/bun (no build step required)
- [ ] T005 [P] Initialize Svelte + Vite frontend in `src/` directory with `npm create vite@latest my-svelte-app -- --template svelte-ts`
- [ ] T006 [P] Install Svelte dependencies: svelte, @sveltejs/vite-plugin-svelte, vite, typescript
- [ ] T007 [P] Create Makefile in repository root with build automation targets
- [ ] T008 Configure Makefile `dev` target to start all three processes concurrently:
  - Tauri dev mode (`cargo tauri dev`)
  - Bun server on localhost:3000 (`bun run api/server.ts`)
  - Vite dev server for Svelte frontend (`npm run dev`)
- [ ] T009 [P] Create basic Bun HTTP server skeleton in `api/server.ts` using `bun.serve()` on localhost:3000
- [ ] T010 Create basic Svelte app entry point in `src/app.html` with root layout component
- [ ] T011 Configure Tauri IPC integration to communicate with Bun backend over localhost:3000
- [ ] T012 [P] Create `api/src/models/` directory structure
- [ ] T013 [P] Create `api/src/services/` directory structure
- [ ] T014 [P] Create `api/src/routes/` directory structure
- [ ] T015 [P] Create `api/src/types/` directory structure
- [ ] T016 [P] Create `api/src/utils/` directory structure
- [ ] T017 [P] Create `src/components/` directory structure for Svelte components
- [ ] T018 [P] Create `src/stores/` directory structure for Svelte stores
- [ ] T019 [P] Create `src/routes/` directory structure for Svelte routing
- [ ] T020 [P] Create `data/entities/` directory for default entity JSON files
- [ ] T021 [P] Create `data/months/` directory for monthly budget data JSON files
- [ ] T022 Configure Tauri to bundle Bun server into final executable (update tauri.conf.json with sidecar settings)
- [ ] T023 Configure Vite to proxy API requests to Bun backend (vite.config.ts)

**Checkpoint**: Build system initialized - all three processes can start, directory structure created, Makefile targets ready

---

## Phase 2: OpenAPI Type Coordination (Separate Phase)

**Purpose**: Ensure backend TypeScript types and frontend Svelte types stay in sync via OpenAPI spec

- [ ] T024 Install `openapi-typescript` package in `api/` directory (for generating OpenAPI spec from backend)
- [ ] T025 Install `openapi-typescript` package in `src/` directory (for generating Svelte types from OpenAPI spec)
- [ ] T026 Create OpenAPI spec template in `api/openapi.yaml` with basic metadata (title, version, description)
- [ ] T027 Create backend type definitions file `api/src/types/index.ts` with TypeScript interfaces for all entities (Bill, Income, PaymentSource, etc.)
- [ ] T028 Create OpenAPI spec generation script in `api/scripts/generate-openapi.ts` that:
  - Reads TypeScript types from `api/src/types/index.ts`
  - Generates OpenAPI spec in `api/openapi.yaml`
  - Validates the spec with `openapi-typescript` CLI
- [ ] T029 Create Svelte type generation script in `src/scripts/generate-types.ts` that:
  - Reads OpenAPI spec from `api/openapi.yaml`
  - Generates TypeScript interfaces in `src/types/api.ts` using `openapi-typescript`
  - Validates generated types compile without errors
- [ ] T030 Add `make types` target to Makefile that:
  - Runs `bun run api/scripts/generate-openapi.ts`
  - Runs `bun run src/scripts/generate-types.ts`
- [ ] T031 Create smoke test script in `scripts/smoke-test.sh` that:
  - Starts Bun server on localhost:3000
  - Starts Vite dev server
  - Starts Tauri dev mode
  - Sends test request to http://localhost:3000/health
  - Verifies response is 200 OK
  - Shuts down all processes
- [ ] T032 Add `make smoke-test` target to Makefile that runs `scripts/smoke-test.sh`

**Checkpoint**: Type coordination infrastructure complete - backend and frontend types can be kept in sync

---

## Phase 3: Build System Validation

**Purpose**: Prove Bun, Svelte, Tauri, and OpenAPI all work together before application logic

- [ ] T033 Verify hot reload works: Make change to Svelte component, confirm browser updates without full refresh
- [ ] T034 Verify hot reload works: Make change to Bun backend route, confirm API response updates
- [ ] T035 [P] Verify Tauri bundle builds for current platform: Run `cargo tauri build`, confirm executable created in `src-tauri/target/release/bundle/`
- [ ] T036 [P] Verify executable bundle size: Check that final app bundle is <10MB (Tauri + Svelte + Bun)
- [ ] T037 Run smoke test: Execute `make smoke-test`, verify all three processes start and communicate
- [ ] T038 Verify type checking: Run TypeScript compiler on both backend (`api/`) and frontend (`src/`), confirm no type errors
- [ ] T039 Verify OpenAPI type generation: Run `make types`, confirm `api/openapi.yaml` is generated and `src/types/api.ts` is generated
- [ ] T040 Verify type consistency: Modify a backend type in `api/src/types/index.ts`, run `make types`, confirm Svelte type in `src/types/api.ts` updates to match
- [ ] T041 Verify Makefile dev target: Run `make dev`, confirm Tauri window opens, Bun server starts on localhost:3000, Vite dev server starts
- [ ] T042 Verify Makefile build target: Run `make build`, confirm Tauri app bundles successfully
- [ ] T041 [P] Install Jest for frontend testing in `src/` with `npm install --save-dev jest @types/jest @testing-library/svelte @testing-library/jest-dom @testing-library/user-event`
- [ ] T042 [P] Configure Jest in `src/jest.config.js` with Svelte and Vite support
- [ ] T043 [P] Install Playwright for E2E testing with `npm install --save-dev @playwright/test`
- [ ] T044 [P] Configure Playwright in `src/playwright.config.ts` with Tauri webview support
- [ ] T045 [P] Create test directory structure for frontend in `src/tests/`:
  - `src/tests/unit/` for component unit tests
  - `src/tests/integration/` for component integration tests
- [ ] T046 [P] Create E2E test directory in `tests/e2e/` with sample test file
- [ ] T047 Update Makefile test target to run all test suites:
  - Run `bun test` for backend
  - Run `npm test` for frontend (Jest)
  - Run `npx playwright test` for E2E
  - Combine results and exit with appropriate code
- [ ] T048 [P] Create error log file in `data/errors.log` with initial empty file
- [ ] T048.8 Verify Makefile test target: Run `make test`, confirm all test suites run and report results

**Checkpoint**: Build system validated - Bun, Svelte, Tauri, OpenAPI, and testing infrastructure (Jest + Playwright) proven to work correctly

---

## Phase 3.5: UI Component Prototyping (Work Together)

**Purpose**: Test different UI components and widget configurations to make informed decisions before committing to implementations

**Context**: This phase lets you rapidly prototype different component variations side-by-side and select the best approaches. No business logic yet - just UI exploration.

**Deliverable**: Documented decisions for:
- Widget library choices (native HTML vs custom components)
- Input component configurations (currency inputs, date pickers, dropdowns)
- Modal vs inline editing approaches
- Card vs table layouts for data lists
- Color scheme and styling patterns
- Navigation patterns (tabs, sidebar, top nav)

- [ ] T049 Create prototyping testbed page in `src/prototype.svelte` that:
  - Provides a playground area for testing components
  - Allows switching between different component variations
  - Has tabs/sections for different widget types
  - No real data - just mock data for visual testing
- [ ] T050 [P] Create multiple input component variations in `src/components/prototype/inputs.svelte`:
  - Currency input variation 1: Native input with $ prefix
  - Currency input variation 2: Custom component with auto-formatting
  - Currency input variation 3: Split inputs (dollars + cents)
  - Text input variation 1: Standard text field
  - Text input variation 2: Floating label pattern
- [ ] T051 [P] Create multiple date picker variations in `src/components/prototype/date-pickers.svelte`:
  - Variation 1: Native <input type="date">
  - Variation 2: Native <input type="month"> for month selection
  - Variation 3: Custom month selector (dropdown year, list months)
  - Variation 4: Custom month selector (year dropdown, side-by-side month arrows)
- [ ] T052 [P] Create multiple dropdown variations in `src/components/prototype/dropdowns.svelte`:
  - Variation 1: Native <select> element
  - Variation 2: Custom dropdown with search
  - Variation 3: Custom dropdown with categories
- [ ] T053 [P] Create multiple modal variations in `src/components/prototype/modals.svelte`:
  - Variation 1: Centered modal with backdrop
  - Variation 2: Right-side drawer/modal
  - Variation 3: Inline editing (no modal)
  - Variation 4: Full-screen modal
- [ ] T054 [P] Create multiple list/table variations in `src/components/prototype/lists.svelte`:
  - Variation 1: Table layout with borders
  - Variation 2: Card-based layout
  - Variation 3: Compact list (mobile-first)
  - Variation 4: Grid layout (dashboard cards)
- [ ] T055 [P] Create multiple navigation variations in `src/components/prototype/navigation.svelte`:
  - Variation 1: Top navigation bar
  - Variation 2: Sidebar navigation
  - Variation 3: Tab-based navigation
  - Variation 4: Bottom navigation (mobile)
- [ ] T056 [P] Create color scheme variations in `src/components/prototype/colors.svelte`:
  - Variation 1: Dark mode with user-provided colors
  - Variation 2: Light mode with user-provided colors
  - Variation 3: High contrast mode
  - Variation 4: Custom color picker to test different schemes
- [ ] T057 [P] Create form layout variations in `src/components/prototype/forms.svelte`:
  - Variation 1: Vertical form (labels above inputs)
  - Variation 2: Horizontal form (labels beside inputs)
  - Variation 3: Grid layout (2-column)
  - Variation 4: Compact form (inline labels)
- [ ] T058 Create mock data service in `src/prototype-data.ts` with sample data:
  - 5 mock bills (rent, utilities, car insurance, groceries delivery, streaming)
  - 3 mock income sources (salary, freelance, bonus)
  - 3 mock payment sources (Scotia Checking, Visa, Cash)
  - 2 mock months (January 2025, February 2025) with sample data
- [ ] T044.5 Create prototyping evaluation document in `specs/001-monthly-budget/prototyping-decisions.md` that:
  - Lists each widget category tested
  - Records which variation was selected and why
  - Captures configuration decisions (spacing, padding, shadows, etc.)
  - Documents rejected alternatives and reasons
  - Stores chosen color scheme values
- [ ] T044.6 Run prototyping session with all team members:
  - Open prototype.svelte in Tauri app
  - Navigate through each widget category
  - Test each variation with real user data entry
  - Discuss pros/cons of each approach
  - Make decisions and document in prototyping-decisions.md
- [ ] T044.7 Clean up prototype components after decisions are made:
  - Archive prototyping components to `src/components/prototype-archive/` (optional)
  - Remove prototype.svelte from main app
  - Keep prototyping-decisions.md as reference for implementation

**Checkpoint**: UI component decisions documented - ready to implement actual components with confidence

---

## Phase 4: Foundational Services

**Purpose**: Core infrastructure that ALL user stories depend on (storage, stores, error handling, auto-save)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T044 Create JSON file storage service in `api/src/services/storage.ts` that:
  - Provides functions for reading JSON files from `data/` directory
  - Provides functions for writing JSON files to `data/` directory
  - Handles file not found errors gracefully
  - Validates JSON structure on read
  - Implements atomic write pattern (write to temp file, then rename)
- [ ] T045 [P] Create default entity files in `data/entities/`:
  - `data/entities/bills.json` with empty bills array
  - `data/entities/incomes.json` with empty incomes array
  - `data/entities/payment-sources.json` with empty payment sources array
  - `data/entities/categories.json` with 8 pre-defined categories
- [ ] T046 [P] Create Svelte stores structure in `src/stores/`:
  - `src/stores/bills.ts` for bills state management
  - `src/stores/incomes.ts` for incomes state management
  - `src/stores/payment-sources.ts` for payment sources state management
  - `src/stores/expenses.ts` for expenses state management
  - `src/stores/undo.ts` for undo stack state management
  - `src/stores/ui.ts` for UI state (current month, navigation)
- [ ] T047 Implement error handling service in `api/src/utils/errors.ts` that:
  - Provides standardized error types (ValidationError, NotFoundError, StorageError)
  - Formats errors for human-readable messages (user-facing)
  - Logs errors with context (developer-facing)
  - Handles Bun-specific error types
- [ ] T048 Implement auto-save mechanism in `api/src/services/auto-save.ts` that:
  - Listens for changes in entity stores
  - Debounces saves (500ms) to prevent excessive writes
  - Saves to appropriate JSON file on change
  - Handles concurrent saves (file locking or atomic writes)
  - Provides manual save trigger if needed
- [ ] T049 Create utility functions in `api/src/utils/formatters.ts` for:
  - Currency formatting ($X,XXX.XX)
  - Date formatting (YYYY-MM-DD)
  - Month formatting (YYYY-MM)
  - Currency parsing (strip $, commas, convert to number)
- [ ] T050 Create utility functions in `api/src/utils/validators.ts` for:
  - Validate bill name (not blank, max 100 chars)
  - Validate amount (positive, max 9 digits, currency format)
  - Validate billing period (one of valid values)
  - Validate payment source reference
  - Validate category reference
- [ ] T051 [P] Create TypeScript model definitions in `api/src/models/`:
  - `api/src/models/bill.ts` for Bill and BillInstance interfaces
  - `api/src/models/income.ts` for Income and IncomeInstance interfaces
  - `api/src/models/payment-source.ts` for PaymentSource interface
  - `api/src/models/category.ts` for Category interface
  - `api/src/models/expense.ts` for VariableExpense and FreeFlowingExpense interfaces
  - `api/src/models/monthly-data.ts` for MonthlyData interface
  - `api/src/models/undo.ts` for UndoEntry interface
- [ ] T052 Create validation service in `api/src/services/validation.ts` that:
  - Uses validators from `api/src/utils/validators.ts`
  - Validates entities before saving
  - Returns clear error messages for validation failures
  - Prevents invalid entities from being saved
- [ ] T053 Create logging utility in `api/src/utils/logger.ts` that:
  - Provides debug, info, warn, error levels
  - Logs to console (Bun console)
  - Does NOT log to user-visible terminal (backend transparency principle)
  - Includes timestamps and context
- [ ] T054 Create HTTP route structure in `api/src/routes/index.ts` that:
  - Sets up `bun.serve()` on localhost:3000
  - Configures CORS for localhost only
  - Sets up route handlers for API endpoints
  - Returns 404 for unknown routes
  - Returns 500 for server errors with error details
- [ ] T055 Create OpenAPI health check endpoint in `api/src/routes/health.ts` that:
  - Returns JSON response `{"status": "ok"}`
  - Maps to GET /health
  - Validates server is running and accessible

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 5: User Story 0 - First-Time Setup (Priority: P1) 🎯 MVP

**Goal**: Provide simple onboarding page for users to add initial bills, income sources, and payment sources

**Independent Test**: Can be fully tested by running the Setup page and adding one bill, one income source, and one payment source. User can complete initial setup in under 5 minutes.

### Tests for User Story 0

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T056 [P] [US0] Contract test for GET /api/payment-sources endpoint in `api/tests/contract/test-payment-sources.ts`
- [ ] T057 [P] [US0] Contract test for POST /api/payment-sources endpoint in `api/tests/contract/test-payment-sources.ts`
- [ ] T058 [P] [US0] Contract test for GET /api/bills endpoint in `api/tests/contract/test-bills.ts`
- [ ] T059 [P] [US0] Contract test for POST /api/bills endpoint in `api/tests/contract/test-bills.ts`
- [ ] T060 [P] [US0] Contract test for GET /api/incomes endpoint in `api/tests/contract/test-incomes.ts`
- [ ] T061 [P] [US0] Contract test for POST /api/incomes endpoint in `api/tests/contract/test-incomes.ts`
- [ ] T062 [P] [US0] Integration test for onboarding flow in `api/tests/integration/test-onboarding.ts`:
  - Add payment source via POST /api/payment-sources
  - Add bill via POST /api/bills with payment_source_id
  - Add income via POST /api/incomes with payment_source_id
  - Verify all entities persisted to JSON files
  - Verify payment source list returns added source
  - Verify bills list returns added bill
  - Verify incomes list returns added income

### Implementation for User Story 0

- [ ] T063 [P] [US0] Implement PaymentSource model validation in `api/src/services/validation.ts` (add validatePaymentSource function)
- [ ] T064 [P] [US0] Implement PaymentSource CRUD service in `api/src/services/payment-sources-service.ts`:
  - getPaymentSources() - reads from data/entities/payment-sources.json
  - addPaymentSource(source) - validates, saves to JSON, returns with id
  - updatePaymentSource(id, updates) - validates, updates JSON
  - deletePaymentSource(id) - soft delete (is_active = false)
- [ ] T065 [P] [US0] Implement GET /api/payment-sources route in `api/src/routes/payment-sources.ts`
- [ ] T066 [P] [US0] Implement POST /api/payment-sources route in `api/src/routes/payment-sources.ts`
- [ ] T067 [P] [US0] Implement Bill model validation in `api/src/services/validation.ts` (add validateBill function)
- [ ] T068 [P] [US0] Implement Bill CRUD service in `api/src/services/bills-service.ts`:
  - getBills() - reads from data/entities/bills.json
  - addBill(bill) - validates, saves to JSON, returns with id
  - updateBill(id, updates) - validates, updates JSON
  - deleteBill(id) - soft delete (is_active = false)
- [ ] T069 [P] [US0] Implement GET /api/bills route in `api/src/routes/bills.ts`
- [ ] T070 [P] [US0] Implement POST /api/bills route in `api/src/routes/bills.ts`
- [ ] T071 [P] [US0] Implement Income model validation in `api/src/services/validation.ts` (add validateIncome function)
- [ ] T072 [P] [US0] Implement Income CRUD service in `api/src/services/incomes-service.ts`:
  - getIncomes() - reads from data/entities/incomes.json
  - addIncome(income) - validates, saves to JSON, returns with id
  - updateIncome(id, updates) - validates, updates JSON
  - deleteIncome(id) - soft delete (is_active = false)
- [ ] T073 [P] [US0] Implement GET /api/incomes route in `api/src/routes/incomes.ts`
- [ ] T074 [P] [US0] Implement POST /api/incomes route in `api/src/routes/incomes.ts`
- [ ] T075 [P] [US0] Update OpenAPI spec to include payment-sources, bills, and incomes endpoints in `api/openapi.yaml`
- [ ] T076 [US0] Update generated Svelte types by running `make types`
- [ ] T077 [US0] Implement PaymentSourcesStore in `src/stores/payment-sources.ts`:
  - Fetch payment sources from GET /api/payment-sources on init
  - Provide addPaymentSource() action that calls POST /api/payment-sources
  - Provide updatePaymentSource() action that calls PUT (or PATCH) /api/payment-sources/:id
  - Auto-update on backend changes via polling or event (simple polling for MVP)
- [ ] T078 [US0] Implement BillsStore in `src/stores/bills.ts`:
  - Fetch bills from GET /api/bills on init
  - Provide addBill() action that calls POST /api/bills
  - Provide updateBill() action that calls PUT (or PATCH) /api/bills/:id
  - Auto-update on backend changes
- [ ] T079 [US0] Implement IncomesStore in `src/stores/incomes.ts`:
  - Fetch incomes from GET /api/incomes on init
  - Provide addIncome() action that calls POST /api/incomes
  - Provide updateIncome() action that calls PUT (or PATCH) /api/incomes/:id
  - Auto-update on backend changes
- [ ] T080 [US0] Create Setup page layout in `src/components/Setup/SetupPage.svelte` with tabs (Bills, Incomes, Payment Sources)
- [ ] T081 [US0] Create Tabs component in `src/components/Setup/Tabs.svelte` for switching between Bills, Incomes, Payment Sources
- [ ] T082 [US0] Create EntityList component in `src/components/Setup/EntityList.svelte` that displays bills, incomes, or payment sources in table format
- [ ] T083 [US0] Create AddForm component in `src/components/Setup/AddForm.svelte` for adding new entities (reusable for bills, incomes, payment sources)
- [ ] T084 [US0] Create LoadDefaultsButton component in `src/components/shared/LoadDefaultsButton.svelte` for loading pre-defined entities
- [ ] T085 [US0] Create ClearAllButton component in `src/components/shared/ClearAllButton.svelte` for removing all entities of current tab type
- [ ] T086 [US0] Integrate Setup page into main app navigation in `src/app.html` or root layout
- [ ] T087 [US0] Add navigation to redirect first-time users to Setup page automatically
- [ ] T088 [US0] Add validation error display in Setup page forms (inline error messages below fields)
- [ ] T089 [US0] Add confirmation dialogs for delete actions in Setup page (inline confirmation, not modal)

**Checkpoint**: At this point, User Story 0 should be fully functional - users can add bills, incomes, and payment sources via Setup page

---

## Phase 6: User Story 1 - Set Up Monthly Bills (Priority: P1) 🎯 MVP

**Goal**: Allow users to add and manage fixed recurring expenses with billing periods and payment sources

**Independent Test**: Can be fully tested by adding multiple bills with different billing periods and verifying total fixed cost calculation displays correctly.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T090 [P] [US1] Contract test for billing period calculation in `api/tests/unit/test-billing-period.ts`:
  - Test monthly: 1 instance
  - Test bi-weekly: ~2.17 instances (calculate specific dates)
  - Test weekly: ~4.33 instances
  - Test semi-annually: 0 or 2 instances depending on month
- [ ] T091 [P] [US1] Integration test for bills with different billing periods in `api/tests/integration/test-billing-periods.ts`:
  - Add monthly bill, verify monthly contribution is correct
  - Add bi-weekly bill, verify monthly contribution is correct
  - Add weekly bill, verify monthly contribution is correct
  - Add semi-annually bill, verify monthly contribution is correct
- [ ] T092 [P] [US1] Contract test for PUT /api/bills/:id endpoint in `api/tests/contract/test-bills.ts`
- [ ] T093 [P] [US1] Contract test for DELETE /api/bills/:id endpoint in `api/tests/contract/test-bills.ts`

### Implementation for User Story 1

- [ ] T094 [P] [US1] Implement billing period calculation utility in `api/src/utils/billing-period.ts`:
  - getMonthlyInstanceCount(billingPeriod, month) - returns number of instances for month
  - getBiWeeklyInstances(month, dayOfWeek) - returns dates for bi-weekly bills
  - getWeeklyInstances(month, dayOfWeek) - returns dates for weekly bills
  - getSemiAnnuallyInstances(month) - returns 0 or 2 instances
- [ ] T095 [P] [US1] Update BillsStore in `src/stores/bills.ts` to calculate monthly contribution per bill:
  - Add derived property monthlyContribution that uses billing period
  - Provide getTotalFixedCosts() action that sums all bill monthly contributions
- [ ] T096 [US1] Implement PUT /api/bills/:id route in `api/src/routes/bills.ts`
- [ ] T097 [US1] Implement DELETE /api/bills/:id route in `api/src/routes/bills.ts`
- [ ] T098 [US1] Update OpenAPI spec to include PUT and DELETE for bills in `api/openapi.yaml`
- [ ] T099 [US1] Update generated Svelte types by running `make types`
- [ ] T100 [US1] Create BillList component in `src/components/Bills/BillList.svelte` that:
  - Displays all bills in table format
  - Shows billing period and payment source
  - Shows monthly contribution (calculated from billing period)
  - Provides [Edit] and [Delete] buttons
  - Shows total fixed costs at bottom
- [ ] T101 [US1] Create BillForm component in `src/components/Bills/BillForm.svelte` for adding/editing bills:
  - Name input (required)
  - Amount input (required, currency format)
  - Billing period dropdown (Monthly, Bi-weekly, Weekly, Semi-annually)
  - Payment source dropdown (populated from PaymentSourcesStore)
  - Category dropdown (populated from CategoriesStore, optional)
  - Save and Cancel buttons
  - Inline validation errors
- [ ] T102 [US1] Create EditBillModal component in `src/components/Bills/EditBillModal.svelte` for editing existing bills
- [ ] T103 [US1] Update BillsStore to support update and delete actions (updateBill, deleteBill)
- [ ] T104 [US1] Integrate BillList and BillForm into Bills page in `src/routes/Bills.svelte` or similar
- [ ] T105 [US1] Add Bills page to main app navigation

**Checkpoint**: At this point, User Story 1 should be fully functional - users can add, edit, and delete bills with billing periods

---

## Phase 7: User Story 2 - Track Monthly Income (Priority: P1) 🎯 MVP

**Goal**: Allow users to add and manage income sources with billing periods and payment sources

**Independent Test**: Can be fully tested by adding income sources with different billing periods and verifying total income calculation displays correctly.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T106 [P] [US2] Contract test for PUT /api/incomes/:id endpoint in `api/tests/contract/test-incomes.ts`
- [ ] T107 [P] [US2] Contract test for DELETE /api/incomes/:id endpoint in `api/tests/contract/test-incomes.ts`
- [ ] T108 [P] [US2] Integration test for income calculation in `api/tests/integration/test-income-calculation.ts`:
  - Add monthly income, verify monthly contribution is correct
  - Add bi-weekly income, verify monthly contribution is correct
  - Add weekly income, verify monthly contribution is correct
  - Verify total income is sum of all income contributions

### Implementation for User Story 2

- [ ] T109 [P] [US2] Implement PUT /api/incomes/:id route in `api/src/routes/incomes.ts`
- [ ] T110 [P] [US2] Implement DELETE /api/incomes/:id route in `api/src/routes/incomes.ts`
- [ ] T111 [P] [US2] Update IncomesStore in `src/stores/incomes.ts` to calculate monthly contribution per income:
  - Add derived property monthlyContribution that uses billing period
  - Provide getTotalIncome() action that sums all income monthly contributions
- [ ] T112 [US2] Update OpenAPI spec to include PUT and DELETE for incomes in `api/openapi.yaml`
- [ ] T113 [US2] Update generated Svelte types by running `make types`
- [ ] T114 [US2] Create IncomeList component in `src/components/Incomes/IncomeList.svelte` that:
  - Displays all incomes in table format
  - Shows billing period and payment source
  - Shows monthly contribution (calculated from billing period)
  - Provides [Edit] and [Delete] buttons
  - Shows total income at bottom
- [ ] T115 [US2] Create IncomeForm component in `src/components/Incomes/IncomeForm.svelte` for adding/editing incomes:
  - Name input (required)
  - Amount input (required, currency format)
  - Billing period dropdown (Monthly, Bi-weekly, Weekly, Semi-annually)
  - Payment source dropdown (populated from PaymentSourcesStore)
  - Save and Cancel buttons
  - Inline validation errors
- [ ] T116 [US2] Create EditIncomeModal component in `src/components/Incomes/EditIncomeModal.svelte` for editing existing incomes
- [ ] T117 [US2] Update IncomesStore to support update and delete actions (updateIncome, deleteIncome)
- [ ] T118 [US2] Integrate IncomeList and IncomeForm into Incomes page in `src/routes/Incomes.svelte` or similar
- [ ] T119 [US2] Add Incomes page to main app navigation

**Checkpoint**: At this point, User Story 2 should be fully functional - users can add, edit, and delete incomes with billing periods

---

## Phase 8: User Story 3 - Calculate Monthly Surplus With Bank Balance (Priority: P1) 🎯 MVP

**Goal**: Calculate and display "leftover at end of month" using bank balances, income, and expenses

**Independent Test**: Can be fully tested by entering bank balances for multiple payment sources and verifying the "leftover" calculation is accurate.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T120 [P] [US3] Unit test for "leftover" calculation in `api/tests/unit/test-leftover-calculation.ts`:
  - Test with positive bank balances, income, and expenses
  - Test with credit card debt (negative balances)
  - Test with zero bank balances
  - Test with negative "leftover" (deficit)
- [ ] T121 [P] [US3] Contract test for GET /api/months/:month endpoint in `api/tests/contract/test-months.ts`
- [ ] T122 [P] [US3] Contract test for PUT /api/months/:month/bank-balances endpoint in `api/tests/contract/test-months.ts`
- [ ] T123 [P] [US3] Integration test for "leftover" calculation flow in `api/tests/integration/test-leftover-flow.ts`:
  - Add payment sources with bank balances
  - Add incomes with billing periods
  - Add bills with billing periods
  - Create monthly data for a month
  - Update bank balances for month
  - Verify "leftover" calculation is correct

### Implementation for User Story 3

- [ ] T124 [P] [US3] Implement "leftover" calculation service in `api/src/services/leftover-service.ts` that:
  - Calculates total cash/net worth from payment sources (sum of positive balances - sum of credit card debt)
  - Calculates total income for month (sum of income instances with billing periods)
  - Calculates total expenses for month (sum of bill instances)
  - Returns leftover = total cash + total income - total expenses
- [ ] T125 [P] [US3] Implement monthly data service in `api/src/services/months-service.ts` that:
  - getMonthlyData(month) - reads from data/months/YYYY-MM.json or generates from defaults
  - generateMonthlyData(month) - creates new month from default bills and incomes
  - updateBankBalances(month, balances) - updates bank_balances map in monthly data
  - saveMonthlyData(month, data) - saves to data/months/YYYY-MM.json
- [ ] T126 [P] [US3] Create MonthlyData model and service logic in `api/src/models/monthly-data.ts` and `api/src/services/months-service.ts`
- [ ] T127 [US3] Implement GET /api/months/:month route in `api/src/routes/months.ts` that returns monthly data including calculated "leftover"
- [ ] T128 [US3] Implement PUT /api/months/:month/bank-balances route in `api/src/routes/months.ts` for updating bank balances
- [ ] T129 [US3] Update OpenAPI spec to include months endpoints in `api/openapi.yaml`
- [ ] T130 [US3] Update generated Svelte types by running `make types`
- [ ] T131 [US3] Create Dashboard component in `src/components/Dashboard/Dashboard.svelte` that:
  - Displays "leftover at end of month" prominently
  - Shows total cash/net worth breakdown
  - Shows total income breakdown
  - Shows total expenses breakdown
  - Updates in real-time as user makes changes
- [ ] T132 [US3] Create LeftoverCard component in `src/components/Dashboard/LeftoverCard.svelte` for displaying "leftover" value with color coding (green for surplus, red for deficit)
- [ ] T133 [US3] Create IncomeSummaryCard component in `src/components/Dashboard/IncomeSummaryCard.svelte` for displaying total income and breakdown
- [ ] T134 [US3] Create ExpenseSummaryCard component in `src/components/Dashboard/ExpenseSummaryCard.svelte` for displaying total expenses and breakdown
- [ ] T135 [US3] Create PaymentSourcesCard component in `src/components/Dashboard/PaymentSourcesCard.svelte` for displaying payment sources and total cash/net worth
- [ ] T136 [US3] Implement UIStore in `src/stores/ui.ts` with:
  - currentMonth state (YYYY-MM format)
  - setMonth(month) action
  - navigation state (dashboard, setup, bills, incomes, payment-sources, expenses)
  - setNavigation(nav) action
- [ ] T137 [US3] Create MonthSelector component in `src/components/Dashboard/MonthSelector.svelte` for month navigation with year selector and month list
- [ ] T138 [US3] Create QuickActions component in `src/components/Dashboard/QuickActions.svelte` for quick-add buttons (Add Bill, Add Expense, Add Income, Add Payment Source)
- [ ] T139 [US3] Integrate Dashboard components into Dashboard page
- [ ] T140 [US3] Add Dashboard page to main app navigation (default view)

**Checkpoint**: At this point, User Story 3 should be fully functional - users can view "leftover" calculation with bank balances, income, and expenses

---

## Phase 9: User Story 4 - Track Variable Expenses (Priority: P2)

**Goal**: Allow users to add and track variable costs like groceries and clothing that vary month to month

**Independent Test**: Can be fully tested by adding variable expenses and verifying they're included in the "leftover" calculation.

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T141 [P] [US4] Contract test for GET /api/months/:month/expenses endpoint in `api/tests/contract/test-months.ts`
- [ ] T142 [P] [US4] Contract test for POST /api/months/:month/expenses endpoint in `api/tests/contract/test-months.ts`
- [ ] T143 [P] [US4] Contract test for PUT /api/months/:month/expenses/:id endpoint in `api/tests/contract/test-months.ts`
- [ ] T144 [P] [US4] Contract test for DELETE /api/months/:month/expenses/:id endpoint in `api/tests/contract/test-months.ts`
- [ ] T145 [P] [US4] Integration test for variable expenses in `api/tests/integration/test-variable-expenses.ts`:
  - Add variable expense for a month
  - Verify expense appears in month data
  - Verify "leftover" calculation includes expense
  - Verify expenses do NOT carry over to other months (month isolation)

### Implementation for User Story 4

- [ ] T146 [P] [US4] Implement VariableExpense model validation in `api/src/services/validation.ts` (add validateVariableExpense function)
- [ ] T147 [P] [US4] Implement variable expense CRUD operations in `api/src/services/months-service.ts`:
  - getVariableExpenses(month) - reads from data/months/YYYY-MM.json
  - addVariableExpense(month, expense) - validates, saves to monthly data
  - updateVariableExpense(month, id, updates) - validates, updates monthly data
  - deleteVariableExpense(month, id) - removes from monthly data
- [ ] T148 [P] [US4] Implement GET /api/months/:month/expenses route in `api/src/routes/months.ts`
- [ ] T149 [P] [US4] Implement POST /api/months/:month/expenses route in `api/src/routes/months.ts`
- [ ] T150 [P] [US4] Implement PUT /api/months/:month/expenses/:id route in `api/src/routes/months.ts`
- [ ] T151 [P] [US4] Implement DELETE /api/months/:month/expenses/:id route in `api/src/routes/months.ts`
- [ ] T152 [US4] Update OpenAPI spec to include variable expense endpoints in `api/openapi.yaml`
- [ ] T153 [US4] Update generated Svelte types by running `make types`
- [ ] T154 [US4] Implement ExpensesStore in `src/stores/expenses.ts` with:
  - Fetch variable expenses for current month
  - Provide addVariableExpense() action
  - Provide updateVariableExpense() action
  - Provide deleteVariableExpense() action
  - Auto-update on month change
- [ ] T155 [US4] Create VariableExpenseList component in `src/components/Expenses/VariableExpenseList.svelte` that:
  - Displays variable expenses for current month
  - Shows expense name, amount, date, payment source
  - Provides [Edit] and [Delete] buttons
  - Shows total variable expenses at bottom
  - Filter by payment source
  - Sort by date, amount, name
- [ ] T156 [US4] Create VariableExpenseForm component in `src/components/Expenses/VariableExpenseForm.svelte` for adding/editing variable expenses:
  - Name input (required)
  - Amount input (required, currency format)
  - Payment source dropdown (populated from PaymentSourcesStore)
  - Category dropdown (optional)
  - Date input (required, defaults to today)
  - Save and Cancel buttons
  - Inline validation errors
- [ ] T157 [US4] Integrate VariableExpenseList and VariableExpenseForm into Expenses page
- [ ] T158 [US4] Add Expenses page to main app navigation
- [ ] T159 [US4] Update Dashboard to include variable expenses in "leftover" calculation

**Checkpoint**: At this point, User Story 4 should be fully functional - users can add, edit, and delete variable expenses

---

## Phase 10: User Story 5 - Manage Payment Sources (Priority: P2)

**Goal**: Allow users to set up and manage multiple payment sources (bank accounts, credit cards, cash)

**Independent Test**: Can be fully tested by adding payment sources and assigning them to bills/expenses.

### Tests for User Story 5

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T160 [P] [US5] Contract test for PUT /api/payment-sources/:id endpoint in `api/tests/contract/test-payment-sources.ts`
- [ ] T161 [P] [US5] Contract test for DELETE /api/payment-sources/:id endpoint in `api/tests/contract/test-payment-sources.ts`
- [ ] T162 [P] [US5] Integration test for payment source deletion conflicts in `api/tests/integration/test-payment-source-conflicts.ts`:
  - Add payment source
  - Add bill assigned to that payment source
  - Try to delete payment source
  - Verify error is returned (cannot delete payment source in use)
  - Verify payment source is NOT deleted

### Implementation for User Story 5

- [ ] T163 [P] [US5] Implement PUT /api/payment-sources/:id route in `api/src/routes/payment-sources.ts`
- [ ] T164 [P] [US5] Implement DELETE /api/payment-sources/:id route in `api/src/routes/payment-sources.ts`
- [ ] T165 [US5] Update PaymentSourcesStore to support update and delete actions (updatePaymentSource, deletePaymentSource)
- [ ] T166 [US5] Update OpenAPI spec to include PUT and DELETE for payment-sources in `api/openapi.yaml`
- [ ] T167 [US5] Update generated Svelte types by running `make types`
- [ ] T168 [US5] Create PaymentSourceList component in `src/components/PaymentSources/PaymentSourceList.svelte` that:
  - Displays all payment sources in table format
  - Shows name, type, balance
  - Calculates and displays total cash/net worth (sum of positive balances - sum of credit card debt)
  - Provides [Edit] and [Delete] buttons
  - Filter by type (Bank Account, Credit Card, Cash)
  - Sort by name, balance
- [ ] T169 [US5] Create AddPaymentSourceForm component in `src/components/PaymentSources/AddPaymentSourceForm.svelte` (inline or modal)
- [ ] T170 [US5] Create EditPaymentSourceForm component in `src/components/PaymentSources/EditPaymentSourceForm.svelte` (modal)
- [ ] T171 [US5] Create TotalCashCard component in `src/components/PaymentSources/TotalCashCard.svelte` for displaying total cash/net worth
- [ ] T172 [US5] Create LoadDefaultsButton in Payment Sources context (load example payment sources like "Scotia Checking", "Visa", "Cash")
- [ ] T173 [US5] Create ClearAllButton in Payment Sources context (remove all payment sources with confirmation)
- [ ] T174 [US5] Integrate PaymentSourceList, forms, and cards into Payment Sources page
- [ ] T175 [US5] Add Payment Sources page to main app navigation

**Checkpoint**: At this point, User Story 5 should be fully functional - users can add, edit, and delete payment sources with balance tracking

---

## Phase 11: User Story 6 - Generate Month With Flexible Editing (Priority: P2)

**Goal**: Allow users to generate a new month from default definitions and edit individual instances

**Independent Test**: Can be fully tested by generating a month, editing individual bills/instances, and verifying original definitions remain unchanged.

### Tests for User Story 6

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T176 [P] [US6] Unit test for month generation in `api/tests/unit/test-month-generation.ts`:
  - Test generating month from default bills and incomes
  - Test applying billing periods (monthly = 1 instance, bi-weekly = ~2.17, weekly = ~4.33, semi-annually = 0-2)
  - Test that month instances are independent copies (not references to defaults)
- [ ] T177 [P] [US6] Integration test for month editing in `api/tests/integration/test-month-editing.ts`:
  - Generate a month
  - Edit a bill instance amount
  - Verify original default bill is unchanged
  - Verify month instance has customized amount
  - Generate another month
  - Verify new month uses original default values (not previous edits)

### Implementation for User Story 6

- [ ] T178 [P] [US6] Update months-service.ts to implement generateMonthlyData(month) function:
  - Copy all active bills → create BillInstance records with is_default: true
  - Apply billing period logic to create correct number of instances per month
  - Copy all active incomes → create IncomeInstance records similarly
  - Create empty arrays for variable_expenses and free_flowing_expenses
  - Create empty bank_balances map
  - Set created_at timestamp
- [ ] T179 [P] [US6] Implement BillInstance and IncomeInstance models in `api/src/models/` (already in data-model.md, just implement TypeScript interfaces)
- [ ] T180 [US6] Implement POST /api/months/:month/generate route in `api/src/routes/months.ts` that generates month data from defaults
- [ ] T181 [US6] Implement PUT /api/months/:month/bill-instances/:id route in `api/src/routes/months.ts` for editing bill instances
- [ ] T182 [US6] Implement PUT /api/months/:month/income-instances/:id route in `api/src/routes/months.ts` for editing income instances
- [ ] T183 [US6] Update OpenAPI spec to include month generation and instance editing endpoints in `api/openapi.yaml`
- [ ] T184 [US6] Update generated Svelte types by running `make types`
- [ ] T185 [US6] Update BillsStore to track bill instances per month:
  - Add getBillInstances(month) action
  - Add updateBillInstance(month, billId, updates) action
  - Add deleteBillInstance(month, id) action
- [ ] T186 [US6] Update IncomesStore to track income instances per month:
  - Add getIncomeInstances(month) action
  - Add updateIncomeInstance(month, incomeId, updates) action
  - Add deleteIncomeInstance(month, id) action
- [ ] T187 [US6] Update BillsList to show "Default Bills" vs "Month Instances" toggle
- [ ] T188 [US6] Add visual indicators for default vs customized instances (star icon for default, dot for customized)
- [ ] T189 [US6] Update BillForm and EditBillModal to handle both default bills and month instances
- [ ] T190 [US6] Update IncomeForm and EditIncomeModal to handle both default incomes and month instances
- [ ] T191 [US6] Update MonthSelector to generate month if doesn't exist when user navigates to it
- [ ] T192 [US6] Update Dashboard to use month instances instead of default bills/incomes when viewing a specific month

**Checkpoint**: At this point, User Story 6 should be fully functional - users can generate months and edit instances independently

---

## Phase 12: User Story 7 - View Month-by-Month Breakdown (Priority: P2)

**Goal**: Allow users to view budget data broken out by month

**Independent Test**: Can be fully tested by entering data for multiple months and verifying each month displays correctly.

### Tests for User Story 7

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T193 [P] [US7] Contract test for GET /api/months endpoint in `api/tests/contract/test-months.ts` (returns list of all months)
- [ ] T194 [P] [US7] Integration test for month navigation in `api/tests/integration/test-month-navigation.ts`:
  - Create data for January
  - Create data for February
  - Navigate to January via month selector
  - Verify January data loads correctly
  - Navigate to February via month selector
  - Verify February data loads correctly
  - Verify data isolation (January data doesn't affect February)

### Implementation for User Story 7

- [ ] T195 [P] [US7] Implement GET /api/months route in `api/src/routes/months.ts` that returns list of all months with summary data
- [ ] T196 [US7] Update MonthSelector to populate month list from API (GET /api/months)
- [ ] T197 [US7] Update UIStore to handle month navigation and trigger data reload on month change
- [ ] T198 [US7] Update Dashboard to reload monthly data when month changes
- [ ] T199 [US7] Update BillsList to reload bill instances when month changes
- [ ] T200 [US7] Update IncomeList to reload income instances when month changes
- [ ] T201 [US7] Update VariableExpenseList to reload variable expenses when month changes
- [ ] T202 [US7] Update PaymentSourcesCard to show bank balances for current month
- [ ] T203 [US7] Update OpenAPI spec to include GET /api/months endpoint in `api/openapi.yaml`
- [ ] T204 [US7] Update generated Svelte types by running `make types`

**Checkpoint**: At this point, User Story 7 should be fully functional - users can navigate between months and view independent data

---

## Phase 13: User Story 8 - Manage Bill Categories (Priority: P2)

**Goal**: Allow users to organize bills into categories with pre-defined categories available out-of-the-box

**Independent Test**: Can be fully tested by selecting a pre-defined category for a bill and verifying it appears correctly.

### Tests for User Story 8

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T205 [P] [US8] Contract test for GET /api/categories endpoint in `api/tests/contract/test-categories.ts`
- [ ] T206 [P] [US8] Contract test for POST /api/categories endpoint in `api/tests/contract/test-categories.ts`
- [ ] T207 [P] [US8] Integration test for categories in `api/tests/integration/test-categories.ts`:
  - Verify 8 pre-defined categories exist on first load
  - Add custom category
  - Verify custom category appears in list
  - Assign bill to custom category
  - Verify bill shows correct category

### Implementation for User Story 8

- [ ] T208 [P] [US8] Create categories.json file in `data/entities/categories.json` with 8 pre-defined categories
- [ ] T209 [P] [US8] Implement Category model validation in `api/src/services/validation.ts` (add validateCategory function)
- [ ] T210 [P] [US8] Implement Category CRUD service in `api/src/services/categories-service.ts`:
  - getCategories() - reads from data/entities/categories.json
  - addCategory(category) - validates, saves to JSON, returns with id
  - updateCategory(id, updates) - validates, updates JSON
  - deleteCategory(id) - soft delete (is_active = false)
- [ ] T211 [P] [US8] Implement GET /api/categories route in `api/src/routes/categories.ts`
- [ ] T212 [P] [US8] Implement POST /api/categories route in `api/src/routes/categories.ts`
- [ ] T213 [P] [US8] Create CategoriesStore in `src/stores/categories.ts`:
  - Fetch categories on init
  - Provide addCategory() action
  - Provide updateCategory() action
  - Provide deleteCategory() action
- [ ] T214 [US8] Update BillsList to filter by category (add category dropdown)
- [ ] T215 [US8] Update BillForm to include category dropdown (populated from CategoriesStore)
- [ ] T216 [US8] Update BillList to show category in table columns
- [ ] T217 [US8] Update OpenAPI spec to include categories endpoints in `api/openapi.yaml`
- [ ] T218 [US8] Update generated Svelte types by running `make types`

**Checkpoint**: At this point, User Story 8 should be fully functional - users can use pre-defined and custom bill categories

---

## Phase 14: User Story 9 - Undo Changes (Priority: P2)

**Goal**: Maintain history of previous 5 changes and allow users to undo them

**Independent Test**: Can be fully tested by making changes and then using undo to revert them.

### Tests for User Story 9

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T219 [P] [US9] Unit test for undo stack in `api/tests/unit/test-undo-stack.ts`:
  - Test adding changes to stack (push)
  - Test undo (pop most recent change)
  - Test stack limit (max 5 changes, oldest discarded when full)
  - Test empty stack (undo does nothing)
- [ ] T220 [P] [US9] Integration test for undo functionality in `api/tests/integration/test-undo.ts`:
  - Make 3 sequential changes to bills
  - Undo once, verify reverts to state after 2 changes
  - Undo again, verify reverts to state after 1 change
  - Undo again, verify reverts to initial state
  - Make 6 changes, verify only 5 available to undo
  - Verify undo button disabled when stack empty

### Implementation for User Story 9

- [ ] T221 [P] [US9] Implement UndoStack service in `api/src/services/undo-service.ts`:
  - pushChange(entry) - adds change to stack, discards oldest if full
  - undo() - pops most recent change, returns it
  - clear() - clears stack
  - getStack() - returns current stack
  - isEmpty() - returns true if no changes to undo
- [ ] T222 [P] [US9] Implement POST /api/undo route in `api/src/routes/undo.ts` that:
  - Pops most recent change from undo stack
  - Reverts entity to old value
  - Returns reverted entity
- [ ] T223 [P] [US9] Implement GET /api/undo route in `api/src/routes/undo.ts` that returns current undo stack (for undo button state)
- [ ] T224 [P] [US9] Update undo-service.ts to push changes whenever entities are modified (hook into bills-service, incomes-service, expenses-service, payment-sources-service)
- [ ] T225 [US9] Update OpenAPI spec to include undo endpoints in `api/openapi.yaml`
- [ ] T226 [US9] Update generated Svelte types by running `make types`
- [ ] T227 [US9] Implement UndoStore in `src/stores/undo.ts`:
  - Fetch current undo stack on init
  - Provide undo() action that calls POST /api/undo
  - Auto-refresh when changes are made (poll or event)
- [ ] T228 [US9] Update Dashboard QuickActions to include Undo button
- [ ] T229 [US9] Update Undo button to be disabled when undo stack is empty
- [ ] T230 [US9] Add keyboard shortcut for undo (Cmd+Z on macOS, Ctrl+Z on Windows/Linux)

**Checkpoint**: At this point, User Story 9 should be fully functional - users can undo their recent changes

---

## Phase 15: User Story 10 - Restore Data Line-by-Line (Priority: P3)

**Goal**: Allow users to restore their data from a backup file line-by-line

**Independent Test**: Can be fully tested by creating a backup, deleting a bill, and then restoring just that bill from the backup.

### Tests for User Story 10

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T231 [P] [US10] Integration test for backup export in `api/tests/integration/test-backup-export.ts`:
  - Add bills, incomes, payment sources
  - Export backup via POST /api/backup/export
  - Verify backup file contains all entities
  - Verify backup file is valid JSON
- [ ] T232 [P] [US10] Integration test for backup restore in `api/tests/integration/test-backup-restore.ts`:
  - Add bills, incomes, payment sources
  - Export backup
  - Delete a bill
  - Import backup via POST /api/backup/validate
  - Select single bill to restore
  - Restore via POST /api/backup/restore
  - Verify bill is restored
  - Verify other entities unchanged

### Implementation for User Story 10

- [ ] T233 [P] [US10] Implement backup export service in `api/src/services/backup-service.ts` that:
  - Reads all entities from JSON files (bills.json, incomes.json, payment-sources.json, categories.json)
  - Reads all monthly data files (data/months/YYYY-MM.json)
  - Creates backup JSON structure with export_date timestamp
  - Returns backup JSON for user to download
- [ ] T234 [P] [US10] Implement backup validation service in `api/src/services/backup-service.ts` that:
  - Reads uploaded backup JSON file
  - Validates JSON structure
  - Validates data integrity (references valid, IDs unique)
  - Returns list of entities that can be restored
  - Returns warnings for potential conflicts (overwrites)
- [ ] T235 [P] [US10] Implement backup restore service in `api/src/services/backup-service.ts` that:
  - Accepts list of entity IDs to restore
  - Restores selected entities to appropriate JSON files
  - Merges with existing data (or overwrites based on user choice)
  - Validates restored data
  - Returns success/failure status
- [ ] T236 [US10] Implement POST /api/backup/export route in `api/src/routes/backup.ts` that exports all data
- [ ] T237 [US10] Implement POST /api/backup/validate route in `api/src/routes/backup.ts` that validates uploaded backup file
- [ ] T238 [US10] Implement POST /api/backup/restore route in `api/src/routes/backup.ts` that restores selected entities
- [ ] T239 [US10] Update OpenAPI spec to include backup endpoints in `api/openapi.yaml`
- [ ] T240 [US10] Update generated Svelte types by running `make types`
- [ ] T241 [US10] Create BackupExport component in `src/components/Backup/BackupExport.svelte` for exporting data
- [ ] T242 [US10] Create BackupRestore component in `src/components/Backup/BackupRestore.svelte` for importing and restoring data:
  - File upload input for backup JSON file
  - Validates uploaded file via POST /api/backup/validate
  - Displays list of entities in backup with checkboxes
  - Shows warnings for potential conflicts
  - Restores selected entities via POST /api/backup/restore
- [ ] T243 [US10] Add Backup page to main app navigation with Export and Restore tabs

**Checkpoint**: At this point, User Story 10 should be fully functional - users can export and restore data line-by-line

---

## Phase 16: User Story 11 - Track Free-Flowing Expenses (Priority: P2)

**Goal**: Allow users to track ad-hoc, one-time expenses that don't fit into regular bills or variable expenses

**Independent Test**: Can be fully tested by adding an ad-hoc expense and verifying it appears in the current month's expense list and is subtracted from "leftover".

### Tests for User Story 11

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T244 [P] [US11] Contract test for GET /api/months/:month/free-flowing-expenses endpoint in `api/tests/contract/test-months.ts`
- [ ] T245 [P] [US11] Contract test for POST /api/months/:month/free-flowing-expenses endpoint in `api/tests/contract/test-months.ts`
- [ ] T246 [P] [US11] Contract test for PUT /api/months/:month/free-flowing-expenses/:id endpoint in `api/tests/contract/test-months.ts`
- [ ] T247 [P] [US11] Contract test for DELETE /api/months/:month/free-flowing-expenses/:id endpoint in `api/tests/contract/test-months.ts`
- [ ] T248 [P] [US11] Integration test for free-flowing expenses in `api/tests/integration/test-free-flowing-expenses.ts`:
  - Add free-flowing expense for current month
  - Verify expense appears in month data
  - Verify "leftover" calculation includes expense
  - Navigate to next month
  - Verify free-flowing expenses do NOT carry over (month isolation)

### Implementation for User Story 11

- [ ] T249 [P] [US11] Implement FreeFlowingExpense model validation in `api/src/services/validation.ts` (add validateFreeFlowingExpense function)
- [ ] T250 [P] [US11] Implement free-flowing expense CRUD operations in `api/src/services/months-service.ts`:
  - getFreeFlowingExpenses(month) - reads from data/months/YYYY-MM.json
  - addFreeFlowingExpense(month, expense) - validates, saves to monthly data
  - updateFreeFlowingExpense(month, id, updates) - validates, updates monthly data
  - deleteFreeFlowingExpense(month, id) - removes from monthly data
- [ ] T251 [P] [US11] Implement GET /api/months/:month/free-flowing-expenses route in `api/src/routes/months.ts`
- [ ] T252 [P] [US11] Implement POST /api/months/:month/free-flowing-expenses route in `api/src/routes/months.ts`
- [ ] T253 [P] [US11] Implement PUT /api/months/:month/free-flowing-expenses/:id route in `api/src/routes/months.ts`
- [ ] T254 [P] [US11] Implement DELETE /api/months/:month/free-flowing-expenses/:id route in `api/src/routes/months.ts`
- [ ] T255 [US11] Update OpenAPI spec to include free-flowing expense endpoints in `api/openapi.yaml`
- [ ] T256 [US11] Update generated Svelte types by running `make types`
- [ ] T257 [US11] Update ExpensesStore to track free-flowing expenses:
  - Add getFreeFlowingExpenses(month) action
  - Provide addFreeFlowingExpense() action
  - Provide updateFreeFlowingExpense() action
  - Provide deleteFreeFlowingExpense() action
- [ ] T258 [US11] Create FreeFlowingExpenseList component in `src/components/Expenses/FreeFlowingExpenseList.svelte` that:
  - Displays free-flowing expenses for current month
  - Shows expense name, amount, date, payment source
  - Provides [Edit] and [Delete] buttons
  - Shows total free-flowing expenses at bottom
  - Filter by payment source
  - Sort by date, amount, name
- [ ] T259 [US11] Create FreeFlowingExpenseForm component in `src/components/Expenses/FreeFlowingExpenseForm.svelte` (modal):
  - Name input (required)
  - Amount input (required, currency format)
  - Payment source dropdown (populated from PaymentSourcesStore)
  - Date input (required, defaults to today)
  - Notes textarea (optional, max 200 chars)
  - Quick add preset buttons ($50, $100, $200, $500)
  - Save and Cancel buttons
  - Inline validation errors
- [ ] T260 [US11] Add toggle to VariableExpenseList to switch between "Variable Expenses" and "Free-Flowing Expenses"
- [ ] T261 [US11] Update Dashboard to include free-flowing expenses in "leftover" calculation
- [ ] T262 [US11] Update Dashboard QuickActions to include "Add Free-Flowing Expense" button (larger, emphasized)

**Checkpoint**: At this point, User Story 11 should be fully functional - users can add, edit, and delete free-flowing expenses

---

## Phase 17: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and ensure production readiness

- [ ] T263 [P] Update Makefile to include `make lint` target (run ESLint on backend and frontend)
- [ ] T264 [P] Update Makefile to include `make format` target (run Prettier or similar formatter)
- [ ] T265 [P] Update Makefile to include `make test` target (run all test suites)
- [ ] T266 [P] Update Makefile to include `make clean` target (remove build artifacts)
- [ ] T267 [P] Update Makefile to include `make build` target (build Tauri app for current platform)
- [ ] T268 Add responsive design styles for mobile devices (<768px wide) across all components
- [ ] T269 Add responsive design styles for tablet devices (768px - 1200px wide) across all components
- [ ] T270 Add color scheme configuration based on user-provided values in spec.md (update CSS variables)
- [ ] T271 Add accessibility improvements: keyboard navigation for all interactive elements, screen reader labels, ARIA attributes
- [ ] T272 Add loading states for API requests (spinners or skeleton screens)
- [ ] T273 Add error boundaries in Svelte app to handle component errors gracefully
- [ ] T274 Add toast notifications for user feedback (save success, error messages, undo confirmations)
- [ ] T275 Add inline validation to all forms (real-time error messages below fields)
- [ ] T276 Add confirmation dialogs for destructive actions (delete buttons)
- [ ] T277 Optimize performance: memoize calculation functions in Svelte components
- [ ] T278 Optimize performance: lazy load monthly data (only load current month, others on-demand)
- [ ] T279 Add currency formatting utilities to display values consistently ($X,XXX.XX format)
- [ ] T280 Add date formatting utilities to display dates consistently (YYYY-MM-DD, month names)
- [ ] T281 Add empty states for all lists (helpful messages when no data exists)
- [ ] T282 Add "Load Defaults" button functionality to Setup page (populate with example data)
- [ ] T283 Add "Clear All" button functionality to Setup page (remove all entities with confirmation)
- [ ] T284 Update OpenAPI spec with all endpoints and schemas (final validation)
- [ ] T285 Regenerate Svelte types from final OpenAPI spec (run `make types`)
- [ ] T286 Update README.md with quickstart instructions and project overview
- [ ] T287 Update quickstart.md with actual commands and screenshots
- [ ] T288 Run all test suites to verify no regressions (contract, integration, unit)
- [ ] T289 Run build validation: `make build` and verify bundle size <10MB
- [ ] T290 Run smoke test: `make smoke-test` and verify all services start correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **OpenAPI (Phase 2)**: Depends on Setup completion - generates types from backend
- **Validation (Phase 3)**: Depends on Setup + OpenAPI - validates integration
- **Prototyping (Phase 3.5)**: Depends on Validation completion - allows UI exploration before business logic
- **Foundational (Phase 4)**: Depends on Prototyping completion - BLOCKS all user stories
  - Uses UI decisions from prototyping phase
  - Blocks user story implementation until component choices are finalized
- **User Stories (Phase 5-16)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 17)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 0 (P1)**: Can start after Foundational (Phase 4) - Provides Setup page
- **User Story 1 (P1)**: Depends on US0 (Payment Sources needed before Bills) - Setup page includes payment sources
- **User Story 2 (P1)**: Depends on US0 (Payment Sources needed before Incomes) - Setup page includes payment sources
- **User Story 3 (P1)**: Depends on US1, US2 (Bills and Incomes needed for "leftover" calculation)
- **User Story 4 (P2)**: Can start after Foundational (Phase 4) - Independent of P1 stories
- **User Story 5 (P2)**: Depends on US0 (Payment Sources created in Setup) - But can run in parallel with US1-US3 after Setup
- **User Story 6 (P2)**: Depends on US1, US2 (Bills and Incomes needed for month generation)
- **User Story 7 (P2)**: Depends on US3 (Monthly data needed for navigation)
- **User Story 8 (P2)**: Can start after Foundational (Phase 4) - Independent of other stories
- **User Story 9 (P2)**: Depends on US1, US2, US4, US5 (Undo needs entities to track)
- **User Story 10 (P3)**: Depends on all entity stories (backup needs bills, incomes, payment sources, expenses)
- **User Story 11 (P2)**: Can start after Foundational (Phase 4) - Independent of other stories

### Within Each User Story

- Tests (contract, integration, unit) MUST be written and FAIL before implementation (TDD)
- Models before services
- Services before routes/endpoints
- API routes before Svelte components
- Svelte stores before components
- Core implementation before integration

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003-T006, T012-T021)
- All OpenAPI tasks marked [P] can run in parallel (T026-T027)
- All Foundational tasks marked [P] can run in parallel (T045-T046, T051, T063-T066)
- **All prototyping tasks marked [P] can run in parallel (T043.6-T044.2)** - 7 parallel tasks for UI exploration
- All contract tests for a user story marked [P] can run in parallel
- All model implementations within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members (after Foundational)
- All Polish tasks marked [P] can run in parallel (T263-T267, T268-T269, etc.)

---

## Parallel Examples

### Phase 1: Build System Setup

```bash
# Run all setup tasks in parallel:
Task: "Initialize Bun backend in api/ directory"
Task: "Initialize Svelte + Vite frontend in src/ directory"
Task: "Create Makefile in repository root with build automation targets"
Task: "Create api/src/models/, services/, routes/, types/, utils/ directories"
Task: "Create src/components/, stores/, routes/ directories"
Task: "Create data/entities/, data/months/ directories"
```

### Phase 2: OpenAPI Type Coordination

```bash
# Run OpenAPI setup in parallel:
Task: "Create OpenAPI spec template in api/openapi.yaml"
Task: "Create backend type definitions in api/src/types/index.ts"
Task: "Create OpenAPI spec generation script"
Task: "Create Svelte type generation script"
```

### Phase 3.5: UI Component Prototyping (Work Together)

```bash
# Run all prototyping tasks in parallel (team can work together):
Task: "Create prototyping testbed page in src/prototype.svelte"
Task: "Create multiple input component variations (currency, text, date pickers)"
Task: "Create multiple dropdown variations (native, custom with search, categories)"
Task: "Create multiple modal variations (centered, drawer, inline, full-screen)"
Task: "Create multiple list/table variations (table, cards, compact, grid)"
Task: "Create multiple navigation variations (top nav, sidebar, tabs, bottom nav)"
Task: "Create color scheme variations (dark, light, high contrast)"
Task: "Create form layout variations (vertical, horizontal, grid, compact)"
Task: "Create mock data service for testing components"
```

**Team Work Session**: All team members gather together to:
1. Open prototype.svelte in Tauri app
2. Navigate through each widget category
3. Test each variation with real data entry
4. Discuss pros/cons of each approach
5. Make decisions and document in prototyping-decisions.md

### Phase 4: Foundational Services

```bash
# Run foundational tasks in parallel:
Task: "Create default entity files (bills.json, incomes.json, payment-sources.json, categories.json)"
Task: "Create Svelte stores structure"
Task: "Create TypeScript model definitions (Bill, Income, PaymentSource, etc.)"
Task: "Implement PaymentSource CRUD service"
Task: "Implement Bill CRUD service"
Task: "Implement Income CRUD service"
```

### User Story 0: First-Time Setup

```bash
# Run contract tests in parallel:
Task: "Contract test for GET /api/payment-sources"
Task: "Contract test for POST /api/payment-sources"
Task: "Contract test for GET /api/bills"
Task: "Contract test for POST /api/bills"
Task: "Contract test for GET /api/incomes"
Task: "Contract test for POST /api/incomes"

# Run service implementations in parallel:
Task: "Implement PaymentSource model validation"
Task: "Implement PaymentSource CRUD service"
Task: "Implement Bill model validation"
Task: "Implement Bill CRUD service"
Task: "Implement Income model validation"
Task: "Implement Income CRUD service"
```

### User Story 1: Set Up Monthly Bills

```bash
# Run billing period calculation tests in parallel:
Task: "Contract test for billing period calculation"
Task: "Integration test for bills with different billing periods"

# Run service implementations in parallel:
Task: "Implement billing period calculation utility"
Task: "Implement PUT /api/bills/:id route"
Task: "Implement DELETE /api/bills/:id route"
```

### Polish Phase

```bash
# Run Makefile targets setup in parallel:
Task: "Add make lint target"
Task: "Add make format target"
Task: "Add make test target"
Task: "Add make clean target"
Task: "Add make build target"

# Run responsive design tasks in parallel:
Task: "Add responsive design styles for mobile"
Task: "Add responsive design styles for tablet"
```

---

## Implementation Strategy

### MVP First (User Stories 0-3 Only)

1. Complete Phase 1: Build System Setup (T001-T023)
2. Complete Phase 2: OpenAPI Type Coordination (T024-T032)
3. Complete Phase 3: Build System Validation (T033-T043) - PROVE TECH STACK WORKS
4. Complete Phase 3.5: UI Component Prototyping (T043.5-T047) - **WORK TOGETHER TO TEST UI CHOICES**
5. **STOP AND DECIDE**: Make final decisions on widgets and document in `prototyping-decisions.md`
6. Complete Phase 4: Foundational Services (T044-T055) - Uses UI decisions from prototyping
7. **STOP AND VALIDATE**: Run `make smoke-test` to verify all services work together
8. Complete Phase 5: User Story 0 - First-Time Setup (T056-T089)
9. **STOP AND VALIDATE**: Test onboarding flow, add bill/income/payment source
10. Complete Phase 6: User Story 1 - Set Up Monthly Bills (T090-T105)
11. **STOP AND VALIDATE**: Test bill management with billing periods
12. Complete Phase 7: User Story 2 - Track Monthly Income (T106-T119)
13. **STOP AND VALIDATE**: Test income management with billing periods
14. Complete Phase 8: User Story 3 - Calculate Monthly Surplus (T120-T140)
15. **STOP AND VALIDATE**: Test "leftover" calculation - **MVP COMPLETE**
16. Deploy/demo MVP to stakeholders
17. Gather feedback, adjust approach if needed

### Incremental Delivery (Full Feature)

1. Complete Setup + OpenAPI + Validation → Foundation ready (T001-T043)
2. Complete UI Component Prototyping → UI decisions finalized (T043.5-T047) - **WORK TOGETHER**
3. **STOP AND DECIDE**: Make final widget choices and document in `prototyping-decisions.md`
4. Complete Foundational Services → User story implementation can begin (T044-T055) - Uses UI decisions
5. **STOP AND VALIDATE**: Run `make smoke-test` to verify all services work together
6. Add User Story 0 (Setup) → Test independently → **MVP ALPHA** (T056-T089)
7. Add User Story 1 (Bills) → Test independently → **MVP BETA** (T090-T105)
8. Add User Story 2 (Incomes) → Test independently → **MVP BETA** (T106-T119)
9. Add User Story 3 (Surplus) → Test independently → **MVP COMPLETE** (T120-T140)
10. Deploy/demo MVP
11. Add User Story 4 (Variable Expenses) → Test independently → **V1.1** (T141-T159)
12. Add User Story 5 (Payment Sources) → Test independently → **V1.1** (T160-T175)
13. Add User Story 6 (Month Generation) → Test independently → **V1.1** (T176-T192)
14. Add User Story 7 (Month Navigation) → Test independently → **V1.1** (T193-T204)
15. Add User Story 8 (Categories) → Test independently → **V1.2** (T205-T218)
16. Add User Story 9 (Undo) → Test independently → **V1.2** (T219-T230)
17. Add User Story 11 (Free-Flowing Expenses) → Test independently → **V1.3** (T244-T262)
18. Add User Story 10 (Backup/Restore) → Test independently → **V1.3** (T231-T243)
19. Polish Phase → **V1.3 FINAL** (T263-T290)
20. Deploy V1.3

### Parallel Team Strategy

With multiple developers:

1. **All developers**: Complete Setup + OpenAPI + Validation together (T001-T043)
2. **ALL TEAM**: Complete UI Component Prototyping together (T043.5-T047) - **WORK TOGETHER**
3. **STOP AND DECIDE**: Make final widget choices, document in `prototyping-decisions.md`
4. **Team**: Complete Foundational Services together using UI decisions (T044-T055)
5. **STOP AND VALIDATE**: Run `make smoke-test` together
6. Once Foundational is done:
   - **Developer A**: User Story 0 (Setup) (T056-T089)
   - **Developer B**: User Story 1 (Bills) (T090-T105)
   - **Developer C**: User Story 2 (Incomes) (T106-T119)
7. Integrate and test together → **MVP CORE READY**
8. Next iteration:
   - **Developer A**: User Story 3 (Surplus) (T120-T140)
   - **Developer B**: User Story 4 (Variable Expenses) (T141-T159)
   - **Developer C**: User Story 5 (Payment Sources) (T160-T175)
9. Continue parallel work for P2 and P3 stories

---

## Summary

**Total Tasks**: 313

**Task Count by Phase**:
- Phase 1 (Build System Setup): 23 tasks (T001-T023)
- Phase 2 (OpenAPI Type Coordination): 9 tasks (T024-T032)
- Phase 3 (Build System Validation): 8 tasks (T033-T040)
- Phase 3.25 (Testing Infrastructure): 8 tasks (T043-T043.8) - **Jest + Playwright**
- Phase 3.5 (UI Component Prototyping): 13 tasks (T043.5-T047) - **WORK TOGETHER**
- Phase 4 (Foundational Services): 12 tasks (T044-T055)
- Phase 5 (User Story 0): 34 tasks (T056-T089)
- Phase 6 (User Story 1): 16 tasks (T090-T105)
- Phase 7 (User Story 2): 14 tasks (T106-T119)
- Phase 8 (User Story 3): 21 tasks (T120-T140)
- Phase 9 (User Story 4): 19 tasks (T141-T159)
- Phase 10 (User Story 5): 16 tasks (T160-T175)
- Phase 11 (User Story 6): 17 tasks (T176-T192)
- Phase 12 (User Story 7): 12 tasks (T193-T204)
- Phase 13 (User Story 8): 14 tasks (T205-T218)
- Phase 14 (User Story 9): 12 tasks (T219-T230)
- Phase 15 (User Story 10): 13 tasks (T231-T243)
- Phase 16 (User Story 11): 19 tasks (T244-T262)
- Phase 17 (Polish): 28 tasks (T263-T290)

**Task Count by Priority**:
- **P1 (MVP)**: 169 tasks (Setup + OpenAPI + Validation + Testing Infra + Prototyping + Foundational + US0-US3)
- **P2**: 119 tasks (US4-US9, US11)
- **P3**: 13 tasks (US10)
- **Polish**: 28 tasks (cross-cutting)

**Parallel Opportunities Identified**:
- 50+ tasks marked with [P] can run in parallel within their phases
- Contract tests for each user story can run in parallel (6-8 per story)
- Model implementations within stories can run in parallel (3-4 per story)
- Service implementations within stories can run in parallel (2-3 per story)
- Polish tasks can run in parallel (responsive design, Makefile targets, utilities)

**Independent Test Criteria for Each Story**:
- **US0 (Setup)**: Add bill, income, payment source in under 5 minutes
- **US1 (Bills)**: Add bills with billing periods, verify total fixed cost
- **US2 (Incomes)**: Add incomes with billing periods, verify total income
- **US3 (Surplus)**: Enter bank balances, verify "leftover" calculation accurate
- **US4 (Variable Expenses)**: Add variable expenses, verify in "leftover" calculation
- **US5 (Payment Sources)**: Add payment sources, assign to bills/expenses, verify total cash
- **US6 (Month Generation)**: Generate month, edit instances, verify defaults unchanged
- **US7 (Month Navigation)**: Navigate months, verify data isolation
- **US8 (Categories)**: Use pre-defined categories, add custom category
- **US9 (Undo)**: Make changes, undo, verify reverts correctly
- **US10 (Backup/Restore)**: Export backup, delete bill, restore bill line-by-line
- **US11 (Free-Flowing)**: Add ad-hoc expense, verify in current month only

**Suggested MVP Scope**: User Stories 0-3 (Setup, Bills, Income, Surplus Calculation)
- **MVP Task Count**: 155 tasks (includes UI prototyping phase)
- **Estimated Time**: 2-3 weeks with 2-3 developers (includes prototyping work session)
- **Value Delivered**: Users can set up budget, add bills/incomes, see "leftover" calculation
- **Note**: Prototyping phase (13 tasks) is a team work session to make informed UI choices before implementation

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD principle NON-NEGOTIABLE)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- **CRITICAL**: Build system (Phase 1-3) must be validated with smoke test before any application logic begins
- **CRITICAL**: Type coordination (Phase 2) must work correctly to ensure backend and frontend types stay in sync
- **CRITICAL**: UI Component Prototyping (Phase 3.5) should be done as a team session to make informed widget choices before implementation
- **CRITICAL**: Foundational services (Phase 4) block all user story work and use decisions from prototyping phase
