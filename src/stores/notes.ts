// Notes Store
// Manages quick notes with CRUD operations

import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface Note {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Store State
// ============================================================================

type NotesState = {
  notes: Note[];
  loading: boolean;
  error: string | null;
};

const initialState: NotesState = {
  notes: [],
  loading: false,
  error: null,
};

const store = writable<NotesState>(initialState);

// ============================================================================
// Base Stores
// ============================================================================

export const notes = derived(store, (s) => s.notes);
export const notesLoading = derived(store, (s) => s.loading);
export const notesError = derived(store, (s) => s.error);

/** Count of notes */
export const notesCount = derived(notes, (n) => n.length);

// ============================================================================
// CRUD Actions
// ============================================================================

/**
 * Load all notes from the API
 */
export async function loadNotes(): Promise<void> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const data = await apiClient.get('/api/notes');
    const noteList = (data || []) as Note[];
    store.update((s) => ({ ...s, notes: noteList, loading: false }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to load notes');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Create a new note
 */
export async function createNote(content: string): Promise<Note> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const note = (await apiClient.post('/api/notes', { content })) as Note;
    store.update((s) => ({
      ...s,
      // Insert at the beginning (newest first)
      notes: [note, ...s.notes],
      loading: false,
    }));
    return note;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to create note');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

/**
 * Update an existing note
 */
export async function updateNote(id: string, content: string): Promise<Note> {
  store.update((s) => ({ ...s, error: null }));

  try {
    const note = (await apiClient.putPath(`/api/notes/${id}`, { content })) as Note;
    store.update((s) => ({
      ...s,
      notes: s.notes.map((n) => (n.id === id ? note : n)),
    }));
    return note;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to update note');
    store.update((s) => ({ ...s, error: err.message }));
    throw err;
  }
}

/**
 * Delete a note
 */
export async function deleteNote(id: string): Promise<void> {
  store.update((s) => ({ ...s, error: null }));

  try {
    await apiClient.deletePath(`/api/notes/${id}`);
    store.update((s) => ({
      ...s,
      notes: s.notes.filter((n) => n.id !== id),
    }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to delete note');
    store.update((s) => ({ ...s, error: err.message }));
    throw err;
  }
}
