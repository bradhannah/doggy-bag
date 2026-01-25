# Feature Specification: Occurrence-Only Payment Model & UI Simplification

**Feature Branch**: `014-occurrence-only-simplify`  
**Created**: 2026-01-25  
**Status**: Draft  
**Input**: User description: "Remove Payments and use only occurrences. Re-work line item buttons and edit/read-only interfaces to streamline and simplify."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Close Occurrence as Payment (Priority: P1)

A user wants to mark an occurrence as paid. When they close an occurrence, it means the full expected amount has been paid. This is the most fundamental interaction and removes the need for a separate "payments" concept.

**Why this priority**: This is the core behavioral change - occurrences become the sole unit of payment tracking. Without this, nothing else works.

**Independent Test**: Can be tested by closing any occurrence and verifying the bill/income totals update correctly.

**Acceptance Scenarios**:

1. **Given** an open occurrence with expected_amount of $200, **When** user closes it, **Then** the occurrence is marked closed with paid_date set to today
2. **Given** a bill with one open occurrence, **When** user closes that occurrence, **Then** the bill is marked as fully paid
3. **Given** a bill with multiple occurrences (bi-weekly), **When** user closes one, **Then** only that occurrence is marked paid, bill remains open

---

### User Story 2 - Split Occurrence for Partial Payment (Priority: P1)

A user wants to pay less than the expected amount for an occurrence. When closing for a different amount, the system offers to split the occurrence into two: one closed for the paid amount, one open for the remainder.

**Why this priority**: Essential for handling real-world scenarios where users can't pay the full expected amount, replacing the current partial payments feature.

**Independent Test**: Can be tested by attempting to close an occurrence for less than expected and verifying split behavior.

**Acceptance Scenarios**:

1. **Given** an open occurrence for $300, **When** user initiates close and enters $100 as the paid amount, **Then** system prompts to split or close as-is
2. **Given** user chooses to split, **When** confirmed, **Then** original occurrence is closed at $100 and new occurrence is created for $200
3. **Given** user chooses to close without split, **When** confirmed, **Then** occurrence is closed at original expected_amount ($300)
4. **Given** user enters amount greater than expected, **When** confirmed, **Then** system updates expected_amount to match and closes

---

### User Story 3 - Unified Edit & Close Modal (Priority: P2)

A user wants to edit and/or close an occurrence. A single modal combines editing fields with close options, replacing the complex TransactionsDrawer. The user can edit amount/date, then choose how to close - or save changes without closing.

**Why this priority**: Enables the streamlined UI goal. Depends on P1 stories establishing the occurrence-only model.

**Independent Test**: Can be tested by opening the modal and modifying any occurrence property or closing it.

**Acceptance Scenarios**:

1. **Given** an open occurrence, **When** user clicks "Edit" button, **Then** Edit & Close Modal opens with editable fields and close options
2. **Given** modal is open, **When** user changes expected_amount and clicks "Save Without Closing", **Then** occurrence is updated but remains open
3. **Given** modal is open, **When** user selects "Close - Paid in Full" and confirms, **Then** occurrence is closed at the displayed amount
4. **Given** a closed occurrence, **When** user clicks "Reopen" button, **Then** confirmation modal appears, and on confirm the occurrence reopens

---

### User Story 4 - Add Ad-hoc Occurrence (Priority: P2)

A user needs to record an additional payment toward a bill that wasn't part of the original schedule. They can add an ad-hoc occurrence at any time.

**Why this priority**: Provides flexibility for unplanned payments, essential for payoff bills and real-world usage.

**Independent Test**: Can be tested by adding an occurrence to any bill and verifying it appears in the list.

**Acceptance Scenarios**:

1. **Given** a bill with existing occurrences, **When** user clicks "Add Occurrence", **Then** a new ad-hoc occurrence is created with default values
2. **Given** new ad-hoc occurrence, **When** user edits and closes it, **Then** it is included in the bill's total paid amount
3. **Given** an ad-hoc occurrence, **When** displayed, **Then** it shows an "ad-hoc" badge to distinguish from scheduled occurrences

