# Feature Specification: Miscellaneous Fixes and Improvements

**Feature Branch**: `008-misc-fixes-improvements`  
**Created**: 2026-01-05  
**Status**: Draft  
**Input**: User description: "A collection of improvements and bug fixes - hodgepodge of items"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Fix Due Date Bug for Monthly Bills/Incomes (Priority: P1)

When I create a new month, all my monthly bills and incomes show their due date as the 1st of the month, regardless of the actual `day_of_month` I configured. For example, a bill due on the 15th still shows as due on the 1st. I can manually edit the date and it saves correctly, but it should use my configured day automatically.

**Why this priority**: Critical data integrity bug - incorrect due dates affect the user's ability to track what's due when. This is core functionality.

**Independent Test**: Create a bill with `day_of_month: 15`, generate a new month, verify the occurrence shows `expected_date` as the 15th.

**Acceptance Scenarios**:

1. **Given** a bill with `day_of_month: 15`, **When** a new month is created, **Then** the occurrence shows `expected_date` as the 15th of that month
2. **Given** an income with `day_of_month: 20`, **When** a new month is created, **Then** the occurrence shows `expected_date` as the 20th of that month
3. **Given** a bill with `day_of_month: 31` in February, **When** February is created, **Then** the occurrence shows `expected_date` as the 28th (or 29th in leap year)
4. **Given** the codebase, **When** compiled, **Then** no TypeScript errors from removed `due_day` field

---

### User Story 2 - Hide Paid Bills/Incomes Toggle (Priority: P2)

As a user working through my monthly budget, I want to toggle a button that hides all closed/paid items so I can easily see "what's left to pay." When all items in a category are paid, I want the category to collapse to just its header (which I can click to expand if needed).

**Why this priority**: High-value UX improvement - directly addresses the core use case of tracking remaining obligations.

**Independent Test**: Toggle the hide button, verify closed items disappear and completed categories collapse to headers only.

**Acceptance Scenarios**:

1. **Given** toggle is ON and a bill is closed, **When** viewing the monthly detail, **Then** that bill row is hidden
2. **Given** toggle is ON and all bills in a category are closed, **When** viewing the monthly detail, **Then** the category shows collapsed header only with count (e.g., "3 paid")
3. **Given** a collapsed category header, **When** user clicks it, **Then** the paid items are revealed
4. **Given** toggle state is changed, **When** user refreshes the page, **Then** toggle state persists (localStorage)
5. **Given** toggle is ON, **When** viewing income sections, **Then** closed incomes are also hidden (same behavior as bills)

---

### User Story 3 - Section Headers with Summary Stats (Priority: P2)

As a user viewing my monthly budget, I want to see summary statistics at the top of the Bills section and Income section showing my progress at a glance: how many items are left, how much I've paid/received, and how much remains.

**Why this priority**: Improves visibility into budget progress without scrolling through all items.

**Independent Test**: View the monthly detail page and verify Bills/Income section headers show count, amounts, and progress bar.

**Acceptance Scenarios**:

1. **Given** a month with 12 bills (9 closed), **When** viewing the Bills section header, **Then** it shows "3/12 left"
2. **Given** bills with $2,450 paid and $890 remaining, **When** viewing the Bills section header, **Then** it shows "$2,450 paid" and "$890 to pay"
3. **Given** 75% of bills closed, **When** viewing the Bills section header, **Then** the progress bar shows approximately 75% filled
4. **Given** incomes with amounts received and pending, **When** viewing the Income section header, **Then** it shows equivalent stats with income-appropriate labels ("received", "pending")
5. **Given** a payment is recorded, **When** viewing the section headers, **Then** the stats update to reflect the change

---

### User Story 4 - Dashboard Starting Balance Display (Priority: P2)

As a user viewing the Dashboard, I see Income vs Bills which makes it look like I'm underwater even when I have money in the bank. I want to see my Starting Balance (bank accounts) so the leftover calculation makes sense visually.

**Why this priority**: Prevents user confusion about their financial position - the calculation is correct but the display is misleading.

**Independent Test**: View the Dashboard and verify Starting Balance row appears above Income/Bills progress bars.

**Acceptance Scenarios**:

1. **Given** bank balances totaling $3,000, **When** viewing the Dashboard, **Then** "Starting Balance: $3,000.00" is displayed above Income
2. **Given** Starting Balance + Income - Bills = Leftover, **When** viewing the Dashboard, **Then** a formula hint "(Starting + Income - Bills)" appears below the leftover amount
3. **Given** bank balances are not entered, **When** viewing the Dashboard, **Then** an appropriate message is shown (consistent with Detailed View behavior)

---

### User Story 5 - Savings & Investments Tracking Page (Priority: P3)

As a user, I want to track my savings and investment account balances at the beginning and end of each month on a separate page. These accounts should not affect my budget leftover calculations. I want to see how much my savings/investments grew (or shrank) each month.

