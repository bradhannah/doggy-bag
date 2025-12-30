// Bills Service - CRUD operations with storage integration

import { StorageService } from './storage';
import { ValidationService } from './validation';
import type { 
  Bill, 
  ValidationResult 
} from '../types';

export interface BillsService {
  getAll(): Promise<Bill[]>;
  getById(id: string): Promise<Bill | null>;
  create(data: Omit<Bill, 'created_at' | 'updated_at' | 'id'>): Promise<Bill>;
  update(id: string, updates: Partial<Omit<Bill, 'created_at' | 'updated_at' | 'id'>>): Promise<Bill | null>;
  delete(id: string): Promise<void>;
  
  validate(data: Partial<Bill>): ValidationResult;
}

export class BillsServiceImpl implements BillsService {
  private storage: StorageService;
  private validation: ValidationService;
  
  constructor() {
    this.storage = StorageService.getInstance();
    this.validation = ValidationService.getInstance();
  }
  
  public async getAll(): Promise<Bill[]> {
    try {
      const bills = await this.storage.readJSON<Bill[]>('data/entities/bills.json') || [];
      return bills;
    } catch (error) {
      console.error('[BillsService] Failed to load bills:', error);
      return [];
    }
  }
  
  public async getById(id: string): Promise<Bill | null> {
    try {
      const bills = await this.getAll();
      return bills.find(bill => bill.id === id) || null;
    } catch (error) {
      console.error('[BillsService] Failed to get bill:', error);
      return null;
    }
  }
  
  public async create(data: Omit<Bill, 'created_at' | 'updated_at' | 'id'>): Promise<Bill> {
    try {
      const validation = this.validation.validateBill(data);
      if (!validation.isValid) {
        throw new Error('Validation failed: ' + validation.errors.join(', '));
      }
      
      const bills = await this.getAll();
      
      const now = new Date().toISOString();
      const newBill: Bill = {
        ...data,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
        is_active: true
      };
      
      bills.push(newBill);
      await this.storage.writeJSON('data/entities/bills.json', bills);
      return newBill;
    } catch (error) {
      console.error('[BillsService] Failed to create bill:', error);
      throw error;
    }
  }
  
  public async update(id: string, updates: Partial<Omit<Bill, 'created_at' | 'updated_at' | 'id'>>): Promise<Bill | null> {
    try {
      const bills = await this.getAll();
      const index = bills.findIndex(bill => bill.id === id);
      
      if (index === -1) {
        console.warn(`[BillsService] Bill ${id} not found`);
        return null;
      }
      
      const now = new Date().toISOString();
      const updatedBill: Bill = {
        ...bills[index],
        ...updates,
        updated_at: now
      };
      
      bills[index] = updatedBill;
      await this.storage.writeJSON('data/entities/bills.json', bills);
      return updatedBill;
    } catch (error) {
      console.error('[BillsService] Failed to update bill:', error);
      throw error;
    }
  }
  
  public async delete(id: string): Promise<void> {
    try {
      const bills = await this.getAll();
      const filtered = bills.filter(bill => bill.id !== id);
      await this.storage.writeJSON('data/entities/bills.json', filtered);
    } catch (error) {
      console.error('[BillsService] Failed to delete bill:', error);
      throw error;
    }
  }
  
  public validate(data: Partial<Bill>): ValidationResult {
    return this.validation.validateBill(data);
  }
}
