# Feature Specification: Detailed Monthly View

**Feature Branch**: `002-detailed-monthly-view`  
**Created**: 2025-12-31  
**Status**: Draft  
**Input**: User description: "Create a Detailed Monthly View for day-to-day budget management with category grouping, partial payments, due dates, ad-hoc items, and section tallies. Should feel like a spreadsheet but richer and bespoke - emulating the user's personal budget workflow."

## Design Vision

The Detailed Monthly View is the day-to-day management interface for a specific month. While the Dashboard provides a high-level "how much do I have left?" summary, the Detailed View is where users actively manage their budget throughout the month.

### Design Principles

- **Spreadsheet-like but richer**: Familiar tabular layout with Expected/Actual columns, but with enhanced visual polish (colored category headers, inline editing, progress indicators)
- **Bespoke to YOUR workflow**: Not a generic budgeting app - designed around tracking bills, partial payments, and the specific flow you use
- **Snapshot isolation**: Changes here don't affect default entities in Setup - this is a snapshot of this specific month
- **Actuals-only calculation**: Leftover uses only what you've actually entered, not estimates

### Visual Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  JANUARY 2025                                                  [← Dashboard]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BILLS & EXPENSES                                                           │
│  ───────────────────────────────────────────────────────────────────────    │
│  ▌HOME                                                                      │
│  │  [x] Rent              $1,500    $1,500     ✓   Jan 1                   │
│  │  [ ] Hydro             $120      [____]         Jan 20  ⚠️              │
│  ▌DEBT                                                                      │
│  │  [ ] Car Payment       $450      [____]         Jan 15                  │
│  │  [ ] Visa Payment      $200      [$180]         Jan 22                  │
│  ▌TRANSPORTATION                                                            │
│  │  [ ] Gas (partial)     $300   $120 / $300  ◐    --     ($180 left)      │
│  ▌STREAMING                                                                 │
│  │  [x] Netflix           $15       $15        ✓   Jan 5                   │
│  ▌VARIABLE                                                                  │
│  │  [x] Groceries         --        $350       ✓   Jan 5                   │
│  │  [+ Add Expense]                                                        │
│  ▌AD-HOC                                                                    │
│  │  [x] Car Repair        --        $800       ✓   Jan 12   [Make Regular?]│
│  │  [+ Add Ad-hoc Bill]                                                    │
│  ───────────────────────────────────────────────────────────────────────    │
│  │  TOTALS:           Expected    Actual      Remaining                    │
│  │  Bills:            $2,585      $2,765      $180                         │
│  │  Variable:         --          $350        --                           │
│  │  Ad-hoc:           --          $800        --                           │
│  │  TOTAL EXPENSES:   $2,585      $3,915      $180                         │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  INCOME                                                                     │
│  ───────────────────────────────────────────────────────────────────────    │
│  ▌SALARY                                                                    │
│  │  [x] Paycheck          $4,000    [$4,050]   ✓   Jan 15                  │
│  ▌OTHER                                                                     │
│  │  [ ] Freelance         $1,000    [____]         Jan 30                  │
│  ▌AD-HOC                                                                    │
│  │  [x] Tax Refund        --        $1,200     ✓   Jan 8    [Make Regular?]│
│  │  [+ Add Ad-hoc Income]                                                  │
│  ───────────────────────────────────────────────────────────────────────    │
│  │  TOTALS:           Expected    Actual      Remaining                    │
│  │  TOTAL INCOME:     $5,000      $5,250      $1,000                       │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  SUMMARY                                                                    │
│  ───────────────────────────────────────────────────────────────────────    │
│  Bank Balances:    $2,450  (Scotia: $3,500 | Visa: -$1,200 | Cash: $150)   │
│                                                                             │
│  Actual Income:      $5,250                                                 │
│  Actual Expenses:   -$3,915                                                 │
│  Bank Balances:     +$2,450                                                 │
│  ─────────────────────────────                                              │
│  LEFTOVER:           $3,785                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Visual Elements

