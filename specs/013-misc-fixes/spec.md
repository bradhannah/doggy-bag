# Feature Specification: Miscellaneous Fixes & Improvements (Round 5)

**Feature Branch**: `013-misc-fixes`  
**Created**: 2026-01-17  
**Status**: Discovery (iterative collection)  
**Input**: User description: "Iterative discovery of miscellaneous improvements and fixes"

## User Scenarios & Testing _(mandatory)_

<!--
  This spec is being built iteratively through discovery sessions.
  Items will be added as we discuss and refine each work item together.
-->

### User Story 1 - Auto-Select Balance Field on Focus (Priority: P2)

As a user managing my account balances in the Budget page, I want the balance field contents to be automatically selected when I click or tab into an account row, so that I can immediately type a new value without manually selecting or deleting the existing text.

**Why this priority**: Quality-of-life improvement that reduces friction in a common task. Not critical but improves daily workflow.

**Independent Test**: Can be fully tested by clicking or tabbing into any account balance field in the Budget left pane and verifying the entire value is selected.

**Acceptance Scenarios**:

1. **Given** I am on the Budget page with accounts listed in the left pane, **When** I click on a bank account's balance field, **Then** the entire balance value is selected (highlighted) and ready to be overwritten by typing.

2. **Given** I am on the Budget page with accounts listed in the left pane, **When** I click on a credit card's balance field, **Then** the entire balance value is selected (highlighted) and ready to be overwritten by typing.

3. **Given** I am on the Budget page and focus is elsewhere, **When** I use keyboard Tab to navigate into an account balance field, **Then** the entire balance value is selected (highlighted) and ready to be overwritten by typing.

4. **Given** a balance field has its value selected, **When** I type any character, **Then** the existing value is replaced with my typed input.

---

### User Story 2 - Monthly Projection Histogram (Priority: P1)

As a user planning my monthly finances, I want to see a visual projection of my available funds from today through the end of the month, so that I can identify days when I might run a deficit and take corrective action.

**Why this priority**: Core financial planning feature that helps users avoid overdrafts and plan ahead. High value for daily budgeting decisions.

**Independent Test**: Can be fully tested by navigating to the Projections page and verifying the histogram displays current balance projected forward with scheduled income/bills applied on their due dates.

**Acceptance Scenarios**:

1. **Given** I navigate to the Projections page, **When** the page loads, **Then** I see a histogram showing my projected available funds from today through the end of the current month.

2. **Given** I have open (unpaid) bills with future due dates, **When** I view the projection, **Then** the bill amounts are subtracted from the balance on their respective due dates, shown as red bars going downward.

3. **Given** I have expected income with future receive dates, **When** I view the projection, **Then** the income amounts are added to the balance on their respective dates, shown as green bars going upward.

4. **Given** I have open bills with due dates in the past (overdue), **When** I view the projection, **Then** those amounts are applied to today's starting balance AND a prominent warning banner displays the overdue bills with their original due dates.

5. **Given** my projected balance goes below $0 on any future day, **When** I view the projection, **Then** those deficit days are clearly shown with red bars extending below the $0 line and marked with a warning indicator.

6. **Given** I am viewing the projection, **When** I hover over any day on the histogram, **Then** I see a tooltip showing the date, projected balance, and any income/expenses occurring that day.

7. **Given** I enter a Daily Run Rate amount, **When** the projection recalculates, **Then** that amount is subtracted from each future day's projection (applied equally to all days).

8. **Given** I have entered a Daily Run Rate, **When** I navigate away from the Projections page and return, **Then** the Daily Run Rate field is reset to $0.00 (value is not persisted).

---

### User Story 3 - Quick Filter for Bills & Incomes (Priority: P2)

As a user looking for a specific bill or income in the Budget page, I want to quickly filter the list by name or category, so that I can find what I'm looking for without scrolling.

**Why this priority**: Improves usability for users with many transactions.

**Independent Test**: Can be fully tested by pressing Ctrl+F (or Cmd+F) on the Budget page and typing a search term.

**Acceptance Scenarios**:

1. **Given** I am on the Budget page, **When** I click the "Filter" button or press Ctrl+F / Cmd+F, **Then** a filter bar slides down below the header with the input focused.

2. **Given** the filter bar is open, **When** I type "netflix", **Then** the list immediately filters to show only items matching "netflix" (fuzzy match), and matching text is highlighted.

3. **Given** filtering is active, **When** I press Escape or click the Clear/Close button, **Then** the filter bar closes and the full list is restored.

4. **Given** I type a term with no matches, **When** I look at the list, **Then** I see a "No matching bills or incomes" message.

---

### User Story 4 - Prompt for Payment Date & Note on Close (Priority: P2)

