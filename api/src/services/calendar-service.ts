// Calendar Service
// Aggregates events from bills, incomes, and todos for calendar display

import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import { BillsServiceImpl } from './bills-service';
import type { BillsService } from './bills-service';
import { IncomesServiceImpl } from './incomes-service';
import type { IncomesService } from './incomes-service';
import { InsuranceClaimsServiceImpl } from './insurance-claims-service';
import type { InsuranceClaimsService } from './insurance-claims-service';
import type {
  MonthlyData,
  BillInstance,
  IncomeInstance,
  TodoInstance,
  Occurrence,
  Bill,
  Income,
} from '../types';
import { getTodayLocalDateString } from '../utils/due-date';
import { buildVirtualInsuranceEntries } from '../utils/insurance-virtual-entries';
import { loadMonthLedger } from '../utils/locked-months';

// ============================================================================
// Calendar Event Types
// ============================================================================

export type CalendarEventType = 'bill' | 'income' | 'todo';

export interface CalendarEvent {
  id: string; // Unique identifier for the event
  type: CalendarEventType;
  date: string; // YYYY-MM-DD
  title: string;
  amount?: number; // In cents (undefined for todos without amount)
  is_closed: boolean; // Whether the event is completed/paid
  is_overdue: boolean; // Whether the event is past due and not closed
  source_id: string; // ID of the source entity (bill_id, income_id, todo_id)
  instance_id: string; // ID of the instance (bill_instance_id, income_instance_id, todo_instance_id)
  occurrence_id?: string; // For bills/incomes: the specific occurrence ID
  is_insurance?: boolean; // Insurance bill or reimbursement; source_id is the claim ID
}

export interface CalendarResponse {
  month: string;
  events: CalendarEvent[];
  summary: {
    bills: number;
    incomes: number;
    todos: number;
    total: number;
  };
}

// ============================================================================
// Service Interface
// ============================================================================

export interface CalendarService {
  getEventsForMonth(month: string): Promise<CalendarResponse>;
  getEventsForDate(month: string, date: string): Promise<CalendarEvent[]>;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class CalendarServiceImpl implements CalendarService {
  private storage: StorageService;
  private billsService: BillsService;
  private incomesService: IncomesService;
  private insuranceClaimsService: InsuranceClaimsService;

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
    this.billsService = new BillsServiceImpl();
    this.incomesService = new IncomesServiceImpl();
    this.insuranceClaimsService = new InsuranceClaimsServiceImpl();
  }

  /**
   * Insurance entries are virtual: built from claims, or for a locked month taken from
   * the snapshot captured when it was locked (the same source the Budget uses).
   */
  private async getInsuranceEntries(
    month: string,
    monthlyData: MonthlyData
  ): Promise<{ billInstances: BillInstance[]; incomeInstances: IncomeInstance[] }> {
    if (monthlyData.is_read_only && monthlyData.insurance_snapshot) {
      return monthlyData.insurance_snapshot;
    }
    const ledger = await loadMonthLedger(this.storage);
    const claims = await this.insuranceClaimsService.getClaimsWithBudgetActivity(month, ledger);
    return buildVirtualInsuranceEntries(claims, month, ledger);
  }

