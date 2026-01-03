// Categories Service - CRUD operations with storage integration

import { StorageServiceImpl } from './storage';
import { ValidationServiceImpl } from './validation';
import type { StorageService } from './storage';
import type { ValidationService } from './validation';
import type { 
  Category,
  CategoryType,
  ValidationResult 
} from '../types';
import { migrateCategory, needsCategoryMigration } from '../utils/migration';

// Static GUID for the Variable Expenses category (system-only, cannot be deleted)
export const VARIABLE_EXPENSES_CATEGORY_ID = 'a1b2c3d4-e5f6-7890-abcd-variable0001';
const VARIABLE_EXPENSES_CATEGORY_NAME = 'Variable Expenses';
const VARIABLE_EXPENSES_CATEGORY_COLOR = '#f59e0b'; // Amber

export interface CategoriesService {
  getAll(): Promise<Category[]>;
  getByType(type: CategoryType): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  create(data: Omit<Category, 'created_at' | 'updated_at' | 'id'>): Promise<Category>;
  update(id: string, updates: Partial<Omit<Category, 'created_at' | 'updated_at' | 'id'>>): Promise<Category | null>;
  delete(id: string): Promise<void>;
  reorder(type: CategoryType, orderedIds: string[]): Promise<Category[]>;
  ensurePayoffCategory(): Promise<Category>;
  ensureVariableExpensesCategory(): Promise<Category>;
  
  validate(data: Partial<Category>): ValidationResult;
}

export class CategoriesServiceImpl implements CategoriesService {
  private storage: StorageService;
  private validation: ValidationService;
  
  constructor() {
    this.storage = StorageServiceImpl.getInstance();
    this.validation = ValidationServiceImpl.getInstance();
  }
  
  public async getAll(): Promise<Category[]> {
    try {
      const rawCategories = await this.storage.readJSON<any[]>('data/entities/categories.json') || [];
      
      // Ensure Variable Expenses category exists
      const hasVariableCategory = rawCategories.some(
        c => c.id === VARIABLE_EXPENSES_CATEGORY_ID || c.type === 'variable'
      );
      if (!hasVariableCategory) {
        await this.ensureVariableExpensesCategory();
        // Re-read after creating
        const updated = await this.storage.readJSON<any[]>('data/entities/categories.json') || [];
        return this.processCategories(updated);
      }
      
      return this.processCategories(rawCategories);
    } catch (error) {
      console.error('[CategoriesService] Failed to load categories:', error);
      return [];
    }
  }
  
  /**
   * Process raw categories: migrate if needed, sort by type then sort_order
   * Variable category always sorted last
   */
  private async processCategories(rawCategories: any[]): Promise<Category[]> {
    // Apply migration if needed
    let needsSave = false;
    const categories = rawCategories.map((cat, index) => {
      if (needsCategoryMigration(cat)) {
        needsSave = true;
        return migrateCategory(cat, index);
      }
      return cat as Category;
    });
    
    // Persist migrated data
    if (needsSave) {
      await this.storage.writeJSON('data/entities/categories.json', categories);
      console.log('[CategoriesService] Migrated categories to new schema');
    }
    
    // Sort: bill categories first (by sort_order), then variable category always last
    return categories.sort((a, b) => {
      // Variable type always last
      if (a.type === 'variable' && b.type !== 'variable') return 1;
      if (b.type === 'variable' && a.type !== 'variable') return -1;
      // Then by type (bill before income)
      if (a.type !== b.type) return a.type === 'bill' ? -1 : 1;
      // Then by sort_order
      return a.sort_order - b.sort_order;
    });
  }
  
  public async getByType(type: CategoryType): Promise<Category[]> {
    const all = await this.getAll();
    return all.filter(cat => cat.type === type).sort((a, b) => a.sort_order - b.sort_order);
  }
  
  public async getById(id: string): Promise<Category | null> {
    try {
      const categories = await this.getAll();
      return categories.find(category => category.id === id) || null;
    } catch (error) {
      console.error('[CategoriesService] Failed to get category:', error);
      return null;
    }
  }
  
  public async create(data: Omit<Category, 'created_at' | 'updated_at' | 'id'>): Promise<Category> {
    try {
      const validation = this.validation.validateCategory(data);
      if (!validation.isValid) {
        throw new Error('Validation failed: ' + validation.errors.join(', '));
      }
      
      const categories = await this.getAll();
      
      // Calculate next sort_order for this type
      const sameType = categories.filter(c => c.type === data.type);
      const maxSortOrder = sameType.length > 0 
        ? Math.max(...sameType.map(c => c.sort_order))
        : -1;
      
      const now = new Date().toISOString();
      const newCategory: Category = {
        ...data,
        id: crypto.randomUUID(),
        sort_order: data.sort_order ?? maxSortOrder + 1,
        created_at: now,
        updated_at: now,
        is_predefined: false
      };
      
      categories.push(newCategory);
      await this.storage.writeJSON('data/entities/categories.json', categories);
      return newCategory;
    } catch (error) {
      console.error('[CategoriesService] Failed to create category:', error);
      throw error;
    }
  }
  
