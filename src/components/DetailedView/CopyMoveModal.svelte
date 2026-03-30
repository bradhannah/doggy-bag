<script lang="ts">
  /**
   * CopyMoveModal - Modal for copying or moving an ad-hoc item to the next month
   *
   * Provides Copy (default, safer) or Move option with a clear description of each.
   */
  import { createEventDispatcher } from 'svelte';
  import Modal from '../shared/Modal.svelte';
  import { getNextMonth, formatMonthDisplay } from '../../stores/ui';
  import { apiClient } from '../../lib/api/client';
  import { success, error as showError } from '../../stores/toast';

  export let open = false;
  export let type: 'bill' | 'income' = 'bill';
  export let month: string = '';
  export let instanceId: string = '';
  export let itemName: string = '';

  const dispatch = createEventDispatcher<{
    close: void;
    completed: void;
  }>();

  let action: 'copy' | 'move' = 'copy';
  let saving = false;

  $: targetMonth = getNextMonth(month);
  $: targetMonthLabel = formatMonthDisplay(targetMonth);
  $: sourceMonthLabel = formatMonthDisplay(month);

  // Reset when modal opens
  $: if (open) {
    action = 'copy';
    saving = false;
  }

  function handleClose() {
    if (!saving) {
      dispatch('close');
    }
  }

  async function handleConfirm() {
    if (saving) return;
    saving = true;

    try {
      const endpoint = `/api/months/${month}/adhoc/${type}s/${instanceId}/copy-to-month`;
      await apiClient.post(endpoint, {
        target_month: targetMonth,
        action,
      });

      const actionLabel = action === 'move' ? 'Moved' : 'Copied';
      success(`${actionLabel} "${itemName}" to ${targetMonthLabel}`);
      dispatch('completed');
    } catch (err) {
      showError(err instanceof Error ? err.message : `Failed to ${action} item`);
    } finally {
      saving = false;
    }
  }
</script>

<Modal {open} title="Copy to Next Month" subtitle={itemName} onClose={handleClose} size="sm">
  <div class="copy-move-body">
    <p class="target-info">
      Target: <strong>{targetMonthLabel}</strong>
    </p>

    <div class="action-options">
      <label class="action-option" class:selected={action === 'copy'}>
        <input type="radio" bind:group={action} value="copy" disabled={saving} />
        <div class="option-content">
          <span class="option-label">Copy</span>
          <span class="option-desc">
            Create a duplicate in {targetMonthLabel}. The original in {sourceMonthLabel} stays unchanged.
          </span>
        </div>
      </label>

      <label class="action-option" class:selected={action === 'move'}>
        <input type="radio" bind:group={action} value="move" disabled={saving} />
        <div class="option-content">
          <span class="option-label">Move</span>
          <span class="option-desc">
            Move to {targetMonthLabel} and remove from {sourceMonthLabel}.
          </span>
        </div>
      </label>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <button class="btn cancel" on:click={handleClose} disabled={saving}> Cancel </button>
    <button class="btn confirm" on:click={handleConfirm} disabled={saving}>
      {#if saving}
        {action === 'move' ? 'Moving...' : 'Copying...'}
      {:else}
        {action === 'move' ? 'Move' : 'Copy'}
      {/if}
    </button>
  </svelte:fragment>
</Modal>

<style>
  .copy-move-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .target-info {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .target-info strong {
    color: var(--text-primary);
  }

  .action-options {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .action-option {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .action-option:hover {
    border-color: var(--border-hover);
    background: var(--bg-hover);
  }

  .action-option.selected {
    border-color: var(--accent);
    background: var(--accent-muted);
  }

  .action-option input[type='radio'] {
    margin-top: 2px;
    accent-color: var(--accent);
    flex-shrink: 0;
  }

  .option-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .option-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .option-desc {
    font-size: 0.8rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn.cancel {
    background: transparent;
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
  }

  .btn.cancel:hover:not(:disabled) {
    border-color: var(--border-hover);
    color: var(--text-primary);
  }

  .btn.confirm {
    background: var(--accent);
    border: none;
    color: var(--text-inverse);
  }

  .btn.confirm:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
