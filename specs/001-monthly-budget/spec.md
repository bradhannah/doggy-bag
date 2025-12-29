# Feature Specification: Monthly Budget Tracker

**Feature Branch**: `001-monthly-budget`
**Created**: 2025-12-29
**Status**: Draft
**Input**: User description: "Build a basic budgetting application. It will focus primarily on monthly bills. Variable costs like groceries and clothing will be secondary. We imagine that fixed monthly costs ultimately tell us how much we have left to spend month to month. It will also track long term savings - but in a super simple way - each account is line item. The super power of the app is being able to add up all expenses, all incomes and then take into account your actual bank balance to show you "how much do I have left over at the end of the month?" It is broken out month by month"

## User Scenarios & Testing *(mandatory)*

### User Story 0 - First-Time Setup (Priority: P1)

User needs a simple setup page to add their initial bills, income sources, and payment sources to get started quickly. The Setup page provides an interface to add known entities of each type (bills, income, payment sources) with a basic list view. After onboarding, users can continue using the same Setup page to edit entities.

**Why this priority**: Without a simple onboarding flow, new users won't know where to start or how to configure the app for their needs. Setup page provides structure for initial configuration while remaining usable for ongoing entity management.

**Independent Test**: Can be fully tested by running the Setup page and adding one bill, one income source, and one payment source. Delivers immediate value by getting user started with a functional budget in under 5 minutes.

**Acceptance Scenarios**:

1. **Given** user has launched the app for the first time, **When** user opens Setup page, **Then** user sees tabs or sections for Bills, Income Sources, and Payment Sources
2. **Given** user is on Setup Bills tab, **When** user adds a bill "Rent" with amount "$1,500", billing period "Monthly", and payment source "Scotia Checking", **Then** bill appears in bills list
3. **Given** user has added 3 bills on Setup page, **When** user clicks "Done" or navigates away, **Then** all 3 bills are saved and user returns to main budget view
4. **Given** user has completed initial setup and wants to edit later, **When** user opens Setup page again, **Then** user sees basic list view of all bills/income/payment sources they added, not a guided wizard

---

### User Story 1 - Set Up Monthly Bills (Priority: P1)

User needs to add and manage fixed recurring expenses like rent, utilities, and subscriptions. User can add bills, set their amounts, billing periods, and payment sources, and see their total monthly cost.

**Why this priority**: Fixed costs are foundation of the budget; without knowing these, users cannot determine how much money they have available for variable spending or savings. This is the primary focus mentioned in the requirements.

**Independent Test**: Can be fully tested by adding multiple bills with different billing periods and verifying total fixed cost calculation displays correctly. Delivers immediate value by showing users their baseline monthly commitment.

**Acceptance Scenarios**:

1. **Given** user has no bills set up, **When** user adds a monthly bill with name "Rent", amount "$1,500", billing period "Monthly", and payment source "Scotia Checking", **Then** bill appears in bill list with correct amount
2. **Given** user adds a bi-weekly bill "Car Insurance" with amount "$200" and payment source "Visa", **When** user views monthly summary, **Then** total fixed costs display as "$400/month" (2 instances for bi-weekly)
3. **Given** user has a weekly bill "Groceries Delivery" at "$80" and payment source "Scotia Checking", **When** user views monthly summary, **Then** total fixed costs display as "~$347/month" (4.33 instances for weekly)
4. **Given** user has multiple bills, **When** user deletes one bill, **Then** total fixed costs decrease by that bill's monthly contribution

---

### User Story 2 - Track Monthly Income (Priority: P1)

User needs to add and manage income sources like salary, freelance work, or other recurring income. User can add income sources, set their amounts, billing periods, and payment sources, and see their total monthly income.

**Why this priority**: Income is the other half of the equation; users must know what money is coming in to determine if their budget is sustainable. Combined with bills, this provides the foundation for financial planning.

**Independent Test**: Can be fully tested by adding income sources with different billing periods and verifying total income calculation displays correctly. Delivers immediate value by showing users their total monthly earnings.

**Acceptance Scenarios**:

1. **Given** user has no income set up, **When** user adds a monthly income source "Salary" with amount "$4,000", billing period "Monthly", and payment source "Scotia Checking", **Then** income source appears in list with correct amount
2. **Given** user has added 2 income sources totaling $5,000 (1 monthly at $4,000, 1 bi-weekly at $1,000), **When** user views monthly summary, **Then** total income displays as "$5,000/month"
3. **Given** user has a bi-weekly income source "Freelance" at "$500", **When** user updates amount to "$600", **Then** total monthly income increases by $200 (2 instances × $100 increase)
4. **Given** user has a monthly bill total of $2,000 and income of $5,000, **When** user views summary, **Then** net income (income minus bills) displays as "$3,000"

