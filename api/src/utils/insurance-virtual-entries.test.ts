import { describe, test, expect } from 'bun:test';
import { buildVirtualInsuranceEntries } from './insurance-virtual-entries';
import { deriveClaimStatus } from './insurance-claims';
import type { ClaimSubmission, InsuranceClaim } from '../types';

function submission(id: string, name: string, fields: Partial<ClaimSubmission>): ClaimSubmission {
  return {
    id,
    plan_id: `plan-${id}`,
    plan_snapshot: { name },
    status: 'draft',
    amount_claimed: 0,
    documents_sent: [],
    ...fields,
  };
}

function makeClaim(fields: Partial<InsuranceClaim> & { submissions: ClaimSubmission[] }) {
  const claim: InsuranceClaim = {
    id: 'claim-23',
    claim_number: 23,
    family_member_id: 'fm',
    family_member_name: 'Brad',
    category_id: 'massage',
    category_name: 'Massage Therapy',
    provider_name: 'KTown Victoria',
    service_date: '2026-09-02',
    total_amount: 13560,
    status: 'draft',
    documents: [],
    is_expected: false,
    bill_paid: true,
    bill_paid_date: '2026-09-02',
    created_at: '2026-09-02T12:00:00.000Z',
    updated_at: '2026-10-24T12:00:00.000Z',
    ...fields,
  };
  claim.status = deriveClaimStatus(claim);
  return claim;
}

// #23: Canada Life approved $124 on Oct 24, Empire Life not submitted yet
const claim23 = () =>
  makeClaim({
    submissions: [
      submission('cl', 'Canada Life AWS', {
        status: 'approved',
        amount_claimed: 13560,
        amount_reimbursed: 12400,
        date_submitted: '2026-09-03',
        date_resolved: '2026-10-24',
      }),
      submission('em', 'Empire Life', { status: 'draft', amount_claimed: 1160 }),
    ],
  });

