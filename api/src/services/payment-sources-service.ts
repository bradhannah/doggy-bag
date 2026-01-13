// Payment Sources Service - Minimal version

import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import type { PaymentSource, ValidationResult } from '../types';

export interface PaymentSourcesService {
  getAll(): Promise<PaymentSource[]>;
  getById(id: string): Promise<PaymentSource | null>;
  create(
    data: Omit<PaymentSource, 'id' | 'created_at' | 'updated_at' | 'is_active'>
  ): Promise<PaymentSource>;
  update(
    id: string,
    updates: Partial<Omit<PaymentSource, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<PaymentSource | null>;
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
      const sources =
        (await this.storage.readJSON<PaymentSource[]>('data/entities/payment-sources.json')) || [];
      // Apply migrations
      return sources.map((source) => this.migratePaymentSource(source));
    } catch (error) {
      console.error('[PaymentSourcesService] Failed to load payment sources:', error);
      return [];
    }
  }

  /**
   * Apply migrations to a payment source
   * TODO: Remove migration logic after next major version when all data is migrated
   */
  private migratePaymentSource(source: PaymentSource): PaymentSource {
    let migrated = { ...source };

    // Migration 1: Convert bank_account + is_investment=true to type=investment
    // TODO: Remove after v0.4.0 when all users have migrated
    if (migrated.type === 'bank_account' && migrated.is_investment === true) {
      migrated = {
        ...migrated,
        type: 'investment',
      };
    }

    // Migration 2: Clear interest_rate when is_variable_rate=true
    // Variable rates change frequently, so storing a specific value is meaningless
    // TODO: Remove after v0.4.0 when all users have migrated
    if (
      migrated.metadata?.is_variable_rate === true &&
      migrated.metadata?.interest_rate !== undefined
    ) {
      const { interest_rate: _, ...restMetadata } = migrated.metadata;
      migrated = {
        ...migrated,
        metadata: restMetadata,
      };
    }

    return migrated;
  }

  public async getById(id: string): Promise<PaymentSource | null> {
    try {
      const sources = await this.getAll();
      return sources.find((source) => source.id === id) || null;
    } catch (error) {
      console.error('[PaymentSourcesService] Failed to get payment source:', error);
      return null;
    }
  }

  public async create(
    data: Omit<PaymentSource, 'id' | 'created_at' | 'updated_at' | 'is_active'>
  ): Promise<PaymentSource> {
    try {
      const sources = await this.getAll();

      const now = new Date().toISOString();

      // Auto-set is_investment when type is 'investment'
      const isInvestmentType = data.type === 'investment';

      // Auto-set exclude_from_leftover for savings/investment accounts
      const shouldExcludeFromLeftover =
        data.exclude_from_leftover === true ||
        data.is_savings === true ||
        data.is_investment === true ||
        isInvestmentType;

      const newSource: PaymentSource = {
        ...data,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
        is_active: true,
        // Auto-set is_investment for investment type (for backwards compatibility)
        // TODO: Remove is_investment auto-set after v0.4.0
        is_investment: isInvestmentType ? true : data.is_investment,
        exclude_from_leftover: shouldExcludeFromLeftover || undefined,
      };

      sources.push(newSource);
      await this.storage.writeJSON('data/entities/payment-sources.json', sources);
      return newSource;
    } catch (error) {
      console.error('[PaymentSourcesService] Failed to create payment source:', error);
      throw error;
    }
  }

  public async update(
    id: string,
    updates: Partial<Omit<PaymentSource, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<PaymentSource | null> {
    try {
      const sources = await this.getAll();
      const index = sources.findIndex((source) => source.id === id);

      if (index === -1) {
        console.warn(`[PaymentSourcesService] Payment source ${id} not found`);
        return null;
      }

      const now = new Date().toISOString();

      // Merge existing data with updates
      const merged = { ...sources[index], ...updates };

      // Auto-set is_investment when type is 'investment'
      const isInvestmentType = merged.type === 'investment';

      // Auto-set exclude_from_leftover for savings/investment accounts
      const shouldExcludeFromLeftover =
        merged.exclude_from_leftover === true ||
        merged.is_savings === true ||
        merged.is_investment === true ||
        isInvestmentType;

      // Clear interest_rate when is_variable_rate is true
      let metadata = merged.metadata;
      if (metadata?.is_variable_rate === true && metadata?.interest_rate !== undefined) {
        const { interest_rate: _, ...restMetadata } = metadata;
        metadata = restMetadata;
      }

      const updatedSource: PaymentSource = {
        ...merged,
        updated_at: now,
        // Auto-set is_investment for investment type (for backwards compatibility)
        // TODO: Remove is_investment auto-set after v0.4.0
        is_investment: isInvestmentType ? true : merged.is_investment,
        exclude_from_leftover: shouldExcludeFromLeftover || undefined,
        metadata,
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
      const filtered = sources.filter((source) => source.id !== id);
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

    if (
      !data.type ||
      !['bank_account', 'credit_card', 'line_of_credit', 'cash', 'investment'].includes(data.type)
    ) {
      errors.push(
        'Payment source type must be bank_account, credit_card, line_of_credit, cash, or investment'
      );
    }

    // pay_off_monthly is only valid for debt accounts (credit_card, line_of_credit)
    if (data.pay_off_monthly === true) {
      const debtTypes = ['credit_card', 'line_of_credit'];
      if (data.type && !debtTypes.includes(data.type)) {
        errors.push('pay_off_monthly can only be enabled for credit cards and lines of credit');
      }
    }

    // exclude_from_leftover is only valid for debt accounts (unless savings/investment)
    if (data.exclude_from_leftover === true) {
      const debtTypes = ['credit_card', 'line_of_credit'];
      const isSavingsOrInvestment =
        data.is_savings === true || data.is_investment === true || data.type === 'investment';
      if (data.type && !debtTypes.includes(data.type) && !isSavingsOrInvestment) {
        errors.push(
          'exclude_from_leftover can only be enabled for credit cards, lines of credit, or savings/investment accounts'
        );
      }
    }

    // is_savings and is_investment are mutually exclusive
    if (data.is_savings === true && data.is_investment === true) {
      errors.push('An account cannot be both a savings account and an investment account');
    }

    // is_savings/is_investment are mutually exclusive with pay_off_monthly
    if (
      (data.is_savings === true || data.is_investment === true) &&
      data.pay_off_monthly === true
    ) {
      errors.push('Savings and investment accounts cannot have pay_off_monthly enabled');
    }

    // is_savings is only valid for bank_account type
    if (data.is_savings === true && data.type && data.type !== 'bank_account') {
      errors.push('is_savings can only be enabled for bank accounts');
    }

    // is_investment is only valid for bank_account type (investment type auto-sets this)
    // TODO: Remove is_investment boolean validation after v0.4.0 - use type='investment' instead
    if (
      data.is_investment === true &&
      data.type &&
      !['bank_account', 'investment'].includes(data.type)
    ) {
      errors.push('is_investment can only be enabled for bank accounts or investment type');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
