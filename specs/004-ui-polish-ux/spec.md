# Feature Specification: UI Polish & UX Improvements

**Feature Branch**: `004-ui-polish-ux`  
**Created**: 2026-01-03  
**Status**: Draft  
**Input**: User description: "UI polish and UX improvements: window size persistence, responsive layout fixes, navigation reorganization, category visual states, credit card payoff workflow, example data generation"

## Design Vision

This feature consolidates multiple UI/UX polish items to improve the daily experience of using BudgetForFun. The changes focus on:

1. **Persistence**: Remember user preferences (window size, compact mode)
2. **Visual Clarity**: Better category states, header colors, removal of duplicates
3. **Responsive Layout**: Eliminate horizontal scrollbar by stacking content intelligently
4. **Workflow Improvements**: Credit card payoff sync, scroll position stability
5. **Navigation**: Reorganize sidebar for better hierarchy
6. **Developer Tooling**: Generate anonymized example data for testing/demos

---

## Visual Wireframes

### Wireframe 1: Updated Navigation Sidebar

```
┌──────────────────────┐
│  BudgetForFun        │
│  ──────────────────  │
│  [    Today    ]     │
│                      │
│  [□] Dashboard       │
│  [□] Details         │
│                      │
│  ──────────────────  │  ← Separator
│  [□] Manage Months   │  ← Moved below separator
│  [⚙] Budget Config   │  ← Renamed from "Setup"
│                      │
│                      │
│  (flex spacer)       │
│                      │
│                      │
│  ──────────────────  │
│  [ - ] 100% [ + ]    │  ← Zoom (Tauri only)
│  ──────────────────  │
│  [    Undo ⌘Z    ]   │
│  [Export] [Import]   │
│  ──────────────────  │
│  [⚙] Settings        │  ← Small, in footer area
└──────────────────────┘
```

### Wireframe 2: Updated Details View Header (Leftover Removed)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Dashboard                                                                │
│                                                                             │
│       ◀  January 2026  ▶                              [⊡] [≡] [↻]          │
│                                                    Width Compact Refresh    │
│                                                                             │
│  (Leftover widget REMOVED from top-right - only in left sidebar)            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 3: Left Sidebar - Green Bank Header, No Net Worth

```
┌──────────────────────────────┐
│  BANK ACCOUNTS & CASH        │  ← GREEN (#4ade80) header text
│  ──────────────────────────  │
│  Checking          $1,234.56 │
│  Savings           $5,678.90 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  Subtotal          $6,913.46 │
│                              │
│  ────────────────────────────│
│                              │
│  CREDIT & LINES OF CREDIT   │  ← RED (#f87171) header text
│  ──────────────────────────  │
│  Visa     [payoff]  $500.00  │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  Total Owed        -$500.00  │
│                              │
│  ════════════════════════════│  ← Net Worth row REMOVED
│                              │
└──────────────────────────────┘
```

### Wireframe 4: Category States - All Paid (Crossed Out, Greyed, Proper Alignment)

**ACTIVE Category (unpaid items remain):**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ■ Utilities (3)  [+]                              Expected      Actual     │
│  ────────────────────────────────────────────────  $350.00       $350.00    │
│                                                                              │
│    Electric Bill                    $150.00        ───────       ✓ Paid     │
│    Gas Bill                         $100.00        ───────       ✓ Paid     │
│    Water Bill                       $100.00        ───────       ✓ Paid     │
└──────────────────────────────────────────────────────────────────────────────┘
```

**COMPLETED Category (all items paid - crossed out + greyed, [+] still visible):**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ■ Utilities (3)  [+]                              Expected      Actual     │
│  ────────────────────────────────────────────────  $350.00       $350.00    │
│  (header opacity: 0.6, category name has line-through)                       │
│                                                                              │
│    Electric Bill                    $150.00        ───────       ✓ Paid     │
│    Gas Bill                         $100.00        ───────       ✓ Paid     │
│    Water Bill                       $100.00        ───────       ✓ Paid     │
│  (all rows maintain column alignment, each row crossed out individually)     │
└──────────────────────────────────────────────────────────────────────────────┘
```

**EMPTY Category (no items - crossed out + greyed, [+] still visible):**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ■ Miscellaneous (0)  [+]                          Expected      Actual     │
│  ────────────────────────────────────────────────  $0.00         -          │
│  (header opacity: 0.6, category name has line-through)                       │
│                                                                              │
│    (no items)                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 5: Category Sorting (Paid/Empty at Bottom)

