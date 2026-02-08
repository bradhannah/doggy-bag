# Comprehensive Code Review - February 2026

## Scope

Full-codebase review covering ~180 source files across all layers:

| Layer               | Files Reviewed                                     |
| ------------------- | -------------------------------------------------- |
| Backend Services    | 24 files in `api/src/services/`                    |
| Route Handlers      | 22 files in `api/src/routes/handlers/`             |
| Utilities           | 12 files in `api/src/utils/`                       |
| Types & Models      | 10 files in `api/src/types/` and `api/src/models/` |
| Controllers         | 9 files in `api/src/controllers/`                  |
| Routes & Migrations | 4 files                                            |
| Frontend Stores     | 12 files in `src/stores/`                          |
| Frontend Lib        | 15+ files in `src/lib/`                            |
| Svelte Components   | 72 files in `src/components/`                      |
| Route Pages         | 14 files in `src/routes/`                          |
| Tauri/Rust          | 3 files in `src-tauri/src/`                        |
| Config              | 8 config files                                     |

---

## Summary

| Severity     | Count | Key Themes                                             |
| ------------ | ----- | ------------------------------------------------------ |
| **CRITICAL** | 6     | Data loss risks, security gaps, race conditions        |
| **HIGH**     | 16    | Massive code duplication, N+1 queries, component bloat |
| **MEDIUM**   | 18    | Inconsistent patterns, validation gaps, accessibility  |
| **LOW**      | 12    | Dead code, naming, minor style issues                  |

---

## CRITICAL Findings

### C1. Backup Import Silently Drops All Month Data

- **File:** `api/src/services/backup-service.ts:78-100`
- **Risk:** Data loss on restore
- **Effort:** Low (1-2 hours)
- **Breaking Risk:** None

`importBackup()` restores bills, incomes, payment sources, and categories but **completely ignores `data.months`**. The `BackupFileData` type includes `months: MonthlyData[]` and `exportBackup()` correctly exports months, but import drops them. Users performing backup/restore lose all monthly budget data (instances, expenses, balances, lock status).

**Fix:** Add month file restoration during import, writing each month to `data/months/{month}.json`.

---

### C2. AutoSave Shutdown Discards Pending Writes Instead of Flushing

- **File:** `api/src/services/auto-save.ts:59-62`
- **Risk:** Data loss on app close
- **Effort:** Low (1 hour)
- **Breaking Risk:** None

`shutdown()` logs "flushing pending saves..." then calls `clearQueue()` which cancels all pending timeouts without writing data. Any changes made within the debounce window (500ms) before shutdown are silently lost.

**Fix:** `shutdown()` should synchronously flush all pending saves before clearing the queue.

---

### C3. Race Conditions in All JSON Read-Modify-Write Operations

- **Files:** Every service calling `storage.readJSON()` then `storage.writeJSON()`
- **Key examples:** `bills-service.ts:76-89`, `incomes-service.ts:72-85`, `months-service.ts` (all mutation methods)
- **Risk:** Data loss on concurrent writes
- **Effort:** Medium (4-6 hours)
- **Breaking Risk:** None

Every write follows: read entire JSON -> modify in memory -> write back. No file locking exists. The Bun HTTP server processes requests concurrently via async I/O, so two parallel requests can read the same version, both modify, and the second write silently overwrites the first. While single-user desktop usage reduces probability, the frontend does send parallel requests.

**Fix:** Add a per-file write lock (`Map<string, Promise>` queue) in `StorageServiceImpl` to serialize writes to the same file.

---

### C4. Tauri CSP Disabled (No XSS Protection)

- **File:** `src-tauri/tauri.conf.json` -- `"csp": null`
- **Risk:** Security vulnerability
- **Effort:** Low (1-2 hours)
- **Breaking Risk:** Low (may need to whitelist localhost API)

Content Security Policy is completely disabled in the Tauri webview. Any XSS vector (e.g., via document uploads, user-entered notes rendered as HTML) has unrestricted access to the webview context.

**Fix:** Set a restrictive CSP allowing only `self`, the localhost API origin, and required asset sources.

---

### C5. Overly Broad Tauri Shell and Filesystem Permissions

- **File:** `src-tauri/capabilities/default.json`
- **Risk:** Security vulnerability
- **Effort:** Low (1 hour)
- **Breaking Risk:** None (scoping is additive)

