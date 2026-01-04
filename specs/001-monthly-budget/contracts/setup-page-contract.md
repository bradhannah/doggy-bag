# Setup Page Contract

**Component**: `Setup/SetupPage.svelte`
**Purpose**: First-time onboarding and ongoing entity management

---

## Overview

Setup page provides a simple interface for users to add their initial bills, income sources, and payment sources to get started quickly. After onboarding, the same Setup page can be reused for ongoing entity management (basic list view, not a wizard).

**Navigation**: Accessible via "Setup" button in main navigation or on first app launch.

---

## User Flow

### First-Time Onboarding (New Users)

1. **App Launch**: User opens app for first time
2. **Setup Page**: Automatically redirected to Setup page
3. **Three Tabs**: User sees tabs for "Bills", "Income Sources", "Payment Sources"
4. **Add Entities**:
   - User can add 1-2 bills across tabs
   - User can add 1 income source
   - User can add 1 payment source
5. **Complete Setup**: Click "Done" button or navigate away
6. **Redirect**: User redirected to main budget view (current month dashboard)
7. **Save**: All entities saved to `data/entities/*.json` files

### Ongoing Entity Management (Returning Users)

1. **Access Setup**: User clicks "Setup" in navigation
2. **Tab Selection**: User selects which entity type to manage (Bills, Incomes, Payment Sources)
3. **List View**: Basic list view of all entities of selected type
4. **Edit Actions**:
   - Click entity to edit (opens form)
   - Delete entity (with confirmation)
   - Add new entity (inline or form)
5. **Save Changes**: Changes saved immediately (auto-save)

---

## Component Structure

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Setup                                  [Close X]        │
├─────────────────────────────────────────────────────────┤
│                                                     │
│  [Bills]  [Incomes]  [Payment Sources]        │
│                                                     │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                                               │ │
│  │            Bills List                          │ │
│  │                                               │ │
│  │            [Add Bill] [Delete Selected]       │ │
│  │                                               │ │
│  │            Bill Item 1                       │ │
│  │            Bill Item 2                       │ │
│  │            Bill Item 3                       │ │
│  │            ...                              │ │
│  │                                               │ │
│  │  [Load Defaults] [Clear All]          │ │
│  │                                               │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────────┘
```

### Subcomponents

**Tabs**: `components/Setup/Tabs.svelte`

- Three tabs: Bills, Incomes, Payment Sources
- Active tab indicator (underline or highlight)
- Click handler updates current tab state

**Entity List**: `components/Setup/EntityList.svelte`

- Reusable component for displaying bills, incomes, or payment sources
- Props: `entities: Bill[] | Income[] | PaymentSource[]`, `entityType: 'bill' | 'income' | 'payment_source'`
- Displays each entity in row format:
  ```
  [Delete]  [Icon]  Name | Amount | Billing Period | Payment Source | Category
  ```
- Edit: Clicking entity opens edit form
- Delete: Clicking delete shows confirmation (inline, not modal)
- Multi-select: Can select multiple entities (for batch delete - optional future feature)
- Empty state: Shows message when no entities exist

**Add Form**: `components/Setup/AddForm.svelte`

- Inline form for adding new entities
- Props: `entityType: 'bill' | 'income' | 'payment_source'`
- Fields based on entity type:

**Bill Fields**:

- Name (required): Text input
- Amount (required): Currency input (allows $, , for formatting)
- Billing Period (required): Dropdown (Monthly, Bi-weekly, Weekly, Semi-annually)
- Payment Source (required): Dropdown (from payment sources store)
- Category (optional): Dropdown (from categories store)
- [Save] button

**Income Fields**:

- Name (required): Text input
- Amount (required): Currency input
- Billing Period (required): Dropdown (Monthly, Bi-weekly, Weekly, Semi-annually)
- Payment Source (required): Dropdown (from payment sources store)
- [Save] button

**Payment Source Fields**:

- Name (required): Text input
- Type (required): Radio buttons (Bank Account, Credit Card, Cash)
- Balance (optional): Currency input (pre-fill with current balance for existing)
- [Save] button

**Load Defaults Button**: `components/shared/LoadDefaultsButton.svelte`

- Button to populate Setup page with example/default data
- Helps users get started if they have no existing data
- Loads predefined bills, incomes, payment sources (configurable)
- Action: Adds entities to stores, auto-saves

**Clear All Button**: `components/shared/ClearAllButton.svelte`

- Button to remove all entities of current tab type
- Shows confirmation: "Delete all bills/incomes/payment sources?"
- Action: Clears entities from store, auto-saves

**Edit Form**: `components/Setup/EditForm.svelte` (Modal overlay)

- Modal form for editing existing entities
- Props: `entity: Bill | Income | PaymentSource`
- Pre-fills all existing data
- [Save] button and [Cancel] button
- Same fields as Add Form

---

## Data Flow

### Onboarding Flow (First-Time User)

```
User enters data
    ↓
