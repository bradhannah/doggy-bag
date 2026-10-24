<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type {
    CategorySection as CategorySectionType,
    BillInstanceDetailed,
    IncomeInstanceDetailed,
    Occurrence,
  } from '../../stores/detailed-month';
  import OccurrenceCard from './OccurrenceCard.svelte';
  import AdHocForm from './AdHocForm.svelte';
  import { formatCurrency } from '$lib/utils/format';
  import { hexToRgba } from '$lib/utils/color';

  export let section: CategorySectionType;
  export let type: 'bills' | 'income' = 'bills';
  export let month: string = '';
  export let readOnly: boolean = false;
  export let hiddenCount: number = 0; // Number of hidden closed items (for partial categories)
  export let collapsed: boolean = false; // Show collapsed single-line view (for completed categories)
  export let isInsuranceSection: boolean = false; // True for insurance sections (hides ad-hoc button)
  export let variant: 'card' | 'flat' = 'card'; // 'flat' = Table view: items collapse to one line

  const dispatch = createEventDispatcher();

  // Ad-hoc form state
  let showAdHocForm = false;

  // Count total occurrences and closed occurrences for stats
  function countOccurrences(items: (BillInstanceDetailed | IncomeInstanceDetailed)[]): {
    total: number;
    closed: number;
  } {
    let total = 0;
    let closed = 0;
    for (const item of items) {
      if (item.occurrences && item.occurrences.length > 0) {
        total += item.occurrences.length;
        closed += item.occurrences.filter((occ: Occurrence) => occ.is_closed).length;
      } else {
        // Fallback: item without occurrences counts as 1
        total += 1;
        if (item.is_closed) closed += 1;
      }
    }
    return { total, closed };
  }

  $: occurrenceStats = countOccurrences(section.items);
  $: doneLabel = type === 'bills' ? 'paid' : 'received';

  $: showAmber =
    section.subtotal.actual > 0 && section.subtotal.actual !== section.subtotal.expected;

  // Category completion state: all items closed (not just paid) or no items
  // Use is_closed because an item can have payments but still be open
  $: allClosed = section.items.length > 0 && section.items.every((item) => item.is_closed);
  $: isEmpty = section.items.length === 0;
  $: isComplete = allClosed;

  $: headerBgColor = hexToRgba(section.category.color, 0.08);

  function handleRefresh() {
    dispatch('refresh');
  }

  function openAdHocForm() {
    showAdHocForm = true;
  }

  function handleAdHocCreated() {
    showAdHocForm = false;
    dispatch('refresh');
  }
</script>

<div class="category-section" class:complete={isComplete || collapsed} data-category>
  <div class="ledger-row category-header" style="background: {headerBgColor}">
    <div class="ledger-label category-title">
      <span class="category-color" style="background-color: {section.category.color}"></span>
      <h4>{section.category.name}</h4>
      {#if collapsed}
        <span class="category-progress complete">
          {section.items.length} item{section.items.length !== 1 ? 's' : ''}, all {doneLabel}
        </span>
      {:else if occurrenceStats.total > 0}
        <span
          class="category-progress"
          class:complete={occurrenceStats.closed === occurrenceStats.total}
        >
          {occurrenceStats.closed} of {occurrenceStats.total}
          {doneLabel}
        </span>
      {/if}
      {#if hiddenCount > 0}
        <span class="category-progress">· {hiddenCount} hidden</span>
      {/if}
    </div>
    <span class="ledger-amount subtotal" data-col="expected">
      {formatCurrency(section.subtotal.expected)}
    </span>
    <span class="ledger-amount subtotal" class:amber={showAmber} data-col="paid">
      {section.subtotal.actual > 0 ? formatCurrency(section.subtotal.actual) : '—'}
    </span>
    <div class="ledger-actions">
      {#if !isInsuranceSection}
        <button
          class="icon-btn bordered"
          on:click={openAdHocForm}
          aria-label="Add ad-hoc {type === 'bills' ? 'bill' : 'income'} to {section.category.name}"
          title="Add ad-hoc {type === 'bills' ? 'bill' : 'income'}"
          disabled={readOnly}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  {#if !collapsed}
    <div class="category-items">
      {#if isEmpty}<p class="empty-category">No entries yet</p>{/if}
      {#each section.items as item (item.id)}
        <OccurrenceCard
          {item}
          type={type === 'bills' ? 'bill' : 'income'}
          {month}
          {readOnly}
          {variant}
          categoryName={section.category.name}
          on:refresh={handleRefresh}
        />
      {/each}
    </div>
  {/if}
</div>

<!-- Ad-hoc Form Drawer -->
<AdHocForm
  bind:open={showAdHocForm}
  {month}
  type={type === 'bills' ? 'bill' : 'income'}
  defaultCategoryId={section.category.id}
  on:created={handleAdHocCreated}
  on:close={() => (showAdHocForm = false)}
/>

<style>
  .category-section {
    margin-bottom: var(--space-4);
  }

  .category-header {
    min-height: calc(var(--control-height) + var(--space-1));
    border-radius: var(--radius-md);
  }

  .category-color {
    width: calc(var(--space-2) + var(--space-1) / 2);
    height: calc(var(--space-2) + var(--space-1) / 2);
    border-radius: var(--radius-xs);
    flex-shrink: 0;
  }

  .category-title h4 {
    margin: 0;
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .complete .category-title h4 {
    color: var(--text-secondary);
  }

  .category-progress {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .category-progress.complete {
    color: var(--success);
  }

  .subtotal {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--text-primary);
  }

  .complete .subtotal {
    color: var(--text-secondary);
  }

  .subtotal.amber {
    color: var(--warning);
  }

  /* Hairline between items; cards are separate components, so the rule lives here */
  .category-items :global(.occurrence-card + .occurrence-card) {
    border-top: 1px solid var(--border-subtle);
  }

  .empty-category {
    margin: 0;
    padding: var(--space-2) var(--space-3) var(--space-2) var(--space-8);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }
</style>
