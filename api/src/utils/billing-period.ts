// Billing Period Calculator - Calculate monthly contribution based on billing frequency

export type BillingPeriod = 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';

export interface BillingPeriodInfo {
  period: BillingPeriod;
  instancesPerMonth: number;
  description: string;
}

const BILLING_PERIODS: Record<BillingPeriod, BillingPeriodInfo> = {
  monthly: {
    period: 'monthly',
    instancesPerMonth: 1,
    description: 'Once per month'
  },
  bi_weekly: {
    period: 'bi_weekly',
    instancesPerMonth: 2.16666667,
    description: 'Every 2 weeks (26 times per year)'
  },
  weekly: {
    period: 'weekly',
    instancesPerMonth: 4.33333333,
    description: 'Every week (52 times per year)'
  },
  semi_annually: {
    period: 'semi_annually',
    instancesPerMonth: 0.16666667,
    description: 'Twice per year'
  }
};

/**
 * Get average instances per month for a billing period (legacy - for backward compatibility)
 */
export function getMonthlyInstanceCount(billingPeriod: BillingPeriod): number {
  return BILLING_PERIODS[billingPeriod].instancesPerMonth;
}

export function getBillingPeriodInfo(billingPeriod: BillingPeriod): BillingPeriodInfo {
  return BILLING_PERIODS[billingPeriod];
}

export function calculateMonthlyContribution(amount: number, billingPeriod: BillingPeriod): number {
  const instances = getMonthlyInstanceCount(billingPeriod);
  return Math.round(amount * instances);
}

/**
 * Calculate the actual number of occurrences in a specific month based on start_date
 * @param billingPeriod The billing period type
 * @param startDate The start date (first occurrence) as ISO date string YYYY-MM-DD
 * @param targetMonth The month to calculate for as YYYY-MM string
 * @returns Number of occurrences in that month
 */
export function getActualInstancesInMonth(
  billingPeriod: BillingPeriod,
  startDate: string,
  targetMonth: string
): number {
  if (billingPeriod === 'monthly') {
    return 1;
  }
  
  const occurrences = getOccurrenceDatesInMonth(billingPeriod, startDate, targetMonth);
  return occurrences.length;
}

/**
 * Get the actual dates when a bill/income occurs in a specific month
 * @param billingPeriod The billing period type
 * @param startDate The start date (first occurrence) as ISO date string YYYY-MM-DD
 * @param targetMonth The month to calculate for as YYYY-MM string
 * @returns Array of Date objects for each occurrence in the month
 */
export function getOccurrenceDatesInMonth(
  billingPeriod: BillingPeriod,
  startDate: string,
  targetMonth: string
): Date[] {
  const [year, month] = targetMonth.split('-').map(Number);
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);
  
  const start = new Date(startDate);
  const occurrences: Date[] = [];
  
  if (billingPeriod === 'monthly') {
    // For monthly, just return one occurrence on the same day of month as start_date
    const dayOfMonth = start.getDate();
    const maxDayInMonth = lastDayOfMonth.getDate();
    const actualDay = Math.min(dayOfMonth, maxDayInMonth);
    occurrences.push(new Date(year, month - 1, actualDay));
    return occurrences;
  }
  
  if (billingPeriod === 'semi_annually') {
    // Semi-annually: occurs every 6 months from start date
    // Find all occurrences by iterating from start date forward in 6-month increments
    let current = new Date(start);
    
    // If start is after target month, work backward
    while (current > lastDayOfMonth) {
      current.setMonth(current.getMonth() - 6);
    }
    
    // Move forward until we're past start date
    while (current < start) {
      current.setMonth(current.getMonth() + 6);
    }
    
    // Now check if any occurrence falls in target month
    // Reset and iterate properly
    current = new Date(start);
    while (current <= lastDayOfMonth) {
      if (current >= firstDayOfMonth && current <= lastDayOfMonth) {
        occurrences.push(new Date(current));
      }
      current.setMonth(current.getMonth() + 6);
    }
    
    return occurrences;
  }
  
  // For weekly and bi_weekly, calculate interval in days
  const intervalDays = billingPeriod === 'weekly' ? 7 : 14;
  
  // Find the first occurrence on or before the first day of the target month
  // by going backward from start if needed, or forward if start is before
  let current = new Date(start);
  
  // Calculate days difference between start and first day of month
  const diffTime = firstDayOfMonth.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) {
    // Start is before the target month - advance to first occurrence in/before target month
    const periodsToAdvance = Math.floor(diffDays / intervalDays);
    current = new Date(start);
    current.setDate(current.getDate() + periodsToAdvance * intervalDays);
    
    // If we're still before the month, advance one more period
    while (current < firstDayOfMonth) {
      current.setDate(current.getDate() + intervalDays);
    }
  } else if (diffDays < 0) {
    // Start is after the first day of target month
    // Check if start is even in this month
    if (current > lastDayOfMonth) {
      return []; // Start date is after this month
    }
    // Start from the start date
    current = new Date(start);
  }
  
  // Now iterate through the month collecting occurrences
  while (current <= lastDayOfMonth) {
    if (current >= firstDayOfMonth) {
      occurrences.push(new Date(current));
    }
    current.setDate(current.getDate() + intervalDays);
  }
  
  return occurrences;
}

/**
 * Calculate the monthly amount based on actual occurrences in a specific month
 * @param amount The per-occurrence amount
 * @param billingPeriod The billing period type
 * @param startDate The start date (first occurrence) as ISO date string YYYY-MM-DD (optional for monthly)
 * @param targetMonth The month to calculate for as YYYY-MM string
 * @returns The total amount for that month
 */
export function calculateActualMonthlyAmount(
  amount: number,
  billingPeriod: BillingPeriod,
  startDate: string | undefined,
  targetMonth: string
): number {
  if (billingPeriod === 'monthly') {
    return amount;
  }
  
  if (!startDate) {
    // Fallback to average if no start date provided
    return Math.round(amount * getMonthlyInstanceCount(billingPeriod));
  }
  
  const instances = getActualInstancesInMonth(billingPeriod, startDate, targetMonth);
  return amount * instances;
}

// Legacy functions kept for backward compatibility
export function getBiWeeklyInstancesInMonth(year: number, month: number, dayOfWeek: number): Date[] {
  const instances: Date[] = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  let currentDay = firstDay;
  
  while (currentDay <= lastDay) {
    if (currentDay.getDay() === dayOfWeek) {
      instances.push(new Date(currentDay));
      
      if (instances.length >= 3) {
        break;
      }
      
      currentDay.setDate(currentDay.getDate() + 14);
    } else {
      currentDay.setDate(currentDay.getDate() + 1);
    }
  }
  
  return instances;
}

export function getWeeklyInstancesInMonth(year: number, month: number, dayOfWeek: number): Date[] {
  const instances: Date[] = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  let currentDay = firstDay;
  
  while (currentDay <= lastDay) {
    if (currentDay.getDay() === dayOfWeek) {
      instances.push(new Date(currentDay));
    }
    currentDay.setDate(currentDay.getDate() + 1);
  }
  
  return instances;
}

export function getSemiAnnuallyInstancesInMonth(year: number, month: number): Date[] {
  const instances: Date[] = [];
  
  const firstHalfMonths = [1, 2, 3, 4, 5, 6];
  const secondHalfMonths = [7, 8, 9, 10, 11, 12];
  
  if (firstHalfMonths.includes(month)) {
    instances.push(new Date(year, 0, 1));
  }
  
  if (secondHalfMonths.includes(month)) {
    instances.push(new Date(year, 6, 1));
  }
  
  return instances;
}