---

### User Story 3 - Calculate Monthly Surplus With Bank Balance (Priority: P1)

User needs to enter their actual bank balances to see how much money they will have left at the end of the month. The app calculates the surplus by combining income, expenses, and current bank balances.

**Why this priority**: This is the "super power" mentioned in the requirements - the core value proposition that differentiates this from a simple spreadsheet. Users need to know if they're on track or need to adjust spending.

**Independent Test**: Can be fully tested by entering bank balances for multiple payment sources and verifying the "leftover" calculation is accurate. Delivers immediate value by providing the key insight users care about most.

**Acceptance Scenarios**:

1. **Given** user has $5,000 income, $2,000 in bills, $3,000 bank balance in "Scotia Checking", and $500 in "Cash", **When** user views monthly summary, **Then** "leftover at end of month" displays as "$6,500" (sum of all bank balances + income - bills)
2. **Given** user has $3,000 income, $4,000 in bills, $2,000 bank balance in "Scotia Checking", and owes $1,500 on "Visa", **When** user views summary, **Then** "leftover" displays as "-$500" with indication this is negative/deficit
3. **Given** user changes bank balance in "Scotia Checking" from $3,000 to $2,000, **When** user views summary, **Then** "leftover" decreases by $1,000
4. **Given** user has no bills or income and enters $5,000 total bank balance across all sources, **When** user views summary, **Then** "leftover" displays as "$5,000"

---

### User Story 4 - Track Variable Expenses (Priority: P2)

User needs to add and track variable costs like groceries, clothing, and other discretionary spending that vary month to month. These are secondary to fixed bills but still important for accurate budgeting.

**Why this priority**: Variable expenses give users a more realistic view of spending, but they're secondary to fixed costs as per the requirements. Completes the picture once the core functionality is working.

**Independent Test**: Can be fully tested by adding variable expenses and verifying they're included in the "leftover" calculation. Delivers value by helping users understand their true monthly spending.

**Acceptance Scenarios**:

1. **Given** user has set up bills and income, **When** user adds variable expense "Groceries" with amount "$600" and payment source "Visa", **Then** expense appears in list and is subtracted from the "leftover" calculation
2. **Given** user has variable expenses totaling $1,000, **When** user views monthly summary, **Then** total variable costs display separately from fixed costs
3. **Given** user has added variable expenses this month, **When** user views next month, **Then** variable expenses do not carry over (reset monthly)
4. **Given** user wants to adjust variable expenses mid-month, **When** user edits a variable expense amount, **Then** "leftover" calculation updates immediately

---

### User Story 5 - Manage Payment Sources (Priority: P2)

User needs to set up and manage multiple payment sources (bank accounts, credit cards, cash) so they can track which account each bill or expense is paid from. This provides visibility into where money is actually flowing and calculates total cash/net worth.

**Why this priority**: Multiple payment sources are essential for accurate budgeting (as seen in the Excel example with Visa, Scotia, Chantale accounts). Users need to know which account is being debited for each expense and want to see their total cash across all sources.

**Independent Test**: Can be fully tested by adding payment sources and assigning them to bills/expenses. Delivers value by showing users exactly where their money is going and their total cash position.

**Acceptance Scenarios**:

1. **Given** user has no payment sources set up, **When** user adds "Scotia Checking" as a payment source, **Then** source appears in payment source list
2. **Given** user has 3 payment sources configured (Scotia Checking, Visa, Cash), **When** user adds a monthly bill "Rent", **Then** user can select which payment source it comes from
3. **Given** user has assigned bills to different sources, **When** user views monthly summary, **Then** expenses show grouped by payment source
4. **Given** user has balances across sources: $2,000 in Scotia, owes $1,500 on Visa, and $500 in Cash, **When** user views summary, **Then** total cash/net worth displays as "$1,000" (2,000 - 1,500 + 500)

---

### User Story 6 - Generate Month With Flexible Editing (Priority: P2)

User needs to generate a new month from their defined bills and income sources, then be able to freely edit individual instances without breaking the original definitions. The app should provide flexibility as a core principle.

**Why this priority**: Flexibility is a core tenet - users should be able to generate a starting point from their recurring data but then make month-specific adjustments without tightly coupling back to the original definitions.

**Independent Test**: Can be fully tested by generating a month, editing individual bills/instances, and verifying the original definitions remain unchanged. Delivers value by providing structure while maintaining flexibility.

