// Insurance Entity Types for Frontend
// These types mirror the backend types in api/src/types/index.ts

export type ClaimStatus = 'expected' | 'draft' | 'in_progress' | 'closed';
export type SubmissionStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'paid'
  | 'denied'
  | 'awaiting_previous';
export type DocumentType = 'receipt' | 'eob' | 'other';

export interface FamilyMember {
  id: string;
  name: string;
  plans: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InsurancePlan {
  id: string;
  name: string;
  provider_name?: string;
  policy_number?: string;
  member_id?: string;
  owner?: string;
  portal_url?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InsuranceCategory {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  is_predefined: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InsuranceProvider {
  id: string;
  name: string;
  description?: string;
  category_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClaimDocument {
  id: string;
  filename: string;
  original_filename: string;
  document_type: DocumentType;
  related_plan_id?: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
  notes?: string;
}

export interface PlanSnapshot {
  name: string;
  provider_name?: string;
  policy_number?: string;
  member_id?: string;
  owner?: string;
  portal_url?: string;
}

export interface ClaimSubmission {
  id: string;
  plan_id: string;
  plan_snapshot: PlanSnapshot;
  status: SubmissionStatus;
  amount_claimed: number;
  amount_reimbursed?: number;
  date_submitted?: string;
  date_resolved?: string;
  date_paid?: string;
  documents_sent: string[];
  eob_document_id?: string;
  notes?: string;
}

export interface InsuranceClaim {
  id: string;
  claim_number: number;
  family_member_id: string;
  family_member_name: string;
  category_id: string;
  category_name: string;
  description?: string;
  provider_name?: string;
  provider_id?: string;
  service_date: string;
  total_amount: number;
  status: ClaimStatus;
  documents: ClaimDocument[];
  submissions: ClaimSubmission[];
  // Expected expense fields (for scheduling future appointments)
  is_expected: boolean;
  expected_cost?: number;
  expected_reimbursement?: number;
  scheduled_at?: string;
  converted_from_expected_at?: string;
  payment_source_id?: string;
  // Bill payment tracking (independent of submission status)
  bill_paid: boolean;
  bill_paid_date?: string;
  created_at: string;
  updated_at: string;
}

export interface InsuranceClaimsSummary {
  pending_count: number; // Claims in progress
  pending_amount: number; // Claimed on submissions waiting for a decision
  closed_count: number;
  reimbursed_amount: number; // Received on closed claims
  to_submit_count: number; // Plans ready to send
  to_submit_amount: number;
  waiting_count: number; // Submitted, no decision yet
  waiting_amount: number;
  awaiting_payment_count: number; // Approved, money not received yet
  awaiting_payment_amount: number;
  needs_amount_count: number; // Approved or received but saved without an amount
  received_year: number;
  received_this_year_amount: number;
  received_this_year_claims: number;
}

export interface BackupMetadata {
  filename: string;
  fromVersion: string;
  toVersion: string;
  timestamp: string;
  size: number;
  backupType: 'manual' | 'auto' | 'migration';
  note?: string;
}

// Predefined insurance categories for seeding
export const PREDEFINED_INSURANCE_CATEGORIES: Omit<
  InsuranceCategory,
  'id' | 'created_at' | 'updated_at'
>[] = [
  { name: 'Dental', icon: '🦷', sort_order: 1, is_predefined: true, is_active: true },
  { name: 'Vision / Eye Care', icon: '👁️', sort_order: 2, is_predefined: true, is_active: true },
  { name: 'Massage Therapy', icon: '💆', sort_order: 3, is_predefined: true, is_active: true },
  { name: 'Physiotherapy', icon: '🏃', sort_order: 4, is_predefined: true, is_active: true },
  { name: 'Chiropractic', icon: '🦴', sort_order: 5, is_predefined: true, is_active: true },
  { name: 'Orthodontics', icon: '🦷', sort_order: 6, is_predefined: true, is_active: true },
  { name: 'Mental Health', icon: '🧠', sort_order: 7, is_predefined: true, is_active: true },
  { name: 'Prescription Drugs', icon: '💊', sort_order: 8, is_predefined: true, is_active: true },
  { name: 'Medical Equipment', icon: '🩼', sort_order: 9, is_predefined: true, is_active: true },
  {
    name: 'Hospital / Emergency',
    icon: '🏥',
    sort_order: 10,
    is_predefined: true,
    is_active: true,
  },
  { name: 'Other', icon: '📋', sort_order: 99, is_predefined: true, is_active: true },
];
