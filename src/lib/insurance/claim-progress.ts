// Where each insurance plan stands on a claim, and what to do next.
// Mirrors the claim rules in api/src/utils/insurance-claims.ts.

import type { ClaimSubmission, InsuranceClaim, SubmissionStatus } from '../../types/insurance';

export type PlanStage =
  | 'waiting' // an earlier plan hasn't decided yet
  | 'to_submit' // ready to send to the insurer
  | 'nothing_left' // earlier plans covered everything
  | 'submitted' // sent, no decision yet
  | 'awaiting_payment' // approved, money not received
  | 'received'
  | 'denied';

export type Tone = 'neutral' | 'accent' | 'warning' | 'success' | 'error';

export const STAGE_LABELS: Record<PlanStage, string> = {
  waiting: 'Waiting',
  to_submit: 'Not submitted',
  nothing_left: 'Nothing left to claim',
  submitted: 'Submitted',
  awaiting_payment: 'Awaiting payment',
  received: 'Received',
  denied: 'Denied',
};

export const STAGE_TONES: Record<PlanStage, Tone> = {
  waiting: 'neutral',
  to_submit: 'neutral',
  nothing_left: 'neutral',
  submitted: 'accent',
  awaiting_payment: 'warning',
  received: 'success',
  denied: 'error',
};

export function isDecided(status: SubmissionStatus): boolean {
  return status === 'approved' || status === 'paid' || status === 'denied';
}

/**
 * Approved or received, but saved without the amount (possible before amounts were
 * required). The Budget can't count it until the amount is entered.
 */
export function isMissingAmount(submission: ClaimSubmission): boolean {
  return (
    (submission.status === 'approved' || submission.status === 'paid') &&
    typeof submission.amount_reimbursed !== 'number'
  );
}

/** The claim total minus what earlier plans approved or paid. */
export function remainingToClaim(claim: InsuranceClaim, index: number): number {
  const covered = claim.submissions
    .slice(0, index)
    .filter((s) => s.status === 'approved' || s.status === 'paid')
    .reduce((sum, s) => sum + (s.amount_reimbursed ?? 0), 0);
  return Math.max(0, claim.total_amount - covered);
}

export function getPlanStage(claim: InsuranceClaim, index: number): PlanStage {
  const submission = claim.submissions[index];
  switch (submission.status) {
    case 'pending':
      return 'submitted';
    case 'approved':
      return 'awaiting_payment';
    case 'paid':
      return 'received';
    case 'denied':
      return 'denied';
  }
  const earlier = claim.submissions.slice(0, index);
  if (!earlier.every((s) => isDecided(s.status))) return 'waiting';
  if (index > 0 && remainingToClaim(claim, index) === 0) return 'nothing_left';
  return 'to_submit';
}

/** "Primary", "Secondary", then "Plan 3"... in the order plans are claimed. */
export function planRole(index: number): string {
  return index === 0 ? 'Primary' : index === 1 ? 'Secondary' : `Plan ${index + 1}`;
}

