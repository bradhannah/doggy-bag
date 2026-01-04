# Payment Sources Management Contract

**Component**: `components/PaymentSources/` (PaymentSourceList.svelte, PaymentSourceForm.svelte, etc.)
**Purpose**: Manage bank accounts, credit cards, and cash sources for expense tracking and "leftover" calculation

---

## Overview

Payment Sources component allows users to add and manage multiple payment sources (bank accounts, credit cards, cash). Each payment source has a name, type, and balance. The "leftover" calculation uses all payment sources to determine total cash/net worth.

**Navigation**: Accessible via "Payment Sources" button in main navigation.

---

## Component Structure

### Layout

```
┌──────────────────────────────────────────────────┐
│  Payment Sources                   [Close X]        │
├─────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ [Add Payment Source]  [Load Defaults]      │  │
│  ├──────────────────────────────────────────────┤  │
│  │            Total Cash/Net Worth: $4,000      │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  [Filter: All ▾]  [Sort: Name ↓]   │  │
│  ├──────────────────────────────────────────────┤  │
│  │  [Delete Selected]                       │  │
│  │                                            │  │
│  │  [Icon] Name      | Type   | Balance    │  │
│  │  🏦 Scotia Checking   Bank  |  $3,000    │  │
│  │  │                                   │  │  │
│  │  [Icon] Name      | Type   | Balance    │  │
│  │  🏦 Visa           Card  | -$1,500   │  │
│  │  │                                   │  │  │
│  │  [Icon] Name      | Type   | Balance    │  │
│  │  💰 Cash           Cash   |  $500     │  │
│  │  │                                   │  │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└───────────────────────────────────────────────────┘
```

### Subcomponents

**PaymentSourceList.svelte**

- Displays all payment sources in table/list format
- Filter by type (All, Bank Accounts, Credit Cards, Cash)
- Sort options (Name A-Z, Name Z-A, Balance High-Low, Balance Low-High)
- Inline actions: [Edit] and [Delete] on each row
- Multi-select: Can select multiple sources (for batch delete - optional future feature)
- Empty state: "No payment sources yet. Click 'Add Payment Source' to get started."

**AddPaymentSourceForm.svelte** (Modal or Inline)

- Name input (required): Text input, max 100 chars
- Type selection (required): Radio buttons (Bank Account, Credit Card, Cash)
- Balance input (optional): Currency input, pre-fill with current balance
- [Save] button
- [Cancel] button (modal only)
- Validation: Real-time error messages below fields

**EditPaymentSourceForm.svelte** (Modal)

- Pre-fill with existing payment source data
- Name, type, and balance fields
- [Save] button
- [Cancel] button
- Shows "Current Balance" label if editing

**LoadDefaultsButton.svelte** (Inline Action)

- Button to load pre-defined payment sources for quick setup
- Loads examples like "Scotia Checking", "Visa", "Cash"
- User can edit or delete loaded examples after adding

**ClearAllButton.svelte** (Inline Action)

- Button to remove all payment sources
- Shows confirmation: "Delete all payment sources?"
- Only enabled if payment sources exist

**TotalCashCard.svelte** (Summary Display)

- Large display of "Total Cash / Net Worth" value
- Formula displayed below: "Sum of bank accounts + cash - credit card debt"
- Updates in real-time as payment sources change

---

## Data Flow

### Add Payment Source

```
User fills form
    ↓
User clicks [Save Payment Source]
    ↓
Dispatch paymentSourcesStore.add(source)
    ↓
Add to data/entities/payment-sources.json
    ↓
Auto-save triggers:
  - Update Svelte store (reactive update)
  - Write to localStorage (optional persistence)
    ↓
UI updates reactively (list shows new source)
    ↓
Total Cash card recalculates
```

### Edit Payment Source

