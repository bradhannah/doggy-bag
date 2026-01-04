# Dashboard Contract

**Component**: `components/Dashboard/Dashboard.svelte`
**Purpose**: Main view showing current month's "leftover" calculation and financial summary

---

## Overview

Dashboard is the primary interface after onboarding. It displays the key question: "how much money do I have left?" in a simple, clear format. Shows summary of income, expenses, and bank balances for the current month.

**Navigation**: Accessible via "Dashboard" button in main navigation or by default on app load.

---

## Layout

```
┌──────────────────────────────────────────────────────────┐
│                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Leftover    │  │   Income     │  │   Expenses   │ │
│  │   $7,000      │  │   $5,000     │  │   $2,000     │ │
│  │   (+ $2,000)   │  │   (+/- $500) │  │   Bills: $1,500 │
│  │   Surplus!     │  │               │  │   Variable: $500 │
│  │                │  │               │  │               │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                │
│  [Month Navigation: 2024 ◄ 2025 ▶]  │
│  [Quick Actions]                              │
└──────────────────────────────────────────────────────────┘
```

---

## Components

**Leftover Display** (`components/Dashboard/LeftoverCard.svelte`)

- Large, centered number displaying "leftover at end of month"
- Color coding:
  - Positive (surplus): Green (configurable, default: [TO BE FILLED IN BY USER])
  - Negative (deficit): Red (configurable, default: [TO BE FILLED IN BY USER])
- Label: "Leftover at End of Month"
- Animated count-up or fade-in when value changes
- Tooltip: Shows calculation breakdown on hover

**Month Navigation** (`components/Dashboard/MonthSelector.svelte`)

- Year selector: Dropdown (native picker if available, otherwise custom)
- Month selector: Side-by-side vertical list (January, February, March, ...)
- Previous/Next navigation: Arrow buttons or month list clicks
- Current month: Highlighted/bolded
- Future months: Dimmed/grayed out
- Action: Clicking a month loads that month's data

**Income Summary Card** (`components/Dashboard/IncomeSummary.svelte`)

- Total Income: Display sum of all income instances for current month
- Breakdown by payment source: List each source with its income
- Icon: Income icon (arrow up or plus sign)
- Color: Configurable income section color (default: [TO BE FILLED IN BY USER])

**Expense Summary Card** (`components/Dashboard/ExpenseSummary.svelte`)

- Total Expenses: Display sum of all bills and variable expenses
- Breakdown:
  - Fixed Bills: Total of bill instances
  - Variable Expenses: Total of variable expenses
  - Free-Flowing Expenses: Total of free-flowing expenses
- Icons: Expense icons for each section
- Color: Configurable expenses section color (default: [TO BE FILLED IN BY USER])

**Payment Sources Card** (`components/Dashboard/PaymentSourcesCard.svelte`)

- Total Cash / Net Worth: Calculated value (sum of positive balances - sum of credit card debt)
- Breakdown by payment source: List each source with current balance
- Icons: Bank/Credit card icons
- Color: Configurable payment sources section color (default: [TO BE FILLED IN BY USER])

**Quick Actions** (`components/Dashboard/QuickActions.svelte`)

- Button: "Add Bill" - Opens bill form (quick add or inline edit)
- Button: "Add Expense" - Opens variable expense form
- Button: "Add Income" - Opens income form
- Button: "Add Payment Source" - Opens payment source form
- Button: "Undo" - Undo last change (disabled if no changes)
- Layout: Horizontal button row or grid

---

## Data Flow

### On Load

1. **Get Current Month**: Read from `uiStore.currentMonth`
2. **Load Monthly Data**: Read `data/months/YYYY-MM.json`
3. **Fetch Payment Sources**: Read from `paymentSourcesStore`
4. **Calculate Totals**:
   - Total Income: Sum of `monthlyData.income_instances`
   - Total Bills: Sum of `monthlyData.bill_instances`
   - Total Variable Expenses: Sum of `monthlyData.variable_expenses`
   - Total Free-Flowing Expenses: Sum of `monthlyData.free_flowing_expenses`
5. **Fetch Balances**: Read current balances from `monthlyData.bank_balances`
6. **Calculate Leftover**: Use formula from data model:
   ```
   Leftover = (sum of positive balances - sum of credit card debt) + total income - total expenses
   ```
7. **Update Display**: All cards re-render with new values

### User Actions

**Add Bill**: Opens bill form (inline or modal)

- Pre-fill: Payment source dropdown with default (first source)
- Billing period: Default to 'monthly' (user can change)
- On save: Update `billsStore.add()`, auto-save triggers

**Add Expense**: Opens variable expense form

- Payment source: Dropdown from payment sources
- On save: Update `expensesStore.add()`, auto-save triggers

**Add Income**: Opens income form

