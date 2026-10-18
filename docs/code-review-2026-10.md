# Budget-centred codebase and UX review — October 2026

## Implementation checkpoint — review changed recurring entries

The follow-up recurring-change review is implemented in the existing **Review budget updates** screen:

- **All / New entries / Changed entries** filters share one selection and financial preview. Expanded details compare previous recurring, current monthly, and latest recurring values. The available-budget impact remains visible beside Apply while details scroll.
- Amounts and due dates are independently selectable per unpaid occurrence. Changes begin unselected; replacing a monthly override requires its explicit **Use latest recurring value** choice.
- **Keep this month as-is** and field-level keep decisions are remembered for the reviewed recurring version. Amount/schedule generations distinguish later changes back to an earlier value while ignoring unrelated metadata edits.
- Recorded occurrences retain their values and history. Partial remainders, frequency changes, and ambiguous legacy date matches are explained and routed to an explicit monthly edit. Reliable legacy matches acquire stable occurrence references for later reviews.
- Shared selection calculations include changes alongside additions when reconciling legacy Savings totals. Apply validates current revisions, locks, choice conflicts, and retry identity before modifying the selected fields.
- Fixed the old repeated UTC-date migration that could undo accepted weekly dates. It now runs once per monthly record and protects tracked/reviewed occurrences.
- Manage offers the review link after editing a recurring item as well as after adding one.

Verification: **`make test` passed 966 backend, 543 frontend, and 9 browser tests**. Svelte reports **0 errors and 0 warnings**, backend TypeScript passes, and ESLint has **0 errors with the same 21 non-blocking warnings**. Formatting and whitespace checks pass. Isolated curl/browser verification covered source changes, explicit monthly-override replacement, persisted amounts/dates, no repeated suggestions after apply, and the 900px review in both themes.

The workflow and conservative handling of partial/ambiguous schedules are documented in [Savings and Budget workflow](savings-budget-workflow.md).

## Implementation checkpoint — goal lifecycle and interface polish

The remaining implementation pass is complete:

- Goal pause, resume, completion, abandonment, and deletion now manage linked schedules and unpaid current/future contributions. Confirmations explain the effect and offer a current-month exception. Paid history, earlier months, locked budgets, explicit exclusions, and monthly overrides are preserved. Resume skips missed dates and does not reactivate independently stopped schedules.
- Budget panels adapt to available width. The summary stacks into a useful grid, header controls no longer overlap, and the existing one-column option remains. Empty categories are distinct from completed categories in Classic and Table views.
- Payment and income actions say **Record payment** and **Record receipt**, with **Edit plan** available separately. Goal completion is purchase-neutral. Extra goal contributions are explicitly distinguished from scheduled entries, and navigation copy consistently uses **Manage**.
- Bank snapshots display per-account update times and distinguish missing values from zero. Partial account edits preserve other balances. Creating a manually tracked card adds only its payment entry, rather than silently synchronising unrelated recurring definitions.
- Goal dialogs, contribution history, details drawers, and nested unsaved-change dialogs share focus containment/restoration and Escape ownership. Input names and focus indicators are improved. Svelte diagnostics are now clean. Cleaning up one warning also exposed and fixed the quick-add Todo's selected-month date bug, with regression coverage.
- Removed the unused reactive declaration triggering the ESLint crash and repaired the obsolete calendar fixtures and `syncWithDefaults` references.

Verification:

| Check                                            | Result                                                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `make test`                                      | **954 backend + 540 frontend + 8 browser tests passed**                                                                                                |
| `bun run check`                                  | **0 errors, 0 warnings**                                                                                                                               |
| `bunx tsc --noEmit -p api/tsconfig.json`         | Passed                                                                                                                                                 |
| `bun run lint`                                   | **0 errors**, 21 non-blocking warnings                                                                                                                 |
| Prettier on changed/new code; `git diff --check` | Passed                                                                                                                                                 |
| Isolated curl/browser proof                      | Pause/resume/complete adjusted plans correctly; 900px Classic/Table views fit in both themes; snapshot text and payment-button contrast exceeded 4.5:1 |

The browser lifecycle regression also verifies partial-payment history, Cancel/Enter focus restoration, 900px/1280px widths, and non-overlapping header controls. The two stateful Savings/Goals browser flows run serially against disposable data so newly created accounts cannot change another test's available-budget assumptions.

The subsequent recurring amount/date review extension is now covered above. Native Tauri packaging and a representative-user usability study were not part of this implementation verification.

## Implementation checkpoint — Savings integration and selective updates

Stages B and C are implemented. See the [Savings and Budget workflow guide](savings-budget-workflow.md) for the user-facing flow and data contract.

