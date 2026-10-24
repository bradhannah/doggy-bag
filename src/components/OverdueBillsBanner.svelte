<script lang="ts">
  import { formatCurrency } from '$lib/utils/format';

  type OverdueBillItem = {
    name: string;
    amount: number;
    due_date?: string | null;
  };

  export let overdueBills: OverdueBillItem[] = [];
  export let heading = 'Overdue Bills';
  export let description = "These items are past due and deducted from today's starting balance:";

  function formatDueDate(dueDate?: string | null) {
    if (!dueDate) return 'Unknown';
    const [year, month, day] = dueDate.split('-').map(Number);
    if (!year || !month || !day) return dueDate;
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  $: total = overdueBills.reduce((sum, bill) => sum + bill.amount, 0);
</script>

{#if overdueBills.length > 0}
  <section class="overdue-banner" aria-label={heading}>
    <div class="banner-header">
      <svg
        class="warning-icon"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path
          d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
        />
      </svg>
      <h3>{heading}</h3>
      {#if overdueBills.length > 1}
        <span class="banner-total">{formatCurrency(total)}</span>
      {/if}
    </div>
    <p>{description}</p>
    <ul>
      {#each overdueBills as bill (bill.name + String(bill.due_date) + String(bill.amount))}
        <li>
          <span class="bill-name">{bill.name}</span>
          <span class="bill-due">Due {formatDueDate(bill.due_date)}</span>
          <span class="bill-amount">{formatCurrency(bill.amount)}</span>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .overdue-banner {
    margin-bottom: var(--space-4);
    padding: var(--space-3) var(--space-4);
    background: var(--warning-bg);
    border: 1px solid var(--warning-border);
    border-radius: var(--radius-md);
  }

  .banner-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--warning);
  }

  .warning-icon {
    flex-shrink: 0;
  }

  h3 {
    margin: 0;
    font-size: var(--font-size-md);
    font-weight: 600;
  }

  .banner-total {
    margin-left: auto;
    font-size: var(--font-size-md);
    font-weight: 600;
  }

  p {
    margin: var(--space-1) 0 var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto var(--ledger-amount-width);
    align-items: center;
    gap: var(--space-3);
    min-height: var(--control-height-sm);
    font-size: var(--font-size-sm);
  }

  li + li {
    border-top: 1px solid var(--warning-border);
  }

  .bill-name {
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bill-due {
    color: var(--warning);
  }

  .bill-amount {
    text-align: right;
    font-weight: 600;
    color: var(--text-primary);
  }
</style>
