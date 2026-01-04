# Expenses Management Contract

**Component**: `components/Expenses/` (ExpenseList.svelte, ExpenseForm.svelte, etc.)
**Purpose**: Manage variable expenses and free-flowing expenses with payment source assignment and month-specific tracking

---

## Overview

Expenses component handles both variable expenses (recurring monthly expenses like groceries) and free-flowing expenses (one-time events like birthday presents). Both types do not repeat across months and must be manually re-entered each month.

**Navigation**: Accessible via "Expenses" button in main navigation.

---

## Component Structure

### VariableExpenseList.svelte

**Purpose**: Display and manage variable expenses for the current month.

**Props**:

```typescript
interface Props {
  expenses?: VariableExpense[];
  paymentSources?: PaymentSource[];
  categories?: Category[];
  currentMonth?: string; // 'YYYY-MM' format
  onEdit?: (expense: VariableExpense) => void;
  onDelete?: (id: string) => void;
}
```

**Display Format**:

```
┌──────────────────────────────────────────┐
│  [Filter: All ▾]  [Sort: Date ↓]  [Add Expense]  │
├───────────────────────────────────────────┤
│                                                │
│  ┌─────────────────────────────────────────────┐ │
│  │ [Icon] Name | Amount | Date | Source    │  │
│  ├─────────────────────────────────────────────┤ │
│  │ 🛒 Groceries   $600  Dec 15   Scotia  [Edit] [Delete]│  │
│  │ 🎂 Clothing    $200  Dec 20   Scotia  [Edit] [Delete]│  │
│  │ 💐 Gas         $80    Dec 10   Cash   [Edit] [Delete]│  │
│  │ 🎁 Utilities   $150   Dec 05   Visa   [Edit] [Delete]│  │
│  │ ...                                    [Edit] [Delete]│  │
│  └─────────────────────────────────────────────┘ │
│                                                │
│  ┌─────────────────────────────────────────────┐ │
│  │  Total Variable: $1,030                   │  │
│  └─────────────────────────────────────────────┘ │
│  [Show Free-Flowing Expenses ▾]               │
└──────────────────────────────────────────────────────────┘
```

**Features**:

- **Filter by Payment Source**: Dropdown (All, Scotia, Visa, Cash, etc.)
- **Sort Options**: Date (newest first), Amount (high-low, low-high), Name (A-Z, Z-A)
- **Search**: Filter expenses by name
- **Quick Actions**: Inline [Add Expense] button, multi-select [Delete] (for batch delete - optional future feature)
- **Inline Edit**: Click expense name or amount to edit inline (no modal)
- **Empty State**: "No variable expenses yet. Click 'Add Expense' to get started."
- **Total Display**: Show sum at bottom of list
- **View Toggle**: Switch between "Variable Expenses" and "Free-Flowing Expenses"
- **Date Display**: Show expense date (editable field)

**Events**:

- `on:click={onEdit(expense)}` - Opens inline edit form
- `on:click={onDelete(expense.id)}` - Shows confirmation: "Delete [Expense Name]?"
- Multi-select for delete (future): Checkboxes for batch delete

---

### FreeFlowingExpenseList.svelte

**Purpose**: Display and manage free-flowing (ad-hoc, one-time) expenses.

**Props**:

```typescript
interface Props {
  freeFlowingExpenses?: FreeFlowingExpense[];
  paymentSources?: PaymentSource[];
  categories?: Category[];
  currentMonth?: string;
  onEdit?: (expense: FreeFlowingExpense) => void;
  onDelete?: (id: string) => void;
}
```

**Display Format**: Similar to VariableExpenseList but separate toggle

**Features**:

- **Quick-Add Button**: "Add Free-Flowing Expense" - emphasized (larger, different color)
- **Separate from Variable**: Distinct list with different color coding
- **Filter by Payment Source**: Works same as variable expenses
- **Sort Options**: Same as variable expenses
- **Search**: Filter free-flowing expenses by name
- **Total Display**: Show sum at bottom
- **Empty State**: "No one-time expenses yet. Click 'Add Free-Flowing Expense' to track birthday presents or unexpected bills."

