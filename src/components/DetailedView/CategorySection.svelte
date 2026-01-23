<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type {
    CategorySection as CategorySectionType,
    BillInstanceDetailed,
    IncomeInstanceDetailed,
    Occurrence,
  } from '../../stores/detailed-month';
  import BillRow from './BillRow.svelte';
  import IncomeRow from './IncomeRow.svelte';
  import OccurrenceCard from './OccurrenceCard.svelte';
  import AdHocForm from './AdHocForm.svelte';

  export let section: CategorySectionType;
  export let type: 'bills' | 'income' = 'bills';
  export let month: string = '';
  export let compactMode: boolean = false;
  export let readOnly: boolean = false;
  export let hiddenCount: number = 0; // Number of hidden closed items (for partial categories)
  export let collapsed: boolean = false; // Show collapsed single-line view (for completed categories)

  const dispatch = createEventDispatcher();

  // Ad-hoc form state
  let showAdHocForm = false;

  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(dollars);
  }

  // Type guards
  function isBillInstance(
    item: BillInstanceDetailed | IncomeInstanceDetailed
  ): item is BillInstanceDetailed {
    return 'bill_id' in item;
  }

  // Check if item has multiple occurrences
  // Show as OccurrenceCard if there are multiple occurrences (regardless of billing period)
  // This handles: bi-weekly, weekly, AND monthly items with manually-added occurrences
  function hasMultipleOccurrences(item: BillInstanceDetailed | IncomeInstanceDetailed): boolean {
    return item.occurrences && item.occurrences.length > 1;
  }

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
  $: statsLabel = type === 'bills' ? 'paid' : 'received';

  $: showAmber =
    section.subtotal.actual > 0 && section.subtotal.actual !== section.subtotal.expected;

  // Category completion state: all items closed (not just paid) or no items
  // Use is_closed because an item can have payments but still be open
  $: allClosed = section.items.length > 0 && section.items.every((item) => item.is_closed);
  $: isEmpty = section.items.length === 0;
  $: isComplete = allClosed || isEmpty;

  // Generate a subtle background tint from the category color
  function hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgba(100, 100, 100, ${alpha})`; // fallback
  }

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

{#if collapsed}
  <!-- Collapsed single-line view for completed categories -->
  <div
    class="category-collapsed"
    class:compact={compactMode}
    style="border-left-color: {section.category.color}; background: {headerBgColor}"
  >
    <span class="collapse-chevron">▸</span>
    <span class="category-color" style="background-color: {section.category.color}"></span>
    <span class="category-name">{section.category.name}</span>
    <span class="checkmark">✓</span>
    <span class="item-count">
      {section.items.length} item{section.items.length !== 1 ? 's' : ''}
    </span>
    {#if occurrenceStats.total > 0}
      <span class="occurrence-stats complete">
        {occurrenceStats.closed}/{occurrenceStats.total}
        {statsLabel}
      </span>
    {/if}
    <button
      class="add-adhoc-btn"
      on:click={openAdHocForm}
      title="Add ad-hoc {type === 'bills' ? 'bill' : 'income'}"
      disabled={readOnly}
    >
      +
    </button>
  </div>
{:else}
  <!-- Expanded view -->
  <div class="category-section" class:compact={compactMode} class:complete={isComplete}>
    <div
      class="category-header"
      style="border-left-color: {section.category.color}; background: {headerBgColor}"
    >
      <div class="category-title">
        <span class="category-color" style="background-color: {section.category.color}"></span>
        <h4 class:crossed-out={isComplete}>{section.category.name}</h4>
        {#if hiddenCount > 0}
          <span class="hidden-count">{hiddenCount} hidden</span>
        {/if}
        {#if occurrenceStats.total > 0}
          <span
            class="occurrence-stats"
            class:complete={occurrenceStats.closed === occurrenceStats.total}
          >
            {occurrenceStats.closed}/{occurrenceStats.total}
            {statsLabel}
          </span>
        {/if}
        <button
          class="add-adhoc-btn"
          on:click={openAdHocForm}
          title="Add ad-hoc {type === 'bills' ? 'bill' : 'income'}"
          disabled={readOnly}
        >
          +
        </button>
      </div>

      <div class="category-subtotal">
        <span class="subtotal-item">
          <span class="subtotal-label">Expected</span>
          <span class="subtotal-value">{formatCurrency(section.subtotal.expected)}</span>
        </span>
        <span class="subtotal-item">
          <span class="subtotal-label">Actual</span>
          <span class="subtotal-value" class:amber={showAmber}>
            {section.subtotal.actual > 0 ? formatCurrency(section.subtotal.actual) : '-'}
          </span>
        </span>
      </div>
    </div>

    <div class="category-items">
      {#each section.items as item (item.id)}
        {#if hasMultipleOccurrences(item)}
          <!-- Multi-occurrence items (bi-weekly, weekly) use OccurrenceCard -->
          <OccurrenceCard
            {item}
            type={type === 'bills' ? 'bill' : 'income'}
            {month}
            {readOnly}
            on:refresh={handleRefresh}
          />
        {:else if type === 'bills' && isBillInstance(item)}
          <!-- Regular monthly bills use BillRow -->
          <BillRow
            bill={item}
            {month}
            {compactMode}
            {readOnly}
            categoryName={section.category.name}
            on:refresh={handleRefresh}
            on:reopened
            on:closed
          />
        {:else if type === 'income' && !isBillInstance(item)}
          <!-- Regular monthly incomes use IncomeRow -->
          <IncomeRow
            income={item}
            {month}
            {compactMode}
            {readOnly}
            categoryName={section.category.name}
            on:refresh={handleRefresh}
            on:reopened
            on:closed
          />
        {/if}
      {/each}
    </div>
  </div>
{/if}

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
    margin-bottom: 24px;
  }

  /* Complete/empty category state: use muted colors instead of opacity
     (opacity creates a stacking context which breaks position:fixed drawers inside).
     Only the header gets opacity - the items section is not dimmed because
     BillRow/IncomeRow/OccurrenceCard contain position:fixed drawers that would
     be trapped in the stacking context. Each row handles its own "closed" styling. */
  .category-section.complete .category-header {
    opacity: 0.6;
  }

  /* Keep add button fully visible in complete state */
  .category-section.complete .add-adhoc-btn {
    opacity: 1.67; /* Counteract parent opacity: 1/0.6 ≈ 1.67 */
  }

  /* Crossed out category name */
  .crossed-out {
    text-decoration: line-through;
  }

  .category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-radius: 8px;
    border-left: 4px solid var(--border-default);
    margin-bottom: 8px;
  }

  .category-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .category-color {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .category-title h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .occurrence-stats {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary);
    padding: 2px 8px;
    background: var(--bg-elevated);
    border-radius: 10px;
  }

  .occurrence-stats.complete {
    color: var(--success);
    background: var(--success-bg);
  }

  .add-adhoc-btn {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    border: 1px dashed var(--border-default);
    background: transparent;
    color: var(--text-secondary);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    margin-left: 4px;
  }

  .add-adhoc-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-muted);
  }

  .category-subtotal {
    display: flex;
    gap: 20px;
  }

  .subtotal-item {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .subtotal-label {
    font-size: 0.625rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .subtotal-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .subtotal-value.amber {
    color: var(--warning);
  }

  .category-items {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-left: 8px;
  }

  @media (max-width: 640px) {
    .category-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .category-subtotal {
      width: 100%;
      justify-content: space-between;
    }
  }

  /* Compact mode styles */
  .category-section.compact {
    margin-bottom: 12px;
  }

  .category-section.compact .category-header {
    padding: 8px 10px;
    margin-bottom: 4px;
  }

  .category-section.compact .category-title h4 {
    font-size: 0.9rem;
  }

  .category-section.compact .category-color {
    width: 10px;
    height: 10px;
  }

  .category-section.compact .occurrence-stats {
    font-size: 0.65rem;
    padding: 1px 6px;
  }

  .category-section.compact .add-adhoc-btn {
    width: 18px;
    height: 18px;
    font-size: 0.85rem;
  }

  .category-section.compact .subtotal-label {
    font-size: 0.55rem;
  }

  .category-section.compact .subtotal-value {
    font-size: 0.8rem;
  }

  .category-section.compact .category-items {
    gap: 2px;
    padding-left: 6px;
  }

  /* Hidden count badge for partially complete categories */
  .hidden-count {
    font-size: 0.7rem;
    color: var(--text-secondary);
    padding: 2px 8px;
    background: var(--bg-elevated);
    border-radius: 10px;
    font-style: italic;
  }

  /* Collapsed category row for completed categories */
  .category-collapsed {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    border-radius: 8px;
    border-left: 4px solid var(--border-default);
    margin-bottom: 8px;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .category-collapsed:hover {
    opacity: 0.85;
  }

  .collapse-chevron {
    color: var(--text-tertiary);
    font-size: 0.8rem;
    width: 12px;
    flex-shrink: 0;
  }

  .category-collapsed .category-color {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .category-collapsed .category-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 1rem;
  }

  .category-collapsed .checkmark {
    color: var(--success);
    font-weight: bold;
    font-size: 0.9rem;
  }

  .category-collapsed .item-count {
    color: var(--text-secondary);
    font-size: 0.8rem;
    margin-left: auto;
  }

  .category-collapsed .occurrence-stats {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--success);
    padding: 2px 8px;
    background: var(--success-bg);
    border-radius: 10px;
  }

  .category-collapsed .add-adhoc-btn {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    border: 1px dashed var(--border-default);
    background: transparent;
    color: var(--text-secondary);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    margin-left: 8px;
    /* Counteract parent opacity */
    opacity: 1.43;
  }

  .category-collapsed .add-adhoc-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-muted);
  }

  /* Compact mode for collapsed categories */
  .category-collapsed.compact {
    padding: 6px 10px;
    gap: 8px;
    margin-bottom: 4px;
  }

  .category-collapsed.compact .collapse-chevron {
    font-size: 0.7rem;
    width: 10px;
  }

  .category-collapsed.compact .category-color {
    width: 10px;
    height: 10px;
  }

  .category-collapsed.compact .category-name {
    font-size: 0.85rem;
  }

  .category-collapsed.compact .checkmark {
    font-size: 0.8rem;
  }

  .category-collapsed.compact .item-count {
    font-size: 0.7rem;
  }

  .category-collapsed.compact .occurrence-stats {
    font-size: 0.65rem;
    padding: 1px 6px;
  }

  .category-collapsed.compact .add-adhoc-btn {
    width: 18px;
    height: 18px;
    font-size: 0.85rem;
  }
</style>
