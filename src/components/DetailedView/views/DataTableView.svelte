<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type {
    CategorySection,
    BillInstanceDetailed,
    IncomeInstanceDetailed,
    Occurrence,
  } from '../../../stores/detailed-month';
  import OccurrenceCard from '../OccurrenceCard.svelte';
  import AdHocForm from '../AdHocForm.svelte';
  import { formatCurrency } from '$lib/utils/format';
  import { hexToRgba } from '$lib/utils/color';

  export let sections: CategorySection[] = [];
  export let completedSections: CategorySection[] = [];
  export let insuranceSection: CategorySection | null = null;
  export let hiddenCounts: Map<string, number> = new Map();
  export let type: 'bills' | 'income' = 'bills';
  export let month: string = '';
  export let readOnly: boolean = false;
  export let hidePaidItems: boolean = false;

  const dispatch = createEventDispatcher();

  // Ad-hoc form state
  let showAdHocForm = false;
  let adHocCategoryId = '';

  function handleRefresh() {
    dispatch('refresh');
  }

  function openAdHoc(categoryId: string) {
    adHocCategoryId = categoryId;
    showAdHocForm = true;
  }

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
        total += 1;
        if (item.is_closed) closed += 1;
      }
    }
    return { total, closed };
  }

  $: statsLabel = type === 'bills' ? 'paid' : 'received';
  $: paidLabel = type === 'bills' ? 'Paid' : 'Received';

  // Compute grand totals across all sections
  $: allSections = [
    ...sections,
    ...(insuranceSection ? [insuranceSection] : []),
    ...completedSections,
  ];
  $: grandExpected = allSections.reduce((s, sec) => s + sec.subtotal.expected, 0);
  $: grandActual = allSections.reduce((s, sec) => s + sec.subtotal.actual, 0);
</script>

