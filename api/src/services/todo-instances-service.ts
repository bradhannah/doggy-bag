// Todo Instances Service
// Manages TodoInstance entities within monthly data
// TodoInstances are generated from recurring Todos or created ad-hoc for a specific month

import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import type { Todo, TodoInstance, TodoStatus, MonthlyData, ValidationResult } from '../types';
import { TodosServiceImpl } from './todos-service';
import type { TodosService } from './todos-service';

export interface TodoInstancesService {
  // Read methods
  getForMonth(month: string): Promise<TodoInstance[]>;
  getById(month: string, instanceId: string): Promise<TodoInstance | null>;
  getPending(month: string): Promise<TodoInstance[]>;
  getCompleted(month: string): Promise<TodoInstance[]>;
  getOverdue(month: string, asOfDate?: string): Promise<TodoInstance[]>;

  // Write methods
  createAdhoc(
    month: string,
    data: Omit<TodoInstance, 'id' | 'created_at' | 'updated_at' | 'todo_id' | 'month' | 'is_adhoc'>
  ): Promise<TodoInstance>;
  update(
    month: string,
    instanceId: string,
    updates: Partial<
      Omit<TodoInstance, 'id' | 'created_at' | 'updated_at' | 'todo_id' | 'month' | 'is_adhoc'>
    >
  ): Promise<TodoInstance | null>;
  delete(month: string, instanceId: string): Promise<void>;
  deleteInstancesByTodoId(
    todoId: string,
    options?: { includeCurrentMonth?: boolean; includeFutureMonths?: boolean }
  ): Promise<{ deletedCount: number; monthsAffected: string[] }>;

  // Status methods
  complete(month: string, instanceId: string): Promise<TodoInstance | null>;
  reopen(month: string, instanceId: string): Promise<TodoInstance | null>;

  // Generation methods
  generateInstancesForMonth(month: string): Promise<TodoInstance[]>;
  syncInstancesForMonth(month: string): Promise<TodoInstance[]>;

  // Validation
  validate(data: Partial<TodoInstance>): ValidationResult;
}