  public async update(id: string, updates: Partial<Omit<Category, 'created_at' | 'updated_at' | 'id'>>): Promise<Category | null> {
    try {
      // Prevent modification of Variable Expenses category
      if (id === VARIABLE_EXPENSES_CATEGORY_ID) {
        throw new Error('Cannot modify the Variable Expenses category');
      }
      
      const categories = await this.getAll();
      const index = categories.findIndex(category => category.id === id);
      
      if (index === -1) {
        console.warn(`[CategoriesService] Category ${id} not found`);
        return null;
      }
      
      // Also check by type (in case ID doesn't match but it's a variable category)
      if (categories[index].type === 'variable') {
        throw new Error('Cannot modify the Variable Expenses category');
      }
      
      const now = new Date().toISOString();
      const updatedCategory: Category = {
        ...categories[index],
        ...updates,
        updated_at: now
      };
      
      categories[index] = updatedCategory;
      await this.storage.writeJSON('data/entities/categories.json', categories);
      return updatedCategory;
    } catch (error) {
      console.error('[CategoriesService] Failed to update category:', error);
      throw error;
    }
  }
  
  public async delete(id: string): Promise<void> {
    try {
      // Prevent deletion of Variable Expenses category
      if (id === VARIABLE_EXPENSES_CATEGORY_ID) {
        throw new Error('Cannot delete the Variable Expenses category');
      }
      
      const categories = await this.getAll();
      const category = categories.find(c => c.id === id);
      
      // Also check by type (in case ID doesn't match but it's a variable category)
      if (category?.type === 'variable') {
        throw new Error('Cannot delete the Variable Expenses category');
      }
      
      if (category?.is_predefined) {
        throw new Error('Cannot delete predefined category');
      }
      
      const filtered = categories.filter(category => category.id !== id);
      await this.storage.writeJSON('data/entities/categories.json', filtered);
    } catch (error) {
      console.error('[CategoriesService] Failed to delete category:', error);
      throw error;
    }
  }
  
  /**
   * Reorder categories of a specific type
   * @param type - 'bill' or 'income'
   * @param orderedIds - Array of category IDs in new order
   * @returns Updated categories of the specified type
   */
  public async reorder(type: CategoryType, orderedIds: string[]): Promise<Category[]> {
    try {
      const categories = await this.getAll();
      const now = new Date().toISOString();
      
      // Update sort_order for each category in the order array
      orderedIds.forEach((id, index) => {
        const catIndex = categories.findIndex(c => c.id === id && c.type === type);
        if (catIndex !== -1) {
          categories[catIndex] = {
            ...categories[catIndex],
            sort_order: index,
            updated_at: now
          };
        }
      });
      
      await this.storage.writeJSON('data/entities/categories.json', categories);
      
      // Return only the reordered type
      return categories
        .filter(c => c.type === type)
        .sort((a, b) => a.sort_order - b.sort_order);
    } catch (error) {
      console.error('[CategoriesService] Failed to reorder categories:', error);
      throw error;
    }
  }
  
  /**
   * Ensure the "Credit Card Payoffs" category exists.
   * Creates it if not found. This is a system category with sort_order -1 (appears first).
   * @returns The payoff category
   */
  public async ensurePayoffCategory(): Promise<Category> {
    const PAYOFF_CATEGORY_NAME = 'Credit Card Payoffs';
    const PAYOFF_CATEGORY_COLOR = '#8b5cf6'; // Purple
    
    try {
      const categories = await this.getAll();
      
      // Look for existing payoff category
      let payoffCategory = categories.find(
        c => c.name === PAYOFF_CATEGORY_NAME && c.type === 'bill'
      );
      
      if (payoffCategory) {
        return payoffCategory;
      }
      
      // Create the category with sort_order -1 to appear first
      const now = new Date().toISOString();
      const newCategory: Category = {
        id: crypto.randomUUID(),
        name: PAYOFF_CATEGORY_NAME,
        type: 'bill',
        color: PAYOFF_CATEGORY_COLOR,
        sort_order: -1, // Appears before all other categories
        is_predefined: true, // Cannot be deleted
        created_at: now,
        updated_at: now
      };
      
      categories.push(newCategory);
      await this.storage.writeJSON('data/entities/categories.json', categories);
      
      console.log('[CategoriesService] Created Credit Card Payoffs category');
      return newCategory;
    } catch (error) {
      console.error('[CategoriesService] Failed to ensure payoff category:', error);
      throw error;
    }
  }
  
  /**
   * Ensure the "Variable Expenses" category exists.
   * Creates it if not found. This is a system category that cannot be deleted.
   * Uses a static GUID and sort_order: 9999 (appears last).
   * @returns The variable expenses category
   */
  public async ensureVariableExpensesCategory(): Promise<Category> {
    try {
      const rawCategories = await this.storage.readJSON<any[]>('data/entities/categories.json') || [];
      
      // Look for existing variable category by ID or type
      let variableCategory = rawCategories.find(
        c => c.id === VARIABLE_EXPENSES_CATEGORY_ID || c.type === 'variable'
      );
      
      if (variableCategory) {
        return variableCategory as Category;
      }
      
      // Create the category with sort_order 9999 to appear last
      const now = new Date().toISOString();
      const newCategory: Category = {
        id: VARIABLE_EXPENSES_CATEGORY_ID,
        name: VARIABLE_EXPENSES_CATEGORY_NAME,
        type: 'variable',
        color: VARIABLE_EXPENSES_CATEGORY_COLOR,
        sort_order: 9999, // Appears after all other categories
        is_predefined: true, // Cannot be deleted
        created_at: now,
        updated_at: now
      };
      
      rawCategories.push(newCategory);
      await this.storage.writeJSON('data/entities/categories.json', rawCategories);
      
      console.log('[CategoriesService] Created Variable Expenses category');
      return newCategory;
    } catch (error) {
      console.error('[CategoriesService] Failed to ensure variable expenses category:', error);
      throw error;
    }
  }
  
  public validate(data: Partial<Category>): ValidationResult {
    return this.validation.validateCategory(data);
  }
}