**Why this priority**: New feature that extends functionality but isn't core to monthly budgeting.

**Independent Test**: Navigate to Savings page, enter start/end balances, verify change is calculated and accounts don't appear in budget.

**Acceptance Scenarios**:

1. **Given** a payment source marked as Savings, **When** viewing the Savings page, **Then** it appears in the "Savings Accounts" section
2. **Given** a payment source marked as Investment, **When** viewing the Savings page, **Then** it appears in the "Investment Accounts" section
3. **Given** January's End balance is $12,800, **When** viewing February, **Then** the Start balance auto-populates as $12,800
4. **Given** Start is $12,500 and End is $12,800, **When** viewing the account row, **Then** Change shows "+$300.00" in green
5. **Given** a Savings/Investment account, **When** viewing the budget sidebar, **Then** the account does NOT appear
6. **Given** a Savings/Investment account, **When** leftover is calculated, **Then** the account balance is NOT included
7. **Given** creating a payment source, **When** selecting "Savings Account" or "Investment Account", **Then** "exclude from leftover" is auto-enabled and dimmed, "pay off monthly" is dimmed

---

### User Story 6 - Auto/Manual Payment Badge for Bills (Priority: P3)

As a user, I want to indicate whether each bill is automatically withdrawn (autopay) or requires manual payment. This helps me know which bills I need to actively pay versus which are handled automatically.

**Why this priority**: Nice-to-have visual indicator - no behavioral changes, purely informational.

**Independent Test**: Create a bill with Auto/Manual selected, verify badge appears on bill row.

**Acceptance Scenarios**:

1. **Given** creating a new bill, **When** the form is displayed, **Then** "Payment Method" is a required field with Auto/Manual options
2. **Given** a bill with `payment_method: 'auto'`, **When** viewing the bill row, **Then** a green "Auto" badge is displayed
3. **Given** a bill with `payment_method: 'manual'`, **When** viewing the bill row, **Then** an orange/amber "Manual" badge is displayed
4. **Given** attempting to save a bill without payment_method, **When** validation runs, **Then** an error is shown

---

### User Story 7 - Remove Unused Undo Feature (Priority: P3)

As a developer, the undo feature infrastructure exists but is not wired up to any services. To reduce technical debt and simplify the codebase, all undo-related code should be removed.

**Why this priority**: Cleanup task - removes dead code but doesn't affect user functionality.

**Independent Test**: Verify app compiles without undo code and no runtime errors occur.

**Acceptance Scenarios**:

1. **Given** the codebase, **When** undo files are deleted, **Then** no TypeScript compilation errors
2. **Given** the Navigation component, **When** rendered, **Then** no undo button is present
3. **Given** the keyboard shortcut Ctrl+Z, **When** pressed in the app, **Then** no undo action is triggered
4. **Given** the API, **When** calling `/api/undo`, **Then** a 404 is returned

---

### User Story 8 - Improve Bills/Incomes Config Page Styling (Priority: P3)

As a user viewing the Budget Config pages for Bills and Incomes, the category headers look inconsistent with the rest of the app. The collapse arrows suggest collapsing but it's not needed. The "Uncategorized" section shouldn't exist since all items should have a category.

**Why this priority**: UI polish - improves visual consistency but doesn't affect functionality.

**Independent Test**: View Bills/Incomes config pages and verify headers match DetailedMonthView style with no collapse arrows.

**Acceptance Scenarios**:

1. **Given** the Bills config page, **When** viewing category headers, **Then** they have full-width rounded styling matching DetailedMonthView
2. **Given** the Bills config page, **When** viewing category headers, **Then** no collapse arrows are present
3. **Given** the Bills config page, **When** all bills have categories, **Then** no "Uncategorized" section is shown
4. **Given** creating a new bill, **When** leaving category empty, **Then** validation error is shown (category required)
5. **Given** creating a new income, **When** leaving category empty, **Then** validation error is shown (category required)
6. **Given** the category dropdown in bill/income forms, **When** displayed, **Then** there is no empty/blank option

---

### Edge Cases

- What happens when a bill has `day_of_month: 31` in a month with fewer days? (Use last day of month)
- What happens when toggling "hide paid" with no items paid? (Toggle works, nothing changes visually)
- What happens when all categories are fully paid with "hide paid" on? (All collapsed to headers)
- What happens when navigating to Savings page for a month with no prior data? (Start balances are empty/zero)
- What happens when a Savings account is changed to Regular? (Reappears in budget, excluded flag can be toggled)
- What happens to existing bills without `payment_method` after migration? (Require data migration or default value)
- What happens to existing bills/incomes without categories? (Require data migration to assign categories)

## Requirements _(mandatory)_

### Functional Requirements

