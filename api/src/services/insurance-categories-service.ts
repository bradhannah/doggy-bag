// Insurance Categories Service - CRUD operations with predefined category seeding

import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import type { InsuranceCategory, ValidationResult } from '../types';

const STORAGE_PATH = 'data/entities/insurance-categories.json';

// Predefined insurance categories - seeded on first load
const PREDEFINED_CATEGORIES: Omit<InsuranceCategory, 'id' | 'created_at' | 'updated_at'>[] = [
  { name: 'Dental', icon: '🦷', sort_order: 1, is_predefined: true, is_active: true },
  { name: 'Vision / Eye Care', icon: '👁️', sort_order: 2, is_predefined: true, is_active: true },
  { name: 'Massage Therapy', icon: '💆', sort_order: 3, is_predefined: true, is_active: true },
  { name: 'Physiotherapy', icon: '🏃', sort_order: 4, is_predefined: true, is_active: true },
  { name: 'Chiropractic', icon: '🦴', sort_order: 5, is_predefined: true, is_active: true },
  { name: 'Orthodontics', icon: '🦷', sort_order: 6, is_predefined: true, is_active: true },
  { name: 'Mental Health', icon: '🧠', sort_order: 7, is_predefined: true, is_active: true },
  { name: 'Prescription Drugs', icon: '💊', sort_order: 8, is_predefined: true, is_active: true },
  { name: 'Medical Equipment', icon: '🩼', sort_order: 9, is_predefined: true, is_active: true },
  {
    name: 'Hospital / Emergency',
    icon: '🏥',
    sort_order: 10,
    is_predefined: true,
    is_active: true,
  },
  { name: 'Other', icon: '📋', sort_order: 99, is_predefined: true, is_active: true },
];

export interface InsuranceCategoriesService {
  getAll(): Promise<InsuranceCategory[]>;
  getById(id: string): Promise<InsuranceCategory | null>;
  getActive(): Promise<InsuranceCategory[]>;
  create(
    data: Omit<InsuranceCategory, 'id' | 'created_at' | 'updated_at' | 'is_predefined'>
  ): Promise<InsuranceCategory>;
  update(
    id: string,
    updates: Partial<Omit<InsuranceCategory, 'id' | 'created_at' | 'updated_at' | 'is_predefined'>>
  ): Promise<InsuranceCategory | null>;
  delete(id: string): Promise<void>;
  validate(data: Partial<InsuranceCategory>): ValidationResult;
  seedPredefinedCategories(): Promise<void>;
}

