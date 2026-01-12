// Insurance Claims Store
// Full claims lifecycle management with documents and submissions

import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';
import type {
  InsuranceClaim,
  ClaimDocument,
  ClaimSubmission,
  InsuranceClaimsSummary,
  ClaimStatus,
  DocumentType,
  SubmissionStatus,
} from '../types/insurance';

// Re-export types for convenience
export type { ClaimStatus, DocumentType, SubmissionStatus };

type ClaimFilters = {
  status?: ClaimStatus;
  category_id?: string;
  year?: number;
};

type InsuranceClaimsState = {
  claims: InsuranceClaim[];
  summary: InsuranceClaimsSummary | null;
  filters: ClaimFilters;
  loading: boolean;
  error: string | null;
};

const initialState: InsuranceClaimsState = {
  claims: [],
  summary: null,
  filters: {},
  loading: false,
  error: null,
};

const store = writable<InsuranceClaimsState>(initialState);

// Derived stores
export const insuranceClaims = derived(store, (s) => s.claims);
export const claimsSummary = derived(store, (s) => s.summary);
export const claimsFilters = derived(store, (s) => s.filters);
export const insuranceClaimsLoading = derived(store, (s) => s.loading);
export const insuranceClaimsError = derived(store, (s) => s.error);

// Status-filtered derived stores
export const draftClaims = derived(insuranceClaims, (claims) =>
  claims.filter((c) => c.status === 'draft')
);
export const inProgressClaims = derived(insuranceClaims, (claims) =>
  claims.filter((c) => c.status === 'in_progress')
);
export const closedClaims = derived(insuranceClaims, (claims) =>
  claims.filter((c) => c.status === 'closed')
);

// ============================================================================
// Claims CRUD
// ============================================================================

export interface ClaimData {
  category_id: string;
  service_date: string;
  total_amount: number;
  description?: string;
  provider_name?: string;
}

export async function loadInsuranceClaims(filters?: ClaimFilters) {
  store.update((s) => ({
    ...s,
    loading: true,
    error: null,
    filters: filters || s.filters,
  }));

  try {
    // Build query string from filters
    const params = new URLSearchParams();
    const activeFilters = filters || initialState.filters;
    if (activeFilters.status) params.append('status', activeFilters.status);
    if (activeFilters.category_id) params.append('category_id', activeFilters.category_id);
    if (activeFilters.year) params.append('year', String(activeFilters.year));

    const queryString = params.toString();
    const url = queryString ? `/api/insurance-claims?${queryString}` : '/api/insurance-claims';

    const data = await apiClient.get(url);
    const claims = (data || []) as InsuranceClaim[];
    store.update((s) => ({ ...s, claims, loading: false }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to load insurance claims');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function loadClaimsSummary() {
  try {
    const data = await apiClient.get('/api/insurance-claims/summary');
    const summary = data as InsuranceClaimsSummary;
    store.update((s) => ({ ...s, summary }));
    return summary;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to load claims summary');
    store.update((s) => ({ ...s, error: err.message }));
    throw err;
  }
}

export async function getClaimById(id: string): Promise<InsuranceClaim | null> {
  try {
    const data = await apiClient.get(`/api/insurance-claims/${id}`);
    return data as InsuranceClaim;
  } catch (e) {
    console.error('Failed to get claim:', e);
    return null;
  }
}

export async function createClaim(data: ClaimData) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const newClaim = await apiClient.post('/api/insurance-claims', data);
    await loadInsuranceClaims();
    await loadClaimsSummary();
    return newClaim as InsuranceClaim;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to create insurance claim');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function updateClaim(id: string, updates: Partial<ClaimData>) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const updated = await apiClient.put('/api/insurance-claims', id, updates);
    await loadInsuranceClaims();
    return updated as InsuranceClaim;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to update insurance claim');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function deleteClaim(id: string) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    await apiClient.delete('/api/insurance-claims', id);
    await loadInsuranceClaims();
    await loadClaimsSummary();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to delete insurance claim');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

// ============================================================================
// Documents
// ============================================================================

export async function uploadDocument(
  claimId: string,
  file: File,
  documentType: DocumentType,
  relatedPlanId?: string
): Promise<ClaimDocument> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (relatedPlanId) {
      formData.append('related_plan_id', relatedPlanId);
    }

    const response = await fetch(`/api/insurance-claims/${claimId}/documents`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload document');
    }

    const document = (await response.json()) as ClaimDocument;
    await loadInsuranceClaims();
    return document;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to upload document');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export function getDocumentUrl(claimId: string, documentId: string): string {
  return `/api/insurance-claims/${claimId}/documents/${documentId}`;
}

export async function deleteDocument(claimId: string, documentId: string) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const response = await fetch(`/api/insurance-claims/${claimId}/documents/${documentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete document');
    }

    await loadInsuranceClaims();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to delete document');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

// ============================================================================
// Submissions
// ============================================================================

export interface SubmissionData {
  plan_id: string;
  amount_claimed: number;
  documents_sent?: string[];
}

export interface SubmissionUpdate {
  status?: SubmissionStatus;
  amount_reimbursed?: number;
  date_submitted?: string;
  date_resolved?: string;
  eob_document_id?: string;
  notes?: string;
}

export async function createSubmission(
  claimId: string,
  data: SubmissionData
): Promise<ClaimSubmission> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const response = await fetch(`/api/insurance-claims/${claimId}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create submission');
    }

    const submission = (await response.json()) as ClaimSubmission;
    await loadInsuranceClaims();
    await loadClaimsSummary();
    return submission;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to create submission');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function updateSubmission(
  claimId: string,
  submissionId: string,
  updates: SubmissionUpdate
): Promise<ClaimSubmission> {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const response = await fetch(`/api/insurance-claims/${claimId}/submissions/${submissionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update submission');
    }

    const submission = (await response.json()) as ClaimSubmission;
    await loadInsuranceClaims();
    await loadClaimsSummary();
    return submission;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to update submission');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function deleteSubmission(claimId: string, submissionId: string) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const response = await fetch(`/api/insurance-claims/${claimId}/submissions/${submissionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete submission');
    }

    await loadInsuranceClaims();
    await loadClaimsSummary();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to delete submission');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function setFilters(filters: ClaimFilters) {
  store.update((s) => ({ ...s, filters }));
}

export function clearFilters() {
  store.update((s) => ({ ...s, filters: {} }));
}

export function clearInsuranceClaimsError() {
  store.update((s) => ({ ...s, error: null }));
}

export const insuranceClaimsStore = store;
