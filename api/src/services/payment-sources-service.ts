// Payment Sources Service - Minimal version

import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import type { 
  PaymentSource, 
  ValidationResult 
} from '../types';

export interface PaymentSourcesService {
  getAll(): Promise<PaymentSource[]>;
  getById(id: string): Promise<PaymentSource | null>;
  create(data: Omit<PaymentSource, 'id' | 'created_at' | 'updated_at' | 'is_active'>): Promise<PaymentSource>;
  update(id: string, updates: Partial<Omit<PaymentSource, 'id' | 'created_at' | 'updated_at'>>): Promise<PaymentSource | null>;
  delete(id: string): Promise<void>;
  
  validate(data: Partial<PaymentSource>): ValidationResult;
}

export class PaymentSourcesServiceImpl implements PaymentSourcesService {
  private storage: StorageService;
  
  constructor() {
    this.storage = StorageServiceImpl.getInstance();
  }
  
  public async getAll(): Promise<PaymentSource[]> {
    try {
      const sources = await this.storage.readJSON<PaymentSource[]>('data/entities/payment-sources.json') || [];
      return sources;
    } catch (error) {
      console.error('[PaymentSourcesService] Failed to load payment sources:', error);
      return [];
    }
  }
  
  public async getById(id: string): Promise<PaymentSource | null> {
    try {
      const sources = await this.getAll();
      return sources.find(source => source.id === id) || null;
    } catch (error) {
      console.error('[PaymentSourcesService] Failed to get payment source:', error);
      return null;
    }
  }
  
  public async create(data: Omit<PaymentSource, 'id' | 'created_at' | 'updated_at' | 'is_active'>): Promise<PaymentSource> {
    try {
      const sources = await this.getAll();
      
      const now = new Date().toISOString();
      const newSource: PaymentSource = {
        ...data,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
        is_active: true
      };
      
      sources.push(newSource);
      await this.storage.writeJSON('data/entities/payment-sources.json', sources);
      return newSource;
    } catch (error) {
      console.error('[PaymentSourcesService] Failed to create payment source:', error);
      throw error;
    }
  }
  
  public async update(id: string, updates: Partial<Omit<PaymentSource, 'id' | 'created_at' | 'updated_at'>>): Promise<PaymentSource | null> {
    try {
      const sources = await this.getAll();
      const index = sources.findIndex(source => source.id === id);
      
      if (index === -1) {
        console.warn(`[PaymentSourcesService] Payment source ${id} not found`);
        return null;
      }
      
      const now = new Date().toISOString();
      const updatedSource: PaymentSource = {
        ...sources[index],
        ...updates,
        updated_at: now
      };
      
      sources[index] = updatedSource;
      await this.storage.writeJSON('data/entities/payment-sources.json', sources);
      return updatedSource;
    } catch (error) {
      console.error('[PaymentSourcesService] Failed to update payment source:', error);
      throw error;
    }
  }
  
  public async delete(id: string): Promise<void> {
    try {
      const sources = await this.getAll();
      const filtered = sources.filter(source => source.id !== id);
      await this.storage.writeJSON('data/entities/payment-sources.json', filtered);
    } catch (error) {
      console.error('[PaymentSourcesService] Failed to delete payment source:', error);
      throw error;
    }
  }
  
  public validate(data: Partial<PaymentSource>): ValidationResult {
    const errors: string[] = [];
    
    if (!data.name?.trim()) {
      errors.push('Name cannot be blank or whitespace only');
    }
    
    if (data.name && data.name.length > 100) {
      errors.push('Name cannot exceed 100 characters');
    }
    
    if (!data.type || !['bank_account', 'credit_card', 'cash'].includes(data.type)) {
      errors.push('Payment source type must be bank_account, credit_card, or cash');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
