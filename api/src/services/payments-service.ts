// Payments Service - Manages partial payments for bill and income instances
// Handles adding, updating, and removing payments from bill/income occurrences

import { MonthsServiceImpl } from './months-service';
import type { MonthsService } from './months-service';
import type { Payment, BillInstance, IncomeInstance } from '../types';
import { NotFoundError, ValidationError } from '../utils/errors';
import { sumOccurrencePayments, areAllOccurrencesClosed } from '../utils/occurrences';

export interface PaymentsService {
  // Bill payments (at occurrence level)
  addPayment(month: string, billInstanceId: string, amount: number, date: string, occurrenceId?: string): Promise<BillInstance>;
  updatePayment(month: string, billInstanceId: string, paymentId: string, amount: number, date: string): Promise<BillInstance>;
  removePayment(month: string, billInstanceId: string, paymentId: string): Promise<BillInstance>;
  getPayments(month: string, billInstanceId: string): Promise<Payment[]>;
  
  // Income payments (at occurrence level)
  addIncomePayment(month: string, incomeInstanceId: string, amount: number, date: string, occurrenceId?: string): Promise<IncomeInstance>;
  updateIncomePayment(month: string, incomeInstanceId: string, paymentId: string, amount: number, date: string): Promise<IncomeInstance>;
  removeIncomePayment(month: string, incomeInstanceId: string, paymentId: string): Promise<IncomeInstance>;
  getIncomePayments(month: string, incomeInstanceId: string): Promise<Payment[]>;
}

export class PaymentsServiceImpl implements PaymentsService {
  private monthsService: MonthsService;

  constructor() {
    this.monthsService = new MonthsServiceImpl();
  }

  public async addPayment(
    month: string,
    billInstanceId: string,
    amount: number,
    date: string,
    occurrenceId?: string
  ): Promise<BillInstance> {
    // Validate inputs
    if (amount <= 0) {
      throw new ValidationError('Payment amount must be positive');
    }
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ValidationError('Payment date must be in YYYY-MM-DD format');
    }

    const monthlyData = await this.monthsService.getMonthlyData(month);
    if (!monthlyData) {
      throw new NotFoundError(`Monthly data for ${month} not found`);
    }

    const billIndex = monthlyData.bill_instances.findIndex(b => b.id === billInstanceId);
    if (billIndex === -1) {
      throw new NotFoundError(`Bill instance ${billInstanceId} not found in ${month}`);
    }

    const billInstance = monthlyData.bill_instances[billIndex];
    
    // Find the target occurrence (use first if not specified)
    let targetOccurrence = occurrenceId 
      ? billInstance.occurrences.find(o => o.id === occurrenceId)
      : billInstance.occurrences[0];
    
    if (!targetOccurrence) {
      throw new NotFoundError(`Occurrence not found for bill instance ${billInstanceId}`);
    }

    // Create new payment
    const newPayment: Payment = {
      id: crypto.randomUUID(),
      amount,
      date,
      created_at: new Date().toISOString()
    };

    targetOccurrence.payments.push(newPayment);
    targetOccurrence.updated_at = new Date().toISOString();
    
    // Check if this occurrence should be marked closed
    const occTotalPaid = targetOccurrence.payments.reduce((sum, p) => sum + p.amount, 0);
    if (occTotalPaid >= targetOccurrence.expected_amount) {
      targetOccurrence.is_closed = true;
      targetOccurrence.closed_date = date;
    }
    
    // Update instance-level is_closed based on all occurrences
    billInstance.is_closed = areAllOccurrencesClosed(billInstance.occurrences);
    if (billInstance.is_closed && !billInstance.closed_date) {
      billInstance.closed_date = date;
    }
    billInstance.is_default = false;
    billInstance.updated_at = new Date().toISOString();

    // Save updated monthly data
    await this.monthsService.saveMonthlyData(month, monthlyData);

