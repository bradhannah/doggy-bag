// Savings Goals Service
import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import type { SavingsGoal, ValidationResult } from '../types';

export interface SavingsGoalsService {
  getAll(): Promise<SavingsGoal[]>;
  getById(id: string): Promise<SavingsGoal | null>;
  create(
    data: Omit<
      SavingsGoal,
      'id' | 'created_at' | 'updated_at' | 'current_amount' | 'linked_bill_ids'
    >
  ): Promise<SavingsGoal>;
  update(
    id: string,
    updates: Partial<Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<SavingsGoal | null>;
  delete(id: string): Promise<void>;
  validate(data: Partial<SavingsGoal>): ValidationResult;
}

export class SavingsGoalsServiceImpl implements SavingsGoalsService {
  private storage: StorageService;
  private readonly STORAGE_PATH = 'data/entities/savings-goals.json';

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
  }

  public async getAll(): Promise<SavingsGoal[]> {
    try {
      const goals = (await this.storage.readJSON<SavingsGoal[]>(this.STORAGE_PATH)) || [];
      return goals;
    } catch (error) {
      console.error('[SavingsGoalsService] Failed to load savings goals:', error);
      return [];
    }
  }

  public async getById(id: string): Promise<SavingsGoal | null> {
    try {
      const goals = await this.getAll();
      return goals.find((goal) => goal.id === id) || null;
    } catch (error) {
      console.error('[SavingsGoalsService] Failed to get savings goal:', error);
      return null;
    }
  }

  public async create(
    data: Omit<
      SavingsGoal,
      'id' | 'created_at' | 'updated_at' | 'current_amount' | 'linked_bill_ids'
    >
  ): Promise<SavingsGoal> {
    try {
      const goals = await this.getAll();
      const now = new Date().toISOString();

      const newGoal: SavingsGoal = {
        ...data,
        id: crypto.randomUUID(),
        current_amount: 0,
        linked_bill_ids: [],
        created_at: now,
        updated_at: now,
      };

      const validation = this.validate(newGoal);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      goals.push(newGoal);
      await this.storage.writeJSON(this.STORAGE_PATH, goals);
      return newGoal;
    } catch (error) {
      console.error('[SavingsGoalsService] Failed to create savings goal:', error);
      throw error;
    }
  }

  public async update(
    id: string,
    updates: Partial<Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<SavingsGoal | null> {
    try {
      const goals = await this.getAll();
      const index = goals.findIndex((g) => g.id === id);

      if (index === -1) {
        console.warn(`[SavingsGoalsService] Goal ${id} not found`);
        return null;
      }

      const updatedGoal = {
        ...goals[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const validation = this.validate(updatedGoal);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      goals[index] = updatedGoal;
      await this.storage.writeJSON(this.STORAGE_PATH, goals);
      return updatedGoal;
    } catch (error) {
      console.error('[SavingsGoalsService] Failed to update savings goal:', error);
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const goals = await this.getAll();
      const filtered = goals.filter((g) => g.id !== id);
      await this.storage.writeJSON(this.STORAGE_PATH, filtered);
    } catch (error) {
      console.error('[SavingsGoalsService] Failed to delete savings goal:', error);
      throw error;
    }
  }

  public validate(data: Partial<SavingsGoal>): ValidationResult {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Name is required');
    }

    if (data.target_amount !== undefined && data.target_amount <= 0) {
      errors.push('Target amount must be greater than 0');
    }

    if (data.current_amount !== undefined && data.current_amount < 0) {
      errors.push('Current amount cannot be negative');
    }

    if (!data.linked_account_id) {
      errors.push('Linked account is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
