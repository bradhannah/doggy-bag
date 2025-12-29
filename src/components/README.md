# Svelte Components

This directory contains all Svelte UI components for BudgetForFun application.

## Component Structure

### Setup (First-Time Onboarding)
- SetupPage.svelte - Main setup page with tabs
- Tabs.svelte - Tab navigation (Bills, Incomes, Payment Sources)
- EntityList.svelte - Generic list component for entities
- AddForm.svelte - Generic form for adding entities

### Dashboard (Month Summary)
- Dashboard.svelte - Main dashboard view
- LeftoverCard.svelte - "Leftover at end of month" display
- IncomeSummaryCard.svelte - Total income breakdown
- ExpenseSummaryCard.svelte - Total expenses breakdown
- PaymentSourcesCard.svelte - Payment sources with net worth
- MonthSelector.svelte - Month navigation (year + months)
- QuickActions.svelte - Quick-add buttons

### Bills
- BillsPage.svelte - Bills management page
- BillList.svelte - List of all bills
- BillForm.svelte - Add/edit bill form
- EditBillModal.svelte - Modal for editing bills

### Incomes
- IncomesPage.svelte - Incomes management page
- IncomeList.svelte - List of all incomes
- IncomeForm.svelte - Add/edit income form
- EditIncomeModal.svelte - Modal for editing incomes

### Expenses
- ExpensesPage.svelte - Expenses management page
- VariableExpenseList.svelte - List of variable expenses
- VariableExpenseForm.svelte - Add/edit variable expense form
- FreeFlowingExpenseList.svelte - List of free-flowing expenses
- FreeFlowingExpenseForm.svelte - Add/edit free-flowing expense form

### Payment Sources
- PaymentSourcesPage.svelte - Payment sources management page
- PaymentSourceList.svelte - List of payment sources
- AddPaymentSourceForm.svelte - Add payment source form
- EditPaymentSourceForm.svelte - Edit payment source form
- TotalCashCard.svelte - Total cash/net worth display

### Shared Components
- LoadDefaultsButton.svelte - Button to load pre-defined data
- ClearAllButton.svelte - Button to clear all entities
- CurrencyInput.svelte - Currency input with formatting
- DatePicker.svelte - Date picker component
- Dropdown.svelte - Generic dropdown component
- Modal.svelte - Generic modal component
- ConfirmDialog.svelte - Confirmation dialog for destructive actions

## Implementation Notes

- All components use scoped CSS (no global styles)
- Props for data input, events for data output
- Reactive declarations ($:) for derived state
- Stores integration for global state only
- Inline validation errors in forms