- Savings supports monthly recurring plans and month-only contributions/withdrawals with explicit spending and savings accounts.
- Planned and recorded totals come from the actual Budget entries, including existing goal contributions. Budget entries link back to the destination account in Savings.
- Plans created before budget generation are included automatically when applicable. Plans created afterward can be selected in **Review budget updates**, alongside missing income and expenses.
- Reviews show the financial impact, remember exclusions, permit explicit restoration, reject stale previews, and avoid duplicate application.
- Legacy account totals are reconciled against existing and selected linked plans. The same selection calculation runs in the UI and API. A matching unpaid legacy entry can be linked to a recurring plan without adding more money to the budget.
- Generation and review share monthly-instance factories; the two month-creation paths now use the same generator and carry observed Savings closing balances forward consistently.
- Savings has an account-entry breakdown and a narrow-window stacked layout. Manage and goal-schedule creation link to the review flow.

Verification: **942 backend tests, 535 frontend tests, and 7 browser tests passed via `make test`**. The Svelte check has **0 errors and the same 21 existing warnings**. Formatting checks passed. Targeted frontend lint has no errors, with five existing warnings in older touched components. The previously recorded repository-wide lint/backend-type-check blockers remain.

Isolated curl/browser checks confirmed that an old $500 plan containing a $200 goal contribution plus a newly selected $300 plan remains $500, recording the goal updates Savings, retries add no duplicate entries, and the page fits a 900px window. Both light and dark themes were inspected.

Goal lifecycle, Budget layout/interaction improvements, and the extension for changed recurring amounts/dates are covered by the later checkpoints above.

## Implementation checkpoint — correctness milestone

The first implementation milestone addresses F1–F9 and F11–F12 below. The original findings and source-line references describe the review baseline.

Implemented and verified:

- Edited amounts/due dates are submitted and persisted with payment recording in one operation, including partial payments and zero-paid closures.
- Shared confirmation/modal focus handling preserves native button behaviour. Enter on Cancel cancels, focus stays in the active modal, and previous focus is restored when that element is still available.
- Month stores and Savings loads reject stale responses; Savings saves capture their destination month and submitted values.
- Complete API data operations are serialised within the backend process, with fresh request caches and atomic replacement of individual JSON files. Corrupt-file reads fail explicitly and prevent subsequent writes in that operation.
- Version 2 backups include all additional entity JSON files and document bytes from both `documents/` and the uploader's existing `data/documents/` layout. Restore stages the snapshot before replacing directories and rolls back on handled replacement errors. A real insurance upload was exported, restored into a clean directory, and reopened through the document service. Older unversioned backups retain their core-budget merge semantics.
- Budget and projections agree for the reproduced overdue, paid-today, and insurance scenarios.
- Recurring bill/income identity is snapshotted for new monthly instances and backfilled before changing/deleting existing source records. Scheduled goal history retains both amounts and descriptions.
- Locked months reject API mutations, including writes to a locked Savings-copy destination. Insurance values are captured on locking; older locked records capture the best available snapshot on first load.
- Monthly weekday schedules and Savings schedule effective dates are respected during generation.
- Savings distinguishes an observed zero from a cleared/estimated final balance, offers month creation on a structured 404, labels its inputs, and fits the tested 900px desktop window.
- An additional regression discovered during implementation is fixed: cancelling future savings contributions records zero paid, rather than inflating goal progress. Locked budgets are preserved during that cancellation.

Verification after this milestone:

| Check                               | Result                                                                                                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `make test`                         | 930 backend + 530 frontend + 6 browser tests passed                                                                                                                                                   |
| `bun run check`                     | 0 errors; 21 existing warnings                                                                                                                                                                        |
| Prettier checks on changed/new code | Passed                                                                                                                                                                                                |
| ESLint on changed/new frontend code | 0 errors; 1 existing unused-variable warning                                                                                                                                                          |
| Isolated curl/browser reproductions | Payment $75 persisted as $75; all 12 concurrent updates survived; source deletion preserved goal history; locked writes returned 403; projection totals agreed; Cancel preserved destination balances |

The browser suite now launches against disposable data, and the Manage navigation smoke test waits for and exercises the actual `/setup` link.

At this milestone, two repository-wide checks exposed pre-existing blockers: `bun run lint` crashed in the TypeScript ESLint unused-variable rule on `PayCreditCardModal.svelte`; `bunx tsc --noEmit -p api/tsconfig.json` reported eight errors in old calendar fixtures and the two `syncWithDefaults` references in `payment-sources.handlers.ts`. These were resolved in the later interface-polish checkpoint above.

**Subsequent milestones:** the Budget/Savings contribution model (F10), selective Review budget updates (F13), goal lifecycle semantics, and responsive Budget layout are now implemented in the checkpoints above.

## Executive assessment