Unscoped `shell:allow-execute` and `shell:allow-spawn` grant the frontend ability to execute **any** command, making the scoped sidecar rules redundant. Filesystem scope of `$HOME/**` allows read/write to the entire home directory.

**Fix:** Remove unscoped shell permissions (keep only scoped sidecar). Restrict fs scope to `$DOCUMENT/DoggyBag/**` and `$APPCONFIG/**`.

---

### C6. Inconsistent ID Generation Creates Incompatible IDs

- **Files:** `api/src/services/bills-service.ts:142-148`, `api/src/services/incomes-service.ts:22-28`
- **Risk:** Data integrity, validation failures
- **Effort:** Low (30 minutes)
- **Breaking Risk:** Low (existing IDs remain valid, only new IDs change format)

Bills generate 24-char pseudo-UUIDs, incomes generate 29-char pseudo-UUIDs, everything else uses `crypto.randomUUID()` (36-char standard UUIDs). The `validateUUID()` utility (`utils/validators.ts:80-88`) rejects both custom formats. `ValidationServiceImpl.validateID()` only checks `id.length < 10`, providing almost no validation.

**Fix:** Replace custom `generateId()` in both files with `crypto.randomUUID()`.

---

## HIGH Findings

### H1. ~3,000+ Lines of Bill/Income Method Duplication (Backend)

- **File:** `api/src/services/months-service.ts` (2,763 lines)
- **Effort:** High (8-12 hours)
- **Breaking Risk:** Medium (requires thorough testing)
- **Value:** High -- halves maintenance burden for core business logic

12+ method pairs are structurally identical, differing only in `bill_instances` vs `income_instances`:

- `updateBillOccurrence` / `updateIncomeOccurrence`
- `closeBillOccurrence` / `closeIncomeOccurrence`
- `reopenBillOccurrence` / `reopenIncomeOccurrence`
- `addBillAdhocOccurrence` / `addIncomeAdhocOccurrence`
- `removeBillOccurrence` / `removeIncomeOccurrence`
- `splitBillOccurrence` / `splitIncomeOccurrence`
- Plus close/reopen instance methods

**Fix:** Create generic methods parameterized by `instanceType: 'bill' | 'income'` that resolve the collection accessor dynamically.

---

### H2. instances.handlers.ts is 2,203 Lines of Duplicate Handler Boilerplate

- **File:** `api/src/routes/handlers/instances.handlers.ts`
- **Effort:** High (6-8 hours)
- **Breaking Risk:** Medium

30+ exported handler functions, almost all duplicated for bill vs income variants. Every handler independently constructs `new Response(JSON.stringify(...), { headers: ..., status: ... })`.

**Fix:** (1) Create a response helper utility. (2) Parameterize bill/income handlers into generic functions. Could reduce this file to ~500 lines.

---

### H3. `checkReadOnly()` Duplicated in 3 Handler Files

- **Files:** `expenses.handlers.ts:13-27`, `instances.handlers.ts:15-29`, `adhoc.handlers.ts:18-32`
- **Effort:** Low (30 minutes)
- **Breaking Risk:** None

Identical function copy-pasted into three files.

**Fix:** Extract to `api/src/routes/handlers/shared.ts`.

---

### H4. N+1 Query Pattern in `getAllMonths()` and Savings Goals

- **Files:** `months-service.ts:358-413`, `savings-goals.handlers.ts:46-87`, `savings-goals.handlers.ts:1002-1215`
- **Effort:** Medium (4-6 hours)
- **Breaking Risk:** Low
- **Value:** High -- directly impacts page load time as months accumulate

`getAllMonths()` loads each month file sequentially. `calculateSavedAmount()` calls `getAllMonths()` then loads each month again. For 24 months of data this means 48+ sequential file reads per savings goal API call.

**Fix:** (1) Use `Promise.all()` for parallel month loading. (2) Cache month data within a request lifecycle. (3) Consider a lightweight summary index file.

---

### H5. Multiple Independent Service Instances Created at Module Scope

- **Files:** Every handler file in `api/src/routes/handlers/`
- **Effort:** Medium (4-6 hours)
- **Breaking Risk:** Low

`MonthsServiceImpl` is instantiated at module scope in 6+ handler files. Each creates its own `BillsServiceImpl`, `IncomesServiceImpl`, etc. in its constructor. Dozens of independent service objects with no shared state.

**Fix:** Implement a simple service container/registry pattern or make services singletons.