**Bug Fix - Due Date (#1)**

- **FR-001**: System MUST use `day_of_month` field (not `due_day`) when generating monthly occurrences for bills
- **FR-002**: System MUST use `day_of_month` field (not `due_day`) when generating monthly occurrences for incomes
- **FR-003**: System MUST remove the `due_day` field from Bill and Income type definitions
- **FR-004**: System MUST handle month-end edge cases (e.g., day 31 in February becomes day 28/29)

**Hide Paid Toggle (#2)**

- **FR-005**: System MUST provide a toggle button in the monthly view header to hide/show closed items
- **FR-006**: System MUST hide individual closed bill/income rows when toggle is ON
- **FR-007**: System MUST collapse fully-closed categories to header-only view when toggle is ON
- **FR-008**: System MUST allow clicking collapsed category headers to expand and reveal paid items
- **FR-009**: System MUST persist toggle state in localStorage
- **FR-010**: System MUST apply toggle behavior to both bills and incomes sections

**Section Headers with Stats (#3)**

- **FR-011**: System MUST display a summary stats bar at the top of the Bills section
- **FR-012**: System MUST display a summary stats bar at the top of the Income section
- **FR-013**: Stats MUST include remaining count in "X/Y left" format
- **FR-014**: Stats MUST include amount paid/received
- **FR-015**: Stats MUST include amount remaining to pay/receive
- **FR-016**: Stats MUST include a visual progress bar
- **FR-017**: Stats MUST update in real-time when items are closed or payments recorded

**Dashboard Starting Balance (#4)**

- **FR-018**: Dashboard MUST display "Starting Balance" row showing sum of bank account balances
- **FR-019**: Dashboard MUST display Starting Balance above the Income progress bar
- **FR-020**: Dashboard MUST show formula hint "(Starting + Income - Bills)" below leftover amount

**Savings & Investments Page (#5)**

- **FR-021**: System MUST provide a separate "Savings" page accessible from main navigation
- **FR-022**: System MUST support `is_savings` boolean flag on PaymentSource
- **FR-023**: System MUST support `is_investment` boolean flag on PaymentSource
- **FR-024**: System MUST auto-enable `exclude_from_leftover` when is_savings or is_investment is true
- **FR-025**: System MUST track start-of-month and end-of-month balances for savings/investment accounts
- **FR-026**: System MUST auto-populate start balance from previous month's end balance
- **FR-027**: System MUST allow override of start balance if needed
- **FR-028**: System MUST calculate and display change (end - start) with appropriate color
- **FR-029**: System MUST NOT display savings/investment accounts in budget sidebar
- **FR-030**: System MUST NOT include savings/investment balances in leftover calculation
- **FR-031**: System MUST dim incompatible options (pay_off_monthly) when savings/investment is selected

**Auto/Manual Badge (#6)**

- **FR-032**: Bill entity MUST include `payment_method` field with values 'auto' or 'manual'
- **FR-033**: System MUST require payment_method when creating or editing a bill
- **FR-034**: System MUST display colored badge on bill rows indicating payment method
- **FR-035**: Auto badge MUST be green; Manual badge MUST be orange/amber

**Remove Undo (#7)**

- **FR-036**: System MUST remove undo service file
- **FR-037**: System MUST remove undo API route handlers
- **FR-038**: System MUST remove undo frontend store
- **FR-039**: System MUST remove undo button from navigation
- **FR-040**: System MUST remove undo keyboard shortcut handler

**Config Page Styling (#8)**

- **FR-041**: Category headers MUST span full width with rounded corners matching DetailedMonthView
- **FR-042**: Category headers MUST NOT have collapse arrows or collapse functionality
- **FR-043**: Category headers MUST display color square indicator next to name
- **FR-044**: System MUST NOT display "Uncategorized" section in bills/incomes config
- **FR-045**: System MUST require category_id when creating or editing a bill
- **FR-046**: System MUST require category_id when creating or editing an income

### Key Entities

- **Bill**: Adds required `payment_method: 'auto' | 'manual'`; removes `due_day`; `category_id` becomes required
- **Income**: Removes `due_day`; `category_id` becomes required
- **PaymentSource**: Adds `is_savings?: boolean` and `is_investment?: boolean`
- **MonthlyData**: Adds `savings_balances_start: Record<string, number>` and `savings_balances_end: Record<string, number>`

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Bills with configured due dates display correct dates 100% of the time when months are generated
- **SC-002**: Users can identify remaining obligations within 2 seconds using the hide toggle
- **SC-003**: Users can see budget progress (count, amounts, percentage) without scrolling
- **SC-004**: Dashboard displays complete financial picture including starting balance
- **SC-005**: Users can track savings/investment growth month-over-month on dedicated page
- **SC-006**: Users can identify autopay vs manual bills at a glance via colored badges
- **SC-007**: Codebase has zero dead code related to undo feature
- **SC-008**: Config pages have consistent styling with rest of application
- **SC-009**: All bills and incomes have assigned categories (no orphaned items)
