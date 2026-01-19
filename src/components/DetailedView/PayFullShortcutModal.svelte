<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let open = false;
  export let type: 'bill' | 'income' = 'bill';
  export let itemName = '';
  export let amount = 0;
  export let initialDay = '';
  export let initialNotes = '';
  export let month = '';

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: { amount: number; day: string; notes: string };
  }>();

  let day = '';
  let notes = '';
  let amountInput = '';

  const today = new Date();
  const todayMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  $: resolvedMonth = month === todayMonth ? month : todayMonth;
  $: [resolvedYear, resolvedMonthNum] = resolvedMonth.split('-').map(Number);
  $: lastDay =
    resolvedYear && resolvedMonthNum
      ? new Date(resolvedYear, resolvedMonthNum, 0).getDate()
      : today.getDate();
  $: maxDay = Math.min(today.getDate(), lastDay);
  $: dayOptions = Array.from({ length: maxDay }, (_, index) => String(index + 1));

  $: if (open) {
    day = String(Math.min(parseInt(initialDay, 10) || today.getDate(), maxDay));
    notes = initialNotes;
    amountInput = (amount / 100).toFixed(2);
  }

  function handleClose() {
    dispatch('close');
  }

  function handleConfirm() {
    const parsedAmount = parseFloat(amountInput.replace(/[^0-9.-]/g, ''));
    const parsedDay = parseInt(day, 10);
    if (!parsedDay || Number.isNaN(parsedAmount)) {
      return;
    }
    dispatch('confirm', {
      amount: Math.round(parsedAmount * 100),
      day: String(parsedDay),
      notes,
    });
  }
</script>

{#if open}
  <div class="modal-backdrop" role="presentation" on:click|self={handleClose}>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Pay full">
      <header class="modal-header">
        <div>
          <p class="eyebrow">{type === 'bill' ? 'Pay' : 'Receive'} full</p>
          <h3>{itemName}</h3>
        </div>
        <button class="icon-button" on:click={handleClose} aria-label="Close modal">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </header>

      <div class="modal-body">
        <label class="field">
          <span>Amount</span>
          <input type="text" bind:value={amountInput} />
        </label>

        <label class="field">
          <span>Day of month</span>
          <select bind:value={day}>
            {#each dayOptions as option (option)}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </label>

        <p class="hint">Defaults to today. Only days in the current month are available.</p>

        <label class="field">
          <span>Notes (optional)</span>
          <textarea rows="5" bind:value={notes}></textarea>
        </label>
      </div>

      <footer class="modal-footer">
        <button class="button-secondary" type="button" on:click={handleClose}>Cancel</button>
        <button class="button-primary" type="button" on:click={handleConfirm}>
          {type === 'bill' ? 'Pay & Close' : 'Receive & Close'}
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: var(--overlay-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
  }

  .modal {
    width: min(100%, var(--panel-width-medium));
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: 0 24px 60px var(--shadow-heavy);
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--border-default);
  }

  .eyebrow {
    margin: 0 0 var(--space-1) 0;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-tertiary);
  }

  h3 {
    margin: 0;
    font-size: 1.1rem;
  }

  .icon-button {
    border: none;
    background: transparent;
    color: var(--text-secondary);
  }

  .modal-body {
    padding: var(--space-5);
    display: grid;
    gap: var(--space-4);
  }

  .field {
    display: grid;
    gap: var(--space-2);
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  input,
  textarea,
  select {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-base);
    color: var(--text-primary);
    box-sizing: border-box;
  }

  textarea {
    min-height: calc(var(--input-height) * 3);
    resize: vertical;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: 2px solid var(--border-focus);
    outline-offset: 1px;
  }

  .hint {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .modal-footer {
    padding: var(--space-4) var(--space-5);
    border-top: 1px solid var(--border-default);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
  }
</style>
