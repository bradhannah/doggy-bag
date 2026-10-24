<script lang="ts">
  import { page } from '$app/stores';
  import MonthPickerHeader from '../../../components/MonthPickerHeader.svelte';
  import DetailedMonthView from '../../../components/DetailedView/DetailedMonthView.svelte';
  import { apiClient } from '../../../lib/api/client';
  import { success, error as showError } from '../../../stores/toast';
  import { viewMode } from '../../../stores/ui';
  import { budgetTab } from '../../../stores/ui';
  import { monthExists, monthIsReadOnly } from '../../../stores/months';
  import BudgetUpdatesModal from '../../../components/DetailedView/BudgetUpdatesModal.svelte';

  $: month = $page.params.month;
  $: showColumnToggle = $viewMode === 'classic' && $budgetTab === 'combined';

  let detailedView: DetailedMonthView;
  let isSyncingMetadata = false;
  let showReview = false;
  $: if ($page.url.searchParams.get('review') === 'updates') showReview = true;

  function handleRefresh() {
    detailedView?.refreshData();
  }

  async function handleSyncMetadata() {
    if (!month || isSyncingMetadata) return;

    isSyncingMetadata = true;
    try {
      await apiClient.post(`/api/months/${month}/sync-metadata`, {});
      success('Metadata synced from source bills/incomes');
      detailedView?.refreshData();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to sync metadata');
    } finally {
      isSyncingMetadata = false;
    }
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
    <button
      class="btn btn-primary"
      on:click={() => (showReview = true)}
      disabled={!$monthExists || $monthIsReadOnly}>Review budget updates</button
    >
    <button
      class="btn btn-secondary"
      on:click={handleSyncMetadata}
      disabled={isSyncingMetadata || !$monthExists || $monthIsReadOnly}
      title="Copy names, categories and accounts from Manage into this month"
    >
      {isSyncingMetadata ? 'Refreshing details…' : 'Refresh bill and income details'}
    </button>
    <a href="/savings">Savings totals</a>
  </div>
  <DetailedMonthView {month} bind:this={detailedView} />
  {#if showReview}
    {#key month}<BudgetUpdatesModal
        {month}
        onClose={() => (showReview = false)}
        onApplied={handleRefresh}
      />{/key}
  {/if}
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
    margin-left: var(--space-2);
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
