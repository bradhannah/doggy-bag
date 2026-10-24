import { describe, test, expect } from 'bun:test';
import {
  blockingPlanName,
  deriveClaimStatus,
  getClaimBudgetMonths,
  getSubmissionBudgetDate,
  hasNothingLeftToClaim,
  recalculateDownstreamSubmissions,
  remainingToClaim,
} from './insurance-claims';
import type { ClaimStatus, ClaimSubmission, SubmissionStatus } from '../types';

function sub(
  status: SubmissionStatus,
  extra: Partial<ClaimSubmission> = {},
  name = 'Plan'
): ClaimSubmission {
  return {
    id: `${name}-${status}`,
    plan_id: name,
    plan_snapshot: { name },
    status,
    amount_claimed: 0,
    documents_sent: [],
    ...extra,
  };
}

function claim(submissions: ClaimSubmission[], extra = {}) {
  return {
    is_expected: false,
    service_date: '2026-09-02',
    total_amount: 13560,
    submissions,
    ...extra,
  };
}

describe('deriveClaimStatus', () => {
  test.each<[string, SubmissionStatus[], ClaimStatus]>([
    ['no plans', [], 'draft'],
    ['nothing submitted', ['draft'], 'draft'],
    ['new two-plan claim', ['draft', 'awaiting_previous'], 'draft'],
    ['submitted', ['pending', 'awaiting_previous'], 'in_progress'],
    ['approved, not received', ['approved'], 'in_progress'],
    ['received', ['paid'], 'closed'],
    ['denied', ['denied'], 'closed'],
    ['received and denied', ['paid', 'denied'], 'closed'],
    ['secondary still to send', ['paid', 'draft'], 'in_progress'],
  ])('%s', (_label, statuses, expected) => {
    const subs = statuses.map((s, i) =>
      sub(s, { amount_reimbursed: s === 'paid' || s === 'approved' ? 12400 : undefined }, `P${i}`)
    );
    expect(deriveClaimStatus(claim(subs))).toBe(expected);
  });

  test('expected claims stay expected', () => {
    expect(deriveClaimStatus(claim([], { is_expected: true }))).toBe('expected');
  });

  test('a secondary with nothing left to claim does not hold the claim open', () => {
    const subs = [sub('paid', { amount_reimbursed: 13560 }, 'A'), sub('draft', {}, 'B')];
    expect(hasNothingLeftToClaim(claim(subs), 1)).toBe(true);
    expect(deriveClaimStatus(claim(subs))).toBe('closed');
  });
});

describe('remainingToClaim', () => {
  test('subtracts approved and paid amounts, not denied or undecided', () => {
    const subs = [
      sub('paid', { amount_reimbursed: 10000 }, 'A'),
      sub('denied', { amount_reimbursed: 2000 }, 'B'),
      sub('pending', { amount_reimbursed: 500 }, 'C'),
      sub('draft', {}, 'D'),
    ];
    expect(remainingToClaim(claim(subs), 3)).toBe(3560);
  });

  test('never goes below zero', () => {
    const subs = [sub('approved', { amount_reimbursed: 20000 }, 'A'), sub('draft', {}, 'B')];
    expect(remainingToClaim(claim(subs), 1)).toBe(0);
  });
});

