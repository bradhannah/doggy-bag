// What the month files say, read straight from disk: which months are locked and which is
// the newest. Used to place money that is still coming (submitted and approved insurance
// reimbursements) in the month being worked on. Reads raw files on purpose:
// MonthsService.getMonthlyData would build virtual insurance lines, which is what needs
// this answer in the first place.

import type { StorageService } from '../services/storage';

export interface MonthLedger {
  isLocked: (month: string) => boolean;
  /** The latest month that exists, if any. */
  newest?: string;
}

export const emptyLedger: MonthLedger = { isLocked: () => false };

export async function loadMonthLedger(
  storage: Pick<StorageService, 'listFiles' | 'readJSON'>
): Promise<MonthLedger> {
  const locked = new Set<string>();
  let newest: string | undefined;
  for (const file of await storage.listFiles('data/months')) {
    if (!/^\d{4}-\d{2}\.json$/.test(file)) continue;
    const month = file.slice(0, 7);
    if (!newest || month > newest) newest = month;
    const data = await storage.readJSON<{ is_read_only?: boolean }>(`data/months/${file}`);
    if (data?.is_read_only) locked.add(month);
  }
  return { isLocked: (month) => locked.has(month), newest };
}
