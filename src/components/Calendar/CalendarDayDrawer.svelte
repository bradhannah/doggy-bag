<script lang="ts">
  import type { CalendarEvent } from '../../stores/calendar';
  import CalendarEventItem from './CalendarEventItem.svelte';

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

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="drawer-backdrop" onclick={handleBackdropClick}>
    <div class="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div class="drawer-header">
        <h2 id="drawer-title">{displayDate}</h2>
        <button type="button" class="close-button" onclick={onClose} aria-label="Close">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="drawer-content">
        <div class="event-count">{events.length} event{events.length !== 1 ? 's' : ''}</div>

        <div class="events-list">
          {#each events as event (event.id)}
            <CalendarEventItem {event} compact={false} />
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: var(--overlay-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.15s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .drawer-panel {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-heavy);
    width: 90%;
    max-width: 400px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    border-bottom: 1px solid var(--border-default);
  }

  .drawer-header h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .close-button:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .drawer-content {
    flex: 1;
    padding: var(--space-4);
    overflow-y: auto;
  }

  .event-count {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-bottom: var(--space-3);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .events-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
</style>
