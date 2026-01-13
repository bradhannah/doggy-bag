// Insurance Entity Types for Frontend
// These types mirror the backend types in api/src/types/index.ts

export type ClaimStatus = 'draft' | 'in_progress' | 'closed';
export type SubmissionStatus = 'draft' | 'pending' | 'approved' | 'denied';
export type DocumentType = 'receipt' | 'eob' | 'other';

export interface FamilyMember {
  id: string;
  name: string;
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
  priority: number;
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
  priority: number;
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
  service_date: string;
  total_amount: number;
  status: ClaimStatus;
  documents: ClaimDocument[];
  submissions: ClaimSubmission[];
  created_at: string;
  updated_at: string;
}

export interface InsuranceClaimsSummary {
  pending_count: number;
  pending_amount: number;
  closed_count: number;
  reimbursed_amount: number;
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
