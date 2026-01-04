# Bills Management Contract

**Component**: `components/Bills/` (BillList.svelte, BillForm.svelte, etc.)
**Purpose**: Manage monthly bills with different billing periods, flexible editing, and payment source assignment

---

## Overview

Bills component handles all bill-related functionality: listing bills, adding/editing bills (both default definitions and monthly instances), deleting bills, and filtering by categories.

**Navigation**: Accessible via "Bills" button in main navigation.

---

## Component Structure

### BillList.svelte

**Purpose**: Display list of all bills (default definitions) with filtering, sorting, and quick actions.

**Props**:

```typescript
interface Props {
  bills?: Bill[]; // Default bills (templates)
  billInstances?: BillInstance[]; // Monthly instances
  categories?: Category[]; // For filtering
  currentMonth?: string; // Current viewing month
  onEdit?: (bill: Bill | BillInstance) => void;
  onDelete?: (id: string) => void;
}
```

**Display Format**:

```
┌──────────────────────────────────────────────────┐
│  [Filter: All ▾] [Sort: Name ↓]  │
├─────────────────────────────────────────────────┤
│                                                │
│  [Add Bill]                                    │
│                                                │
│  ┌────────────────────────────────────────────────┐ │
│  │ [Icon] Name | Amount | Period | Source |   │ │
│  │─────────────────────────────────────────────────┤ │
│  │ 🏠 Rent     $1,500  Monthly  Scotia   [Edit] [Delete]│ │
│  │ 🏢 Internet   $80     Monthly  Scotia   [Edit] [Delete]│ │
│  │ 🏠 Car Insurance $268   Bi-weekly Visa      [Edit] [Delete]│ │
│  │ 📱 Groceries   $80     Weekly    Scotia   [Edit] [Delete]│ │
│  │ └─────────────────────────────────────────────────┘ │
│                                                │
│  [Show: Default Bills (12) or Month Instances (5)] │
└──────────────────────────────────────────────────┘
```

**Features**:

- **Filter by Category**: Dropdown or button group (Home, Debt, Streaming, etc.)
- **Sort Options**: Name (A-Z, Z-A), Amount (High-Low, Low-High), Period (monthly, bi-weekly, weekly)
- **Toggle View**: Switch between "Default Bills" (templates) and "Month Instances" (for current month)
- **Inline Actions**: [Edit] and [Delete] buttons on each row
- **Empty State**: "No bills yet. Click 'Add Bill' to get started."
- **Search**: Filter bills by name
- **Total Fixed Costs**: Display sum of all bills (showing calculation basis)

**Events**:

- `on:click={onEdit(bill)}` - Opens edit form
- `on:click={onDelete(bill.id)}` - Shows delete confirmation

---

### BillForm.svelte

**Purpose**: Form for adding or editing bills. Can be used inline (in Setup page) or as modal (in Bills page).

**Props**:

```typescript
interface Props {
  bill?: Bill | BillInstance; // If provided, editing existing bill
  paymentSources?: PaymentSource[]; // For dropdown
  categories?: Category[]; // For dropdown
  onSave: (bill: Omit<Bill>) => void; // Callback when saved
  onCancel: () => void; // Callback when cancelled (modal only)
  mode?: 'inline' | 'modal'; // Inline (Setup page) or modal (Bills page)
}
```

**Form Layout**:

```
┌──────────────────────────────────────────────────┐
│                                                │
│  Name *                                        │
│  [────────────────────────────────────────────]    │
│                                                │
│  Amount *                                      │
│  $ [────────────────────────────────────]  .00      │
│                                                │
│  Billing Period *                                │
│  [Monthly ▾]                              │
│                                                │
│  Payment Source *                              │
│  [Scotia Checking ▾]                        │
│                                                │
│  Category (optional)                          │
│  [Home ▾]                                    │
│                                                │
│  [Cancel]  [Save Bill]                        │
└──────────────────────────────────────────────────┘
```

**Fields**:

- **Name**: Text input, required, max 100 chars, trimmed
- **Amount**: Currency input ($, , formatting), required, > 0, max 12 digits
- **Billing Period**: Dropdown (Monthly, Bi-weekly, Weekly, Semi-annually)
- **Payment Source**: Dropdown populated from payment sources store
- **Category**: Dropdown (8 pre-defined + custom categories)

