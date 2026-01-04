# Data Model: Monthly Budget Tracker

**Feature**: [spec.md](./spec.md)
**Date**: 2025-12-29

---

## Overview

This data model supports a local-first desktop budgeting application with flexible month generation, multiple payment sources, and undo functionality. All data is persisted as local JSON files with automatic saves.

---

## Core Entities

### Bill

**Description**: Represents a fixed recurring expense with configurable billing period.

**Fields**:

```typescript
interface Bill {
  id: string; // Unique identifier (UUID)
  name: string; // Display name (e.g., "Rent", "Internet")
  amount: number; // Default amount (positive, currency in cents to avoid floating point)
  billing_period: 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';
  payment_source_id: string; // Reference to PaymentSource entity
  category_id?: string; // Optional reference to Category entity
  is_active: boolean; // Whether bill is currently active (soft delete)
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

**Validation Rules**:

- `name` must not be blank or whitespace only
- `amount` must be positive (> 0)
- `billing_period` must be one of: 'monthly', 'bi_weekly', 'weekly', 'semi_annually'
- `payment_source_id` must reference an existing payment source
- Category validation (if provided): Must exist in categories list

**State Transitions**:

- `is_active` can be toggled (soft delete - don't hard delete until cleanup)
- Soft-deleted bills excluded from "leftover" calculations

---

### BillInstance

**Description**: Represents a bill for a specific month with potentially customized amount. Created by copying from default Bill definition.

**Fields**:

```typescript
interface BillInstance {
  id: string; // Unique identifier (UUID)
  bill_id: string; // Reference to default Bill definition
  month: string; // Month identifier in 'YYYY-MM' format (e.g., "2025-01")
  amount: number; // Month-specific amount (may differ from default)
  is_default: boolean; // True if amount matches default, false if customized
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

**Validation Rules**:

- `bill_id` must reference an existing Bill
- `month` must be valid format 'YYYY-MM'
- `amount` must be positive (> 0)
- `is_default` flag tracks whether amount matches default Bill definition

**Relationships**:

- Many-to-one: Each `BillInstance` references one `Bill` (the template)
- One-to-many: Each `Bill` can have many `BillInstance` records (one per month)

---

### Income

**Description**: Represents a recurring income source with configurable billing period.

**Fields**:

```typescript
interface Income {
  id: string; // Unique identifier (UUID)
  name: string; // Display name (e.g., "Salary", "Freelance")
  amount: number; // Default amount (positive, currency in cents)
  billing_period: 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';
  payment_source_id: string; // Reference to PaymentSource entity
  is_active: boolean; // Whether income is currently active (soft delete)
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

**Validation Rules**:

- `name` must not be blank or whitespace only
- `amount` must be positive (> 0)
- `billing_period` must be one of: 'monthly', 'bi_weekly', 'weekly', 'semi_annually'
- `payment_source_id` must reference an existing payment source

**State Transitions**:

- `is_active` can be toggled (soft delete - don't hard delete until cleanup)

---

### IncomeInstance

**Description**: Represents an income for a specific month with potentially customized amount. Created by copying from default Income definition.

**Fields**:

```typescript
interface IncomeInstance {
  id: string; // Unique identifier (UUID)
  income_id: string; // Reference to default Income definition
  month: string; // Month identifier in 'YYYY-MM' format
  amount: number; // Month-specific amount (may differ from default)
  is_default: boolean; // True if amount matches default, false if customized
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

**Validation Rules**:

- `income_id` must reference an existing Income
- `month` must be valid format 'YYYY-MM'
- `amount` must be positive (> 0)
- `is_default` flag tracks whether amount matches default Income definition

**Relationships**:

- Many-to-one: Each `IncomeInstance` references one `Income` (the template)
- One-to-many: Each `Income` can have many `IncomeInstance` records (one per month)

---

### VariableExpense

**Description**: Represents discretionary spending that varies month to month. Does NOT repeat across months.

**Fields**:

```typescript
interface VariableExpense {
  id: string; // Unique identifier (UUID)
  name: string; // Display name (e.g., "Groceries", "Clothing")
  amount: number; // Expense amount (positive, currency in cents)
  payment_source_id: string; // Reference to PaymentSource entity
  month: string; // Month identifier in 'YYYY-MM' format
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

**Validation Rules**:

- `name` must not be blank or whitespace only
- `amount` must be positive (> 0)
- `payment_source_id` must reference an existing payment source
- `month` must be valid format 'YYYY-MM'

**Relationships**:

- No default definitions (unlike bills/income)
- Each expense is unique to its month (no instances)

---

### FreeFlowingExpense

**Description**: Represents ad-hoc, one-time expenses (birthday presents, car repairs, medical bills) that don't fit into regular bills or planned variable expenses.

**Fields**:

```typescript
interface FreeFlowingExpense {
  id: string; // Unique identifier (UUID)
  name: string; // Display name (e.g., "Birthday Gift", "Car Repair")
  amount: number; // Expense amount (positive, currency in cents)
  payment_source_id: string; // Reference to PaymentSource entity
  month: string; // Month identifier in 'YYYY-MM' format
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

**Validation Rules**:

- `name` must not be blank or whitespace only
- `amount` must be positive (> 0)
- `payment_source_id` must reference an existing payment source
- `month` must be valid format 'YYYY-MM'

**Relationships**:

- No default definitions (always ad-hoc)
- Each expense is unique to its month
- Similar structure to VariableExpense but no instance concept (single record)

---

### PaymentSource

**Description**: Represents a bank account, credit card, or cash source from which expenses are paid or income is received.

**Fields**:

```typescript
interface PaymentSource {
  id: string; // Unique identifier (UUID)
  name: string; // Display name (e.g., "Scotia Checking", "Visa", "Cash")
  type: 'bank_account' | 'credit_card' | 'cash';
  balance: number; // Current balance (positive for bank/cash, negative for credit card debt)
  is_active: boolean; // Whether payment source is currently active (soft delete)
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

**Validation Rules**:

- `name` must not be blank or whitespace only
- `type` must be one of: 'bank_account', 'credit_card', 'cash'
- `balance` can be positive (bank account, cash) or negative/zero (credit card debt)
- `balance` is user-entered value (not calculated)

**Calculations**:

- **Total Cash / Net Worth** = sum of all PaymentSource balances where type is 'bank_account' or 'cash' minus sum of all PaymentSource balances where type is 'credit_card'
- Used in "leftover" calculation per FR-006

**State Transitions**:

- `is_active` can be toggled (soft delete - prevents deletion if bills/expenses/incomes assigned)

---

### Category

**Description**: Represents a classification for organizing bills. Pre-defined categories provided plus custom categories.

**Fields**:

```typescript
interface Category {
  id: string; // Unique identifier (UUID)
  name: string; // Category name (e.g., "Home", "Debt", "Streaming")
  is_predefined: boolean; // True if one of 8 default categories, false if custom
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

**Validation Rules**:

- `name` must not be blank or whitespace only
- `is_predefined` flag distinguishes system vs user-created categories

**Pre-Defined Categories** (from spec):

1. Home: Rent, mortgage, HOA, property maintenance
2. Debt: Loan payments, credit card payments, car payments
3. Streaming: Netflix, YouTube, Spotify, other subscriptions
4. Utilities: Hydro, water, gas, internet, phone
5. Transportation: Gas, insurance, public transit, parking
6. Entertainment: Dining out, hobbies, events
7. Insurance: Health, car, home, life insurance
8. Subscriptions: Magazines, services, recurring memberships

---

### UndoStack

**Description**: Maintains history of most recent 5 changes for undo functionality.

**Fields**:

```typescript
interface UndoEntry {
  id: string; // Unique identifier (UUID)
  entity_type:
    | 'bill'
    | 'income'
    | 'variable_expense'
    | 'free_flowing_expense'
    | 'payment_source'
    | 'bill_instance'
    | 'income_instance';
  entity_id: string; // ID of the entity that was modified
  old_value: any; // Previous value (serializable)
  new_value: any; // New value (serializable)
  timestamp: string; // ISO 8601 timestamp
}
```

**Validation Rules**:

- `entity_type` must be one of allowed entity types
- `entity_id` must reference an existing entity of that type
- Stack is LIFO (last in, first out)
- Maximum 5 entries (older entries automatically discarded)

**State Management**:

- When new change made: Add entry to stack
  - If stack has 5 entries: Remove oldest (pop) before adding new (push)
- When undo triggered: Remove most recent entry (pop)
  - Revert entity to `old_value`
  - Return reverted value to caller

---

### BackupFile

**Description**: Represents a complete export of all budget data for user-owned cloud backup. Not stored in app - user uploads/downloads manually.

**Note**: This entity is transient - exported on demand, not persisted in app database.

**Fields**:

```typescript
interface BackupFileData {
  export_date: string; // ISO 8601 timestamp
  bills: Bill[]; // All active bills (definitions)
  incomes: Income[]; // All active incomes (definitions)
  payment_sources: PaymentSource[]; // All payment sources
  categories: Category[]; // All categories
  months: MonthlyData[]; // All monthly data (bills instances, income instances, expenses)
}
```

---

### MonthlyData

**Description**: Aggregates all data for a specific month. Created when user navigates to a month or generates a new month.

**Fields**:

```typescript
interface MonthlyData {
  month: string; // Month identifier in 'YYYY-MM' format
  bill_instances: BillInstance[]; // Bills for this month (generated from defaults or customized)
  income_instances: IncomeInstance[]; // Incomes for this month (generated from defaults or customized)
  variable_expenses: VariableExpense[]; // Variable expenses for this month
  free_flowing_expenses: FreeFlowingExpense[]; // Free-flowing expenses for this month
  bank_balances: Record<string, number>[]; // Map of payment_source_id -> balance
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

**Validation Rules**:

- `month` must be valid format 'YYYY-MM'
- `bill_instances` generated by copying default Bills and adhering to billing periods
  - Monthly: 1 instance
  - Bi-weekly: ~2.17 instances (calculate based on month start)
  - Weekly: ~4.33 instances
  - Semi-annually: 0-2 instances depending on month
- `income_instances` generated similarly (adhering to billing periods)
- `bank_balances` is user-entered values for this month
- Calculations performed:
  - Total bills for month
  - Total income for month
  - Total variable expenses
  - Total free-flowing expenses
  - "Leftover" = (sum of bank balances) + total income - (total bills + total variable + total free-flowing)

**Month Generation Algorithm**:

1. Copy all active Bills → create BillInstance records with `is_default: true`
2. Apply billing period logic:
   - Monthly: 1 instance
   - Bi-weekly: Calculate number of Fridays in month (e.g., 4 or 5), create that many instances
   - Weekly: Calculate number of Mondays (4 or 5), create that many instances
   - Semi-annually: If month is January/July, create 1 instance; if April/October, create 2 instances
3. Copy all active Incomes → create IncomeInstance records similarly
4. Create empty array for variable_expenses and free_flowing_expenses (don't carry over)
5. Create empty `bank_balances` map (user fills in)
6. Set `created_at` = current timestamp

---

## File Storage Structure

### JSON Files Layout

```
data/
├── entities/
│   ├── bills.json           // Bill definitions (templates)
│   ├── incomes.json         // Income definitions (templates)
│   ├── payment-sources.json // Payment source configurations
│   └── categories.json       // Bill categories (pre-defined + custom)
└── months/
    └── YYYY-MM.json        // Monthly data (isolated per month)
```

### File Format Examples

**bills.json**:

```json
{
  "bills": [
    {
      "id": "550e8400-e29b-41d4-a716-4466553",
      "name": "Rent",
      "amount": 150000, // $1,500 in cents
      "billing_period": "monthly",
      "payment_source_id": "ps1",
      "category_id": "cat1",
      "is_active": true,
      "created_at": "2025-12-29T00:00:00Z",
      "updated_at": "2025-12-29T00:00:00Z"
    }
  ]
}
```

**months/2025-01.json**:

```json
{
  "month": "2025-01",
  "bill_instances": [
    {
      "id": "bi1",
      "bill_id": "550e8400-e29b-41d4-a716-4466553",
      "month": "2025-01",
      "amount": 150000,  // Uses default
      "is_default": true,
      "created_at": "2025-12-29T00:00:00Z",
      "updated_at": "2025-12-29T00:00:00Z"
    }
  ],
  "income_instances": [  /* similar structure */  ],
  "variable_expenses": [  /* empty for new month */  ],
  "free_flowing_expenses": [  /* empty for new month */  ],
  "bank_balances": {
    "ps1": 300000,  // $3,000 in Scotia Checking
    "ps2": -150000  // Owe $1,500 on Visa
    "ps3": 50000   // $500 cash
  },
  "created_at": "2025-12-29T00:00:00Z",
  "updated_at": "2025-12-29T00:00:00Z"
}
```

---

## Calculations

### "Leftover" Calculation (FR-006)

**Formula per spec**:

```
Leftover = (sum of bank balances) + total income - total expenses
```

**Breakdown**:

```typescript
function calculateLeftover(
  bankBalances: PaymentSource[],
  incomes: IncomeInstance[],
  bills: BillInstance[],
  variableExpenses: VariableExpense[],
  freeFlowingExpenses: FreeFlowingExpense[]
): number {
  // Sum all positive balances (bank accounts + cash)
  const totalCash = bankBalances
    .filter((ps) => ps.type === 'bank_account' || ps.type === 'cash')
    .reduce((sum, ps) => sum + ps.balance, 0);

  // Sum all negative balances (credit card debt)
  const totalDebt = bankBalances
    .filter((ps) => ps.type === 'credit_card' && ps.balance < 0)
    .reduce((sum, ps) => sum + ps.balance, 0);

  // Total cash / net worth
  const totalCashNetWorth = totalCash + totalDebt;

  // Total income for month
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);