---

### VariableExpenseForm.svelte (Inline)

**Purpose**: Inline form for adding or editing variable expenses quickly.

**Props**:

```typescript
interface Props {
  expense?: VariableExpense | null;
  paymentSources?: PaymentSource[];
  categories?: Category[];
  onSave: (expense: Omit<VariableExpense>) => void;
  onCancel: () => void;
  mode?: 'add' | 'edit';
}
```

**Form Layout**:

```
┌──────────────────────────────────────────┐
│                                                │
│  ┌─────────────────────────────────────────────┐ │
│  │ [Icon] Name *                                │  │
│  ├─────────────────────────────────────────────┤ │
│  │ $ [────────────────────────────────────]  .00  │  │
│  └─────────────────────────────────────────────┘ │
│                                                │
│  ┌─────────────────────────────────────────────┐ │
│  │ Payment Source *                              │  │
│  ├─────────────────────────────────────────────┤ │
│  │ [Scotia Checking ▾]               │  │
│  │  Visa                                    │  │
│  │  Cash                                     │  │
│  └─────────────────────────────────────────────┘ │
│                                                │
│  ┌─────────────────────────────────────────────┐ │
│  │ Category (optional) *                    │  │
│  ├─────────────────────────────────────────────┤ │
│  │ [Home ▾]                              │  │
│  │  Streaming                                 │  │
│  │  Debt                                     │  │
│  │  Entertainment                              │  │
│  └─────────────────────────────────────────────┘ │
│                                                │
│  ┌─────────────────────────────────────────────┐ │
│  │ Date *                                  │  │
│  ├─────────────────────────────────────────────┤ │
│  │ 2025-12-29               │  │
│  │  (date picker)                       │  │
│  └─────────────────────────────────────────────┘ │
│                                                │
│  ┌─────────────────────────────────────────────┐ │
│  │                  [Cancel]  [Save Expense]    │  │
│  └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**Fields**:

- **Name**: Text input, required, max 100 chars, auto-focused
- **Amount**: Currency input ($, , formatting), required, > 0, max 9 digits
- **Payment Source**: Required dropdown (from payment sources store)
- **Category**: Optional dropdown (8 pre-defined categories)
- **Date**: Date input (default to today) - auto-formats to YYYY-MM-DD
- **[Save Expense]** button - submits form
- **[Cancel]** button - closes form

**Behaviors**:

- **Auto-focus**: Name field focused on mount or "Add Expense" click
- **Currency formatting**: Auto-add $, commas as user types, strip on blur
- **Enter key submits**: No need to click Save button (faster workflow)
- **Escape key cancels**: Closes form without saving
- **Inline validation**: Real-time error messages below fields

---

### FreeFlowingExpenseForm.svelte (Modal)

**Purpose**: Modal form for adding free-flowing (one-time) expenses with emphasis on their quick, ad-hoc nature.

**Props**:

```typescript
interface Props {
  expense?: FreeFlowingExpense | null;
  paymentSources?: PaymentSource[];
  categories?: Category[];
  onSave: (expense: Omit<FreeFlowingExpense>) => void;
  onCancel: () => void;
}
```

**Form Layout**:

```
┌───────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                │ │
│  │  🎁 Add a One-Time Expense                      │ │
│  │                                                │ │
│  │                                                │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  ┌───────────────────────────────────────────────────────┐ │
│  │  │                                                │ │
│  │  │  What's the expense?                   │ │
│  │  ├───────────────────────────────────────────────────────┤ │
│  │  │ 📝 Name *                                │ │
│  │  │ [Birthday Present]                       │ │
│  │  ├─────────────────────────────────────────────────────┤ │
│  │  │ $ [────────────────────────────────────]  .00  │ │
│  │  │ [X]                                       │  │
│  │  └─────────────────────────────────────────────────────┘ │
│  │                                                │
│  ├───────────────────────────────────────────────────────┤ │
│  │  ┌───────────────────────────────────────────────────────┐ │
│  │  │  💰 Amount *                             │ │
│  │  │ $ [────────────────────────────────────]  .00   │  │
│  │  ├─────────────────────────────────────────────────────┤ │
│  │  │ [50]  [$100] [$200] [$500] [$1,000] │  │
│  │  └─────────────────────────────────────────────────────┘ │
│  │                                                │
│  ├───────────────────────────────────────────────────────┤ │
│  │  ┌───────────────────────────────────────────────────────┐ │
│  │  │  💳 Payment Source *                       │
│  │  │ [Scotia Checking ▾]                       │
│  │  │  Visa                                      │
│  │  │  Cash                                      │
│  │  └─────────────────────────────────────────────────────┘ │
│  │                                                │
│  ├───────────────────────────────────────────────┤ │
│  │  ┌───────────────────────────────────────────────────────┐ │
│  │  │ 🗓️ Date *                                │
│  │  │ [2025-12-25]                          │
│  │  │  (date picker)                           │
│  │  └──────────────────────────────────────────────────────┘ │
│  │                                                │
│  └───────────────────────────────────────────────────────────┘ │
│                                                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  [Notes] (optional)                      │  │
│  │  ┌───────────────────────────────────────────────────────┐ │
│  │  │ 💭 E.g., Birthday gift for sister,   │
│  │  │ unexpected car repair                    │
│  │  └──────────────────────────────────────────────────────┘ │
│  └───────────────────────────────────────────────────────┘ │
│                                                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  [Cancel]          [Add Free-Flowing Expense]    │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