**Validation**:

- Real-time validation as user types
- Error messages below each field (red text)
- Save button disabled until all validations pass
- Inline error summary at bottom of form

**Behaviors**:

- **Default Monthly**: Monthly selected by default
- **Auto-focus**: Name field auto-focused on mount or on "Add New" click
- **Enter key submits**: No need to click "Save" button
- **Escape key cancels**: Closes modal without saving (modal mode only)
- **Currency formatting**: Auto-format to $X,XXX.XX on blur
- **Strip symbols**: Remove $, commas on input

---

### EditBillModal.svelte

**Purpose**: Modal overlay for editing existing bills (default definitions or monthly instances).

**Props**:

```typescript
interface Props {
  bill: Bill | BillInstance; // Bill to edit
  paymentSources: PaymentSource[];
  categories: Category[];
  onSave: (bill: Omit<Bill | BillInstance>) => void;
  onClose: () => void;
}
```

**Features**:

- **Pre-fill**: All fields populated from existing bill data
- **Type Indicator**: Show whether editing "Default Bill" or "Month Instance"
- **Billing Period Warning**: If editing default bill, show warning: "This changes the template for all future months. Current month will use this new value unless you re-edit it."
- **Category Selection**: Dropdown with pre-defined categories
- **Delete Button**: Soft delete option (with confirmation)
- **Save Button**: Update bill in store, triggers auto-save

---

## Data Flow

### Add Bill

```
User fills form
    ↓
User clicks [Save] (or presses Enter)
    ↓
[Save] button dispatches billsStore.add(bill)
    ↓
Auto-save triggers:
  - If mode === 'default' (Setup page or BillList default view):
    → Save to data/entities/bills.json
  - If mode === 'instance' (current month instance):
    → Add to data/months/YYYY-MM.json (bill_instances array)
    ↓
UI updates reactivily (Svelte store subscription)
```

### Edit Bill

```
User clicks [Edit] on bill
    ↓
EditBillModal opens with bill data pre-filled
    ↓
User modifies fields
    ↓
User clicks [Save]
    ↓
[Save] button dispatches:
  - billsStore.update(id, updates) - If editing default bill
  - OR: Update current month's bill instance directly
    ↓
Auto-save triggers:
  - If default bill edited: Update data/entities/bills.json
  - If instance edited: Update data/months/YYYY-MM.json
    ↓
UI updates reactivily
```

### Delete Bill

```
User clicks [Delete] on bill
    ↓
Inline confirmation: "Delete [Bill Name]?"
    ↓
User confirms
    ↓
Dispatch billsStore.softDelete(id) OR dispatch undoStore.pushChange(...)
    ↓
Auto-save triggers:
  - Set bill.is_active = false (soft delete)
  - Save to appropriate JSON file
    ↓
UI updates reactivily
```

---

## Filtering and Sorting

### Category Filtering

```
User selects category from dropdown
    ↓
Filter state: selectedCategory = 'Home'
    ↓
BillList.svelte filters displayed bills:
  - Default bills: Filter by category_id match
  - Month instances: Filter by category_id match (bill.category_id)
    ↓
Total Fixed Costs card updates to show filtered total
```

### Sorting Options

```
User selects sort option
    ↓
Sorted bills displayed in order:
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
┌──────────────────────────────────────────────────┐
│                                                │
│  ┌────────────────────────────────────────────────┐ │
│  │ [Icon] Name | Amount | Period | Source |   │ │
│  │ 📝 Rent*    $1,500  Monthly  Scotia   [Edit] [Delete]│ │
│  │    * = Default bill                    │
│  │ 🏢 Internet   $80     Monthly  Scotia   [Edit] [Delete]│ │
│  │    = Month instance (customized)    │
│  │ 🏠 Car Insurance $268   Bi-weekly Visa      [Edit] [Delete]│ │
│  │    = Default bill                    │
│  └─────────────────────────────────────────────────┘ │
│                                                │
└──────────────────────────────────────────────────┘
```

- **Default Bills**: Star icon (★) or subtle border
- **Month Instances**: No icon or plain border
- **Customized Instances**: Dot icon (•) or different background color
- `is_default: true` flag determines visual indicator

---

## Responsive Design

