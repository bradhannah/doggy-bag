/**
 * One-time cleanup of insurance submissions saved under the old rules, where an
 * approval closed a claim and a denial could keep an amount.
 *
 * For actual claims (not scheduled appointments):
 * 1. Approvals decided before the cutoff (or with no decision date) become received,
 *    dated the decision date (or the service date). Approvals with no amount are
 *    reported and left alone.
 * 2. Denied submissions are set to $0.
 * 3. Received submissions with no received date get the decision (or service) date.
 * 4. Unsubmitted later plans claim what's left after the earlier plans.
 * 5. Claim status is re-derived.
 *
 * With --refresh-locked-snapshots, locked months also get their insurance snapshot
 * rebuilt under the new month rules; the before/after totals are printed first.
 *
 * Dry run by default. --apply makes a manual backup, then writes. Close the app first.
 *
 *   bun run api/src/scripts/cleanup-insurance-submissions.ts \
 *     --data-dir "<data folder>" --cutoff 2026-10-24 [--apply] [--refresh-locked-snapshots]
 */

import { StorageServiceImpl } from '../services/storage';
import { VersionServiceImpl } from '../services/version-service';
import {
  deriveClaimStatus,
  getClaimBudgetMonths,
  recalculateDownstreamSubmissions,
} from '../utils/insurance-claims';
import { buildVirtualInsuranceEntries } from '../utils/insurance-virtual-entries';
import type { BillInstance, IncomeInstance, InsuranceClaim, MonthlyData } from '../types';

const CLAIMS_PATH = 'data/entities/insurance-claims.json';

export type CleanupChangeKind =
  | 'marked_received'
  | 'denied_zeroed'
  | 'received_date_filled'
  | 'amount_recalculated'
  | 'status_changed';

export interface CleanupChange {
  kind: CleanupChangeKind;
  claim_number: number;
  plan_name?: string;
  amount?: number; // The money involved, in cents
  detail: string;
}

export interface CleanupNote {
  claim_number: number;
  plan_name?: string;
  amount?: number;
  detail: string;
}

export interface CleanupPlan {
  claims: InsuranceClaim[];
  changes: CleanupChange[];
  awaitingPayment: CleanupNote[]; // Approvals on or after the cutoff: still waiting for money
  exceptions: CleanupNote[]; // Needs the person to decide
}

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function planInsuranceCleanup(
  input: InsuranceClaim[],
  options: { cutoff: string; now?: string }
): CleanupPlan {
  const now = options.now ?? new Date().toISOString();
  const claims: InsuranceClaim[] = structuredClone(input);
  const changes: CleanupChange[] = [];
  const awaitingPayment: CleanupNote[] = [];
  const exceptions: CleanupNote[] = [];

  for (const claim of claims) {
    const n = claim.claim_number;
    if (claim.is_expected) {
      if (claim.submissions.length > 0) {
        exceptions.push({
          claim_number: n,
          detail: 'Scheduled appointment that already has submissions; convert it to a claim',
        });
      }
      continue;
    }

    const changesBefore = changes.length;
    const service = claim.service_date.substring(0, 10);

    for (const sub of claim.submissions) {
      const plan = sub.plan_snapshot?.name ?? 'Insurance';
      const hasAmount = typeof sub.amount_reimbursed === 'number';

      if (sub.status === 'approved') {
        if (!hasAmount) {
          exceptions.push({
            claim_number: n,
            plan_name: plan,
            detail: 'Approved with no amount. Enter what the insurer approved on the claim.',
          });
        } else if (!sub.date_resolved || sub.date_resolved < options.cutoff) {
          sub.status = 'paid';
          const filled = !sub.date_paid;
          if (filled) sub.date_paid = sub.date_resolved ?? service;
          changes.push({
            kind: 'marked_received',
            claim_number: n,
            plan_name: plan,
            amount: sub.amount_reimbursed,
            detail: `received ${sub.date_paid}${sub.date_resolved ? '' : ' (service date)'}`,
          });
        } else {
          awaitingPayment.push({
            claim_number: n,
            plan_name: plan,
            amount: sub.amount_reimbursed,
            detail: `approved ${sub.date_resolved}`,
          });
        }
      } else if (sub.status === 'denied' && sub.amount_reimbursed !== 0) {
        changes.push({
          kind: 'denied_zeroed',
          claim_number: n,
          plan_name: plan,
          amount: sub.amount_reimbursed ?? 0,
          detail: hasAmount ? 'now $0.00' : 'had no amount, now $0.00',
        });
        sub.amount_reimbursed = 0;
      } else if (sub.status === 'paid') {
        if (!hasAmount) {
          exceptions.push({
            claim_number: n,
            plan_name: plan,
            detail: 'Received with no amount. Enter what arrived on the claim.',
          });
        }
        if (!sub.date_paid) {
          sub.date_paid = sub.date_resolved ?? service;
          changes.push({
            kind: 'received_date_filled',
            claim_number: n,
            plan_name: plan,
            detail: `received date set to ${sub.date_paid}`,
          });
        }
      }
    }

    for (const change of recalculateDownstreamSubmissions(claim, { afterIndex: 0 })) {
      if (change.field !== 'amount_claimed') continue;
      changes.push({
        kind: 'amount_recalculated',
        claim_number: n,
        plan_name: change.plan_name,
        amount: change.to as number,
        detail: `claims ${money(change.to as number)} (was ${money(change.from as number)})`,
      });
    }

    const status = deriveClaimStatus(claim);
    if (status !== claim.status) {
      changes.push({
        kind: 'status_changed',
        claim_number: n,
        detail: `${claim.status} → ${status}`,
      });
      claim.status = status;
    }
    if (changes.length > changesBefore) claim.updated_at = now;
  }

  return { claims, changes, awaitingPayment, exceptions };
}

