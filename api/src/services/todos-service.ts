// Todos Service
// Manages Todo entities (templates for recurring/one-time tasks)
import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import type { Todo, TodoStatus, TodoRecurrence, ValidationResult } from '../types';

export interface TodosService {
  getAll(): Promise<Todo[]>;
  getById(id: string): Promise<Todo | null>;
  getActive(): Promise<Todo[]>;
  create(data: Omit<Todo, 'id' | 'created_at' | 'updated_at'>): Promise<Todo>;
  update(
    id: string,
    updates: Partial<Omit<Todo, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Todo | null>;
  delete(id: string): Promise<void>;
  validate(data: Partial<Todo>): ValidationResult;

  // Status transition methods
  complete(id: string): Promise<Todo | null>;
  reopen(id: string): Promise<Todo | null>;

  // Activation methods (for recurring todos)
  activate(id: string): Promise<Todo | null>;
  deactivate(id: string): Promise<Todo | null>;
}

export class TodosServiceImpl implements TodosService {
  private storage: StorageService;
  private readonly STORAGE_PATH = 'data/entities/todos.json';

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
  }

  public async getAll(): Promise<Todo[]> {
    try {
      const todos = (await this.storage.readJSON<Todo[]>(this.STORAGE_PATH)) || [];
      return todos;
    } catch (error) {
      console.error('[TodosService] Failed to load todos:', error);
      return [];
    }
  }

  public async getById(id: string): Promise<Todo | null> {
    try {
      const todos = await this.getAll();
      return todos.find((todo) => todo.id === id) || null;
    } catch (error) {
      console.error('[TodosService] Failed to get todo:', error);
      return null;
    }
  }

  public async getActive(): Promise<Todo[]> {
    try {
      const todos = await this.getAll();
      return todos.filter((todo) => todo.is_active);
    } catch (error) {
      console.error('[TodosService] Failed to get active todos:', error);
      return [];
    }
  }

  public async create(data: Omit<Todo, 'id' | 'created_at' | 'updated_at'>): Promise<Todo> {
    try {
      const todos = await this.getAll();
      const now = new Date().toISOString();

      const newTodo: Todo = {
        ...data,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      };

      const validation = this.validate(newTodo);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      todos.push(newTodo);
      await this.storage.writeJSON(this.STORAGE_PATH, todos);
      return newTodo;
    } catch (error) {
      console.error('[TodosService] Failed to create todo:', error);
      throw error;
    }
  }

  public async update(
    id: string,
    updates: Partial<Omit<Todo, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Todo | null> {
    try {
      const todos = await this.getAll();
      const index = todos.findIndex((t) => t.id === id);

      if (index === -1) {
        console.warn(`[TodosService] Todo ${id} not found`);
        return null;
      }

      // Handle null values - convert to undefined for optional fields
      const processedUpdates: Record<string, unknown> = { ...updates };
      if (updates.notes === null) {
        processedUpdates.notes = undefined;
      }
      if (updates.start_date === null) {
        processedUpdates.start_date = undefined;
      }
      if (updates.day_of_month === null) {
        processedUpdates.day_of_month = undefined;
      }
      if (updates.completed_at === null) {
        processedUpdates.completed_at = undefined;
      }

      const updatedTodo = {
        ...todos[index],
        ...processedUpdates,
        updated_at: new Date().toISOString(),
      };

      // Remove undefined values from the final object to keep it clean
      const cleanedTodo = Object.fromEntries(
        Object.entries(updatedTodo).filter(([, v]) => v !== undefined)
      ) as typeof updatedTodo;

      const validation = this.validate(cleanedTodo);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      todos[index] = cleanedTodo;
      await this.storage.writeJSON(this.STORAGE_PATH, todos);
      return cleanedTodo;
    } catch (error) {
      console.error('[TodosService] Failed to update todo:', error);
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const todos = await this.getAll();
      const filtered = todos.filter((t) => t.id !== id);
      await this.storage.writeJSON(this.STORAGE_PATH, filtered);
    } catch (error) {
      console.error('[TodosService] Failed to delete todo:', error);
      throw error;
    }
  }

  public validate(data: Partial<Todo>): ValidationResult {
    const errors: string[] = [];

    if (!data.title?.trim()) {
      errors.push('Title is required');
    }

    // Validate recurrence first to determine due_date requirements
    const isRecurring = data.recurrence && data.recurrence !== 'none';

    // For non-recurring todos, due_date is required
    // For recurring todos, due_date is optional (start_date or day_of_month is used instead)
    if (!isRecurring) {
      if (!data.due_date) {
        errors.push('Due date is required for one-time todos');
      } else {
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(data.due_date)) {
          errors.push('Due date must be in YYYY-MM-DD format');
        }
      }
    } else if (data.due_date) {
      // If due_date is provided for recurring todo, still validate format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data.due_date)) {
        errors.push('Due date must be in YYYY-MM-DD format');
      }
    }

