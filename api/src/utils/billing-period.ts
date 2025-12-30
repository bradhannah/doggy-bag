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
