<script lang="ts">
  import { page } from '$app/stores';
  import MonthPickerHeader from '../../../components/MonthPickerHeader.svelte';
  import DetailedMonthView from '../../../components/DetailedView/DetailedMonthView.svelte';
  import { apiClient } from '../../../lib/api/client';
  import { success, error as showError } from '../../../stores/toast';

  $: month = $page.params.month;

  let detailedView: DetailedMonthView;
  let isSyncingMetadata = false;

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
    showColumnToggle={true}
    showHidePaid={true}
    showSyncMetadata={true}
    {isSyncingMetadata}
    onRefresh={handleRefresh}
    onSyncMetadata={handleSyncMetadata}
  />
  <DetailedMonthView {month} bind:this={detailedView} />
{:else}
  <div class="error-page">
    <h1>Invalid Month</h1>
    <p>Please provide a valid month in YYYY-MM format.</p>
    <a href="/">Back to Dashboard</a>
  </div>
{/if}

<style>
  .error-page {
    text-align: center;
    padding: 60px 20px;
  }

  .error-page h1 {
    color: var(--error);
    margin-bottom: 12px;
  }

  .error-page p {
    color: var(--text-secondary);
    margin-bottom: 24px;
  }

  .error-page a {
    color: var(--accent);
    text-decoration: none;
  }

  .error-page a:hover {
    text-decoration: underline;
  }
</style>