---

### H6. `formatCurrency()` Duplicated in 25+ Component Files

- **Files:** Nearly every component in `Dashboard/`, `DetailedView/`, `Insurance/`, `Goals/`, `Projections/`
- **Effort:** Medium (3-4 hours)
- **Breaking Risk:** None
- **Value:** High -- eliminates ~200 lines of duplication, ensures consistent formatting

Two different implementations exist: manual `$` prefix and `Intl.NumberFormat`. Also duplicated: `formatDate()` (7+ files), `parseDollarsToCents()` (6+ files), `formatFileSize()` (2 files).

**Fix:** Export from `src/lib/utils/format.ts` (which already has some of these). Import everywhere instead of redeclaring.

---

### H7. BillsCard / IncomesCard are ~95% Identical

- **Files:** `src/components/Dashboard/BillsCard.svelte`, `src/components/Dashboard/IncomesCard.svelte`
- **Effort:** Medium (3-4 hours)
- **Breaking Risk:** Medium

Same structure, same edit/save/reset/toggleClosed logic, same CSS. Only differ in field names.

**Fix:** Create a generic `ItemCard.svelte` parameterized by type.

---

### H8. BillsListByCategory / IncomesListByCategory are ~95% Identical

- **Files:** `src/components/Setup/BillsListByCategory.svelte` (618 lines), `src/components/Setup/IncomesListByCategory.svelte` (618 lines)
- **Effort:** Medium (3-4 hours)
- **Breaking Risk:** Medium

Nearly identical 618-line files differing only in entity type references.

**Fix:** Create `EntityListByCategory.svelte` parameterized by type.

---

### H9. BillForm / IncomeForm Share ~380 Duplicate Lines

- **Files:** `src/components/Setup/BillForm.svelte` (771 lines), `src/components/Setup/IncomeForm.svelte` (686 lines)
- **Effort:** Medium (4-6 hours)
- **Breaking Risk:** Medium

Identical: `dollarsToCents()`, validation logic, dirty tracking, metadata handling, monthly recurrence UI, and ~60 lines of CSS per file.

**Fix:** Extract shared logic to utilities and shared CSS to a common stylesheet.

---

### H10. Timezone Bug in Date String Generation

- **Files:** `src/lib/utils/format.ts:33` (`getTodayDateString()`), `src/stores/todo-instances.ts:92,285`, `src/stores/detailed-month.ts:222,273`
- **Effort:** Low (1 hour)
- **Breaking Risk:** None
- **Value:** High -- prevents date-off-by-one near midnight

All use `new Date().toISOString().split('T')[0]` which returns the **UTC** date, not the local date. Near midnight in western time zones, this returns tomorrow's date.

