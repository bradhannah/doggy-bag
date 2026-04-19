<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Note } from '../../stores/notes';

  export let note: Note;

  const dispatch = createEventDispatcher<{
    update: { id: string; content: string };
    delete: { id: string };
  }>();

  let expanded = false;
  let editing = false;
  let editContent = '';
  let editTextarea: HTMLTextAreaElement;
  let confirmingDelete = false;

  $: isTruncated = note.content.length > 100 || note.content.includes('\n');

  function formatDate(isoStr: string): string {
    const date = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  }

  function toggleExpand() {
    if (!editing) {
      expanded = !expanded;
    }
  }

  function startEdit() {
    editContent = note.content;
    editing = true;
    expanded = true;
    // Focus textarea after Svelte renders
    requestAnimationFrame(() => {
      if (editTextarea) {
        editTextarea.focus();
        // Auto-resize
        editTextarea.style.height = 'auto';
        editTextarea.style.height = editTextarea.scrollHeight + 'px';
      }
    });
  }

  function cancelEdit() {
    editing = false;
    editContent = '';
  }

  function saveEdit() {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== note.content) {
      dispatch('update', { id: note.id, content: trimmed });
    }
    editing = false;
    editContent = '';
  }

  function handleEditKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      cancelEdit();
    }
    // Ctrl/Cmd+Enter to save
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      saveEdit();
    }
  }

  function handleEditInput() {
    if (editTextarea) {
      editTextarea.style.height = 'auto';
      editTextarea.style.height = editTextarea.scrollHeight + 'px';
    }
  }

  function handleDelete() {
    if (confirmingDelete) {
      dispatch('delete', { id: note.id });
      confirmingDelete = false;
    } else {
      confirmingDelete = true;
      // Auto-cancel after 3 seconds
      setTimeout(() => {
        confirmingDelete = false;
      }, 3000);
    }
  }
</script>

<div class="note-item" class:expanded>
  {#if editing}
    <!-- Edit mode -->
    <div class="note-edit">
      <textarea
        bind:this={editTextarea}
        bind:value={editContent}
        on:keydown={handleEditKeydown}
        on:input={handleEditInput}
        class="edit-textarea"
        placeholder="Note content..."
      ></textarea>
      <div class="edit-actions">
        <button class="btn-cancel" on:click={cancelEdit}>Cancel</button>
        <button class="btn-save" on:click={saveEdit} disabled={!editContent.trim()}>Save</button>
      </div>
    </div>
  {:else}
    <!-- View mode -->
    <button
      class="note-toggle"
      on:click={toggleExpand}
      aria-expanded={expanded}
      aria-label={expanded ? 'Collapse note' : 'Expand note'}
    >
      {#if isTruncated}
        <svg
          class="chevron"
          class:rotated={expanded}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M9 18L15 12L9 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      {:else}
        <div class="chevron-spacer"></div>
      {/if}
      <span class="note-text" class:truncated={!expanded}>
        {note.content}
      </span>
    </button>

    <div class="note-meta">
      <span class="note-date">{formatDate(note.updated_at)}</span>
      <button
        class="icon-btn"
        on:click|stopPropagation={startEdit}
        title="Edit note"
        aria-label="Edit note"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M18.5 2.50023C18.8978 2.1024 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.1024 21.5 2.50023C21.8978 2.89805 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.1024 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <button
        class="icon-btn delete-btn"
        class:confirming={confirmingDelete}
        on:click|stopPropagation={handleDelete}
        title={confirmingDelete ? 'Click again to confirm' : 'Delete note'}
        aria-label={confirmingDelete ? 'Confirm delete' : 'Delete note'}
      >
        {#if confirmingDelete}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
            <path
              d="M12 8V12M12 16H12.01"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        {:else}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <polyline
              points="3 6 5 6 21 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M19 6V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V6M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {/if}
      </button>
    </div>
  {/if}
</div>

<style>
  .note-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    transition: border-color 0.2s;
  }

  .note-item:hover {
    border-color: var(--border-hover);
  }

  /* Toggle button (chevron + text) */
  .note-toggle {
    flex: 1;
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    color: var(--text-primary);
    font-size: 0.875rem;
    line-height: 1.5;
    min-width: 0;
  }

  .chevron {
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--text-tertiary);
    transition: transform 0.2s;
  }

  .chevron.rotated {
    transform: rotate(90deg);
  }

  .chevron-spacer {
    width: 16px;
    flex-shrink: 0;
  }

  .note-text {
    flex: 1;
    min-width: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .note-text.truncated {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  /* Meta (date + action buttons) */
  .note-meta {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex-shrink: 0;
  }

  .note-date {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    white-space: nowrap;
    margin-right: var(--space-1);
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    transition:
      color 0.2s,
      background 0.2s;
  }

  .icon-btn:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .delete-btn:hover {
    color: var(--error);
    background: var(--error-muted);
  }

  .delete-btn.confirming {
    color: var(--error);
    background: var(--error-bg);
  }

  /* Edit mode */
  .note-edit {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .edit-textarea {
    width: 100%;
    min-height: 60px;
    padding: var(--space-2);
    background: var(--bg-base);
    color: var(--text-primary);
    border: 1px solid var(--accent-border);
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: 0.875rem;
    line-height: 1.5;
    resize: none;
    overflow: hidden;
    box-sizing: border-box;
  }

  .edit-textarea:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-muted);
  }

  .edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  .btn-cancel,
  .btn-save {
    padding: var(--space-1) var(--space-3);
    font-size: 0.8125rem;
    font-weight: 500;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      background 0.2s,
      opacity 0.2s;
  }

  .btn-cancel {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .btn-cancel:hover {
    background: var(--bg-hover-strong);
  }

  .btn-save {
    background: var(--accent);
    color: var(--text-inverse);
  }

  .btn-save:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
