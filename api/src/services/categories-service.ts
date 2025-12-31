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

export interface CategoriesService {
  getAll(): Promise<Category[]>;
  getByType(type: CategoryType): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  create(data: Omit<Category, 'created_at' | 'updated_at' | 'id'>): Promise<Category>;
  update(id: string, updates: Partial<Omit<Category, 'created_at' | 'updated_at' | 'id'>>): Promise<Category | null>;
  delete(id: string): Promise<void>;
  reorder(type: CategoryType, orderedIds: string[]): Promise<Category[]>;
  
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
      
      // Sort by type then sort_order
      return categories.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'bill' ? -1 : 1;
        return a.sort_order - b.sort_order;
      });
    } catch (error) {
      console.error('[CategoriesService] Failed to load categories:', error);
      return [];
    }
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
      const categories = await this.getAll();
      const index = categories.findIndex(category => category.id === id);
      
      if (index === -1) {
        console.warn(`[CategoriesService] Category ${id} not found`);
        return null;
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
      const categories = await this.getAll();
      const category = categories.find(c => c.id === id);
      
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
  
  public validate(data: Partial<Category>): ValidationResult {
    return this.validation.validateCategory(data);
  }
}
