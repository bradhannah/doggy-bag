// Insurance claim rules shared by the claims service, the Budget's virtual
// insurance lines, the calendar and the data cleanup script.
// Pure functions only: no storage access.

import type { ClaimStatus, ClaimSubmission, InsuranceClaim, SubmissionStatus } from '../types';
import { emptyLedger, type MonthLedger } from './locked-months';

type ClaimLike = Pick<InsuranceClaim, 'is_expected' | 'service_date' | 'total_amount'> & {
  submissions: ClaimSubmission[];
};

/** The insurer has answered: approved (money owed), paid (money received) or denied. */
export function isDecided(status: SubmissionStatus): boolean {
  return status === 'approved' || status === 'paid' || status === 'denied';
}

/** Nothing more will happen: the money arrived, or none is coming. */
export function isSettled(status: SubmissionStatus): boolean {
  return status === 'paid' || status === 'denied';
}

/** Not sent to the insurer yet. */
export function isUnsubmitted(status: SubmissionStatus): boolean {
  return status === 'draft' || status === 'awaiting_previous';
}

function earlierAllDecided(claim: ClaimLike, index: number): boolean {
  return claim.submissions.slice(0, index).every((s) => isDecided(s.status));
}

/**
 * What submission `index` should claim: the claim total minus what earlier plans
 * approved or paid. Denied and undecided plans contribute nothing.
 */
export function remainingToClaim(claim: ClaimLike, index: number): number {
  const covered = claim.submissions
    .slice(0, index)
    .filter((s) => s.status === 'approved' || s.status === 'paid')
    .reduce((sum, s) => sum + (s.amount_reimbursed ?? 0), 0);
  return Math.max(0, claim.total_amount - covered);
}

/**
 * An unsubmitted plan whose earlier plans have all decided and left nothing over.
 * There is nothing to send it, so it never holds a claim open.
 */
export function hasNothingLeftToClaim(claim: ClaimLike, index: number): boolean {
  const submission = claim.submissions[index];
  return (
    isUnsubmitted(submission.status) &&
    index > 0 &&
    earlierAllDecided(claim, index) &&
    remainingToClaim(claim, index) === 0
  );
}

/**
 * Claim status from its submissions:
 * - expected: a scheduled appointment, not a claim yet
 * - draft: nothing has been sent to an insurer
 * - closed: every plan has paid or denied (or has nothing left to claim)
 * - in_progress: anything else, including approved money that hasn't arrived
 */
export function deriveClaimStatus(claim: ClaimLike): ClaimStatus {
  if (claim.is_expected) return 'expected';
  const submissions = claim.submissions;
  if (submissions.every((s) => isUnsubmitted(s.status))) return 'draft';
  const closed = submissions.every(
    (s, index) => isSettled(s.status) || hasNothingLeftToClaim(claim, index)
  );
  return closed ? 'closed' : 'in_progress';
}

/** Name of the first earlier plan that hasn't decided yet, if any. */
export function blockingPlanName(claim: ClaimLike, index: number): string | undefined {
  const blocker = claim.submissions.slice(0, index).find((s) => !isDecided(s.status));
  return blocker?.plan_snapshot?.name;
}

export interface SubmissionAdjustment {
  submission_id: string;
  plan_name: string;
  field: 'status' | 'amount_claimed';
  from: SubmissionStatus | number;
  to: SubmissionStatus | number;
}

/**
 * Keep unsubmitted plans after `afterIndex` in step with the plans before them.
 * A plan whose earlier plans have all decided becomes a draft claiming the
 * remainder. With `demoteIfPreviousUndecided`, a draft whose earlier plan is no
 * longer decided goes back to waiting. Submitted plans are never touched.
 * Mutates `claim.submissions` and returns what changed.
 */