The most valuable improvement is **a consistent relationship between recurring setup, a monthly budget, and recorded activity**. Savings exposes the inconsistency particularly clearly, but the same issue affects history, scheduling, projections, and updates to existing budgets.

The existing architecture provides useful building blocks: integer-cent amounts, occurrence-based payments, a canonical leftover calculation, a theme system, and explicit monthly records. The recommended work builds on those foundations.

There are also reproducible correctness issues worth addressing before extending the workflow. The highest-priority examples are incorrect recorded payment amounts, incomplete backups, lost concurrent updates, confirmation keyboard behaviour, and inconsistent projections.

### Method and scope

- Traced Budget, Savings, Goals, recurring bills/incomes, monthly generation/sync, projections, storage, backup, and relevant handlers/stores/components.
- Browser walkthroughs of Budget, Savings, Goals, Manage, Calendar, Projections, Todos, Notes, and Settings using synthetic data. Inspected Savings in dark and light themes and at reduced desktop width.
- Executed real backend requests with `curl` against a separately spawned server and temporary data directory. Browser interactions used the same isolation approach.
- Reviewed shared dialogs, date/currency utilities, validation, and test coverage of user journeys.
- Used heuristic evaluation and cognitive walkthroughs for UX recommendations. These identify likely usability problems; they are not claims from a study with representative users.
- Desktop-specific Tauri lifecycle, native file dialogs, and exhaustive insurance/recurrence permutations were not runtime-tested. This is a risk-weighted review, not an assertion that every source file or feature was exhaustively audited.

The working tree already contained changes for pushing Savings balances to the next month. That action was exercised as it existed. Findings about its underlying zero-balance and shared confirmation behaviour refer to pre-existing code; application code was not changed during this review.

### Verification baseline

| Check                                   | Result                            |
| --------------------------------------- | --------------------------------- |
| `make test` — backend                   | 911 passed, 0 failed              |
| `make test` — frontend                  | 521 passed                        |
| `make test` — browser smoke tests       | 4 passed                          |
| `bun run check`                         | 0 errors, 21 warnings in 12 files |
| Targeted backend/browser investigations | Reproductions documented below    |

The passing baseline is valuable, but the targeted checks demonstrate gaps in end-to-end behavioural coverage.

**Priority:** P1 = incorrect financial state, data preservation, or misleading action outcome; P2 = workflow, accessibility, display, or maintainability improvement. **Effort:** S = localised; M = coordinated changes; L = model/migration work. Sizes are relative, not delivery estimates.

## 1. Confirmed correctness findings

### F1 — P1: “Edit & Close” can record a different amount from its button label

**Evidence:** In the browser, opened a $100 occurrence, changed Amount to $75, and clicked **“Close - Paid $75.00”**. The stored closed occurrence still contained `expected_amount: 10000` ($100).

`performClose()` submits the close date, notes, and account but does not submit the edited amount or due date for “Paid in Full”. The label is derived from the edited value. Partial-payment confirmation also calculates from the edited amount while the split endpoint operates on the persisted occurrence, so that path needs the same consistency check.

**Sources:** `src/components/DetailedView/EditCloseModal.svelte:183-211,262-270`; `api/src/services/months-service.ts:1935-1978`.

**Recommendation:** A single validated operation should apply the relevant edits and record the outcome atomically. The displayed payment, submitted payment, and persisted payment must agree. Include income as well as expense cases. **Effort: M.**

### F2 — P1: Backups omit several complete feature domains

**Evidence:** With a goal and note present, `GET /api/backup` returned only `export_date`, `bills`, `incomes`, `payment_sources`, `categories`, and `months`. The goal and note were absent.

The implementation also omits insurance claims/configuration, recurring Todo definitions, and uploaded documents. Monthly records may retain references or some instance data, but those do not reconstruct the missing entities. Manual and version-upgrade backups call the same exporter.

**Sources:** `api/src/services/backup-service.ts:36-74,83-115`; `api/src/services/version-service.ts:254-276,286-313`; `src/routes/settings/+page.svelte:319-333`.

**Recommendation:** Define one versioned backup manifest covering all persisted entity types and attachments, and use it for every backup entry point. Verify restoration into an empty directory. Explicitly define restore-versus-merge semantics: the current importer writes included months but retains destination months absent from the backup. **Effort: M–L.**

### F3 — P1: Write serialisation does not prevent lost read-modify-write updates

**Evidence:** Issued 12 simultaneous Savings updates to distinct map keys. All 12 returned HTTP 200; the persisted record retained only one key. Repeated runs reproduced the loss.

The write queue protects the final filesystem write, but each service reads and modifies its copy before entering that queue. Thus each queued write can successfully overwrite changes from an earlier request.