<div class="data-table-view">
  <!-- Column headers -->
  <div class="column-headers">
    <span class="th-name">Category / Item</span>
    <span class="th-expected">Expected</span>
    <span class="th-actual">{paidLabel}</span>
    <span class="th-remaining">Remaining</span>
  </div>

  <!-- Active sections -->
  {#each sections as section (section.category.id)}
    {@const occStats = countOccurrences(section.items)}
    {@const allClosed = section.items.length > 0 && section.items.every((i) => i.is_closed)}
    {@const hiddenCount = hiddenCounts.get(section.category.id) ?? 0}

    <div
      class="category-block"
      class:complete={allClosed}
      style="border-left-color: {section.category.color}; background: {hexToRgba(
        section.category.color,
        0.04
      )}"
    >
      <!-- Category header -->
      <div class="category-header" style="background: {hexToRgba(section.category.color, 0.08)}">
        <div class="category-title">
          <span class="category-color" style="background-color: {section.category.color}"></span>
          <span class="category-name" class:strikethrough={allClosed}>{section.category.name}</span>
          {#if hiddenCount > 0}
            <span class="hidden-badge">{hiddenCount} hidden</span>
          {/if}
          <span
            class="occ-badge"
            class:all-complete={occStats.closed === occStats.total && occStats.total > 0}
          >
            {occStats.closed}/{occStats.total}
            {statsLabel}
          </span>
          {#if !readOnly}
            <button
              class="add-adhoc-btn"
              title="Add ad-hoc item"
              on:click={() => openAdHoc(section.category.id)}>+</button
            >
          {/if}
        </div>
        <span class="cat-total">{formatCurrency(section.subtotal.expected)}</span>
      </div>

      <!-- Items via flat OccurrenceCard -->
      {#if section.items.length > 0}
        <div class="items-list">
          {#each section.items as item, idx (item.id)}
            <div class="item-wrapper" class:has-separator={idx > 0}>
              <OccurrenceCard
                {item}
                type={type === 'bills' ? 'bill' : 'income'}
                {month}
                {readOnly}
                variant="flat"
                on:refresh={handleRefresh}
              />
            </div>
          {/each}
        </div>
      {:else}
        <p class="empty-text">No items</p>
      {/if}
    </div>
  {/each}

  <!-- Insurance section -->
  {#if insuranceSection && insuranceSection.items.length > 0}
    <div class="insurance-divider">
      <svg class="insurance-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span>{type === 'bills' ? 'Insurance Expenses' : 'Insurance Reimbursements'}</span>
    </div>

    {@const insSection = insuranceSection}
    {@const insOccStats = countOccurrences(insSection.items)}

    <div
      class="category-block"
      style="border-left-color: {insSection.category.color}; background: {hexToRgba(
        insSection.category.color,
        0.04
      )}"
    >
      <div class="category-header" style="background: {hexToRgba(insSection.category.color, 0.08)}">
        <div class="category-title">
          <span class="category-color" style="background-color: {insSection.category.color}"></span>
          <span class="category-name">{insSection.category.name}</span>
          <span class="occ-badge">{insOccStats.closed}/{insOccStats.total} {statsLabel}</span>
        </div>
        <span class="cat-total">{formatCurrency(insSection.subtotal.expected)}</span>
      </div>

      <div class="items-list">
        {#each insSection.items as item, idx (item.id)}
          <div class="item-wrapper" class:has-separator={idx > 0}>
            <OccurrenceCard
              {item}
              type={type === 'bills' ? 'bill' : 'income'}
              {month}
              {readOnly}
              variant="flat"
              on:refresh={handleRefresh}
            />
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Completed sections -->
  {#if completedSections.length > 0}
    <div class="completed-divider"><span>Completed</span></div>

    {#each completedSections as section (section.category.id)}
      {@const occStats = countOccurrences(section.items)}

      {#if hidePaidItems}
        <!-- Collapsed completed category -->
        <div
          class="category-block complete collapsed"
          style="border-left-color: {section.category.color}; background: {hexToRgba(
            section.category.color,
            0.04
          )}"
        >
          <div
            class="category-header"
            style="background: {hexToRgba(section.category.color, 0.08)}"
          >
            <div class="category-title">
              <span class="category-color" style="background-color: {section.category.color}"
              ></span>
              <span class="category-name strikethrough">{section.category.name}</span>
              <span class="collapsed-check">&#10003;</span>
              <span class="collapsed-count">{section.items.length} items</span>
              <span class="occ-badge all-complete"
                >{occStats.closed}/{occStats.total} {statsLabel}</span
              >
            </div>
          </div>
        </div>
      {:else}
        <div
          class="category-block complete"
          style="border-left-color: {section.category.color}; background: {hexToRgba(
            section.category.color,
            0.04
          )}"
        >
          <div
            class="category-header"
            style="background: {hexToRgba(section.category.color, 0.08)}"
          >
            <div class="category-title">
              <span class="category-color" style="background-color: {section.category.color}"
              ></span>
              <span class="category-name strikethrough">{section.category.name}</span>
              <span class="occ-badge all-complete"
                >{occStats.closed}/{occStats.total} {statsLabel}</span
              >
            </div>
            <span class="cat-total">{formatCurrency(section.subtotal.expected)}</span>
          </div>

          <div class="items-list">
            {#each section.items as item, idx (item.id)}
              <div class="item-wrapper" class:has-separator={idx > 0}>
                <OccurrenceCard
                  {item}
                  type={type === 'bills' ? 'bill' : 'income'}
                  {month}
                  {readOnly}
                  variant="flat"
                  on:refresh={handleRefresh}
                />
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  {/if}

  <!-- Grand totals footer -->
  <div class="totals-row">
    <span class="totals-label">Total</span>
    <span class="totals-value">{formatCurrency(grandExpected)}</span>
    <span class="totals-value">{formatCurrency(grandActual)}</span>
    <span class="totals-value totals-remaining">{formatCurrency(grandExpected - grandActual)}</span>
  </div>
</div>

<!-- Ad-hoc form -->
<AdHocForm
  bind:open={showAdHocForm}
  {month}
  type={type === 'bills' ? 'bill' : 'income'}
  defaultCategoryId={adHocCategoryId}
  on:created={handleRefresh}
/>

<style>
  .data-table-view {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* ── Column headers ── */
  .column-headers {
    display: flex;
    align-items: center;
    padding: var(--space-2) var(--space-3);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-tertiary);
    border-bottom: 2px solid var(--border-default);
  }

  .th-name {
    flex: 1;
    text-align: left;
  }

  .th-expected,
  .th-actual,
  .th-remaining {
    width: 100px;
    text-align: right;
  }

  /* ── Category block: continuous color band ── */
  .category-block {
    border-left: 4px solid var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
    margin-bottom: var(--space-2);
  }

  .category-block.complete {
    opacity: 0.7;
  }

  /* ── Category header ── */
  .category-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    gap: var(--space-3);
  }

  .category-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 1;
    min-width: 0;
  }

  .category-color {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .category-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
  }

  .strikethrough {
    text-decoration: line-through;
    opacity: 0.7;
  }

  .hidden-badge {
    font-size: 0.7rem;
    font-style: italic;
    color: var(--text-tertiary);
    background: var(--bg-hover);
    padding: 1px var(--space-2);
    border-radius: var(--radius-sm);
  }

  .occ-badge {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    padding: 2px var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--bg-hover);
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .occ-badge.all-complete {
    background: var(--success-bg);
    color: var(--success);
  }

  .cat-total {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .collapsed-check {
    color: var(--success);
    font-size: 0.8rem;
  }

  .collapsed-count {
    font-size: 0.7rem;
    color: var(--text-tertiary);
    margin-left: auto;
  }

  .add-adhoc-btn {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    font-size: 0.75rem;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s;
  }

  .add-adhoc-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-muted);
  }

  /* ── Items list: zero padding, hairline separators ── */
  .items-list {
    display: flex;
    flex-direction: column;
  }

  .item-wrapper.has-separator {
    border-top: 1px dotted var(--border-subtle);
  }

  .empty-text {
    font-size: 0.8rem;
    color: var(--text-tertiary);
    padding: var(--space-2) var(--space-3);
    font-style: italic;
    margin: 0;
  }

  /* ── Insurance divider ── */
  .insurance-divider {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) 0;
    color: var(--purple);
    font-size: 0.8rem;
    font-weight: 500;
  }

  .insurance-divider::before,
  .insurance-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--purple-border, var(--border-default));
  }

  .insurance-icon {
    flex-shrink: 0;
  }

  /* ── Completed divider ── */
  .completed-divider {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) 0;
    color: var(--text-tertiary);
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .completed-divider::before,
  .completed-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-default);
  }

  /* ── Grand totals footer ── */
  .totals-row {
    display: flex;
    align-items: center;
    padding: var(--space-3);
    border-top: 2px solid var(--border-default);
    margin-top: var(--space-2);
  }

  .totals-label {
    flex: 1;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .totals-value {
    width: 100px;
    text-align: right;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  @media (max-width: 640px) {
    .th-remaining,
    .totals-remaining {
      display: none;
    }

    .th-expected,
    .th-actual,
    .totals-value {
      width: 70px;
    }
  }
</style>