- **Colored category headers**: Each category has a user-configurable color shown as left border accent
- **Compact spacing**: Minimal vertical whitespace between categories
- **Inline items**: Bill/expense rows indented under category headers
- **Amber highlighting**: Actual values that differ from Expected shown in amber
- **Section tallies**: Expected, Actual, and Remaining totals at bottom of each section
- **Partial payment display**: "Paid / Expected" format with remaining shown

---

## User Scenarios & Testing

### User Story 1 - View Monthly Bills and Expenses by Category (Priority: P1)

User needs to see all their bills and expenses for a specific month, organized by category with clear visual groupings. Categories have colored headers and items are indented beneath them. The view shows both Expected (from defaults) and Actual amounts, with section tallies at the bottom.

**Why this priority**: This is the core functionality of the Detailed View - without categorized bill display with tallies, users cannot manage their monthly budget effectively.

**Independent Test**: Can be fully tested by navigating to a month and verifying bills appear grouped by category with Expected/Actual columns and correct tallies. Delivers immediate value by providing organized monthly budget visibility.

**Acceptance Scenarios**:

1. **Given** user has bills in multiple categories (Home, Debt, Streaming), **When** user opens Detailed View for January 2025, **Then** bills are grouped under category headers with colored left borders
2. **Given** user has a bill with Expected $1,500, **When** user enters Actual $1,550, **Then** Actual displays in amber/different color to indicate difference
3. **Given** user has bills totaling $2,585 Expected and $2,765 Actual, **When** user views section tally, **Then** tally shows "Expected: $2,585 | Actual: $2,765 | Remaining: $180"
4. **Given** categories are configured in a specific order, **When** user views Detailed View, **Then** categories appear in that configured order

---

### User Story 2 - Track Partial Payments (Priority: P1)

User needs to track bills that are paid incrementally over the month (e.g., fuel budget of $300 paid in multiple fill-ups). User can add payments toward a bill and see remaining balance.

**Why this priority**: Real-world budgeting often involves partial payments. Without this, users cannot accurately track bills like fuel, groceries budgets, or installment payments.

**Independent Test**: Can be fully tested by adding multiple payments to a single bill and verifying the remaining balance updates correctly and reflects in tallies.

**Acceptance Scenarios**:

1. **Given** user has a Gas bill with Expected $300, **When** user clicks "Add Payment" and enters $120, **Then** Paid column shows "$120 / $300" and remaining shows "$180"
2. **Given** user has paid $120 of $300 Gas bill, **When** user adds another payment of $80, **Then** Paid shows "$200 / $300" and remaining shows "$100"
3. **Given** user has partially paid a bill, **When** user views the checkbox, **Then** it shows partial indicator (half-filled circle) instead of empty or checked
4. **Given** user pays the full remaining amount, **When** payment is recorded, **Then** checkbox shows fully paid (checkmark)
5. **Given** user has $180 remaining on Gas bill, **When** user views section tally "Remaining" column, **Then** $180 is included in Remaining total

---

### User Story 3 - Track Due Dates with Overdue Indicators (Priority: P1)

User needs to see when bills are due and be alerted when bills are overdue (past due date and not marked paid).

**Why this priority**: Due dates are essential for cash flow management. Overdue indicators prevent missed payments.

**Independent Test**: Can be fully tested by setting due dates on bills and verifying overdue indicators appear correctly for past-due unpaid items.

**Acceptance Scenarios**:

1. **Given** user has a bill with due_day of 15, **When** viewing January 2025, **Then** due date displays as "Jan 15"
2. **Given** today is Jan 20 and a bill due Jan 15 is unpaid, **When** user views Detailed View, **Then** bill shows overdue indicator (warning icon) with tooltip "Overdue by 5 days"
3. **Given** a bill is overdue but user marks it paid, **When** user views Detailed View, **Then** overdue indicator is removed
4. **Given** a bill's due date is in the future, **When** user views Detailed View, **Then** no overdue indicator is shown

---

### User Story 4 - Add Ad-hoc Bills and Income (Priority: P1)

User needs to add one-time bills (car repair, medical bill) and one-time income (tax refund, insurance payout) that don't repeat. User can optionally convert ad-hoc items to regular bills/income.

**Why this priority**: Life is unpredictable - users need to capture unexpected expenses and income without cluttering their regular bills.

