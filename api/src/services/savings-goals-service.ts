// Savings Goals Service
import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import type { SavingsGoal, SavingsGoalStatus, GoalTemperature, ValidationResult } from '../types';

export interface SavingsGoalsService {
  getAll(): Promise<SavingsGoal[]>;
  getById(id: string): Promise<SavingsGoal | null>;
  getByStatus(status: SavingsGoalStatus): Promise<SavingsGoal[]>;
  create(
    data: Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at' | 'current_amount'>
  ): Promise<SavingsGoal>;
  update(
    id: string,
    updates: Partial<Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<SavingsGoal | null>;
  delete(id: string): Promise<void>;
  validate(data: Partial<SavingsGoal>): ValidationResult;

  // Status transition methods
  pause(id: string): Promise<SavingsGoal | null>;
  resume(id: string): Promise<SavingsGoal | null>;
  complete(id: string, completedAt?: string): Promise<SavingsGoal | null>;
  abandon(id: string): Promise<SavingsGoal | null>;
  archive(id: string): Promise<SavingsGoal | null>;
  unarchive(id: string, restoreToStatus: 'bought' | 'abandoned'): Promise<SavingsGoal | null>;

  // Calculation methods
  calculateTemperature(goal: SavingsGoal, savedAmount: number): GoalTemperature;
  getExpectedSavedAmount(goal: SavingsGoal, asOfDate?: Date): number;
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
    data: Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at' | 'current_amount'>
  ): Promise<SavingsGoal> {
    try {
      const goals = await this.getAll();
      const now = new Date().toISOString();

      const newGoal: SavingsGoal = {
        ...data,
        id: crypto.randomUUID(),
        current_amount: 0,
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

    // Validate status if provided
    if (data.status) {
      const validStatuses: SavingsGoalStatus[] = [
        'saving',
        'paused',
        'bought',
        'abandoned',
        'archived',
      ];
      if (!validStatuses.includes(data.status)) {
        errors.push('Invalid status');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get goals by status
   * @param status - Goal status to filter by
   */
  public async getByStatus(status: SavingsGoalStatus): Promise<SavingsGoal[]> {
    try {
      const goals = await this.getAll();
      return goals.filter((goal) => goal.status === status);
    } catch (error) {
      console.error('[SavingsGoalsService] Failed to get goals by status:', error);
      return [];
    }
  }

  /**
   * Pause a goal - stops tracking but preserves progress
   * Can only pause goals in 'saving' status
   * @param id - Goal ID
   */
  public async pause(id: string): Promise<SavingsGoal | null> {
    try {
      const goal = await this.getById(id);
      if (!goal) {
        console.warn(`[SavingsGoalsService] Goal ${id} not found`);
        return null;
      }

      if (goal.status !== 'saving') {
        throw new Error(
          `Cannot pause goal with status '${goal.status}'. Only 'saving' goals can be paused.`
        );
      }

      return await this.update(id, {
        status: 'paused',
        paused_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SavingsGoalsService] Failed to pause goal:', error);
      throw error;
    }
  }

  /**
   * Resume a paused goal - returns to 'saving' status
   * Can only resume goals in 'paused' status
   * @param id - Goal ID
   */
  public async resume(id: string): Promise<SavingsGoal | null> {
    try {
      const goal = await this.getById(id);
      if (!goal) {
        console.warn(`[SavingsGoalsService] Goal ${id} not found`);
        return null;
      }

      if (goal.status !== 'paused') {
        throw new Error(
          `Cannot resume goal with status '${goal.status}'. Only 'paused' goals can be resumed.`
        );
      }

      return await this.update(id, {
        status: 'saving',
        paused_at: undefined, // Clear paused timestamp
      });
    } catch (error) {
      console.error('[SavingsGoalsService] Failed to resume goal:', error);
      throw error;
    }
  }

  /**
   * Complete a goal - marks as 'bought' (successfully completed)
   * Can complete goals in 'saving' or 'paused' status
   * @param id - Goal ID
   * @param completedAt - Optional completion date (defaults to now)
   */
  public async complete(id: string, completedAt?: string): Promise<SavingsGoal | null> {
    try {
      const goal = await this.getById(id);
      if (!goal) {
        console.warn(`[SavingsGoalsService] Goal ${id} not found`);
        return null;
      }

      if (goal.status === 'bought' || goal.status === 'abandoned' || goal.status === 'archived') {
        throw new Error(
          `Cannot complete goal with status '${goal.status}'. Goal is already closed.`
        );
      }

      return await this.update(id, {
        status: 'bought',
        completed_at: completedAt || new Date().toISOString(),
        paused_at: undefined, // Clear paused timestamp
      });
    } catch (error) {
      console.error('[SavingsGoalsService] Failed to complete goal:', error);
      throw error;
    }
  }

  /**
   * Abandon a goal - marks as 'abandoned' (cancelled without completion)
   * Can abandon goals in 'saving' or 'paused' status
   * @param id - Goal ID
   */
  public async abandon(id: string): Promise<SavingsGoal | null> {
    try {
      const goal = await this.getById(id);
      if (!goal) {
        console.warn(`[SavingsGoalsService] Goal ${id} not found`);
        return null;
      }

      if (goal.status === 'bought' || goal.status === 'abandoned' || goal.status === 'archived') {
        throw new Error(
          `Cannot abandon goal with status '${goal.status}'. Goal is already closed.`
        );
      }

      return await this.update(id, {
        status: 'abandoned',
        completed_at: new Date().toISOString(),
        paused_at: undefined, // Clear paused timestamp
      });
    } catch (error) {
      console.error('[SavingsGoalsService] Failed to abandon goal:', error);
      throw error;
    }
  }

  /**
   * Archive a goal - hides from default list view
   * Can only archive goals in 'bought' or 'abandoned' status
   * @param id - Goal ID
   */
  public async archive(id: string): Promise<SavingsGoal | null> {
    try {
      const goal = await this.getById(id);
      if (!goal) {
        console.warn(`[SavingsGoalsService] Goal ${id} not found`);
        return null;
      }

      if (goal.status !== 'bought' && goal.status !== 'abandoned') {
        throw new Error(
          `Cannot archive goal with status '${goal.status}'. Only 'bought' or 'abandoned' goals can be archived.`
        );
      }

      return await this.update(id, {
        status: 'archived',
        previous_status: goal.status, // Store original status for unarchive
        archived_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SavingsGoalsService] Failed to archive goal:', error);
      throw error;
    }
  }

  /**
   * Unarchive a goal - restores to specified status
   * Can only unarchive goals in 'archived' status
   * @param id - Goal ID
   * @param restoreToStatus - Status to restore to ('bought' or 'abandoned')
   */
  public async unarchive(
    id: string,
    restoreToStatus: 'bought' | 'abandoned'
  ): Promise<SavingsGoal | null> {
    try {
      const goal = await this.getById(id);
      if (!goal) {
        console.warn(`[SavingsGoalsService] Goal ${id} not found`);
        return null;
      }

      if (goal.status !== 'archived') {
        throw new Error(
          `Cannot unarchive goal with status '${goal.status}'. Only 'archived' goals can be unarchived.`
        );
      }

      return await this.update(id, {
        status: restoreToStatus,
        previous_status: undefined, // Clear previous status
        archived_at: undefined, // Clear archived timestamp
      });
    } catch (error) {
      console.error('[SavingsGoalsService] Failed to unarchive goal:', error);
      throw error;
    }
  }

  /**
   * Calculate the temperature (progress status) of a goal
   * - Green: On track or ahead (saved >= expected)
   * - Yellow: Slightly behind (saved is 75-99% of expected)
   * - Red: Significantly behind (saved is <75% of expected)
   *
   * @param goal - The savings goal
   * @param savedAmount - Current amount saved (in cents)
   * @returns Temperature indicator
   */
  public calculateTemperature(goal: SavingsGoal, savedAmount: number): GoalTemperature {
    const expectedAmount = this.getExpectedSavedAmount(goal);

    // If we've reached or exceeded the target, always green
    if (savedAmount >= goal.target_amount) {
      return 'green';
    }

    // If no expected amount yet (goal just started), green
    if (expectedAmount <= 0) {
      return 'green';
    }

    const ratio = savedAmount / expectedAmount;

    if (ratio >= 1) {
      return 'green'; // On track or ahead
    } else if (ratio >= 0.75) {
      return 'yellow'; // Slightly behind (75-99% of expected)
    } else {
      return 'red'; // Significantly behind (<75% of expected)
    }
  }

  /**
   * Calculate expected saved amount based on linear progress from creation to target date
   *
   * @param goal - The savings goal
   * @param asOfDate - Calculate as of this date (defaults to now)
   * @returns Expected amount saved in cents
   */
  public getExpectedSavedAmount(goal: SavingsGoal, asOfDate?: Date): number {
    const now = asOfDate || new Date();
    const targetDate = new Date(goal.target_date);
    const createdDate = new Date(goal.created_at);

    // If target date is in the past, expected is the full amount
    if (now >= targetDate) {
      return goal.target_amount;
    }

    // If we're before the creation date, expected is 0
    if (now <= createdDate) {
      return 0;
    }

    // Calculate linear progress
    const totalDuration = targetDate.getTime() - createdDate.getTime();
    const elapsed = now.getTime() - createdDate.getTime();

    if (totalDuration <= 0) {
      return goal.target_amount;
    }

    const ratio = elapsed / totalDuration;
    return Math.round(goal.target_amount * ratio);
  }
}