/** "Sep 3" — dates on a claim's timeline; the year is in the claim header. */
export function shortDate(date: string): string {
  const [year, month, day] = date.substring(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function planName(submission: ClaimSubmission): string {
  return submission.plan_snapshot?.name ?? 'Insurance';
}

/** Name of the first earlier plan without a decision. */
export function blockingPlanName(claim: InsuranceClaim, index: number): string | undefined {
  const blocker = claim.submissions.slice(0, index).find((s) => !isDecided(s.status));
  return blocker ? planName(blocker) : undefined;
}

export interface ClaimMoney {
  cost: number;
  approved: number; // approved or received
  received: number;
  owed: number; // approved, not received yet
  stillToClaim: number; // what plans not decided yet are claiming
  estimate?: number;
}

export function getClaimMoney(claim: InsuranceClaim): ClaimMoney {
  let approved = 0;
  let received = 0;
  let stillToClaim = 0;
  claim.submissions.forEach((s, index) => {
    const stage = getPlanStage(claim, index);
    if (stage === 'awaiting_payment' || stage === 'received') {
      approved += s.amount_reimbursed ?? 0;
      if (stage === 'received') received += s.amount_reimbursed ?? 0;
    } else if (stage === 'to_submit' || stage === 'submitted') {
      stillToClaim += s.amount_claimed;
    }
  });
  return {
    cost: claim.is_expected ? (claim.expected_cost ?? claim.total_amount) : claim.total_amount,
    approved,
    received,
    owed: approved - received,
    stillToClaim,
    estimate: claim.expected_reimbursement,
  };
}

export interface ClaimHeadline {
  label: string;
  tone: Tone;
}

/** One status for the whole claim, from the plan that needs attention first. */
export function getClaimHeadline(claim: InsuranceClaim): ClaimHeadline {
  if (claim.is_expected) return { label: 'Scheduled', tone: 'neutral' };
  if (claim.submissions.some(isMissingAmount)) return { label: 'Needs an amount', tone: 'error' };
  if (claim.status === 'closed') return { label: 'Done', tone: 'success' };
  const stages = claim.submissions.map((_, i) => getPlanStage(claim, i));
  if (stages.includes('to_submit')) return { label: 'To submit', tone: 'accent' };
  if (stages.includes('submitted')) return { label: 'Waiting on insurer', tone: 'neutral' };
  if (stages.includes('awaiting_payment')) return { label: 'Awaiting payment', tone: 'warning' };
  return { label: 'Not started', tone: 'neutral' };
}

export type NextStep =
  | { kind: 'convert' }
  | { kind: 'add_plan' }
  | { kind: 'enter_amount'; submission: ClaimSubmission; index: number }
  | { kind: 'submit'; submission: ClaimSubmission; index: number; amount: number }
  | { kind: 'decide'; submission: ClaimSubmission; index: number }
  | { kind: 'receive'; submission: ClaimSubmission; index: number; amount: number };

/** The single most useful thing to do on a claim right now, if anything. */
export function getNextStep(claim: InsuranceClaim): NextStep | null {
  if (claim.is_expected) return { kind: 'convert' };
  if (claim.submissions.length === 0) return { kind: 'add_plan' };
  const missing = claim.submissions.findIndex(isMissingAmount);
  if (missing >= 0) {
    return { kind: 'enter_amount', submission: claim.submissions[missing], index: missing };
  }
  for (const [index, submission] of claim.submissions.entries()) {
    const stage = getPlanStage(claim, index);
    if (stage === 'to_submit') {
      return { kind: 'submit', submission, index, amount: submission.amount_claimed };
    }
    if (stage === 'submitted') return { kind: 'decide', submission, index };
  }
  for (const [index, submission] of claim.submissions.entries()) {
    if (getPlanStage(claim, index) === 'awaiting_payment') {
      return { kind: 'receive', submission, index, amount: submission.amount_reimbursed ?? 0 };
    }
  }
  return null;
}

/** Plan-level work across all claims, for the claims list. */
export interface PlanTask {
  claim: InsuranceClaim;
  submission: ClaimSubmission;
  index: number;
  stage: 'needs_amount' | 'to_submit' | 'submitted' | 'awaiting_payment';
  amount: number; // what was claimed while it needs an amount, else what's moving
}

export function getPlanTasks(claims: InsuranceClaim[]): PlanTask[] {
  const tasks: PlanTask[] = [];
  for (const claim of claims) {
    if (claim.is_expected) continue;
    claim.submissions.forEach((submission, index) => {
      const stage = getPlanStage(claim, index);
      if (isMissingAmount(submission)) {
        tasks.push({
          claim,
          submission,
          index,
          stage: 'needs_amount',
          amount: submission.amount_claimed,
        });
      } else if (stage === 'to_submit' || stage === 'submitted') {
        tasks.push({ claim, submission, index, stage, amount: submission.amount_claimed });
      } else if (stage === 'awaiting_payment') {
        tasks.push({
          claim,
          submission,
          index,
          stage,
          amount: submission.amount_reimbursed ?? 0,
        });
      }
    });
  }
  return tasks;
}
