# Incomes Management Contract

**Component**: `components/Incomes/` (IncomeList.svelte, IncomeForm.svelte, etc.)
**Purpose**: Manage income sources with different billing periods and payment source assignment

---

## Overview

Incomes component handles all income-related functionality: listing income sources, adding/editing incomes, and assigning payment sources.

**Navigation**: Accessible via "Incomes" button in main navigation.

---

## Component Structure

### IncomeList.svelte

**Purpose**: Display list of all income sources (default definitions) with filtering, sorting, and quick actions.

**Props**:

```typescript
interface Props {
  incomes?: Income[]; // Default income sources (templates)
  incomeInstances?: IncomeInstance[]; // Monthly instances
  categories?: Category[]; // For filtering (optional future feature)
  currentMonth?: string; // Current viewing month
  onEdit?: (income: Income | IncomeInstance) => void;
  onDelete?: (id: string) => void;
}
```

**Display Format**:

```
┌──────────────────────────────────────────────────┐
│                                              │
│  ┌────────────────────────────────────────────────┐ │
│  │                                            │  │
│  │ [Add Income]                                │  │
│  ├────────────────────────────────────────────────┤ │
│  │                                            │  │
│  │  [Icon] Name | Amount | Period | Source     │  │
│  │  ┌──────────────────────────────────────────┐ │  │
│  │  │ 💰 Salary      $5,000  Monthly  Scotia  [Edit] [Delete]│  │
│  │  │ 💰 Freelance    $1,000  Bi-weekly Scotia  [Edit] [Delete]│  │
│  │  │ 💰 Bonus        $500    Monthly  Scotia  [Edit] [Delete]│  │
│  │  │ 💰 Side Hustle  $300  Weekly   Cash     [Edit] [Delete]│  │
│  │  └───────────────────────────────────────────┘ │  │
│  │                                            │  │
│  └────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

**Features**:

- **Filter by Category**: Dropdown or button group (optional future feature)
- **Sort Options**: Name (A-Z, Z-A), Amount (High-Low, Low-High), Period (monthly, bi-weekly, weekly)
- **Toggle View**: Switch between "Default Incomes" (templates) and "Month Instances" (for current month)
- **Inline Actions**: [Edit] and [Delete] buttons on each row
- **Empty State**: "No incomes yet. Click 'Add Income' to get started."
- **Total Income Display**: Show sum of all incomes (default or instances based on view)
- **Search**: Filter incomes by name
- **Multi-select**: Can select multiple incomes (for batch delete - optional future feature)

**Events**:

- `on:click={onEdit(income)}` - Opens edit form
- `on:click={onDelete(income.id)}` - Shows delete confirmation

---

### IncomeForm.svelte

**Purpose**: Form for adding or editing incomes. Can be used inline (in Setup page) or as modal (in Incomes page).

**Props**:

```typescript
interface Props {
  income?: Income | IncomeInstance; // If provided, editing existing
  paymentSources?: PaymentSource[]; // For payment source dropdown
  categories?: Category[]; // For category dropdown (optional future feature)
  mode?: 'inline' | 'modal'; // Inline (Setup) or modal
  onSave: (income: Omit<Income | IncomeInstance>) => void; // Callback when saved
  onCancel: () => void; // Cancel button (modal only)
}
```

**Form Layout**:

```
┌──────────────────────────────────────────┐
│  Name *                                        │
│  [────────────────────────────────────]    │
│                                                │
│  Amount *                                       │
│  $ [────────────────────────────────────] .00    │
│                                                │
│  Billing Period *                               │
│  [Monthly ▾]                                   │
│                                                │
│  Payment Source *                               │
│  [Scotia Checking ▾]                           │
│                                                │
│  Category (optional)                          │
│  [Home ▾]                                    │
│                                                │
│  [Cancel] [Save Income]                      │
└──────────────────────────────────────────────────┘
```

**Fields**:

- **Name**: Text input, required, max 100 chars, trimmed
- **Amount**: Currency input ($, , formatting), required, > 0, max 9 digits
- **Billing Period**: Dropdown (Monthly, Bi-weekly, Weekly, Semi-annually)
- **Payment Source**: Dropdown populated from payment sources store
- **Category**: Optional dropdown (future feature, not required for MVP)
- **Save Button**: "Save Income" (inline) or "Update" (modal)
- **Cancel Button**: "Cancel" (modal only)

**Validation**:

- Real-time validation as user types
- Error messages below each field (red text)
- Save button disabled until all validations pass
- Currency formatting on blur (auto-add $, commas)

**Behaviors**:

- Default monthly selected by default
- Auto-focus Name field on mount or "Add New" click
- Enter key submits form (no need to click Save)
- Escape key cancels (modal only) without saving
- Currency formatting auto-applies ($X,XXX.XX)

---

### EditIncomeModal.svelte

**Purpose**: Modal overlay for editing existing incomes (default definitions or monthly instances).

**Props**:

```typescript
interface Props {
  income: Income | IncomeInstance; // Income to edit
  paymentSources: PaymentSource[];
  categories: Category[];
  onSave: (income: Omit<Income | IncomeInstance>) => void;
  onClose: () => void;
}
```

**Features**:

- **Pre-fill**: All fields populated from existing income data
- **Type Indicator**: Show "Editing Default Income" or "Editing Month Instance"
- **Billing Period Warning**: If editing default income, show warning: "This changes the template for all future months. Current month will use this new value unless you re-edit it."
- **Category Selection**: Optional dropdown (if implemented)
- **Delete Button**: Soft delete option (with confirmation)
- **Save Button**: "Update Income"
- **Cancel Button**: "Cancel"

**Modal Behavior**:

- Opens centered overlay with backdrop
- Click outside closes modal (with confirmation if unsaved changes)
- Prevents body scroll when modal is open

---

## Data Flow

### Add Income

```
User fills form
    ↓
