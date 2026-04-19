// Notes Service
// Manages quick notes with CRUD operations
import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import type { Note, ValidationResult } from '../types';

export interface NotesService {
  getAll(): Promise<Note[]>;
  getById(id: string): Promise<Note | null>;
  create(data: { content: string }): Promise<Note>;
  update(id: string, updates: { content: string }): Promise<Note | null>;
  delete(id: string): Promise<void>;
  validate(data: Partial<Note>): ValidationResult;
}

export class NotesServiceImpl implements NotesService {
  private storage: StorageService;
  private readonly STORAGE_PATH = 'data/entities/notes.json';

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
  }

  public async getAll(): Promise<Note[]> {
    try {
      const notes = (await this.storage.readJSON<Note[]>(this.STORAGE_PATH)) || [];
      // Return newest first
      return notes.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error('[NotesService] Failed to load notes:', error);
      return [];
    }
  }

  public async getById(id: string): Promise<Note | null> {
    try {
      const notes = await this.getAll();
      return notes.find((note) => note.id === id) || null;
    } catch (error) {
      console.error('[NotesService] Failed to get note:', error);
      return null;
    }
  }

  public async create(data: { content: string }): Promise<Note> {
    try {
      const notes = (await this.storage.readJSON<Note[]>(this.STORAGE_PATH)) || [];
      const now = new Date().toISOString();

      const newNote: Note = {
        id: crypto.randomUUID(),
        content: data.content,
        created_at: now,
        updated_at: now,
      };

      const validation = this.validate(newNote);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      notes.push(newNote);
      await this.storage.writeJSON(this.STORAGE_PATH, notes);
      return newNote;
    } catch (error) {
      console.error('[NotesService] Failed to create note:', error);
      throw error;
    }
  }

  public async update(id: string, updates: { content: string }): Promise<Note | null> {
    try {
      const notes = (await this.storage.readJSON<Note[]>(this.STORAGE_PATH)) || [];
      const index = notes.findIndex((n) => n.id === id);

      if (index === -1) {
        console.warn(`[NotesService] Note ${id} not found`);
        return null;
      }

      const updatedNote: Note = {
        ...notes[index],
        content: updates.content,
        updated_at: new Date().toISOString(),
      };

      const validation = this.validate(updatedNote);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      notes[index] = updatedNote;
      await this.storage.writeJSON(this.STORAGE_PATH, notes);
      return updatedNote;
    } catch (error) {
      console.error('[NotesService] Failed to update note:', error);
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const notes = (await this.storage.readJSON<Note[]>(this.STORAGE_PATH)) || [];
      const filtered = notes.filter((n) => n.id !== id);
      await this.storage.writeJSON(this.STORAGE_PATH, filtered);
    } catch (error) {
      console.error('[NotesService] Failed to delete note:', error);
      throw error;
    }
  }

  public validate(data: Partial<Note>): ValidationResult {
    const errors: string[] = [];

    if (!data.content || data.content.trim().length === 0) {
      errors.push('Content is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
