<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiClient } from '../../lib/api/client';
  import { addToast } from '../../stores/toast';
  import ConfirmDialog from '../../components/shared/ConfirmDialog.svelte';

  interface MonthSummary {
    month: string;
    exists: boolean;
    is_read_only: boolean;
    created_at: string;
    updated_at: string;
    total_income: number;
    total_bills: number;
    total_expenses: number;
    leftover: number;
  }

  interface MonthsResponse {
    months: MonthSummary[];
    count: number;
  }

  let months: MonthSummary[] = [];
  let loading = true;
  let error = '';

  // Confirm dialog state
  let showConfirm = false;
  let confirmTitle = '';
  let confirmMessage = '';
  let confirmAction: (() => Promise<void>) | null = null;
  let actionLoading = false;

  onMount(async () => {
    await loadMonths();
  });

  async function loadMonths() {
    loading = true;
    error = '';
    try {
      const data = (await apiClient.get('/api/months/manage')) as MonthsResponse;
      months = data.months;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load months';
      console.error('Failed to load months:', e);
    } finally {
      loading = false;
    }
  }

  function formatMonth(monthStr: string): string {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }

  function formatAmount(cents: number): string {
    const amount = Math.abs(cents / 100);
    const formatted =
      '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return cents < 0 ? '-' + formatted : formatted;
  }

  function getStatusBadge(month: MonthSummary): { text: string; class: string } {
    if (!month.exists) {
      return { text: 'Not Created', class: 'badge-muted' };
    }
    if (month.is_read_only) {
      return { text: 'Locked', class: 'badge-warning' };
    }
    return { text: 'Active', class: 'badge-success' };
  }

  // Create month
  async function handleCreate(month: string) {
    confirmTitle = 'Create Month';
    confirmMessage = `Create ${formatMonth(month)}? This will copy your current bills, incomes, and variable expense templates into this month.`;
    confirmAction = async () => {
      try {
        await apiClient.post(`/api/months/${month}/create`, {});
        addToast(`Created ${formatMonth(month)}`, 'success');
        await loadMonths();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to create month';
        addToast(msg, 'error');
      }
    };
    showConfirm = true;
  }

  // Toggle lock/unlock
  async function handleToggleLock(month: MonthSummary) {
    const action = month.is_read_only ? 'Unlock' : 'Lock';
    confirmTitle = `${action} Month`;
    confirmMessage = month.is_read_only
      ? `Unlock ${formatMonth(month.month)}? You will be able to make changes again.`
      : `Lock ${formatMonth(month.month)}? This will prevent any changes to this month's data.`;
    confirmAction = async () => {
      try {
        await apiClient.post(`/api/months/${month.month}/lock`, {});
        addToast(
          `${formatMonth(month.month)} ${month.is_read_only ? 'unlocked' : 'locked'}`,
          'success'
        );
        await loadMonths();
      } catch (e) {
        const msg = e instanceof Error ? e.message : `Failed to ${action.toLowerCase()} month`;
        addToast(msg, 'error');
      }
    };
    showConfirm = true;
  }

  // Delete month
  async function handleDelete(month: MonthSummary) {
    if (month.is_read_only) {
      addToast('Cannot delete a locked month. Unlock it first.', 'error');
      return;
    }

    confirmTitle = 'Delete Month';
    confirmMessage = `Delete ${formatMonth(month.month)}? All bills, incomes, expenses, and payment records for this month will be permanently deleted. This cannot be undone.`;
    confirmAction = async () => {
      try {
        console.log('[ManageMonths] Deleting month:', month.month);
        await apiClient.deletePath(`/api/months/${month.month}`);
        console.log('[ManageMonths] Delete successful');
        addToast(`Deleted ${formatMonth(month.month)}`, 'success');
        await loadMonths();
      } catch (e) {
        console.error('[ManageMonths] Delete error:', e);
        const msg = e instanceof Error ? e.message : 'Failed to delete month';
        addToast(msg, 'error');
      }
    };
    showConfirm = true;
  }

  async function handleConfirm() {
    if (!confirmAction) return;
    actionLoading = true;
    try {
      await confirmAction();
    } finally {
      actionLoading = false;
      showConfirm = false;
      confirmAction = null;
    }
  }

  function handleCancel() {
    showConfirm = false;
    confirmAction = null;
  }

  function navigateToMonth(month: string) {
    goto(`/month/${month}`);
  }
</script>

