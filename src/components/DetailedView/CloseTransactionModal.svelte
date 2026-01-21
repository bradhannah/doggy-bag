<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from '../shared/Modal.svelte';

  export let open = false;
  export let type: 'bill' | 'income' = 'bill';
  export let itemName = '';
  export let initialDate = '';
  export let initialNotes = '';
  export let month = '';

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: { closedDate: string; notes: string };
  }>();

  let closedDate = '';
  let notes = '';
  let day = '';
  let daySelectEl: HTMLSelectElement | null = null;

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
    const initialDay = parseInt(initialDate.split('-')[2] ?? '', 10) || today.getDate();
    day = String(Math.min(initialDay, maxDay));
    notes = initialNotes;
    requestAnimationFrame(() => {
      (daySelectEl as HTMLSelectElement | null)?.focus();
    });
  }

  function handleClose() {
    dispatch('close');
  }

  function handleConfirm() {
    const parsedDay = parseInt(day, 10);
    if (!parsedDay) return;
    const paddedDay = String(parsedDay).padStart(2, '0');
    closedDate = `${resolvedMonth}-${paddedDay}`;
    dispatch('confirm', { closedDate, notes });
  }

  let notesEl: HTMLTextAreaElement | null = null;

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey && event.target !== notesEl) {
      event.preventDefault();
      handleConfirm();
    }
  }
</script>

<Modal {open} title="Close {itemName}" onClose={handleClose}>
  <svelte:fragment slot="eyebrow">Close {type}</svelte:fragment>

  <div class="modal-body-content" on:keydown={handleKeydown}>
    <label class="field">
      <span>Close day</span>
      <select bind:value={day} bind:this={daySelectEl} required>
        {#each dayOptions as option (option)}
          <option value={option}>{option}</option>
        {/each}
      </select>
    </label>

    <label class="field">
      <span>Notes (optional)</span>
      <textarea rows="5" placeholder="Add a short note" bind:value={notes} bind:this={notesEl}
      ></textarea>
    </label>
  </div>

  <svelte:fragment slot="footer">
    <button class="button-secondary" type="button" on:click={handleClose}> Cancel </button>
    <button class="button-primary" type="button" on:click={handleConfirm}> Close </button>
  </svelte:fragment>
</Modal>

<style>
  .modal-body-content {
    display: grid;
    gap: var(--space-4);
  }

  .field {
    display: grid;
    gap: var(--space-2);
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  select,
  textarea {
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
    height: auto;
  }

  select:focus,
  textarea:focus {
    outline: 2px solid var(--border-focus);
    outline-offset: 1px;
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
