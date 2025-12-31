<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CategorySection as CategorySectionType, BillInstanceDetailed, IncomeInstanceDetailed } from '../../stores/detailed-month';
  import BillRow from './BillRow.svelte';
  import IncomeRow from './IncomeRow.svelte';
  
  export let section: CategorySectionType;
  export let type: 'bills' | 'income' = 'bills';
  export let month: string = '';
  export let onTogglePaid: ((id: string) => void) | null = null;
  
  const dispatch = createEventDispatcher();
  
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
  
  $: showAmber = section.subtotal.actual > 0 && section.subtotal.actual !== section.subtotal.expected;
  
  function handleRefresh() {
    dispatch('refresh');
  }
</script>

<div class="category-section">
  <div class="category-header" style="border-left-color: {section.category.color}">
    <div class="category-title">
      <span class="category-color" style="background-color: {section.category.color}"></span>
      <h4>{section.category.name}</h4>
      <span class="item-count">({section.items.length})</span>
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
      {#if type === 'bills' && isBillInstance(item)}
        <BillRow bill={item} {month} {onTogglePaid} on:refresh={handleRefresh} />
      {:else if type === 'income' && !isBillInstance(item)}
        <IncomeRow income={item} {onTogglePaid} />
      {/if}
    {/each}
  </div>
</div>

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
</style>