**Independent Test**: Can be fully tested by adding an ad-hoc expense and verifying it appears only in the current month and is included in tallies.

**Acceptance Scenarios**:

1. **Given** user is in Detailed View for January, **When** user clicks "Add Ad-hoc Bill" and enters "Car Repair" for $800, **Then** ad-hoc bill appears in AD-HOC category section
2. **Given** user has added an ad-hoc bill for $800, **When** user views section tally, **Then** Ad-hoc row shows "Actual: $800"
3. **Given** user has added an ad-hoc bill, **When** user navigates to February, **Then** ad-hoc bill does NOT appear (month isolation)
4. **Given** user has an ad-hoc bill "Car Repair", **When** user clicks "Make Regular?", **Then** drawer opens to create a new regular bill in Setup with pre-filled values (name, amount, category)
5. **Given** user adds ad-hoc income "Tax Refund" for $1,200, **When** user views Income section, **Then** ad-hoc income appears in AD-HOC income category and is included in income tally

---

### User Story 5 - View Section Tallies (Priority: P1)

User needs to see totals at the bottom of each section (Bills, Variable, Ad-hoc, Income) showing Expected, Actual, and Remaining amounts.

**Why this priority**: Tallies provide at-a-glance understanding of where the budget stands without manual calculation.

**Independent Test**: Can be fully tested by entering various amounts and verifying tallies calculate correctly.

**Acceptance Scenarios**:

1. **Given** user has bills with Expected $2,585, Actual $2,765, and $180 remaining on partial payments, **When** user views Bills tally, **Then** row shows "Expected: $2,585 | Actual: $2,765 | Remaining: $180"
2. **Given** user has variable expenses totaling $350, **When** user views Variable tally, **Then** row shows "Expected: -- | Actual: $350 | Remaining: --"
3. **Given** user has income Expected $5,000 and Actual $5,250 with $1,000 not yet received, **When** user views Income tally, **Then** row shows "Expected: $5,000 | Actual: $5,250 | Remaining: $1,000"
4. **Given** tallies are displayed, **When** user adds a new expense, **Then** tallies update immediately

---

### User Story 6 - Leftover Calculation Uses Actuals Only (Priority: P1)

User needs the leftover calculation to use only actual amounts entered, not expected amounts. This gives accurate real-world picture.

**Why this priority**: The core "superpower" of the app is accurate leftover calculation. Using actuals ensures accuracy.

**Independent Test**: Can be fully tested by entering actual amounts that differ from expected and verifying leftover uses actuals.

**Acceptance Scenarios**:

1. **Given** Expected income is $4,000 and Actual is $4,050, **When** leftover is calculated, **Then** $4,050 is used (not $4,000)
2. **Given** Expected bill is $200 and Actual is $180, **When** leftover is calculated, **Then** $180 is subtracted (not $200)
3. **Given** user has not entered Actual for a bill, **When** leftover is calculated, **Then** that bill is NOT included (only actuals count)
4. **Given** user has partial payment of $120 on $300 bill, **When** leftover is calculated, **Then** $120 is subtracted (actual paid amount)
5. **Given** Summary section shows calculation, **When** user views it, **Then** breakdown shows: Actual Income + Bank Balances - Actual Expenses = Leftover

---

### User Story 7 - Configure Category Order with Drag-and-Drop (Priority: P2)

User needs to configure the order in which categories appear in the Detailed View. User can drag and drop categories to reorder them in Setup.

**Why this priority**: Category order affects workflow - users want to see high-priority categories (like Home, Debt) before lower-priority ones (Streaming, Entertainment).

**Independent Test**: Can be fully tested by reordering categories in Setup and verifying the new order appears in Detailed View.

**Acceptance Scenarios**:

1. **Given** user is in Setup > Categories, **When** user views category list, **Then** categories are shown with drag handles for reordering
2. **Given** categories are ordered Home, Debt, Streaming, **When** user drags Debt above Home, **Then** order becomes Debt, Home, Streaming
3. **Given** user has reordered categories, **When** user opens Detailed View, **Then** categories appear in the new order
4. **Given** user has bill and income categories, **When** user views Setup, **Then** bill categories and income categories are managed separately