```
User clicks [Edit] on payment source
    ↓
EditPaymentSourceForm opens with data pre-filled
    ↓
User modifies fields
    ↓
User clicks [Save] or presses Enter
    ↓
Dispatch paymentSourcesStore.update(id, updates)
    ↓
Update data/entities/payment-sources.json
    ↓
Auto-save triggers:
  - Update Svelte store (reactive update)
  - Update localStorage (if applicable)
    ↓
UI updates reactively (list shows updated data)
    ↓
Total Cash card recalculates (balance changed)
    ↓
If payment source is used in bills/expenses:
  - Monthly data files updated with new balance
  - Dashboard recalculates "leftover"
```

### Delete Payment Source

```
User clicks [Delete] on payment source
    ↓
Inline confirmation: "Delete [Payment Source Name]?"
    ↓
User confirms
    ↓
Check if payment source is in use:
  - Search bills.json for payment_source_id references
  - Search incomes.json for payment_source_id references
  - Search expenses.json for payment_source_id references
  - If found: Show error "Cannot delete. [X] bills/expenses/incomes are assigned to this payment source. Reassign or remove those first."
    - If not found: Dispatch paymentSourcesStore.delete(id)
    ↓
Soft delete: Set is_active = false (prevent re-use)
    ↓
Update data/entities/payment-sources.json
    ↓
Auto-save triggers:
  - Update Svelte store (removed from list)
  - Update localStorage
    ↓
UI updates reactively (payment source removed from list)
    ↓
Total Cash card recalculates
```

### Update Balance

```
User directly enters or edits bank balance for a month
    ↓
Update data/months/YYYY-MM.json (bank_balances map updated)
    ↓
Dispatch undoStore.pushChange({
    entity_type: 'payment_source',
    entity_id: source.id,
    old_value: oldBalance,
    new_value: newBalance
  })
    ↓
Auto-save triggers:
  - Update monthly data file
  - Dashboard recalculates "leftover" with new balance
  - UI updates reactively (Total Cash card shows new value)
```

### Load Defaults

```
User clicks [Load Defaults] button
    ↓
Load pre-defined payment sources (examples):
  - Scotia Checking (Bank Account, $0)
  - Visa (Credit Card, $0)
  - Cash (Cash, $0)
    ↓
Dispatch paymentSourcesStore.loadDefaults(predefinedSources)
    ↓
For each source: Add to store (or update if exists)
    ↓
UI list displays loaded sources
    ↓
User can edit or delete examples as regular payment sources
```

---

## Type Handling

**Payment Source Types**:

- **Bank Account**: Positive balance (cash on hand)
- **Credit Card**: Can be positive or negative/zero (debt owed)
  - Example: Balance of -$1,500 means user owes $1,500
- **Cash**: Positive balance (cash on hand, like wallet)

**Total Cash / Net Worth Calculation** (per data model):

```
function calculateTotalCashNetWorth(paymentSources: PaymentSource[]): number {
  const positiveBalances = paymentSources
    .filter(ps => ps.type === 'bank_account' || ps.type === 'cash')
    .reduce((sum, ps) => sum + ps.balance, 0);

  const negativeBalances = paymentSources
    .filter(ps => ps.type === 'credit_card' && ps.balance < 0)
    .reduce((sum, ps) => sum + ps.balance, 0);

  return positiveBalances + negativeBalances;
}
```

---

## Validation Rules

### Payment Source

- **Name**: Required, not blank or whitespace only, max 100 chars, trimmed
- **Type**: Required, one of: 'bank_account', 'credit_card', 'cash'
- **Balance**: Optional, can be positive (bank/cash) or negative/zero (credit card debt), max 12 digits, currency format ($X,XXX.XX)
- **Duplicate Names**: Allowed (different types may have same name, e.g., "Checking" for bank account and cash wallet)

### Add Form

- All validation errors show inline below fields (red text)
- Save button disabled until all validations pass
- Real-time validation (errors clear when corrected)

### Edit Form

- Same validation as add form
- Pre-fill with existing data
- Type dropdown disabled (cannot change type after creation)

---

## Error Handling

### Inline Validation Errors

- Show error message below field:
  - "Payment source name is required"
  - "Type is required"
  - "Balance must be a valid number (e.g., $1,234.56)"
- Prevent save while validation errors exist
- Clear errors when user corrects field

### Delete Conflicts

