<script lang="ts">
  import { onMount } from 'svelte';
  import { apiClient } from '$lib/api/client';
  import type { SavingsGoal } from '../../stores/savings-goals';
  import { formatCurrency, formatDate } from '$lib/utils/format';

  export let goal: SavingsGoal;
  export let onClose: () => void;

  interface PaymentItem {
    id: string;
    date: string;
    description: string;
    amount: number;
    balance: number;
    status: 'completed' | 'upcoming';
  }

  interface PaymentsResponse {
    goal_id: string;
    target_amount: number;
    payments: PaymentItem[];
    summary: {
      total_saved: number;
      total_remaining: number;
      progress_percentage: number;
      projected_completion_date: string | null;
    };
  }

  let loading = true;
  let error: string | null = null;
  let data: PaymentsResponse | null = null;

  // Split payments into completed and upcoming for display
  $: completedPayments = data?.payments.filter((p) => p.status === 'completed') || [];
  $: upcomingPayments = data?.payments.filter((p) => p.status === 'upcoming') || [];

  onMount(async () => {
    await loadPayments();
  });

  async function loadPayments() {
    loading = true;
    error = null;

    try {
      data = (await apiClient.get(`/api/savings-goals/${goal.id}/payments`)) as PaymentsResponse;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load payments';
    } finally {
      loading = false;
    }
  }

  function formatDateWithYear(dateString: string): string {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<div class="modal-overlay" on:click={onClose} on:keydown={handleKeydown} role="presentation">
  <div
    class="modal-content"
    on:click|stopPropagation
    on:keydown|stopPropagation
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div class="modal-header">
      <div class="header-content">
        <h2 id="modal-title">Payment History</h2>
        <p class="modal-subtitle">"{goal.name}"</p>
      </div>
      <button class="close-btn" on:click={onClose} aria-label="Close">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M18 6L6 18M6 6l12 12"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    {#if loading}
      <div class="loading-state">Loading payments...</div>
    {:else if error}
      <div class="error-state">{error}</div>
    {:else if data}
      <!-- Progress bar -->
      <div class="progress-section">
        <div class="progress-header">
          <span class="progress-label">{data.summary.progress_percentage}% complete</span>
          <span class="progress-amount"
            >{formatCurrency(data.summary.total_saved)} of {formatCurrency(
              data.target_amount
            )}</span
          >
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            style="width: {Math.min(100, data.summary.progress_percentage)}%"
          ></div>
        </div>
      </div>

      <!-- Payment list -->
      <div class="payment-table">
        <div class="table-header">
          <span class="col-date">Date</span>
          <span class="col-desc">Description</span>
          <span class="col-amount">Amount</span>
          <span class="col-balance">Balance</span>
        </div>

        {#if completedPayments.length === 0 && upcomingPayments.length === 0}
          <div class="empty-state">
            <p>No payments yet for this goal.</p>
            <p class="empty-hint">
              Create a payment schedule or make one-time contributions to start saving!
            </p>
          </div>
        {:else}
          <!-- Completed payments -->
          {#each completedPayments as payment (payment.id)}
            <div class="payment-row completed">
              <span class="col-date">{formatDate(payment.date)}</span>
              <span class="col-desc">{payment.description}</span>
              <span class="col-amount success">+{formatCurrency(payment.amount)}</span>
              <span class="col-balance">{formatCurrency(payment.balance)}</span>
            </div>
          {/each}

          <!-- Separator with total saved -->
          {#if completedPayments.length > 0}
            <div class="separator-row">
              <span class="separator-label">Total Saved</span>
              <span class="separator-value">{formatCurrency(data.summary.total_saved)}</span>
            </div>
          {/if}

          <!-- Upcoming payments -->
          {#if upcomingPayments.length > 0}
            <div class="upcoming-label">Upcoming (projected)</div>
            {#each upcomingPayments as payment, index (payment.id)}
              <div class="payment-row upcoming">
                <span class="col-date">{formatDate(payment.date)}</span>
                <span class="col-desc">{payment.description}</span>
                <span class="col-amount">+{formatCurrency(payment.amount)}</span>
                <span class="col-balance">{formatCurrency(payment.balance)}</span>
              </div>
              {#if payment.balance >= data.target_amount && (index === 0 || upcomingPayments[index - 1].balance < data.target_amount)}
                <div class="target-reached">
                  <span class="target-icon">&#10003;</span>
                  <span>Target reached!</span>
                </div>
              {/if}
            {/each}
          {/if}
        {/if}
      </div>

      <!-- Projected completion -->
      {#if data.summary.projected_completion_date && data.summary.progress_percentage < 100}
        <div class="completion-note">
          Projected to reach target by {formatDateWithYear(data.summary.projected_completion_date)}
        </div>
      {/if}
    {/if}

    <div class="modal-actions">
      <button class="btn-secondary" on:click={onClose}>Close</button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--overlay-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
    padding: var(--section-gap);
    max-width: 560px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-4);
  }

  .header-content h2 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--text-primary);
  }

  .modal-subtitle {
    margin: var(--space-1) 0 0 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    transition: all 0.2s;
  }

  .close-btn:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .loading-state,
  .error-state {
    padding: var(--space-6);
    text-align: center;
    color: var(--text-secondary);
  }

  .error-state {
    color: var(--error);
  }

  /* Progress section */
  .progress-section {
    margin-bottom: var(--space-4);
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  .progress-label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .progress-amount {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .progress-bar {
    height: 6px;
    background: var(--bg-elevated);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  /* Payment table */
  .payment-table {
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .table-header {
    display: grid;
    grid-template-columns: 70px 1fr 90px 90px;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--bg-elevated);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .payment-row {
    display: grid;
    grid-template-columns: 70px 1fr 90px 90px;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-top: 1px solid var(--border-subtle);
    font-size: 0.875rem;
  }

  .payment-row.upcoming {
    color: var(--text-secondary);
    background: var(--bg-base);
  }

  .col-date {
    color: var(--text-secondary);
  }

  .col-desc {
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .payment-row.upcoming .col-desc {
    color: var(--text-secondary);
  }

  .col-amount {
    text-align: right;
    font-weight: 500;
  }

  .col-amount.success {
    color: var(--success);
  }

  .col-balance {
    text-align: right;
    color: var(--text-secondary);
  }

  .separator-row {
    display: flex;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    background: var(--bg-elevated);
    border-top: 1px solid var(--border-default);
    font-size: 0.875rem;
    font-weight: 600;
  }

  .separator-label {
    color: var(--text-secondary);
  }

  .separator-value {
    color: var(--accent);
  }

  .upcoming-label {
    padding: var(--space-2) var(--space-3);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-top: 1px solid var(--border-default);
    background: var(--bg-base);
  }

  .target-reached {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--success-bg);
    color: var(--success);
    font-size: 0.875rem;
    font-weight: 600;
    border-top: 1px solid var(--success-border);
  }

  .target-icon {
    font-size: 1rem;
  }

  .empty-state {
    padding: var(--space-6);
    text-align: center;
    color: var(--text-secondary);
  }

  .empty-state p {
    margin: 0 0 var(--space-2) 0;
  }

  .empty-hint {
    font-size: 0.875rem;
    color: var(--text-tertiary);
  }

  .completion-note {
    margin-top: var(--space-3);
    padding: var(--space-2) var(--space-3);
    background: var(--accent-muted);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    color: var(--text-secondary);
    text-align: center;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--border-default);
  }

  .btn-secondary {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-weight: 500;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
  }

  .btn-secondary:hover {
    background: var(--bg-hover);
  }
</style>
