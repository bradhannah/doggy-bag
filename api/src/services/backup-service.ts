// Backup Service - Full backup and restore functionality

import { StorageService } from './storage';
import type { 
  BackupFileData,
  Bill,
  Income,
  PaymentSource,
  Category,
  ValidationResult 
} from '../types';

export interface BackupService {
  exportBackup(): Promise<BackupFileData>;
  importBackup(data: BackupFileData): Promise<void>;
  validateBackup(data: BackupFileData): ValidationResult;
}

export class BackupServiceImpl implements BackupService {
  private static instance: BackupServiceImpl | null = null;
  private storage: StorageService;
  
  public static getInstance(): BackupService {
    if (!BackupServiceImpl.instance) {
      BackupServiceImpl.instance = new BackupServiceImpl();
    }
    return BackupServiceImpl.instance;
  }
  
  constructor() {
    this.storage = StorageService.getInstance();
  }

  public async exportBackup(): Promise<BackupFileData> {
    console.log('[BackupService] Exporting backup...');
    
    try {
      const [bills, incomes, paymentSources, categories] = await Promise.all([
        this.storage.readJSON<Bill[]>('data/entities/bills.json') || [],
        this.storage.readJSON<Income[]>('data/entities/incomes.json') || [],
        this.storage.readJSON<PaymentSource[]>('data/entities/payment-sources.json') || [],
        this.storage.readJSON<Category[]>('data/entities/categories.json') || []
      ]);
      
      const now = new Date().toISOString();
      const backupData: BackupFileData = {
        export_date: now,
        bills: bills || [],
        incomes: incomes || [],
        payment_sources: paymentSources || [],
        categories: categories || []
      };
      
      await this.storage.writeJSON('data/budgetforfun-backup.json', backupData);
      
      console.log('[BackupService] Export completed');
      return backupData;
    } catch (error) {
      console.error('[BackupService] Export failed:', error);
      throw error;
    }
  }
  
  public async importBackup(data: BackupFileData): Promise<void> {
    console.log('[BackupService] Importing backup...');
    
    try {
      const validation = this.validateBackup(data);
      if (!validation.isValid) {
        throw new Error('Invalid backup data: ' + validation.errors.join(', '));
      }
      
      const existing = await this.storage.readJSON<BackupFileData>('data/budgetforfun-backup.json');
      
      if (existing) {
        const now = new Date().toISOString();
        const updatedBackupData = {
          export_date: now,
          ...existing,
          ...data
        };
        await this.storage.writeJSON('data/budgetforfun-backup.json', updatedBackupData);
        console.log('[BackupService] Backup imported and merged');
      } else {
        const now = new Date().toISOString();
        const newBackupData: BackupFileData = {
          export_date: now,
          bills: [],
          incomes: [],
          payment_sources: [],
          categories: []
        };
        await this.storage.writeJSON('data/budgetforfun-backup.json', newBackupData);
        console.log('[BackupService] New backup created');
      }
      
      console.log('[BackupService] Import completed');
    } catch (error) {
      console.error('[BackupService] Import failed:', error);
      throw error;
    }
  }
  
  public validateBackup(data: BackupFileData): ValidationResult {
    const errors: string[] = [];
    
    if (!data.export_date) {
      errors.push('export_date is required');
    }
    
    if (!data.bills || !Array.isArray(data.bills)) {
      errors.push('bills must be an array');
    }
    
    if (!data.incomes || !Array.isArray(data.incomes)) {
      errors.push('incomes must be an array');
    }
    
    if (!data.payment_sources || !Array.isArray(data.payment_sources)) {
      errors.push('payment_sources must be an array');
    }
    
    if (!data.categories || !Array.isArray(data.categories)) {
      errors.push('categories must be an array');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