As a user marking a bill as paid, I want to be prompted to confirm the payment date and optionally add a note, so that my records are accurate even if I pay on a different day.

**Why this priority**: Improves data accuracy and allows capturing context for payments.

**Independent Test**: Can be fully tested by clicking "Close" on any open bill and verifying the prompt appears and saves the correct date/note.

**Acceptance Scenarios**:

1. **Given** I have an open bill, **When** I click the "Close" button, **Then** a popover/modal appears asking for "Payment Date" and an optional "Note".

2. **Given** the prompt is open, **When** I check the date field, **Then** it defaults to the current date.

3. **Given** the prompt is open, **When** I change the date to a past day in the current month and add a note "Paid via Check", **Then** clicking "Confirm" closes the bill with that specific closed date and saves the note.

4. **Given** the prompt is open, **When** I click "Cancel" or press Escape, **Then** the action is aborted and the bill remains open.

---

### User Story 5 - Transaction Notes & Details View (Priority: P2)

As a user reviewing my budget, I want to see notes I've added to transactions inline and access full details for any item, so that I can easily recall context about specific bills or incomes.

**Why this priority**: Makes the budget view more informative and reduces the need to remember details.

**Independent Test**: Can be fully tested by adding a note to a transaction and verifying it appears inline and in the details drawer.

**Acceptance Scenarios**:

1. **Given** a transaction has a note, **When** I view it in the Budget list, **Then** the note is displayed inline below the transaction name/details.

2. **Given** I am on the Budget list, **When** I click the "Details" (info) icon on any row, **Then** a details slide-out panel opens showing full transaction info, including the note field (editable).

3. **Given** I am viewing the details panel for an open item, **When** I edit the note and save, **Then** the inline note in the main list updates immediately.

---

### User Story 6 - Bug Fix: Partial Payments Discrepancy (Priority: High)

As a user who has made partial payments, I want the "Add Payment" drawer to correctly show my payment history and the accurate remaining balance, so that I don't accidentally overpay.

**Why this priority**: Critical bug fix. Data accuracy issue that confuses users about what they owe.

**Independent Test**: Can be fully tested by making a partial payment on a bill (e.g., pay $100 of $300), then clicking "Add Payment" again and verifying the drawer shows the $100 paid and $200 remaining.

**Acceptance Scenarios**:

1. **Given** I have a bill with expected amount $300, **When** I add a payment of $100, **Then** the main list shows $100 paid.

2. **Given** I have paid $100 of $300, **When** I click "Add Payment" again, **Then** the drawer displays the $100 transaction in the history list.

3. **Given** I have paid $100 of $300, **When** I click "Add Payment" again, **Then** the drawer shows "Remaining: $200.00" (not $300.00).

4. **Given** I have multiple occurrences of a bill (e.g. weekly), **When** I view the "Add Payment" drawer for the main bill, **Then** it aggregates payments from all occurrences correctly.

---

### User Story 7 - Savings Goals & Tracking (Priority: P2)

As a user planning for future expenses (e.g., Winter Tires, Vacation), I want to create dedicated savings goals with automated payment schedules and progress tracking, so that I can ensure I have the funds ready by my target date.

**Why this priority**: Adds forward-looking financial planning, moving beyond just "surviving the month" to achieving goals.

**Independent Test**: Can be fully tested by creating a "Vacation" goal, setting up a monthly contribution, paying one contribution, seeing the progress bar update, and then using "Buy That Thing" to complete the goal.

**Acceptance Scenarios**:

1.  **Given** I am on the new "Goals" page, **When** I click "New Goal", **Then** a wizard appears asking for Name, Target Amount, Target Date, and Linked Account (hard link to existing account).
2.  **Given** I have entered the goal details, **When** I proceed to "Schedule", **Then** the system recommends a payment amount based on my chosen frequency (Monthly, Bi-weekly, etc.) to hit the target date.
3.  **Given** I confirm the schedule, **Then** the system creates the Goal AND automatically generates the corresponding recurring Bill(s) linked to this goal.
4.  **Given** I have a linked bill due today, **When** I click "Pay/Transfer" on the Bill (in Budget view), **Then** the funds are deducted from my payment source AND added to the Goal's "Saved" balance.
5.  **Given** I am viewing the Goals list, **When** I look at a goal, **Then** I see a "Temperature" status:
    - **Cool/Green**: On track (Projected balance >= Target).
    - **Warm/Yellow**: Slightly behind.
    - **Hot/Red**: Significantly behind (Projected shortfall).
6.  **Given** I have saved enough funds, **When** I click the "Buy That Thing!" button, **Then**:
    - An **Income** transaction is created ("Withdrawal for [Goal Name]") to release the funds back to available cash.
    - A **Bill/Expense** is created ("Purchase: [Goal Name]") and immediately marked as paid.
    - The Goal is marked as "Completed" or "Archived".
