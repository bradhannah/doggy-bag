// How an insurance reimbursement line reads in the Budget.

import type { Occurrence } from '../../stores/detailed-month';
import type { Tone } from './claim-progress';

export interface InsuranceLineDisplay {
  label: string;
  tone: Tone;
  /** False while nothing has been sent: the amount column shows "—", not $0. */
  showAmount: boolean;
}

export function getInsuranceLineDisplay(occurrence: Occurrence): InsuranceLineDisplay | null {
  if (occurrence.amount_missing) {
    return { label: 'Amount missing', tone: 'error', showAmount: false };
  }
  if (occurrence.is_insurance_estimate) {
    return { label: 'Estimated', tone: 'neutral', showAmount: true };
  }
  switch (occurrence.submission_status) {
    case 'draft':
      return { label: 'Not submitted', tone: 'neutral', showAmount: false };
    case 'pending':
      // Shows the amount claimed: money that is expected, carried forward until it lands
      return { label: 'Submitted', tone: 'accent', showAmount: true };
    case 'awaiting_previous':
      return {
        label: occurrence.awaiting_plan_name
          ? `Waiting for ${occurrence.awaiting_plan_name}`
          : 'Waiting for previous plan',
        tone: 'neutral',
        showAmount: false,
      };
    case 'approved':
      return { label: 'Awaiting payment', tone: 'warning', showAmount: true };
    case 'paid':
      return { label: 'Received', tone: 'success', showAmount: true };
    case 'denied':
      return { label: 'Denied', tone: 'error', showAmount: true };
    default:
      // Lines saved in a locked month's snapshot before statuses were recorded
      return null;
  }
}
