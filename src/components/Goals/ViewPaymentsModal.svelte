<script lang="ts">
  import { onMount } from 'svelte';
  import { apiClient } from '$lib/api/client';
  import type { SavingsGoal } from '../../stores/savings-goals';

  export let goal: SavingsGoal;
  export let onClose: () => void;

  interface PaymentItem {
    id: string;
    type: 'scheduled' | 'adhoc';
    name: string;
    amount: number;
    date: string;
    status: 'completed' | 'upcoming';
    bill_id?: string;
    instance_id?: string;
  }

  interface PaymentsResponse {
    completed: PaymentItem[];
    upcoming: PaymentItem[];
    summary: {
      total_completed: number;
      total_upcoming: number;
      total_saved: number;
    };
  }

  let loading = true;
  let error: string | null = null;
  let payments: PaymentsResponse | null = null;

  onMount(async () => {
    await loadPayments();
  });

  async function loadPayments() {
    loading = true;
    error = null;

    try {
      payments = (await apiClient.get(
        `/api/savings-goals/${goal.id}/payments`
      )) as PaymentsResponse;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load payments';
    } finally {
      loading = false;
    }
  }

  function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(cents / 100);
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
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

<div class="modal-overlay" on:click={onClose} on:keydown={handleKeydown} role="button" tabindex="0">
  <div
    class="modal-content"
    on:click|stopPropagation
    on:keydown|stopPropagation
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div class="modal-header">
      <h2 id="modal-title">Payment History</h2>
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

    <p class="modal-subtitle">All payments for "{goal.name}"</p>

    {#if loading}
      <div class="loading-state">Loading payments...</div>
    {:else if error}
      <div class="error-state">{error}</div>
    {:else if payments}
      <!-- Summary -->
      <div class="summary-bar">
        <div class="summary-item">
          <span class="summary-label">Total Saved</span>
          <span class="summary-value accent">{formatCurrency(payments.summary.total_saved)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Completed</span>
          <span class="summary-value">{payments.summary.total_completed}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Upcoming</span>
          <span class="summary-value">{payments.summary.total_upcoming}</span>
        </div>
      </div>

      <!-- Completed Payments -->
      {#if payments.completed.length > 0}
        <div class="payment-section">
          <h3 class="section-title">Completed Payments</h3>
          <div class="payment-list">
            {#each payments.completed as payment (payment.id)}
              <div class="payment-item completed">
                <div class="payment-info">
                  <span class="payment-name">{payment.name}</span>
                  <span class="payment-date">{formatDate(payment.date)}</span>
                </div>
                <div class="payment-amount success">
                  +{formatCurrency(payment.amount)}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Upcoming Payments -->
      {#if payments.upcoming.length > 0}
        <div class="payment-section">
          <h3 class="section-title">Upcoming Payments</h3>
          <div class="payment-list">
            {#each payments.upcoming as payment (payment.id)}
              <div class="payment-item upcoming">
                <div class="payment-info">
                  <span class="payment-name">{payment.name}</span>
                  <span class="payment-date">{formatDate(payment.date)}</span>
                </div>
                <div class="payment-amount muted">
                  {formatCurrency(payment.amount)}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Empty State -->
      {#if payments.completed.length === 0 && payments.upcoming.length === 0}
        <div class="empty-state">
          <p>No payments yet for this goal.</p>
          <p class="empty-hint">
            Create a payment schedule or make one-time contributions to start saving!
          </p>
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
    max-width: var(--modal-width-md);
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--text-primary);
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

  .modal-subtitle {
    margin: var(--space-1) 0 var(--space-4) 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
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

  .summary-bar {
    display: flex;
    gap: var(--space-4);
    padding: var(--space-3);
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-4);
  }

  .summary-item {
    flex: 1;
    text-align: center;
  }

  .summary-label {
    display: block;
    font-size: 0.75rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-1);
  }

  .summary-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .summary-value.accent {
    color: var(--accent);
  }

  .payment-section {
    margin-bottom: var(--space-4);
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0 0 var(--space-2) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .payment-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .payment-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) var(--space-3);
    background: var(--bg-base);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
  }

  .payment-item.upcoming {
    border-style: dashed;
    opacity: 0.8;
  }

  .payment-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .payment-name {
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .payment-date {
    color: var(--text-tertiary);
    font-size: 0.75rem;
  }

  .payment-amount {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .payment-amount.success {
    color: var(--success);
  }

  .payment-amount.muted {
    color: var(--text-secondary);
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