<div class="manage-page">
  <header class="manage-header">
    <a href="/" class="back-link">&larr; Dashboard</a>
    <h1>Manage Months</h1>
  </header>

  <main class="manage-content">
    {#if loading}
      <div class="loading-state">Loading months...</div>
    {:else if error}
      <div class="error-state">
        <p>{error}</p>
        <button class="btn btn-primary" on:click={loadMonths}>Retry</button>
      </div>
    {:else}
      <div class="months-list">
        {#each months as month}
          <div class="month-card" class:not-exists={!month.exists}>
            <div class="month-header">
              <h3 class="month-name">{formatMonth(month.month)}</h3>
              <span class="month-badge {getStatusBadge(month).class}">
                {getStatusBadge(month).text}
              </span>
            </div>

            {#if month.exists}
              <div class="month-stats">
                <div class="stat">
                  <span class="stat-label">Income</span>
                  <span class="stat-value income">{formatAmount(month.total_income)}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Bills</span>
                  <span class="stat-value expense">{formatAmount(month.total_bills)}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Expenses</span>
                  <span class="stat-value expense">{formatAmount(month.total_expenses)}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Leftover</span>
                  <span
                    class="stat-value"
                    class:positive={month.leftover >= 0}
                    class:negative={month.leftover < 0}
                  >
                    {formatAmount(month.leftover)}
                  </span>
                </div>
              </div>

              <div class="month-actions">
                <button class="btn btn-secondary" on:click={() => navigateToMonth(month.month)}>
                  View Details
                </button>
                <button class="btn btn-outline" on:click={() => handleToggleLock(month)}>
                  {month.is_read_only ? 'Unlock' : 'Lock'}
                </button>
                <button
                  class="btn btn-danger"
                  disabled={month.is_read_only}
                  title={month.is_read_only ? 'Unlock to delete' : 'Delete month'}
                  on:click={() => handleDelete(month)}
                >
                  Delete
                </button>
              </div>
            {:else}
              <div class="month-empty">
                <p>This month hasn't been created yet.</p>
              </div>
              <div class="month-actions">
                <button class="btn btn-primary" on:click={() => handleCreate(month.month)}>
                  Create Month
                </button>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>

<ConfirmDialog
  open={showConfirm}
  title={confirmTitle}
  message={confirmMessage}
  confirmText={actionLoading ? 'Processing...' : 'Confirm'}
  on:confirm={handleConfirm}
  on:cancel={handleCancel}
/>

<style>
  .manage-page {
    min-height: 100vh;
    background: #1a1a2e;
    color: #e4e4e7;
  }

  .manage-header {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px 30px;
    background: #16213e;
    border-bottom: 1px solid #333355;
  }

  .back-link {
    color: #24c8db;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .back-link:hover {
    text-decoration: underline;
  }

  .manage-header h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .manage-content {
    padding: 30px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .loading-state,
  .error-state {
    text-align: center;
    padding: 60px 20px;
    color: #888;
  }

  .error-state p {
    margin-bottom: 20px;
    color: #ff6b6b;
  }

  .months-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .month-card {
    background: #16213e;
    border: 1px solid #333355;
    border-radius: 8px;
    padding: 20px;
    transition: border-color 0.15s ease;
  }

  .month-card:hover {
    border-color: #24c8db;
  }

  .month-card.not-exists {
    opacity: 0.7;
  }

  .month-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .month-name {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .month-badge {
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .badge-success {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .badge-warning {
    background: rgba(234, 179, 8, 0.15);
    color: #eab308;
  }

  .badge-muted {
    background: rgba(136, 136, 136, 0.15);
    color: #888;
  }

  .month-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 16px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #888;
    text-transform: uppercase;
  }

  .stat-value {
    font-size: 1rem;
    font-weight: 600;
  }

  .stat-value.income {
    color: #22c55e;
  }

  .stat-value.expense {
    color: #ff6b6b;
  }

  .stat-value.positive {
    color: #22c55e;
  }

  .stat-value.negative {
    color: #ff6b6b;
  }

  .month-empty {
    padding: 20px 0;
    text-align: center;
    color: #888;
  }

  .month-empty p {
    margin: 0;
  }

  .month-actions {
    display: flex;
    gap: 8px;
    padding-top: 16px;
    border-top: 1px solid #333355;
  }

  /* Buttons */
  .btn {
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
    transition: all 0.15s ease;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #24c8db;
    color: #000;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1ab0c9;
  }

  .btn-secondary {
    background: #333355;
    color: #fff;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #444466;
  }

  .btn-outline {
    background: transparent;
    border: 1px solid #333355;
    color: #e4e4e7;
  }

  .btn-outline:hover:not(:disabled) {
    border-color: #24c8db;
    color: #24c8db;
  }

  .btn-danger {
    background: transparent;
    border: 1px solid #ff4444;
    color: #ff4444;
  }

  .btn-danger:hover:not(:disabled) {
    background: #ff4444;
    color: #fff;
  }

  /* Mobile */
  @media (max-width: 768px) {
    .manage-content {
      padding: 20px;
    }

    .month-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .month-actions {
      flex-wrap: wrap;
    }

    .month-actions .btn {
      flex: 1;
      min-width: 100px;
    }
  }
</style>