There is a related error-handling problem: a deliberately malformed fixture `bills.json` was returned as HTTP 200 with `[]`; creating a valid bill then returned 201 and replaced the damaged file with a one-item list. `readFile()` treats all read/parse failures as missing data, and services default missing data to empty collections.

**Sources:** `api/src/services/storage.ts:129-185`; `api/src/services/months-service.ts:981-1017`; `api/src/services/bills-service.ts:32-38,67-90`.

**Recommendation:** Lock the entire read → validate → modify → persist transaction per resource, use atomic file replacement, and distinguish missing files from unreadable/corrupt files. Preserve a corrupt file for recovery rather than treating it as a fresh collection. A database migration is not required to address this.

**Important refinement to the February review:** A per-file final-write queue now exists, but it does not solve the lost-update problem identified there. The transaction boundary must include the read. **Effort: M.**

### F4 — P1: Pressing Enter on “Cancel” confirms the action

**Evidence:** Opened the Savings overwrite confirmation, focused **Cancel**, and pressed Enter. The next month's starting balance changed from $500 to $1,200.

`ConfirmDialog` listens on `document`, prevents the default Enter action, and dispatches confirmation regardless of which control has focus. The component is also used for deletion and other confirmations elsewhere.

**Source:** `src/components/shared/ConfirmDialog.svelte:24-33,42-47,68-79`.

**Recommendation:** Use normal button activation semantics, move focus into the dialog, contain focus, and return focus to the trigger. Confirmation should follow the focused control. **Effort: S.**

### F5 — P1: Projections disagree with Budget for multiple independent reasons

| Synthetic scenario                                                     | Budget leftover | Projection final balance |
| ---------------------------------------------------------------------- | --------------: | -----------------------: |
| $1,000 balance; $100 overdue unpaid bill                               |            $900 |                     $800 |
| $900 current balance already reflecting a $100 payment recorded today  |            $900 |                     $800 |
| $1,000 balance; expected insurance expense $200 and reimbursement $100 |            $900 |                   $1,000 |

The overdue amount is subtracted from the baseline and again as a scheduled event. Actual events dated today are replayed against a current-balance baseline. Insurance entries are moved to separate sections by the detailed-view service, while projections iterate only the regular sections.

**Sources:** `api/src/services/projections-service.ts:99-141,145-185,199-214`; `api/src/services/detailed-view-service.ts:101-123,165-201`.

**Recommendation:** Derive projection events from the same financial inputs and balance contract as Budget. Distinguish historical events displayed on a chart from future cash movements applied to the starting balance. Include insurance explicitly. Assert final projection equals leftover for fixtures with the same month, cash snapshot, and remaining commitments. **Effort: M.**

### F6 — P1: A slow response can display the previous month's data under the new month

**Evidence:** Delayed October's detailed response, navigated to November, and allowed the October response to finish. The URL and header said November while October's Rent and October 1 overdue date appeared in the budget. November's fixture contained no bills.

The detailed store accepts any completed response without checking that it belongs to the latest request. The ordinary month store has the same pattern, and Savings loads also read mutable current-month state across asynchronous steps.

**Sources:** `src/stores/detailed-month.ts:236-254`; `src/stores/months.ts:128-170`; `src/routes/savings/+page.svelte:64-115`.

**Recommendation:** Capture the requested month, use a request generation/token or abort controller, and only publish results for the active request. Apply this to errors and loading states too. **Effort: S–M.**

### F7 — P1: Historical budget identity and goal progress depend on live source bills

**Evidence:** A goal had a $100 closed scheduled contribution. After deleting its source bill, goal progress dropped from $100 to $0. The historical budget occurrence still existed, but displayed **“Unknown Bill”** with no category or payment-source identity.

Generated instances omit several source identity fields. Detailed views recover them from today's source bill; scheduled goal totals also discover the goal association through today's source bills. Deletion severs that relationship. Renaming or recategorising sources can similarly alter historical presentation.

**Sources:** `api/src/services/months-service.ts:479-491`; `api/src/services/detailed-view-service.ts:280-335`; `api/src/routes/handlers/savings-goals.handlers.ts:48-74`; `api/src/services/bills-service.ts:126-130`.

**Recommendation:** Store the identity needed to interpret an occurrence independently: source ID, name, category/account identifiers, goal association, and an appropriate source snapshot. Archive recurring definitions when they have history; preserve recorded contributions independently of source lifecycle. Existing data needs careful backfilling while source records still exist. **Effort: M–L.**

### F8 — P1: Locked months still accept some changes

**Evidence:** With `is_read_only: true`, both a Savings balance update and monthly sync returned HTTP 200. Sync added a bill and kept the month marked read-only.

