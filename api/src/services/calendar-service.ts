// Calendar Service
// Aggregates events from bills, incomes, savings goals, and todos for calendar display

import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import { BillsServiceImpl } from './bills-service';
import type { BillsService } from './bills-service';
import { IncomesServiceImpl } from './incomes-service';
import type { IncomesService } from './incomes-service';
import { SavingsGoalsServiceImpl } from './savings-goals-service';
import type { SavingsGoalsService } from './savings-goals-service';
import type {
  MonthlyData,
  BillInstance,
  IncomeInstance,
  TodoInstance,
  Occurrence,
  Bill,
  Income,
  SavingsGoal,
} from '../types';

// ============================================================================
// Calendar Event Types
// ============================================================================

export type CalendarEventType = 'bill' | 'income' | 'goal' | 'todo';

export interface CalendarEvent {
  id: string; // Unique identifier for the event
  type: CalendarEventType;
  date: string; // YYYY-MM-DD
  title: string;
  amount?: number; // In cents (undefined for todos without amount)
  is_closed: boolean; // Whether the event is completed/paid
  is_overdue: boolean; // Whether the event is past due and not closed
  source_id: string; // ID of the source entity (bill_id, income_id, goal_id, todo_id)
  instance_id: string; // ID of the instance (bill_instance_id, income_instance_id, todo_instance_id)
  occurrence_id?: string; // For bills/incomes: the specific occurrence ID
}

export interface CalendarResponse {
  month: string;
  events: CalendarEvent[];
  summary: {
    bills: number;
    incomes: number;
    goals: number;
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
  private goalsService: SavingsGoalsService;

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
    this.billsService = new BillsServiceImpl();
    this.incomesService = new IncomesServiceImpl();
    this.goalsService = new SavingsGoalsServiceImpl();
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
    const today = new Date().toISOString().split('T')[0];

    if (monthlyData) {
      // Load bills and incomes for name lookups
      const bills = await this.billsService.getAll();
      const incomes = await this.incomesService.getAll();
      const goals = await this.goalsService.getAll();

      const billsMap = new Map<string, Bill>(bills.map((b) => [b.id, b]));
      const incomesMap = new Map<string, Income>(incomes.map((i) => [i.id, i]));
      const goalsMap = new Map<string, SavingsGoal>(goals.map((g) => [g.id, g]));

      // Process bill instances
      for (const billInstance of monthlyData.bill_instances) {
        const instanceEvents = this.processBillInstance(billInstance, billsMap, goalsMap, today);
        events.push(...instanceEvents);
      }

      // Process income instances
      for (const incomeInstance of monthlyData.income_instances) {
        const instanceEvents = this.processIncomeInstance(incomeInstance, incomesMap, today);
        events.push(...instanceEvents);
      }

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
      goals: events.filter((e) => e.type === 'goal').length,
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
   * Goal contributions are marked as type 'goal'
   */
  private processBillInstance(
    instance: BillInstance,
    billsMap: Map<string, Bill>,
    goalsMap: Map<string, SavingsGoal>,
    today: string
  ): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    // Get the bill name
    let title: string;
    if (instance.bill_id && billsMap.has(instance.bill_id)) {
      title = billsMap.get(instance.bill_id)!.name;
    } else if (instance.name) {
      title = instance.name;
    } else {
      title = 'Unknown Bill';
    }

    // Check if this is a savings goal contribution
    // Either the instance has goal_id OR the underlying bill has goal_id
    const bill = instance.bill_id ? billsMap.get(instance.bill_id) : null;
    const isGoalContribution = !!(instance.goal_id || bill?.goal_id);
    const effectiveGoalId = instance.goal_id || bill?.goal_id;
    let goalTitle = title;
    if (isGoalContribution && effectiveGoalId && goalsMap.has(effectiveGoalId)) {
      goalTitle = goalsMap.get(effectiveGoalId)!.name;
    }

    // Create an event for each occurrence
    for (const occ of instance.occurrences) {
      const isOverdue = !occ.is_closed && occ.expected_date < today;

      events.push({
        id: `${isGoalContribution ? 'goal' : 'bill'}-${instance.id}-${occ.id}`,
        type: isGoalContribution ? 'goal' : 'bill',
        date: occ.expected_date,
        title: isGoalContribution ? goalTitle : title,
        amount: occ.expected_amount,
        is_closed: occ.is_closed,
        is_overdue: isOverdue,
        source_id: isGoalContribution
          ? effectiveGoalId || instance.bill_id || ''
          : instance.bill_id || instance.id,
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
    if (instance.income_id && incomesMap.has(instance.income_id)) {
      title = incomesMap.get(instance.income_id)!.name;
    } else if (instance.name) {
      title = instance.name;
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
