// Which months are locked, read straight from disk.
// Used to place money that is still coming (pending and approved reimbursements) in the
// earliest unlocked month. Reads raw files on purpose: MonthsService.getMonthlyData would
// build virtual insurance lines, which is what needs this answer in the first place.

import type { StorageService } from '../services/storage';

export type IsMonthLocked = (month: string) => boolean;

export const noMonthsLocked: IsMonthLocked = () => false;

export async function loadLockedMonths(
  storage: Pick<StorageService, 'listFiles' | 'readJSON'>
): Promise<IsMonthLocked> {
  const locked = new Set<string>();
  for (const file of await storage.listFiles('data/months')) {
    if (!/^\d{4}-\d{2}\.json$/.test(file)) continue;
    const data = await storage.readJSON<{ is_read_only?: boolean }>(`data/months/${file}`);
    if (data?.is_read_only) locked.add(file.slice(0, 7));
  }
  return (month) => locked.has(month);
}
