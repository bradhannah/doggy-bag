<script lang="ts">
  import type { BudgetUpdateItem, BudgetFieldChange } from '$lib/types/budget-workflow';
  import { formatCurrency } from '$lib/utils/format';

  export let item: BudgetUpdateItem;
  export let choices: Record<string, 'add' | 'skip' | undefined>;
  export let disabled = false;
  export let onChoose: (key: string, choice: 'add' | 'skip' | undefined) => void;
  export let month: string;
  export let onOpenBudget: () => void;

  $: safe = (item.changes ?? []).filter((change) => !change.is_override);
  $: selected = (item.changes ?? []).filter((change) => choices[change.key] === 'add');
  $: kept = choices[item.key] === 'skip';
  $: amountChanges = (item.changes ?? []).filter((change) => change.field === 'expected_amount');
  $: dateChanges = (item.changes ?? []).filter((change) => change.field === 'expected_date');
  const value = (change: BudgetFieldChange, amount: number | string) =>
    change.field === 'expected_amount' ? formatCurrency(Number(amount)) : String(amount);

  function chooseField(key: string, choice: 'add' | 'skip' | undefined) {
    onChoose(item.key, undefined);
    onChoose(key, choice);
  }
  function keep() {
    for (const change of item.changes ?? []) onChoose(change.key, undefined);
    onChoose(item.key, kept ? undefined : 'skip');
  }
</script>

<div class="change-row" class:kept>
  <div class="heading">
    <label>
      {#if safe.length}
        <input
          type="checkbox"
          aria-label={`Select suggested changes for ${item.name}`}
          checked={safe.every((change) => choices[change.key] === 'add')}
          {disabled}
          on:change={(event) => {
            for (const change of safe)
              chooseField(change.key, event.currentTarget.checked ? 'add' : undefined);
          }}
        />
      {/if}
      <strong>{item.name}</strong>
    </label>
    <span
      >Selected impact {item.impact >= 0 ? '+' : '−'}{formatCurrency(Math.abs(item.impact))}</span
    >
  </div>
  <p class="hint">
    {#if amountChanges.length === 1}Amount: {formatCurrency(Number(amountChanges[0].current))} → {formatCurrency(
        Number(amountChanges[0].proposed)
      )}.
    {:else if amountChanges.length}{amountChanges.length} amount changes.{/if}
    {#if dateChanges.length === 1}Due date: {dateChanges[0].current} → {dateChanges[0].proposed}.
    {:else if dateChanges.length}{dateChanges.length} due-date changes.{/if}
  </p>
  <p class="hint">
    {kept
      ? 'Keep this month as-is for this recurring version.'
      : `${selected.length} field changes selected. Recorded entries are preserved.`}
  </p>
  <details>
    <summary
      >{item.changes?.some((change) => change.is_override)
        ? 'Review monthly overrides and changes'
        : 'Show change details'}</summary
    >
    {#each item.changes ?? [] as change (change.key)}
      <div class="field-change">
        <strong>{change.field === 'expected_amount' ? 'Amount' : 'Due date'} · {change.date}</strong
        >
        <dl>
          <div>
            <dt>Previous recurring value</dt>
            <dd>{value(change, change.original)}</dd>
          </div>
          <div>
            <dt>In this budget</dt>
            <dd>{value(change, change.current)}</dd>
          </div>
          <div>
            <dt>Latest recurring value</dt>
            <dd>{value(change, change.proposed)}</dd>
          </div>
        </dl>
        {#if change.field === 'expected_amount'}<p class="hint">
            If applied: available budget {change.impact >= 0 ? '+' : '−'}{formatCurrency(
              Math.abs(change.impact)
            )}
          </p>{/if}
        {#if change.is_override}
          <fieldset {disabled}>
            <legend>Your monthly value differs. Choose explicitly to replace it.</legend>
            <label
              ><input
                type="radio"
                name={change.key}
                checked={choices[change.key] !== 'add'}
                on:click={() => chooseField(change.key, 'skip')}
              />Keep my monthly value — {value(change, change.current)}</label
            >
            <label
              ><input
                type="radio"
                name={change.key}
                checked={choices[change.key] === 'add'}
                on:change={() => chooseField(change.key, 'add')}
              />Use latest recurring value — {value(change, change.proposed)}</label
            >
          </fieldset>
        {:else}
          <label
            ><input
              type="checkbox"
              {disabled}
              checked={choices[change.key] === 'add'}
              on:change={(event) =>
                chooseField(change.key, event.currentTarget.checked ? 'add' : undefined)}
            />Update {change.field === 'expected_amount' ? 'amount' : 'due date'} for {change.date}</label
          >
        {/if}
      </div>
    {/each}
    {#each item.preserved ?? [] as entry, index (index)}
      <p class="preserved">{entry.date} · {formatCurrency(entry.amount)} · {entry.reason}</p>
    {/each}
    {#each item.notices ?? [] as notice (notice)}<p class="notice">
        {notice}
        <a
          href={`/month/${month}`}
          aria-disabled={disabled}
          on:click={(event) => {
            if (disabled) event.preventDefault();
            else onOpenBudget();
          }}>Open Budget</a
        >
      </p>{/each}
    <p class="hint">
      Planned total after selected changes: {formatCurrency(
        item.amount + (item.kind === 'bill' ? -1 : 1) * item.impact
      )}
    </p>
  </details>
  <button type="button" {disabled} on:click={keep}
    >{kept ? 'Keep suggesting' : 'Keep this month as-is'}</button
  >
</div>

<style>
  .change-row {
    padding: var(--space-4) 0;
    border-bottom: thin solid var(--border-subtle);
  }
  .kept {
    background: var(--bg-elevated);
  }
  .heading {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-3);
  }
  label {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }
  input {
    accent-color: var(--accent);
  }
  .hint,
  .preserved,
  dt {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  summary {
    cursor: pointer;
    color: var(--accent);
  }
  .field-change {
    padding: var(--space-3);
    margin-top: var(--space-3);
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
  }
  dl {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
    gap: var(--space-2);
  }
  dd {
    margin: var(--space-1) 0 0;
  }
  fieldset {
    border: thin solid var(--border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-3);
  }
  fieldset label + label {
    margin-top: var(--space-2);
  }
  legend {
    font-size: 0.875rem;
  }
  .notice {
    padding: var(--space-3);
    background: var(--warning-bg);
    color: var(--text-primary);
  }
  a,
  button {
    color: var(--accent);
  }
  button {
    background: transparent;
    border: none;
    padding: var(--space-2) 0;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