export class InsuranceCategoriesServiceImpl implements InsuranceCategoriesService {
  private storage: StorageService;
  private seeded = false;

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
  }

  /**
   * Seed predefined categories if they don't exist
   */
  public async seedPredefinedCategories(): Promise<void> {
    if (this.seeded) return;

    try {
      const categories = (await this.storage.readJSON<InsuranceCategory[]>(STORAGE_PATH)) || [];

      // If we have any categories, check if we need to seed missing predefined ones
      const existingNames = new Set(categories.map((c) => c.name));
      const now = new Date().toISOString();
      let needsSave = false;

      for (const predefined of PREDEFINED_CATEGORIES) {
        if (!existingNames.has(predefined.name)) {
          const newCategory: InsuranceCategory = {
            ...predefined,
            id: crypto.randomUUID(),
            created_at: now,
            updated_at: now,
          };
          categories.push(newCategory);
          needsSave = true;
          console.log(`[InsuranceCategoriesService] Seeded category: ${predefined.name}`);
        }
      }

      if (needsSave) {
        await this.storage.writeJSON(STORAGE_PATH, categories);
      }

      this.seeded = true;
    } catch (error) {
      console.error('[InsuranceCategoriesService] Failed to seed categories:', error);
    }
  }

  public async getAll(): Promise<InsuranceCategory[]> {
    try {
      // Ensure predefined categories exist
      await this.seedPredefinedCategories();

      const categories = (await this.storage.readJSON<InsuranceCategory[]>(STORAGE_PATH)) || [];
      // Sort by sort_order
      return categories.sort((a, b) => a.sort_order - b.sort_order);
    } catch (error) {
      console.error('[InsuranceCategoriesService] Failed to load categories:', error);
      return [];
    }
  }

  public async getById(id: string): Promise<InsuranceCategory | null> {
    try {
      const categories = await this.getAll();
      return categories.find((cat) => cat.id === id) || null;
    } catch (error) {
      console.error('[InsuranceCategoriesService] Failed to get category:', error);
      return null;
    }
  }

  public async getActive(): Promise<InsuranceCategory[]> {
    const categories = await this.getAll();
    return categories.filter((cat) => cat.is_active);
  }

  public async create(
    data: Omit<InsuranceCategory, 'id' | 'created_at' | 'updated_at' | 'is_predefined'>
  ): Promise<InsuranceCategory> {
    try {
      const validation = this.validate(data);
      if (!validation.isValid) {
        throw new Error('Validation failed: ' + validation.errors.join(', '));
      }

      const categories = await this.getAll();

      // Calculate next sort_order if not provided
      const maxSortOrder =
        categories.length > 0
          ? Math.max(...categories.filter((c) => c.sort_order < 99).map((c) => c.sort_order))
          : 0;

      const now = new Date().toISOString();
      const newCategory: InsuranceCategory = {
        ...data,
        id: crypto.randomUUID(),
        sort_order: data.sort_order ?? maxSortOrder + 1,
        is_predefined: false, // User-created categories are never predefined
        created_at: now,
        updated_at: now,
      };

      categories.push(newCategory);
      await this.storage.writeJSON(STORAGE_PATH, categories);

      console.log('[InsuranceCategoriesService] Created category:', newCategory.name);
      return newCategory;
    } catch (error) {
      console.error('[InsuranceCategoriesService] Failed to create category:', error);
      throw error;
    }
  }

  public async update(
    id: string,
    updates: Partial<Omit<InsuranceCategory, 'id' | 'created_at' | 'updated_at' | 'is_predefined'>>
  ): Promise<InsuranceCategory | null> {
    try {
      const categories = await this.getAll();
      const index = categories.findIndex((cat) => cat.id === id);

      if (index === -1) {
        console.warn(`[InsuranceCategoriesService] Category ${id} not found`);
        return null;
      }

      const existingCategory = categories[index];

      // Protect predefined category names
      if (
        existingCategory.is_predefined &&
        updates.name &&
        updates.name !== existingCategory.name
      ) {
        throw new Error('Cannot modify the name of a predefined category');
      }

      const now = new Date().toISOString();
      const updatedCategory: InsuranceCategory = {
        ...existingCategory,
        ...updates,
        is_predefined: existingCategory.is_predefined, // Preserve predefined status
        updated_at: now,
      };

      // Validate the merged data
      const validation = this.validate(updatedCategory);
      if (!validation.isValid) {
        throw new Error('Validation failed: ' + validation.errors.join(', '));
      }

      categories[index] = updatedCategory;
      await this.storage.writeJSON(STORAGE_PATH, categories);

      console.log('[InsuranceCategoriesService] Updated category:', updatedCategory.name);
      return updatedCategory;
    } catch (error) {
      console.error('[InsuranceCategoriesService] Failed to update category:', error);
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const categories = await this.getAll();
      const category = categories.find((c) => c.id === id);

      if (!category) {
        throw new Error('Category not found');
      }

      // Prevent deletion of predefined categories
      if (category.is_predefined) {
        throw new Error('Cannot delete a predefined category');
      }

      // Note: Handler should check for existing claims before allowing delete
      const filtered = categories.filter((c) => c.id !== id);
      await this.storage.writeJSON(STORAGE_PATH, filtered);

      console.log('[InsuranceCategoriesService] Deleted category:', category.name);
    } catch (error) {
      console.error('[InsuranceCategoriesService] Failed to delete category:', error);
      throw error;
    }
  }

  public validate(data: Partial<InsuranceCategory>): ValidationResult {
    const errors: string[] = [];

    // Name is required and must be non-empty
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Name is required and must be non-empty');
    }

    // Icon is required and must be non-empty
    if (!data.icon || typeof data.icon !== 'string' || data.icon.trim().length === 0) {
      errors.push('Icon is required and must be non-empty');
    }

    // sort_order must be a non-negative number if provided
    if (data.sort_order !== undefined) {
      if (typeof data.sort_order !== 'number' || data.sort_order < 0) {
        errors.push('Sort order must be a non-negative number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