describe('recalculateDownstreamSubmissions', () => {
  test('activates the next plan with what is left', () => {
    const c = claim([
      sub('approved', { amount_reimbursed: 12400 }, 'Canada Life'),
      sub('awaiting_previous', {}, 'Empire Life'),
    ]);
    const changes = recalculateDownstreamSubmissions(c, { afterIndex: 0 });
    expect(c.submissions[1].status).toBe('draft');
    expect(c.submissions[1].amount_claimed).toBe(1160);
    expect(changes.map((ch) => ch.field)).toEqual(['status', 'amount_claimed']);
  });

  test('corrects a draft that claims the full amount (the #23 / #24 case)', () => {
    const c = claim([
      sub('approved', { amount_reimbursed: 12400 }, 'Canada Life'),
      sub('draft', { amount_claimed: 13560 }, 'Empire Life'),
    ]);
    recalculateDownstreamSubmissions(c, { afterIndex: 0 });
    expect(c.submissions[1].amount_claimed).toBe(1160);
  });

  test('a denied primary passes the full amount on', () => {
    const c = claim([
      sub('denied', { amount_reimbursed: 0 }, 'A'),
      sub('awaiting_previous', {}, 'B'),
    ]);
    recalculateDownstreamSubmissions(c, { afterIndex: 0 });
    expect(c.submissions[1].amount_claimed).toBe(13560);
  });

  test('demotes a draft only when asked', () => {
    const c = claim([sub('pending', {}, 'A'), sub('draft', { amount_claimed: 1160 }, 'B')]);
    expect(recalculateDownstreamSubmissions(c, { afterIndex: 0 })).toEqual([]);
    recalculateDownstreamSubmissions(c, { afterIndex: 0, demoteIfPreviousUndecided: true });
    expect(c.submissions[1].status).toBe('awaiting_previous');
    expect(c.submissions[1].amount_claimed).toBe(0);
  });

  test('leaves submitted and decided plans alone', () => {
    const c = claim([
      sub('approved', { amount_reimbursed: 12400 }, 'A'),
      sub('pending', { amount_claimed: 5000 }, 'B'),
    ]);
    recalculateDownstreamSubmissions(c, { afterIndex: -1 });
    expect(c.submissions[1].amount_claimed).toBe(5000);
  });

  test('running it twice changes nothing the second time', () => {
    const c = claim([sub('paid', { amount_reimbursed: 12400 }, 'A'), sub('draft', {}, 'B')]);
    recalculateDownstreamSubmissions(c, { afterIndex: -1 });
    expect(recalculateDownstreamSubmissions(c, { afterIndex: -1 })).toEqual([]);
  });
});

describe('blockingPlanName', () => {
  test('names the first earlier plan without a decision', () => {
    const c = claim([sub('pending', {}, 'Canada Life'), sub('awaiting_previous', {}, 'Empire')]);
    expect(blockingPlanName(c, 1)).toBe('Canada Life');
    expect(blockingPlanName(c, 0)).toBeUndefined();
  });
});

describe('Budget placement: money counts when it moves', () => {
  const service = { service_date: '2026-09-02' };

  test.each<[string, Partial<ClaimSubmission> & { status: SubmissionStatus }, string]>([
    [
      'received → date paid',
      { status: 'paid', date_paid: '2026-10-28', date_resolved: '2026-10-24' },
      '2026-10-28',
    ],
    [
      'received without a paid date → decision date',
      { status: 'paid', date_resolved: '2026-10-24' },
      '2026-10-24',
    ],
    ['approved → decision date', { status: 'approved', date_resolved: '2026-10-24' }, '2026-10-24'],
    ['approved without a date → service date', { status: 'approved' }, '2026-09-02'],
    ['denied → service date', { status: 'denied', date_resolved: '2026-11-01' }, '2026-09-02'],
    ['pending → service date', { status: 'pending', date_submitted: '2026-09-03' }, '2026-09-02'],
    ['draft → service date', { status: 'draft' }, '2026-09-02'],
    [
      'a date before the service month → service date',
      { status: 'paid', date_paid: '2026-08-15' },
      '2026-09-02',
    ],
  ])('%s', (_label, fields, expected) => {
    expect(getSubmissionBudgetDate(service, sub(fields.status, fields))).toBe(expected);
  });

  test('a claim touches its service month and each month money moves', () => {
    const c = claim([
      sub('approved', { amount_reimbursed: 12400, date_resolved: '2026-10-24' }, 'A'),
      sub('draft', {}, 'B'),
    ]);
    expect([...getClaimBudgetMonths(c)].sort()).toEqual(['2026-09', '2026-10']);
  });

  test('scheduled appointments only touch their own month', () => {
    const c = claim([], { is_expected: true, service_date: '2026-11-15' });
    expect([...getClaimBudgetMonths(c)]).toEqual(['2026-11']);
  });
});
