# Savings and Budget workflow

Savings plans now use the same entries as the monthly Budget. Plan a transfer once, record it in Budget, and see the corresponding totals in Savings.

## Plan a contribution

1. Open **Savings** and choose the month.
2. Click **Plan a transfer**, or **Plan transfer** beside an account.
3. Choose the savings/investment account and the spending account funding it.
4. Enter the amount, date, and frequency:
   - **Every month** creates a recurring plan. It is added to the selected month right away if that month exists and is unlocked, and new budgets include it automatically from its first transfer date.
   - **This month only** adds a planned entry directly to the selected, unlocked budget.

You can save a recurring plan before creating the budget. One-time entries require an existing, unlocked budget.

## How Manage changes reach a month

- Creating a new recurring bill, income or savings plan adds it to the month you are viewing, if that month exists and is unlocked. Later months pick it up when they are created.
- Editing an existing recurring item's amount or dates never changes months that already exist. Change the month directly with **Edit plan** in Budget.
- Bank transaction name, account URL and notes are always read live from Manage.
- Removing a recurring entry from a month is remembered, so it does not come back.

The planner also supports **Withdrawal into the budget**. A withdrawal appears as an income entry and reduces the account's net planned/recorded transfers in Savings.

Recurring plans can be managed with the existing Bills/Incomes controls in **Manage**. Change an individual month's amount or date in **Budget**.

## Record the transfer

Open the month's **Budget**, locate the savings entry, and choose **Record payment** or **Record receipt**. Record the full amount, record part and keep the remainder planned, or skip the entry with $0 recorded. Use **More options → Edit plan** to change its planned amount or due date without recording money.

Savings automatically derives the account's recorded total from those completed entries.

Recording a transfer marks it in Doggy Bag. Enter the corresponding current bank balances separately; the app does not execute bank transfers or automatically change those balance snapshots.

## Budget layout and bank snapshots

Budget's **Auto** column setting places panels side by side when space permits and stacks them in narrower windows. The one-column option remains available. The summary becomes a grid above the entries on smaller desktop windows, and header controls wrap without overlapping.

Empty categories remain available for planning and adding entries. They are not marked complete, and **Hide completed items** does not treat them as completed work.

Account balances display when each snapshot was last updated. A missing balance says **Enter balance**; older snapshots without a timestamp say **Update time unavailable**. Record current bank balances that already include the transactions you have recorded. Editing one account preserves the other accounts' snapshots and timestamps.

The dedicated credit-card payoff workflow still explicitly calculates or accepts a new card balance. Ordinary bill, income, and savings recording remains separate from bank snapshots.

## Reading the Savings columns

| Column   | Meaning                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------ |
| Start    | Entered opening balance; defaults to the previous month's observed Final balance when available. |
| Planned  | Net contributions minus withdrawals in this month's Budget, including recorded entries.          |
| Recorded | Net completed contributions minus completed withdrawals in this month's Budget.                  |
| Est. EOM | Start plus Planned.                                                                              |
| Final    | Observed closing balance. Blank uses the estimate for display/copy; `0` is an actual zero.       |
| Change   | Effective Final minus Start, including transfers, interest, and investment movement.             |

Expand an account's budget-entry details to see what contributes to its totals. On narrower windows, the table becomes a stacked layout so all balance fields remain visible.

**Push Final to Next Month** copies the displayed final balances or estimates into an already-created next month. It respects the destination month's lock and asks before overwriting non-zero starting balances.

## Developer notes

- `savings_account_id` links bill/income definitions and monthly instances to the savings account. `payment_source_id` identifies the spending account on new plans. Plans converted from the retired Goals feature keep the destination account as their `payment_source_id`; edit the bill in Manage to pick a funding account.
- Monthly instance construction is shared by generation, sync, and `addSourceToMonth`.
- `excluded_budget_sources` stores explicit month-local exclusions by stable source key.
- `shared/budget-workflow.ts` contains the Savings wire contracts used by both client and server.
- `bank_balances_updated_at` stores per-account snapshot-update timestamps. The bank-balances endpoint merges submitted accounts rather than replacing the entire map.
- Adding a manually tracked credit card synchronises only that card's payment entry; unrelated recurring changes still go through review.
- `recurring_origin` records an occurrence's original schedule slot, amount, and date. `source_snapshot` remains the historical source identity.
- The UTC occurrence-date repair is marked complete with `occurrence_dates_migrated`, so reads do not undo later explicit edits.

Endpoints:

```text
GET  /api/months/:month/savings
POST /api/savings-plans
POST /api/bills/:id/add-to-month      { month }
POST /api/incomes/:id/add-to-month    { month }
```

`add-to-month` answers `{ added, reason? }` rather than an error when the month cannot take the item (`month_missing`, `locked`, `already_present`, `excluded`, `no_occurrences`, `not_found`). A recurring savings plan's response carries the same fields for the month it was created from.
