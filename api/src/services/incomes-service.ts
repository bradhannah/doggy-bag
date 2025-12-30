// Incomes Service - CRUD operations with storage integration

import { StorageService } from './storage';
import { ValidationService } from './validation';
import type { 
  Income, 
  ValidationResult 
} from '../types';

export interface IncomesService {
  getAll(): Promise<Income[]>;
  getById(id: string): Promise<Income | null>;
  create(data: Omit<Income, 'created_at' | 'updated_at' | 'id'>): Promise<Income>;
  update(id: string, updates: Partial<Omit<Income, 'created_at' | 'updated_at' | 'id'>>): Promise<Income | null>;
  delete(id: string): Promise<void>;
  
  validate(data: Partial<Income>): ValidationResult;
}

export class IncomesServiceImpl implements IncomesService {
  private storage: StorageService;
  private validation: ValidationService;
  
  constructor() {
    this.storage = StorageService.getInstance();
    this.validation = ValidationService.getInstance();
  }
  
  public async getAll(): Promise<Income[]> {
    try {
      const incomes = await this.storage.readJSON<Income[]>('data/entities/incomes.json') || [];
      return incomes;
    } catch (error) {
      console.error('[IncomesService] Failed to load incomes:', error);
      return [];
    }
  }
  
  public async getById(id: string): Promise<Income | null> {
    try {
      const incomes = await this.getAll();
      return incomes.find(income => income.id === id) || null;
    } catch (error) {
      console.error('[IncomesService] Failed to get income:', error);
      return null;
    }
  }
  
  public async create(data: Omit<Income, 'created_at' | 'updated_at' | 'id'>): Promise<Income> {
    try {
      const validation = this.validation.validateIncome(data);
      if (!validation.isValid) {
        throw new Error('Validation failed: ' + validation.errors.join(', '));
      }
      
      const incomes = await this.getAll();
      
      const now = new Date().toISOString();
      const newIncome: Income = {
        ...data,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
        is_active: true
      };
      
      incomes.push(newIncome);
      await this.storage.writeJSON('data/entities/incomes.json', incomes);
      return newIncome;
    } catch (error) {
      console.error('[IncomesService] Failed to create income:', error);
      throw error;
    }
  }
  
  public async update(id: string, updates: Partial<Omit<Income, 'created_at' | 'updated_at' | 'id'>>): Promise<Income | null> {
    try {
      const incomes = await this.getAll();
      const index = incomes.findIndex(income => income.id === id);
      
      if (index === -1) {
        console.warn(`[IncomesService] Income ${id} not found`);
        return null;
      }
      
      const now = new Date().toISOString();
      const updatedIncome: Income = {
        ...incomes[index],
        ...updates,
        updated_at: now
      };
      
      incomes[index] = updatedIncome;
      await this.storage.writeJSON('data/entities/incomes.json', incomes);
      return updatedIncome;
    } catch (error) {
      console.error('[IncomesService] Failed to update income:', error);
      throw error;
    }
  }
  
  public async delete(id: string): Promise<void> {
    try {
      const incomes = await this.getAll();
      const filtered = incomes.filter(income => income.id !== id);
      await this.storage.writeJSON('data/entities/incomes.json', filtered);
    } catch (error) {
      console.error('[IncomesService] Failed to delete income:', error);
      throw error;
    }
  }
  
  public validate(data: Partial<Income>): ValidationResult {
    return this.validation.validateIncome(data);
  }
}
