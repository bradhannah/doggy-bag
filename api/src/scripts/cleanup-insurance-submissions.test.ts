import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { planInsuranceCleanup, planSnapshotRefresh, run } from './cleanup-insurance-submissions';
import type { ClaimSubmission, InsuranceClaim, MonthlyData } from '../types';

const CUTOFF = '2026-10-24';

function sub(id: string, name: string, fields: Partial<ClaimSubmission>): ClaimSubmission {
  return {
    id,
    plan_id: id,
    plan_snapshot: { name },
    status: 'draft',
    amount_claimed: 0,
    documents_sent: [],
    ...fields,
  };
}

function claim(n: number, submissions: ClaimSubmission[], fields: Partial<InsuranceClaim> = {}) {
  return {
    id: `claim-${n}`,
    claim_number: n,
    family_member_id: 'fm',
    family_member_name: 'Brad',
    category_id: 'massage',
    category_name: 'Massage Therapy',
    service_date: '2026-09-02',
    total_amount: 13560,
    status: 'closed',
    documents: [],
    submissions,
    is_expected: false,
    bill_paid: true,
    created_at: '2026-09-02T00:00:00.000Z',
    updated_at: '2026-09-02T00:00:00.000Z',
    ...fields,
  } as InsuranceClaim;
}

// Mirrors the cases in the real data
const fixture = (): InsuranceClaim[] => [
  // An old approval: becomes received on its decision date
  claim(
    1,
    [
      sub('1cl', 'Canada Life AWS', {
        status: 'approved',
        amount_reimbursed: 11160,
        date_resolved: '2026-01-21',
      }),
    ],
    { service_date: '2026-01-10' }
  ),
  // An approval with no amount: reported, left alone
  claim(
    2,
    [
      sub('2cl', 'Canada Life AWS', {
        status: 'approved',
        amount_reimbursed: 11160,
        date_resolved: '2026-01-21',
      }),
      sub('2em', 'Empire Life', { status: 'approved', date_resolved: '2026-01-21' }),
    ],
    { service_date: '2026-01-10' }
  ),
  // Denied but still carrying an amount; and one with none
  claim(11, [
    sub('11cl', 'Canada Life AWS', {
      status: 'paid',
      amount_reimbursed: 0,
      date_paid: '2026-05-01',
    }),
    sub('11em', 'Empire Life', {
      status: 'denied',
      amount_reimbursed: 15000,
      date_resolved: '2026-05-02',
    }),
  ]),
  claim(13, [sub('13em', 'Empire Life', { status: 'denied', date_resolved: '2026-05-02' })]),
  // Approved on the cutoff: still waiting for the money; the secondary claims the full amount
  claim(23, [
    sub('23cl', 'Canada Life AWS', {
      status: 'approved',
      amount_reimbursed: 12400,
      date_resolved: CUTOFF,
    }),
    sub('23em', 'Empire Life', { status: 'draft', amount_claimed: 13560 }),
  ]),
  // An approval with no decision date: received on the service date
  claim(16, [sub('16cl', 'Canada Life AWS', { status: 'approved', amount_reimbursed: 5000 })], {
    service_date: '2026-07-01',
  }),
  // Already received with its own date: untouched
  claim(9, [
    sub('9cl', 'Canada Life AWS', {
      status: 'paid',
      amount_reimbursed: 9000,
      date_resolved: '2026-03-20',
      date_paid: '2026-03-29',
    }),
  ]),
  // A scheduled appointment: never touched
  claim(0, [], {
    id: 'expected',
    is_expected: true,
    status: 'expected',
    service_date: '2026-11-15',
  }),
];