**Fields**:

- **Name**: Text input, required, max 100 chars, auto-focused
- **Amount**: Currency input ($, , formatting), required, > 0, max 9 digits
- **Payment Source**: Required dropdown (from payment sources store)
- **Date**: Date input (default to today) - auto-formats to YYYY-MM-DD
- **Notes**: Optional textarea (max 200 chars) - for context
- **[Add Free-Flowing Expense]** button - submits form (larger, emphasized)
- **[Cancel]** button - closes modal

**Behaviors**:

- **Modal overlay**: Centers on screen with backdrop
- **Escape key**: Closes modal without saving
- **Click outside**: Closes modal (with confirmation if unsaved changes)
- **Larger header/emphasis**: Distinct styling from regular expense form
- **Quick add presets**: Buttons with common amounts ($50, $100, $200, $500) for faster entry

---

### Shared Components

### QuickAddExpenseButton.svelte

**Purpose**: Floating action button for quickly adding an expense from anywhere in the app.

**Props**:

```typescript
interface Props {
  mode: 'variable' | 'free_flowing';
  onClick: () => void;
}
```

**Display**:

- **Variable Mode**: Icon + "Add Expense" (smaller)
- **Free-Flowing Mode**: Icon + "Add Free-Flowing Expense" (larger, emphasized)

**Behavior**: When clicked, opens appropriate form (inline for variable, modal for free-flowing)

---

### ExpenseFilterSort.svelte

**Purpose**: Combined component for filter dropdown and sort options.

**Props**:

```typescript
interface Props {
  filterType: 'payment_source' | 'category';
  onFilterChange: (filter: string) => void;
  onSortChange: (sort: string) => void;
  paymentSources?: PaymentSource[];
  categories?: Category[];
}
```

**Layout**:

```
┌─────────────────────────────────────────────────────┐
│  Filter By:  [Payment Source ▾] [Category ▾]  [Clear] │
├───────────────────────────────────────────────────┤
│  Sort By:    [Date ↓] [Name A-Z] [Amount ↓]   │
└───────────────────────────────────────────────────┘
```

**Behavior**: Updates parent component's filter and sort state

---

## Data Flow

### Add Variable Expense

