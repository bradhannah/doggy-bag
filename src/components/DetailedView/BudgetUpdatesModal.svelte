<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Modal from '../shared/Modal.svelte';
  import BudgetChangeRow from './BudgetChangeRow.svelte';
  import { apiClient, ApiError } from '$lib/api/client';
  import { formatCurrency } from '$lib/utils/format';
  import { formatMonthDisplay } from '../../stores/ui';
  import { success } from '../../stores/toast';
  import type {
    BudgetUpdatePreview,
    BudgetUpdateItem,
    BudgetUpdateResult,
  } from '$lib/types/budget-workflow';
  import { effectiveBudgetUpdates } from '$lib/types/budget-workflow';

  export let month: string;
  export let initialSelected: string[] = [];
  export let onClose: () => void;
  export let onApplied: () => void = () => {};

  let preview: BudgetUpdatePreview | null = null;
  let choices: Record<string, 'add' | 'skip' | undefined> = {};
  let loading = true;
  let saving = false;
  let error = '';
  let missing = false;
  let requestId = 0;
  let initialSelectionConsumed = false;
  let filter: 'all' | 'new' | 'changed' = 'all';

  onMount(() => {
    void load();
  });
  onDestroy(() => {
    requestId++;
  });

  async function load(clearError = true) {
    const id = ++requestId;
    loading = true;
    if (clearError) error = '';
    try {
      const result = (await apiClient.get(
        `/api/months/${month}/budget-updates`
      )) as BudgetUpdatePreview;
      if (id !== requestId) return;
      preview = result;
      const wanted = initialSelectionConsumed ? [] : initialSelected;
      choices = Object.fromEntries(
        result.items
          .filter((item) => item.operation !== 'update' && wanted.includes(item.key))
          .map((item) => [item.key, 'add'])
      );
      initialSelectionConsumed = true;
    } catch (e) {
      if (id !== requestId) return;
      missing = e instanceof ApiError && e.status === 404;
      error = missing
        ? 'Create this month’s budget first. Your recurring plans will be included when it is created.'
        : e instanceof Error
          ? e.message
          : 'Could not load budget updates';
    } finally {
      if (id === requestId) loading = false;
    }
  }

  $: effectiveItems = effectiveBudgetUpdates(
    preview?.items ?? [],
    Object.keys(choices).filter((key) => choices[key] === 'add')
  );
  $: offered = effectiveItems.filter(
    (item) =>
      !item.excluded &&
      (filter === 'all' || (filter === 'changed') === (item.operation === 'update'))
  );
  $: excluded = effectiveItems.filter((item) => item.excluded);
  $: selectedKeys = Object.keys(choices).filter((key) => choices[key] === 'add');
  $: skippedKeys = [
    ...new Set([
      ...Object.keys(choices).filter((key) => choices[key] === 'skip'),
      ...effectiveItems
        .filter((item) => item.changes?.some((change) => choices[change.key] !== undefined))
        .flatMap((item) =>
          (item.changes ?? [])
            .filter((change) => change.is_override && choices[change.key] === undefined)
            .map((change) => change.key)
        ),
    ]),
  ];
  $: impact = effectiveItems
    .filter((item) => item.operation === 'update' || selectedKeys.includes(item.key))
    .reduce((sum, item) => sum + item.impact, 0);

  function chooseKey(key: string, choice: 'add' | 'skip' | undefined) {
    choices = { ...choices, [key]: choice };
  }

  function choose(item: BudgetUpdateItem, choice: 'add' | 'skip' | undefined) {
    choices = { ...choices, [item.key]: choice };
  }

  async function apply() {
    if (!preview || saving || preview.is_read_only) return;
    saving = true;
    error = '';
    try {
      const result = (await apiClient.post(`/api/months/${month}/budget-updates`, {
        revision: preview.revision,
        selected_keys: selectedKeys,
        skipped_keys: skippedKeys,
      })) as BudgetUpdateResult;
      success(
        result.already_applied
          ? 'These budget updates have already been applied.'
          : `${formatMonthDisplay(result.month)} updated: ${result.added} added, ${result.linked} linked, ${result.updated ?? 0} fields updated, ${result.kept ?? 0} kept, ${result.skipped} skipped.`
      );
      onApplied();
      onClose();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not apply budget updates';
      if (e instanceof ApiError && e.status === 409) await load(false);
    } finally {
      saving = false;
    }
  }
</script>

<Modal
  open={true}
  title="Review budget updates"
  subtitle={formatMonthDisplay(month)}
  size="lg"
  onClose={() => !saving && onClose()}
