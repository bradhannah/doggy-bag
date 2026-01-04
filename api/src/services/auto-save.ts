// Auto-Save Service - Debounced auto-save mechanism for entity changes

import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';

export interface AutoSaveService {
  queueSave(entityType: string, data: unknown): void;
  clearQueue(): void;
  shutdown(): void;
}

export class AutoSaveServiceImpl implements AutoSaveService {
  private static instance: AutoSaveServiceImpl | null = null;
  private storage: StorageService;
  private saveQueue: Map<string, { data: unknown; timeout: NodeJS.Timeout }>;
  private debounceMs: number;

  public static getInstance(debounceMs: number = 500): AutoSaveService {
    if (!AutoSaveServiceImpl.instance) {
      AutoSaveServiceImpl.instance = new AutoSaveServiceImpl(debounceMs);
    }
    return AutoSaveServiceImpl.instance;
  }

  constructor(debounceMs: number = 500) {
    this.storage = StorageServiceImpl.getInstance();
    this.saveQueue = new Map();
    this.debounceMs = debounceMs;
  }

  public queueSave(entityType: string, data: unknown): void {
    const existing = this.saveQueue.get(entityType);

    if (existing) {
      clearTimeout(existing.timeout);
    }

    const timeout = setTimeout(async () => {
      try {
        await this.performSave(entityType, data);
        this.saveQueue.delete(entityType);
      } catch (error) {
        console.error(`[AutoSaveService] Failed to save ${entityType}:`, error);
      }
    }, this.debounceMs);

    this.saveQueue.set(entityType, { data, timeout });
    console.log(`[AutoSaveService] Queued save for ${entityType} (debounce: ${this.debounceMs}ms)`);
  }

  public clearQueue(): void {
    for (const [entityType, { timeout }] of this.saveQueue.entries()) {
      clearTimeout(timeout);
      console.log(`[AutoSaveService] Cleared save queue for ${entityType}`);
    }
    this.saveQueue.clear();
  }

  public shutdown(): void {
    console.log('[AutoSaveService] Shutting down - flushing pending saves...');
    this.clearQueue();
  }

  private async performSave(entityType: string, data: unknown): Promise<void> {
    const filePath = `data/entities/${entityType}.json`;

    try {
      await this.storage.writeJSON(filePath, data);
      console.log(`[AutoSaveService] Saved ${entityType}`);
    } catch (error) {
      console.error(`[AutoSaveService] Failed to save ${entityType}:`, error);
      throw error;
    }
  }
}