Click [Save]
    ↓
Save to data/entities/bills.json (or incomes.json or payment-sources.json)
    ↓
Update Svelte store (billsStore / incomesStore / paymentSourcesStore)
    ↓
Auto-save to localStorage (optional persistence across sessions)
    ↓
Redirect to Dashboard (current month)
```

### Ongoing Management Flow

```
User selects entity type (Bills tab)
    ↓
Load entities from store (billsStore)
    ↓
Display in EntityList component
    ↓
User clicks [Add Bill]
    ↓
Show AddForm component (inline)
    ↓
User fills fields and clicks [Save]
    ↓
Add to billsStore
    ↓
Auto-save to data/entities/bills.json
    ↓
Update UI list (reactive)
```

### Edit Flow

```
User clicks entity to edit
    ↓
Open EditForm modal
    ↓
Pre-fill with entity data
    ↓
User modifies fields and clicks [Save]
    ↓
Update entity in billsStore
    ↓
Auto-save to data/entities/bills.json
    ↓
Close modal
    ↓
Update UI list
```

### Delete Flow

```
User clicks [Delete] on entity row
    ↓
Show inline confirmation: "Delete [Entity Name]?"
    ↓
User confirms
    ↓
Remove from billsStore
    ↓
Auto-save to data/entities/bills.json
    ↓
Remove from UI list
```

---

## Validation Rules

### Bills

- Name: Required, not blank, max 100 chars, trimmed
- Amount: Required, > 0, max 9 digits (for billions), currency format
- Billing Period: Required, one of valid values
- Payment Source: Required, must reference existing PaymentSource
- Category: Optional, if provided must reference existing Category
- Duplicate names: Allow (users may have multiple similar bills)

### Incomes

- Name: Required, not blank, max 100 chars, trimmed
- Amount: Required, > 0, max 9 digits, currency format
- Billing Period: Required, one of valid values
- Payment Source: Required, must reference existing PaymentSource
- Duplicate names: Allow

### Payment Sources

- Name: Required, not blank, max 100 chars, trimmed
- Type: Required, one of 'bank_account', 'credit_card', 'cash'
- Balance: Optional, can be positive (bank/cash) or negative/zero (credit card debt), max 12 digits
- Duplicate names: Allow (different types may have same name, e.g., "Checking" as bank account and cash)

---

## Error Handling

### Inline Validation Errors

- Show error message below field in red text
- Example: "Bill name is required"
- Prevent save while validation errors exist
- Clear error when user corrects field

### Save Errors

- File write failure: Show toast notification "Failed to save. Please try again."
- Duplicate name: Show warning "Bill name already exists" (but allow save)
- Missing references: Show error "Please add [Payment Source] or [Category] first"

---

## Success Criteria

- User can add first bill, first income, and first payment source in under 2 minutes
- User can complete initial onboarding (3+ entities) in under 5 minutes
- Setup page remains responsive on mobile/desktop
- All changes auto-save immediately (no manual save button required except explicit Save)
- Empty states handled gracefully (no crashes when no entities exist)
- Validation errors are clear and actionable