Instance handlers use a shared read-only check, but the tested monthly handlers do not. Savings also presents editable inputs without a month-lock check. The in-progress push-to-next-month operation needs to honour the destination month's lock as well.

**Sources:** `api/src/routes/handlers/shared.ts:12-25`; `api/src/routes/handlers/months.handlers.ts:194-214,691-738`; `src/routes/savings/+page.svelte:378-424`.

**Recommendation:** Enforce month mutability at the service mutation boundary, within the same transaction as the change. Reflect that state consistently in all month-based screens. Historical dynamically generated insurance data also needs an explicit policy for locked months. **Effort: M.**

### F9 — P2: Recurrence settings and actual generated dates can disagree

**Evidence:** A monthly “second Monday” bill generated October 1, 2026 instead of October 12. A monthly bill configured with a November 1 start date was also added to October with an October 1 occurrence.

The setup forms and validation support `recurrence_week`/`recurrence_day`, but `generateBillOccurrences()` and `generateIncomeOccurrences()` do not pass those fields into generation. Monthly generation uses only day-of-month and ignores start date. Weekly/biweekly dates also treat their start date as an anchor that can be extrapolated backward, so “anchor” and “effective start” need distinct semantics.

**Sources:** `api/src/utils/occurrences.ts:10-36,68-107,118-149`; `api/src/services/validation.ts:76-104`; `src/components/Setup/BillForm.svelte:37-42,219-220`.

**Recommendation:** One recurrence implementation should support every schedule the UI offers. Define effective dates explicitly before using the same generator for “Review budget updates”. **Effort: M.**

## 2. Savings and the Budget workflow

### F10 — P1 product-model gap: An entered Savings contribution is not a budget commitment

**Evidence:** Started with $1,000 available and no bills. Entered a $200 Savings contribution through the real API. Budget still showed $1,000 and zero bill items. The backend stores the contribution in `savings_contributions`; the leftover calculation consumes bill/income instances instead.

There are currently three related but independent concepts:

| Concept                      | Current implementation           | Consequence                                       |
| ---------------------------- | -------------------------------- | ------------------------------------------------- |
| Savings account contribution | Editable monthly per-account map | Does not reserve money in Budget                  |
| Goal contribution schedule   | Recurring Bill with `goal_id`    | Budget inclusion depends on month generation/sync |
| Goal progress                | Sum of closed linked occurrences | Not the account's current balance                 |

These distinctions are not made sufficiently visible in the task flow. This directly conflicts with the requested behaviour: saving money should have a line item in Budget.

**Sources:** `src/routes/savings/+page.svelte:198-226`; `api/src/services/months-service.ts:981-1017`; `api/src/utils/leftover.ts:145-158`; `src/routes/goals/edit/[id]/+page.svelte:359-370`.

**Recommendation:** Represent a planned savings contribution as a linked budget commitment, then derive Savings and optional Goal contribution totals from those same occurrences. Keep planned contributions, recorded contributions, and observed account balances distinct. **Effort: M–L.**

### F11 — P2: Savings cannot represent an actual final balance of zero

**Evidence:** Persisted Start = $1,000, Contribution = $200, Final = $0. The browser showed an empty Final input with a $1,200 placeholder and a $1,200 final total. The in-progress push action consequently propagated $1,200.

`isEndAutoCalculated()` treats `"0"` and `"0.00"` as unknown, substituting Start + Contribution. A genuinely emptied account is indistinguishable from an unentered balance.

**Sources:** `src/routes/savings/+page.svelte:133-141,166-184,419-427,288-289`.

**Recommendation:** Use missing/null for “not entered” and numeric zero for an observed zero. Label estimates explicitly; an estimated value should not silently acquire the meaning “Final”. Separate contributions from market/interest changes when presenting growth. **Effort: S–M.**

### F12 — P2: Savings' new-month empty state is unreachable for the normal 404 response

**Evidence:** Navigated to an uncreated month and opened Savings. It displayed the raw message “Generate it first with POST /api/months/…/generate” and no Create button.

The API client throws a plain Error without an HTTP status. The page checks `error.status === 404` or the case-sensitive phrase `"Not Found"`; the actual backend body says `"not found"`. The intended `MonthNotCreated` component is therefore bypassed.

**Sources:** `src/lib/api/client.ts:67-73`; `src/routes/savings/+page.svelte:116-126,324-329`; `api/src/routes/handlers/months.handlers.ts:77-85`.

**Recommendation:** Use a typed API error retaining status and code; render missing-month, validation, and network-failure states intentionally. **Effort: S.**

### F13 — P2: Creating recurring items after a budget exists has no clear completion path

The backend has missing-item sync and the month store exposes `syncMonth()`, but production UI callers of that store method were not found. The Budget header exposes a different operation: metadata sync. Goal schedule creation promises that the payment will appear in the monthly budget without making the existing-month limitation clear.