  private insuranceEvents(
    entries: { billInstances: BillInstance[]; incomeInstances: IncomeInstance[] },
    today: string
  ): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const push = (
      type: 'bill' | 'income',
      instance: BillInstance | IncomeInstance,
      occ: Occurrence,
      title: string
    ) => {
      // A plan that hasn't decided, or denied, moves no money; a submitted one has no date yet
      if (occ.expected_amount === 0 || occ.submission_status === 'pending') return;
      events.push({
        id: `${type}-${instance.id}-${occ.id}`,
        type,
        date: occ.expected_date,
        title,
        amount: occ.expected_amount,
        is_closed: occ.is_closed,
        is_overdue: !occ.is_closed && occ.expected_date < today,
        source_id: instance.claim_id ?? instance.id,
        instance_id: instance.id,
        occurrence_id: occ.id,
        is_insurance: true,
      });
    };
    for (const instance of entries.billInstances) {
      for (const occ of instance.occurrences) push('bill', instance, occ, instance.name ?? '');
    }
    for (const instance of entries.incomeInstances) {
      for (const occ of instance.occurrences) {
        const title = occ.plan_name ? `${instance.name} · ${occ.plan_name}` : (instance.name ?? '');
        push('income', instance, occ, title);
      }
    }
    return events;
  }

  private async getMonthlyData(month: string): Promise<MonthlyData | null> {
    try {
      const data = await this.storage.readJSON<MonthlyData>(`data/months/${month}.json`);
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Get all calendar events for a month
   */
  public async getEventsForMonth(month: string): Promise<CalendarResponse> {
    const events: CalendarEvent[] = [];
    const monthlyData = await this.getMonthlyData(month);

    // Get today's date for overdue calculation
    const today = getTodayLocalDateString();

    if (monthlyData) {
      // Load bills and incomes for name lookups
      const bills = await this.billsService.getAll();
      const incomes = await this.incomesService.getAll();

      const billsMap = new Map<string, Bill>(bills.map((b) => [b.id, b]));
      const incomesMap = new Map<string, Income>(incomes.map((i) => [i.id, i]));

      // Process bill instances
      for (const billInstance of monthlyData.bill_instances.filter((i) => !i.is_virtual)) {
        const instanceEvents = this.processBillInstance(billInstance, billsMap, today);
        events.push(...instanceEvents);
      }

      // Process income instances
      for (const incomeInstance of monthlyData.income_instances.filter((i) => !i.is_virtual)) {
        const instanceEvents = this.processIncomeInstance(incomeInstance, incomesMap, today);
        events.push(...instanceEvents);
      }

      // Insurance bills and reimbursements (virtual: never in the month file)
      events.push(
        ...this.insuranceEvents(await this.getInsuranceEntries(month, monthlyData), today)
      );

      // Process todo instances
      const todoInstances = monthlyData.todo_instances || [];
      for (const todoInstance of todoInstances) {
        const event = this.processTodoInstance(todoInstance, today);
        events.push(event);
      }
    }

    // Sort events by date
    events.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate summary
    const summary = {
      bills: events.filter((e) => e.type === 'bill').length,
      incomes: events.filter((e) => e.type === 'income').length,
      todos: events.filter((e) => e.type === 'todo').length,
      total: events.length,
    };

    return {
      month,
      events,
      summary,
    };
  }

  /**
   * Get events for a specific date
   */
  public async getEventsForDate(month: string, date: string): Promise<CalendarEvent[]> {
    const response = await this.getEventsForMonth(month);
    return response.events.filter((e) => e.date === date);
  }

  /**
   * Process a bill instance into calendar events
   * Each occurrence becomes a separate event
   */
  private processBillInstance(
    instance: BillInstance,
    billsMap: Map<string, Bill>,
    today: string
  ): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    // Get the bill name
    let title: string;
    if (instance.name) {
      title = instance.name;
    } else if (instance.bill_id && billsMap.has(instance.bill_id)) {
      title = billsMap.get(instance.bill_id)!.name;
    } else {
      title = 'Unknown Bill';
    }

    // Create an event for each occurrence
    for (const occ of instance.occurrences) {
      events.push({
        id: `bill-${instance.id}-${occ.id}`,
        type: 'bill',
        date: occ.expected_date,
        title,
        amount: occ.expected_amount,
        is_closed: occ.is_closed,
        is_overdue: !occ.is_closed && occ.expected_date < today,
        source_id: instance.bill_id || instance.id,
        instance_id: instance.id,
        occurrence_id: occ.id,
      });
    }

    return events;
  }

  /**
   * Process an income instance into calendar events
   * Each occurrence becomes a separate event
   */
  private processIncomeInstance(
    instance: IncomeInstance,
    incomesMap: Map<string, Income>,
    today: string
  ): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    // Get the income name
    let title: string;
    if (instance.name) {
      title = instance.name;
    } else if (instance.income_id && incomesMap.has(instance.income_id)) {
      title = incomesMap.get(instance.income_id)!.name;
    } else {
      title = 'Unknown Income';
    }

    // Create an event for each occurrence
    for (const occ of instance.occurrences) {
      const isOverdue = !occ.is_closed && occ.expected_date < today;

      events.push({
        id: `income-${instance.id}-${occ.id}`,
        type: 'income',
        date: occ.expected_date,
        title,
        amount: occ.expected_amount,
        is_closed: occ.is_closed,
        is_overdue: isOverdue,
        source_id: instance.income_id || instance.id,
        instance_id: instance.id,
        occurrence_id: occ.id,
      });
    }

    return events;
  }

  /**
   * Process a todo instance into a calendar event
   */
  private processTodoInstance(instance: TodoInstance, today: string): CalendarEvent {
    const isOverdue = instance.status !== 'completed' && instance.due_date < today;

    return {
      id: `todo-${instance.id}`,
      type: 'todo',
      date: instance.due_date,
      title: instance.title,
      amount: undefined, // Todos don't have amounts
      is_closed: instance.status === 'completed',
      is_overdue: isOverdue,
      source_id: instance.todo_id || instance.id,
      instance_id: instance.id,
      occurrence_id: undefined,
    };
  }
}
