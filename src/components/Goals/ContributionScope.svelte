<script lang="ts">
  export let keepCurrentMonth = false;
  export let pausing = false;
  export let disabled = false;
</script>

<div class="contribution-scope">
  <p>
    Recurring contributions will {pausing ? 'pause' : 'stop'}. Unpaid contributions are removed from
    unlocked budgets for this month and later. Recorded payments and earlier budgets are preserved.
  </p>
  {#if pausing}
    <p>Resume restores upcoming contributions from today onward. Missed dates stay skipped.</p>
  {/if}
  <label>
    <input type="checkbox" bind:checked={keepCurrentMonth} {disabled} />
    Keep this month’s unpaid contributions
  </label>
</div>

<style>
  .contribution-scope {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin: var(--space-4) 0;
  }
  p {
    margin: 0 0 var(--space-3);
    line-height: 1.5;
  }
  label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-primary);
  }
  input {
    accent-color: var(--accent);
  }
</style>
