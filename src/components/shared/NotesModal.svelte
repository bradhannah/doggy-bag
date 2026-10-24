<script lang="ts">
  /**
   * NotesModal - Simple modal to display notes text
   *
   * @prop title - Title for the modal (e.g., bill/income name)
   * @prop notes - The notes text to display
   * @prop open - Whether the modal is open
   */
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';

  export let title: string = 'Notes';
  export let notes: string = '';
  export let open: boolean = false;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();
</script>

<Modal {open} {title} onClose={() => dispatch('close')}>
  <p class="notes-text">{notes}</p>
</Modal>

<style>
  .notes-text {
    margin: 0;
    font-size: var(--font-size-md);
    line-height: 1.6;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
