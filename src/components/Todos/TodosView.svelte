<script lang="ts">
  import { onMount } from 'svelte';
  import MonthPickerHeader from '../MonthPickerHeader.svelte';
  import TodoItem from './TodoItem.svelte';
  import QuickAddTodo from './QuickAddTodo.svelte';
  import { currentMonth } from '../../stores/ui';
  import {
    todoInstances,
    todoInstancesLoading,
    todoInstancesError,
    pendingInstances,
    completedInstances,
    loadTodoInstancesForMonth,
    completeTodoInstance,
    reopenTodoInstance,
    createAdhocInstance,
    deleteTodoInstance,
    type TodoInstance,
    type TodoInstanceData,
  } from '../../stores/todo-instances';

  // Load todo instances when month changes
  $: if ($currentMonth) {
    loadTodoInstancesForMonth($currentMonth);
  }

  // Quick add form state
  let showQuickAdd = false;

  async function handleComplete(instance: TodoInstance) {
    try {
      await completeTodoInstance($currentMonth, instance.id);
    } catch (error) {
      console.error('Failed to complete todo:', error);
    }
  }

  async function handleReopen(instance: TodoInstance) {
    try {
      await reopenTodoInstance($currentMonth, instance.id);
    } catch (error) {
      console.error('Failed to reopen todo:', error);
    }
  }

  async function handleQuickAdd(data: TodoInstanceData) {
    try {
      await createAdhocInstance($currentMonth, data);
      showQuickAdd = false;
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  }

  function handleCancelQuickAdd() {
    showQuickAdd = false;
  }

  async function handleDelete(instance: TodoInstance) {
    // Only allow deleting ad-hoc todos
    if (!instance.is_adhoc) {
      console.warn('Cannot delete recurring todo instances. Please complete them instead.');
      return;
    }
    try {
      await deleteTodoInstance($currentMonth, instance.id);
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  }
</script>

<div class="todos-page">
  <MonthPickerHeader />

  <div class="todos-content">
    {#if $todoInstancesLoading}
      <div class="loading-state">
        <span class="spinner"></span>
        <p>Loading todos...</p>
      </div>
    {:else if $todoInstancesError}
      <div class="error-state">
        <p>Error: {$todoInstancesError}</p>
        <button on:click={() => loadTodoInstancesForMonth($currentMonth)}>Retry</button>
      </div>
    {:else}
      <!-- Action bar -->
      <div class="action-bar">
        <button class="add-btn" on:click={() => (showQuickAdd = !showQuickAdd)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5V19M5 12H19"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Add Todo
        </button>
      </div>

      <!-- Quick add form -->
      {#if showQuickAdd}
        <QuickAddTodo
          month={$currentMonth}
          onSave={handleQuickAdd}
          onCancel={handleCancelQuickAdd}
        />
      {/if}

      <!-- Pending Section -->
      <section class="todos-section">
        <h2 class="section-title">
          <span class="section-icon pending-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
              <path
                d="M12 6V12L16 14"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          Pending
          {#if $pendingInstances.length > 0}
            <span class="section-count">{$pendingInstances.length}</span>
          {/if}
        </h2>

        {#if $pendingInstances.length === 0}
          <div class="empty-state">
            <p>No pending todos for this month.</p>
          </div>
        {:else}
          <ul class="todos-list">
            {#each $pendingInstances as instance (instance.id)}
              <li>
                <TodoItem
                  {instance}
                  onComplete={handleComplete}
                  onReopen={handleReopen}
                  onDelete={handleDelete}
                />
              </li>
            {/each}
          </ul>
        {/if}
      </section>

      <!-- Completed Section -->
      {#if $completedInstances.length > 0}
        <section class="todos-section completed-section">
          <h2 class="section-title">
            <span class="section-icon completed-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <polyline
                  points="22 4 12 14.01 9 11.01"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            Completed
            <span class="section-count">{$completedInstances.length}</span>
          </h2>

          <ul class="todos-list">
            {#each $completedInstances as instance (instance.id)}
              <li>
                <TodoItem
                  {instance}
                  onComplete={handleComplete}
                  onReopen={handleReopen}
                  onDelete={handleDelete}
                />
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    {/if}
  </div>
</div>

<style>
  .todos-page {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--bg-base);
  }

  .todos-content {
    flex: 1;
    padding: var(--section-gap);
    max-width: var(--content-max-md);
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  /* Action bar */
  .action-bar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: var(--space-4);
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--accent);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .add-btn:hover {
    background: var(--accent-hover);
  }

  /* Loading and error states */
  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
    color: var(--text-secondary);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-default);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--space-3);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-state {
    color: var(--error);
  }

  .error-state button {
    margin-top: var(--space-3);
    padding: var(--space-2) var(--space-4);
    background: var(--error);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
  }

  /* Sections */
  .todos-section {
    margin-bottom: var(--space-6);
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0 0 var(--space-3) 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .section-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pending-icon {
    color: var(--warning);
  }

  .completed-icon {
    color: var(--success);
  }

  .section-count {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary);
    background: var(--bg-hover);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
  }

  /* Empty state */
  .empty-state {
    padding: var(--space-6);
    text-align: center;
    color: var(--text-tertiary);
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: 1px dashed var(--border-default);
  }

  .empty-state p {
    margin: 0;
  }

  /* Todos list */
  .todos-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* Completed section styling */
  .completed-section .section-title {
    color: var(--text-secondary);
  }

  @media (max-width: 640px) {
    .todos-content {
      padding: var(--space-4);
    }
  }
</style>