---

### User Story 8 - Configure Category Colors (Priority: P2)

User needs to assign custom colors to each category for visual distinction in the Detailed View.

**Why this priority**: Visual customization helps users quickly identify categories. Different users have different color preferences.

**Independent Test**: Can be fully tested by changing a category's color in Setup and verifying it appears correctly in Detailed View.

**Acceptance Scenarios**:

1. **Given** user is in Setup > Categories, **When** user clicks on a category, **Then** color picker is available
2. **Given** user selects red for "Debt" category, **When** user saves and views Detailed View, **Then** Debt category header has red left border/accent
3. **Given** user has not set a custom color, **When** user views category, **Then** default color from palette is used

---

### User Story 9 - View Income by Category (Priority: P2)

User needs to see income organized by categories (Salary, Freelance, Other, Ad-hoc) similar to how bills are organized, with its own section tally.

**Why this priority**: Income categories provide organization for users with multiple income sources.

**Independent Test**: Can be fully tested by adding income sources with categories and verifying they appear grouped correctly with tallies.

**Acceptance Scenarios**:

1. **Given** user has Salary and Freelance income, **When** user views Detailed View, **Then** income is grouped under category headers (SALARY, OTHER)
2. **Given** user enters Actual income different from Expected, **When** viewing, **Then** Actual displays in amber
3. **Given** user has income categories configured, **When** user reorders them, **Then** income categories in Detailed View reflect new order
4. **Given** user has multiple income items, **When** user views Income tally, **Then** tally shows total Expected, Actual, and Remaining for all income

---

### Edge Cases