describe('planInsuranceCleanup', () => {
  const plan = planInsuranceCleanup(fixture(), { cutoff: CUTOFF, now: '2026-10-24T12:00:00.000Z' });
  const byNumber = (n: number) => plan.claims.find((c) => c.claim_number === n)!;
  const kinds = (kind: string) => plan.changes.filter((c) => c.kind === kind);

  test('old approvals become received on their decision date, or the service date', () => {
    expect(byNumber(1).submissions[0]).toMatchObject({ status: 'paid', date_paid: '2026-01-21' });
    expect(byNumber(16).submissions[0]).toMatchObject({ status: 'paid', date_paid: '2026-07-01' });
    expect(kinds('marked_received').map((c) => c.claim_number)).toEqual([1, 2, 16]);
  });

  test('approvals on or after the cutoff stay awaiting payment', () => {
    expect(byNumber(23).submissions[0].status).toBe('approved');
    expect(plan.awaitingPayment.map((n) => n.claim_number)).toEqual([23]);
  });

  test('an approval with no amount is reported and left alone', () => {
    expect(byNumber(2).submissions[1]).toMatchObject({ status: 'approved' });
    expect(byNumber(2).submissions[1].amount_reimbursed).toBeUndefined();
    expect(plan.exceptions).toHaveLength(1);
    expect(plan.exceptions[0]).toMatchObject({ claim_number: 2, plan_name: 'Empire Life' });
    expect(byNumber(2).status).toBe('in_progress');
  });

  test('denied submissions are set to $0', () => {
    expect(byNumber(11).submissions[1].amount_reimbursed).toBe(0);
    expect(byNumber(13).submissions[0].amount_reimbursed).toBe(0);
    expect(kinds('denied_zeroed').map((c) => c.amount)).toEqual([15000, 0]);
  });

  test('the secondary claims what is left after the primary', () => {
    expect(byNumber(23).submissions[1].amount_claimed).toBe(1160);
    expect(kinds('amount_recalculated')).toHaveLength(1);
  });

  test('claim status follows the submissions', () => {
    expect(byNumber(23).status).toBe('in_progress');
    expect(byNumber(1).status).toBe('closed');
  });

  test('received dates already set and scheduled appointments are left alone', () => {
    expect(byNumber(9).submissions[0].date_paid).toBe('2026-03-29');
    expect(byNumber(9).updated_at).toBe('2026-09-02T00:00:00.000Z');
    expect(byNumber(0)).toEqual(fixture().find((c) => c.is_expected)!);
  });

  test('running it again changes nothing', () => {
    const again = planInsuranceCleanup(plan.claims, { cutoff: CUTOFF });
    expect(again.changes).toEqual([]);
    expect(again.claims).toEqual(plan.claims);
  });
});

describe('planSnapshotRefresh', () => {
  test('rebuilds locked snapshots under the new month rules and skips unlocked months', () => {
    const claims = planInsuranceCleanup(fixture(), { cutoff: CUTOFF }).claims;
    const month = (m: string, locked: boolean): MonthlyData => ({
      month: m,
      bill_instances: [],
      income_instances: [],
      variable_expenses: [],
      free_flowing_expenses: [],
      bank_balances: {},
      is_read_only: locked,
      insurance_snapshot: locked ? { billInstances: [], incomeInstances: [] } : undefined,
      created_at: '',
      updated_at: '',
    });
    const refreshes = planSnapshotRefresh(
      [month('2026-01', true), month('2026-02', false)],
      claims
    );
    expect(refreshes.map((r) => r.month)).toEqual(['2026-01']);
    expect(refreshes[0].before.received).toBe(0);
    // #1 Canada Life and #2 Canada Life were received in January
    expect(refreshes[0].after.received).toBe(22320);
    expect(refreshes[0].changed).toBe(true);
  });
});

describe('run', () => {
  let dir: string;
  const claimsFile = () => join(dir, 'entities', 'insurance-claims.json');

  beforeEach(async () => {
    dir = join(tmpdir(), `insurance-cleanup-${Date.now()}-${Math.random()}`);
    await mkdir(join(dir, 'entities'), { recursive: true });
    await mkdir(join(dir, 'months'), { recursive: true });
    await writeFile(claimsFile(), JSON.stringify(fixture(), null, 2));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test('a dry run reports and writes nothing', async () => {
    const before = await readFile(claimsFile(), 'utf8');
    const out: string[] = [];
    expect(await run(['--data-dir', dir, '--cutoff', CUTOFF], (s) => out.push(s))).toBe(0);
    expect(await readFile(claimsFile(), 'utf8')).toBe(before);
    expect(out.join('\n')).toContain('Dry run: nothing was written');
    expect(out.join('\n')).toContain('Needs your attention (1)');
  });

  test('--apply backs up first, then saves; a second run has nothing to do', async () => {
    expect(await run(['--data-dir', dir, '--cutoff', CUTOFF, '--apply'], () => {})).toBe(0);
    const backups = await readdir(join(dir, 'backups'));
    expect(backups.some((f) => f.startsWith('manual_'))).toBe(true);
    const saved = JSON.parse(await readFile(claimsFile(), 'utf8')) as InsuranceClaim[];
    expect(saved.find((c) => c.claim_number === 23)!.submissions[1].amount_claimed).toBe(1160);

    const out: string[] = [];
    await run(['--data-dir', dir, '--cutoff', CUTOFF, '--apply'], (s) => out.push(s));
    expect(out.join('\n')).toContain('Nothing to do.');
    expect((await readdir(join(dir, 'backups'))).length).toBe(backups.length);
  });

  test('missing arguments print usage', async () => {
    const out: string[] = [];
    expect(await run(['--data-dir', dir], (s) => out.push(s))).toBe(1);
    expect(out[0]).toContain('Usage');
  });
});
