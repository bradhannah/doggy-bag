# Feature Specification: Monthly Budget Tracker

**Feature Branch**: `001-monthly-budget`
**Created**: 2025-12-29
**Status**: Draft
**Input**: User description: "Build a basic budgetting application. It will focus primarily on monthly bills. Variable costs like groceries and clothing will be secondary. We imagine that fixed monthly costs ultimately tell us how much we have left to spend month to month. It will also track long term savings - but in a super simple way - each account is line item. The super power of the app is being able to add up all expenses, all incomes and then take into account your actual bank balance to show you "how much do I have left over at the end of the month?" It is broken out month by month"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set Up Monthly Bills (Priority: P1)

User needs to add and manage fixed monthly expenses like rent, utilities, and subscriptions. User can add bills, set their amounts, and see the total monthly fixed cost.

**Why this priority**: Fixed costs are the foundation of the budget; without knowing these, users cannot determine how much money they have available for variable spending or savings. This is the primary focus mentioned in the requirements.

**Independent Test**: Can be fully tested by adding multiple bills and verifying the total fixed cost calculation displays correctly. Delivers immediate value by showing users their baseline monthly commitment.

**Acceptance Scenarios**:

1. **Given** user has no bills set up, **When** user adds a monthly bill with name "Rent" and amount "$1,500", **Then** bill appears in bill list with correct amount
2. **Given** user has added 3 monthly bills totaling $2,000, **When** user views monthly summary, **Then** total fixed costs display as "$2,000/month"
3. **Given** user has a bill for "Internet" at $80, **When** user updates bill amount to "$90", **Then** total fixed costs increase by $10
4. **Given** user has multiple bills, **When** user deletes one bill, **Then** total fixed costs decrease by that bill's amount

---

### User Story 2 - Track Monthly Income (Priority: P1)

User needs to add and manage income sources like salary, freelance work, or other recurring income. User can add income sources, set their amounts, and see the total monthly income.

**Why this priority**: Income is the other half of the equation; users must know what money is coming in to determine if their budget is sustainable. Combined with bills, this provides the foundation for financial planning.

**Independent Test**: Can be fully tested by adding income sources and verifying the total income calculation displays correctly. Delivers immediate value by showing users their total monthly earnings.

**Acceptance Scenarios**:

1. **Given** user has no income set up, **When** user adds income source "Salary" with amount "$4,000", **Then** income source appears in list with correct amount
2. **Given** user has added 2 income sources totaling $5,000, **When** user views monthly summary, **Then** total income displays as "$5,000/month"
3. **Given** user has income for "Freelance" at $500, **When** user updates amount to "$600", **Then** total income increases by $100
4. **Given** user has a monthly bill total of $2,000 and income of $5,000, **When** user views summary, **Then** net income (income minus bills) displays as "$3,000"

---

### User Story 3 - Calculate Monthly Surplus With Bank Balance (Priority: P1)

User needs to enter their actual bank balance to see how much money they will have left at the end of the month. The app calculates the surplus by combining income, expenses, and current bank balance.

**Why this priority**: This is the "super power" mentioned in the requirements - the core value proposition that differentiates this from a simple spreadsheet. Users need to know if they're on track or need to adjust spending.

**Independent Test**: Can be fully tested by entering a bank balance and verifying the "leftover" calculation is accurate. Delivers immediate value by providing the key insight users care about most.

**Acceptance Scenarios**:

1. **Given** user has $5,000 income, $2,000 in bills, and $3,000 bank balance, **When** user views monthly summary, **Then** "leftover at end of month" displays as "$6,000" (bank + income - bills)
2. **Given** user has $3,000 income, $4,000 in bills, and $2,000 bank balance, **When** user views summary, **Then** "leftover" displays as "$1,000" with indication this is negative/deficit
3. **Given** user changes bank balance from $3,000 to $2,000, **When** user views summary, **Then** "leftover" decreases by $1,000
4. **Given** user has no bills or income and enters $5,000 bank balance, **When** user views summary, **Then** "leftover" displays as "$5,000"

---

### User Story 4 - Track Variable Expenses (Priority: P2)

User needs to add and track variable costs like groceries, clothing, and other discretionary spending that vary month to month. These are secondary to fixed bills but still important for accurate budgeting.

**Why this priority**: Variable expenses give users a more realistic view of spending, but they're secondary to fixed costs as per requirements. Completes the picture once core functionality is working.

**Independent Test**: Can be fully tested by adding variable expenses and verifying they're included in the "leftover" calculation. Delivers value by helping users understand their true monthly spending.

**Acceptance Scenarios**:

1. **Given** user has set up bills and income, **When** user adds variable expense "Groceries" with amount "$600", **Then** expense appears in list and is subtracted from "leftover" calculation
2. **Given** user has variable expenses totaling $1,000, **When** user views summary, **Then** total variable costs display separately from fixed costs
3. **Given** user has added variable expenses this month, **When** user views next month, **Then** variable expenses do not carry over (reset monthly)
4. **Given** user wants to adjust variable expenses mid-month, **When** user edits a variable expense amount, **Then** "leftover" calculation updates immediately

---

### User Story 5 - Track Long-Term Savings (Priority: P3)

User needs to track savings accounts as simple line items to see how their savings contribute to their overall financial picture. Each savings account is just a line item showing the amount.

**Why this priority**: Savings tracking is explicitly mentioned but as "super simple" and secondary. P3 priority ensures core budget functionality is solid first before adding this feature.

**Independent Test**: Can be fully tested by adding savings accounts and verifying they display correctly. Delivers value by helping users see their complete financial position.

**Acceptance Scenarios**:

