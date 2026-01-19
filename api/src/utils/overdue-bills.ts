import type { BillInstanceDetailed } from '../types';

export type OverdueBillItem = {
  name: string;
  amount: number;
  due_date: string;
};

function isCurrentMonth(month: string, todayStr: string): boolean {
  return todayStr.startsWith(month);
}

export function getProjectionBalanceStartDate(month: string, todayStr: string): string {
  return isCurrentMonth(month, todayStr) ? todayStr : `${month}-01`;
}

export function getOverdueBills(
  bills: BillInstanceDetailed[],
  month: string,
  todayStr = new Date().toISOString().split('T')[0]
): OverdueBillItem[] {
  const balanceStartDate = getProjectionBalanceStartDate(month, todayStr);

  const overdueBills: OverdueBillItem[] = [];

  for (const bill of bills) {
    const occurrences = bill.occurrences || [];

    for (const occ of occurrences) {
      const dueDate = occ.expected_date;
      if (dueDate >= balanceStartDate) continue;
      if (occ.is_closed) continue;

      const payments = occ.payments || [];
      const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const remaining = occ.expected_amount - paidAmount;

      if (remaining <= 0) continue;

      overdueBills.push({
        name: bill.name,
        amount: remaining,
        due_date: dueDate,
      });
    }
  }

  return overdueBills;
}

export function sumOverdueBills(overdueBills: OverdueBillItem[]): number {
  return overdueBills.reduce((sum, bill) => sum + bill.amount, 0);
}
