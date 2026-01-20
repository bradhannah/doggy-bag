<script lang="ts">
  import { onMount } from 'svelte';
  import {
    savingsGoals,
    savingsGoalsLoading,
    savingsGoalsError,
    activeGoals,
    pausedGoals,
    completedGoals,
    abandonedGoals,
    loadSavingsGoals,
    pauseGoal,
    resumeGoal,
    completeGoal,
    abandonGoal,
    deleteSavingsGoal,
    getTemperatureColor,
    getStatusLabel,
    type SavingsGoal,
  } from '../../stores/savings-goals';
  import { success, error as showError } from '../../stores/toast';

  // Filter state
  let showActive = true;
  let showPaused = true;
  let showCompleted = false;
  let showAbandoned = false;

  // Loading states for actions
  let actionLoading: string | null = null;

  // Confirmation modal state
  let confirmModal: {
    type: 'complete' | 'abandon' | 'delete';
    goal: SavingsGoal;
  } | null = null;

  // Filtered goals based on checkboxes
  $: filteredGoals = $savingsGoals.filter((goal) => {
    if (goal.status === 'saving' && showActive) return true;
    if (goal.status === 'paused' && showPaused) return true;
    if (goal.status === 'bought' && showCompleted) return true;
    if (goal.status === 'abandoned' && showAbandoned) return true;
    return false;
  });

  // Group goals by status for display (reserved for future grouped view)
  $: _groupedGoals = {
    active: filteredGoals.filter((g) => g.status === 'saving'),
    paused: filteredGoals.filter((g) => g.status === 'paused'),
    completed: filteredGoals.filter((g) => g.status === 'bought'),
    abandoned: filteredGoals.filter((g) => g.status === 'abandoned'),
  };

  onMount(async () => {
    await loadSavingsGoals();
  });

  function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  function getDaysRemaining(targetDate: string): number {
    const targetTime = new Date(targetDate).setHours(0, 0, 0, 0);
    const todayTime = new Date().setHours(0, 0, 0, 0);
    return Math.ceil((targetTime - todayTime) / (1000 * 60 * 60 * 24));
  }

  function getDaysRemainingText(targetDate: string): string {
    const days = getDaysRemaining(targetDate);
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  }

  async function handlePause(goal: SavingsGoal) {
    actionLoading = goal.id;
    try {
      await pauseGoal(goal.id);
      success(`"${goal.name}" paused`);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to pause goal');
    } finally {
      actionLoading = null;
    }
  }

  async function handleResume(goal: SavingsGoal) {
    actionLoading = goal.id;
    try {
      await resumeGoal(goal.id);
      success(`"${goal.name}" resumed`);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to resume goal');
    } finally {
      actionLoading = null;
    }
  }

  async function handleComplete(goal: SavingsGoal) {
    actionLoading = goal.id;
    try {
      await completeGoal(goal.id);
      success(`Congratulations! "${goal.name}" completed!`);
      confirmModal = null;
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to complete goal');
    } finally {
      actionLoading = null;
    }
  }

  async function handleAbandon(goal: SavingsGoal) {
    actionLoading = goal.id;
    try {
      await abandonGoal(goal.id);
      success(`"${goal.name}" abandoned`);
      confirmModal = null;
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to abandon goal');
    } finally {
      actionLoading = null;
    }
  }

  async function handleDelete(goal: SavingsGoal) {
    actionLoading = goal.id;
    try {
      await deleteSavingsGoal(goal.id);
      success(`"${goal.name}" deleted`);
      confirmModal = null;
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to delete goal');
    } finally {
      actionLoading = null;
    }
  }

  function openConfirmModal(type: 'complete' | 'abandon' | 'delete', goal: SavingsGoal) {
    confirmModal = { type, goal };
  }

  function closeConfirmModal() {
    confirmModal = null;
  }
</script>