The current missing-item sync imports all absent active sources. It also resurrects deliberately deleted instances. New synced instances omit metadata even though the normal generator snapshots it; the curl reproduction confirmed the omission.

**Sources:** `api/src/services/months-service.ts:591-745`; `src/stores/months.ts:174-180`; `src/routes/month/[month]/+page.svelte:20-31`; `src/routes/goals/edit/[id]/+page.svelte:1179-1183`.

**Recommendation:** Implement the proposed selective **Review budget updates** flow described below, backed by explicit source identity and intentional exclusions. **Effort: M after the model prerequisites.**

### F14 — P2 UX mismatch: Goal status and contribution schedule are separate lifecycles

**Evidence:** Paused a goal and generated the next month. Its recurring contribution still appeared. The UI explicitly explains that scheduled payments continue, so this is documented behaviour rather than an accidental handler failure.

Nevertheless, “Pause saving” naturally suggests stopping upcoming saving commitments. Completing a goal only changes its status. “Buy That Thing!” is the prominent completion action even for an emergency fund, and does not itself record a purchase or withdrawal.

**Sources:** `api/src/routes/handlers/savings-goals.handlers.ts:346-360,478-492`; `api/src/services/savings-goals-service.ts:209-225,268-286`; `src/routes/goals/+page.svelte:737-766`.

**Recommendation:** Make the primary actions match their effects: “Record contribution”, “Pause contributions”, and “Complete goal”. Define how pause/completion affect future scheduled occurrences while preserving recorded history. Retain an explicit way to make an exception for the current month. **Effort: M.**

## 3. Display, interaction, and academic UX evaluation

### F15 — P2: Default layouts overflow ordinary desktop windows

**Measured:** At a 1,280px viewport, the default combined/classic Budget produced a 1,896px-wide document. At a 900px viewport, Savings produced a 1,112px-wide document. The off-screen area includes financial content and controls.

The Budget uses two fixed 660px panels plus navigation, summary sidebar, spacing, and padding. Its responsive breakpoint stacks the summary without adapting those panels. Savings uses fixed numeric columns and has no corresponding responsive layout.

**Sources:** `src/components/DetailedView/DetailedMonthView.svelte:919-995,1129-1147`; `src/routes/+layout.svelte:272-297,391-396`; `src/routes/savings/+page.svelte:718-723`.

**Recommendation:** Make layout fit available space automatically: stack panels at the relevant width, permit flex/grid children to shrink, and contain any unavoidable table scrolling locally. Retain optional display preferences for users who want them. Reuse existing design tokens. **Effort: M.**

### F16 — P2: Shared interaction primitives need accessibility corrections

- Keyboard focus escaped the Edit & Close dialog onto a background `+` button. The shared modal has ARIA dialog attributes but no focus containment/restoration or inert background.
- The overwrite confirmation opened with focus on the page body. Its Enter behaviour is the separate P1 finding F4.
- All three Savings inputs in the tested row had no associated labels or accessible names. Visual grid headings are not programmatic input labels.
- Savings' estimated value uses tertiary text on an elevated surface. Calculated contrast is **3.49:1 in dark mode** and **4.39:1 in light mode**, below WCAG's 4.5:1 normal-text minimum. Read-only financial data is not a disabled control exempt from readable text contrast.

**Sources:** `src/components/shared/Modal.svelte:22-50`; `src/components/shared/ConfirmDialog.svelte:24-47`; `src/routes/savings/+page.svelte:378-425,854-856`; `src/lib/theme/defaults.ts:38,134`.

**Recommendation:** Improve the shared modal/confirmation primitive once, reuse it consistently, and label each Savings input with account plus field name. Select theme tokens appropriate to the actual foreground/background pair. **Effort: M.**

### Additional UX findings and principles

| Observation                                                                                                                  | Academic lens                                                        | Smallest useful improvement                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Savings, Goals, and Budget expose related amounts with separate edit paths                                                   | Norman: consistency between users' conceptual model and system image | One contribution record with linked views; explicit planned/recorded/balance labels                                            |
| Users must remember whether the month existed when a recurring item was created                                              | Nielsen: recognition rather than recall; visibility of system status | Reviewable list of applicable updates, with a visible destination month                                                        |
| “Pause saving” retains contributions; “Buy That Thing!” only completes a goal                                                | Norman: mapping and gulfs of execution/evaluation                    | Outcome-based labels and explicit scope of schedule changes                                                                    |
| Bank balances are current snapshots, while recording a payment changes remaining obligations without updating those balances | Visibility of system status; hidden temporal dependencies            | Explain the current-balance contract and show freshness/as-of information; provide a clear balance-refresh/reconciliation step |
| Empty Variable Expenses appears under “Completed” with a strike-through                                                      | Match between system and real-world meaning; informative feedback    | Treat empty, active, and completed categories as different states                                                              |
| Manage, Setup, and Budget Config name the same destination                                                                   | Consistency and information scent                                    | Use one name, with direct links to the relevant tab                                                                            |
| The primary payment path begins with “Edit”, then “Close”                                                                    | Cognitive walkthrough: associating actions with the intended goal    | Make “Record payment” discoverable; use “Record receipt” for income                                                            |
| Several view controls are icon-only and needed to recover usable width                                                       | Recognition rather than recall; progressive disclosure               | Fit the window by default and group optional display controls behind an understandable label                                   |

