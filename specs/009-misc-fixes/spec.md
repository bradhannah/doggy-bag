# Feature Specification: Miscellaneous Fixes and Improvements

**Feature Branch**: `009-misc-fixes`  
**Created**: 2026-01-06  
**Status**: Draft  
**Input**: User description: "Hodge podge of UI/UX improvements and bug fixes"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Dashboard Math Transparency (Priority: P1)

As a user, I want the Dashboard to clearly show how my Leftover amount is calculated so I understand exactly where my money is going and coming from.

**Why this priority**: This is the core budgeting feature - users need to trust and understand the numbers. Without transparency, users may not trust the system.

**Independent Test**: Navigate to Dashboard and verify the math breakdown is visible with Starting Cash, Income, Bills, CC Payoffs, and the formula showing how Leftover is calculated.

**Acceptance Scenarios**:

1. **Given** I am on the Dashboard, **When** I view the month summary, **Then** I see a vertical breakdown showing Starting Cash (with individual bank accounts), Income (with Received/Remaining), Bills (with Paid/Remaining), and CC Payoffs (with individual cards and their Paid/Remaining)
2. **Given** I am on the Dashboard, **When** I look at the bottom of the summary, **Then** I see the equation bar: `$X (Cash) + $Y (Income) - $Z (Bills) - $W (CC) = Leftover` with green for positive contributions and red for deductions
3. **Given** a bill or income item has Remaining = $0, **When** I view the summary, **Then** that line shows "$X Remaining $0 ✓" with a checkmark
4. **Given** I have credit cards marked as "pay off monthly", **When** I view the Dashboard, **Then** each CC appears in the CC Payoffs section with its balance and Paid/Remaining breakdown

---

### User Story 2 - Common Month Picker Navigation (Priority: P1)

As a user, I want a consistent month picker at the top of Dashboard, Details, and Savings pages so I can easily navigate between months from any page.

**Why this priority**: Navigation consistency is fundamental to usability. Users should not need different workflows to change months on different pages.

**Independent Test**: Navigate to Dashboard, Details, and Savings pages and verify the same month picker appears at the top of each, with working prev/next arrows and Today button.

**Acceptance Scenarios**:

1. **Given** I am on any budget page (Dashboard, Details, or Savings), **When** the page loads, **Then** I see a month picker header with [<] Month Year [>] format and a [Today] button
2. **Given** I am viewing December 2025, **When** I click the [>] next button, **Then** I navigate to January 2026 on the same page type
3. **Given** I am viewing a past month, **When** I click [Today], **Then** I navigate to the current month
4. **Given** I am already viewing the current month, **When** I look at the [Today] button, **Then** it appears disabled/grayed out
5. **Given** I am on the Details page, **When** I look at the header, **Then** I do NOT see a "< Dashboard" back link

---

### User Story 3 - Sidebar Navigation Improvements (Priority: P2)

As a user, I want clearer visual separation between Dashboard and the month-specific views (Details/Savings) in the sidebar navigation.

**Why this priority**: Visual hierarchy helps users understand the app structure and reduces cognitive load.

**Independent Test**: Open the app and verify the sidebar shows a solid line separator between Dashboard and Details, and that the "Today" button has been removed from the sidebar.

**Acceptance Scenarios**:

1. **Given** I am viewing the sidebar, **When** I look at the navigation items, **Then** I see a solid line separator between Dashboard and Details (matching the style between Savings and Manage Months)
2. **Given** I am viewing the sidebar, **When** I look for the "Today" button, **Then** it is not present (month navigation is now in the header)

---

### User Story 4 - Editable Balance Field Cleanup (Priority: P2)

As a user, I want the editable balance fields in the Details sidebar to look cleaner without the distracting edit icon that appears on hover.

**Why this priority**: Polish and visual consistency improve the user experience and make the app feel more professional.

**Independent Test**: Navigate to Details page, hover over an editable balance field, and verify no edit icon appears but the field is still clickable with right-aligned dollar amount.

**Acceptance Scenarios**:

1. **Given** I am on the Details page SummarySidebar, **When** I hover over an editable balance field, **Then** no edit icon appears
2. **Given** I am viewing an editable balance field, **When** I look at the dollar amount, **Then** it is right-aligned within the field (matching the BillRow Expected field style)
3. **Given** I am viewing an editable balance field, **When** I hover over it, **Then** the amber highlight background changes (same as BillRow Expected field)

---

### User Story 5 - Auto-pick Unique Category Color (Priority: P2)

As a user, when I create a new category, I want the system to automatically suggest a unique color that is visually distinct from my existing categories.

**Why this priority**: Reduces friction when creating categories and ensures visual variety without manual effort.

**Independent Test**: Create a new category and verify it auto-selects a color different from existing categories. Create multiple categories and verify colors remain distinct.

**Acceptance Scenarios**:

1. **Given** I have 3 existing categories with different colors, **When** I open the new category form, **Then** the color field is pre-filled with a color not used by any existing category
2. **Given** all colors in the preset palette are used, **When** I create a new category, **Then** the system generates a color with maximum hue distance from existing colors
3. **Given** a color is auto-selected, **When** I want a different color, **Then** I can still use the color picker to choose any color I want

---

### User Story 6 - Remove Balance from Payment Source Setup (Priority: P2)

As a user, I should not set a "default balance" for payment sources in the setup, since each month has its own balance that I set in the Details view.

**Why this priority**: Removes confusion about where balances should be set and reinforces the month-as-snapshot mental model.

**Independent Test**: Go to Budget Config > Payment Sources and verify there is no balance field when creating or editing a payment source.

**Acceptance Scenarios**:

