// Insurance Claims Service - Full claims lifecycle management
// Includes: claim_number auto-increment, status auto-calculation, documents, submissions

import { StorageServiceImpl } from './storage';
import { InsuranceCategoriesServiceImpl } from './insurance-categories-service';
import { InsurancePlansServiceImpl } from './insurance-plans-service';
import { FamilyMembersServiceImpl } from './family-members-service';
import { InsuranceProvidersServiceImpl } from './insurance-providers-service';
import type { StorageService } from './storage';
import type { InsuranceCategoriesService } from './insurance-categories-service';
import type { InsurancePlansService } from './insurance-plans-service';
import type { FamilyMembersService } from './family-members-service';
import type { InsuranceProvidersService } from './insurance-providers-service';
import { getTodayLocalDateString, parseLocalDate } from '../utils/due-date';
import { NotFoundError, ValidationError } from '../utils/errors';
import {
  deriveClaimStatus,
  getClaimBudgetMonths,
  hasNothingLeftToClaim,
  isDecided,
  recalculateDownstreamSubmissions,
} from '../utils/insurance-claims';
import type {
  InsuranceClaim,
  ClaimDocument,
  ClaimSubmission,
  PlanSnapshot,
  InsuranceClaimsSummary,
  ClaimStatus,
  SubmissionStatus,
  DocumentType,
  ValidationResult,
} from '../types';
import { join } from 'path';
import { mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';

const STORAGE_PATH = 'data/entities/insurance-claims.json';
const DOCUMENTS_DIR = 'data/documents/insurance/receipts';

export interface ClaimFilters {
  status?: ClaimStatus;
  category_id?: string;
  year?: number;
}

/** Fields a client may change on a submission. `null` (or '' for text) clears a field. */
export type SubmissionUpdate = {
  [K in
    | 'status'
    | 'amount_reimbursed'
    | 'date_submitted'
    | 'date_resolved'
    | 'date_paid'
    | 'eob_document_id'
    | 'notes']?: ClaimSubmission[K] | null;
};

const SUBMISSION_UPDATE_FIELDS = [
  'status',
  'amount_reimbursed',
  'date_submitted',
  'date_resolved',
  'date_paid',
  'eob_document_id',
  'notes',
] as const;

const CLAIM_UPDATE_FIELDS = new Set([
  'family_member_id',
  'category_id',
  'description',
  'provider_id',
  'provider_name',
  'service_date',
  'total_amount',
  'expected_reimbursement',
]);

const CLIENT_SUBMISSION_STATUSES: SubmissionStatus[] = [
  'draft',
  'pending',
  'approved',
  'paid',
  'denied',
];

export interface InsuranceClaimsService {
  // Claims CRUD
  getAll(filters?: ClaimFilters): Promise<InsuranceClaim[]>;
  getById(id: string): Promise<InsuranceClaim | null>;
  create(
    data: Pick<
      InsuranceClaim,
      'family_member_id' | 'category_id' | 'service_date' | 'total_amount'
    > &
      Partial<
        Pick<
          InsuranceClaim,
          'description' | 'provider_name' | 'provider_id' | 'expected_reimbursement'
        >
      >
  ): Promise<InsuranceClaim>;
  update(
    id: string,
    updates: Partial<
      Pick<
        InsuranceClaim,
        | 'family_member_id'
        | 'category_id'
        | 'description'
        | 'provider_id'
        | 'provider_name'
        | 'service_date'
        | 'total_amount'
        | 'expected_reimbursement'
      >
    >
  ): Promise<InsuranceClaim | null>;
  delete(id: string): Promise<void>;
  getSummary(): Promise<InsuranceClaimsSummary>;
  validate(data: Partial<InsuranceClaim>): ValidationResult;

  // Documents
  addDocument(
    claimId: string,
    file: File,
    documentType: DocumentType,
    relatedPlanId?: string,
    notes?: string
  ): Promise<ClaimDocument>;
  getDocument(
    claimId: string,
    documentId: string
  ): Promise<{ path: string; mimeType: string } | null>;
  deleteDocument(claimId: string, documentId: string): Promise<void>;

  // Submissions
  addSubmission(
    claimId: string,
    data: Pick<ClaimSubmission, 'plan_id' | 'amount_claimed' | 'documents_sent'>
  ): Promise<ClaimSubmission>;
  updateSubmission(
    claimId: string,
    submissionId: string,
    updates: SubmissionUpdate
  ): Promise<ClaimSubmission | null>;
  deleteSubmission(claimId: string, submissionId: string): Promise<void>;

  // Bill Payment (independent of submission status)
  markBillPaid(id: string, paid: boolean): Promise<InsuranceClaim | null>;

  // Expected Expenses (scheduled future insurance appointments)
  // Budget entries are virtual - injected by MonthsService, not stored
  getClaimsForMonth(month: string): Promise<InsuranceClaim[]>;
  getClaimsWithBudgetActivity(month: string): Promise<InsuranceClaim[]>;
  createExpectedExpense(data: {
    family_member_id: string;
    category_id: string;
    provider_name?: string;
    provider_id?: string;
    appointment_date: string; // When the service will occur (YYYY-MM-DD)
    expected_cost: number; // Estimated cost in cents
    expected_reimbursement: number; // Estimated reimbursement in cents
    payment_source_id: string; // Payment source for virtual bill
  }): Promise<InsuranceClaim>;
  updateExpectedExpense(
    id: string,
    updates: {
      family_member_id?: string;
      category_id?: string;
      provider_name?: string;
      provider_id?: string;
      appointment_date?: string;
      expected_cost?: number;
      expected_reimbursement?: number;
      payment_source_id?: string;
    }
  ): Promise<InsuranceClaim | null>;
  cancelExpectedExpense(id: string): Promise<void>;
  convertExpectedToClaim(
    id: string,
    data: { actual_cost: number; bill_paid?: boolean; update_bill_amount?: boolean }
  ): Promise<InsuranceClaim>;
}

export class InsuranceClaimsServiceImpl implements InsuranceClaimsService {
  private storage: StorageService;
  private categoriesService: InsuranceCategoriesService;
  private plansService: InsurancePlansService;
  private familyMembersService: FamilyMembersService;
  private providersService: InsuranceProvidersService;

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
    this.categoriesService = new InsuranceCategoriesServiceImpl();
    this.plansService = new InsurancePlansServiceImpl();
    this.familyMembersService = new FamilyMembersServiceImpl();
    this.providersService = new InsuranceProvidersServiceImpl();
  }

  /**
   * Get the next claim_number (auto-increment)
   */
  private async getNextClaimNumber(): Promise<number> {
    const claims = await this.getAllRaw();
    if (claims.length === 0) {
      return 1;
    }
    const maxNumber = Math.max(...claims.map((c) => c.claim_number));
    return maxNumber + 1;
  }

  /**
   * Generate sortable document filename
   * Format: {claim_number:04d}_{date}_{category}_{type}.{ext}
   */
  private generateDocumentFilename(
    claimNumber: number,
    serviceDate: string,
    categoryName: string,
    documentType: DocumentType,
    originalFilename: string
  ): string {
    const paddedNumber = String(claimNumber).padStart(4, '0');
    const date = serviceDate.split('T')[0]; // Get just the date portion
    const sanitizedCategory = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const ext = originalFilename.split('.').pop() || 'pdf';
    return `${paddedNumber}_${date}_${sanitizedCategory}_${documentType}.${ext}`;
  }

  /** All claims, with status derived from their submissions so a stored status can't drift. */
  private async getAllRaw(): Promise<InsuranceClaim[]> {
    const claims = (await this.storage.readJSON<InsuranceClaim[]>(STORAGE_PATH)) || [];
    return claims.map((claim) => ({ ...claim, status: deriveClaimStatus(claim) }));
  }

  /**
   * Resolve a provider_id to a provider name snapshot.
   * Returns { providerId, providerName } where providerId may be undefined (cleared)
   * and providerName is the provider's name or undefined when no provider is selected.
   * Throws if provider_id is provided but not found.
   */
  private async resolveProvider(
    providerId: string | undefined | null,
    categoryId: string
  ): Promise<{ providerId: string | undefined; providerName: string | undefined }> {
    // Treat empty string or null as "cleared"
    if (!providerId) {
      return { providerId: undefined, providerName: undefined };
    }

    const provider = await this.providersService.getById(providerId);
    if (!provider) {
      throw new NotFoundError('Provider');
    }
    if (!provider.is_active) {
      throw new ValidationError('Provider is inactive');
    }
    if (!provider.category_ids.includes(categoryId)) {
      throw new ValidationError('Provider is not available for this category');
    }
    return { providerId: provider.id, providerName: provider.name };
  }

  public async getAll(filters?: ClaimFilters): Promise<InsuranceClaim[]> {
    try {
      let claims = await this.getAllRaw();

      // Apply filters
      if (filters) {
        if (filters.status) {
          claims = claims.filter((c) => c.status === filters.status);
        }
        if (filters.category_id) {
          claims = claims.filter((c) => c.category_id === filters.category_id);
        }
        if (filters.year) {
          claims = claims.filter((c) => {
            const claimYear = parseLocalDate(c.service_date).getFullYear();
            return claimYear === filters.year;
          });
        }
      }

      // Sort by claim_number descending (newest first)
      return claims.sort((a, b) => b.claim_number - a.claim_number);
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to load claims:', error);
      return [];
    }
  }

  public async getById(id: string): Promise<InsuranceClaim | null> {
    try {
      const claims = await this.getAllRaw();
      return claims.find((claim) => claim.id === id) || null;
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to get claim:', error);
      return null;
    }
  }

  public async create(
    data: Pick<
      InsuranceClaim,
      'family_member_id' | 'category_id' | 'service_date' | 'total_amount'
    > &
      Partial<
        Pick<
          InsuranceClaim,
          'description' | 'provider_name' | 'provider_id' | 'expected_reimbursement'
        >
      >
  ): Promise<InsuranceClaim> {
    try {
      // Validate
      const validation = this.validate(data);
      if (!validation.isValid) {
        throw new ValidationError('Validation failed: ' + validation.errors.join(', '));
      }

      // Get family member for denormalized name
      const familyMember = await this.familyMembersService.getById(data.family_member_id);
      if (!familyMember) {
        throw new NotFoundError('Family member');
      }

      // Get category for denormalized name
      const category = await this.categoriesService.getById(data.category_id);
      if (!category) {
        throw new NotFoundError('Category');
      }

      // Resolve provider_id -> provider_name snapshot
      // If provider_id is provided it takes precedence; otherwise fall back to legacy provider_name
      const { providerId, providerName } = await this.resolveProvider(
        data.provider_id,
        data.category_id
      );
      const finalProviderName = providerId ? providerName : data.provider_name;

      const claims = await this.getAllRaw();
      const claimNumber = await this.getNextClaimNumber();
      const now = new Date().toISOString();

      // Auto-generate draft submissions based on family member's plans array
      const submissions: ClaimSubmission[] = [];
      const memberPlans = familyMember.plans || [];

      for (let i = 0; i < memberPlans.length; i++) {
        const planId = memberPlans[i];
        const plan = await this.plansService.getById(planId);

        // Skip inactive or non-existent plans
        if (!plan || !plan.is_active) {
          continue;
        }

        // Create plan snapshot
        const planSnapshot: PlanSnapshot = {
          name: plan.name,
          provider_name: plan.provider_name,
          policy_number: plan.policy_number,
          member_id: plan.member_id,
          owner: plan.owner,
          portal_url: plan.portal_url,
        };

        // First submission is 'draft', rest are 'awaiting_previous'
        const status: SubmissionStatus = submissions.length === 0 ? 'draft' : 'awaiting_previous';

        submissions.push({
          id: crypto.randomUUID(),
          plan_id: planId,
          plan_snapshot: planSnapshot,
          status,
          // First submission gets full amount, awaiting_previous submissions get $0 (calculated on activation)
          amount_claimed: status === 'awaiting_previous' ? 0 : data.total_amount,
          documents_sent: [],
        });
      }

      const newClaim: InsuranceClaim = {
        id: crypto.randomUUID(),
        claim_number: claimNumber,
        family_member_id: data.family_member_id,
        family_member_name: familyMember.name,
        category_id: data.category_id,
        category_name: category.name,
        description: data.description,
        provider_name: finalProviderName,
        provider_id: providerId,
        service_date: data.service_date,
        total_amount: data.total_amount,
        status: 'draft',
        documents: [],
        submissions,
        is_expected: false, // Regular claims are not expected expenses
        expected_reimbursement: data.expected_reimbursement, // Optional estimated reimbursement
        bill_paid: false,
        created_at: now,
        updated_at: now,
      };

      claims.push(newClaim);
      await this.storage.writeJSON(STORAGE_PATH, claims);

      console.log(
        '[InsuranceClaimsService] Created claim #',
        claimNumber,
        'with',
        submissions.length,
        'auto-generated submissions'
      );
      return newClaim;
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to create claim:', error);
      throw error;
    }
  }

  public async update(
    id: string,
    updates: Partial<
      Pick<
        InsuranceClaim,
        | 'family_member_id'
        | 'category_id'
        | 'description'
        | 'provider_id'
        | 'provider_name'
        | 'service_date'
        | 'total_amount'
        | 'expected_reimbursement'
      >
    >
  ): Promise<InsuranceClaim | null> {
    try {
      const claims = await this.getAllRaw();
      const index = claims.findIndex((claim) => claim.id === id);

      if (index === -1) {
        console.warn(`[InsuranceClaimsService] Claim ${id} not found`);
        return null;
      }

      // Request bodies arrive as-is; only these fields are editable here
      updates = Object.fromEntries(
        Object.entries(updates).filter(([key]) => CLAIM_UPDATE_FIELDS.has(key))
      ) as typeof updates;

      // If family member changed, update denormalized name
      let familyMemberName = claims[index].family_member_name;
      if (updates.family_member_id && updates.family_member_id !== claims[index].family_member_id) {
        const familyMember = await this.familyMembersService.getById(updates.family_member_id);
        if (!familyMember) {
          throw new NotFoundError('Family member');
        }
        familyMemberName = familyMember.name;
      }

      // If category changed, update denormalized name
      let categoryName = claims[index].category_name;
      if (updates.category_id && updates.category_id !== claims[index].category_id) {
        const category = await this.categoriesService.getById(updates.category_id);
        if (!category) {
          throw new NotFoundError('Category');
        }
        categoryName = category.name;
      }

      // Resolve provider_id changes:
      // - If provider_id is explicitly in updates, resolve to provider name (or clear)
      // - If provider_id is not in updates but provider_name is, use the provided provider_name
      // - Otherwise keep existing provider_id/provider_name
      let resolvedProviderId = claims[index].provider_id;
      let resolvedProviderName = claims[index].provider_name;

      if (updates.provider_id !== undefined) {
        // provider_id is being explicitly changed (could be a real id, or empty string to clear)
        const { providerId, providerName } = await this.resolveProvider(
          updates.provider_id,
          updates.category_id || claims[index].category_id
        );
        resolvedProviderId = providerId;
        resolvedProviderName = providerName;
      } else if (updates.provider_name !== undefined) {
        // Legacy: provider_name was changed without provider_id
        resolvedProviderName = updates.provider_name || undefined;
      }

      const now = new Date().toISOString();
      const updatedClaim: InsuranceClaim = {
        ...claims[index],
        ...updates,
        provider_id: resolvedProviderId,
        provider_name: resolvedProviderName,
        family_member_name: familyMemberName,
        category_name: categoryName,
        updated_at: now,
      };

      // Validate the merged data
      const validation = this.validate(updatedClaim);
      if (!validation.isValid) {
        throw new ValidationError('Validation failed: ' + validation.errors.join(', '));
      }

      // A new total changes what each unsubmitted plan should claim
      if (updatedClaim.total_amount !== claims[index].total_amount) {
        updatedClaim.submissions = updatedClaim.submissions.map((s) => ({ ...s }));
        recalculateDownstreamSubmissions(updatedClaim, { afterIndex: -1 });
        updatedClaim.status = deriveClaimStatus(updatedClaim);
      }

      claims[index] = updatedClaim;
      await this.storage.writeJSON(STORAGE_PATH, claims);

      console.log('[InsuranceClaimsService] Updated claim #', updatedClaim.claim_number);
      return updatedClaim;
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to update claim:', error);
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const claims = await this.getAllRaw();
      const claim = claims.find((c) => c.id === id);

      if (!claim) {
        throw new NotFoundError('Claim');
      }

      // Delete all associated documents
      for (const doc of claim.documents) {
        try {
          const docPath = await this.getDocumentPath(doc.filename);
          if (existsSync(docPath)) {
            await unlink(docPath);
          }
        } catch (e) {
          console.warn(`[InsuranceClaimsService] Failed to delete document ${doc.filename}:`, e);
        }
      }

      const filtered = claims.filter((c) => c.id !== id);
      await this.storage.writeJSON(STORAGE_PATH, filtered);

      console.log('[InsuranceClaimsService] Deleted claim #', claim.claim_number);
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to delete claim:', error);
      throw error;
    }
  }

  public async getSummary(): Promise<InsuranceClaimsSummary> {
    const receivedYear = Number(getTodayLocalDateString().substring(0, 4));
    const summary: InsuranceClaimsSummary = {
      pending_count: 0,
      pending_amount: 0,
      closed_count: 0,
      reimbursed_amount: 0,
      to_submit_count: 0,
      to_submit_amount: 0,
      waiting_count: 0,
      waiting_amount: 0,
      awaiting_payment_count: 0,
      awaiting_payment_amount: 0,
      needs_amount_count: 0,
      received_year: receivedYear,
      received_this_year_amount: 0,
      received_this_year_claims: 0,
    };

    try {
      const claims = await this.getAllRaw();

      for (const claim of claims) {
        if (claim.is_expected) continue;
        if (claim.status === 'in_progress') summary.pending_count++;
        if (claim.status === 'closed') summary.closed_count++;

        let receivedThisYear = false;
        claim.submissions.forEach((sub, index) => {
          const reimbursed = sub.amount_reimbursed ?? 0;
          switch (sub.status) {
            case 'draft': {
              const ready = claim.submissions.slice(0, index).every((s) => isDecided(s.status));
              if (ready && !hasNothingLeftToClaim(claim, index) && sub.amount_claimed > 0) {
                summary.to_submit_count++;
                summary.to_submit_amount += sub.amount_claimed;
              }
              break;
            }
            case 'pending':
              summary.waiting_count++;
              summary.waiting_amount += sub.amount_claimed;
              summary.pending_amount += sub.amount_claimed;
              break;
            case 'approved':
              // An approval saved without its amount needs fixing before it can be awaited
              if (typeof sub.amount_reimbursed !== 'number') {
                summary.needs_amount_count++;
              } else {
                summary.awaiting_payment_count++;
                summary.awaiting_payment_amount += reimbursed;
              }
              break;
            case 'paid':
              if (typeof sub.amount_reimbursed !== 'number') summary.needs_amount_count++;
              if (claim.status === 'closed') summary.reimbursed_amount += reimbursed;
              if (sub.date_paid?.startsWith(String(receivedYear))) {
                summary.received_this_year_amount += reimbursed;
                receivedThisYear = true;
              }
              break;
          }
        });
        if (receivedThisYear) summary.received_this_year_claims++;
      }
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to get summary:', error);
    }
    return summary;
  }

  public validate(data: Partial<InsuranceClaim>): ValidationResult {
    const errors: string[] = [];

    // family_member_id is required
    if (!data.family_member_id || typeof data.family_member_id !== 'string') {
      errors.push('Family member is required');
    }

    // category_id is required
    if (!data.category_id || typeof data.category_id !== 'string') {
      errors.push('Category is required');
    }

    // service_date is required and must be valid
    if (!data.service_date || typeof data.service_date !== 'string') {
      errors.push('Service date is required');
    } else {
      const date = new Date(data.service_date);
      if (isNaN(date.getTime())) {
        errors.push('Service date must be a valid date');
      }
    }

    // total_amount is required and must be >= 0
    if (data.total_amount === undefined || data.total_amount === null) {
      errors.push('Total amount is required');
    } else if (typeof data.total_amount !== 'number' || data.total_amount < 0) {
      errors.push('Total amount must be a non-negative number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ============================================================================
  // Document Methods
  // ============================================================================

  private async ensureDocumentsDirectory(): Promise<string> {
    const config = this.storage.getConfig();
    const docsPath = join(config.basePath, DOCUMENTS_DIR);

    if (!existsSync(docsPath)) {
      await mkdir(docsPath, { recursive: true });
      console.log('[InsuranceClaimsService] Created documents directory:', docsPath);
    }

    return docsPath;
  }

  private async getDocumentPath(filename: string): Promise<string> {
    const docsDir = await this.ensureDocumentsDirectory();
    return join(docsDir, filename);
  }

  public async addDocument(
    claimId: string,
    file: File,
    documentType: DocumentType,
    relatedPlanId?: string,
    notes?: string
  ): Promise<ClaimDocument> {
    try {
      const claims = await this.getAllRaw();
      const index = claims.findIndex((c) => c.id === claimId);

      if (index === -1) {
        throw new NotFoundError('Claim');
      }

      const claim = claims[index];

      // Generate sortable filename
      const filename = this.generateDocumentFilename(
        claim.claim_number,
        claim.service_date,
        claim.category_name,
        documentType,
        file.name
      );

      // Handle duplicate filenames by appending a counter
      let finalFilename = filename;
      const existingFilenames = claim.documents.map((d) => d.filename);
      let counter = 1;
      while (existingFilenames.includes(finalFilename)) {
        const parts = filename.split('.');
        const ext = parts.pop();
        finalFilename = `${parts.join('.')}_${counter}.${ext}`;
        counter++;
      }

      // Save file to disk
      const docPath = await this.getDocumentPath(finalFilename);
      const arrayBuffer = await file.arrayBuffer();
      await Bun.write(docPath, arrayBuffer);

      const now = new Date().toISOString();
      const newDocument: ClaimDocument = {
        id: crypto.randomUUID(),
        filename: finalFilename,
        original_filename: file.name,
        document_type: documentType,
        related_plan_id: relatedPlanId,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        uploaded_at: now,
        notes: notes?.trim() || undefined,
      };

      claim.documents.push(newDocument);
      claim.updated_at = now;
      claims[index] = claim;
      await this.storage.writeJSON(STORAGE_PATH, claims);

      console.log('[InsuranceClaimsService] Added document:', finalFilename);
      return newDocument;
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to add document:', error);
      throw error;
    }
  }

  public async getDocument(
    claimId: string,
    documentId: string
  ): Promise<{ path: string; mimeType: string } | null> {
    try {
      const claim = await this.getById(claimId);
      if (!claim) {
        return null;
      }

      const document = claim.documents.find((d) => d.id === documentId);
      if (!document) {
        return null;
      }

      const docPath = await this.getDocumentPath(document.filename);
      if (!existsSync(docPath)) {
        console.warn('[InsuranceClaimsService] Document file not found:', docPath);
        return null;
      }

      return {
        path: docPath,
        mimeType: document.mime_type,
      };
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to get document:', error);
      return null;
    }
  }

  public async deleteDocument(claimId: string, documentId: string): Promise<void> {
    try {
      const claims = await this.getAllRaw();
      const index = claims.findIndex((c) => c.id === claimId);

      if (index === -1) {
        throw new NotFoundError('Claim');
      }

      const claim = claims[index];
      const docIndex = claim.documents.findIndex((d) => d.id === documentId);

      if (docIndex === -1) {
        throw new NotFoundError('Document');
      }

      const document = claim.documents[docIndex];

      // Check if document is referenced by any submission
      for (const sub of claim.submissions) {
        if (sub.documents_sent.includes(documentId) || sub.eob_document_id === documentId) {
          throw new ValidationError('Cannot delete document that is referenced by a submission');
        }
      }

      // Delete file from disk
      const docPath = await this.getDocumentPath(document.filename);
      if (existsSync(docPath)) {
        await unlink(docPath);
      }

      // Remove from claim
      claim.documents.splice(docIndex, 1);
      claim.updated_at = new Date().toISOString();
      claims[index] = claim;
      await this.storage.writeJSON(STORAGE_PATH, claims);

      console.log('[InsuranceClaimsService] Deleted document:', document.filename);
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to delete document:', error);
      throw error;
    }
  }

  // ============================================================================
  // Submission Methods
  // ============================================================================

  public async addSubmission(
    claimId: string,
    data: Pick<ClaimSubmission, 'plan_id' | 'amount_claimed' | 'documents_sent'>
  ): Promise<ClaimSubmission> {
    try {
      const claims = await this.getAllRaw();
      const index = claims.findIndex((c) => c.id === claimId);

      if (index === -1) {
        throw new NotFoundError('Claim');
      }

      const claim = claims[index];
      if (claim.is_expected) {
        throw new ValidationError(
          'Convert this scheduled appointment to a claim before submitting it'
        );
      }

      // Get plan for snapshot
      const plan = await this.plansService.getById(data.plan_id);
      if (!plan) {
        throw new ValidationError('Insurance plan not found');
      }

      // Create plan snapshot
      const planSnapshot: PlanSnapshot = {
        name: plan.name,
        provider_name: plan.provider_name,
        policy_number: plan.policy_number,
        member_id: plan.member_id,
        owner: plan.owner,
        portal_url: plan.portal_url,
      };

      // Validate amount_claimed
      if (typeof data.amount_claimed !== 'number' || data.amount_claimed < 0) {
        throw new ValidationError('Amount claimed must be a non-negative number');
      }

      // Validate documents_sent
      if (!Array.isArray(data.documents_sent)) {
        throw new ValidationError('Documents sent must be an array');
      }

      // Verify all document IDs exist
      for (const docId of data.documents_sent) {
        const docExists = claim.documents.some((d) => d.id === docId);
        if (!docExists) {
          throw new ValidationError(`Document ${docId} not found on this claim`);
        }
      }

      const newSubmission: ClaimSubmission = {
        id: crypto.randomUUID(),
        plan_id: data.plan_id,
        plan_snapshot: planSnapshot,
        status: 'draft',
        amount_claimed: data.amount_claimed,
        documents_sent: data.documents_sent,
      };

      claim.submissions.push(newSubmission);
      claim.status = deriveClaimStatus(claim);
      claim.updated_at = new Date().toISOString();

      claims[index] = claim;
      await this.storage.writeJSON(STORAGE_PATH, claims);

      console.log('[InsuranceClaimsService] Added submission to claim #', claim.claim_number);
      return newSubmission;
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to add submission:', error);
      throw error;
    }
  }

  /**
   * Change one plan's submission, then bring the plans after it into step.
   *
   * Rules:
   * - Only the SubmissionUpdate fields are applied; `null` or '' clears a field.
   * - Approved and paid need the amount the insurer approved. Denied is always $0.
   * - Paid only follows approved. Waiting for a previous plan is set by the app, not clients.
   * - Moving to pending, approved/denied or paid fills a missing submitted, decided or
   *   paid date with today, so the Budget knows which month the money belongs to.
   * - A change in status or amount recalculates later unsubmitted plans: they claim what's
   *   left, or go back to waiting if this plan is no longer decided.
   */
  public async updateSubmission(
    claimId: string,
    submissionId: string,
    updates: SubmissionUpdate
  ): Promise<ClaimSubmission | null> {
    try {
      const claims = await this.getAllRaw();
      const claimIndex = claims.findIndex((c) => c.id === claimId);

      if (claimIndex === -1) {
        console.warn(`[InsuranceClaimsService] Claim ${claimId} not found`);
        return null;
      }

      const claim = claims[claimIndex];
      const subIndex = claim.submissions.findIndex((s) => s.id === submissionId);

      if (subIndex === -1) {
        console.warn(`[InsuranceClaimsService] Submission ${submissionId} not found`);
        return null;
      }

      const original = claim.submissions[subIndex];
      const merged: ClaimSubmission = { ...original };
      const mergedFields = merged as unknown as Record<string, unknown>;
      for (const field of SUBMISSION_UPDATE_FIELDS) {
        if (!(field in updates)) continue;
        const value = updates[field];
        if (value === null || value === '') {
          delete mergedFields[field];
        } else if (value !== undefined) {
          mergedFields[field] = typeof value === 'string' ? value.trim() : value;
        }
      }

      if (
        merged.status !== original.status &&
        !CLIENT_SUBMISSION_STATUSES.includes(merged.status)
      ) {
        throw new ValidationError(
          merged.status === 'awaiting_previous'
            ? 'Waiting for a previous plan is set automatically'
            : `Unknown submission status: ${merged.status}`
        );
      }
      if (
        updates.amount_reimbursed !== undefined &&
        updates.amount_reimbursed !== null &&
        (typeof updates.amount_reimbursed !== 'number' ||
          !Number.isInteger(updates.amount_reimbursed) ||
          updates.amount_reimbursed < 0)
      ) {
        throw new ValidationError('Approved amount must be zero or more');
      }
      if (merged.eob_document_id && !claim.documents.some((d) => d.id === merged.eob_document_id)) {
        throw new ValidationError('EOB document not found on this claim');
      }

      const statusChanged = merged.status !== original.status;
      if (statusChanged && merged.status === 'paid' && original.status !== 'approved') {
        throw new ValidationError('Record the approval before marking the money received');
      }
      if (
        (merged.status === 'approved' || merged.status === 'paid') &&
        (statusChanged || 'amount_reimbursed' in updates) &&
        typeof merged.amount_reimbursed !== 'number'
      ) {
        throw new ValidationError('Enter the amount the insurer approved');
      }
      if (merged.status === 'denied') {
        merged.amount_reimbursed = 0;
      }

      const today = getTodayLocalDateString();
      if (statusChanged) {
        if (merged.status === 'pending' && !merged.date_submitted) {
          merged.date_submitted = today;
        }
        if ((merged.status === 'approved' || merged.status === 'denied') && !merged.date_resolved) {
          merged.date_resolved = today;
        }
        if (merged.status === 'paid' && !merged.date_paid) {
          merged.date_paid = today;
        }
      }

      claim.submissions[subIndex] = merged;

      if (statusChanged || merged.amount_reimbursed !== original.amount_reimbursed) {
        const adjustments = recalculateDownstreamSubmissions(claim, {
          afterIndex: subIndex,
          demoteIfPreviousUndecided: isDecided(original.status) && !isDecided(merged.status),
        });
        for (const change of adjustments) {
          console.log(
            `[InsuranceClaimsService] ${change.plan_name}: ${change.field} ${change.from} -> ${change.to}`
          );
        }
      }

      claim.status = deriveClaimStatus(claim);
      claim.updated_at = new Date().toISOString();

      claims[claimIndex] = claim;
      await this.storage.writeJSON(STORAGE_PATH, claims);

      console.log('[InsuranceClaimsService] Updated submission on claim #', claim.claim_number);
      return merged;
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to update submission:', error);
      throw error;
    }
  }

  public async deleteSubmission(claimId: string, submissionId: string): Promise<void> {
    try {
      const claims = await this.getAllRaw();
      const claimIndex = claims.findIndex((c) => c.id === claimId);

      if (claimIndex === -1) {
        throw new NotFoundError('Claim');
      }

      const claim = claims[claimIndex];
      const subIndex = claim.submissions.findIndex((s) => s.id === submissionId);

      if (subIndex === -1) {
        throw new NotFoundError('Submission');
      }

      claim.submissions.splice(subIndex, 1);
      // The plan after the deleted one may now be next in line
      recalculateDownstreamSubmissions(claim, { afterIndex: subIndex - 1 });

      claim.status = deriveClaimStatus(claim);
      claim.updated_at = new Date().toISOString();

      claims[claimIndex] = claim;
      await this.storage.writeJSON(STORAGE_PATH, claims);

      console.log('[InsuranceClaimsService] Deleted submission from claim #', claim.claim_number);
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to delete submission:', error);
      throw error;
    }
  }

  // ============================================================================
  // Bill Payment Methods
  // ============================================================================

  /**
   * Mark a claim's bill as paid or unpaid (independent of submission status).
   * This allows users to signal that the provider bill has been paid
   * before the insurance claims process has begun.
   */
  public async markBillPaid(id: string, paid: boolean): Promise<InsuranceClaim | null> {
    try {
      const claims = await this.getAllRaw();
      const index = claims.findIndex((c) => c.id === id);

      if (index === -1) {
        console.warn(`[InsuranceClaimsService] Claim ${id} not found`);
        return null;
      }

      const claim = claims[index];

      // Don't allow marking expected expenses as paid (they should be converted first)
      if (claim.is_expected) {
        throw new ValidationError('Cannot mark expected expenses as paid - convert to claim first');
      }

      const now = new Date().toISOString();
      claims[index] = {
        ...claim,
        bill_paid: paid,
        bill_paid_date: paid ? now.split('T')[0] : undefined,
        updated_at: now,
      };

      await this.storage.writeJSON(STORAGE_PATH, claims);

      console.log(
        `[InsuranceClaimsService] Claim #${claim.claim_number} bill marked as ${paid ? 'paid' : 'unpaid'}`
      );
      return claims[index];
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to mark bill paid:', error);
      throw error;
    }
  }

  // ============================================================================
  // Expected Expense Methods
  // Budget entries (bill/income) are VIRTUAL - they are injected by MonthsService
  // when loading month data, based on claims in that month. No physical instances
  // are created or stored.
  // ============================================================================

  /**
   * Get all claims for a specific month (used by MonthsService to inject virtual entries)
   */
  public async getClaimsForMonth(month: string): Promise<InsuranceClaim[]> {
    try {
      const claims = await this.getAllRaw();
      return claims.filter((claim) => {
        const claimMonth = claim.service_date.substring(0, 7);
        return claimMonth === month;
      });
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to get claims for month:', error);
      return [];
    }
  }

  /**
   * Claims that put something in a month's Budget: the bill in its service month,
   * and each plan's reimbursement in the month its money moves.
   */
  public async getClaimsWithBudgetActivity(month: string): Promise<InsuranceClaim[]> {
    try {
      const claims = await this.getAllRaw();
      return claims.filter((claim) => getClaimBudgetMonths(claim).has(month));
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to get claims for month:', error);
      return [];
    }
  }

  /**
   * Create an expected insurance expense (virtual - no physical bill/income instances)
   */
  public async createExpectedExpense(data: {
    family_member_id: string;
    category_id: string;
    provider_name?: string;
    provider_id?: string;
    appointment_date: string;
    expected_cost: number;
    expected_reimbursement: number;
    payment_source_id: string;
  }): Promise<InsuranceClaim> {
    try {
      // Validate
      if (!data.family_member_id) throw new ValidationError('Family member is required');
      if (!data.category_id) throw new ValidationError('Category is required');
      if (!data.appointment_date) throw new ValidationError('Appointment date is required');
      if (data.expected_cost === undefined || data.expected_cost < 0) {
        throw new ValidationError('Expected cost must be non-negative');
      }
      if (data.expected_reimbursement === undefined || data.expected_reimbursement < 0) {
        throw new ValidationError('Expected reimbursement must be non-negative');
      }
      if (!data.payment_source_id) throw new ValidationError('Payment source is required');

      // Get family member
      const familyMember = await this.familyMembersService.getById(data.family_member_id);
      if (!familyMember) throw new NotFoundError('Family member');

      // Get insurance category
      const insuranceCategory = await this.categoriesService.getById(data.category_id);
      if (!insuranceCategory) throw new NotFoundError('Insurance category');

      // Resolve provider_id -> provider_name snapshot
      const { providerId, providerName } = await this.resolveProvider(
        data.provider_id,
        data.category_id
      );

      const now = new Date().toISOString();
      const claims = await this.getAllRaw();

      const newClaim: InsuranceClaim = {
        id: crypto.randomUUID(),
        claim_number: 0, // Expected claims don't get a claim number until converted
        family_member_id: data.family_member_id,
        family_member_name: familyMember.name,
        category_id: data.category_id,
        category_name: insuranceCategory.name,
        provider_name: providerId ? providerName : data.provider_name,
        provider_id: providerId,
        service_date: data.appointment_date,
        total_amount: data.expected_cost,
        status: 'expected',
        documents: [],
        submissions: [],
        is_expected: true,
        expected_cost: data.expected_cost,
        expected_reimbursement: data.expected_reimbursement,
        scheduled_at: now,
        payment_source_id: data.payment_source_id,
        bill_paid: false,
        created_at: now,
        updated_at: now,
      };

      claims.push(newClaim);
      await this.storage.writeJSON(STORAGE_PATH, claims);

      console.log(
        '[InsuranceClaimsService] Created expected expense for',
        familyMember.name,
        'on',
        data.appointment_date
      );
      return newClaim;
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to create expected expense:', error);
      throw error;
    }
  }

  /**
   * Update an expected insurance expense
   */
  public async updateExpectedExpense(
    id: string,
    updates: {
      family_member_id?: string;
      category_id?: string;
      provider_name?: string;
      provider_id?: string;
      appointment_date?: string;
      expected_cost?: number;
      expected_reimbursement?: number;
      payment_source_id?: string;
    }
  ): Promise<InsuranceClaim | null> {
    try {
      const claims = await this.getAllRaw();
      const index = claims.findIndex((c) => c.id === id);

      if (index === -1) {
        console.warn(`[InsuranceClaimsService] Expected expense ${id} not found`);
        return null;
      }

      const claim = claims[index];
      if (claim.status !== 'expected' || !claim.is_expected) {
        throw new ValidationError('Can only update expected expenses');
      }

      const now = new Date().toISOString();

      // Update denormalized names if needed
      let familyMemberName = claim.family_member_name;
      if (updates.family_member_id && updates.family_member_id !== claim.family_member_id) {
        const familyMember = await this.familyMembersService.getById(updates.family_member_id);
        if (!familyMember) throw new NotFoundError('Family member');
        familyMemberName = familyMember.name;
      }

      let categoryName = claim.category_name;
      if (updates.category_id && updates.category_id !== claim.category_id) {
        const insuranceCategory = await this.categoriesService.getById(updates.category_id);
        if (!insuranceCategory) throw new NotFoundError('Insurance category');
        categoryName = insuranceCategory.name;
      }

      // Resolve provider_id changes (same logic as update())
      let resolvedProviderId = claim.provider_id;
      let resolvedProviderName = claim.provider_name;
      if (updates.provider_id !== undefined) {
        const { providerId, providerName } = await this.resolveProvider(
          updates.provider_id,
          updates.category_id || claim.category_id
        );
        resolvedProviderId = providerId;
        resolvedProviderName = providerName;
      } else if (updates.provider_name !== undefined) {
        resolvedProviderName = updates.provider_name || undefined;
      }

      const expectedCost =
        updates.expected_cost !== undefined ? updates.expected_cost : claim.expected_cost || 0;
      const expectedReimbursement =
        updates.expected_reimbursement !== undefined
          ? updates.expected_reimbursement
          : claim.expected_reimbursement || 0;

      // Update claim
      claims[index] = {
        ...claim,
        family_member_id: updates.family_member_id || claim.family_member_id,
        family_member_name: familyMemberName,
        category_id: updates.category_id || claim.category_id,
        category_name: categoryName,
        provider_id: resolvedProviderId,
        provider_name: resolvedProviderName,
        service_date: updates.appointment_date || claim.service_date,
        total_amount: expectedCost,
        expected_cost: expectedCost,
        expected_reimbursement: expectedReimbursement,
        payment_source_id: updates.payment_source_id || claim.payment_source_id,
        updated_at: now,
      };

      await this.storage.writeJSON(STORAGE_PATH, claims);
      console.log('[InsuranceClaimsService] Updated expected expense', id);
      return claims[index];
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to update expected expense:', error);
      throw error;
    }
  }

  /**
   * Cancel an expected insurance expense (just deletes the claim - no physical instances to clean up)
   */
  public async cancelExpectedExpense(id: string): Promise<void> {
    try {
      const claims = await this.getAllRaw();
      const claim = claims.find((c) => c.id === id);

      if (!claim) {
        throw new NotFoundError('Expected expense');
      }

      if (claim.status !== 'expected' || !claim.is_expected) {
        throw new ValidationError('Can only cancel expected expenses');
      }

      // Simply remove the claim - no physical instances to clean up (they're virtual)
      const filtered = claims.filter((c) => c.id !== id);
      await this.storage.writeJSON(STORAGE_PATH, filtered);

      console.log('[InsuranceClaimsService] Cancelled expected expense', id);
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to cancel expected expense:', error);
      throw error;
    }
  }

  /**
   * Convert an expected expense to an actual claim
   * Creates submissions for each of the family member's plans
   */
  public async convertExpectedToClaim(
    id: string,
    // update_bill_amount is accepted from older clients and ignored: the bill always
    // shows the claim's actual cost
    data: { actual_cost: number; bill_paid?: boolean; update_bill_amount?: boolean }
  ): Promise<InsuranceClaim> {
    try {
      const claims = await this.getAllRaw();
      const index = claims.findIndex((c) => c.id === id);

      if (index === -1) {
        throw new NotFoundError('Expected expense');
      }

      const claim = claims[index];
      if (claim.status !== 'expected' || !claim.is_expected) {
        throw new ValidationError('Can only convert expected expenses');
      }

      if (data.actual_cost < 0) {
        throw new ValidationError('Actual cost must be non-negative');
      }

      const now = new Date().toISOString();

      // Get next claim number
      const claimNumber = await this.getNextClaimNumber();

      // Get family member for submissions
      const familyMember = await this.familyMembersService.getById(claim.family_member_id);
      if (!familyMember) throw new NotFoundError('Family member');

      // Auto-generate draft submissions based on family member's plans
      // Each submission becomes a potential income source when reimbursed
      const submissions: ClaimSubmission[] = [];
      const memberPlans = familyMember.plans || [];

      for (let i = 0; i < memberPlans.length; i++) {
        const planId = memberPlans[i];
        const plan = await this.plansService.getById(planId);

        if (!plan || !plan.is_active) continue;

        const planSnapshot: PlanSnapshot = {
          name: plan.name,
          provider_name: plan.provider_name,
          policy_number: plan.policy_number,
          member_id: plan.member_id,
          owner: plan.owner,
          portal_url: plan.portal_url,
        };

        const status: SubmissionStatus = submissions.length === 0 ? 'draft' : 'awaiting_previous';

        submissions.push({
          id: crypto.randomUUID(),
          plan_id: planId,
          plan_snapshot: planSnapshot,
          status,
          // First submission gets full amount, subsequent ones start at $0 (placeholder)
          amount_claimed: status === 'awaiting_previous' ? 0 : data.actual_cost,
          // amount_reimbursed starts undefined (not yet reimbursed)
          documents_sent: [],
        });
      }

      // The bill counts as paid unless the caller says otherwise; without a choice it
      // follows whether the expected expense had a payment source
      const billPaid = data.bill_paid ?? !!claim.payment_source_id;
      claims[index] = {
        ...claim,
        claim_number: claimNumber,
        total_amount: data.actual_cost,
        status: 'draft',
        is_expected: false,
        converted_from_expected_at: now,
        submissions,
        bill_paid: billPaid,
        bill_paid_date: billPaid ? getTodayLocalDateString() : undefined,
        updated_at: now,
      };

      await this.storage.writeJSON(STORAGE_PATH, claims);

      console.log(
        '[InsuranceClaimsService] Converted expected expense to claim #',
        claimNumber,
        'with',
        submissions.length,
        'submissions'
      );
      return claims[index];
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to convert expected expense:', error);
      throw error;
    }
  }
}
