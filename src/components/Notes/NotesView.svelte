<script lang="ts">
  import { onMount } from 'svelte';
  import NoteItem from './NoteItem.svelte';
  import PageHeader from '../shared/PageHeader.svelte';
  import Spinner from '../shared/Spinner.svelte';
  import {
    notes,
    notesLoading,
    notesError,
    notesCount,
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
  } from '../../stores/notes';

  let newNoteContent = '';
  let addTextarea: HTMLTextAreaElement;
  let isAdding = false;

  onMount(() => {
    loadNotes();
  });

  async function handleAdd() {
    const trimmed = newNoteContent.trim();
    if (!trimmed) return;

    isAdding = true;
    try {
      await createNote(trimmed);
      newNoteContent = '';
      // Reset textarea height
      if (addTextarea) {
        addTextarea.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      isAdding = false;
    }
  }

  async function handleUpdate(event: CustomEvent<{ id: string; content: string }>) {
    try {
      await updateNote(event.detail.id, event.detail.content);
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  }

  async function handleDelete(event: CustomEvent<{ id: string }>) {
    try {
      await deleteNote(event.detail.id);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  }

  function handleAddKeydown(event: KeyboardEvent) {
    // Ctrl/Cmd+Enter to add
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      handleAdd();
    }
  }

  function handleAddInput() {
    if (addTextarea) {
      addTextarea.style.height = 'auto';
      addTextarea.style.height = addTextarea.scrollHeight + 'px';
    }
  }
</script>

<div class="notes-page">
  <div class="notes-content">
    <PageHeader title="Notes" subtitle="Quick notes that aren't tied to a month." />

    <!-- Quick add -->
    <div class="quick-add">
      <textarea
        bind:this={addTextarea}
        bind:value={newNoteContent}
        on:keydown={handleAddKeydown}
        on:input={handleAddInput}
        class="add-textarea"
        placeholder="What's on your mind?"
        rows="2"
        disabled={isAdding}
      ></textarea>
      <div class="add-actions">
        <span class="hint">Ctrl+Enter to save</span>
        <button class="add-btn" on:click={handleAdd} disabled={!newNoteContent.trim() || isAdding}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5V19M5 12H19"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Add
        </button>
      </div>
    </div>

    <!-- Notes list -->
    {#if $notesLoading && $notesCount === 0}
      <div class="loading-state">
        <Spinner label="Loading notes..." />
      </div>
    {:else if $notesError}
      <div class="error-state">
        <p>Error: {$notesError}</p>
        <button on:click={() => loadNotes()}>Retry</button>
      </div>
    {:else if $notesCount === 0}
      <div class="empty-state">
        <p>No notes yet. Add one above!</p>
      </div>
    {:else}
      <ul class="notes-list">
        {#each $notes as note (note.id)}
          <li>
            <NoteItem {note} on:update={handleUpdate} on:delete={handleDelete} />
          </li>
        {/each}
      </ul>

      <div class="notes-footer">
        <span class="note-count">{$notesCount} {$notesCount === 1 ? 'note' : 'notes'}</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .notes-page {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--bg-base);
  }

  .notes-content {
    flex: 1;
    padding: var(--section-gap);
    max-width: var(--content-max-md);
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  /* Quick add */
  .quick-add {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-3);
    margin-bottom: var(--space-6);
  }

  .add-textarea {
    width: 100%;
    min-height: 48px;
    padding: var(--space-2);
    background: var(--bg-base);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    font-family: inherit;
    font-size: 0.875rem;
    line-height: 1.5;
    resize: none;
    overflow: hidden;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  .add-textarea:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-muted);
  }

  .add-textarea::placeholder {
    color: var(--text-tertiary);
  }

  .add-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }

  .hint {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-4);
    background: var(--accent);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition:
      background 0.2s,
      opacity 0.2s;
  }

  .add-btn:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Loading, error, empty states */
  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
    color: var(--text-secondary);
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

  /* Notes list */
  .notes-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* Footer */
  .notes-footer {
    margin-top: var(--space-4);
    text-align: center;
  }

  .note-count {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  @media (max-width: 640px) {
    .notes-content {
      padding: var(--space-4);
    }
  }
</style>