    // Validate recurrence
    if (data.recurrence) {
      const validRecurrences: TodoRecurrence[] = ['none', 'weekly', 'bi_weekly', 'monthly'];
      if (!validRecurrences.includes(data.recurrence)) {
        errors.push('Invalid recurrence type');
      }

      // For recurring todos, validate required fields
      if (data.recurrence !== 'none') {
        if (data.recurrence === 'weekly' || data.recurrence === 'bi_weekly') {
          if (!data.start_date) {
            errors.push('Start date is required for weekly/bi-weekly recurrence');
          }
        }

        if (data.recurrence === 'monthly') {
          if (data.day_of_month === undefined || data.day_of_month === null) {
            errors.push('Day of month is required for monthly recurrence');
          } else if (data.day_of_month < 1 || data.day_of_month > 31) {
            errors.push('Day of month must be between 1 and 31');
          }
        }
      }
    }

    // Validate status
    if (data.status) {
      const validStatuses: TodoStatus[] = ['pending', 'completed'];
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
   * Complete a todo - marks as completed
   * For one-time todos (recurrence === 'none'), sets completed_at
   * For recurring todos, this primarily affects the template status
   * @param id - Todo ID
   */
  public async complete(id: string): Promise<Todo | null> {
    try {
      const todo = await this.getById(id);
      if (!todo) {
        console.warn(`[TodosService] Todo ${id} not found`);
        return null;
      }

      if (todo.status === 'completed') {
        console.warn(`[TodosService] Todo ${id} is already completed`);
        return todo;
      }

      return await this.update(id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[TodosService] Failed to complete todo:', error);
      throw error;
    }
  }

  /**
   * Reopen a completed todo
   * @param id - Todo ID
   */
  public async reopen(id: string): Promise<Todo | null> {
    try {
      const todo = await this.getById(id);
      if (!todo) {
        console.warn(`[TodosService] Todo ${id} not found`);
        return null;
      }

      if (todo.status === 'pending') {
        console.warn(`[TodosService] Todo ${id} is already pending`);
        return todo;
      }

      return await this.update(id, {
        status: 'pending',
        completed_at: undefined,
      });
    } catch (error) {
      console.error('[TodosService] Failed to reopen todo:', error);
      throw error;
    }
  }

  /**
   * Activate a todo - enables instance generation for recurring todos
   * @param id - Todo ID
   */
  public async activate(id: string): Promise<Todo | null> {
    try {
      const todo = await this.getById(id);
      if (!todo) {
        console.warn(`[TodosService] Todo ${id} not found`);
        return null;
      }

      if (todo.is_active) {
        console.warn(`[TodosService] Todo ${id} is already active`);
        return todo;
      }

      return await this.update(id, { is_active: true });
    } catch (error) {
      console.error('[TodosService] Failed to activate todo:', error);
      throw error;
    }
  }

  /**
   * Deactivate a todo - disables instance generation for recurring todos
   * @param id - Todo ID
   */
  public async deactivate(id: string): Promise<Todo | null> {
    try {
      const todo = await this.getById(id);
      if (!todo) {
        console.warn(`[TodosService] Todo ${id} not found`);
        return null;
      }

      if (!todo.is_active) {
        console.warn(`[TodosService] Todo ${id} is already inactive`);
        return todo;
      }

      return await this.update(id, { is_active: false });
    } catch (error) {
      console.error('[TodosService] Failed to deactivate todo:', error);
      throw error;
    }
  }
}