- **Payment Source in Use**:

  ```
  Show error: "Cannot delete. Scotia Checking is used by:
    - 3 bills
    - 1 income source

  Reassign those bills/expenses/incomes to another payment source or delete them first."
  ```

- User cannot delete from error state (must reassign or cancel)

### Persistence Errors

- **File Write Failure**:
  ```
  Show toast notification: "Failed to save payment source. Please try again."
  ```
- **File Read Failure**:
  ```
  Show error page: "Unable to load payment sources. Please restart the app."
  ```

---

## Responsive Design

### Desktop (> 1200px wide)

```
┌───────────────────────────────────────────────────────────────┐
│  Total Cash/Net Worth: $4,000                        │
├──────────────────────────────────────────────────────────────┤
│                                                       │
│  [Add Payment Source]  [Load Defaults]  [Clear All]      │
│                                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [Filter: All ▾]  [Sort: Name ↓]        │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  [Delete Selected]                           │  │
│  │                                             │  │
│  │  [Icon] Name      | Type   | Balance     │  │
│  │  🏦 Scotia Checking   Bank  |  $3,000     │  │
│  │  🏦 Visa           Card  | -$1,500     │  │
│  │  💰 Cash           Cash   | $500       │  │
│  │  💰 Wallet         Cash   | $200       │  │
│  │  ...                                       │  │
│  └──────────────────────────────────────────────┘  │
│                                             │
└───────────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1200px wide)

```
┌─────────────────────────────────────────────────┐
│  Total Cash/Net Worth: $4,000           │
├──────────────────────────────────────────────┤
│                                       │
│  [Add Payment Source]  [Clear All]    │
│                                       │
│  ┌──────────────────────────────────────┐  │
│  │  [Filter: All ▾]  [Sort: Name ↓]  │
│  ├──────────────────────────────────────┤  │
│  │  [Delete Selected]               │  │
│  │                                 │  │
│  │  [Icon] Name | Type  | Balance   │  │
│  │  🏦 Scotia   Bank  | $3,000  │  │
│  │  🏦 Visa      Card  | -$1,500  │  │
│  │  💰 Cash     Cash   | $500   │  │
│  │  ...                             │  │
│  └──────────────────────────────────────┘  │
└───────────────────────────────────────────┘
```

### Mobile (< 768px wide)

```
┌────────────────────────────┐
│  Total: $4,000           │
├──────────────────────────────┤
│                          │
│  [Add]  [Clear]        │
│                          │
│  ┌──────────────────────┐  │
│  │  [Icon] Name         │  │
│  │  🏦 Scotia   Bank  │  │
│  │  🏦 Visa      Card  │  │
│  │  💰 Cash     Cash   │  │
│  │  ...               │  │
│  └──────────────────────┘  │
│                          │
└──────────────────────────────┘
```

---

## State Management

### Svelte Store (stores/payment-sources.ts)

```typescript
interface PaymentSourcesStore extends Writable<PaymentSourcesState> {
  defaults: PaymentSource[]; // Pre-defined examples
  actions: {
    add: (source: PaymentSource) => void;
    update: (id: string, updates: Partial<PaymentSource>) => void;
    delete: (id: string) => void;
    loadDefaults: (sources: PaymentSource[]) => void;
  };
}
```

**Store Usage**:

```typescript
// In PaymentSourceList component
$: paymentSources = paymentSourcesStore.defaults;

$: totalCashNetWorth = calculateTotalCash($paymentSources);

// On component mount or when other component changes payment sources
$: paymentSources = paymentSourcesStore;
```

---

## Success Criteria

- User can add first payment source (bank account) in under 30 seconds
- User can add payment source with negative balance (credit card debt) in under 30 seconds
- User can edit payment source balance in under 10 seconds
- User can delete payment source in under 5 seconds (with confirmation)
- Total Cash / Net Worth displays accurately and updates in real-time (<100ms)
- Payment source list is sorted and filtered correctly
- Empty state is handled gracefully with helpful message
- Validation errors are clear and actionable
- Delete conflicts are handled with helpful guidance
- Load Defaults adds example payment sources quickly and accurately