The empty-category result comes from `isSectionComplete()` considering `items.length === 0` complete (`src/components/DetailedView/DetailedMonthView.svelte:142-145`). It was visible in the browser walkthrough.

These recommendations aim to reduce the concepts and transitions users must manage. A navigation redesign or additional dashboard is not a prerequisite.

## 4. Code-quality improvements with demonstrated payoff

1. **A transactional storage mutation API.** Address F3 centrally, including explicit read errors and atomic replacement. Coordinate multi-resource operations where a contribution affects more than one persisted resource.
2. **One monthly-instance factory.** `generateMonthlyData`, `createMonth`, and `syncMonthlyData` duplicate construction with differing fields. The first copies metadata and generates Todos; `createMonth` carries savings opening balances but omits those fields; sync omits metadata. Reuse a common builder with explicit lifecycle rules (`months-service.ts:460,591,1537`).
3. **A stable source snapshot and contribution association.** Addresses F7 and supplies the baseline necessary to distinguish source changes from monthly overrides in F13.
4. **A shared financial event projection.** Keep canonical leftover and timeline projections aligned, including insurance and savings, rather than reconstructing finances from presentation-specific sections.
5. **Typed request errors and latest-request-wins stores.** Addresses F6/F12 and makes loading/error states consistent. Consolidate duplicated frontend/API DTOs at the boundaries; a declared `goal_id` that a response mapper does not emit illustrates the current drift (`src/stores/detailed-month.ts:45`; `detailed-view-service.ts:302-336`).
6. **Versioned, deliberate migrations.** `getMonthlyData()` currently performs migrations and writes during reads (`months-service.ts:262-374`). Separate schema migration from routine display enrichment so reads have predictable effects and old monthly decisions are not repeatedly reconsidered against current sources.
7. **Journey-level regression coverage.** The four smoke tests do not exercise payment correctness, savings integration, backup completeness, or month switching. The Manage test conditionally skips navigation if the link is not yet visible, and expects `/manage` even though the link goes to `/setup` (`tests/e2e/smoke.spec.ts:27-37`). Wait for readiness and assert the actual outcome.

Large components are present, but line count alone is a weaker reason to refactor than the inconsistencies above. Extract shared rules while correcting them, then split UI components along those established responsibilities.

## 5. Recommended Budget ↔ Savings model

### Concepts the user should need

1. **Recurring plan:** What normally comes in, goes out, or is set aside.
2. **This month's budget:** The plan for a specific month, with intentional exceptions.
3. **Recorded activity:** Payments, receipts, and savings contributions actually recorded.
4. **Account balances:** Observed money in accounts, with a clear effective time.

A savings goal is an optional purpose attached to a savings contribution/account, rather than a second way of entering the same money.

### Proposed example

“Emergency fund — $200/month” creates a budget line under Savings. It reserves $200 of available spending capacity. Recording the contribution updates the linked occurrence, and Savings/Goal views derive the corresponding contributed amount.

An observed account balance remains distinct from contributions: interest, investment movement, opening savings, and withdrawals mean the two are not interchangeable. Transfers should distinguish the funding account from the destination savings account; the current goal schedule writes the destination into `payment_source_id`.

Keep the existing cash-snapshot approach explicit. Turning recorded contributions into bank-balance mutations would require a broader ledger/reconciliation decision and should not happen implicitly during this integration.

### “Review budget updates”

Start with one action on the Budget page:

1. Compare the chosen month with applicable recurring income, expenses, and savings contributions.
2. Show missing items with their origin, amount, applicable date/frequency, and effect on available budget.
3. Let the user select items and apply the selected changes together.
4. Refresh the budget and report exactly what was added.

Use the same action after creating a recurring item: **“Review additions to October's budget.”** This closes the creation-order gap without creating another workflow.

#### Required semantics