User clicks [Save Income] (or presses Enter)
    ↓
[Save] button dispatches incomesStore.add(income)
    ↓
Auto-save triggers:
  - If mode === 'default' (Setup page):
    → Save to data/entities/incomes.json
  - If mode === 'instance' (current month):
    → Add to data/months/YYYY-MM.json (income_instances array)
    ↓
UI updates reactivily (Svelte store subscription)
    ↓
Auto-save to localStorage (optional persistence across sessions)
```

### Edit Income

```
User clicks [Edit] on income
    ↓
EditIncomeModal opens with income data pre-filled
    ↓
User modifies fields
    ↓
User clicks [Update Income]
    ↓
[Update] button dispatches:
  - incomesStore.update(id, updates) (if editing default)
  - OR: Update current month's income instance directly
    ↓
Auto-save triggers:
  - If editing default: Update data/entities/incomes.json
  - If editing instance: Update data/months/YYYY-MM.json
    ↓
UI updates reactivily
```

### Delete Income

```
User clicks [Delete] on income
    ↓
Inline confirmation: "Delete [Income Name]?"
    ↓
User confirms
    ↓
Dispatch incomesStore.softDelete(id)
    ↓
Auto-save triggers:
  - If editing default: Update data/entities/incomes.json (is_active = false)
  - If editing instance: Remove from data/months/YYYY-MM.json
    ↓
UI updates reactivily (income removed from list)
```

---

## Filtering and Sorting

### Category Filtering (Future Feature)

```
User selects category from dropdown
    ↓
Filter state: selectedCategory = 'Home'
    ↓
IncomeList.svelte filters displayed incomes:
  - Default incomes: Filter by category_id match
  - Month instances: Filter by category_id match (if category_id exists)
    ↓
Total Income card updates to show filtered total
```

### Sorting Options

```
User selects sort option
    ↓
Sorted incomes displayed in order:
  - Name A-Z: Alphabetically by name
  - Name Z-A: Reverse alphabetical
  - Amount High-Low: Descending by amount
  - Amount Low-High: Ascending by amount
  - Period: Monthly → Bi-weekly → Weekly → Semi-annually