### Desktop (> 1200px wide)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  [Add Bill]  [Filter: All ▾]  [Sort: Name ↓]  [Show: Default]  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ [Icon] Name | Amount | Period | Source | Category | [Edit] [Delete]   │ │
│  │ 🏠 Rent     $1,500  Monthly  Scotia   Home        [Edit] [Delete]   │ │
│  │ 🏢 Internet   $80     Monthly  Scotia   Home        [Edit] [Delete]   │ │
│  │ 🏠 Car Insurance $268   Bi-weekly Visa      Debt       [Edit] [Delete]   │ │
│  │ 📱 Groceries   $80     Weekly    Scotia   Streaming   [Edit] [Delete]   │ │
│  │ 🏠 Netflix     $16     Monthly  Visa     Streaming   [Edit] [Delete]   │ │
│  │ ...                                                │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Total Fixed Costs: $1,834 /month                            │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1200px wide)

```
┌──────────────────────────────────────────┐
│  [Add Bill]  [Filter ▾]  │
├─────────────────────────────────────┤
│  [Icon] Name | Amount | [Edit] [Delete]│
│  🏠 Rent     $1,500     [Edit] [Delete]│
│  🏢 Internet   $80         [Edit] [Delete]│
│  ...                              │
└─────────────────────────────────────┘

Total Fixed Costs: $1,580 /month
```

### Mobile (< 768px wide)

```
┌──────────────────────────┐
│  [Add Bill]       │
├─────────────────────┤
│  [Icon] Name    │
│  🏠 Rent     $1,500│
│  🏢 Internet   $80  │
│  ...              │
└─────────────────────┘

[Add Bill] button always visible at bottom
```

---

## State Management

### Svelte Store (stores/bills.ts)

```typescript
interface BillsStore extends Writable<BillsState> {
  defaults: Bill[];
  instances: Record<string, BillInstance[]>; // Key = month ('YYYY-MM')

  actions: {
    addDefault: (bill: Bill) => void;
    updateDefault: (id: string, updates: Partial<Bill>) => void;
    softDeleteDefault: (id: string) => void;

    addInstance: (billInstance: BillInstance) => void;
    updateInstance: (month: string, billId: string, updates: Partial<BillInstance>) => void;
    deleteInstance: (month: string, id: string) => void;
  };
}
```

**Store Structure**:

- `defaults`: Array of all default bills (templates)
- `instances`: Record mapping month → array of bill instances for that month

---

## Edge Cases

### Empty States

- **No Default Bills**: Show message "No bills set up yet. Click 'Add Bill' to get started."
- **No Month Instances**: Show message "No bills for [Month]. Generate month or add bills."
- **Filter Returns No Results**: "No bills match your filter criteria."

### Editing Conflicts

- **Edit Default While Using Instance**: If user edits default bill, show warning: "You're editing the template. This changes all future months that use this bill. Current month will use this new value."
- **Delete Default With Active Instances**: Show error: "Cannot delete default bill that has active instances. Soft delete or remove instances first."

### Billing Period Complexity

- **Bi-Weekly Bill on February 2025** (month starts on Saturday):
  - Calculate occurrences: First Friday (Feb 7), Second Friday (Feb 21) = 2 instances
  - Display to user: "February: 2 occurrences (Feb 7, Feb 21)"
- **Weekly Bill on Any Month**:
  - Calculate occurrences: ~4.33 instances per month
  - Display to user: "Monthly: 4-5 occurrences (e.g., Feb 3, 10, 17, 24)"
- **Semi-Annually**:
  - January: 1 instance (or 2 if billing starts Jan 1)
  - July: 1 instance (or 2 if billing starts July 1)
  - April/October: 2 instances

---

## Success Criteria

- User can add default bill in under 30 seconds
- User can add bill instance (with billing period selected) in under 45 seconds
- User can edit bill amount in under 10 seconds
- User can delete bill (with confirmation) in under 5 seconds
- Filtering by category works smoothly without page reload
- Sort orders apply correctly
- Visual distinction between default bills and month instances is clear at a glance
- Total Fixed Costs updates accurately when bills are added/edited/deleted
- Empty states are handled gracefully with helpful messages
- Inline validation errors are clear and actionable
- Auto-save completes within 100ms (debounce + file write)
