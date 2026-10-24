import { describe, it, expect } from 'vitest';
import {
  getClaimHeadline,
  getClaimMoney,
  getNextStep,
  getPlanStage,
  getPlanTasks,
  isMissingAmount,
  planRole,
} from './claim-progress';
import { getInsuranceLineDisplay } from './budget-line-status';
import type { ClaimSubmission, InsuranceClaim } from '../../types/insurance';
import type { Occurrence } from '../../stores/detailed-month';

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

function claim(
  submissions: ClaimSubmission[],
  fields: Partial<InsuranceClaim> = {}
): InsuranceClaim {
  return {
    id: 'c23',
    claim_number: 23,
    family_member_id: 'fm',
    family_member_name: 'Brad',
    category_id: 'massage',
    category_name: 'Massage Therapy',
    service_date: '2026-09-02',
    total_amount: 13560,
    status: 'in_progress',
    documents: [],
    submissions,
    is_expected: false,
    bill_paid: true,
    created_at: '',
    updated_at: '',
    ...fields,
  };
}

// #23 today: Canada Life approved $124, Empire Life ready to claim $11.60
const claim23 = () =>
  claim([
    sub('cl', 'Canada Life AWS', {
      status: 'approved',
      amount_claimed: 13560,
      amount_reimbursed: 12400,
    }),
    sub('em', 'Empire Life', { status: 'draft', amount_claimed: 1160 }),
  ]);

describe('getPlanStage', () => {
  it('follows each plan through the claim', () => {
    const c = claim23();
    expect(getPlanStage(c, 0)).toBe('awaiting_payment');
    expect(getPlanStage(c, 1)).toBe('to_submit');
  });

  it('a secondary waits until the primary decides', () => {
    const c = claim([
      sub('cl', 'Canada Life AWS', { status: 'pending' }),
      sub('em', 'Empire Life', { status: 'awaiting_previous' }),
    ]);
    expect(getPlanStage(c, 0)).toBe('submitted');
    expect(getPlanStage(c, 1)).toBe('waiting');
  });

  it('nothing is left when the primary covered the whole cost', () => {
    const c = claim([
      sub('cl', 'Canada Life AWS', { status: 'paid', amount_reimbursed: 13560 }),
      sub('em', 'Empire Life', { status: 'draft' }),
    ]);
    expect(getPlanStage(c, 1)).toBe('nothing_left');
  });

  it('names plans by their order', () => {
    expect([0, 1, 2].map(planRole)).toEqual(['Primary', 'Secondary', 'Plan 3']);
  });
});

describe('getClaimMoney', () => {
  it('splits approved, received and still owed', () => {
    expect(getClaimMoney(claim23())).toMatchObject({
      cost: 13560,
      approved: 12400,
      received: 0,
      owed: 12400,
      stillToClaim: 1160,
    });
  });
});

describe('getNextStep and getClaimHeadline', () => {
  it('submitting the secondary comes before chasing the payment', () => {
    const step = getNextStep(claim23());
    expect(step).toMatchObject({ kind: 'submit', index: 1, amount: 1160 });
    expect(getClaimHeadline(claim23())).toEqual({ label: 'To submit', tone: 'accent' });
  });

  it('once everything is sent, the next step is marking money received', () => {
    const c = claim23();
    c.submissions[1] = { ...c.submissions[1], status: 'denied', amount_reimbursed: 0 };
    expect(getNextStep(c)).toMatchObject({ kind: 'receive', index: 0, amount: 12400 });
    expect(getClaimHeadline(c).label).toBe('Awaiting payment');
  });

  it('scheduled appointments are converted first; closed claims have no next step', () => {
    expect(getNextStep(claim([], { is_expected: true, status: 'expected' }))).toEqual({
      kind: 'convert',
    });
    expect(
      getNextStep(
        claim([sub('cl', 'Canada Life AWS', { status: 'paid', amount_reimbursed: 100 })], {
          status: 'closed',
        })
      )
    ).toBeNull();
  });
});

describe('getPlanTasks', () => {
  it('lists each plan that needs something, with its amount', () => {
    const tasks = getPlanTasks([claim23()]);
    expect(tasks.map((t) => [t.stage, t.amount])).toEqual([
      ['awaiting_payment', 12400],
      ['to_submit', 1160],
    ]);
  });
});

describe('getInsuranceLineDisplay', () => {
  const occ = (fields: Partial<Occurrence>) => ({ expected_amount: 0, ...fields }) as Occurrence;

  it('undecided plans show a status instead of an amount', () => {
    expect(getInsuranceLineDisplay(occ({ submission_status: 'draft' }))).toMatchObject({
      label: 'Not submitted',
      showAmount: false,
    });
    expect(
      getInsuranceLineDisplay(
        occ({ submission_status: 'awaiting_previous', awaiting_plan_name: 'Canada Life AWS' })
      )!.label
    ).toBe('Waiting for Canada Life AWS');
  });

  it('decided plans show their amount', () => {
    expect(getInsuranceLineDisplay(occ({ submission_status: 'approved' }))).toMatchObject({
      label: 'Awaiting payment',
      showAmount: true,
    });
    expect(getInsuranceLineDisplay(occ({ submission_status: 'denied' }))!.tone).toBe('error');
  });

  it('old snapshot lines without a status keep the default display', () => {
    expect(getInsuranceLineDisplay(occ({}))).toBeNull();
  });
});

describe('approvals saved without an amount (claim #2)', () => {
  const claim2 = () =>
    claim([
      sub('cl', 'Canada Life AWS', {
        status: 'paid',
        amount_claimed: 13560,
        amount_reimbursed: 11160,
      }),
      sub('em', 'Empire Life', {
        status: 'approved',
        amount_claimed: 2000,
        date_resolved: '2026-03-01',
      }),
    ]);

  it('is flagged, put first, and listed under Needs attention', () => {
    const c = claim2();
    expect(isMissingAmount(c.submissions[1])).toBe(true);
    expect(isMissingAmount(c.submissions[0])).toBe(false);
    expect(getClaimHeadline(c)).toEqual({ label: 'Needs an amount', tone: 'error' });
    expect(getNextStep(c)).toMatchObject({ kind: 'enter_amount', index: 1 });
    expect(getPlanTasks([c]).map((t) => [t.stage, t.amount])).toEqual([['needs_amount', 2000]]);
  });

  it('a denial is never missing an amount', () => {
    expect(isMissingAmount(sub('em', 'Empire Life', { status: 'denied' }))).toBe(false);
  });

  it('the Budget line says the amount is missing instead of showing $0', () => {
    const line = { expected_amount: 0, submission_status: 'approved', amount_missing: true };
    expect(getInsuranceLineDisplay(line as Occurrence)).toEqual({
      label: 'Amount missing',
      tone: 'error',
      showAmount: false,
    });
  });
});
