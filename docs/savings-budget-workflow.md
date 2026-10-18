# Savings and Budget workflow

Savings plans now use the same entries as the monthly Budget. Plan a transfer once, record it in Budget, and see the corresponding totals in Savings.

## Plan a contribution

1. Open **Savings** and choose the month.
2. Click **Plan a transfer**, or **Plan transfer** beside an account.
3. Choose the savings/investment account and the spending account funding it.
4. Enter the amount, date, and frequency:
   - **Every month** creates a recurring plan. New budgets include it automatically from its first transfer date.
   - **This month only** adds a planned entry directly to the selected, unlocked budget.
5. For a recurring plan added after a budget already exists, select it in **Review budget updates** and apply it.

You can save a recurring plan before creating the budget. One-time entries require an existing, unlocked budget.

The planner also supports **Withdrawal into the budget**. A withdrawal appears as an income entry and reduces the account's net planned/recorded transfers in Savings.

Recurring plans can be managed with the existing Bills/Incomes controls in **Manage**. Change an individual month's amount or date in **Budget**.

## Record the transfer

Open the month's **Budget**, locate the savings entry, and choose **Record payment** or **Record receipt**. Record the full amount, record part and keep the remainder planned, or skip the entry with $0 recorded. Use **More options → Edit plan** to change its planned amount or due date without recording money.

Savings automatically derives the account's recorded total from those completed entries. Goal contributions are included too; a goal contribution should not be entered a second time as a general savings transfer.

Recording a transfer marks it in Doggy Bag. Enter the corresponding current bank balances separately; the app does not execute bank transfers or automatically change those balance snapshots.

## Pause, resume, and complete a goal

Goal actions now control their linked recurring contributions:

- **Pause contributions** pauses active schedules and removes unpaid contributions from unlocked budgets for the current calendar month and later. The confirmation offers **Keep this month’s unpaid contributions** as an explicit exception.
- **Resume contributions** restores saved upcoming contributions dated today or later, retaining their monthly amounts, dates, and notes. Missed dates stay skipped. Explicitly excluded entries and schedules manually stopped, deleted, or reassigned during the pause are not restored.
- New budgets generated while a goal is paused omit its contributions. After resuming, use **Review budget updates** to add applicable entries to those existing budgets; newly generated budgets include the resumed schedule automatically.
- **Complete goal** and **Abandon goal** stop the schedules and remove unpaid current/future contributions, with the same option to retain the current month. Completing an open-ended goal works the same way as completing a goal with a target.
- Deleting a goal stops its schedules and removes unpaid current/future contributions. Recorded Budget history remains available.

Recorded payments, earlier months, and locked budgets retain their financial records. A partially paid contribution keeps the recorded part when its unpaid remainder is paused or removed. These actions do not create a withdrawal or change an account balance.

**Extra contribution** records an additional one-time amount. For a scheduled contribution, record the existing Budget entry instead.

## Budget layout and bank snapshots

Budget's **Auto** column setting places panels side by side when space permits and stacks them in narrower windows. The one-column option remains available. The summary becomes a grid above the entries on smaller desktop windows, and header controls wrap without overlapping.

Empty categories remain available for planning and adding entries. They are not marked complete, and **Hide completed items** does not treat them as completed work.

Account balances display when each snapshot was last updated. A missing balance says **Enter balance**; older snapshots without a timestamp say **Update time unavailable**. Record current bank balances that already include the transactions you have recorded. Editing one account preserves the other accounts' snapshots and timestamps.

The dedicated credit-card payoff workflow still explicitly calculates or accepts a new card balance. Ordinary bill, income, and savings recording remains separate from bank snapshots.

## Review updates to an existing budget

Use **Review budget updates** from Budget or Savings. Manage and goal-schedule creation also provide contextual links to this review.

- Filter **All**, **New entries**, or **Changed entries**.
- Select missing income, expenses, or savings plans to add.
- Review the change in available budget before applying.
- Leave an item unchecked to consider it later.
- Choose **Skip this month** to remember an intentional exclusion.
- Expand **Previously skipped or removed** to restore an excluded item explicitly.

Removing a recurring entry from a month remembers that exclusion. Repeated review/apply requests do not duplicate entries. If the budget or recurring setup changes while the review is open, refresh the preview and select again.

### Review changed recurring amounts and dates

After changing a recurring bill, income, or savings schedule in **Manage**, open the review for an existing budget. Manage also offers a review link after saving an edited recurring item.

1. Expand a changed entry to compare its previous recurring value, the value currently in this budget, and the latest recurring value.
2. Select **amount** and **due date** changes independently for each unpaid occurrence. Changed fields start unselected. The entry's summary checkbox selects suggested changes that have no monthly override.
3. When a monthly value differs from its baseline, choose **Use latest recurring value** explicitly to replace it. Otherwise the monthly override is kept. When applying another field on that entry, the default keep choice is remembered too.
4. Use **Keep this month as-is** to acknowledge the entire current recurring version. Click **Apply selected updates** to save that decision. A later financial/schedule change can be reviewed again; renaming the source does not reopen the decision.
5. Check the available-budget preview beside the Apply button. It includes both additions and selected field changes, including their effect on overlapping legacy Savings totals.