```

---

## Default vs Instance Distinction

### Visual Indicators

```
┌───────────────────────────────────────────────────────────┐
│                                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                            │  │
│  │  [Icon] Name | Amount | Period | Source |   │  │
│  │  💰 Salary      $5,000  Monthly  Scotia  [Edit] [Delete]   │  │
│  │                                            │  │
│  │  ★ = Default bill                        [Edit] [Delete]   │  │
│  │                                            │  │
│  │  💰 Freelance    $1,000  Bi-weekly Scotia  [Edit] [Delete]   │  │
│  │    = Month instance (customized)           [Edit] [Delete]   │  │
│  └───────────────────────────────────────────────────┘ │  │
└───────────────────────────────────────────────────────────┘
```

- **Default Incomes**: Star icon (★) or subtle border
- **Month Instances**: Dot icon (•) or different background color
- **Customized Instances**: Dot icon (•) or different background color
- `is_default: false` flag determines visual indicator

---

## Responsive Design

### Desktop (> 1200px wide)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Add Income]  [Filter: All ▾]  [Sort: Name ↓]  [Show: Default ▾]             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [Icon] Name | Amount | Period | Source      [Edit] [Delete]      │
│  ┌──────────────────────────────────────────────────┐                     │
│  │ 💰 Salary      $5,000  Monthly  Scotia   [Edit] [Delete]     │
│  │ 💰 Freelance    $1,000  Bi-weekly Scotia   [Edit] [Delete]     │
│  │ 💰 Bonus        $500    Monthly  Scotia   [Edit] [Delete]     │
│  │ 💰 Side Hustle  $300  Weekly   Cash     [Edit] [Delete]     │
│  └───────────────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1200px wide)

```
┌────────────────────────────────────┐
│  [Add Income]  [Filter: All ▾]  [Sort: Name ↓]  │
├────────────────────────────────────┤
│  [Icon] Name | Amount | Period | Source      [Edit] [Delete]  │
│  💰 Salary      $5,000  Monthly  Scotia   [Edit] [Delete]      │
│  💰 Freelance    $1,000  Bi-weekly Scotia   [Edit] [Delete]      │
│  ...                                                │
└────────────────────────────────────┘
```

### Mobile (< 768px wide)

```
┌──────────────────┐
│  [Add Income]   │
├─────────────────┤
│  [Icon] Name    │
│  💰 Salary $5,000│
│  [Edit] [Delete]│
└─────────────────┘
```

---

## State Management

### Svelte Store (stores/incomes.ts)

```typescript
interface IncomesStore extends Writable<IncomesState> {
  defaults: Income[];
  instances: Record<string, IncomeInstance[]>; // Key = month ('YYYY-MM')
  actions: {
    add: (income: Income) => void;
    update: (id: string, updates: Partial<Income>) => void;
    delete: (id: string) => void;
    softDelete: (id: string) => void;
  };
}
```

**Store Usage**:

```typescript
// In Income List component
$: defaults = incomesStore.defaults; // Display all default incomes
$: instances = incomesStore.instances[currentMonth]; // Display current month's incomes
$: totalIncome = calculateTotalIncome($instances);

// In Income Form component
$: currentPaymentSources = paymentSourcesStore.paymentSources;
$: currentCategories = categoriesStore.categories;

function calculateTotalIncome(instances: IncomeInstance[]): number {
  return instances.reduce((sum, inc) => sum + inc.amount, 0);
}
```

---

## Edge Cases

### Empty States

- **No Default Incomes**: Show message "No income sources set up yet. Click 'Add Income' to get started."
- **No Month Instances**: Show message "No incomes for [Month]. Add income or generate month data."

### Editing Conflicts

- **Edit Default While Using Instance**: If user edits default income, show warning: "You're editing the template. This changes all future months that use this income. Current month will use this new value unless you re-edit it."

### Multiple Payment Sources

- Show warning if adding/editing income when no payment sources exist: "Please add a payment source first."
- Allow income to be added without payment source (optional), but show warning: "No payment source assigned. You can add one later."

---

## Success Criteria

- User can add first income with payment source in under 30 seconds
- User can add income with different billing period (bi-weekly, weekly) in under 45 seconds
- User can edit income amount in under 10 seconds
- Filtering by category works smoothly without page reload
- Sorting options apply correctly without data loss
- Visual distinction between default incomes and month instances is clear at a glance
- Inline form validation errors are clear and actionable
- Auto-save completes within 100ms (debounce + file write)
- Empty states are handled gracefully with helpful messages
