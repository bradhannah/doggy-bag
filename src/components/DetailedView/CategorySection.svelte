<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CategorySection as CategorySectionType, BillInstanceDetailed, IncomeInstanceDetailed } from '../../stores/detailed-month';
  import BillRow from './BillRow.svelte';
  import IncomeRow from './IncomeRow.svelte';
  import OccurrenceCard from './OccurrenceCard.svelte';
  import AdHocForm from './AdHocForm.svelte';
  
  export let section: CategorySectionType;
  export let type: 'bills' | 'income' = 'bills';
  export let month: string = '';
  export let compactMode: boolean = false;
  export let onTogglePaid: ((id: string) => void) | null = null;
  export let readOnly: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  // Ad-hoc form state
  let showAdHocForm = false;
  
  function formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(dollars);
  }
  
  // Type guards
  function isBillInstance(item: BillInstanceDetailed | IncomeInstanceDetailed): item is BillInstanceDetailed {
    return 'bill_id' in item;
  }
  
  // Check if item has multiple occurrences (non-monthly billing)
  function hasMultipleOccurrences(item: BillInstanceDetailed | IncomeInstanceDetailed): boolean {
    const period = item.billing_period;
    return (period === 'bi_weekly' || period === 'weekly') && 
           item.occurrences && item.occurrences.length > 1;
  }
  
  $: showAmber = section.subtotal.actual > 0 && section.subtotal.actual !== section.subtotal.expected;
  
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

<div class="category-section" class:compact={compactMode}>
  <div class="category-header" style="border-left-color: {section.category.color}">
    <div class="category-title">
      <span class="category-color" style="background-color: {section.category.color}"></span>
      <h4>{section.category.name}</h4>
      <span class="item-count">({section.items.length})</span>
      <button class="add-adhoc-btn" on:click={openAdHocForm} title="Add ad-hoc {type === 'bills' ? 'bill' : 'income'}" disabled={readOnly}>
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
        <BillRow bill={item} {month} {compactMode} {onTogglePaid} {readOnly} on:refresh={handleRefresh} />
      {:else if type === 'income' && !isBillInstance(item)}
        <!-- Regular monthly incomes use IncomeRow -->
        <IncomeRow income={item} {month} {compactMode} {onTogglePaid} {readOnly} on:refresh={handleRefresh} />
      {/if}
    {/each}
  </div>
</div>

<!-- Ad-hoc Form Drawer -->
<AdHocForm
  bind:open={showAdHocForm}
  {month}
  type={type === 'bills' ? 'bill' : 'income'}
  defaultCategoryId={section.category.id}
  on:created={handleAdHocCreated}
  on:close={() => showAdHocForm = false}
/>

<style>
  .category-section {
    margin-bottom: 24px;
  }
  
  .category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border-left: 4px solid #555;
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
    color: #e4e4e7;
  }
  
  .item-count {
    font-size: 0.75rem;
    color: #888;
  }
  
  .add-adhoc-btn {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    border: 1px dashed #555;
    background: transparent;
    color: #888;
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
    border-color: #24c8db;
    color: #24c8db;
    background: rgba(36, 200, 219, 0.1);
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
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .subtotal-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e4e4e7;
  }
  
  .subtotal-value.amber {
    color: #f59e0b;
  }
  
  .category-items {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-left: 4px;
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
  
  .category-section.compact .item-count {
    font-size: 0.65rem;
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
    padding-left: 2px;
  }
</style>