    return billInstance;
  }

  public async updatePayment(
    month: string,
    billInstanceId: string,
    paymentId: string,
    amount: number,
    date: string
  ): Promise<BillInstance> {
    // Validate inputs
    if (amount <= 0) {
      throw new ValidationError('Payment amount must be positive');
    }
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ValidationError('Payment date must be in YYYY-MM-DD format');
    }

    const monthlyData = await this.monthsService.getMonthlyData(month);
    if (!monthlyData) {
      throw new NotFoundError(`Monthly data for ${month} not found`);
    }

    const billIndex = monthlyData.bill_instances.findIndex(b => b.id === billInstanceId);
    if (billIndex === -1) {
      throw new NotFoundError(`Bill instance ${billInstanceId} not found in ${month}`);
    }

    const billInstance = monthlyData.bill_instances[billIndex];
    
    // Find the occurrence containing this payment
    let targetOccurrence = null;
    let paymentIndex = -1;
    
    for (const occ of billInstance.occurrences) {
      paymentIndex = occ.payments.findIndex(p => p.id === paymentId);
      if (paymentIndex !== -1) {
        targetOccurrence = occ;
        break;
      }
    }
    
    if (!targetOccurrence || paymentIndex === -1) {
      throw new NotFoundError(`Payment ${paymentId} not found`);
    }

    // Update payment
    targetOccurrence.payments[paymentIndex] = {
      ...targetOccurrence.payments[paymentIndex],
      amount,
      date
    };
    targetOccurrence.updated_at = new Date().toISOString();

    // Check if this occurrence should be marked closed/open
    const occTotalPaid = targetOccurrence.payments.reduce((sum, p) => sum + p.amount, 0);
    targetOccurrence.is_closed = occTotalPaid >= targetOccurrence.expected_amount;
    if (targetOccurrence.is_closed && !targetOccurrence.closed_date) {
      targetOccurrence.closed_date = date;
    } else if (!targetOccurrence.is_closed) {
      targetOccurrence.closed_date = undefined;
    }
    
    // Update instance-level is_closed based on all occurrences
    billInstance.is_closed = areAllOccurrencesClosed(billInstance.occurrences);
    if (billInstance.is_closed && !billInstance.closed_date) {
      billInstance.closed_date = date;
    } else if (!billInstance.is_closed) {
      billInstance.closed_date = undefined;
    }
    billInstance.is_default = false;
    billInstance.updated_at = new Date().toISOString();

    // Save updated monthly data
    await this.monthsService.saveMonthlyData(month, monthlyData);

    return billInstance;
  }

  public async removePayment(
    month: string,
    billInstanceId: string,
    paymentId: string
  ): Promise<BillInstance> {
    const monthlyData = await this.monthsService.getMonthlyData(month);
    if (!monthlyData) {
      throw new NotFoundError(`Monthly data for ${month} not found`);
    }

    const billIndex = monthlyData.bill_instances.findIndex(b => b.id === billInstanceId);
    if (billIndex === -1) {
      throw new NotFoundError(`Bill instance ${billInstanceId} not found in ${month}`);
    }

    const billInstance = monthlyData.bill_instances[billIndex];
    
    // Find the occurrence containing this payment
    let targetOccurrence = null;
    let paymentIndex = -1;
    
    for (const occ of billInstance.occurrences) {
      paymentIndex = occ.payments.findIndex(p => p.id === paymentId);
      if (paymentIndex !== -1) {
        targetOccurrence = occ;
        break;
      }
    }
    
    if (!targetOccurrence || paymentIndex === -1) {
      throw new NotFoundError(`Payment ${paymentId} not found`);
    }

    // Remove payment
    targetOccurrence.payments.splice(paymentIndex, 1);
    targetOccurrence.updated_at = new Date().toISOString();

    // Re-evaluate occurrence closed status
    const occTotalPaid = targetOccurrence.payments.reduce((sum, p) => sum + p.amount, 0);
    targetOccurrence.is_closed = occTotalPaid >= targetOccurrence.expected_amount;
    if (!targetOccurrence.is_closed) {
      targetOccurrence.closed_date = undefined;
    }
    
    // Update instance-level is_closed based on all occurrences
    billInstance.is_closed = areAllOccurrencesClosed(billInstance.occurrences);
    if (!billInstance.is_closed) {
      billInstance.closed_date = undefined;
    }
    billInstance.is_default = false;
    billInstance.updated_at = new Date().toISOString();

    // Save updated monthly data
    await this.monthsService.saveMonthlyData(month, monthlyData);

    return billInstance;
  }

  public async getPayments(month: string, billInstanceId: string): Promise<Payment[]> {
    const monthlyData = await this.monthsService.getMonthlyData(month);
    if (!monthlyData) {
      throw new NotFoundError(`Monthly data for ${month} not found`);
    }

    const billInstance = monthlyData.bill_instances.find(b => b.id === billInstanceId);
    if (!billInstance) {
      throw new NotFoundError(`Bill instance ${billInstanceId} not found in ${month}`);
    }

    // Collect all payments from all occurrences
    return billInstance.occurrences.flatMap(occ => occ.payments || []);
  }

  // ============================================================================
  // Income Payment Methods
  // ============================================================================

  public async addIncomePayment(
    month: string,
    incomeInstanceId: string,
    amount: number,
    date: string,
    occurrenceId?: string
  ): Promise<IncomeInstance> {
    // Validate inputs
    if (amount <= 0) {
      throw new ValidationError('Payment amount must be positive');
    }
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ValidationError('Payment date must be in YYYY-MM-DD format');
    }

    const monthlyData = await this.monthsService.getMonthlyData(month);
    if (!monthlyData) {
      throw new NotFoundError(`Monthly data for ${month} not found`);
    }

    const incomeIndex = monthlyData.income_instances.findIndex(i => i.id === incomeInstanceId);
    if (incomeIndex === -1) {
      throw new NotFoundError(`Income instance ${incomeInstanceId} not found in ${month}`);
    }

    const incomeInstance = monthlyData.income_instances[incomeIndex];
    
    // Find the target occurrence (use first if not specified)
    let targetOccurrence = occurrenceId 
      ? incomeInstance.occurrences.find(o => o.id === occurrenceId)
      : incomeInstance.occurrences[0];
    
    if (!targetOccurrence) {
      throw new NotFoundError(`Occurrence not found for income instance ${incomeInstanceId}`);
    }

    // Create new payment
    const newPayment: Payment = {
      id: crypto.randomUUID(),
      amount,
      date,
      created_at: new Date().toISOString()
    };

    targetOccurrence.payments.push(newPayment);
    targetOccurrence.updated_at = new Date().toISOString();
    
    // Check if this occurrence should be marked closed
    const occTotalReceived = targetOccurrence.payments.reduce((sum, p) => sum + p.amount, 0);
    if (occTotalReceived >= targetOccurrence.expected_amount) {
      targetOccurrence.is_closed = true;
      targetOccurrence.closed_date = date;
    }
    
    // Update instance-level is_closed based on all occurrences
    incomeInstance.is_closed = areAllOccurrencesClosed(incomeInstance.occurrences);
    if (incomeInstance.is_closed && !incomeInstance.closed_date) {
      incomeInstance.closed_date = date;
    }
    incomeInstance.is_default = false;
    incomeInstance.updated_at = new Date().toISOString();

    // Save updated monthly data
    await this.monthsService.saveMonthlyData(month, monthlyData);

    return incomeInstance;
  }

  public async updateIncomePayment(
    month: string,
    incomeInstanceId: string,
    paymentId: string,
    amount: number,
    date: string
  ): Promise<IncomeInstance> {
    // Validate inputs
    if (amount <= 0) {
      throw new ValidationError('Payment amount must be positive');
    }
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ValidationError('Payment date must be in YYYY-MM-DD format');
    }

    const monthlyData = await this.monthsService.getMonthlyData(month);
    if (!monthlyData) {
      throw new NotFoundError(`Monthly data for ${month} not found`);
    }

    const incomeIndex = monthlyData.income_instances.findIndex(i => i.id === incomeInstanceId);
    if (incomeIndex === -1) {
      throw new NotFoundError(`Income instance ${incomeInstanceId} not found in ${month}`);
    }

    const incomeInstance = monthlyData.income_instances[incomeIndex];
    
    // Find the occurrence containing this payment
    let targetOccurrence = null;
    let paymentIndex = -1;
    
    for (const occ of incomeInstance.occurrences) {
      paymentIndex = occ.payments.findIndex(p => p.id === paymentId);
      if (paymentIndex !== -1) {
        targetOccurrence = occ;
        break;
      }
    }
    
    if (!targetOccurrence || paymentIndex === -1) {
      throw new NotFoundError(`Payment ${paymentId} not found`);
    }

    // Update payment
    targetOccurrence.payments[paymentIndex] = {
      ...targetOccurrence.payments[paymentIndex],
      amount,
      date
    };
    targetOccurrence.updated_at = new Date().toISOString();

    // Check if this occurrence should be marked closed/open
    const occTotalReceived = targetOccurrence.payments.reduce((sum, p) => sum + p.amount, 0);
    targetOccurrence.is_closed = occTotalReceived >= targetOccurrence.expected_amount;
    if (targetOccurrence.is_closed && !targetOccurrence.closed_date) {
      targetOccurrence.closed_date = date;
    } else if (!targetOccurrence.is_closed) {
      targetOccurrence.closed_date = undefined;
    }
    
    // Update instance-level is_closed based on all occurrences
    incomeInstance.is_closed = areAllOccurrencesClosed(incomeInstance.occurrences);
    if (incomeInstance.is_closed && !incomeInstance.closed_date) {
      incomeInstance.closed_date = date;
    } else if (!incomeInstance.is_closed) {
      incomeInstance.closed_date = undefined;
    }
    incomeInstance.is_default = false;
    incomeInstance.updated_at = new Date().toISOString();

    // Save updated monthly data
    await this.monthsService.saveMonthlyData(month, monthlyData);

    return incomeInstance;
  }

  public async removeIncomePayment(
    month: string,
    incomeInstanceId: string,
    paymentId: string
  ): Promise<IncomeInstance> {
    const monthlyData = await this.monthsService.getMonthlyData(month);
    if (!monthlyData) {
      throw new NotFoundError(`Monthly data for ${month} not found`);
    }

    const incomeIndex = monthlyData.income_instances.findIndex(i => i.id === incomeInstanceId);
    if (incomeIndex === -1) {
      throw new NotFoundError(`Income instance ${incomeInstanceId} not found in ${month}`);
    }

    const incomeInstance = monthlyData.income_instances[incomeIndex];
    
    // Find the occurrence containing this payment
    let targetOccurrence = null;
    let paymentIndex = -1;
    
    for (const occ of incomeInstance.occurrences) {
      paymentIndex = occ.payments.findIndex(p => p.id === paymentId);
      if (paymentIndex !== -1) {
        targetOccurrence = occ;
        break;
      }
    }
    
    if (!targetOccurrence || paymentIndex === -1) {
      throw new NotFoundError(`Payment ${paymentId} not found`);
    }

    // Remove payment
    targetOccurrence.payments.splice(paymentIndex, 1);
    targetOccurrence.updated_at = new Date().toISOString();

    // Re-evaluate occurrence closed status
    const occTotalReceived = targetOccurrence.payments.reduce((sum, p) => sum + p.amount, 0);
    targetOccurrence.is_closed = occTotalReceived >= targetOccurrence.expected_amount;
    if (!targetOccurrence.is_closed) {
      targetOccurrence.closed_date = undefined;
    }
    
    // Update instance-level is_closed based on all occurrences
    incomeInstance.is_closed = areAllOccurrencesClosed(incomeInstance.occurrences);
    if (!incomeInstance.is_closed) {
      incomeInstance.closed_date = undefined;
    }
    incomeInstance.is_default = false;
    incomeInstance.updated_at = new Date().toISOString();

    // Save updated monthly data
    await this.monthsService.saveMonthlyData(month, monthlyData);

    return incomeInstance;
  }

  public async getIncomePayments(month: string, incomeInstanceId: string): Promise<Payment[]> {
    const monthlyData = await this.monthsService.getMonthlyData(month);
    if (!monthlyData) {
      throw new NotFoundError(`Monthly data for ${month} not found`);
    }

    const incomeInstance = monthlyData.income_instances.find(i => i.id === incomeInstanceId);
    if (!incomeInstance) {
      throw new NotFoundError(`Income instance ${incomeInstanceId} not found in ${month}`);
    }

    // Collect all payments from all occurrences
    return incomeInstance.occurrences.flatMap(occ => occ.payments || []);
  }
}