**Fix:** Use local date components: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`.

---

### H11. Route Pages are Massive (Need Decomposition)

- **Files:**
  - `src/routes/goals/edit/[id]/+page.svelte` (1,599+ lines)
  - `src/routes/settings/+page.svelte` (1,793+ lines)
  - `src/routes/goals/+page.svelte` (1,529 lines)
  - `src/routes/goals/new/+page.svelte` (1,215 lines)
  - `src/components/Setup/SetupPage.svelte` (1,528 lines)
  - `src/components/Dashboard/Dashboard.svelte` (1,355 lines)
  - `src/components/DetailedView/DetailedMonthView.svelte` (1,022 lines)
  - `src/components/DetailedView/SummarySidebar.svelte` (989 lines)
  - `src/components/DetailedView/OccurrenceRow.svelte` (929 lines)
  - `src/components/Insurance/SubmissionCard.svelte` (872 lines)
- **Effort:** High (20-30 hours total for all)
- **Breaking Risk:** Medium
- **Value:** Medium -- improves maintainability but doesn't fix bugs

These files contain full page implementations with inline modals, heavy business logic, and extensive CSS.

**Fix:** Extract inline modals into separate components, extract business logic into stores/services, extract shared CSS. Prioritize the goals pages which duplicate `formatCurrency()`, `formatDate()`, `calculateDaysUntil()`, and payment schedule calculation logic across 3 files.

---

### H12. Tauri `stop_bun_sidecar` Doesn't Clear Port from State

- **File:** `src-tauri/src/lib.rs` (in `stop_bun_sidecar` command)
- **Effort:** Low (15 minutes)
- **Breaking Risk:** None

`stop_bun_sidecar` clears `pid` but not `port`, leaving a stale port value. `kill_sidecar_sync` correctly clears both. A subsequent `get_bun_port` call after stopping returns the stale port.

**Fix:** Add `*state.port.lock().unwrap() = None;` to `stop_bun_sidecar`.

---

### H13. Missing `.catch()` on Error Response JSON Parsing

- **File:** `src/lib/api/client.ts:82` (post), `src/lib/api/client.ts:97` (put)
- **Effort:** Low (15 minutes)
- **Breaking Risk:** None

If the server returns a non-JSON error response, `await response.json()` throws, masking the real HTTP error. The `putPath()` method at line 114 already handles this correctly with `.catch(() => ({}))`.

**Fix:** Add `.catch(() => ({}))` to `response.json()` calls in `post()` and `put()`.

---

### H14. Duplicate Bill/Income Detailed View Methods in Frontend Store

- **File:** `src/stores/detailed-month.ts`
- **Effort:** Medium (2-3 hours)
- **Breaking Risk:** Low

Method pairs are structurally identical:

- `updateBillClosedStatus` / `updateIncomeClosedStatus` (lines 213-312)
- `updateBillExpectedAmount` / `updateIncomeExpectedAmount` (lines 315-390)
- `removeBillInstance` / `removeIncomeInstance` (lines 393-458)
- `updateOccurrenceNotes` bill/income branches (lines 461-531)

**Fix:** Extract a generic section-updater helper parameterized by section type.

---

### H15. Button/Form CSS Duplicated Across 8+ Insurance Components

- **Files:** `ClaimDetail.svelte`, `ClaimsList.svelte`, `ClaimForm.svelte`, `ExpectedExpenseForm.svelte`, `DocumentUploadModal.svelte`, `DocumentUpload.svelte`, `SubmissionCard.svelte`, `InsuranceClaimsPage.svelte`
- **Effort:** Medium (3-4 hours)
- **Breaking Risk:** Low

`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-sm` styles are copy-pasted nearly identically across 8 files. Form group/input styles similarly duplicated.

**Fix:** Extract shared button and form styles into a common CSS file or Svelte component.

---

### H16. Stale `src/types/api-generated.ts` (Outdated OpenAPI Types)

- **File:** `src/types/api-generated.ts`
- **Effort:** Low (30 minutes)
- **Breaking Risk:** Low (verify nothing imports from it)

Severely outdated -- missing `savings_goal` CategoryType, `PaymentSourceMetadata`, and many fields added since generation. Could cause runtime mismatches if anything imports from it.

**Fix:** Delete if unused, or regenerate from current API spec.

---

## MEDIUM Findings

### M1. Massive Hardcoded Pixel Values Across Components

- **Files:** ~60 of 72 component files
- **Effort:** High (15-20 hours)
- **Breaking Risk:** None (visual-only changes)
- **Value:** Medium -- consistency, maintainability

Almost every component outside of `Todos/` uses hardcoded `px` values instead of CSS variables (`var(--space-1)` through `var(--space-8)`, `var(--radius-sm/md/lg/xl)`). The `Todos/` components are the gold standard, using CSS variables throughout.

**Notable violators (most hardcoded values):**

- All Dashboard sub-cards: `BillsCard`, `IncomesCard`, `PaymentSourcesCard`, `MonthSelector`, `SummaryCards`, `LeftoverCard`
- All Setup forms and views (except Todo\*)
- `ClaimForm.svelte`, `ExpectedExpenseForm.svelte`
- `ItemDetailsDrawer.svelte`, `MakeRegularDrawer.svelte`, `CCBalanceSyncModal.svelte`

**Fix:** Systematic replacement using the existing CSS variable system. Can be done file-by-file opportunistically.

---

### M2. Duplicated Validation Logic (PaymentSources)

- **Files:** `api/src/services/payment-sources-service.ts:193-280`, `api/src/services/validation.ts:213-299`
- **Effort:** Low (1 hour)
- **Breaking Risk:** None

Nearly identical validation rules in two places. If rules change, both must be updated.

**Fix:** Have `PaymentSourcesServiceImpl.validate()` delegate to `ValidationServiceImpl.validatePaymentSource()`.

---

### M3. Business Logic in Handler Layer

- **File:** `api/src/routes/handlers/expenses.handlers.ts:157-171`
- **Effort:** Low (1 hour)
- **Breaking Risk:** None

POST handler constructs `VariableExpense` objects directly with `crypto.randomUUID()` and timestamp logic. Should delegate to a service.

---

### M4. Duplicate Occurrence Date Generation Logic

- **Files:** `api/src/utils/billing-period.ts` vs `api/src/utils/occurrences.ts`
- **Effort:** Medium (2-3 hours)
- **Breaking Risk:** Medium (need to verify all callers)

Two independent implementations of billing period occurrence calculation. `billing-period.ts` also retains legacy functions (`getBiWeeklyInstancesInMonth`, `getWeeklyInstancesInMonth`, `getSemiAnnuallyInstancesInMonth`) for "backward compatibility" that may be dead code.

**Fix:** Consolidate into `occurrences.ts` as single source of truth.

---

### M5. `border-default` in Both Required and Optional Color Keys

- **File:** `src/lib/theme/types.ts:22,43`
- **Effort:** Trivial (5 minutes)
- **Breaking Risk:** None

Creates a duplicate in `ALL_COLOR_KEYS` array and ambiguous TypeScript typing.

**Fix:** Remove from `OPTIONAL_COLOR_KEYS`.

---

### M6. Hex Color Regex Accepts Invalid 5-Digit Values

- **File:** `src/lib/theme/validator.ts:104`
- **Effort:** Trivial (5 minutes)
- **Breaking Risk:** None

Regex accepts `#abcde` (5 hex digits) as valid.