- What happens when user has no actual amounts entered? (Leftover shows $0 expenses/income with note "Enter actuals to see leftover")
- What happens when partial payment exceeds expected amount? (Allow it - actual can exceed expected, shown normally)
- What happens when user deletes a category that has bills assigned? (Prevent deletion, show error "Category has X bills assigned")
- What happens when ad-hoc item is converted to regular but user cancels drawer? (No changes made, ad-hoc remains as-is)
- What happens when due date falls on day that doesn't exist (Feb 30)? (Use last day of month - Feb 28/29)
- What happens when a category has no items for this month? (Hide category header - don't show empty categories)
- What happens when user edits Expected amount in Detailed View? (Not allowed - Expected comes from Setup defaults, this is a snapshot)

---

## Requirements

### Functional Requirements

**Detailed View Layout**:
- **FR-001**: System MUST display bills and expenses grouped by category with colored header accents
- **FR-002**: System MUST display category headers inline with items indented/offset to the right
- **FR-003**: System MUST show Expected and Actual columns for each bill/income
- **FR-004**: System MUST display Actual amounts in different color (amber) when they differ from Expected
- **FR-005**: System MUST use compact spacing between categories (minimal vertical whitespace)
- **FR-006**: System MUST hide categories that have no items for the current month
- **FR-007**: System MUST feel like a spreadsheet but with richer visual polish and bespoke design

**Section Tallies**:
- **FR-008**: System MUST display section tallies at bottom of Bills & Expenses section
- **FR-009**: System MUST display section tally at bottom of Income section
- **FR-010**: System MUST show Expected, Actual, and Remaining columns in tallies
- **FR-011**: System MUST calculate Remaining as unpaid Expected amounts plus partial payment remainders
- **FR-012**: System MUST update tallies immediately when values change

**Partial Payments**:
- **FR-013**: System MUST allow users to add multiple payments toward a single bill
- **FR-014**: System MUST display partial payment progress as "Paid / Expected" format
- **FR-015**: System MUST show remaining amount for partially paid bills
- **FR-016**: System MUST display partial indicator (half-filled) for partially paid bills

**Due Dates**:
- **FR-017**: System MUST allow users to set due_day (1-31) on bill and income entities in Setup
- **FR-018**: System MUST display due dates in Detailed View as "Mon DD" format
- **FR-019**: System MUST show overdue indicator with tooltip for past-due unpaid items
- **FR-020**: System MUST apply overdue styling (color/icon) to past-due unpaid items

**Ad-hoc Items**:
- **FR-021**: System MUST allow users to add ad-hoc bills that exist only in current month
- **FR-022**: System MUST allow users to add ad-hoc income that exists only in current month
- **FR-023**: System MUST provide "Make Regular?" option to convert ad-hoc to regular entity
- **FR-024**: System MUST open pre-filled drawer/form when converting ad-hoc to regular
- **FR-025**: System MUST include ad-hoc items in section tallies

**Category Configuration**:
- **FR-026**: System MUST allow users to reorder categories via drag-and-drop in Setup
- **FR-027**: System MUST persist category order and apply it to Detailed View
- **FR-028**: System MUST allow users to assign custom colors to categories via color picker
- **FR-029**: System MUST support separate category lists for bills vs income
- **FR-030**: System MUST provide default income categories: Salary, Freelance/Contract, Investment, Government, Other

**Leftover Calculation**:
- **FR-031**: System MUST calculate leftover using ONLY actual amounts (not expected)
- **FR-032**: System MUST include partial payments in leftover calculation (amount actually paid)
- **FR-033**: System MUST display leftover summary at bottom of Detailed View with breakdown
- **FR-034**: System MUST show formula: Actual Income + Bank Balances - Actual Expenses = Leftover

**Snapshot Behavior**:
- **FR-035**: System MUST NOT modify default bill/income entities when editing month instances
- **FR-036**: System MUST NOT allow editing Expected amounts in Detailed View (read-only from Setup)

**Navigation**:
- **FR-037**: System MUST provide clear navigation back to Dashboard
- **FR-038**: System MUST allow month selection/navigation within Detailed View

---

### Key Entities

- **Category**: Extended with `sort_order` (number for ordering), `color` (hex string for header accent), `type` ('bill' | 'income' to separate bill categories from income categories)

- **Bill/Income**: Extended with `due_day` (1-31, day of month when due)

- **BillInstance/IncomeInstance**: Extended with:
  - `expected_amount` (from default, read-only in Detailed View)
  - `actual_amount` (user-entered actual, used for leftover calculation)
  - `is_adhoc` (boolean, true for one-time items)
  - `due_date` (calculated from due_day + current month)

- **Payment**: New entity for partial payments
  - `id`, `amount`, `date`, `bill_instance_id`
  - Multiple payments can be added to a single bill instance

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can view all bills for a month organized by category in under 2 seconds
- **SC-002**: Users can add a partial payment to a bill in under 10 seconds
- **SC-003**: Users can identify overdue bills at a glance (visual indicator visible without scrolling to that item)
- **SC-004**: Users can add an ad-hoc expense in under 15 seconds
- **SC-005**: Users can reorder categories via drag-and-drop in under 30 seconds
- **SC-006**: Leftover calculation accurately reflects only actual amounts entered (100% accuracy)
- **SC-007**: Section tallies update within 500ms of any value change
- **SC-008**: Users understand that changes don't affect defaults (no confusion reports about snapshot behavior)
- **SC-009**: View feels familiar like a spreadsheet but noticeably richer/more polished

---

## Assumptions

- Users have already set up bills, income, and categories in the existing Setup page
- The Dashboard continues to exist as a high-level summary view
- Existing month data structure can be extended to support new fields
- Category ordering and colors are global settings (not per-month)
- Variable expenses and free-flowing expenses from 001-monthly-budget are consolidated into the "VARIABLE" and "AD-HOC" categories in this view
- Bank balances are still edited in Dashboard or a dedicated section (not duplicated in Detailed View beyond summary display)

---

## Relationship to Existing Features

This feature builds on and enhances the existing 001-monthly-budget implementation:

| Existing (001) | Enhanced (002) |
|----------------|----------------|
| Dashboard with cards | Dashboard remains as high-level summary |
| Mark as paid (checkbox) | Enhanced with partial payments, due dates |
| Bill/Income instances | Extended with actual_amount, is_adhoc |
| Categories (8 pre-defined) | Extended with sort_order, color, type |
| Variable expenses | Displayed in VARIABLE category section |
| Free-flowing expenses | Consolidated into AD-HOC category |

---

**Version**: 1.0.0 | **Created**: 2025-12-31