- **Stable identity:** Match by source ID/linked contribution identity, not name. A goal-linked bill must not also be imported as an independent account contribution.
- **Idempotence:** Repeating apply cannot create duplicate lines or occurrences.
- **Intentional exclusions:** Distinguish “not yet added” from “excluded from this month”. Honour the exclusion in subsequent reviews.
- **Effective dates:** Only offer occurrences applicable to the selected month; repair F9 first.
- **Monthly overrides:** Preserve them. For a later extension to changed amounts/dates, compare current source, original snapshot, and monthly override to explain the difference.
- **History:** Treat recorded payments and locked months as preserved records. Source lifecycle changes should not reinterpret them.
- **Concurrency:** Apply to the same month/revision that was previewed, or request a refreshed preview if it changed.
- **Financial preview:** Show the net impact using the same calculation contract as the main Budget.

Missing items are a useful first version. Later source edits and retired items can fit the same review surface once their override/history semantics are established.

## 6. Staged implementation plan

### Stage A — Make existing outcomes trustworthy

Prioritise F1–F8: payment persistence, backup completeness, transactional writes, confirmation keyboard behaviour, projection agreement, stale-response handling, historical identity, and month-lock enforcement. Include F11/F12 as small Savings fixes and F9 where schedule correctness affects these flows.

**Acceptance examples:**

- Editing $100 to $75 and recording payment persists $75.
- Enter on Cancel cancels; modal focus stays within the dialog.
- Concurrent independent edits all survive, or a conflict is reported explicitly.
- A backup restored to an empty directory preserves goals, notes, insurance, recurring definitions, monthly history, and attachments.
- Deactivating/deleting a recurring definition preserves paid contribution history.
- Budget and projection agree for overdue, paid-today, insurance, and savings fixtures.
- A delayed October response cannot populate November.

### Stage B — Connect Savings and Budget

Establish linked savings commitments, observed-versus-estimated balance semantics, source/destination accounts, and goal lifecycle behaviour. Migrate existing contributions carefully: detect existing linked goal bills instead of blindly adding account-level totals again.

**Acceptance:** The same $200 is planned once, recorded once, and explained consistently in Budget, Savings, and any linked Goal. Zero balances and exceptions for a specific month remain expressible.

### Stage C — Add selective budget updates

Implement the missing-item preview/apply flow, reuse the common instance factory, preserve exclusions, and add contextual entry points after recurring setup changes.

**Acceptance:** Creating a savings plan before or after a budget produces equivalent results after review; repeated review/apply remains duplicate-free; only selected applicable items are added.

### Stage D — Reduce interface friction

Make layouts responsive to desktop window size, standardise labels, separate empty/completed states, add accessible input names, and correct theme contrast. Adopt outcome-oriented payment/contribution actions and contextual links between Budget, Savings, and Goals.

**Acceptance:** Core workflows fit the supported window sizes, work by keyboard, and communicate both the target month and the effect of each action.

For a short formative usability study, ask representative users to: create a budget then add savings; explain the resulting available amount; change one month's contribution; record a partial payment; pause contributions; and recover an omitted recurring item. Measure unaided completion, wrong-month/duplicate actions, backtracking, and whether users can explain the totals. Compare results before and after; do not infer usability success solely from a cleaner screenshot.

## Reference framework

- Nielsen, J. (1994), _Enhancing the Explanatory Power of Usability Heuristics_, and the [10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).
- Norman, D. A. (2013), _The Design of Everyday Things_, revised edition: conceptual models, mapping, feedback, and gulfs of execution/evaluation.
- Wharton, C., Rieman, J., Lewis, C., and Polson, P. (1994), _The Cognitive Walkthrough Method: A Practitioner's Guide_: action discoverability and recognising progress in a task.
- W3C, [WCAG 2.2](https://www.w3.org/TR/WCAG22/), particularly contrast, labels/instructions, focus order, and name/role/value; [ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) for focus management.

## Local investigation artifacts

Temporary harnesses and synthetic evidence were kept outside the repository under `/var/folders/f9/jdg1pkq104q0ccw3mr2fzrm40000gn/T/opencode/`:

- `doggy-review.ts`: backend/curl scenarios; final results in `doggy-review-jLcOX2/results.json`.
- `doggy-browser-review.ts`: edited-payment, zero-balance, confirmation, narrow-window, and missing-month scenarios; results/screenshots in `doggy-review-nAP78F/`.
- `doggy-ui-followup.ts`: screen walkthroughs, focus escape, and delayed-month reproduction; results/screenshots in `doggy-review-VANdZg/`.
- `stage-d-proof.ts`: isolated curl goal transitions and browser layout/contrast checks; final screenshots in `stage-d-proof-5styBK/`.
- `recurring-review-proof.ts`: curl preview and browser application of amount/date changes and a monthly override; final screenshots in `recurring-review-64k4wi/`.

These artifacts are temporary session evidence. The scenarios, inputs, outputs, and source references needed to turn the findings into permanent regression tests are documented above.