```
User fills form
    ↓
User clicks [Save Expense] (or presses Enter)
    ↓
[Save] button dispatches expensesStore.add(expense)
    ↓
Auto-save triggers:
  - Add to data/months/YYYY-MM.json (expenses array)
  - Update expensesStore (reactive)
  - Trigger dashboard recalculation (leftover)
    ↓
UI updates reactively (list shows new expense)
    ↓
Undo stack updated (pushChange triggered)
```

### Add Free-Flowing Expense

```
User clicks [Add Free-Flowing Expense]
    ↓
FreeFlowingExpenseForm modal opens
    ↓
User fills form and clicks [Add Free-Flowing Expense]
    ↓
[Save] button dispatches expensesStore.add(expense)
    ↓
Auto-save triggers:
  - Add to data/months/YYYY-MM.json (free_flowing_expenses array)
  - Update expensesStore (reactive)
  - Trigger dashboard recalculation (leftover)
    ↓
UI updates reactively (list shows new expense)
    ↓
Undo stack updated (pushChange triggered)
```

### Edit Expense

```
User clicks [Edit] on expense
    ↓
Inline edit form appears (or modal for free-flowing)
    ↓
User modifies fields
    ↓
User presses Enter or clicks [Save Expense]
    ↓
[Save] button dispatches expensesStore.update(id, updates)
    ↓
Auto-save triggers:
  - Update data/months/YYYY-MM.json (expenses array)
  - Update expensesStore (reactive)
  - Trigger dashboard recalculation (leftover)
    ↓
UI updates reactively (list shows updated expense)
    ↓
Undo stack updated (pushChange triggered)
```

### Delete Expense

```
User clicks [Delete] on expense
    ↓
Inline confirmation: "Delete [Expense Name]?"
    ↓
User confirms
    ↓
Dispatch expensesStore.delete(id)
    ↓
Auto-save triggers:
  - Remove from data/months/YYYY-MM.json (expenses array)
  - Update expensesStore (reactive)
  - Trigger dashboard recalculation (leftover)
    ↓
UI updates reactively (expense removed from list)
    ↓
Undo stack NOT updated (delete is not undoable by spec)
```

---

## State Management

### Svelte Store (stores/expenses.ts)

```typescript
interface ExpensesStore extends Writable<ExpensesState> {
  variable: VariableExpense[];
  freeFlowing: FreeFlowingExpense[];
  actions: {
    addVariable: (expense: VariableExpense) => void;
    addFreeFlowing: (expense: FreeFlowingExpense) => void;
    update: (id: string, updates: Partial<VariableExpense | FreeFlowingExpense>) => void;
    delete: (id: string) => void;
  };
}
```

**Store Usage**:

```typescript
// In ExpenseList components
$: variable = expensesStore.variable;
$: freeFlowing = expensesStore.freeFlowing;

$: totalVariable = calculateTotal($variable);
$: totalFreeFlowing = calculateTotal($freeFlowing);

function calculateTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, exp) => sum + exp.amount, 0);
}
```

---

## Validation Rules

### Common Rules (Both Types)

- **Name**: Required, not blank or whitespace only, max 100 chars, trimmed
- **Amount**: Required, > 0, max 9 digits, currency format ($X,XXX.XX)
- **Payment Source**: Required, must reference existing PaymentSource
- **Date**: Required, valid date format, not in future

### Variable Expense Specific

- Category: Optional, if provided must reference existing Category
- Notes: Max 200 chars for inline form

### Free-Flowing Expense Specific

- Notes: Max 200 chars (for modal)
- **Date**: Defaults to today
- **Category**: Optional

---

## Error Handling

### Inline Validation Errors

- **Name**: "Expense name is required" (below field, red text)
- **Amount**: "Amount must be greater than $0" (below field, red text)
- **Payment Source**: "Please add a payment source first" (if dropdown empty)

### Save Errors

- **File Write Failure**: Show toast notification "Failed to save expense. Please try again."
- **Duplicate Name**: Show warning but allow save (user may have legitimate duplicate needs)

---

## Responsive Design

### Desktop (> 1200px wide)

