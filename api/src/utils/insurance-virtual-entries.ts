// Virtual Budget entries for insurance claims.
// They are never stored: the Budget builds them from the claims each time a month loads.
//
// - The clinic bill sits in the service month.
// - Each plan's reimbursement sits in the month money moves (see getSubmissionBudgetDate):
//   received → month paid, approved → month decided, everything else → service month.
// - Money still on its way (submitted, or approved but unpaid) sits in the newest open month,
//   dated the 1st when carried, showing the amount expected (claimed while submitted, approved
//   amount once decided). Creating a new month or locking one carries it forward.
// - Before any plan decides, a claim with an estimate shows one estimated line instead.

import type { BillInstance, IncomeInstance, InsuranceClaim, Occurrence } from '../types';
import {
  blockingPlanName,
  getEstimateBudgetMonth,
  getSubmissionBudgetDate,
  getSubmissionBudgetMonth,
  hasNothingLeftToClaim,
  isDecided,
  monthOf,
} from './insurance-claims';
import { emptyLedger, type MonthLedger } from './locked-months';

/** "#{claim_number} {category} - {provider}"; expected claims have no number yet. */
function claimLabel(claim: InsuranceClaim): string {
  const prefix = claim.claim_number > 0 ? `#${claim.claim_number} ` : '';
  return claim.provider_name
    ? `${prefix}${claim.category_name} - ${claim.provider_name}`
    : `${prefix}${claim.category_name}`;
}

function billInstance(
  claim: InsuranceClaim,
  month: string,
  amount: number,
  paid: { is_closed: boolean; closed_date?: string }
): BillInstance {
  return {
    id: `virtual-bill-${claim.id}`,
    bill_id: null,
    month,
    billing_period: 'monthly',
    expected_amount: amount,
    occurrences: [
      {
        id: `virtual-occ-bill-${claim.id}`,
        sequence: 1,
        expected_date: claim.service_date,
        expected_amount: amount,
        is_closed: paid.is_closed,
        closed_date: paid.closed_date,
        is_adhoc: false,
        created_at: claim.created_at,
        updated_at: claim.updated_at,
      },
    ],
    is_default: false,
    is_closed: paid.is_closed,
    is_adhoc: true,
    is_insurance_expense: true,
    is_expected_claim: claim.is_expected,
    is_virtual: true,
    claim_id: claim.id,
    name: claimLabel(claim),
    category_id: claim.category_id,
    payment_source_id: claim.payment_source_id,
    created_at: claim.created_at,
    updated_at: claim.updated_at,
  };
}

function incomeInstance(
  claim: InsuranceClaim,
  month: string,
  occurrences: Occurrence[]
): IncomeInstance {
  return {
    id: `virtual-income-${claim.id}`,
    income_id: null,
    month,
    billing_period: 'monthly',
    expected_amount: occurrences.reduce((sum, occ) => sum + occ.expected_amount, 0),
    occurrences,
    is_default: false,
    is_closed: occurrences.every((occ) => occ.is_closed),
    is_adhoc: true,
    is_insurance_reimbursement: true,
    is_expected_claim: claim.is_expected,
    is_virtual: true,
    claim_id: claim.id,
    name: claimLabel(claim),
    created_at: claim.created_at,
    updated_at: claim.updated_at,
  };
}

function estimateOccurrence(
  claim: InsuranceClaim,
  id: string,
  amount: number,
  date: string = claim.service_date
): Occurrence {
  return {
    id,
    sequence: 1,
    expected_date: date,
    expected_amount: amount,
    is_closed: false,
    is_adhoc: false,
    created_at: claim.created_at,
    updated_at: claim.updated_at,
    claim_id: claim.id,
    is_insurance_estimate: true,
  };
}

/** The date a line carried into a later month sits on: the 1st, so it never drifts. */
function dateIn(month: string, date: string): string {
  return monthOf(date) === month ? date : `${month}-01`;
}