---

### User Story 5 - Consolidated Line Item Buttons (Priority: P2)

A user views the budget details page. Line items show fewer, clearer action buttons - a primary "Edit" button and secondary actions in an overflow menu.

**Why this priority**: Reduces visual clutter and cognitive load on the main budget view.

**Independent Test**: Can be tested by viewing any line item and verifying button count and clarity.

**Acceptance Scenarios**:

1. **Given** an open occurrence, **When** displayed, **Then** primary button shows "Edit" and overflow menu contains "View Details" and "Delete"
2. **Given** a closed occurrence, **When** displayed, **Then** primary button shows "Reopen" and overflow menu contains "View Details" and "Delete"
3. **Given** any line item, **When** viewed on mobile, **Then** buttons remain usable with appropriate touch targets
4. **Given** a bill instance card, **When** displayed, **Then** "+ Add Occurrence" button appears at the instance level (not per-occurrence)

---

### User Story 6 - Data Migration (Priority: P3)

Existing users have payment records in the old format. On first launch after update, existing payments are automatically migrated to occurrences.

**Why this priority**: Required for existing users but can be developed after core features are complete.

**Independent Test**: Can be tested with a backup of production data, running migration, and verifying totals match.

**Acceptance Scenarios**:

1. **Given** a bill with 3 payments totaling $450, **When** migration runs, **Then** 3 closed occurrences are created matching payment amounts and dates
2. **Given** an occurrence with existing payments, **When** migration runs, **Then** the occurrence's expected_amount is updated to match total payments and it is closed
3. **Given** migration completes, **When** user views budget, **Then** all historical totals remain accurate

---

### Edge Cases

- What happens when user tries to close an occurrence with $0 amount? System should prevent closing with zero amount.
- What happens when user tries to split an occurrence into amount that exceeds remaining expected? Cap at expected amount.
- How does system handle occurrences from future months? Keep current behavior - they remain open until manually closed.
- What happens to payment_source_id on split? New occurrence inherits payment source from original.
- What if user has no payment sources configured? Payment source field is optional, can be left blank.

## Requirements _(mandatory)_

### Functional Requirements

**Data Model Changes:**

- **FR-001**: System MUST remove the `Payment` type from the data model entirely
- **FR-002**: System MUST remove the `payments[]` array from the `Occurrence` interface
- **FR-003**: System MUST add `paid_date` field to `Occurrence` to record when it was closed
- **FR-004**: System MUST add `payment_source_id` field to `Occurrence` to track which account was used

**Occurrence Behavior:**

- **FR-005**: System MUST treat closing an occurrence as equivalent to paying the full expected_amount
- **FR-006**: System MUST allow users to close an occurrence with a different amount than expected
- **FR-007**: When closing for less than expected, system MUST prompt user to either split or close as-is
- **FR-008**: When splitting, system MUST create a new open occurrence for the difference
- **FR-009**: System MUST mark a bill/income as closed when all its occurrences are closed
- **FR-010**: System MUST allow users to add ad-hoc occurrences to any bill/income

**UI Requirements:**

- **FR-011**: System MUST replace TransactionsDrawer with a unified EditCloseModal
- **FR-012**: Edit modal MUST include editable fields for: expected_amount, expected_date, payment_source, notes
- **FR-013**: Edit modal MUST include three close options: "Paid in Full", "Paid Nothing", "Partial Payment - Keep Open"
- **FR-014**: Edit modal MUST include "Save Without Closing" option to update fields without closing
- **FR-015**: Line items MUST display "Edit" as primary button (open) or "Reopen" (closed) with overflow menu for secondary actions
- **FR-016**: Overflow menu MUST contain: "View Details", "Delete" (with confirmation)
- **FR-017**: "+ Add Occurrence" button MUST appear at instance level, not per-occurrence
- **FR-018**: Delete MUST be available for ALL occurrences (scheduled and ad-hoc) with confirmation modal
- **FR-019**: Reopen MUST show confirmation modal before reopening a closed occurrence

