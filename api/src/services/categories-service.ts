// Categories Service - CRUD operations with storage integration

import { StorageService } from './storage';
import { ValidationService } from './validation';
import type { 
  Category, 
  ValidationResult 
} from '../types';

export interface CategoriesService {
  getAll(): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  create(data: Omit<Category, 'created_at' | 'updated_at' | 'id'>): Promise<Category>;
  update(id: string, updates: Partial<Omit<Category, 'created_at' | 'updated_at' | 'id'>>): Promise<Category | null>;
  delete(id: string): Promise<void>;
  
  validate(data: Partial<Category>): ValidationResult;
}

export class CategoriesServiceImpl implements CategoriesService {
  private storage: StorageService;
  private validation: ValidationService;
  
  constructor() {
    this.storage = StorageService.getInstance();
    this.validation = ValidationService.getInstance();
  }
  
  public async getAll(): Promise<Category[]> {
    try {
      const categories = await this.storage.readJSON<Category[]>('data/entities/categories.json') || [];
      return categories;
    } catch (error) {
      console.error('[CategoriesService] Failed to load categories:', error);
      return [];
    }
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
      
      const now = new Date().toISOString();
      const newCategory: Category = {
        ...data,
        id: crypto.randomUUID(),
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
      const filtered = categories.filter(category => category.id !== id);
      await this.storage.writeJSON('data/entities/categories.json', filtered);
    } catch (error) {
      console.error('[CategoriesService] Failed to delete category:', error);
      throw error;
    }
  }
  
  public validate(data: Partial<Category>): ValidationResult {
    return this.validation.validateCategory(data);
  }
}