1. **Given** I am creating a new payment source, **When** I view the form, **Then** there is no balance input field
2. **Given** I am editing an existing payment source, **When** I view the form, **Then** there is no balance input field
3. **Given** a new month is created, **When** I view the payment source balances, **Then** they are carried forward from the previous month's ending balance
4. **Given** this is the first month (no previous month), **When** I view the payment source balances, **Then** they start at $0

---

### User Story 7 - Graceful "Month Not Created" on Savings (Priority: P3)

As a user, when I navigate to the Savings page for a month that doesn't exist, I want to see a friendly message instead of an API error.

**Why this priority**: Error handling improves user experience and prevents confusion.

**Independent Test**: Navigate to Savings for a month that doesn't exist and verify a friendly message appears with a Create Month button.

**Acceptance Scenarios**:

1. **Given** I am on the Savings page for a month that doesn't exist, **When** the page loads, **Then** I see a friendly "month not created" message instead of an API error
2. **Given** I see the "month not created" message, **When** I look at the widget, **Then** I see a "Create Month" button
3. **Given** I click "Create Month", **When** the month is created, **Then** the Savings page loads with the new month data

---

### User Story 8 - Consistent "Month Not Created" Widget (Priority: P3)

As a user, I want the "Month Not Created" message to look the same on Dashboard, Details, and Savings pages.

**Why this priority**: Visual consistency across the app improves the professional feel and user trust.

**Independent Test**: Navigate to Dashboard, Details, and Savings for a month that doesn't exist and verify the widget looks identical on all three pages.

**Acceptance Scenarios**:

1. **Given** a month doesn't exist, **When** I view Dashboard, Details, or Savings, **Then** I see the same "Month Not Created" widget with identical dimensions and styling
2. **Given** I see the "Month Not Created" widget on any page, **When** I look at its size, **Then** it matches the dimensions from the Details version

---

### Edge Cases

- What happens when there are no bank accounts configured? (Dashboard shows empty Starting Cash section)
- What happens when there are no CC payoff cards? (Dashboard hides the CC Payoffs section)
- What happens when navigating months and a month doesn't exist? (Month picker still works, page shows "Month Not Created" widget)
- What happens when all palette colors are used for categories? (System generates new color using HSL hue spacing)
- What happens when carrying forward balances but previous month has no balance data? (Default to $0)

## Requirements _(mandatory)_

### Functional Requirements

**Dashboard Redesign:**

- **FR-001**: Dashboard MUST display a "Starting Cash" section showing all non-savings/non-investment bank accounts with individual balances and a subtotal
- **FR-002**: Dashboard MUST display an "Income" section showing total expected income with Received and Remaining amounts on separate lines
- **FR-003**: Dashboard MUST display a "Bills" section showing total expected bills with Paid and Remaining amounts on separate lines
- **FR-004**: Dashboard MUST display a "CC Payoffs" section showing each pay-off-monthly credit card with its balance and Paid/Remaining breakdown
- **FR-005**: Dashboard MUST display an equation bar at the bottom showing the Leftover calculation with colored boxes (green for positive, red for negative)
- **FR-006**: Dashboard MUST show a checkmark (✓) next to Remaining when the value is $0
- **FR-007**: Dashboard MUST remove the large "Account Balances" widget from the middle of the page

**Month Picker Header:**

- **FR-008**: System MUST display a common month picker header on Dashboard, Details, and Savings pages
- **FR-009**: Month picker MUST include prev/next arrow buttons to navigate months
- **FR-010**: Month picker MUST include a "Today" button that navigates to the current month
- **FR-011**: "Today" button MUST be disabled/grayed out when already viewing the current month
- **FR-012**: Details page MUST NOT display a "< Dashboard" back link

**Sidebar Navigation:**

- **FR-013**: Sidebar MUST display a solid line separator between Dashboard and Details (matching existing separator style)
- **FR-014**: Sidebar MUST NOT display a "Today" button (removed)

**Editable Balance Fields:**

- **FR-015**: SummarySidebar editable balance fields MUST NOT display an edit icon on hover
- **FR-016**: SummarySidebar editable balance fields MUST right-align dollar amounts
- **FR-017**: SummarySidebar editable balance fields MUST use the same hover styling as BillRow Expected field

**Category Colors:**

- **FR-018**: New category form MUST auto-select a color not already used by existing categories
- **FR-019**: System MUST use a curated palette of 12-16 visually distinct colors as the first choice
- **FR-020**: System MUST generate a new color using HSL hue spacing when all palette colors are exhausted
- **FR-021**: Users MUST still be able to override the suggested color with the color picker

**Payment Source Setup:**

- **FR-022**: Payment source create/edit form MUST NOT include a balance input field
- **FR-023**: System MUST carry forward ending balances from previous month when creating a new month
- **FR-024**: System MUST default balances to $0 when no previous month exists

**Month Not Created Widget:**

- **FR-025**: Savings page MUST display a friendly message when the month doesn't exist (not an API error)
- **FR-026**: System MUST use a shared "Month Not Created" component across Dashboard, Details, and Savings
- **FR-027**: Shared component MUST include a "Create Month" button
- **FR-028**: Shared component MUST use consistent dimensions matching the Details version

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can understand the Leftover calculation by viewing the Dashboard math breakdown without needing to navigate elsewhere
- **SC-002**: Users can navigate between months from any budget page (Dashboard, Details, Savings) using the same controls
- **SC-003**: Users can create a new category in under 30 seconds without manually selecting a color
- **SC-004**: Users never see raw API error messages when navigating to non-existent months
- **SC-005**: All "Month Not Created" widgets across the app appear visually identical
- **SC-006**: Editable balance fields in the sidebar appear clean without visual "jumping" on hover