**Migration:**

- **FR-020**: System MUST provide one-time migration for existing payments to occurrences
- **FR-021**: Migration MUST preserve total amounts and historical accuracy
- **FR-022**: Migration MUST be idempotent (safe to run multiple times)

**Payoff Bills:**

- **FR-023**: Payoff bills MUST continue working with occurrence-only model (no behavior change needed)
- **FR-024**: System MUST remove any unused payment-related code paths for payoff bills

### Key Entities

- **Occurrence**: A single scheduled or ad-hoc event representing money movement. Contains expected_amount, expected_date, is_closed, paid_date, payment_source_id, notes, and is_adhoc flag. Replaces the need for separate Payment tracking.

- **BillInstance/IncomeInstance**: Monthly instance of a recurring bill or income. Contains array of occurrences. Calculated totals now derived solely from occurrence state (closed occurrences sum to paid amount).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can close an occurrence in 2 clicks or fewer (down from current 3-4 click flow)
- **SC-002**: Line items display at most 2 visible action buttons (down from current 4-6)
- **SC-003**: Edit drawer loads with all editable fields in a single view (no tabs or nested sections)
- **SC-004**: 100% of historical payment data is preserved after migration with matching totals
- **SC-005**: Budget calculation accuracy remains 100% after removing payments (verified by test suite)
- **SC-006**: The number of drawer/modal components in DetailedView is reduced by at least 50%

## Assumptions

- Users are comfortable with the mental model of "closing an occurrence = paid"
- The split workflow provides sufficient flexibility for partial payment scenarios
- Payment source tracking at the occurrence level is sufficient (no need for per-transaction sources)
- Existing payoff bill behavior already aligns with occurrence-only model
- Mobile responsiveness requirements remain unchanged

## UI Wireframes

### Line Item Row Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BILL INSTANCE CARD (Instance Level)                                    │
│                                                                         │
│  Netflix (Monthly)                         [ + Add Occurrence ]          │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  OPEN OCCURRENCE ROW                                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Jan 15th     $15.99     OPEN     [ Edit ]     [ ⋮ ]               │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  CLOSED OCCURRENCE ROW                                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Jan 15th     $15.99   ✓ CLOSED   [ Reopen ]   [ ⋮ ]               │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

