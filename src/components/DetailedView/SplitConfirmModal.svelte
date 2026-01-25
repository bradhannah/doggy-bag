<script lang="ts">
  /**
   * SplitConfirmModal - Confirmation dialog for partial payment split
   *
   * Shows the user what will happen when they split an occurrence:
   * - Close current occurrence at the paid amount
   * - Create new occurrence for the remaining amount
   */
  import { createEventDispatcher } from 'svelte';
  import Modal from '../shared/Modal.svelte';

  export let open = false;
  export let paidAmount = 0; // cents
  export let remainingAmount = 0; // cents

  const dispatch = createEventDispatcher<{
    confirm: void;
    cancel: void;
  }>();

  function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(cents / 100);
  }

  function handleConfirm() {
    dispatch('confirm');
  }

  function handleCancel() {
    dispatch('cancel');
  }
</script>

<Modal {open} title="Confirm Partial Payment" onClose={handleCancel} size="sm">
  <div class="modal-content">
    <p class="summary">
      You're paying <strong>{formatCurrency(paidAmount)}</strong> of
      <strong>{formatCurrency(paidAmount + remainingAmount)}</strong>
    </p>

    <div class="info-box">
      <p class="info-title">This will:</p>
      <ul class="info-list">
        <li>Close current occurrence at <strong>{formatCurrency(paidAmount)}</strong></li>
        <li>
          Create new occurrence for <strong>{formatCurrency(remainingAmount)}</strong> (remaining)
        </li>
      </ul>
    </div>

    <p class="note">The new occurrence will appear in your list.</p>
  </div>

  <svelte:fragment slot="footer">
    <button class="button-secondary" type="button" on:click={handleCancel}> Go Back </button>
    <button class="button-primary" type="button" on:click={handleConfirm}> Confirm Split </button>
  </svelte:fragment>
</Modal>

<style>
  .modal-content {
    display: grid;
    gap: var(--space-4);
  }

  .summary {
    margin: 0;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .summary strong {
    color: var(--accent);
  }

  .info-box {
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
  }

  .info-title {
    margin: 0 0 var(--space-2) 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .info-list {
    margin: 0;
    padding-left: var(--space-5);
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .info-list li {
    margin-bottom: var(--space-1);
  }

  .info-list strong {
    color: var(--text-primary);
  }

  .note {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-tertiary);
    font-style: italic;
  }

  .button-secondary,
  .button-primary {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-weight: 500;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .button-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
  }

  .button-secondary:hover {
    background: var(--bg-hover);
  }

  .button-primary {
    background: var(--accent);
    color: var(--text-inverse);
    border: none;
  }

  .button-primary:hover {
    background: var(--accent-hover);
  }
</style>