<div class="goals-page">
  <header class="page-header">
    <h1>Savings Goals</h1>
    <a href="/goals/new" class="create-button">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      New Goal
    </a>
  </header>

  <!-- Filters -->
  <div class="filters">
    <label class="filter-checkbox">
      <input type="checkbox" bind:checked={showActive} />
      <span class="status-badge active">Active ({$activeGoals.length})</span>
    </label>
    <label class="filter-checkbox">
      <input type="checkbox" bind:checked={showPaused} />
      <span class="status-badge paused">Paused ({$pausedGoals.length})</span>
    </label>
    <label class="filter-checkbox">
      <input type="checkbox" bind:checked={showCompleted} />
      <span class="status-badge completed">Completed ({$completedGoals.length})</span>
    </label>
    <label class="filter-checkbox">
      <input type="checkbox" bind:checked={showAbandoned} />
      <span class="status-badge abandoned">Abandoned ({$abandonedGoals.length})</span>
    </label>
  </div>

  {#if $savingsGoalsLoading}
    <div class="loading-state">Loading goals...</div>
  {:else if $savingsGoalsError}
    <div class="error-state">{$savingsGoalsError}</div>
  {:else if $savingsGoals.length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
          <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.5" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
      </div>
      <h2>No Savings Goals Yet</h2>
      <p>Start saving for something you want! Create your first goal to track your progress.</p>
      <a href="/goals/new" class="create-button large">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        Create Your First Goal
      </a>
    </div>
  {:else if filteredGoals.length === 0}
    <div class="empty-state">
      <h2>No Goals Match Filters</h2>
      <p>Try adjusting the filters above to see your goals.</p>
    </div>
  {:else}
    <div class="goals-grid">
      {#each filteredGoals as goal (goal.id)}
        {@const daysRemaining = getDaysRemaining(goal.target_date)}
        {@const isOverdue = daysRemaining < 0 && goal.status === 'saving'}
        {@const isOpen = goal.status === 'saving' || goal.status === 'paused'}
        <div
          class="goal-card"
          class:paused={goal.status === 'paused'}
          class:completed={goal.status === 'bought'}
          class:abandoned={goal.status === 'abandoned'}
        >
          <!-- Header with name and status -->
          <div class="goal-header">
            <h3 class="goal-name">{goal.name}</h3>
            <span class="status-pill {goal.status}">{getStatusLabel(goal.status)}</span>
          </div>

          <!-- Progress section -->
          <div class="progress-section">
            <div class="progress-bar-container">
              <div
                class="progress-bar"
                style="width: {Math.min(
                  goal.progress_percentage,
                  100
                )}%; background-color: {getTemperatureColor(goal.temperature)}"
              ></div>
            </div>
            <div class="progress-text">
              <span class="saved-amount">{formatCurrency(goal.saved_amount)}</span>
              <span class="target-amount">of {formatCurrency(goal.target_amount)}</span>
            </div>
          </div>

          <!-- Temperature indicator (only for active goals) -->
          {#if goal.status === 'saving'}
            <div
              class="temperature-indicator"
              style="color: {getTemperatureColor(goal.temperature)}"
            >
              {#if goal.temperature === 'green'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                On track
              {:else if goal.temperature === 'yellow'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
                  <path
                    d="M12 8V12"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                  <circle cx="12" cy="16" r="1" fill="currentColor" />
                </svg>
                Slightly behind
              {:else}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
                  <path
                    d="M15 9L9 15"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                  <path
                    d="M9 9L15 15"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
                Behind schedule
              {/if}
            </div>
          {/if}

          <!-- Info section -->
          <div class="goal-info">
            <div class="info-item">
              <span class="info-label">Target Date</span>
              <span class="info-value" class:overdue={isOverdue}>
                {formatDate(goal.target_date)}
                {#if isOpen}
                  <span class="days-remaining" class:overdue={isOverdue}>
                    ({getDaysRemainingText(goal.target_date)})
                  </span>
                {/if}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Progress</span>
              <span class="info-value">{goal.progress_percentage}%</span>
            </div>
            {#if goal.completed_at}
              <div class="info-item">
                <span class="info-label">{goal.status === 'bought' ? 'Completed' : 'Closed'}</span>
                <span class="info-value">{formatDate(goal.completed_at)}</span>
              </div>
            {/if}
          </div>

          <!-- Action buttons -->
          <div class="goal-actions">
            {#if goal.status === 'saving'}
              <button
                class="action-btn secondary"
                on:click={() => handlePause(goal)}
                disabled={actionLoading === goal.id}
              >
                Pause
              </button>
              <button
                class="action-btn success"
                on:click={() => openConfirmModal('complete', goal)}
                disabled={actionLoading === goal.id}
              >
                Buy That Thing!
              </button>
            {:else if goal.status === 'paused'}
              <button
                class="action-btn primary"
                on:click={() => handleResume(goal)}
                disabled={actionLoading === goal.id}
              >
                Resume
              </button>
              <button
                class="action-btn danger-outline"
                on:click={() => openConfirmModal('abandon', goal)}
                disabled={actionLoading === goal.id}
              >
                Abandon
              </button>
            {:else}
              <button
                class="action-btn danger-outline"
                on:click={() => openConfirmModal('delete', goal)}
                disabled={actionLoading === goal.id}
              >
                Delete
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Confirmation Modal -->
{#if confirmModal}
  <div
    class="modal-overlay"
    on:click={closeConfirmModal}
    on:keydown={(e) => e.key === 'Escape' && closeConfirmModal()}
    role="button"
    tabindex="0"
  >
    <div
      class="modal-content"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
    >
      {#if confirmModal.type === 'complete'}
        <h2>Complete Goal</h2>
        <p>
          Congratulations! Are you ready to mark <strong>"{confirmModal.goal.name}"</strong> as complete?
        </p>
        <p class="modal-info">
          You've saved {formatCurrency(confirmModal.goal.saved_amount)} of your {formatCurrency(
            confirmModal.goal.target_amount
          )} target.
        </p>
        <div class="modal-actions">
          <button class="action-btn secondary" on:click={closeConfirmModal}>Cancel</button>
          <button
            class="action-btn success"
            on:click={() => confirmModal && handleComplete(confirmModal.goal)}
            disabled={actionLoading === confirmModal.goal.id}
          >
            {actionLoading === confirmModal.goal.id ? 'Completing...' : 'Yes, I bought it!'}
          </button>
        </div>
      {:else if confirmModal.type === 'abandon'}
        <h2>Abandon Goal</h2>
        <p>
          Are you sure you want to abandon <strong>"{confirmModal.goal.name}"</strong>?
        </p>
        <p class="modal-warning">
          This will mark the goal as abandoned. Any scheduled payments will remain on your budget.
        </p>
        <div class="modal-actions">
          <button class="action-btn secondary" on:click={closeConfirmModal}>Cancel</button>
          <button
            class="action-btn danger"
            on:click={() => confirmModal && handleAbandon(confirmModal.goal)}
            disabled={actionLoading === confirmModal.goal.id}
          >
            {actionLoading === confirmModal.goal.id ? 'Abandoning...' : 'Abandon Goal'}
          </button>
        </div>
      {:else if confirmModal.type === 'delete'}
        <h2>Delete Goal</h2>
        <p>
          Are you sure you want to delete <strong>"{confirmModal.goal.name}"</strong>?
        </p>
        <p class="modal-warning">This action cannot be undone.</p>
        <div class="modal-actions">
          <button class="action-btn secondary" on:click={closeConfirmModal}>Cancel</button>
          <button
            class="action-btn danger"
            on:click={() => confirmModal && handleDelete(confirmModal.goal)}
            disabled={actionLoading === confirmModal.goal.id}
          >
            {actionLoading === confirmModal.goal.id ? 'Deleting...' : 'Delete Goal'}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .goals-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--content-padding);
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--section-gap);
  }

  .page-header h1 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-primary);
  }

  .create-button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--accent);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.2s;
  }

  .create-button:hover {
    background: var(--accent-hover);
  }

  .create-button.large {
    padding: var(--space-3) var(--space-6);
    font-size: 1rem;
  }

  /* Filters */
  .filters {
    display: flex;
    gap: var(--space-4);
    margin-bottom: var(--section-gap);
    flex-wrap: wrap;
  }

  .filter-checkbox {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
  }

  .filter-checkbox input {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
  }

  .status-badge {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .status-badge.active {
    color: var(--success);
  }

  .status-badge.paused {
    color: var(--warning);
  }

  .status-badge.completed {
    color: var(--accent);
  }

  .status-badge.abandoned {
    color: var(--text-tertiary);
  }

  /* Loading/Error/Empty States */
  .loading-state,
  .error-state {
    text-align: center;
    padding: var(--space-8);
    color: var(--text-secondary);
  }

  .error-state {
    color: var(--error);
  }

  .empty-state {
    text-align: center;
    padding: var(--space-8);
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
  }

  .empty-icon {
    color: var(--text-tertiary);
    margin-bottom: var(--space-4);
  }

  .empty-state h2 {
    margin: 0 0 var(--space-2) 0;
    font-size: 1.25rem;
    color: var(--text-primary);
  }

  .empty-state p {
    margin: 0 0 var(--section-gap) 0;
    color: var(--text-secondary);
  }

  /* Goals Grid */
  .goals-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: var(--section-gap);
  }

  .goal-card {
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    transition: border-color 0.2s;
  }

  .goal-card:hover {
    border-color: var(--border-hover);
  }

  .goal-card.paused {
    opacity: 0.85;
    border-color: var(--warning-border);
  }

  .goal-card.completed {
    border-color: var(--accent-border);
  }

  .goal-card.abandoned {
    opacity: 0.7;
  }

  .goal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .goal-name {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .status-pill {
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    flex-shrink: 0;
  }

  .status-pill.saving {
    background: var(--success-bg);
    color: var(--success);
  }

  .status-pill.paused {
    background: var(--warning-bg);
    color: var(--warning);
  }

  .status-pill.bought {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .status-pill.abandoned {
    background: var(--bg-elevated);
    color: var(--text-tertiary);
  }

  /* Progress Section */
  .progress-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .progress-bar-container {
    height: 8px;
    background: var(--bg-elevated);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    border-radius: var(--radius-sm);
    transition: width 0.3s ease;
  }

  .progress-text {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
  }

  .saved-amount {
    font-weight: 600;
    color: var(--text-primary);
  }

  .target-amount {
    color: var(--text-secondary);
  }

  /* Temperature Indicator */
  .temperature-indicator {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.875rem;
    font-weight: 500;
  }

  /* Goal Info */
  .goal-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--border-subtle);
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
  }

  .info-label {
    color: var(--text-secondary);
  }

  .info-value {
    color: var(--text-primary);
    font-weight: 500;
  }

  .info-value.overdue {
    color: var(--error);
  }

  .days-remaining {
    font-weight: 400;
    color: var(--text-secondary);
  }

  .days-remaining.overdue {
    color: var(--error);
  }

  /* Action Buttons */
  .goal-actions {
    display: flex;
    gap: var(--space-2);
    margin-top: auto;
    padding-top: var(--space-2);
  }

  .action-btn {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
  }

  .action-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .action-btn.primary {
    background: var(--accent);
    color: var(--text-inverse);
  }

  .action-btn.primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .action-btn.secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-color: var(--border-default);
  }

  .action-btn.secondary:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  .action-btn.success {
    background: var(--success);
    color: var(--text-inverse);
  }

  .action-btn.success:hover:not(:disabled) {
    background: var(--success-hover);
  }

  .action-btn.danger {
    background: var(--error);
    color: var(--text-inverse);
  }

  .action-btn.danger:hover:not(:disabled) {
    background: var(--error-hover);
  }

  .action-btn.danger-outline {
    background: transparent;
    color: var(--error);
    border-color: var(--error-border);
  }

  .action-btn.danger-outline:hover:not(:disabled) {
    background: var(--error-muted);
  }

  /* Modal */
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
    max-width: var(--modal-width-sm);
    width: 90%;
  }

  .modal-content h2 {
    margin: 0 0 var(--space-3) 0;
    font-size: 1.25rem;
    color: var(--text-primary);
  }

  .modal-content p {
    margin: 0 0 var(--space-3) 0;
    color: var(--text-secondary);
  }

  .modal-info {
    color: var(--accent);
    font-weight: 500;
  }

  .modal-warning {
    color: var(--warning);
    font-size: 0.875rem;
  }

  .modal-actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--section-gap);
  }
</style>
