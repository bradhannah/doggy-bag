// Payments Service - Manages partial payments for bill instances
// Handles adding, updating, and removing payments from bill instances

import { MonthsServiceImpl } from './months-service';
import type { MonthsService } from './months-service';
import type { Payment, BillInstance, MonthlyData } from '../types';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface PaymentsService {
  addPayment(month: string, billInstanceId: string, amount: number, date: string): Promise<BillInstance>;
  updatePayment(month: string, billInstanceId: string, paymentId: string, amount: number, date: string): Promise<BillInstance>;
  removePayment(month: string, billInstanceId: string, paymentId: string): Promise<BillInstance>;
  getPayments(month: string, billInstanceId: string): Promise<Payment[]>;
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
    
    // Initialize payments array if needed
    if (!billInstance.payments) {
      billInstance.payments = [];
    }

    // Create new payment
    const newPayment: Payment = {
      id: crypto.randomUUID(),
      amount,
      date,
      created_at: new Date().toISOString()
    };

    billInstance.payments.push(newPayment);
    
    // Clear actual_amount when using partial payments
    billInstance.actual_amount = undefined;
    
    // Update is_paid status based on total payments vs expected
    const totalPaid = billInstance.payments.reduce((sum, p) => sum + p.amount, 0);
    billInstance.is_paid = totalPaid >= billInstance.expected_amount;
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
    
    if (!billInstance.payments || billInstance.payments.length === 0) {
      throw new NotFoundError(`No payments found for bill instance ${billInstanceId}`);
    }

    const paymentIndex = billInstance.payments.findIndex(p => p.id === paymentId);
    if (paymentIndex === -1) {
      throw new NotFoundError(`Payment ${paymentId} not found`);
    }

    // Update payment
    billInstance.payments[paymentIndex] = {
      ...billInstance.payments[paymentIndex],
      amount,
      date
    };

    // Update is_paid status based on total payments vs expected
    const totalPaid = billInstance.payments.reduce((sum, p) => sum + p.amount, 0);
    billInstance.is_paid = totalPaid >= billInstance.expected_amount;
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
    
    if (!billInstance.payments || billInstance.payments.length === 0) {
      throw new NotFoundError(`No payments found for bill instance ${billInstanceId}`);
    }

    const paymentIndex = billInstance.payments.findIndex(p => p.id === paymentId);
    if (paymentIndex === -1) {
      throw new NotFoundError(`Payment ${paymentId} not found`);
    }

    // Remove payment
    billInstance.payments.splice(paymentIndex, 1);

    // Update is_paid status based on remaining payments
    const totalPaid = billInstance.payments.reduce((sum, p) => sum + p.amount, 0);
    billInstance.is_paid = totalPaid >= billInstance.expected_amount;
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

    return billInstance.payments || [];
  }
}