// ============================================================================
// Locked month snapshots
// ============================================================================

type Entries = { billInstances: BillInstance[]; incomeInstances: IncomeInstance[] };

export interface SnapshotTotals {
  lines: number;
  expected: number;
  received: number;
}

function totals(entries: Entries): SnapshotTotals {
  const lines = entries.incomeInstances.flatMap((ii) => ii.occurrences);
  return {
    lines: lines.length + entries.billInstances.length,
    expected: lines.reduce((sum, occ) => sum + occ.expected_amount, 0),
    received: lines
      .filter((occ) => occ.is_closed)
      .reduce((sum, occ) => sum + occ.expected_amount, 0),
  };
}

export interface SnapshotRefresh {
  month: string;
  before: SnapshotTotals;
  after: SnapshotTotals;
  changed: boolean;
  data: MonthlyData;
}

export function planSnapshotRefresh(
  months: MonthlyData[],
  claims: InsuranceClaim[]
): SnapshotRefresh[] {
  const locked = new Set(months.filter((data) => data.is_read_only).map((data) => data.month));
  const isLocked = (month: string) => locked.has(month);
  return months
    .filter((data) => data.is_read_only && data.insurance_snapshot)
    .map((data) => {
      const relevant = claims.filter((c) => getClaimBudgetMonths(c, isLocked).has(data.month));
      const rebuilt = buildVirtualInsuranceEntries(relevant, data.month, isLocked);
      const before = data.insurance_snapshot!;
      return {
        month: data.month,
        before: totals(before),
        after: totals(rebuilt),
        changed: JSON.stringify(before) !== JSON.stringify(rebuilt),
        data: { ...data, insurance_snapshot: rebuilt },
      };
    });
}

// ============================================================================
// Command line
// ============================================================================

const KIND_TITLES: Record<CleanupChangeKind, string> = {
  marked_received: 'Approved earlier, now marked received',
  denied_zeroed: 'Denied, amount set to $0',
  received_date_filled: 'Received date filled in',
  amount_recalculated: 'Later plans now claim what is left',
  status_changed: 'Claim status corrected',
};

function line(note: { claim_number: number; plan_name?: string; amount?: number; detail: string }) {
  const parts = [`#${note.claim_number}`.padEnd(5), (note.plan_name ?? '').padEnd(18)];
  if (note.amount !== undefined) parts.push(money(note.amount).padStart(10));
  parts.push(note.detail);
  return `  ${parts.join('  ')}`;
}