describe('buildVirtualInsuranceEntries', () => {
  test('the bill and the undecided plan stay in the service month', () => {
    const { billInstances, incomeInstances } = buildVirtualInsuranceEntries([claim23()], '2026-09');
    expect(billInstances).toHaveLength(1);
    expect(billInstances[0].expected_amount).toBe(13560);
    expect(billInstances[0].is_closed).toBe(true);

    expect(incomeInstances).toHaveLength(1);
    const [line] = incomeInstances[0].occurrences;
    expect(incomeInstances[0].occurrences).toHaveLength(1);
    expect(line.plan_name).toBe('Empire Life');
    expect(line.submission_status).toBe('draft');
    expect(line.expected_amount).toBe(0);
    expect(line.is_closed).toBe(false);
    expect(incomeInstances[0].expected_amount).toBe(0);
  });

  test('the approved money counts in the month it was approved', () => {
    const { billInstances, incomeInstances } = buildVirtualInsuranceEntries([claim23()], '2026-10');
    expect(billInstances).toHaveLength(0);
    expect(incomeInstances).toHaveLength(1);
    const [line] = incomeInstances[0].occurrences;
    expect(line.id).toBe('virtual-occ-income-claim-23-cl');
    expect(line.sequence).toBe(1);
    expect(line.expected_date).toBe('2026-10-24');
    expect(line.expected_amount).toBe(12400);
    expect(line.submission_status).toBe('approved');
    expect(line.is_closed).toBe(false);
    expect(incomeInstances[0].name).toBe('#23 Massage Therapy - KTown Victoria');
  });

  test('received money moves to the month it arrived, closed on that date', () => {
    const claim = claim23();
    claim.submissions[0] = { ...claim.submissions[0], status: 'paid', date_paid: '2026-11-03' };
    expect(buildVirtualInsuranceEntries([claim], '2026-10').incomeInstances).toHaveLength(0);
    const [line] = buildVirtualInsuranceEntries([claim], '2026-11').incomeInstances[0].occurrences;
    expect(line.is_closed).toBe(true);
    expect(line.closed_date).toBe('2026-11-03');
    expect(line.expected_amount).toBe(12400);
  });

  test('a month with no lines for the claim gets no income item', () => {
    const { billInstances, incomeInstances } = buildVirtualInsuranceEntries([claim23()], '2026-12');
    expect(billInstances).toHaveLength(0);
    expect(incomeInstances).toHaveLength(0);
  });

  test('a denial sits beside the bill, closed at $0', () => {
    const claim = makeClaim({
      submissions: [
        submission('em', 'Empire Life', {
          status: 'denied',
          amount_reimbursed: 0,
          date_resolved: '2026-11-01',
        }),
      ],
    });
    const [line] = buildVirtualInsuranceEntries([claim], '2026-09').incomeInstances[0].occurrences;
    expect(line.expected_amount).toBe(0);
    expect(line.is_closed).toBe(true);
    expect(line.closed_date).toBe('2026-11-01');
  });

  test('a waiting plan names the plan it waits on', () => {
    const claim = makeClaim({
      submissions: [
        submission('cl', 'Canada Life AWS', { status: 'pending', amount_claimed: 13560 }),
        submission('em', 'Empire Life', { status: 'awaiting_previous' }),
      ],
    });
    const lines = buildVirtualInsuranceEntries([claim], '2026-09').incomeInstances[0].occurrences;
    expect(lines.map((l) => l.sequence)).toEqual([1, 2]);
    expect(lines[1].awaiting_plan_name).toBe('Canada Life AWS');
  });

  test('before any decision an estimate replaces the per-plan lines', () => {
    const claim = makeClaim({
      expected_reimbursement: 12400,
      submissions: [submission('cl', 'Canada Life AWS', { status: 'pending' })],
    });
    const [line] = buildVirtualInsuranceEntries([claim], '2026-09').incomeInstances[0].occurrences;
    expect(line.is_insurance_estimate).toBe(true);
    expect(line.expected_amount).toBe(12400);
  });

  test('a plan with nothing left to claim gets no line', () => {
    const claim = makeClaim({
      submissions: [
        submission('cl', 'Canada Life AWS', {
          status: 'paid',
          amount_reimbursed: 13560,
          date_paid: '2026-09-20',
        }),
        submission('em', 'Empire Life', { status: 'draft' }),
      ],
    });
    const lines = buildVirtualInsuranceEntries([claim], '2026-09').incomeInstances[0].occurrences;
    expect(lines.map((l) => l.plan_name)).toEqual(['Canada Life AWS']);
  });

  test('a new claim with nothing sent leaves its bill unpaid unless marked paid', () => {
    const claim = makeClaim({
      bill_paid: false,
      bill_paid_date: undefined,
      submissions: [
        submission('cl', 'Canada Life AWS', { status: 'draft', amount_claimed: 13560 }),
        submission('em', 'Empire Life', { status: 'awaiting_previous' }),
      ],
    });
    expect(claim.status).toBe('draft');
    const [bill] = buildVirtualInsuranceEntries([claim], '2026-09').billInstances;
    expect(bill.is_closed).toBe(false);
  });

  test('scheduled appointments show their estimate in the appointment month only', () => {
    const scheduled = makeClaim({
      claim_number: 0,
      is_expected: true,
      service_date: '2026-11-15',
      expected_cost: 13560,
      expected_reimbursement: 12400,
      submissions: [],
    });
    const november = buildVirtualInsuranceEntries([scheduled], '2026-11');
    expect(november.billInstances[0].expected_amount).toBe(13560);
    expect(november.billInstances[0].is_expected_claim).toBe(true);
    expect(november.incomeInstances[0].expected_amount).toBe(12400);
    expect(november.incomeInstances[0].name).toBe('Massage Therapy - KTown Victoria');
    expect(buildVirtualInsuranceEntries([scheduled], '2026-12').billInstances).toHaveLength(0);
  });

  test('an approval saved without an amount is flagged, not shown as $0 owed', () => {
    const claim = makeClaim({
      submissions: [
        submission('em', 'Empire Life', { status: 'approved', date_resolved: '2026-10-01' }),
      ],
    });
    const [line] = buildVirtualInsuranceEntries([claim], '2026-10').incomeInstances[0].occurrences;
    expect(line.amount_missing).toBe(true);
    expect(line.expected_amount).toBe(0);
  });

  describe('money still on its way is carried past locked months', () => {
    const locked =
      (...months: string[]) =>
      (month: string) =>
        months.includes(month);
    const submitted = () =>
      makeClaim({
        submissions: [
          submission('cl', 'Canada Life AWS', {
            status: 'paid',
            amount_claimed: 13560,
            amount_reimbursed: 12400,
            date_paid: '2026-09-20',
          }),
          submission('em', 'Empire Life', {
            status: 'pending',
            amount_claimed: 1160,
            date_submitted: '2026-09-25',
          }),
        ],
      });

    test('a submitted plan shows the amount claimed in its service month', () => {
      const lines = buildVirtualInsuranceEntries([submitted()], '2026-09').incomeInstances[0]
        .occurrences;
      const empire = lines.find((l) => l.plan_name === 'Empire Life')!;
      expect(empire.submission_status).toBe('pending');
      expect(empire.expected_amount).toBe(1160);
      expect(empire.expected_date).toBe('2026-09-02');
      expect(empire.is_closed).toBe(false);
    });

    test('once the service month is locked, the submitted plan lands in the next open month on the 1st', () => {
      const isLocked = locked('2026-09');
      const september = buildVirtualInsuranceEntries([submitted()], '2026-09', isLocked);
      expect(september.incomeInstances[0].occurrences.map((l) => l.plan_name)).toEqual([
        'Canada Life AWS',
      ]);

      const october = buildVirtualInsuranceEntries([submitted()], '2026-10', isLocked);
      expect(october.billInstances).toHaveLength(0);
      const [line] = october.incomeInstances[0].occurrences;
      expect(line.plan_name).toBe('Empire Life');
      expect(line.expected_amount).toBe(1160);
      expect(line.expected_date).toBe('2026-10-01');
    });

    test('an approval awaiting payment rolls forward too, keeping its approved amount', () => {
      const isLocked = locked('2026-10');
      const november = buildVirtualInsuranceEntries([claim23()], '2026-11', isLocked);
      const [line] = november.incomeInstances[0].occurrences;
      expect(line.plan_name).toBe('Canada Life AWS');
      expect(line.submission_status).toBe('approved');
      expect(line.expected_amount).toBe(12400);
      expect(line.expected_date).toBe('2026-11-01');
      expect(
        buildVirtualInsuranceEntries([claim23()], '2026-10', isLocked).incomeInstances
      ).toHaveLength(0);
    });

    test('received money stays in the month it arrived even when that month is locked', () => {
      const isLocked = locked('2026-09');
      const [line] = buildVirtualInsuranceEntries([submitted()], '2026-09', isLocked)
        .incomeInstances[0].occurrences;
      expect(line.plan_name).toBe('Canada Life AWS');
      expect(line.is_closed).toBe(true);
    });

    test('a pre-decision estimate follows the submitted claim into the next open month', () => {
      const claim = makeClaim({
        expected_reimbursement: 12400,
        submissions: [submission('cl', 'Canada Life AWS', { status: 'pending' })],
      });
      const isLocked = locked('2026-09');
      expect(
        buildVirtualInsuranceEntries([claim], '2026-09', isLocked).incomeInstances
      ).toHaveLength(0);
      const [line] = buildVirtualInsuranceEntries([claim], '2026-10', isLocked).incomeInstances[0]
        .occurrences;
      expect(line.is_insurance_estimate).toBe(true);
      expect(line.expected_amount).toBe(12400);
      expect(line.expected_date).toBe('2026-10-01');
    });
  });
});
