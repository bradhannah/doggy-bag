// Undo Service - Undo stack management for reverting changes

import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import type { UndoEntry, UndoEntityType } from '../types';

const MAX_UNDO_STACK = 5;

export interface UndoService {
  pushChange(entry: UndoEntry): Promise<void>;
  undo(): Promise<UndoEntry | null>;
  clear(): Promise<void>;
  getStack(): Promise<UndoEntry[]>;
  isEmpty(): Promise<boolean>;
}

export class UndoServiceImpl implements UndoService {
  private static instance: UndoServiceImpl | null = null;
  private storage: StorageService;

  public static getInstance(): UndoService {
    if (!UndoServiceImpl.instance) {
      UndoServiceImpl.instance = new UndoServiceImpl();
    }
    return UndoServiceImpl.instance;
  }

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
  }

  public async pushChange(entry: UndoEntry): Promise<void> {
    try {
      const stack = await this.getStack();

      stack.push(entry);

      if (stack.length > MAX_UNDO_STACK) {
        stack.shift();
      }

      await this.storage.writeJSON('data/entities/undo.json', stack);
      console.log(`[UndoService] Pushed change (${entry.entity_type}:${entry.entity_id})`);
    } catch (error) {
      console.error('[UndoService] Failed to push change:', error);
      throw error;
    }
  }

  public async undo(): Promise<UndoEntry | null> {
    try {
      const stack = await this.getStack();

      if (stack.length === 0) {
        console.log('[UndoService] No changes to undo');
        return null;
      }

      const entry = stack.pop() || null;

      if (entry) {
        await this.storage.writeJSON('data/entities/undo.json', stack);
        console.log(`[UndoService] Undid change (${entry.entity_type}:${entry.entity_id})`);
      }

      return entry;
    } catch (error) {
      console.error('[UndoService] Failed to undo:', error);
      throw error;
    }
  }

  public async clear(): Promise<void> {
    try {
      await this.storage.writeJSON('data/entities/undo.json', []);
      console.log('[UndoService] Cleared undo stack');
    } catch (error) {
      console.error('[UndoService] Failed to clear:', error);
      throw error;
    }
  }

  public async getStack(): Promise<UndoEntry[]> {
    try {
      const stack = (await this.storage.readJSON<UndoEntry[]>('data/entities/undo.json')) || [];
      return stack;
    } catch (error) {
      console.error('[UndoService] Failed to get stack:', error);
      return [];
    }
  }

  public async isEmpty(): Promise<boolean> {
    const stack = await this.getStack();
    return stack.length === 0;
  }
}

export function createUndoEntry(
  entityType: UndoEntityType,
  entityId: string,
  oldValue: unknown,
  newValue: unknown
): UndoEntry {
  return {
    id: crypto.randomUUID(),
    entity_type: entityType,
    entity_id: entityId,
    old_value: oldValue,
    new_value: newValue,
    timestamp: new Date().toISOString(),
  };
}