```
┌───────────────────────────────────────────────────────────────┐
│                                                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  [Filter]  [Sort]  [Add Expense]                 │  │
│  ├───────────────────────────────────────────────────────┤ │
│  │                                              │  │
│  │  ┌───────────────────────────────────────────────────────┐ │
│  │  │ ┌─────────────────────────────────────────────────────┐ │  │
│  │  │  │ 🛒 Groceries  $600  Dec 15  Scotia    │  │  │
│  │  │  💰 Amount: [$ Edit] [Delete]            │  │  │
│  │  │  💳 Payment: [Scotia Checking ▾]           │  │  │
│  │  │  🗓️ Date: 2025-12-29                │  │  │
│  │  │  📝 Notes: (optional)                    │  │  │
│  │  │  └─────────────────────────────────────────────────────┘ │  │
│  │  └─────────────────────────────────────────────────────┘ │
│  │                                              │
│  │                                              │
│  │  ┌─────────────────────────────────────────────────────┐ │
│  │  │  💐 Gas         $80  Dec 10   Cash       │  │  │
│  │  │  💰 Amount: [$ Edit] [Delete]            │  │  │
│  │  │  💳 Payment: [Scotia Checking ▾]           │  │  │
│  │  │  🗓️ Date: 2025-12-10                │  │  │
│  │  │  └─────────────────────────────────────────────────────┘ │
│  │  └─────────────────────────────────────────────────────┘ │
│  │                                              │
│  └─────────────────────────────────────────────────────┘ │
│                                                │
│  Total Variable: $1,030                          │
└───────────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1200px wide)

```
┌─────────────────────────────────────────────────┐
│  [Filter]  [Sort]  [Add Expense]       │
├────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐ │
│  │ 🛒 Groceries  $600  Dec 15   [Edit] [Delete]│
│  │  💳 Payment: Scotia     [Edit] [Delete]│
│  │  🗓️ Date: 2025-12-29    [Edit] [Delete]│
│  └────────────────────────────────────────────────┘
│                                                │
└─────────────────────────────────────────────────┘
```

### Mobile (< 768px wide)

```
[Add Expense]    [Filter: All ▾]  [Sort: Date ↓]
┌─────────────────────────────────────────────────────┐
│ 🛒 Groceries  $600  [Edit] [Delete]            │
│ 💳 Payment: Scotia     [Edit] [Delete]            │
│ 🗓️ Date: 2025-12-29    [Edit] [Delete]            │
└─────────────────────────────────────────────────────┘
```

---

## Edge Cases

### Empty States

- **No Variable Expenses**: "No variable expenses yet. Click 'Add Expense' to get started."
- **No Free-Flowing Expenses**: "No one-time expenses yet. Click 'Add Free-Flowing Expense' to track birthday presents or unexpected bills."

### Month Navigation

- **Navigating to New Month**: Variable expenses and free-flowing expenses do NOT carry over. Both arrays empty in new month.
- **Returning to Previous Month**: Data persists in monthly file, no changes lost.

### Delete with Undo

- If user undoes after deleting expense: Expense is restored to list
- Delete itself is not undoable (per spec FR-034, "LIFO - last in, first out")

### Payment Source Conflicts

- **Payment Source Deleted**: Show error "Cannot delete [Payment Source Name]. [N] bills/expenses/incomes are assigned to this payment source. Please reassign those to another source or delete them first."
- **Block deletion** until payment source is removed from all bills/expenses/incomes

---

## Success Criteria

- User can add variable expense with payment source in under 30 seconds
- User can add free-flowing expense with payment source in under 30 seconds
- User can edit expense amount in under 10 seconds (inline edit)
- User can delete expense (with confirmation) in under 5 seconds
- Total variable expenses calculates and displays accurately
- Total free-flowing expenses calculates and displays accurately
- Expenses list is sortable and filterable without page reload
- Form validation is real-time with clear error messages
- Empty states are handled gracefully with helpful messages
- Inline editing is fast and intuitive (no modal needed for variable expenses)
- Free-flowing expense form is distinct from regular expense form (clear visual distinction)