Recorded payments are displayed as preserved. A partial-payment remainder or extra one-time occurrence stays in its monthly plan and is flagged for **Edit plan** in Budget. Changes of billing frequency, unmatched schedule slots, and ambiguous older dates also require explicit monthly editing instead of guessed remapping. Date changes with a reliable occurrence match can be selected directly.

Unselected suggested changes remain available later. Kept decisions apply to this month and the reviewed recurring version. If data changes while reviewing, the app refreshes the preview and clears stale selections. Locked budgets allow comparison but must be unlocked before applying.

## Existing Savings amounts

Older versions stored a separate monthly contribution amount per account. Those amounts are retained as **unlinked** planning hints until they are covered by budget entries or explicitly skipped.

The review treats an old account amount as a total, including linked goals. For example:

- Previous Savings amount: **$500**.
- Goal contribution already in Budget: **$200**.
- New recurring savings plan selected in the review: **$300**.
- Additional legacy amount needed: **$0**.

The account ends up with $500 planned, rather than $1,000. The preview adjusts the legacy remainder as selections change, including when a previously skipped plan is restored.

When a single new monthly plan exactly matches an unpaid legacy entry, the review can **link** the existing entry instead of adding another. Its monthly amount and dates are kept. Recorded history is not automatically reassigned.

Unlinked hints contribute to the Savings estimate while displayed as unlinked, but they do not reserve available Budget money until imported. Locked budgets remain read-only.

## Reading the Savings columns

| Column   | Meaning                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------ |
| Start    | Entered opening balance; defaults to the previous month's observed Final balance when available. |
| Planned  | Net contributions minus withdrawals in this month's Budget, including recorded entries.          |
| Recorded | Net completed contributions minus completed withdrawals in this month's Budget.                  |
| Est. EOM | Start plus Planned, plus any displayed unlinked legacy amount awaiting review.                   |
| Final    | Observed closing balance. Blank uses the estimate for display/copy; `0` is an actual zero.       |
| Change   | Effective Final minus Start, including transfers, interest, and investment movement.             |

Expand an account's budget-entry details to see what contributes to its totals. On narrower windows, the table becomes a stacked layout so all balance fields remain visible.

**Push Final to Next Month** copies the displayed final balances or estimates into an already-created next month. It respects the destination month's lock and asks before overwriting non-zero starting balances.

## Developer notes

- `savings_account_id` links bill/income definitions and monthly instances to the savings account. `payment_source_id` identifies the spending account on new plans.
- Legacy goal schedules used `payment_source_id` as their destination; the resolver preserves that historical convention.
- `savings_contributions` is a legacy planning-hint map, not the new contribution ledger. Covered hints are retired on save.
- Monthly instance construction is shared by generation, legacy sync, and review/apply.
- `excluded_budget_sources` stores explicit month-local exclusions by stable source key.
- Preview revisions cover the monthly record, recurring definitions, and account configuration. Apply checks that revision and recognises retries of the latest operation.
- `shared/budget-workflow.ts` contains wire contracts and the pure, selection-aware legacy calculation used by both client and server.
- Goal transitions run through `updateGoalContributions()` within the serialised data-access operation. `paused_by_goal_id` identifies schedules eligible for automatic resumption. Monthly `paused_goal_contributions` retains unpaid occurrence data outside the financial totals; recorded occurrences stay in `bill_instances`.
- Bills resolve their associated `goal_status` on reads, so generation/review also suppress active legacy definitions belonging to paused or closed goals. Existing legacy monthly entries are not silently rewritten on read.
- Resume advances `effective_from` while retaining the recurrence anchor. It does not change recorded occurrences or overwrite monthly overrides from recurring defaults.
- `bank_balances_updated_at` stores per-account snapshot-update timestamps. The bank-balances endpoint merges submitted accounts rather than replacing the entire map.
- Adding a manually tracked credit card synchronises only that card's payment entry; unrelated recurring changes still go through review.
- `recurring_origin` records an occurrence's original schedule slot, amount, and date. `source_snapshot` remains the historical source identity; accepting field changes does not replace it.
- `recurring_review` stores per-field reviewed versions/values, and `kept_recurring_revision` acknowledges an entire entry's recurring version. Bill/income `recurring_revisions` advance only for amount or schedule changes, including changes back to an earlier value.
- Existing records without occurrence references use conservative matching. Once a reliably matched legacy field is reviewed, its reference is retained for subsequent changes.
- The UTC occurrence-date repair is marked complete with `occurrence_dates_migrated`, so reads do not undo later explicit edits. New occurrence references and reviewed dates are also protected from the legacy repair.

Endpoints:

```text
GET  /api/months/:month/savings
POST /api/savings-plans
GET  /api/months/:month/budget-updates
POST /api/months/:month/budget-updates
```

The apply request contains `revision`, `selected_keys`, and `skipped_keys`. Keys can identify additions or individual amount/date changes. A changed entry's parent key in `skipped_keys` means keep the whole monthly plan for this version; a field key means keep that field. The server recalculates proposed values from its own current data; clients do not submit authoritative amounts. Results include `updated` field and `kept` decision counts alongside additions, links, and skips.

Goal action endpoints `POST /api/savings-goals/:id/pause`, `/complete`, and `/abandon` accept an optional `{ "keep_current_month": true }` body. Omitted or false means unpaid entries in the current calendar month are included in the action. `/resume` resumes from today's local date. `/complete` also accepts `completed_at` for its historical completion label; contribution cleanup still uses the action's current calendar month.
