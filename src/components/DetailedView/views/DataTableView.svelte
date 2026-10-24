<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CategorySection as CategorySectionType } from '../../../stores/detailed-month';
  import CategorySection from '../CategorySection.svelte';
  import { formatCurrency } from '$lib/utils/format';

  export let sections: CategorySectionType[] = [];
  export let completedSections: CategorySectionType[] = [];
  export let insuranceSection: CategorySectionType | null = null;
  export let hiddenCounts: Map<string, number> = new Map();
  export let type: 'bills' | 'income' = 'bills';
  export let month: string = '';
  export let readOnly: boolean = false;
  export let hidePaidItems: boolean = false;

  const dispatch = createEventDispatcher();

  function handleRefresh() {
    dispatch('refresh');
  }

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

<!-- Same ledger rows as the classic view, with items collapsible to one line -->
<div class="data-table-view">
  <div class="ledger-row ledger-column-labels">
    <span>Category / item</span>
    <span class="ledger-amount">Expected</span>
    <span class="ledger-amount">{paidLabel}</span>
    <span></span>
  </div>

  {#each sections as section (section.category.id)}
    <CategorySection
      {section}
      {type}
      {month}
      {readOnly}
      hiddenCount={hiddenCounts.get(section.category.id) ?? 0}
      variant="flat"
      on:refresh={handleRefresh}
    />
  {/each}

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
    <CategorySection
      section={insuranceSection}
      {type}
      {month}
      readOnly={true}
      isInsuranceSection={true}
      variant="flat"
      on:refresh={handleRefresh}
    />
  {/if}

  {#if completedSections.length > 0}
    <div class="completed-divider"><span>Completed</span></div>
    {#each completedSections as section (section.category.id)}
      <CategorySection
        {section}
        {type}
        {month}
        {readOnly}
        collapsed={hidePaidItems}
        variant="flat"
        on:refresh={handleRefresh}
      />
    {/each}
  {/if}

  <div class="ledger-row totals-row">
    <span class="totals-label">Total</span>
    <span class="ledger-amount totals-value">{formatCurrency(grandExpected)}</span>
    <span class="ledger-amount totals-value">{formatCurrency(grandActual)}</span>
    <span></span>
  </div>
  <div class="ledger-row totals-row remaining">
    <span class="totals-label">Still to {type === 'bills' ? 'pay' : 'receive'}</span>
    <span></span>
    <span class="ledger-amount totals-value">{formatCurrency(grandExpected - grandActual)}</span>
    <span></span>
  </div>
</div>

<style>
  .data-table-view {
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .data-table-view .ledger-column-labels {
    margin-bottom: var(--space-2);
  }

  .insurance-divider,
  .completed-divider {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) 0;
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .insurance-divider {
    color: var(--purple);
  }

  .completed-divider {
    color: var(--text-secondary);
  }

  .insurance-divider::before,
  .insurance-divider::after,
  .completed-divider::before,
  .completed-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-default);
  }

  .insurance-divider::before,
  .insurance-divider::after {
    background: var(--purple-border);
  }

  .insurance-icon {
    flex-shrink: 0;
  }

  .totals-row {
    min-height: var(--control-height);
    font-size: var(--font-size-md);
  }

  .totals-row:not(.remaining) {
    margin-top: var(--space-2);
    border-top: 2px solid var(--border-default);
  }

  .totals-label,
  .totals-value {
    font-weight: 700;
    color: var(--text-primary);
  }

  .remaining .totals-label,
  .remaining .totals-value {
    font-weight: 500;
    color: var(--text-secondary);
  }
</style>