**Fix:** Use `/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/`.

---

### M7. Subscribe-and-Unsubscribe Anti-Pattern

- **Files:** `src/stores/settings.ts:153-154,162-163`, `src/stores/detailed-month.ts:198-209`
- **Effort:** Trivial (10 minutes)
- **Breaking Risk:** None

Uses `store.subscribe(v => current = v)()` pattern instead of `get(store)` from svelte/store.

**Fix:** Import `get` from `svelte/store` and replace.

---

### M8. Hardcoded Hex Colors in Data Layer (HARD RULE Borderline)

- **Files:** `src/stores/bills.ts:209`, `src/stores/incomes.ts:197`, `src/components/Setup/CategoryForm.svelte:20-36`, `src/components/Setup/BillsListByCategory.svelte:77,89`, `src/components/Setup/IncomesListByCategory.svelte:77,89`
- **Effort:** Low (1-2 hours)
- **Breaking Risk:** Low

`#ef4444` used for orphaned category pseudo-objects, `#949494` as fallback category color, `COLOR_PALETTE` with 16 hardcoded hex values. These are data-layer colors (not CSS), but still violate the spirit of the HARD RULE.

**Fix:** Use theme-derived constants or CSS variable resolution.

---

### M9. Settings Page Uses Native `confirm()` Dialog

- **File:** `src/routes/settings/+page.svelte:363`
- **Effort:** Low (30 minutes)
- **Breaking Risk:** None

Uses browser `confirm()` instead of the app's `ConfirmDialog` component.

**Fix:** Replace with `ConfirmDialog` component.

---

### M10. Goals Pages Use Raw `fetch()` Mixed with `apiClient`

- **File:** `src/routes/goals/new/+page.svelte:182-186`
- **Effort:** Low (15 minutes)
- **Breaking Risk:** None

Inconsistently uses `fetch(apiClient.getBaseUrl() + '/...')` instead of `apiClient.post()`.

**Fix:** Use `apiClient.post()` consistently.

---

### M11. Modal Overlays Use Incorrect ARIA Roles

- **Files:** Goals pages, `ViewPaymentsModal.svelte:87`
- **Effort:** Low (1 hour)
- **Breaking Risk:** None

Modal overlays use `role="button" tabindex="0"` which is semantically incorrect. Some components like `DocumentUploadModal.svelte` correctly use `role="presentation"`.

**Fix:** Use `role="presentation"` for overlay backdrops.

---

### M12. Date Validation Accepts Invalid Calendar Dates

- **File:** `api/src/services/validation.ts:403-413`
- **Effort:** Low (30 minutes)
- **Breaking Risk:** None

`new Date('2025-02-30')` produces a valid Date in JS (becomes March 2nd), so dates like Feb 30 pass validation.

**Fix:** After parsing, verify the parsed date components match the input string.

---

### M13. Validation Category Type Mismatch

- **File:** `api/src/services/validation.ts:327` vs `:363-364`
- **Effort:** Trivial (5 minutes)
- **Breaking Risk:** None

