// Insurance Plans Service - CRUD operations for insurance plans

import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import type { InsurancePlan, ValidationResult } from '../types';

const STORAGE_PATH = 'data/entities/insurance-plans.json';

export interface InsurancePlansService {
  getAll(): Promise<InsurancePlan[]>;
  getById(id: string): Promise<InsurancePlan | null>;
  getActive(): Promise<InsurancePlan[]>;
  create(
    data: Omit<InsurancePlan, 'id' | 'created_at' | 'updated_at' | 'is_active'>
  ): Promise<InsurancePlan>;
  update(
    id: string,
    updates: Partial<Omit<InsurancePlan, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<InsurancePlan | null>;
  delete(id: string): Promise<void>;
  validate(data: Partial<InsurancePlan>): ValidationResult;
}

export class InsurancePlansServiceImpl implements InsurancePlansService {
  private storage: StorageService;

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
  }

  public async getAll(): Promise<InsurancePlan[]> {
    try {
      const plans = (await this.storage.readJSON<InsurancePlan[]>(STORAGE_PATH)) || [];
      // Sort by name alphabetically
      return plans.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('[InsurancePlansService] Failed to load plans:', error);
      return [];
    }
  }

  public async getById(id: string): Promise<InsurancePlan | null> {
    try {
      const plans = await this.getAll();
      return plans.find((plan) => plan.id === id) || null;
    } catch (error) {
      console.error('[InsurancePlansService] Failed to get plan:', error);
      return null;
    }
  }

  public async getActive(): Promise<InsurancePlan[]> {
    const plans = await this.getAll();
    return plans.filter((plan) => plan.is_active);
  }

  public async create(
    data: Omit<InsurancePlan, 'id' | 'created_at' | 'updated_at' | 'is_active'>
  ): Promise<InsurancePlan> {
    try {
      const validation = this.validate(data);
      if (!validation.isValid) {
        throw new Error('Validation failed: ' + validation.errors.join(', '));
      }

      const plans = await this.getAll();

      const now = new Date().toISOString();
      const newPlan: InsurancePlan = {
        ...data,
        id: crypto.randomUUID(),
        is_active: true,
        created_at: now,
        updated_at: now,
      };

      plans.push(newPlan);
      await this.storage.writeJSON(STORAGE_PATH, plans);

      console.log('[InsurancePlansService] Created plan:', newPlan.name);
      return newPlan;
    } catch (error) {
      console.error('[InsurancePlansService] Failed to create plan:', error);
      throw error;
    }
  }

  public async update(
    id: string,
    updates: Partial<Omit<InsurancePlan, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<InsurancePlan | null> {
    try {
      const plans = await this.getAll();
      const index = plans.findIndex((plan) => plan.id === id);

      if (index === -1) {
        console.warn(`[InsurancePlansService] Plan ${id} not found`);
        return null;
      }

      const now = new Date().toISOString();
      const updatedPlan: InsurancePlan = {
        ...plans[index],
        ...updates,
        updated_at: now,
      };

      // Validate the merged data
      const validation = this.validate(updatedPlan);
      if (!validation.isValid) {
        throw new Error('Validation failed: ' + validation.errors.join(', '));
      }

      plans[index] = updatedPlan;
      await this.storage.writeJSON(STORAGE_PATH, plans);

      console.log('[InsurancePlansService] Updated plan:', updatedPlan.name);
      return updatedPlan;
    } catch (error) {
      console.error('[InsurancePlansService] Failed to update plan:', error);
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const plans = await this.getAll();
      const plan = plans.find((p) => p.id === id);

      if (!plan) {
        throw new Error('Plan not found');
      }

      // Note: Handler should check for existing claims before allowing delete
      const filtered = plans.filter((p) => p.id !== id);
      await this.storage.writeJSON(STORAGE_PATH, filtered);

      console.log('[InsurancePlansService] Deleted plan:', plan.name);
    } catch (error) {
      console.error('[InsurancePlansService] Failed to delete plan:', error);
      throw error;
    }
  }

  public validate(data: Partial<InsurancePlan>): ValidationResult {
    const errors: string[] = [];

    // Name is required and must be non-empty
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Name is required and must be non-empty');
    }

    // Validate portal_url if provided
    if (data.portal_url !== undefined && data.portal_url !== null && data.portal_url !== '') {
      try {
        new URL(data.portal_url);
      } catch {
        errors.push('Portal URL must be a valid URL');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