**Acceptance Scenarios**:

1. **Given** user has 5 monthly bills defined, **When** user generates February, **Then** all 5 bills appear in February with default amounts based on their billing periods
2. **Given** user generated February with $1,500 Rent (monthly), **When** user edits Rent to $1,550 for February only, **Then** default Rent remains $1,500 but February shows $1,550
3. **Given** user has edited multiple values for January, **When** user generates February, **Then** February uses default values (not January's edits)
4. **Given** user wants to see which items differ from defaults, **When** user views month details, **Then** edited items are clearly indicated vs default values
5. **Given** user has generated multiple months, **When** user edits a default bill definition, **Then** future months can optionally adopt the new definition

---

### User Story 7 - View Month-by-Month Breakdown (Priority: P2)

User needs to view their budget data broken out by month to understand their financial situation. The month view provides context for their "leftover" calculation without complex comparisons or trend analysis.

**Why this priority**: Month-by-month view is explicitly mentioned in the requirements and provides critical context for understanding their financial position over time. P2 because it builds on the core data entry stories.

**Independent Test**: Can be fully tested by entering data for multiple months and verifying each month displays correctly. Delivers value by enabling users to see their financial situation month by month.

**Acceptance Scenarios**:

1. **Given** user has budget data for January and February, **When** user views month selector, **Then** both months are available to select
2. **Given** user is viewing January data, **When** user selects February, **Then** summary displays February's bills, income, and "leftover" independently
3. **Given** user has entered bills for January, **When** user navigates to February, **Then** January's bills do not appear (month isolation)
4. **Given** user is viewing current month, **When** user navigates to a future month, **Then** future month is generated from defaults (not blank slate)

---

### User Story 8 - Manage Bill Categories (Priority: P2)

User needs to organize their bills into categories (e.g., Home, Debt, Streaming) for better organization and tracking. The app should provide out-of-the-box categories to get users started, but allow them to add custom categories as needed.

**Why this priority**: Categories make bills easier to organize and understand. Providing out-of-the-box categories reduces setup friction while still allowing customization.

**Independent Test**: Can be fully tested by selecting a pre-defined category for a bill and verifying it appears correctly. Delivers value by helping users organize their expenses without creating categories from scratch.

**Acceptance Scenarios**:

1. **Given** user is adding a new bill "Rent", **When** user views category dropdown, **Then** user sees pre-defined categories: Home, Debt, Streaming, Utilities, Transportation, Entertainment, Insurance, Subscriptions
2. **Given** user selects "Home" category for "Rent", **When** user saves the bill, **Then** "Rent" is associated with "Home" category
3. **Given** user wants to add a category not in the list, **When** user enters "Pet Expenses" as a custom category, **Then** this category is saved and available for future bills
4. **Given** user has bills in multiple categories, **When** user views the bills list, **Then** bills are optionally grouped or filterable by category

---

### User Story 9 - Undo Changes (Priority: P2)

User needs the ability to undo their recent changes to recover from mistakes without fear of breaking data. The app should maintain a history of the previous 5 changes so users can easily revert.

**Why this priority**: Undo functionality provides safety and reduces anxiety about making mistakes. Users should feel comfortable making changes knowing they can easily reverse them.

**Independent Test**: Can be fully tested by making changes and then using undo to revert them. Delivers value by giving users confidence to make changes.

**Acceptance Scenarios**:

1. **Given** user has not made any changes yet, **When** user views undo button, **Then** undo is disabled (nothing to undo)
2. **Given** user edits a bill amount from "$1,500" to "$1,600", **When** user clicks undo, **Then** bill amount reverts to "$1,500" and undo stack shows 1 change remaining
3. **Given** user makes 3 sequential changes, **When** user clicks undo 2 times, **Then** the first 2 changes are reverted (undo stack decreases from 3 to 1)
4. **Given** user makes 6 changes, **When** user views undo history, **Then** only the most recent 5 changes are available to undo (older changes are discarded)

---

### User Story 10 - Restore Data Line-by-Line (Priority: P3)

User needs to restore their data from a backup file that they've saved to a cloud drive (e.g., Google Drive, iCloud, Dropbox). The restore should allow line-by-line restoration so users can pick and choose which entities to restore rather than overwriting everything.

**Why this priority**: Users are responsible for their own backups (app does not sync to cloud), but they need a way to restore data if something goes wrong. Line-by-line restore provides flexibility and control.

**Independent Test**: Can be fully tested by creating a backup, deleting a bill, and then restoring just that bill from the backup. Delivers value by allowing targeted data recovery without full data replacement.

**Acceptance Scenarios**:

1. **Given** user has a backup file saved to their cloud drive, **When** user selects "Restore" and uploads the file, **Then** user sees a list of all entities in the backup (bills, income, payment sources)
2. **Given** user deleted a bill "Rent" by mistake and has a backup, **When** user selects "Rent" from the restore list, **Then** only the "Rent" bill is restored (not all data)
3. **Given** user wants to restore multiple items, **When** user selects 5 items from the restore list and confirms, **Then** all 5 selected items are restored without affecting other data
4. **Given** user has made changes since the backup, **When** user tries to restore an entity that was changed, **Then** system warns about overwriting and asks for confirmation

---

### User Story 11 - Track Free-Flowing Expenses (Priority: P2)

User needs to track ad-hoc, unexpected expenses like birthday presents, car repairs, or medical bills that don't fit into regular monthly bills or variable expenses. These "free-flowing" expenses capture one-off costs that arise unexpectedly.

**Why this priority**: Life is unpredictable - users need a way to quickly log unexpected expenses without creating formal bills or categories. Free-flowing expenses provide flexibility for real-world spending.

**Independent Test**: Can be fully tested by adding an ad-hoc expense and verifying it appears in the current month's expense list and is subtracted from "leftover". Delivers value by handling the unexpected without complexity.

**Acceptance Scenarios**:

1. **Given** user wants to log a birthday present expense, **When** user clicks "Add Free-Flowing Expense" and enters "Birthday Gift" with amount "$100" and payment source "Visa", **Then** expense appears in current month
2. **Given** user has a car repair costing "$800", **When** user adds it as a free-flowing expense, **Then** it's subtracted from the month's "leftover" immediately
3. **Given** user has multiple free-flowing expenses this month, **When** user views monthly summary, **Then** free-flowing expenses are grouped or visible separately from regular variable expenses
4. **Given** user navigates to the next month, **When** user views that month, **Then** free-flowing expenses do not carry over (reset monthly, like variable expenses)

---

### Edge Cases

**Month Navigation and Switching**:
- What happens when user switches months without saving current changes? (Auto-save should prevent data loss)
- What happens when user navigates to a month that doesn't exist yet? (Generate from defaults vs blank slate)
- What happens when user tries to navigate to a future month beyond reasonable range? (Limit or allow)
- What happens when user has no data for a selected month? (Generate from defaults)

**Data Entry and Validation**:
- What happens when user has more expenses than income, resulting in negative "leftover" amount? (Display clearly as negative/deficit)
- How does system handle when user adds a bill with $0 or negative amount? (Prevent entry)
- How does system handle when user enters bank balance with commas, currency symbols, or decimals? (Parse correctly)
- What happens when user tries to add a bill or income with no name? (Prevent entry)
- How does system handle when user enters a very large number (millions, billions) for bank balance? (Accept but format appropriately)
- How does system handle when user tries to delete the last bill or income source? (Show empty state)

**Billing Period Complexity**:
- What happens when user has bills with different billing periods (monthly vs bi-weekly) - how does month generation handle this? (Bi-weekly = ~2.17 instances, weekly = ~4.33 instances per month)
- What happens when a bi-weekly bill falls on the 29th of the month? (Calculate instance count for that specific month)
- What happens when user adds a semi-annually bill? (Generate 0 or 1 instance based on month)

**Payment Source Management**:
- What happens when user deletes a payment source that still has bills/expenses assigned to it? (Prevent deletion or require reassignment)
- How does system handle when user has no payment sources defined but tries to add a bill? (Require payment source first)
- What happens when user owes money on credit card (negative balance)? (Subtract from total cash calculation)
- What happens when user has payment sources with different currencies? (Display in selected currency, no conversion)

**Month Editing and Coupling**:
- What happens when user edits a bill instance for a specific month? (Does not affect default definition)
- What happens when user edits a default bill definition? (Future months can optionally adopt, but current month remains unchanged)
- How does system handle when user generates a month, edits values, then edits the default? (Clear indication of which months are affected)

**Backup and Restore**:
- What happens when user tries to restore from a corrupted or incompatible backup file? (Show error, prevent data loss)
- What happens when user restores an entity with the same name as existing? (Warn about conflict, offer overwrite or skip)
- What happens when user restores data from an older backup that doesn't have current entities? (Merge or warn about missing data)

**Undo Functionality**:
- What happens when user makes a change, makes another change, then undoes the first change? (Undo stack is sequential, not selective)
- What happens when user closes and reopens the app? (Undo stack may persist or reset - clarify)
- What happens when user undoes a change, then makes new changes, then tries to redo? (Redo not in scope)

**Empty and Edge States**:
- What happens when user has both positive and negative "leftover" across different months? (Display each month independently)
- What happens when user's "leftover" is exactly $0? (Display as neutral/balanced)
- What happens when a bill category has no bills assigned? (Hide from list or show as empty)

---

## Requirements *(mandatory)*

### Functional Requirements

**Bills and Income**:
- **FR-001**: System MUST allow users to add, edit, and delete monthly bills with name, amount, billing period (monthly, bi-weekly, weekly, semi-annually), and payment source
- **FR-002**: System MUST allow users to add, edit, and delete income sources with name, amount, billing period (monthly, bi-weekly, weekly, semi-annually), and payment source
- **FR-003**: System MUST allow users to assign bill categories (from pre-defined or custom) to bills
- **FR-004**: System MUST calculate monthly contribution for bills/income based on billing period:
  - Monthly: 1 instance
  - Bi-weekly: ~2.17 instances (every 2 weeks on a given day of the week)
  - Weekly: ~4.33 instances (every 7 days)
  - Semi-annually: 1 or 2 instances depending on month

**Bank Balances and "Leftover" Calculation**:
- **FR-005**: System MUST allow users to enter and update their bank balance for each payment source
- **FR-006**: System MUST calculate and display "leftover at end of month" using formula: (sum of all bank balances + cash - credit card debt) + total income - total expenses (bills + variable costs + free-flowing expenses)
- **FR-007**: System MUST display the "leftover" calculation clearly and simply as "how much money do I have left?" without complex summaries

**Variable and Free-Flowing Expenses**:
- **FR-008**: System MUST allow users to add, edit, and delete variable expenses with name, amount, payment source, and month association
- **FR-009**: System MUST allow users to add, edit, and delete free-flowing expenses with name, amount, payment source, and month association
- **FR-010**: System MUST display fixed costs (monthly bills) separately from variable costs and free-flowing expenses

**Payment Sources**:
- **FR-011**: System MUST allow users to add, edit, and delete payment sources (bank accounts, credit cards, cash)
- **FR-012**: System MUST allow users to assign bills, income, and expenses to specific payment sources
- **FR-013**: System MUST support credit card debt (negative balance) in total cash calculation
- **FR-014**: System MUST prevent deletion of payment sources that still have bills/expenses assigned

**Month Generation and Editing**:
- **FR-015**: System MUST allow users to view budget data broken out by month
- **FR-016**: System MUST generate a new month by copying default bills and income sources from definitions and adhering to billing periods (fill in what's known for that month)
- **FR-017**: System MUST allow users to edit individual bill/income instances for a specific month without changing the default definitions
- **FR-018**: System MUST clearly indicate which values are defaults vs month-specific edits
- **FR-019**: System MUST isolate data by month (data from one month does not affect other months)

**Setup and Onboarding**:
- **FR-020**: System MUST provide a Setup page for first-time onboarding with tabs or sections for Bills, Income Sources, and Payment Sources
- **FR-021**: System MUST allow the same Setup page to be used for ongoing entity management (basic list view, not wizard after onboarding)

**Summary and Display**:
- **FR-022**: System MUST display monthly bills, income, variable costs, free-flowing expenses, and "leftover" in a simple summary view
- **FR-023**: System MUST display bills/expenses grouped by payment source in the summary view
- **FR-024**: System MUST display total fixed costs (sum of all bills' monthly contributions)
- **FR-025**: System MUST display total income (sum of all income sources' monthly contributions)
- **FR-026**: System MUST display total variable costs (sum of all variable expenses)
- **FR-027**: System MUST indicate when "leftover" amount is negative (deficit) vs positive (surplus)

**Validation and Constraints**:
- **FR-028**: System MUST prevent users from adding bills, income, or expenses with blank names
- **FR-029**: System MUST prevent users from entering negative amounts for bills, income, or bank balances (except credit card debt which is negative)
- **FR-030**: System MUST permit users to enter values in the primary interface without opening modal dialogs

**Month Navigation**:
- **FR-031**: System MUST display month navigation with a year selector (top left) and month selector (side-by-side)
- **FR-032**: System MUST use native pickers for year and month selection if available on the platform

**Undo Functionality**:
- **FR-033**: System MUST maintain a history of the previous 5 changes for undo functionality
- **FR-034**: System MUST allow users to undo the most recent change (LIFO - last in, first out)
- **FR-035**: System MUST indicate when undo is disabled (no changes to undo) or enabled (changes available)

**Backup and Restore**:
- **FR-036**: System MUST allow users to export their budget data to a file for manual backup
- **FR-037**: System MUST allow users to import a backup file and restore data line-by-line (select individual entities to restore)
- **FR-038**: System MUST warn user before overwriting existing data during restore
- **FR-039**: System MUST prevent restoration from corrupted or incompatible files

**Persistence and Auto-Save**:
- **FR-040**: System MUST persist all data locally so it's available between sessions
- **FR-041**: System MUST auto-save changes immediately as user makes them
- **FR-042**: System MUST calculate values in real-time as user makes changes
- **FR-043**: System MUST make it clear which values are calculated and which are to be filled in

**Categories**:
- **FR-044**: System MUST provide pre-defined bill categories: Home, Debt, Streaming, Utilities, Transportation, Entertainment, Insurance, Subscriptions
- **FR-045**: System MUST allow users to add custom bill categories
- **FR-046**: System MUST allow users to filter or group bills by category

---

### Key Entities

- **Bill**: Represents a fixed recurring expense with name, amount, billing period (monthly, bi-weekly, weekly, semi-annually), assigned payment source, and optional category. Has a default amount that serves as a starting point when generating months, but individual instances can be edited freely with medium coupling (changes don't automatically update the default definition). Billing periods determine how many times the bill appears in a month: monthly = 1, bi-weekly = ~2.17, weekly = ~4.33, semi-annually = 0-2.

- **Bill Category**: Represents a classification for organizing bills. Pre-defined categories include: Home, Debt, Streaming, Utilities, Transportation, Entertainment, Insurance, Subscriptions. Users can add custom categories as needed.

- **Income Source**: Represents recurring income with name, amount, billing period (monthly, bi-weekly, weekly, semi-annually), assigned payment source, and optional category. Has a default amount that serves as a starting point when generating months, but individual instances can be edited freely with medium coupling.

- **Variable Expense**: Represents discretionary spending that varies by month with name, amount, payment source, and month association. These do NOT repeat across months - must be re-entered each month.

- **Free-Flowing Expense**: Represents ad-hoc, one-time expenses that don't fit into regular bills or planned variable expenses (e.g., birthday presents, car repairs, medical bills). These are tracked for the current month only and do not repeat.

- **Payment Source**: Represents a bank account, credit card, or cash source from which expenses are paid or income is received. Multiple sources are supported (e.g., Scotia Checking, Visa, Chantale, Cash). Bank accounts and cash have positive balances (cash on hand), credit cards typically have negative balances (debt owed). Total cash/net worth = sum of bank balances + cash - credit card debt.

- **Bank Balance**: Represents the user's current balance for a specific payment source. This is entered as needed for a given day when updating the budget and used in calculating the "leftover" amount. Each payment source has its own balance.

- **Month**: Represents a specific month and year (e.g., January 2025). Month is initially generated by copying default bills and income sources from their definitions and adhering to billing periods (fill in what's known), but then exists as a flexible snapshot. Users can edit any value in a month without tightly coupling back to defaults. Default definitions remain separate and can be used as templates for future months.

- **Undo Stack**: Represents the history of the most recent 5 changes made by the user. Changes are stored in LIFO order (last in, first out) so the most recent change is undone first. Each change includes what entity was modified, the old value, and the new value.

- **Backup File**: Represents a complete export of all budget data (bills, income, payment sources, categories, monthly data) that the user can save to their cloud drive for manual backup. File format should be human-readable and structured.

---

### Bill Categories (Pre-Defined)

The app will provide the following out-of-the-box bill categories to help users get started:

1. **Home**: Rent, mortgage, HOA, property maintenance
2. **Debt**: Loan payments, credit card payments, car payments
3. **Streaming**: Netflix, YouTube, Spotify, other subscriptions
4. **Utilities**: Hydro, water, gas, internet, phone
5. **Transportation**: Gas, insurance, public transit, parking
6. **Entertainment**: Dining out, hobbies, events
7. **Insurance**: Health, car, home, life insurance
8. **Subscriptions**: Magazines, services, recurring memberships

Users can add custom categories beyond these defaults.

---

## Visual Design Requirements *(new section)*

The app will feature a configurable color scheme with a default palette. Colors are configurable to allow user customization, but the development team should not get distracted by visual design early in development - focus on functionality first.

### Default Color Scheme

**Background**:
- Main background: #1a1a2e (dark blue-gray for dark mode)
- Secondary background: #16213e (slightly lighter dark blue-gray)

**Text**:
- Primary text: #e0e0e0 (off-white for readability on dark)
- Secondary text: #a0a0a0 (muted gray for less important text)
**Accents**:
- Primary accent color: [TO BE FILLED IN BY USER]
- Secondary accent color: #f59e0b (amber/yellow - for expected-to-change fields)
**Indicators**:
- Surplus (positive "leftover"): [TO BE FILLED IN BY USER]
- Deficit (negative "leftover"): #ef4444 (red)
**Sections**:
- Bills section: #3b82f6 (blue)
- Income section: #8b5cf6 (purple)
- Variable expenses section: #ec4899 (pink)
**Note**: This is the default dark mode color scheme. Colors should be configurable in future versions. Do not get distracted by color customization early - focus on getting MVP working first. Colors can be refined later.

---


## Error Handling Strategy

The app will use a conservative error handling approach to prevent data corruption:

### Error Handling Principles

- **Fail Hard, Fail Fast**: At first sign of an error, the app should stop rather than continue and potentially corrupt data
- **Verbose Logging (Initially)**: During development, log detailed error information to help diagnose issues
- **Error Storage**: Store errors in a log file (data/errors.log) for AI agents to read and analyze
- **User-Facing Messages**: Display clear, actionable error messages to users (e.g., "Failed to save payment source. Please try again.")
- **No Silent Failures**: Never silently ignore errors - always inform the user and log the issue

### Error Logging

- Error logs stored in: data/errors.log
- Log entry format: [timestamp] [error_type] [context] [message]
- Include full stack traces for debugging
- Rotate logs when file size exceeds 10MB (keep last 10 logs)

### Example Error Flow

1. User clicks "Save Bill" button
2. Backend validates bill data
3. Validation fails (e.g., name is blank)
4. **Fail Fast**: Stop save operation immediately
5. **Verbose Log**: Log error with full context to data/errors.log
6. **User Message**: Display inline error "Bill name is required"
7. **No Corruption**: Original data remains intact, no partial saves

### Testing Approach

- **Unit Tests**: Jest for unit testing (isolated components, services, utilities)
- **Integration Tests**: Jest for integration testing (API endpoints, data flow)
- **E2E Tests**: Playwright for end-to-end testing (full user journeys)
- **Test Coverage**: Aim for 80%+ code coverage for critical paths (bills, incomes, payments, "leftover" calculation)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add their first monthly bill with billing period and payment source in under 30 seconds
- **SC-002**: Users can view accurate "leftover at end of month" calculation within 2 seconds of entering bank balances
- **SC-003**: 95% of users successfully complete initial budget setup (bills, income, payment sources) on first attempt
- **SC-004**: Users can understand their financial position at a glance (surplus or deficit) without reading documentation
- **SC-005**: Users can generate a new month and see it populated with defaults within 2 seconds
- **SC-006**: Users can edit an individual bill instance for a specific month without affecting the default definition
- **SC-007**: Users can distinguish between default values and month-specific edits at a glance
- **SC-008**: Users can assign bills, income, and expenses to specific payment sources intuitively
- **SC-009**: Calculations are mathematically accurate 100% of the time (no rounding errors or calculation bugs)
- **SC-010**: Users can undo their last change with a single click within 1 second
- **SC-011**: Users can complete initial onboarding via Setup page in under 5 minutes
- **SC-012**: Users can restore individual entities from backup without overwriting all data

---

## Definitions

**Budget**: A plan for how much money we will spend and how much we will make over a month. The budget is not about limiting spending to categories, but about understanding our financial position through bills, income, and the "leftover" calculation.

**Bi-Weekly Billing Period**: Once every two weeks on a given day of the week (e.g., every Friday). This results in approximately 2.17 instances per month (~26 instances per year).

**Weekly Billing Period**: Once every seven days. This results in approximately 4.33 instances per month (~52 instances per year).

**Semi-Annually Billing Period**: Twice per year. This results in 0 or 2 instances per month depending on which months.

**Total Cash / Net Worth**: The sum of all bank account balances + cash on hand - credit card debt. This represents how much money the user has across all payment sources (positive balances) minus what they owe (negative credit card balances).

**Free-Flowing Expense**: An ad-hoc, one-time expense that doesn't fit into regular bills or planned variable expenses. Examples include birthday presents, car repairs, medical bills, unexpected purchases.

---

## Assumptions

**General**:
- Users have basic familiarity with budgeting concepts (income vs expenses)
- Users will manually enter their bank balances for each payment source (not automated bank integration)
- Variable expenses and free-flowing expenses do not repeat across months - users re-enter them monthly
- Monthly bills and income sources repeat based on their billing period (monthly, bi-weekly, weekly, semi-annually)
- Users may have multiple payment sources (bank accounts, credit cards, cash)
- Currency will be US Dollars ($) - no multi-currency support in initial version
- Month is the smallest unit of time (no daily or weekly tracking)
- Users enter positive values only - no negative amounts allowed for income or expenses (except credit card debt which is negative)
- App runs locally on user's device with no cloud synchronization required
- Flexibility is a core tenet: users can edit any month without tightly coupling back to defaults

**Month Generation and Defaults**:
- Month generation creates a starting point, not a rigid template
- Default bill/income definitions serve as templates but month-specific edits are independent
- Users understand the difference between a default definition (template) and a month instance (editable)
- New months are generated by copying defaults and adhering to billing periods (fill in what's known)

**Payment Sources**:
- Users will know which payment source each bill/income/expense should use
- Credit cards typically show negative balances (debt owed) and are subtracted from total cash
- Cash and bank accounts show positive balances (cash on hand)

**Billing Periods**:
- Bi-weekly is once every 2 weeks on a given day of the week (~2.17 instances/month)
- Weekly is once every 7 days (~4.33 instances/month)
- Semi-annually is twice per year (0-2 instances/month depending on which months)
- Bills/incomes can have different billing periods - they're not all monthly

**Backup and Restore**:
- Users are responsible for backing up their data to cloud drives (Google Drive, iCloud, Dropbox)
- App provides export/import functionality but does not automatically sync
- Restore is line-by-line (select individual entities) not full data replacement

**Development Priorities**:
- Focus on functionality first, visual design second
- Color scheme is configurable but don't get distracted by it early in development
- Get the MVP working before spending time on color customization or advanced UI features

**Out of Scope**:
- Retirement accounts (LIRA, RRSP, TFSA) are out of scope for initial version
- Savings tracking (general, car, vacation accounts) is a future stretch goal

---

## Stretch Goals (Future Enhancements)

These features are explicitly out of scope for initial release but may be considered for future versions:

- **Savings Account Tracking**: Track multiple savings accounts (Emergency Fund, Car Savings, Vacation, General Savings) with deposit tracking (Before/After amounts similar to Excel example)

- **Retirement Account Tracking**: Track retirement accounts (LIRA, RRSP, TFSA) with monthly contributions and growth

- **Automatic Bank Integration**: Connect to bank APIs to automatically import transactions and balance updates

- **Multi-Currency Support**: Track expenses and income in multiple currencies

- **Budget Categories with Budgets**: Set spending limits per category and track against those limits (e.g., Groceries: $600/month limit)

- **Expense Tracking by Date**: Track variable expenses with specific dates throughout the month, not just total monthly amount

- **Transaction History**: Maintain full history of all transactions across months for reporting and analysis

- **Import/Export**: Enhanced export to CSV, Excel, or PDF formats for sharing or backup

- **Reminders and Notifications**: Alerts when bills are due or when spending exceeds budget limits

- **Month Comparisons**: Side-by-side view of multiple months to compare spending trends

- **Charts and Visualizations**: Graphs showing spending over time, category breakdowns, income vs expenses

---

## Core Principles

- **Flexibility First**: Users should be able to edit any value in any month without fear of breaking default definitions. Month instances are loosely coupled to defaults, not tightly coupled.

- **Start Simple, Evolve As Needed**: Default bill/income definitions provide structure for month generation, but users are not forced to stick to them. Each month can evolve independently.

- **Multiple Payment Sources Are Normal**: Users will have multiple accounts (checking, credit cards, cash) - the app should make it easy to track where money flows. Total cash = bank balances + cash - credit card debt.

- **Billing Period Variety**: Users have bills and incomes with different frequencies (monthly, bi-weekly, weekly, semi-annually) - the app must handle this correctly when generating months.

- **Month Generation, Not Copy-Paste**: When generating a new month, the app should intelligently populate it based on defaults and billing periods, not just copy the previous month's data.

- **Undo Safety**: Users should never fear making a mistake. The previous 5 changes are always available to undo.

- **User-Owned Backup**: Users are responsible for their own data backup (manual cloud sync), but the app makes export/import easy.

- **Functionality Over Visuals**: Get the MVP working first. Colors and UI refinements come later.

- **Simple "Leftover" Display**: The summary is not complex - it's a single question: "how much money do I have left?"

---

**Version**: 2.0.0 | **Created**: 2025-12-29 | **Updated**: 2025-12-29