`validateCategory()` accepts `'bill' | 'income' | 'variable'` but `validateCategoryType()` also accepts `'savings_goal'`. The type definition includes `savings_goal`.

**Fix:** Add `'savings_goal'` to `validateCategory()`.

---

### M14. Asymmetric Bill vs Income Validation

- **File:** `api/src/services/validation.ts:108` vs `:198`
- **Effort:** Low (15 minutes)
- **Breaking Risk:** None

Income validation validates `payment_source_id` format; bill validation only checks if truthy.

---

### M15. Inconsistent Handler Patterns

- **Files:** `family-members.handlers.ts`, `settings.ts` (direct functions) vs all others (factory pattern)
- **Effort:** Low (1 hour)
- **Breaking Risk:** None

---

### M16. Stale Date Constants in Calendar/Projections Components

- **Files:** `CalendarGrid.svelte:14`, `HistogramChart.svelte:32-33`, `ProjectionsPage.svelte:12-13`
- **Effort:** Low (30 minutes)
- **Breaking Risk:** None

`const today = new Date()` computed once at component creation, never updates. If the app stays open past midnight, "today" indicator becomes stale.

**Fix:** Use a reactive date store or recompute on visibility change.

---

### M17. Mutex Panic on Poison in Tauri Rust Layer

- **File:** `src-tauri/src/lib.rs` (throughout)
- **Effort:** Medium (2-3 hours)
- **Breaking Risk:** Low

All `state.*.lock().unwrap()` calls will panic if a mutex is poisoned (previous holder panicked). While unlikely, a single panic cascades into total app failure.

**Fix:** Replace with poison-recovery pattern: `.lock().unwrap_or_else(|e| e.into_inner())`.

---

### M18. Frontend Types Manually Duplicated from Backend

- **Files:** `src/types/insurance.ts`, `src/types/projections.ts` vs `api/src/types/index.ts`
- **Effort:** Medium (2-3 hours)
- **Breaking Risk:** Medium

These frontend type files manually re-declare types that exist in the backend. They can drift out of sync silently. The project has an ADR (002-type-synchronization) acknowledging this issue.

---

## LOW Findings

### L1. Dead Code: Legacy Route Files

- **Files:** `api/src/routes/bills.routes.ts`, `api/src/routes/incomes.routes.ts`
- **Effort:** Trivial (delete)

Map-based routing files never imported. Also contain bugs (duplicate keys in Map constructor).

---

### L2. Dead Code: Controller Stubs

- **Files:** All 9 files in `api/src/controllers/`
- **Effort:** Trivial (verify tsoa dependency, then delete if possible)

Every method throws `new Error('Not implemented')`. Exist only for OpenAPI spec generation.

---

### L3. Dead Code: Email Validator

- **File:** `api/src/utils/validators.ts:58-66`

`validateEmail()` exists but no entity has email fields.

---

### L4. Dead Code: Unused Reactive Variables

- **Files:** `src/routes/goals/+page.svelte:77` (`_groupedGoals`), `src/components/Insurance/ClaimDetail.svelte:157` (`_totalClaimed`), Setup list components (`_totalBills`, `_totalIncomes`)

---

### L5. Models Layer is Pure Re-exports

- **Files:** All files in `api/src/models/` except `settings.ts`

Every model file is 3-4 lines re-exporting from `types/index.ts`. Adds indirection with no value.

---

### L6. Logger Utility Exists But Is Unused

- **File:** `api/src/utils/logger.ts`

All handlers and services use raw `console.error/log/warn`.

---

### L7. `readFile<T>` and `readJSON<T>` Are Redundant

- **File:** `api/src/services/storage.ts:128-138,192-195`

Both methods do the same thing.

---

### L8. Migration Backup Misses Entity Data

- **File:** `api/src/migrations/backup.ts:48-81`

`createBackup()` copies files from data root and `months/` but not `entities/` where actual entity data lives.

---

### L9. `exportBackup()` Has Misleading `|| []`

- **File:** `api/src/services/backup-service.ts:40-45`

`|| []` applied to Promises (always truthy), not resolved values. Actual null-handling happens later at lines 61-64.

---

### L10. Left-in Debug Console Statements

- **File:** `src/components/Todos/QuickAddTodo.svelte:37-45`

`console.log`/`console.warn` in production code.

---

### L11. Hardcoded `'data/'` Paths in Services

