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
      // In occurrence-only model, closed = paid
      if (occ.is_closed) continue;

      // Open occurrences before balance start date are overdue
      overdueBills.push({
        name: bill.name,
        amount: occ.expected_amount,
        due_date: dueDate,
      });
    }
  }

  return overdueBills;
}

export function sumOverdueBills(overdueBills: OverdueBillItem[]): number {
  return overdueBills.reduce((sum, bill) => sum + bill.amount, 0);
}