- Payment source: Dropdown from payment sources
- Billing period: Default to 'monthly'
- On save: Update `incomesStore.add()`, auto-save triggers

**Add Payment Source**: Opens payment source form

- Type: Radio buttons (Bank Account, Credit Card, Cash)
- Balance: Optional (can add later)
- On save: Update `paymentSourcesStore.add()`, auto-save triggers

**Undo**: Triggers `undoStore.undo()`

- Reverts most recent change
- All dashboard cards update to reflect reverted state
- Undo button disabled if no changes to undo

### Month Navigation

**Change Month**:

1. User clicks month selector or Previous/Next
2. `uiStore.setMonth(selectedMonth)` action dispatched
3. Svelte store subscribers load new monthly data
4. All dashboard cards recalculate and re-render
5. Update `uiStore.setNavigation('dashboard')`

**Generate Month**:

1. User navigates to month that doesn't exist (e.g., future month)
2. Backend or frontend generates month data:
   - Copy active Bills → create BillInstances
   - Copy active Incomes → create IncomeInstances
   - Apply billing periods (bi-weekly = ~2.17 instances)
   - Create empty arrays for expenses
3. Save new month data to `data/months/YYYY-MM.json`
4. Update `uiStore.setMonth(newMonth)`
5. Dashboard displays generated data

---

## State Management

### Store Usage

```typescript
// On component mount
$: monthlyData = uiStore.getLatestMonthData();

$: totalIncome = calculateTotalIncome($monthlyData);
$: totalBills = calculateTotalBills($monthlyData);
$: totalVariable = calculateTotalVariableExpenses($monthlyData);
$: totalFreeFlowing = calculateTotalFreeFlowing($monthlyData);
$: bankBalances = $monthlyData.bank_balances;
$: leftover = calculateLeftover(
  $bankBalances,
  $totalIncome,
  $totalBills,
  $totalVariable,
  $totalFreeFlowing
);
```

### Reactive Updates

All cards listen to store changes:

- `billsStore.subscribe()` → Update income/expense cards when bills change
- `incomesStore.subscribe()` → Update income card when incomes change
- `expensesStore.subscribe()` → Update expense cards when expenses change
- `paymentSourcesStore.subscribe()` → Update payment sources card
- `undoStore.subscribe()` → Update quick actions undo button state
- `uiStore.subscribe()` → Load new month data when month changes

---

## Responsive Design

### Desktop (> 1200px wide)

```
┌──────────────────────────────────────────────────────────┐
│                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Leftover     │  │ Income       │  │ Expenses      │ │
│  │ $7,000       │  │ $5,000       │  │ $2,000       │ │
│  │               │  │               │  │               │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                │
│  [Month Nav: ◄ 2024 ▶ 2025] [Actions]     │
└──────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1200px wide)

```
┌────────────────────────────────────┐
│                                │
│  ┌──────────────┐              │
│  │ Leftover     │              │
│  │ $7,000       │              │
│  │               │              │
│  └──────────────┘              │
│                                │
│  [Month: 2025] [Actions]   │
└────────────────────────────────────┘
```

### Mobile (< 768px wide)

```
┌────────────────────────┐
│                    │
│  ┌────────────┐  │
│  │ Leftover     │  │
│  │ $7,000       │  │
│  └──────────────┘  │
│                    │
│  [Month: 2025]  │
│                    │
└────────────────────────┘
```

---

## Accessibility

- **Keyboard Navigation**: Month selector supports arrow keys (up/down to navigate months)
- **Screen Reader Support**: All cards have descriptive labels
- **Color Contrast**: Ensure text is readable on configurable backgrounds
- **Focus States**: Clear visual indication when elements are focused

---

## Performance

- Lazy load monthly data (only load current month, others on-demand)
- Debounce month navigation (500ms) to prevent excessive re-renders
- Use `requestAnimationFrame` for smooth leftover count animations
- Memoize calculation functions to prevent redundant computations

---

## Edge Cases

**No Data for Month**:

- Show empty state: "No budget data for [Month]. Generate month or add bills and incomes to get started."
- "Generate Month" button available

**All Values Zero**:

- Leftover: $0 displayed in neutral color (no green or red)
- Income/Expenses: $0 displayed normally

**Very Large Numbers**:

- Format with commas: $1,234,567.89
- Truncate display if too wide for card: Show full value on hover/tooltip

**Multiple Payment Sources**:

- Payment Sources Card shows all sources
- If no sources: "Add payment source to track where your money is"

---

## Success Criteria

- User sees accurate "leftover" calculation within 1 second of page load
- Month navigation is smooth and intuitive (<500ms between months)
- All summary cards update in real-time (<100ms) when user makes changes
- Layout is readable and balanced on all screen sizes
- Color scheme from user configuration is applied consistently