/** One reimbursement line per plan whose money lands in `month`. */
function submissionOccurrences(
  claim: InsuranceClaim,
  month: string,
  ledger: MonthLedger
): Occurrence[] {
  const occurrences: Occurrence[] = [];
  claim.submissions.forEach((submission, index) => {
    if (hasNothingLeftToClaim(claim, index)) return;
    if (getSubmissionBudgetMonth(claim, submission, ledger) !== month) return;
    const date = dateIn(month, getSubmissionBudgetDate(claim, submission));

    const hasMoney = submission.status === 'approved' || submission.status === 'paid';
    const isClosed = submission.status === 'paid' || submission.status === 'denied';
    const expectedAmount =
      submission.status === 'pending'
        ? submission.amount_claimed
        : hasMoney
          ? (submission.amount_reimbursed ?? 0)
          : 0;
    occurrences.push({
      id: `virtual-occ-income-${claim.id}-${submission.id}`,
      sequence: occurrences.length + 1,
      expected_date: date,
      expected_amount: expectedAmount,
      is_closed: isClosed,
      closed_date:
        submission.status === 'paid'
          ? date
          : submission.status === 'denied'
            ? (submission.date_resolved ?? claim.service_date)
            : undefined,
      is_adhoc: false,
      created_at: claim.created_at,
      updated_at: claim.updated_at,
      plan_name: submission.plan_snapshot?.name ?? 'Insurance',
      claim_id: claim.id,
      claim_submission_id: submission.id,
      submission_status: submission.status,
      awaiting_plan_name:
        submission.status === 'awaiting_previous' ? blockingPlanName(claim, index) : undefined,
      amount_missing:
        hasMoney && typeof submission.amount_reimbursed !== 'number' ? true : undefined,
    });
  });
  return occurrences;
}

export function buildVirtualInsuranceEntries(
  claims: InsuranceClaim[],
  month: string,
  ledger: MonthLedger = emptyLedger
): { billInstances: BillInstance[]; incomeInstances: IncomeInstance[] } {
  const billInstances: BillInstance[] = [];
  const incomeInstances: IncomeInstance[] = [];

  for (const claim of claims) {
    const inServiceMonth = monthOf(claim.service_date) === month;

    if (claim.is_expected) {
      if (!inServiceMonth) continue;
      billInstances.push(
        billInstance(claim, month, claim.expected_cost ?? 0, { is_closed: false })
      );
      const estimate = claim.expected_reimbursement ?? 0;
      if (estimate > 0) {
        incomeInstances.push(
          incomeInstance(claim, month, [
            estimateOccurrence(claim, `virtual-occ-income-${claim.id}`, estimate),
          ])
        );
      }
      continue;
    }

    if (inServiceMonth) {
      // Paid once marked paid, or once anything has been sent to an insurer
      const billIsPaid =
        claim.bill_paid || claim.status === 'in_progress' || claim.status === 'closed';
      billInstances.push(
        billInstance(claim, month, claim.total_amount, {
          is_closed: billIsPaid,
          closed_date: billIsPaid
            ? claim.bill_paid
              ? (claim.bill_paid_date ?? claim.service_date)
              : claim.service_date
            : undefined,
        })
      );
    }

    const nothingDecided = !claim.submissions.some((s) => isDecided(s.status));
    const estimate = claim.expected_reimbursement ?? 0;
    const occurrences =
      nothingDecided && estimate > 0
        ? getEstimateBudgetMonth(claim, ledger) === month
          ? [
              estimateOccurrence(
                claim,
                `virtual-occ-income-expected-${claim.id}`,
                estimate,
                dateIn(month, claim.service_date)
              ),
            ]
          : []
        : submissionOccurrences(claim, month, ledger);

    if (occurrences.length > 0) {
      incomeInstances.push(incomeInstance(claim, month, occurrences));
    }
  }

  return { billInstances, incomeInstances };
}