>
  <p class="intro">
    Review new entries and changes to recurring amounts or dates. Changed fields start unselected.
    Monthly overrides require an explicit choice. Unselected changes stay available for later.
  </p>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if loading}
    <p role="status">Checking recurring plans…</p>
  {:else if preview}
    {#if preview.is_read_only}<p class="notice">
        This budget is locked. Unlock it in Manage to apply updates.
      </p>{/if}
    <div class="filters" aria-label="Update types">
      {#each ['all', 'new', 'changed'] as tab (tab)}
        <button
          class="secondary"
          aria-pressed={filter === tab}
          on:click={() => (filter = tab as typeof filter)}
        >
          {tab === 'all' ? 'All' : tab === 'new' ? 'New entries' : 'Changed entries'} ({effectiveItems.filter(
            (item) =>
              !item.excluded &&
              (tab === 'all' || (tab === 'changed') === (item.operation === 'update'))
          ).length})
        </button>
      {/each}
    </div>
    {#if offered.length === 0}<p class="notice">No updates in this view.</p>{/if}
    {#each ['income', 'expenses', 'savings'] as group (group)}
      {@const items = offered.filter((item) => item.group === group)}
      {#if items.length}
        <section>
          <h3>{group === 'income' ? 'Income' : group === 'expenses' ? 'Expenses' : 'Savings'}</h3>
          {#each items as item (item.key)}
            {#if item.operation === 'update'}
              <BudgetChangeRow
                {item}
                {choices}
                {month}
                disabled={saving || preview.is_read_only}
                onChoose={chooseKey}
                onOpenBudget={onClose}
              />
            {:else}
              <div class="update-row" class:skipped={choices[item.key] === 'skip'}>
                <label class="item-choice">
                  <input
                    type="checkbox"
                    aria-label={`${item.legacy ? 'Add unlinked amount for' : 'Add'} ${item.name}`}
                    aria-describedby={`update-reason-${item.key}`}
                    checked={choices[item.key] === 'add'}
                    disabled={saving ||
                      preview.is_read_only ||
                      (!!item.legacy && item.amount === 0)}
                    on:change={(event) =>
                      choose(item, event.currentTarget.checked ? 'add' : undefined)}
                  />
                  <span
                    ><strong>{item.name}</strong><small id={`update-reason-${item.key}`}
                      >{item.reason} Dates: {item.dates.join(', ')}.</small
                    ></span
                  >
                </label>
                <div class="item-values">
                  <strong>{formatCurrency(item.amount)}</strong>
                  <small
                    >{item.legacy && item.amount === 0
                      ? 'Covered by selected plans'
                      : item.operation === 'link'
                        ? 'Already budgeted'
                        : `Available ${item.impact >= 0 ? '+' : '−'}${formatCurrency(Math.abs(item.impact))}`}</small
                  >
                  <button
                    class="text-button"
                    disabled={saving || preview.is_read_only}
                    on:click={() => choose(item, choices[item.key] === 'skip' ? undefined : 'skip')}
                  >
                    {choices[item.key] === 'skip' ? 'Keep suggesting' : 'Skip this month'}
                  </button>
                </div>
              </div>
            {/if}
          {/each}
        </section>
      {/if}
    {/each}
    {#if excluded.length}
      <details>
        <summary>Previously skipped or removed ({excluded.length})</summary>
        {#each excluded as item (item.key)}
          <label class="restore-choice">
            <input
              type="checkbox"
              aria-label={`${item.legacy ? 'Add unlinked amount for' : 'Add'} ${item.name}`}
              checked={choices[item.key] === 'add'}
              disabled={saving || preview.is_read_only}
              on:change={(event) => choose(item, event.currentTarget.checked ? 'add' : undefined)}
            />
            Add {item.name} — {formatCurrency(item.amount)}
          </label>
        {/each}
      </details>
    {/if}
  {/if}
  <svelte:fragment slot="footer">
    <div class="review-footer">
      {#if preview && !loading}<div class="impact" aria-live="polite">
          <strong>{selectedKeys.length} selected · {skippedKeys.length} to keep or skip</strong>
          {#if preview.available !== null}
            <span
              >Available budget: {formatCurrency(preview.available)} →
              <strong>{formatCurrency(preview.available + impact)}</strong></span
            >
          {:else}
            <span>Net change: {impact >= 0 ? '+' : '−'}{formatCurrency(Math.abs(impact))}</span>
            <small>Enter bank balances in Budget to see the available total.</small>
          {/if}
        </div>{/if}
      <button class="secondary" on:click={onClose} disabled={saving}>Cancel</button>
      {#if !preview && !missing}
        <button class="primary" on:click={() => load()} disabled={loading}>Retry</button>
      {:else if preview}
        <button
          class="primary"
          on:click={apply}
          disabled={saving ||
            loading ||
            preview.is_read_only ||
            selectedKeys.length + skippedKeys.length === 0}
        >
          {saving ? 'Applying…' : 'Apply selected updates'}
        </button>
      {/if}
    </div>
  </svelte:fragment>
</Modal>

<style>
  .review-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    justify-content: flex-end;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .filters button[aria-pressed='true'] {
    border-color: var(--accent);
    background: var(--accent-muted);
  }
  .intro,
  small {
    color: var(--text-secondary);
  }
  section {
    margin-block: var(--space-5);
  }
  h3 {
    margin: 0 0 var(--space-2);
    font-size: 1rem;
  }
  .update-row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) 0;
    border-bottom: thin solid var(--border-subtle);
  }
  .item-choice {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    flex: 1;
    min-width: 0;
  }
  .item-choice strong {
    overflow-wrap: anywhere;
  }
  small {
    display: block;
    margin-top: var(--space-1);
    font-size: 0.8rem;
  }
  input {
    accent-color: var(--accent);
  }
  .item-values {
    text-align: right;
    flex-shrink: 0;
  }
  .skipped {
    background: var(--bg-elevated);
  }
  .text-button {
    border: none;
    background: transparent;
    padding: var(--space-1) 0;
    color: var(--accent);
    cursor: pointer;
  }
  .notice {
    padding: var(--space-3);
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
  }
  .error {
    color: var(--error);
  }
  details {
    margin-top: var(--space-4);
  }
  summary {
    cursor: pointer;
  }
  .restore-choice {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
  .impact {
    flex: 1 1 15rem;
    display: grid;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--accent-muted);
    border-radius: var(--radius-md);
  }
  .primary,
  .secondary {
    min-height: var(--button-height);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    cursor: pointer;
  }
  .primary {
    border: none;
    background: var(--accent);
    color: var(--text-inverse);
  }
  .secondary {
    border: thin solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-primary);
  }
  button:disabled {
    opacity: 0.6;
    cursor: default;
  }
  @media (max-width: 40rem) {
    .update-row {
      flex-direction: column;
    }
    .item-values {
      text-align: left;
    }
  }
</style>