export function recalculateDownstreamSubmissions(
  claim: ClaimLike,
  options: { afterIndex: number; demoteIfPreviousUndecided?: boolean }
): SubmissionAdjustment[] {
  const adjustments: SubmissionAdjustment[] = [];
  const record = (
    submission: ClaimSubmission,
    field: SubmissionAdjustment['field'],
    to: SubmissionStatus | number
  ) => {
    const from = submission[field];
    if (from === to) return;
    adjustments.push({
      submission_id: submission.id,
      plan_name: submission.plan_snapshot?.name ?? 'Insurance',
      field,
      from,
      to,
    });
    if (field === 'status') submission.status = to as SubmissionStatus;
    else submission.amount_claimed = to as number;
  };

  for (let i = Math.max(0, options.afterIndex + 1); i < claim.submissions.length; i++) {
    const submission = claim.submissions[i];
    if (!isUnsubmitted(submission.status)) continue;

    if (earlierAllDecided(claim, i)) {
      record(submission, 'status', 'draft');
      record(submission, 'amount_claimed', remainingToClaim(claim, i));
    } else if (options.demoteIfPreviousUndecided && submission.status === 'draft') {
      record(submission, 'status', 'awaiting_previous');
      record(submission, 'amount_claimed', 0);
    }
  }
  return adjustments;
}

// ============================================================================
// Budget month placement: reimbursements count when money moves
// ============================================================================

function serviceDay(claim: Pick<InsuranceClaim, 'service_date'>): string {
  return claim.service_date.substring(0, 10);
}

export function monthOf(date: string): string {
  return date.substring(0, 7);
}

/**
 * The date a submission's Budget line sits on:
 * paid → when the money arrived, approved → when the insurer decided,
 * anything else (including denied, which moves no money) → the service date.
 * Never earlier than the service month.
 */
export function getSubmissionBudgetDate(
  claim: Pick<InsuranceClaim, 'service_date'>,
  submission: ClaimSubmission
): string {
  const service = serviceDay(claim);
  let date = service;
  if (submission.status === 'paid') {
    date = submission.date_paid ?? submission.date_resolved ?? service;
  } else if (submission.status === 'approved') {
    date = submission.date_resolved ?? service;
  }
  date = date.substring(0, 10);
  return monthOf(date) < monthOf(service) ? service : date;
}

export function nextMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, '0')}`;
}

/** Money that is still on its way: sent and awaiting a decision, or approved and not yet paid. */
export function isStillComing(status: SubmissionStatus): boolean {
  return status === 'pending' || status === 'approved';
}

/**
 * Where money still on its way is shown: the newest month (the one being worked on), never
 * earlier than `month` itself, and never a locked month. Creating a new month or locking
 * one is what carries it forward.
 */
export function carriedMonth(month: string, ledger: MonthLedger): string {
  let candidate = ledger.newest && ledger.newest > month ? ledger.newest : month;
  for (let i = 0; i < 240 && ledger.isLocked(candidate); i++) candidate = nextMonth(candidate);
  return candidate;
}

/**
 * The month a submission's Budget line sits in. Settled lines (paid, denied) and unsent
 * ones stay on their date. Money that is still coming is carried into the newest open month.
 */
export function getSubmissionBudgetMonth(
  claim: Pick<InsuranceClaim, 'service_date'>,
  submission: ClaimSubmission,
  ledger: MonthLedger = emptyLedger
): string {
  const month = monthOf(getSubmissionBudgetDate(claim, submission));
  return isStillComing(submission.status) ? carriedMonth(month, ledger) : month;
}

/**
 * Where a claim's estimate line sits while no plan has decided: the service month, carried
 * into the newest open month once something has been sent to an insurer.
 */
export function getEstimateBudgetMonth(claim: ClaimLike, ledger: MonthLedger): string {
  const month = monthOf(serviceDay(claim));
  const sent = claim.submissions.some((s) => s.status === 'pending');
  return sent ? carriedMonth(month, ledger) : month;
}

/** Months whose Budget shows something from this claim. */
export function getClaimBudgetMonths(
  claim: ClaimLike,
  ledger: MonthLedger = emptyLedger
): Set<string> {
  const months = new Set<string>([monthOf(serviceDay(claim))]);
  if (!claim.is_expected) {
    months.add(getEstimateBudgetMonth(claim, ledger));
    for (const submission of claim.submissions) {
      months.add(getSubmissionBudgetMonth(claim, submission, ledger));
    }
  }
  return months;
}