```
ACTIVE CATEGORIES (sorted to top):
┌─────────────────────────────────────────────────────────────────────┐
│  ■ Housing (2)                               $1,500.00    $800.00  │  ← Unpaid items
│    Rent                           $1,200.00               Pending  │
│    Insurance                      $300.00                 ✓ Paid   │
│                                                                     │
│  ■ Transportation (3)                        $400.00      $200.00  │  ← Unpaid items
│    Gas                            $200.00                 ✓ Paid   │
│    Car Payment                    $200.00                 Pending  │
└─────────────────────────────────────────────────────────────────────┘

COMPLETED/EMPTY CATEGORIES (sorted to bottom):
┌─────────────────────────────────────────────────────────────────────┐
│  ■ Utilities (3)  [+]                         $350.00      $350.00 │  ← All paid
│    Electric Bill                   $150.00               ✓ Paid    │
│    ...                                                              │
│                                                                     │
│  ■ Subscriptions (0)  [+]                      $0.00        -      │  ← Empty
│    (no items)                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Wireframe 6: Credit Card Payoff Payment - Balance Sync Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Payment Recorded                                                    [  X ]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  You recorded a payment of $200.00 toward your Visa.                        │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  Would you like to update your Visa balance to stay in sync?                │
│                                                                             │
│    Current Balance:    $500.00                                              │
│    This Payment:      -$200.00                                              │
│                       ─────────                                             │
│    New Balance:        $300.00                                              │
│                                                                             │
│                                                                             │
│                                              [ Skip ]    [ Update Balance ] │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 7: Responsive Layout - Bills/Income Stacking

**WIDE VIEW (side-by-side, no scrollbar):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │         BILLS               │  │         INCOME              │          │
│  │                             │  │                             │          │
│  │  ■ Housing                  │  │  ■ Salary                   │          │
│  │  ■ Utilities                │  │  ■ Side Income              │          │
│  │  ■ Transportation           │  │                             │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**NARROW VIEW (stacked, no horizontal scrollbar):**
```
┌───────────────────────────────────────┐
│  ┌─────────────────────────────────┐  │
│  │           BILLS                 │  │
│  │                                 │  │
│  │  ■ Housing                      │  │
│  │  ■ Utilities                    │  │
│  │  ■ Transportation               │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │           INCOME                │  │
│  │                                 │  │
│  │  ■ Salary                       │  │
│  │  ■ Side Income                  │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘
```

---

## User Scenarios & Testing

### User Story 1 - Window Size Persistence (Priority: P1)

User resizes the BudgetForFun window to their preferred size. When they close and reopen the app, the window opens at the same size.

**Why this priority**: First-run experience and daily usability - users shouldn't have to resize every time.

**Independent Test**: Close app, reopen, verify window dimensions match previous session.

**Acceptance Scenarios**:

1. **Given** user resizes window to 1200x800, **When** user closes and reopens app, **Then** window opens at 1200x800
2. **Given** user maximizes window, **When** user closes and reopens app, **Then** window opens maximized
3. **Given** app has never been run, **When** user launches app, **Then** window opens at sensible default size

---

### User Story 2 - Responsive Layout Without Horizontal Scrollbar (Priority: P1)

User narrows the window width. Instead of a horizontal scrollbar appearing, the Income section moves below the Bills section.

**Why this priority**: Core usability - horizontal scrollbars are frustrating and indicate poor responsive design.

**Independent Test**: Resize window gradually narrower and verify no horizontal scrollbar appears.

**Acceptance Scenarios**:

1. **Given** window is wide enough for side-by-side layout, **When** Bills and Income sections are displayed, **Then** they appear side-by-side
2. **Given** window is narrowed below ~800px content width, **When** horizontal scroll would be triggered, **Then** Income moves below Bills instead
3. **Given** user has left sidebar visible (260px), **When** main content area is < 400px per section, **Then** sections stack vertically
4. **Given** user resizes window wider again, **When** there's room for both sections, **Then** they return to side-by-side layout

---

### User Story 3 - Category Visual States (Priority: P1)

User sees at a glance which categories are fully paid or empty. These categories are visually distinguished (crossed out, greyed) and sorted to the bottom.

**Why this priority**: Visual hierarchy helps users focus on what needs attention.

**Independent Test**: Mark all items in a category as paid, verify category header becomes crossed out and moves to bottom.

**Acceptance Scenarios**:

1. **Given** all items in a category are paid/closed, **When** user views the category, **Then** category name is struck through and opacity reduced
2. **Given** a category has no items, **When** user views the category, **Then** category name is struck through and opacity reduced
3. **Given** multiple categories with mixed states, **When** user views the list, **Then** active categories appear first, completed/empty categories at bottom
4. **Given** a completed/empty category, **When** user clicks [+] button, **Then** they can still add new items
5. **Given** column headers (Expected, Actual), **When** category is crossed out, **Then** columns remain properly aligned

---

### User Story 4 - Credit Card Payoff Balance Sync (Priority: P1)

User makes a partial payment on a credit card payoff bill. The app prompts them to update the credit card balance in the sidebar to keep it in sync.

**Why this priority**: Data consistency between bill payments and account balances is critical for accurate leftover calculations.

**Independent Test**: Make a partial CC payoff payment, verify sync modal appears, accept, verify balance updated.

**Acceptance Scenarios**:

1. **Given** user pays part of a CC payoff bill, **When** payment is recorded, **Then** modal appears offering to sync balance
2. **Given** sync modal is displayed, **When** user clicks "Update Balance", **Then** CC balance in sidebar decreases by payment amount
3. **Given** sync modal is displayed, **When** user clicks "Skip", **Then** balance remains unchanged
4. **Given** user pays full CC payoff amount, **When** payment recorded, **Then** sync modal still appears for confirmation

---

### User Story 5 - Navigation Sidebar Reorganization (Priority: P2)

User sees a cleaner navigation hierarchy with Settings moved to footer, Setup renamed to Budget Config, and Manage Months repositioned.

**Why this priority**: Navigation clarity improves discoverability and reduces cognitive load.

**Independent Test**: Verify sidebar layout matches new design.

**Acceptance Scenarios**:

1. **Given** user views sidebar, **When** looking at nav items, **Then** order is: Dashboard, Details, (separator), Manage Months, Budget Config
2. **Given** user views sidebar footer, **When** looking at bottom section, **Then** Settings appears as small item in footer after Export/Import
3. **Given** user clicks "Budget Config", **When** Setup page loads, **Then** page functions identically to old "Setup"

---

### User Story 6 - Remove Duplicate Leftover Widget (Priority: P2)

User sees Leftover calculation only in the left sidebar, not duplicated in the header.

**Why this priority**: Removes visual clutter and confusion.

**Independent Test**: Verify header has no Leftover display, sidebar has Leftover box.

**Acceptance Scenarios**:

1. **Given** user is on Details view, **When** viewing header, **Then** no Leftover widget appears
2. **Given** user is on Details view, **When** viewing left sidebar, **Then** Leftover box is displayed

---

### User Story 7 - Bank Accounts Header Color (Priority: P2)

User sees "BANK ACCOUNTS & CASH" header in green color to visually distinguish it from the red debt accounts header.

**Why this priority**: Color coding improves scannability.

**Independent Test**: Verify header color matches #4ade80.

**Acceptance Scenarios**:

1. **Given** user views left sidebar, **When** looking at Bank Accounts section, **Then** header text is green (#4ade80)
2. **Given** user views left sidebar, **When** looking at Credit section, **Then** header text remains red (#f87171)

---

### User Story 8 - Remove Net Worth Display (Priority: P2)

User no longer sees Net Worth row in the left sidebar.

**Why this priority**: Simplifies the sidebar, removes redundant information.

**Independent Test**: Verify Net Worth row is not present in sidebar.

**Acceptance Scenarios**:

1. **Given** user views left sidebar, **When** looking after debt accounts section, **Then** no Net Worth row appears

---

### User Story 9 - Persist Compact Mode (Priority: P2)

User toggles Compact mode. When they return to Details view or reopen the app, Compact mode preference is remembered.

**Why this priority**: User preferences should persist.

**Independent Test**: Enable Compact, leave page, return, verify Compact still enabled.

**Acceptance Scenarios**:

1. **Given** user enables Compact mode, **When** user navigates away and returns, **Then** Compact mode is still enabled
2. **Given** user enables Compact mode, **When** user closes and reopens app, **Then** Compact mode is still enabled

---

### User Story 10 - Scroll Position Stability (Priority: P2)

User creates or edits an item. The page doesn't jump to the top; it stays near where the user was working.

**Why this priority**: Jarring scroll jumps disrupt user focus.

**Independent Test**: Scroll down, add ad-hoc item, verify page doesn't jump to top.

**Acceptance Scenarios**:

1. **Given** user is scrolled partway down the page, **When** user opens an edit drawer, **Then** scroll position is maintained
2. **Given** user adds a new ad-hoc item, **When** item is created, **Then** page scrolls to show the new item (not top of page)
3. **Given** user edits an existing item, **When** edit is saved, **Then** scroll position is maintained

---

### User Story 11 - Remove Delete from Credit Card Payoffs (Priority: P3)

Credit card payoff bill entries are read-only and cannot be deleted. They are dynamically generated based on the payment source configuration.

**Why this priority**: Prevents user confusion - these are system-generated.

**Independent Test**: Verify no delete button appears on CC payoff bill rows.

**Acceptance Scenarios**:

1. **Given** user views a CC payoff bill row, **When** looking at row actions, **Then** no delete button is present
2. **Given** CC payoff bill exists, **When** user wants to remove it, **Then** they must disable pay-off-monthly on the payment source instead

---

### User Story 12 - Generate Anonymized Example Data (Priority: P3)

Developer can generate a varied, realistic example data set by scrubbing the user's actual data. Original data is never modified.

**Why this priority**: Enables demos, testing, and screenshots without exposing personal data.

**Independent Test**: Run script, verify output contains anonymized data, verify original data unchanged.

**Acceptance Scenarios**:

1. **Given** user has budget data, **When** running scrub script, **Then** new anonymized data set is created
2. **Given** scrub script runs, **When** examining output, **Then** names are generic (e.g., "Bill 1", "Income 1")
3. **Given** scrub script runs, **When** examining output, **Then** amounts are randomized ±20%
4. **Given** scrub script runs, **When** examining output, **Then** dates maintain relative patterns but are shifted
5. **Given** scrub script runs, **When** checking original data, **Then** original data is completely unchanged

---

### Edge Cases

- What happens when window size is saved but display configuration changes (e.g., external monitor unplugged)? → Open at last known size, but ensure window is visible on current display
- What happens when all categories are completed/empty? → All still display (at bottom), user can still add items
- What happens when CC payoff payment exceeds current balance? → Show warning but allow it (user may have charged since last balance update)
- What happens when window is too small for even stacked layout? → Set minimum window size (e.g., 600px width)

---

## Requirements

### Functional Requirements

**Window Management**:
- **FR-001**: System MUST persist window dimensions (width, height) across app restarts
- **FR-002**: System MUST use Tauri window APIs to save/restore window size
- **FR-003**: System MUST use sensible default size on first launch

**Responsive Layout**:
- **FR-004**: System MUST stack Bills and Income sections vertically when horizontal scroll would occur
- **FR-005**: System MUST use side-by-side layout when sufficient horizontal space exists
- **FR-006**: System MUST NOT display horizontal scrollbar in main content area

**Navigation**:
- **FR-007**: System MUST rename "Setup" to "Budget Config" in navigation
- **FR-008**: System MUST move "Manage Months" below separator, above "Budget Config"
- **FR-009**: System MUST move "Settings" to footer area as small item

**Visual Cleanup**:
- **FR-010**: System MUST remove Leftover display from Details view header
- **FR-011**: System MUST change "Bank Accounts & Cash" header to green (#4ade80)
- **FR-012**: System MUST remove Net Worth row from left sidebar

**Category States**:
- **FR-013**: System MUST apply strikethrough and reduced opacity to fully-paid category headers
- **FR-014**: System MUST apply strikethrough and reduced opacity to empty category headers
- **FR-015**: System MUST sort completed/empty categories to bottom of list
- **FR-016**: System MUST maintain column alignment when categories are crossed out
- **FR-017**: System MUST keep [+] button functional on completed/empty categories

**Persistence**:
- **FR-018**: System MUST persist Compact mode setting using same mechanism as Zoom
- **FR-019**: System MUST restore Compact mode preference on page load/app restart

**Scroll Behavior**:
- **FR-020**: System MUST maintain scroll position when opening edit drawers
- **FR-021**: System MUST scroll to new item when ad-hoc item is created
- **FR-022**: System MUST maintain scroll position when saving edits

**Credit Card Payoffs**:
- **FR-023**: System MUST NOT display delete button on CC payoff bill rows
- **FR-024**: System MUST display sync modal after CC payoff payment is recorded
- **FR-025**: System MUST offer to update CC balance by payment amount
- **FR-026**: System MUST update CC balance if user confirms sync

**Data Generation**:
- **FR-027**: System MUST provide script to generate anonymized example data
- **FR-028**: Script MUST anonymize names to generic labels
- **FR-029**: Script MUST randomize amounts within ±20%
- **FR-030**: Script MUST shift dates while maintaining relative patterns
- **FR-031**: Script MUST NOT modify original data

---

### Key Entities

- **WindowState**: New entity stored via Tauri (not in data directory)
  - `width`: number - window width in pixels
  - `height`: number - window height in pixels

- **UserPreferences**: Extended settings stored via Tauri Store
  - `compactMode`: boolean - whether compact view is enabled
  - (existing: `zoomLevel`, `widthMode`)

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Window opens at saved size in under 500ms
- **SC-002**: No horizontal scrollbar appears at any window width above 600px
- **SC-003**: Category state changes (paid/empty) reflect visually within 100ms
- **SC-004**: 100% of completed/empty categories appear below active categories
- **SC-005**: CC payoff sync modal appears within 500ms of payment confirmation
- **SC-006**: Scroll position deviation is < 50px when editing items
- **SC-007**: Generated example data contains 0% of original identifying information

---

**Version**: 1.0.0 | **Created**: 2026-01-03