- **Files:** Every service file

Services hardcode `'data/entities/bills.json'` etc. while `StorageServiceImpl.resolvePath()` strips the `data/` prefix. Fragile coupling.

---

### L12. Dev Mode Detection in Tauri Checks Path

- **File:** `src-tauri/src/lib.rs`

Checks for `target/release` in executable path for dev mode detection. Local release builds incorrectly treated as dev mode.

---

## Recommended Fix Priority

### Quick Wins (< 1 hour each, high value)

| #   | Finding                                                      | Time | Value                               |
| --- | ------------------------------------------------------------ | ---- | ----------------------------------- |
| 1   | C6: Replace custom `generateId()` with `crypto.randomUUID()` | 30m  | Prevents future validation failures |
| 2   | H10: Fix timezone bug in `getTodayDateString()`              | 30m  | Prevents date-off-by-one bug        |
| 3   | H12: Clear port in `stop_bun_sidecar`                        | 15m  | Prevents stale port reads           |
| 4   | H13: Add `.catch()` to error response parsing                | 15m  | Prevents masked errors              |
| 5   | H3: Extract `checkReadOnly()` to shared module               | 30m  | Eliminates 3-way duplication        |
| 6   | M5: Remove `border-default` from optional keys               | 5m   | Type correctness                    |
| 7   | M6: Fix hex color regex                                      | 5m   | Validation correctness              |
| 8   | M7: Replace subscribe anti-pattern with `get()`              | 10m  | Prevents potential leak             |
| 9   | M13: Add `savings_goal` to `validateCategory()`              | 5m   | Validation correctness              |
| 10  | L1: Delete dead route files                                  | 5m   | Code hygiene                        |

### High-Impact Refactors (4-12 hours each)

| #   | Finding                                              | Time  | Value                               |
| --- | ---------------------------------------------------- | ----- | ----------------------------------- |
| 1   | C1: Fix backup import to restore month data          | 2h    | **Prevents catastrophic data loss** |
| 2   | C2: Fix AutoSave shutdown to flush before clear      | 1h    | **Prevents data loss**              |
| 3   | C3: Add per-file write locking                       | 4-6h  | Prevents concurrent write data loss |
| 4   | H4: Fix N+1 in `getAllMonths()` with `Promise.all()` | 4h    | Major performance improvement       |
| 5   | H6: Extract `formatCurrency` etc. to shared utils    | 3h    | Eliminates ~200 lines duplication   |
| 6   | H1: Unify bill/income methods in months-service      | 8-12h | Eliminates ~1,000 lines duplication |
| 7   | H2: Refactor instances.handlers.ts                   | 6-8h  | Reduces 2,200 lines to ~500         |

### Longer-Term Improvements

| #   | Finding                              | Time   | Value                              |
| --- | ------------------------------------ | ------ | ---------------------------------- |
| 1   | C4+C5: Tauri security hardening      | 2h     | Security posture                   |
| 2   | H11: Decompose large page components | 20-30h | Maintainability                    |
| 3   | M1: Systematic CSS variable adoption | 15-20h | Consistency (do opportunistically) |
| 4   | H5: Service container/DI pattern     | 4-6h   | Architecture cleanliness           |
| 5   | H15: Extract shared button/form CSS  | 3-4h   | Eliminates CSS duplication         |

---

## Architecture Observations

### Strengths

- Clean separation between Tauri shell, HTTP API backend, and SvelteKit frontend
- Comprehensive type definitions in `api/src/types/index.ts`
- Good test coverage (~681 tests, ~94% backend line coverage)
- Theme system is well-designed with proper CSS variable architecture
- Todo components demonstrate the "right way" to write components (CSS variables, clean structure)

### Structural Debt

- **No service container**: Services are instantiated ad-hoc, creating multiple instances of the same service across handler files
- **Handler bloat**: The handler layer has become the de facto business logic layer in some cases (savings goals, expenses)
- **Bill/Income duality**: The bill vs income code duplication is the single largest source of technical debt, spanning backend services, handlers, frontend stores, and components
- **File-based storage limitations**: No transactions, no locking, no indexing -- adequate for single-user desktop use but fragile under concurrent access

### Positive Patterns Worth Preserving

- The `Todos/` components as the gold standard for CSS variable usage
- The `StorageService` abstraction (just needs locking)
- The backup export format (just needs import to be complete)
- The theme system architecture in `src/lib/theme/`
