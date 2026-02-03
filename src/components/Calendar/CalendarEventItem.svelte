<script lang="ts">
  import { goto } from '$app/navigation';
  import type { CalendarEvent } from '../../stores/calendar';
  import { formatAmount } from '../../stores/calendar';

  export let event: CalendarEvent;
  export let compact: boolean = false;

  // Format amount for display
  $: displayAmount = event.amount !== undefined ? formatAmount(event.amount) : '';

  // Extract month from event date (YYYY-MM)
  $: eventMonth = event.date.substring(0, 7);

  /**
   * Navigate to the appropriate page based on event type
   */
  function handleClick() {
    switch (event.type) {
      case 'bill':
      case 'income':
        // Navigate to the month view for bills/incomes
        goto(`/month/${eventMonth}`);
        break;
      case 'goal':
        // Navigate to savings goals page
        goto('/savings');
        break;
      case 'todo':
        // Navigate to todos page
        goto('/todos');
        break;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }
</script>

<button
  type="button"
  class="calendar-event"
  class:bill={event.type === 'bill'}
  class:income={event.type === 'income'}
  class:goal={event.type === 'goal'}
  class:todo={event.type === 'todo'}
  class:closed={event.is_closed}
  class:overdue={event.is_overdue}
  class:compact
  onclick={handleClick}
  onkeydown={handleKeydown}
  title="{event.title}{displayAmount ? ` - ${displayAmount}` : ''}"
>
  <span class="event-indicator"></span>
  <span class="event-title">{event.title}</span>
  {#if displayAmount && !compact}
    <span class="event-amount">{displayAmount}</span>
  {/if}
  {#if event.is_closed}
    <span class="event-status">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <polyline
          points="20 6 9 17 4 12"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  {/if}
</button>

<style>
  .calendar-event {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    line-height: 1;
    /* Fixed height - use flex shorthand to prevent shrinking/growing */
    flex: 0 0 22px;
    height: 22px;
    min-height: 22px;
    max-height: 22px;
    box-sizing: border-box;
    cursor: pointer;
    transition: all 0.15s ease;
    overflow: hidden;
    /* Button reset */
    width: 100%;
    border: none;
    text-align: left;
    font-family: inherit;
  }

  .calendar-event:hover {
    filter: brightness(1.15);
    transform: translateX(2px);
    box-shadow: 0 2px 4px var(--shadow-light);
  }

  .calendar-event:active {
    transform: translateX(1px);
  }

  .calendar-event:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .calendar-event.compact {
    padding: 2px var(--space-1);
    font-size: 0.7rem;
    /* Fixed height for compact mode */
    flex: 0 0 18px;
    height: 18px;
    min-height: 18px;
    max-height: 18px;
  }

  /* Type-based colors */
  .calendar-event.bill {
    background: var(--error-muted);
    color: var(--error);
    border-left: 2px solid var(--error);
  }

  .calendar-event.income {
    background: var(--success-muted);
    color: var(--success);
    border-left: 2px solid var(--success);
  }

  .calendar-event.goal {
    background: var(--accent-muted);
    color: var(--accent);
    border-left: 2px solid var(--accent);
  }

  .calendar-event.todo {
    background: var(--purple-muted);
    color: var(--purple);
    border-left: 2px solid var(--purple);
  }

  /* Closed state - muted appearance */
  .calendar-event.closed {
    opacity: 0.6;
  }

  .calendar-event.closed .event-title {
    text-decoration: line-through;
  }

  /* Overdue state - stronger emphasis */
  .calendar-event.overdue {
    background: var(--error-bg);
    border-left-color: var(--error);
    animation: pulse-overdue 2s ease-in-out infinite;
  }

  @keyframes pulse-overdue {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }

  .event-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .bill .event-indicator {
    background: var(--error);
  }

  .income .event-indicator {
    background: var(--success);
  }

  .goal .event-indicator {
    background: var(--accent);
  }

  .todo .event-indicator {
    background: var(--purple);
  }

  .event-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }

  .event-amount {
    flex-shrink: 0;
    font-weight: 600;
    font-size: 0.7rem;
  }

  .event-status {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    color: var(--success);
  }

  .compact .event-indicator {
    width: 4px;
    height: 4px;
  }
</style>
