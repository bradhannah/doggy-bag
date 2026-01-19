# Quickstart: Miscellaneous Fixes & Improvements

**Feature**: `013-misc-fixes`

## Key Features

### 1. Insurance Workflow Overhaul

- **Setup**: Go to **Manage > Family Members**. Drag and drop insurance plans to define the specific priority for each person (e.g., "Desi uses Student Plan first, then Mom's").
- **New Claim**: Creating a claim for a member now auto-generates all draft submissions in the correct order.
- **Waterfall**: When you close the Primary submission, the Secondary automatically calculates the remaining balance.
- **Portals**: Look for the "Go to Portal" button on submission rows to open the provider's website instantly in your browser.

### 2. Savings Goals

- **New Page**: **Goals** in the main navigation.
- **Create**: Add "Winter Tires", set target $800. The wizard helps you create a monthly bill.
- **Track**: See "Temperature" status (Cool/Warm/Hot).
- **Finish**: Click **"Buy That Thing!"** to withdraw funds and record the purchase.

### 3. Budgeting Enhancements

- **Projections**: New **Projections** page shows a daily "Available Funds" histogram to predict deficits.
- **Quick Filter**: Press `Ctrl+F` (or `Cmd+F`) on the Budget page to fuzzy-search any bill or income.
- **Payment Details**: Clicking "Close" on a bill now asks for the exact date and optional notes. Notes appear inline.

## Verification Steps

### Test Insurance Flow

1. Go to **Manage > Family Members**. Edit a member, add 2 plans.
2. Go to **Insurance**. Create a new claim for that member.
3. Verify 2 submissions appear: #1 Draft, #2 Awaiting.
4. "Submit" #1, then "Approve" it with partial payment.
5. Verify #2 activates with the remainder amount.

### Test Savings Goal

1. Go to **Goals**. Create a goal "Test Goal".
2. Accept the recommended monthly bill.
3. Go to **Budget**. Pay the new "Savings - Test Goal" bill.
4. Return to **Goals**. Verify progress bar increased.

### Test Histogram

1. Go to **Projections**.
2. Hover over bars to see daily income/expenses.
3. Enter a "Daily Run Rate" to simulate extra spending.
