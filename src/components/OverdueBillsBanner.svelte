<script lang="ts">
  type OverdueBillItem = {
    name: string;
    amount: number;
    due_date?: string | null;
  };

  export let overdueBills: OverdueBillItem[] = [];
  export let heading = 'Overdue Bills';
  export let description = "These items are past due and deducted from today's starting balance:";

  function formatCurrency(cents: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  }

  function formatDueDate(dueDate?: string | null) {
    return dueDate ?? 'Unknown';
  }
</script>

{#if overdueBills.length > 0}
  <div class="overdue-banner">
    <h3>{heading}</h3>
    <p>{description}</p>
    <ul>
      {#each overdueBills as bill (bill.name + String(bill.due_date) + String(bill.amount))}
        <li>
          <strong>{bill.name}</strong>: {formatCurrency(bill.amount)}
          (Due: {formatDueDate(bill.due_date)})
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .overdue-banner {
    background: var(--warning-muted);
    color: var(--warning);
    padding: var(--space-4);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-5);
    border: 1px solid var(--warning-border);
  }

  .overdue-banner h3 {
    margin: 0 0 var(--space-2) 0;
  }

  .overdue-banner p {
    margin: 0 0 var(--space-3) 0;
    color: var(--text-secondary);
  }

  .overdue-banner ul {
    margin: 0;
    padding-left: var(--space-4);
  }
</style>