Overflow Menu (⋮):
┌──────────────────┐
│ View Details     │
│ Delete           │
└──────────────────┘
```

### Edit & Close Modal

```
┌─────────────────────────────────────────────────────────────┐
│                      Edit & Close                       [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Netflix - Due Jan 15th                                     │
│                                                             │
│  Amount              Due Date                               │
│  ┌───────────────┐   ┌───────────────┐                      │
│  │ $  15.99      │   │ 15th       ▼  │                      │
│  └───────────────┘   └───────────────┘                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  How would you like to handle this?                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ◉ Close - Paid in Full ($15.99)                     │    │
│  │   Mark as complete. No remaining balance.           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ○ Close - Paid Nothing ($0)                         │    │
│  │   Mark as complete. Waived or skipped this period.  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ○ Partial Payment - Keep Open                       │    │
│  │   Pay part now, remainder stays due.                │    │
│  │                                                     │    │
│  │   Amount paid: [ $_______ ]                         │    │
│  │   Remaining $XX.XX will become new occurrence       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Payment Date: [ Jan 25, 2026      ▼ ]                      │
│  Payment Source: [ Checking ****1234 ▼ ]                    │
│                                                             │
│  Notes: (optional)                                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [ Save Without Closing ]         [ Cancel ]  [ Close ]    │
└─────────────────────────────────────────────────────────────┘
```

**Button States:**

- "Save Without Closing" - Updates amount/date/notes, keeps occurrence OPEN
- "Cancel" - Discards all changes
- "Close" - Saves changes AND closes based on selected option

**Radio Option States:**

- "Paid in Full" selected → Amount field hidden, Close button shows "Close - Paid $15.99"
- "Paid Nothing" selected → Amount field hidden, Close button shows "Close - $0 Paid"
- "Partial - Keep Open" selected → Amount field visible/required, button shows "Pay $X & Keep Open"

### Split Confirmation Modal

```
┌─────────────────────────────────────────────────────────────┐
│                  Confirm Partial Payment                [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  You're paying $10.00 of $15.99                             │
│                                                             │
│  This will:                                                 │
│  • Close current occurrence at $10.00                       │
│  • Create new occurrence for $5.99 (remaining)              │
│                                                             │
│  The new occurrence will appear in your list.               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                         [ Go Back ]  [ Confirm Split ]      │
└─────────────────────────────────────────────────────────────┘
```

### Delete Confirmation Modal

```
┌─────────────────────────────────────────────────────────────┐
│                    Delete Occurrence                    [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Are you sure you want to delete this occurrence?           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Netflix - Jan 15th                                 │    │
│  │  Expected: $15.99                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ⚠️  This will remove the occurrence from this month.       │
│      The recurring bill will still appear next month.       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [ Cancel ]  [ Delete ]         │
└─────────────────────────────────────────────────────────────┘
```

### Reopen Confirmation Modal

```
┌─────────────────────────────────────────────────────────────┐
│                   Reopen Occurrence                     [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Are you sure you want to reopen this occurrence?           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Netflix - Jan 15th                                 │    │
│  │  Paid: $15.99 on Jan 14th                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  This will mark the occurrence as unpaid.                   │
│  Payment details will be cleared.                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [ Cancel ]  [ Reopen ]         │
└─────────────────────────────────────────────────────────────┘
```

### View Details Drawer (Read-Only)

```
                                    ┌────────────────────────────────────┐
                                    │ Occurrence Details             [X] │
                                    ├────────────────────────────────────┤
                                    │                                    │
                                    │  Netflix                           │
                                    │  ┌────────────────────────────┐    │
                                    │  │ ✓ CLOSED · Paid Jan 14th   │    │
                                    │  └────────────────────────────┘    │
                                    │                                    │
                                    │  ──────────────────────────────    │
                                    │                                    │
                                    │  Amount Paid                       │
                                    │  $15.99                            │
                                    │                                    │
                                    │  Due Date                          │
                                    │  Jan 15th                          │
                                    │                                    │
                                    │  Payment Source                    │
                                    │  Checking ****1234                 │
                                    │                                    │
                                    │  Notes                             │
                                    │  "Price increased this month"      │
                                    │                                    │
                                    ├────────────────────────────────────┤
                                    │                          [ Done ]  │
                                    └────────────────────────────────────┘
```

### Success Toast Messages

```
┌────────────────────────────────────────┐
│ ✓ Netflix closed - Paid $15.99         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ✓ Netflix closed - $0 paid (waived)    │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ✓ Paid $10.00 - $5.99 remaining        │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ✓ Occurrence deleted                   │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ✓ Occurrence reopened                  │
└────────────────────────────────────────┘
```

### Component Inventory

| Component                 | Type   | Trigger                               | Purpose                               |
| ------------------------- | ------ | ------------------------------------- | ------------------------------------- |
| `EditCloseModal`          | Modal  | "Edit" button on row                  | Edit fields + Close options (unified) |
| `SplitConfirmModal`       | Modal  | Selecting "Partial" in EditCloseModal | Confirm split into two occurrences    |
| `DeleteConfirmModal`      | Modal  | "Delete" in overflow menu             | Confirm deletion                      |
| `ReopenConfirmModal`      | Modal  | "Reopen" button on closed row         | Confirm reopening                     |
| `OccurrenceDetailsDrawer` | Drawer | "View Details" in overflow            | Read-only occurrence info             |