7.  **Given** I want to add extra funds, **When** I click "Make a Payment" on the goal, **Then** a one-time bill is created and I am prompted to pay it immediately.

---

### User Story 8 - Per-Member Insurance Priorities (Priority: P2)

As a user with a complex family insurance situation (blended families, personal plans), I want to assign specific insurance plans to each family member in a specific order, so that claims are automatically set up with the correct submission hierarchy (Primary, Secondary, Tertiary).

**Why this priority**: Solves a critical data modeling limitation where "Global Priority" failed to represent real-world scenarios like step-parents or student plans.

**Independent Test**: Can be fully tested by configuring "Desi" with 3 specific plans, creating a new Claim for Desi, and verifying that 3 draft submissions are automatically generated in the correct order.

**Acceptance Scenarios**:

1.  **Given** I am editing a Family Member, **When** I look at the "Insurance Plans" section, **Then** I can add plans from the global list and drag/reorder them to define that person's specific priority.
2.  **Given** I am creating a new Insurance Plan, **Then** I no longer see a "Priority" field (priority is now defined per-member).
3.  **Given** I am creating a New Claim and I select "Desi" as the patient, **Then** the system automatically generates draft Submissions for all of Desi's assigned plans in her specific order.
4.  **Given** a claim has been auto-generated with 3 submissions, **When** I realize one isn't applicable (e.g. "Dental" not covered by secondary), **Then** I can manually delete that specific submission draft from the claim.
5.  **Given** existing data from before this feature, **When** the system migrates, **Then** all existing Family Members are assigned all existing plans in their old global priority order (preserving behavior until manually changed).

---

### User Story 9 - Sequential Claim Waterfall (Priority: P2)

As a user tracking multi-plan insurance claims, I want subsequent submissions to automatically wait and calculate their claim amount based on the previous plan's reimbursement, so that I don't have to manually calculate balances or create submissions prematurely.

**Why this priority**: Automates the most tedious part of insurance coordination (calculating the remainder).

**Independent Test**: Can be fully tested by creating a claim with Primary and Secondary plans. Verify Secondary is "Awaiting". Close Primary with partial payment. Verify Secondary automatically activates with the correct remaining balance.

**Acceptance Scenarios**:

1.  **Given** I create a new Claim with multiple plans (Primary, Secondary), **Then** the Primary submission is created as `Draft`, and Secondary is created with status `Awaiting Previous` and a placeholder amount ($0).
2.  **Given** I have a submission in `Awaiting Previous` state, **When** I view the claim, **Then** that submission is visually distinct (e.g., greyed out or "waiting" icon) and cannot be submitted yet.
3.  **Given** the Primary submission is updated to `Approved` with a specific `Reimbursed Amount`, **Then** the system automatically updates the Secondary submission:
    - Status changes from `Awaiting Previous` to `Draft`.
    - `Amount Claimed` is auto-calculated as: `(Original Claim Total) - (Primary Reimbursed)`.
4.  **Given** the Primary submission is `Denied` ($0 paid), **Then** the Secondary activates with the full original amount.
5.  **Given** a submission has auto-calculated, **When** I review it, **Then** I can manually override the amount if needed before submitting.

---

### User Story 10 - Easy Portal Access (Priority: P2)

As a user managing insurance claims, I want quick access to my insurance provider's web portal directly from the claim submission row, so that I can easily submit claims or check status without manually searching for the URL.

**Why this priority**: High-frequency task friction. Users need to visit portals constantly during the claim lifecycle.

**Independent Test**: Can be fully tested by configuring a plan with a Portal URL, then clicking the "Go to Portal" button in the Claims list submission row and verifying it opens the default system browser.

**Acceptance Scenarios**:

1.  **Given** I am setting up an Insurance Plan, **When** I enter a valid URL in the "Portal URL" field, **Then** it is saved with the plan.
2.  **Given** I am viewing a Claim with submissions, **When** I look at a submission row, **Then** I see a "Go to Portal" button if the associated plan has a URL configured.
3.  **Given** I click the "Go to Portal" button, **Then** the link opens in my default **System Browser** (e.g., Chrome/Safari), NOT inside the app window (ensuring compatibility with banking security headers and password managers).

**Requirements**:

- **FR-052**: Application MUST use the Tauri `opener` plugin to handle external URLs
- **FR-053**: Claim Submission rows MUST display a "Go to Portal" button (or icon) if the associated plan has a URL
- **FR-054**: Clicking the portal button MUST launch the URL in the operating system's default browser

**Success Criteria**:

- **SC-015**: 100% of portal links open in the external default browser, never inside the app window
