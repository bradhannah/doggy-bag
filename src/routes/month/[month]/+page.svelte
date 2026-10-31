<script lang="ts">
  import { page } from '$app/stores';
  import MonthPickerHeader from '../../../components/MonthPickerHeader.svelte';
  import DetailedMonthView from '../../../components/DetailedView/DetailedMonthView.svelte';
  import { viewMode } from '../../../stores/ui';
  import { budgetTab } from '../../../stores/ui';

  $: month = $page.params.month;
  $: showColumnToggle = $viewMode === 'classic' && $budgetTab === 'combined';

  let detailedView: DetailedMonthView;

  function handleRefresh() {
    detailedView?.refreshData();
  }
</script>

<svelte:head>
  <title>Budget - {month}</title>
</svelte:head>

{#if month}
  <MonthPickerHeader
    basePath="/month"
    showRefresh={true}
    showWidthToggle={true}
    {showColumnToggle}
    showHidePaid={true}
    showViewToggle={true}
    showFind={true}
    onFind={() => detailedView?.openFilter()}
    onRefresh={handleRefresh}
  />
  <div class="budget-actions">
    <a href="/savings">Savings totals</a>
  </div>
  <DetailedMonthView {month} bind:this={detailedView} />
{:else}
  <div class="error-page">
    <h1>Invalid Month</h1>
    <p>Please provide a valid month in YYYY-MM format.</p>
    <a href="/">Back to Dashboard</a>
  </div>
{/if}

<style>
  .budget-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-3);
    padding: var(--space-4) var(--content-padding) 0;
  }
  .budget-actions a {
    font-size: var(--font-size-md);
    color: var(--accent);
  }
  .error-page {
    text-align: center;
    padding: calc(var(--space-8) * 2) var(--space-5);
  }

  .error-page h1 {
    color: var(--error);
    margin-bottom: var(--space-3);
  }

  .error-page p {
    color: var(--text-secondary);
    margin-bottom: var(--space-6);
  }

  .error-page a {
    color: var(--accent);
    text-decoration: none;
  }

  .error-page a:hover {
    text-decoration: underline;
  }
</style>