1. **Given** user wants to track savings, **When** user adds savings account "Emergency Fund" with amount "$10,000", **Then** account appears in savings list
2. **Given** user has multiple savings accounts, **When** user views summary, **Then** total savings displays as sum of all accounts
3. **Given** user has savings accounts totaling $20,000, **When** user updates one account from $10,000 to $15,000, **Then** total savings increases by $5,000
4. **Given** user has savings, **When** user deletes an account, **Then** it no longer contributes to total savings

---

### User Story 6 - View Month-by-Month Breakdown (Priority: P2)

User needs to view their budget data broken out by month to see trends, compare months, and understand how their financial situation changes over time.

**Why this priority**: Month-by-month view is explicitly mentioned in the requirements and provides critical context for understanding financial trends. P2 because it builds on the core data entry stories.

**Independent Test**: Can be fully tested by entering data for multiple months and verifying each month displays correctly. Delivers value by enabling users to see historical patterns and plan ahead.

**Acceptance Scenarios**:

1. **Given** user has budget data for January and February, **When** user views month selector, **Then** both months are available to select
2. **Given** user is viewing January data, **When** user selects February, **Then** summary displays February's bills, income, and "leftover" independently
3. **Given** user has entered bills for January, **When** user navigates to February, **Then** January's bills do not appear (month isolation)
4. **Given** user is viewing current month, **When** user navigates to a future month, **Then** current month's data does not carry over (blank slate)

---

### Edge Cases

- What happens when user has more expenses than income, resulting in negative "leftover" amount?
- How does system handle when user adds a bill with $0 or negative amount?
- What happens when user navigates between months with different data sets?
- How does system handle when user enters bank balance with commas, currency symbols, or decimals?
- What happens when user tries to add a bill or income with no name?
- How does system handle when user has no data for a selected month (display blank or show empty state)?
- What happens when user deletes the last bill or income source (zero division or empty state)?
- How does system handle when user enters a very large number (millions, billions) for bank balance?
- What happens when user has both positive and negative "leftover" across different months?
- How does system handle when user switches months without saving current changes?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to add, edit, and delete monthly bills with name and amount
- **FR-002**: System MUST allow users to add, edit, and delete income sources with name and amount
- **FR-003**: System MUST allow users to enter and update their bank balance
- **FR-004**: System MUST calculate and display "leftover at end of month" using formula: bank balance + total income - total expenses (bills + variable costs)
- **FR-005**: System MUST display fixed costs (monthly bills) separately from variable costs
- **FR-006**: System MUST display monthly bills, income, variable costs, and "leftover" in a summary view
- **FR-007**: System MUST allow users to add, edit, and delete variable expenses with name and amount
- **FR-008**: System MUST allow users to add, edit, and delete savings accounts with name and amount
- **FR-009**: System MUST allow users to view budget data broken out by month
- **FR-010**: System MUST isolate data by month (data from one month does not affect other months)
- **FR-011**: System MUST display total fixed costs (sum of all bills)
- **FR-012**: System MUST display total income (sum of all income sources)
- **FR-013**: System MUST display total variable costs (sum of all variable expenses)
- **FR-014**: System MUST display total savings (sum of all savings accounts)
- **FR-015**: System MUST indicate when "leftover" amount is negative (deficit) vs positive (surplus)
- **FR-016**: System MUST prevent users from adding bills, income, or expenses with blank names
- **FR-017**: System MUST prevent users from entering negative amounts for bills, income, or bank balance
- **FR-018**: System MUST allow users to navigate between different months
- **FR-019**: System MUST persist all data locally so it's available between sessions
- **FR-020**: System MUST calculate values in real-time as user makes changes

### Key Entities

- **Monthly Bill**: Represents a fixed recurring expense with name, amount, and month association. Bills repeat each month unless explicitly modified.

- **Income Source**: Represents recurring income with name, amount, and month association. Income sources repeat each month unless explicitly modified.

- **Variable Expense**: Represents discretionary spending that varies by month with name, amount, and month association. These do NOT repeat across months - must be re-entered each month.

- **Savings Account**: Represents a savings account with name and current amount. These are tracked as line items and are NOT tied to specific months (global to the user's profile).

- **Bank Balance**: Represents the user's current bank account balance. This is entered per month and used in calculating the "leftover" amount.

- **Month**: Represents a specific month and year (e.g., January 2025). All bills, income, variable expenses, and bank balance are scoped to a specific month. Savings accounts are the exception (global).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add their first monthly bill and see it reflected in the summary in under 30 seconds
- **SC-002**: Users can view accurate "leftover at end of month" calculation within 2 seconds of entering bank balance
- **SC-003**: 95% of users successfully complete setting up their monthly budget (bills, income, bank balance) on the first attempt
- **SC-004**: Users can understand their financial position at a glance (surplus or deficit) without reading documentation
- **SC-005**: Users can navigate between months and see appropriate data within 3 seconds
- **SC-006**: Users can complete initial budget setup (3+ bills, 1+ income sources, enter bank balance) in under 5 minutes
- **SC-007**: Calculations are mathematically accurate 100% of the time (no rounding errors or calculation bugs)

## Assumptions

- Users have basic familiarity with budgeting concepts (income vs expenses)
- Users will manually enter their bank balance each month (not automated bank integration)
- Variable expenses do not repeat across months - users re-enter them monthly
- Monthly bills and income sources repeat each month unless user explicitly changes them
- Users will have one bank account to track (not multiple accounts)
- Currency will be US Dollars ($) - no multi-currency support in initial version
- Month is the smallest unit of time (no daily or weekly tracking)
- Users enter positive values only - no negative amounts allowed for income or expenses
- App runs locally on user's device with no cloud synchronization required
- Savings accounts are for tracking purposes only - no interest calculations or projections