export class TodoInstancesServiceImpl implements TodoInstancesService {
  private storage: StorageService;
  private todosService: TodosService;

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
    this.todosService = new TodosServiceImpl();
  }

  private async getMonthlyData(month: string): Promise<MonthlyData | null> {
    try {
      const data = await this.storage.readJSON<MonthlyData>(`data/months/${month}.json`);
      return data;
    } catch {
      return null;
    }
  }

  private async saveMonthlyData(month: string, data: MonthlyData): Promise<void> {
    await this.storage.writeJSON(`data/months/${month}.json`, data);
  }

  public async getForMonth(month: string): Promise<TodoInstance[]> {
    try {
      const data = await this.getMonthlyData(month);
      return data?.todo_instances || [];
    } catch (error) {
      console.error('[TodoInstancesService] Failed to get todo instances for month:', error);
      return [];
    }
  }

  public async getById(month: string, instanceId: string): Promise<TodoInstance | null> {
    try {
      const instances = await this.getForMonth(month);
      return instances.find((ti) => ti.id === instanceId) || null;
    } catch (error) {
      console.error('[TodoInstancesService] Failed to get todo instance:', error);
      return null;
    }
  }

  public async getPending(month: string): Promise<TodoInstance[]> {
    try {
      const instances = await this.getForMonth(month);
      return instances
        .filter((ti) => ti.status === 'pending')
        .sort((a, b) => a.due_date.localeCompare(b.due_date));
    } catch (error) {
      console.error('[TodoInstancesService] Failed to get pending instances:', error);
      return [];
    }
  }

  public async getCompleted(month: string): Promise<TodoInstance[]> {
    try {
      const instances = await this.getForMonth(month);
      return instances
        .filter((ti) => ti.status === 'completed')
        .sort((a, b) => {
          // Sort by completed_at descending (most recent first)
          if (a.completed_at && b.completed_at) {
            return b.completed_at.localeCompare(a.completed_at);
          }
          return 0;
        });
    } catch (error) {
      console.error('[TodoInstancesService] Failed to get completed instances:', error);
      return [];
    }
  }

  public async getOverdue(month: string, asOfDate?: string): Promise<TodoInstance[]> {
    try {
      const today = asOfDate || new Date().toISOString().split('T')[0];
      const instances = await this.getForMonth(month);
      return instances
        .filter((ti) => ti.status === 'pending' && ti.due_date < today)
        .sort((a, b) => a.due_date.localeCompare(b.due_date));
    } catch (error) {
      console.error('[TodoInstancesService] Failed to get overdue instances:', error);
      return [];
    }
  }

  public async createAdhoc(
    month: string,
    data: Omit<TodoInstance, 'id' | 'created_at' | 'updated_at' | 'todo_id' | 'month' | 'is_adhoc'>
  ): Promise<TodoInstance> {
    try {
      const monthData = await this.getMonthlyData(month);
      if (!monthData) {
        throw new Error(`Monthly data for ${month} not found`);
      }

      const now = new Date().toISOString();

      const newInstance: TodoInstance = {
        ...data,
        id: crypto.randomUUID(),
        todo_id: null, // Ad-hoc instances have no parent todo
        month,
        status: 'pending', // Default status for new ad-hoc instances
        is_adhoc: true,
        created_at: now,
        updated_at: now,
      };

      const validation = this.validate(newInstance);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Initialize todo_instances array if it doesn't exist
      if (!monthData.todo_instances) {
        monthData.todo_instances = [];
      }

      monthData.todo_instances.push(newInstance);
      monthData.updated_at = now;

      await this.saveMonthlyData(month, monthData);
      return newInstance;
    } catch (error) {
      console.error('[TodoInstancesService] Failed to create ad-hoc todo instance:', error);
      throw error;
    }
  }

  public async update(
    month: string,
    instanceId: string,
    updates: Partial<
      Omit<TodoInstance, 'id' | 'created_at' | 'updated_at' | 'todo_id' | 'month' | 'is_adhoc'>
    >
  ): Promise<TodoInstance | null> {
    try {
      const monthData = await this.getMonthlyData(month);
      if (!monthData || !monthData.todo_instances) {
        return null;
      }

      const index = monthData.todo_instances.findIndex((ti) => ti.id === instanceId);
      if (index === -1) {
        return null;
      }

      const now = new Date().toISOString();

      // Handle null values - convert to undefined for optional fields
      const processedUpdates: Record<string, unknown> = { ...updates };
      if (updates.notes === null) {
        processedUpdates.notes = undefined;
      }
      if (updates.completed_at === null) {
        processedUpdates.completed_at = undefined;
      }

      const updatedInstance = {
        ...monthData.todo_instances[index],
        ...processedUpdates,
        updated_at: now,
      };

      // Remove undefined values from the final object to keep it clean
      const cleanedInstance = Object.fromEntries(
        Object.entries(updatedInstance).filter(([, v]) => v !== undefined)
      ) as typeof updatedInstance;

      const validation = this.validate(cleanedInstance);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      monthData.todo_instances[index] = cleanedInstance;
      monthData.updated_at = now;

      await this.saveMonthlyData(month, monthData);
      return cleanedInstance;
    } catch (error) {
      console.error('[TodoInstancesService] Failed to update todo instance:', error);
      throw error;
    }
  }

  public async delete(month: string, instanceId: string): Promise<void> {
    try {
      const monthData = await this.getMonthlyData(month);
      if (!monthData || !monthData.todo_instances) {
        return;
      }

      const filtered = monthData.todo_instances.filter((ti) => ti.id !== instanceId);

      // Only save if something was actually deleted
      if (filtered.length !== monthData.todo_instances.length) {
        monthData.todo_instances = filtered;
        monthData.updated_at = new Date().toISOString();
        await this.saveMonthlyData(month, monthData);
      }
    } catch (error) {
      console.error('[TodoInstancesService] Failed to delete todo instance:', error);
      throw error;
    }
  }

  /**
   * Delete all instances for a specific todo from current and/or future months
   * Never deletes from past months to preserve historical data
   */
  public async deleteInstancesByTodoId(
    todoId: string,
    options: { includeCurrentMonth?: boolean; includeFutureMonths?: boolean } = {}
  ): Promise<{ deletedCount: number; monthsAffected: string[] }> {
    const { includeCurrentMonth = true, includeFutureMonths = true } = options;

    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const monthFiles = await this.storage.listFiles('data/months');
      const monthsAffected: string[] = [];
      let deletedCount = 0;

      for (const file of monthFiles) {
        // Extract month from filename (e.g., "2025-01.json" -> "2025-01")
        const monthMatch = file.match(/^(\d{4}-\d{2})\.json$/);
        if (!monthMatch) continue;

        const month = monthMatch[1];

        // Skip past months - never delete historical data
        if (month < currentMonth) continue;

        // Skip current month if not requested
        if (month === currentMonth && !includeCurrentMonth) continue;

        // Skip future months if not requested
        if (month > currentMonth && !includeFutureMonths) continue;

        const monthData = await this.getMonthlyData(month);
        if (!monthData?.todo_instances) continue;

        const originalCount = monthData.todo_instances.length;
        monthData.todo_instances = monthData.todo_instances.filter((ti) => ti.todo_id !== todoId);

        const deleted = originalCount - monthData.todo_instances.length;
        if (deleted > 0) {
          monthData.updated_at = new Date().toISOString();
          await this.saveMonthlyData(month, monthData);
          deletedCount += deleted;
          monthsAffected.push(month);
        }
      }

      console.log(
        `[TodoInstancesService] Deleted ${deletedCount} instances for todo ${todoId} from ${monthsAffected.length} months`
      );
      return { deletedCount, monthsAffected };
    } catch (error) {
      console.error('[TodoInstancesService] Failed to delete instances by todo ID:', error);
      throw error;
    }
  }

  public async complete(month: string, instanceId: string): Promise<TodoInstance | null> {
    try {
      const instance = await this.getById(month, instanceId);
      if (!instance) {
        console.warn(`[TodoInstancesService] Todo instance ${instanceId} not found in ${month}`);
        return null;
      }

      if (instance.status === 'completed') {
        console.warn(`[TodoInstancesService] Todo instance ${instanceId} is already completed`);
        return instance;
      }

      return await this.update(month, instanceId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[TodoInstancesService] Failed to complete todo instance:', error);
      throw error;
    }
  }

  public async reopen(month: string, instanceId: string): Promise<TodoInstance | null> {
    try {
      const instance = await this.getById(month, instanceId);
      if (!instance) {
        console.warn(`[TodoInstancesService] Todo instance ${instanceId} not found in ${month}`);
        return null;
      }

      if (instance.status === 'pending') {
        console.warn(`[TodoInstancesService] Todo instance ${instanceId} is already pending`);
        return instance;
      }

      return await this.update(month, instanceId, {
        status: 'pending',
        completed_at: undefined,
      });
    } catch (error) {
      console.error('[TodoInstancesService] Failed to reopen todo instance:', error);
      throw error;
    }
  }

  /**
   * Generate todo instances for a month from all active todos
   * This is called when generating a new month or when syncing
   */
  public async generateInstancesForMonth(month: string): Promise<TodoInstance[]> {
    try {
      const todos = await this.todosService.getActive();
      const instances: TodoInstance[] = [];
      const now = new Date().toISOString();

      for (const todo of todos) {
        // Generate instances based on recurrence
        const dates = this.getOccurrenceDatesForMonth(todo, month);

        for (const date of dates) {
          instances.push({
            id: crypto.randomUUID(),
            todo_id: todo.id,
            month,
            title: todo.title,
            notes: todo.notes,
            due_date: date,
            status: 'pending',
            is_adhoc: false,
            created_at: now,
            updated_at: now,
          });
        }
      }

      return instances;
    } catch (error) {
      console.error('[TodoInstancesService] Failed to generate instances for month:', error);
      return [];
    }
  }

  /**
   * Sync todo instances for a month - adds missing instances without overwriting existing ones
   */
  public async syncInstancesForMonth(month: string): Promise<TodoInstance[]> {
    try {
      const monthData = await this.getMonthlyData(month);
      if (!monthData) {
        console.warn(`[TodoInstancesService] Monthly data for ${month} not found`);
        return [];
      }

      const existingInstances = monthData.todo_instances || [];
      const newInstances = await this.generateInstancesForMonth(month);

      // Find instances that don't exist yet (by todo_id and due_date combination)
      const existingKeys = new Set(
        existingInstances
          .filter((ti) => ti.todo_id !== null)
          .map((ti) => `${ti.todo_id}:${ti.due_date}`)
      );

      const toAdd = newInstances.filter((ni) => !existingKeys.has(`${ni.todo_id}:${ni.due_date}`));

      if (toAdd.length > 0) {
        monthData.todo_instances = [...existingInstances, ...toAdd];
        monthData.updated_at = new Date().toISOString();
        await this.saveMonthlyData(month, monthData);
        console.log(`[TodoInstancesService] Added ${toAdd.length} new todo instances to ${month}`);
      }

      return monthData.todo_instances || [];
    } catch (error) {
      console.error('[TodoInstancesService] Failed to sync instances for month:', error);
      throw error;
    }
  }

  /**
   * Get occurrence dates for a todo within a specific month
   */
  private getOccurrenceDatesForMonth(todo: Todo, month: string): string[] {
    const [year, monthNum] = month.split('-').map(Number);
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0);

    switch (todo.recurrence) {
      case 'none':
        return this.getOneTimeDateInMonth(todo, month);

      case 'weekly':
        return this.getWeeklyDatesInMonth(todo, startOfMonth, endOfMonth);

      case 'bi_weekly':
        return this.getBiWeeklyDatesInMonth(todo, startOfMonth, endOfMonth);

      case 'monthly':
        return this.getMonthlyDateInMonth(todo, month);

      default:
        return [];
    }
  }

  /**
   * One-time todo - only include if due_date falls within month
   */
  private getOneTimeDateInMonth(todo: Todo, month: string): string[] {
    // One-time todos require due_date (enforced by validation)
    if (!todo.due_date) {
      return [];
    }
    if (todo.due_date.startsWith(month)) {
      return [todo.due_date];
    }
    return [];
  }

  /**
   * Monthly recurrence - get the date for this month
   */
  private getMonthlyDateInMonth(todo: Todo, month: string): string[] {
    const [year, monthNum] = month.split('-').map(Number);
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();

    // For monthly recurrence, day_of_month is required (enforced by validation)
    // Fallback to due_date if somehow present for backwards compatibility
    let dayOfMonth: number;
    if (todo.day_of_month !== undefined) {
      dayOfMonth = todo.day_of_month;
    } else if (todo.due_date) {
      dayOfMonth = parseInt(todo.due_date.split('-')[2], 10);
    } else {
      // No way to determine day - skip this todo
      return [];
    }
    const day = Math.min(dayOfMonth, lastDayOfMonth);

    return [`${month}-${String(day).padStart(2, '0')}`];
  }

  /**
   * Weekly recurrence - get all weekly dates in month
   */
  private getWeeklyDatesInMonth(todo: Todo, startOfMonth: Date, endOfMonth: Date): string[] {
    // For weekly recurrence, start_date is required (enforced by validation)
    // Fallback to due_date for backwards compatibility
    const anchorDate = todo.start_date || todo.due_date;
    if (!anchorDate) {
      return [];
    }
    const anchor = new Date(anchorDate);
    const dates: string[] = [];
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    let current = new Date(anchor);

    // Move to the correct week within or before the month
    if (current > endOfMonth) {
      while (current > endOfMonth) {
        current = new Date(current.getTime() - oneWeekMs);
      }
    }

    while (current < startOfMonth) {
      current = new Date(current.getTime() + oneWeekMs);
    }

    // Collect all weekly dates within the month
    while (current <= endOfMonth) {
      if (current >= startOfMonth) {
        dates.push(this.formatDate(current));
      }
      current = new Date(current.getTime() + oneWeekMs);
    }

    return dates.sort();
  }

  /**
   * Bi-weekly recurrence - get all bi-weekly dates in month
   */
  private getBiWeeklyDatesInMonth(todo: Todo, startOfMonth: Date, endOfMonth: Date): string[] {
    // For bi-weekly recurrence, start_date is required (enforced by validation)
    // Fallback to due_date for backwards compatibility
    const anchorDate = todo.start_date || todo.due_date;
    if (!anchorDate) {
      return [];
    }
    const anchor = new Date(anchorDate);
    const dates: string[] = [];
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;

    let current = new Date(anchor);

    // Move to the correct two-week period within or before the month
    if (current > endOfMonth) {
      while (current > endOfMonth) {
        current = new Date(current.getTime() - twoWeeksMs);
      }
    }

    while (current < startOfMonth) {
      current = new Date(current.getTime() + twoWeeksMs);
    }

    // Collect all bi-weekly dates within the month
    while (current <= endOfMonth) {
      if (current >= startOfMonth) {
        dates.push(this.formatDate(current));
      }
      current = new Date(current.getTime() + twoWeeksMs);
    }

    return dates.sort();
  }

  /**
   * Format a Date as YYYY-MM-DD string
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  public validate(data: Partial<TodoInstance>): ValidationResult {
    const errors: string[] = [];

    if (!data.title?.trim()) {
      errors.push('Title is required');
    }

    if (!data.due_date) {
      errors.push('Due date is required');
    } else {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data.due_date)) {
        errors.push('Due date must be in YYYY-MM-DD format');
      }
    }

    // Validate status
    if (data.status) {
      const validStatuses: TodoStatus[] = ['pending', 'completed'];
      if (!validStatuses.includes(data.status)) {
        errors.push('Invalid status');
      }
    }

    // Validate month format if provided
    if (data.month) {
      const monthRegex = /^\d{4}-\d{2}$/;
      if (!monthRegex.test(data.month)) {
        errors.push('Month must be in YYYY-MM format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