  // Total bills for month
  const totalBills = bills.reduce((sum, bill) => sum + bill.amount, 0);

  // Total variable expenses
  const totalVariable = variableExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Total free-flowing expenses
  const totalFreeFlowing = freeFlowingExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Total expenses
  const totalExpenses = totalBills + totalVariable + totalFreeFlowing;

  // "Leftover" calculation
  const leftover = totalCashNetWorth + totalIncome - totalExpenses;

  return leftover;
}
```

### Billing Period Instance Count

**Bi-Weekly Instances per Month**:

```typescript
function getBiWeeklyInstanceCount(month: string, dayOfWeek: number): number {
  // dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
  const year = parseInt(month.substring(0, 4));
  const monthNum = parseInt(month.substring(5, 7));

  // Get number of weeks in this month
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const numWeeks = Math.ceil(daysInMonth / 7);

  // Count how many times the specified day occurs
  let instanceCount = 0;
  for (let i = 0; i < daysInMonth; i++) {
    const currentDay = new Date(year, monthNum, i + 1).getDay();
    if (currentDay === dayOfWeek) {
      instanceCount++;
    }
  }

  // If month starts mid-week, pro-rate partial month
  const firstDay = new Date(year, monthNum, 1).getDay();
  if (firstDay <= dayOfWeek) {
    instanceCount++; // Add instance for partial first week
  }

  return instanceCount; // Typically ~2.17, can be 2 or 3 depending on month
}
```

**Weekly Instances per Month**:

```typescript
function getWeeklyInstanceCount(month: string, dayOfWeek: number): number {
  const year = parseInt(month.substring(0, 4));
  const monthNum = parseInt(month.substring(5, 7));

  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const numWeeks = Math.ceil(daysInMonth / 7);

  // Count how many times the specified day occurs
  let instanceCount = 0;
  for (let i = 0; i < daysInMonth; i++) {
    const currentDay = new Date(year, monthNum, i + 1).getDay();
    if (currentDay === dayOfWeek) {
      instanceCount++;
    }
  }

  // If month starts mid-week, pro-rate partial first week
  const firstDay = new Date(year, monthNum, 1).getDay();
  if (firstDay <= dayOfWeek) {
    instanceCount++; // Add instance for partial first week
  }

  return instanceCount; // Typically ~4.33, can be 4 or 5 depending on month
}
```

---

## State Management

### Store Structure (Svelte)

```typescript
// stores/bills.ts
interface BillsStore extends Writable<Bill[]> {
  default: [];
  actions: {
    add: (bill: Bill) => void;
    update: (id: string, updates: Partial<Bill>) => void;
    delete: (id: string) => void;
    softDelete: (id: string) => void; // Set is_active = false
  };
}

// stores/incomes.ts
interface IncomesStore extends Writable<Income[]> {
  default: [];
  actions: {
    add: (income: Income) => void;
    update: (id: string, updates: Partial<Income>) => void;
    delete: (id: string) => void;
    softDelete: (id: string) => void;
  };
}

// stores/payment-sources.ts
interface PaymentSourcesStore extends Writable<PaymentSource[]> {
  default: [];
  actions: {
    add: (source: PaymentSource) => void;
    update: (id: string, updates: Partial<PaymentSource>) => void;
    delete: (id: string) => void;
    updateBalance: (id: string, balance: number) => void; // User enters bank balance
  };
}

// stores/expenses.ts
interface ExpensesStore extends Writable<VariableExpense[]> {
  default: [];
  actions: {
    add: (expense: VariableExpense | FreeFlowingExpense) => void;
    update: (id: string, updates: Partial<VariableExpense | FreeFlowingExpense>) => void;
    delete: (id: string) => void;
  };
}

// stores/undo.ts
interface UndoStore extends Writable<UndoEntry[]> {
  default: [];
  actions: {
    pushChange: (entry: UndoEntry) => void;
    undo: () => void; // Pop most recent change and revert
    clear: () => void; // Clear stack (on app close or new session)
  };
}

// stores/ui.ts
interface UIStore extends Writable<UIState> {
  default: {
    currentMonth: string; // 'YYYY-MM' format
    navigation: 'dashboard' | 'setup' | 'bills' | 'incomes' | 'payment-sources' | 'expenses';
  };
  actions: {
    setMonth: (month: string) => void;
    setNavigation: (nav: string) => void;
  };
}
```

---

## Auto-Save Behavior

**Trigger Conditions**:

- Any change to entity (add, update, delete)
- Any change to entity instance (add, update amount)
- Bank balance update
- Undo operation (add to stack or undo from stack)

**Auto-Save Strategy**:

1. Debounce saves (500ms) to prevent excessive writes during rapid changes
2. Save to appropriate JSON file immediately after debounce
3. No user-facing save indicators (per constitution: "Automatic JSON writes are silent")
4. Handle concurrent saves (lock file or atomic write pattern)

---

## Data Migration

**Versioning**: Simple file-based versioning for future compatibility

```json
{
  "version": "1.0",
  "bills": [
    /* ... */
  ],
  "payment_sources": [
    /* ... */
  ]
}
```

**Migration Strategy**:

- On app load: Check version in data files
- If version mismatch: Run migration function
- Always maintain backward compatibility (can read older versions)
- Write current version after migration

---

## Security Considerations

**Local-Only Storage** (per constitution VIII):

- No cloud sync (user-owned backups only)
- Data stored in JSON files (human-readable)
- No sensitive data in logs
- No encryption required (per spec assumption: "relies on OS file encryption when available")
- Input validation at all entry points (FR-028, FR-029)

---

## Error Handling

**Validation Errors**:

- Blank names → Show inline error message
- Negative amounts → Show inline error message
- Invalid billing period → Show inline error message
- Missing payment source → Show inline error message, block save
- Duplicate names → Warn user but allow (may be intentional)

**Persistence Errors**:

- File write failure → Show error with retry option
- File read failure → Show error, prompt for restore from backup
- Corrupt data → Show error, offer restore from backup file

---

## Testing Considerations

**Test Data**:

- Use separate test data files (not interfere with user data)
- Test with realistic edge cases:
  - Multiple bills with different billing periods
  - Bi-weekly bill in month with 5 instances
  - Credit card debt (negative balance)
  - Undo scenarios (5 changes, stack full, stack empty)
  - Free-flowing expenses
  - Month generation for new year

**Test Scenarios**:

1. User onboarding: Create first bill, income, payment source
2. Add bill with bi-weekly period: Verify 2.17 instances generated for February
3. Add bill with weekly period: Verify 4.33 instances generated
4. Edit bill instance for January: Verify default bill unchanged
5. Undo changes: Verify revert to old value
6. Multiple payment sources: Verify total cash calculation
7. "Leftover" calculation: Verify formula with bills, incomes, variable expenses, free-flowing, bank balances
8. Navigate months: Verify data isolation
9. Restore from backup: Verify line-by-line restore works
10. Delete payment source: Verify error if bills/expenses assigned

---

## Performance Considerations

**Data Size**:

- Typical user with ~50 bills/incomes = ~10KB JSON
- 2 years of data (24 months) = ~240KB per entity type
- Total estimated: <1MB for full dataset

**Read/Write Latency**:

- JSON parse/write for typical dataset: <50ms
- File system I/O: <100ms for read, <200ms for write
- Auto-save debounce: 500ms (imperceptible to user)

**Memory Usage**:

- Svelte stores: All data in memory (~1MB for full dataset)
- Bun HTTP server: In-memory data (all data in memory)
- JSON files: Not loaded entirely, read on-demand

**Calculation Performance**:

- "Leftover" calculation: <1ms for typical dataset
- Billing period calculation: Negligible (simple arithmetic)
- Monthly data generation: <100ms (copy from defaults)