function report(plan: CleanupPlan, log: (s: string) => void) {
  for (const kind of Object.keys(KIND_TITLES) as CleanupChangeKind[]) {
    const group = plan.changes.filter((c) => c.kind === kind);
    if (group.length === 0) continue;
    const sum = group.reduce((s, c) => s + (c.amount ?? 0), 0);
    const showSum = kind === 'marked_received' || kind === 'denied_zeroed';
    log(`\n${KIND_TITLES[kind]} (${group.length})${showSum ? `: ${money(sum)}` : ''}`);
    group.forEach((c) => log(line(c)));
  }
  if (plan.awaitingPayment.length > 0) {
    const sum = plan.awaitingPayment.reduce((s, c) => s + (c.amount ?? 0), 0);
    log(`\nStill awaiting payment, unchanged (${plan.awaitingPayment.length}): ${money(sum)}`);
    plan.awaitingPayment.forEach((c) => log(line(c)));
  }
  if (plan.exceptions.length > 0) {
    log(`\nNeeds your attention (${plan.exceptions.length})`);
    plan.exceptions.forEach((c) => log(line(c)));
  }
}

function parseArgs(argv: string[]) {
  const value = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    dataDir: value('--data-dir'),
    cutoff: value('--cutoff'),
    apply: argv.includes('--apply'),
    refreshSnapshots: argv.includes('--refresh-locked-snapshots'),
  };
}

const USAGE =
  'Usage: bun run api/src/scripts/cleanup-insurance-submissions.ts --data-dir <folder> ' +
  '--cutoff YYYY-MM-DD [--apply] [--refresh-locked-snapshots]';

export async function run(argv: string[], log: (s: string) => void = console.log): Promise<number> {
  const args = parseArgs(argv);
  if (!args.dataDir || !args.cutoff || !/^\d{4}-\d{2}-\d{2}$/.test(args.cutoff)) {
    log(USAGE);
    return 1;
  }

  StorageServiceImpl.initialize(args.dataDir);
  const storage = StorageServiceImpl.getInstance();
  const claims = (await storage.readJSON<InsuranceClaim[]>(CLAIMS_PATH)) ?? [];
  const plan = planInsuranceCleanup(claims, { cutoff: args.cutoff });

  log(`Insurance cleanup${args.apply ? '' : ' (dry run)'}: ${claims.length} claims`);
  log(`Data folder: ${args.dataDir}`);
  log(`Approvals decided before ${args.cutoff} count as received.`);
  report(plan, log);

  let snapshots: SnapshotRefresh[] = [];
  if (args.refreshSnapshots) {
    const months: MonthlyData[] = [];
    for (const file of await storage.listFiles('data/months')) {
      if (!file.endsWith('.json')) continue;
      const data = await storage.readJSON<MonthlyData>(`data/months/${file}`);
      if (data) months.push(data);
    }
    months.sort((a, b) => a.month.localeCompare(b.month));
    snapshots = planSnapshotRefresh(months, plan.claims).filter((s) => s.changed);
    log(`\nLocked months whose insurance snapshot would change (${snapshots.length})`);
    for (const s of snapshots) {
      log(
        `  ${s.month}  lines ${s.before.lines} → ${s.after.lines}  ` +
          `expected ${money(s.before.expected)} → ${money(s.after.expected)}  ` +
          `received ${money(s.before.received)} → ${money(s.after.received)}`
      );
    }
  }

  const changedClaims = plan.claims.filter(
    (c, i) => JSON.stringify(c) !== JSON.stringify(claims[i])
  ).length;
  if (changedClaims === 0 && snapshots.length === 0) {
    log('\nNothing to do.');
    return 0;
  }

  if (!args.apply) {
    log(`\nDry run: nothing was written. ${changedClaims} claims would change.`);
    log('Close the app, then re-run with --apply to save these changes.');
    return 0;
  }

  const backup = await VersionServiceImpl.getInstance().createManualBackup(
    'Before insurance submission cleanup'
  );
  log(`\nBackup saved: backups/${backup}`);
  if (changedClaims > 0) await storage.writeJSON(CLAIMS_PATH, plan.claims);
  for (const s of snapshots) await storage.writeJSON(`data/months/${s.month}.json`, s.data);
  log(`Saved ${changedClaims} claims and ${snapshots.length} locked months.`);
  return 0;
}

if (import.meta.main) {
  process.exit(await run(process.argv.slice(2)));
}
