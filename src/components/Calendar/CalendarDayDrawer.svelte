<script lang="ts">
  /**
   * CalendarDayDrawer - Lists every event on one calendar day
   *
   * Uses the shared Modal, so focus, Escape and stacking match every other dialog.
   */
  import type { CalendarEvent } from '../../stores/calendar';
  import CalendarEventItem from './CalendarEventItem.svelte';
  import Modal from '../shared/Modal.svelte';

  export let isOpen: boolean = false;
  export let date: string = ''; // YYYY-MM-DD
  export let events: CalendarEvent[] = [];
  export let onClose: () => void = () => {};

  // Format date for display
  $: displayDate = formatDisplayDate(date);

  function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00'); // Avoid timezone issues
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
</script>

<Modal
  open={isOpen}
  title={displayDate}
  subtitle="{events.length} event{events.length !== 1 ? 's' : ''}"
  {onClose}
>
  <div class="events-list">
    {#each events as event (event.id)}
      <CalendarEventItem {event} compact={false} />
    {/each}
  </div>
</Modal>

<style>
  .events-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
</style>
