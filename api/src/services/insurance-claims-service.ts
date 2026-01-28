// Insurance Claims Service - Full claims lifecycle management
// Includes: claim_number auto-increment, status auto-calculation, documents, submissions

import { StorageServiceImpl } from './storage';
import { InsuranceCategoriesServiceImpl } from './insurance-categories-service';
import { InsurancePlansServiceImpl } from './insurance-plans-service';
import { FamilyMembersServiceImpl } from './family-members-service';
import type { StorageService } from './storage';
import type { InsuranceCategoriesService } from './insurance-categories-service';
import type { InsurancePlansService } from './insurance-plans-service';
import type { FamilyMembersService } from './family-members-service';
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

export interface InsuranceClaimsService {
  // Claims CRUD
  getAll(filters?: ClaimFilters): Promise<InsuranceClaim[]>;
  getById(id: string): Promise<InsuranceClaim | null>;
  create(
    data: Pick<
      InsuranceClaim,
      'family_member_id' | 'category_id' | 'service_date' | 'total_amount'
    > &
      Partial<Pick<InsuranceClaim, 'description' | 'provider_name'>>
  ): Promise<InsuranceClaim>;
  update(
    id: string,
    updates: Partial<
      Pick<
        InsuranceClaim,
        | 'family_member_id'
        | 'category_id'
        | 'description'
        | 'provider_name'
        | 'service_date'
        | 'total_amount'
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
    updates: Partial<
      Pick<
        ClaimSubmission,
        | 'status'
        | 'amount_reimbursed'
        | 'date_submitted'
        | 'date_resolved'
        | 'eob_document_id'
        | 'notes'
      >
    >
  ): Promise<ClaimSubmission | null>;
  deleteSubmission(claimId: string, submissionId: string): Promise<void>;

  // Expected Expenses (scheduled future insurance appointments)
  // Budget entries are virtual - injected by MonthsService, not stored
  getClaimsForMonth(month: string): Promise<InsuranceClaim[]>;
  createExpectedExpense(data: {
    family_member_id: string;
    category_id: string;
    provider_name?: string;
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
      appointment_date?: string;
      expected_cost?: number;
      expected_reimbursement?: number;
      payment_source_id?: string;
    }
  ): Promise<InsuranceClaim | null>;
  cancelExpectedExpense(id: string): Promise<void>;
  convertExpectedToClaim(
    id: string,
    data: { actual_cost: number; update_bill_amount?: boolean }
  ): Promise<InsuranceClaim>;
}

export class InsuranceClaimsServiceImpl implements InsuranceClaimsService {
  private storage: StorageService;
  private categoriesService: InsuranceCategoriesService;
  private plansService: InsurancePlansService;
  private familyMembersService: FamilyMembersService;

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
    this.categoriesService = new InsuranceCategoriesServiceImpl();
    this.plansService = new InsurancePlansServiceImpl();
    this.familyMembersService = new FamilyMembersServiceImpl();
  }

  /**
   * Calculate the claim status based on submission statuses:
   * - draft: No submissions OR all submissions are draft
   * - in_progress: At least one submission is pending OR has mix of draft and final
   * - closed: ALL submissions have final answer (approved/denied) - no drafts allowed
   */
  private calculateClaimStatus(submissions: ClaimSubmission[]): ClaimStatus {
    if (submissions.length === 0) {
      return 'draft';
    }

    const allDraft = submissions.every((s) => s.status === 'draft');
    if (allDraft) {
      return 'draft';
    }

    // Final statuses are approved or denied (partial removed)
    const finalStatuses: SubmissionStatus[] = ['approved', 'denied'];

    // Check if ALL submissions have a final status (no drafts, no pending)
    const allFinal = submissions.every((s) => finalStatuses.includes(s.status));
    if (allFinal) {
      return 'closed';
    }

    // Otherwise it's in progress (has pending, or mix of draft and final)
    return 'in_progress';
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

  private async getAllRaw(): Promise<InsuranceClaim[]> {
    return (await this.storage.readJSON<InsuranceClaim[]>(STORAGE_PATH)) || [];
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
            const claimYear = new Date(c.service_date).getFullYear();
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
      Partial<Pick<InsuranceClaim, 'description' | 'provider_name'>>
  ): Promise<InsuranceClaim> {
    try {
      // Validate
      const validation = this.validate(data);
      if (!validation.isValid) {
        throw new Error('Validation failed: ' + validation.errors.join(', '));
      }

      // Get family member for denormalized name
      const familyMember = await this.familyMembersService.getById(data.family_member_id);
      if (!familyMember) {
        throw new Error('Family member not found');
      }

      // Get category for denormalized name
      const category = await this.categoriesService.getById(data.category_id);
      if (!category) {
        throw new Error('Category not found');
      }

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
        provider_name: data.provider_name,
        service_date: data.service_date,
        total_amount: data.total_amount,
        status: 'draft',
        documents: [],
        submissions,
        is_expected: false, // Regular claims are not expected expenses
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
        | 'provider_name'
        | 'service_date'
        | 'total_amount'
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

      // If family member changed, update denormalized name
      let familyMemberName = claims[index].family_member_name;
      if (updates.family_member_id && updates.family_member_id !== claims[index].family_member_id) {
        const familyMember = await this.familyMembersService.getById(updates.family_member_id);
        if (!familyMember) {
          throw new Error('Family member not found');
        }
        familyMemberName = familyMember.name;
      }

      // If category changed, update denormalized name
      let categoryName = claims[index].category_name;
      if (updates.category_id && updates.category_id !== claims[index].category_id) {
        const category = await this.categoriesService.getById(updates.category_id);
        if (!category) {
          throw new Error('Category not found');
        }
        categoryName = category.name;
      }

      const now = new Date().toISOString();
      const updatedClaim: InsuranceClaim = {
        ...claims[index],
        ...updates,
        family_member_name: familyMemberName,
        category_name: categoryName,
        updated_at: now,
      };

      // Validate the merged data
      const validation = this.validate(updatedClaim);
      if (!validation.isValid) {
        throw new Error('Validation failed: ' + validation.errors.join(', '));
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
        throw new Error('Claim not found');
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
    try {
      const claims = await this.getAllRaw();

      let pending_count = 0;
      let pending_amount = 0;
      let closed_count = 0;
      let reimbursed_amount = 0;

      for (const claim of claims) {
        if (claim.status === 'in_progress') {
          pending_count++;
          // Sum pending submission amounts
          for (const sub of claim.submissions) {
            if (sub.status === 'pending') {
              pending_amount += sub.amount_claimed;
            }
          }
        } else if (claim.status === 'closed') {
          closed_count++;
          // Sum reimbursed amounts from resolved submissions
          for (const sub of claim.submissions) {
            if (sub.amount_reimbursed !== undefined) {
              reimbursed_amount += sub.amount_reimbursed;
            }
          }
        }
      }

      return {
        pending_count,
        pending_amount,
        closed_count,
        reimbursed_amount,
      };
    } catch (error) {
      console.error('[InsuranceClaimsService] Failed to get summary:', error);
      return {
        pending_count: 0,
        pending_amount: 0,
        closed_count: 0,
        reimbursed_amount: 0,
      };
    }
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
        throw new Error('Claim not found');
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
        throw new Error('Claim not found');
      }

      const claim = claims[index];
      const docIndex = claim.documents.findIndex((d) => d.id === documentId);

      if (docIndex === -1) {
        throw new Error('Document not found');
      }

      const document = claim.documents[docIndex];

      // Check if document is referenced by any submission
      for (const sub of claim.submissions) {
        if (sub.documents_sent.includes(documentId) || sub.eob_document_id === documentId) {
          throw new Error('Cannot delete document that is referenced by a submission');
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
        throw new Error('Claim not found');
      }

      // Get plan for snapshot
      const plan = await this.plansService.getById(data.plan_id);
      if (!plan) {
        throw new Error('Insurance plan not found');
      }

      // Create plan snapshot
      const planSnapshot: PlanSnapshot = {
        name: plan.name,
        provider_name: plan.provider_name,
        policy_number: plan.policy_number,
        member_id: plan.member_id,
        owner: plan.owner,
        // priority: plan.priority, // REMOVED
        portal_url: plan.portal_url,
      };

      const claim = claims[index];

      // Validate amount_claimed
      if (typeof data.amount_claimed !== 'number' || data.amount_claimed < 0) {
        throw new Error('Amount claimed must be a non-negative number');
      }

      // Validate documents_sent
      if (!Array.isArray(data.documents_sent)) {
        throw new Error('Documents sent must be an array');
      }

      // Verify all document IDs exist
      for (const docId of data.documents_sent) {
        const docExists = claim.documents.some((d) => d.id === docId);
        if (!docExists) {
          throw new Error(`Document ${docId} not found on this claim`);
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

      // Recalculate claim status
      claim.status = this.calculateClaimStatus(claim.submissions);
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

  public async updateSubmission(
    claimId: string,
    submissionId: string,
    updates: Partial<
      Pick<
        ClaimSubmission,
        | 'status'
        | 'amount_reimbursed'
        | 'date_submitted'
        | 'date_resolved'
        | 'eob_document_id'
        | 'notes'
      >
    >
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

      // Validate EOB document if provided
      if (updates.eob_document_id) {
        const docExists = claim.documents.some((d) => d.id === updates.eob_document_id);
        if (!docExists) {
          throw new Error('EOB document not found on this claim');
        }
      }

      const updatedSubmission: ClaimSubmission = {
        ...claim.submissions[subIndex],
        ...updates,
      };

      claim.submissions[subIndex] = updatedSubmission;

      // Cascade logic: when a submission is approved/denied, activate the next awaiting submission
      if (updates.status === 'approved' || updates.status === 'denied') {
        // Find the next submission with status 'awaiting_previous' (must be after current in array order)
        const nextAwaitingIndex = claim.submissions.findIndex(
          (s, idx) => idx > subIndex && s.status === 'awaiting_previous'
        );

        if (nextAwaitingIndex !== -1) {
          // Calculate total reimbursed from all submissions before the awaiting one
          const totalReimbursed = claim.submissions
            .slice(0, nextAwaitingIndex)
            .reduce((sum, s) => sum + (s.amount_reimbursed || 0), 0);

          // Remaining amount to claim (minimum 0)
          const remainingAmount = Math.max(0, claim.total_amount - totalReimbursed);

          // Activate the next submission
          claim.submissions[nextAwaitingIndex].status = 'draft';
          claim.submissions[nextAwaitingIndex].amount_claimed = remainingAmount;

          console.log(
            '[InsuranceClaimsService] Cascaded to next submission:',
            claim.submissions[nextAwaitingIndex].plan_snapshot.name,
            'with amount:',
            remainingAmount
          );
        }
      }

      // Recalculate claim status
      claim.status = this.calculateClaimStatus(claim.submissions);
      claim.updated_at = new Date().toISOString();

      claims[claimIndex] = claim;
      await this.storage.writeJSON(STORAGE_PATH, claims);

      console.log('[InsuranceClaimsService] Updated submission on claim #', claim.claim_number);
      return updatedSubmission;
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
        throw new Error('Claim not found');
      }

      const claim = claims[claimIndex];
      const subIndex = claim.submissions.findIndex((s) => s.id === submissionId);

      if (subIndex === -1) {
        throw new Error('Submission not found');
      }

      claim.submissions.splice(subIndex, 1);

      // Recalculate claim status
      claim.status = this.calculateClaimStatus(claim.submissions);
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
   * Create an expected insurance expense (virtual - no physical bill/income instances)
   */
  public async createExpectedExpense(data: {
    family_member_id: string;
    category_id: string;
    provider_name?: string;
    appointment_date: string;
    expected_cost: number;
    expected_reimbursement: number;
    payment_source_id: string;
  }): Promise<InsuranceClaim> {
    try {
      // Validate
      if (!data.family_member_id) throw new Error('Family member is required');
      if (!data.category_id) throw new Error('Category is required');
      if (!data.appointment_date) throw new Error('Appointment date is required');
      if (data.expected_cost === undefined || data.expected_cost < 0) {
        throw new Error('Expected cost must be non-negative');
      }
      if (data.expected_reimbursement === undefined || data.expected_reimbursement < 0) {
        throw new Error('Expected reimbursement must be non-negative');
      }
      if (!data.payment_source_id) throw new Error('Payment source is required');

      // Get family member
      const familyMember = await this.familyMembersService.getById(data.family_member_id);
      if (!familyMember) throw new Error('Family member not found');

      // Get insurance category
      const insuranceCategory = await this.categoriesService.getById(data.category_id);
      if (!insuranceCategory) throw new Error('Insurance category not found');

      const now = new Date().toISOString();
      const claims = await this.getAllRaw();

      const newClaim: InsuranceClaim = {
        id: crypto.randomUUID(),
        claim_number: 0, // Expected claims don't get a claim number until converted
        family_member_id: data.family_member_id,
        family_member_name: familyMember.name,
        category_id: data.category_id,
        category_name: insuranceCategory.name,
        provider_name: data.provider_name,
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
        throw new Error('Can only update expected expenses');
      }

      const now = new Date().toISOString();

      // Update denormalized names if needed
      let familyMemberName = claim.family_member_name;
      if (updates.family_member_id && updates.family_member_id !== claim.family_member_id) {
        const familyMember = await this.familyMembersService.getById(updates.family_member_id);
        if (!familyMember) throw new Error('Family member not found');
        familyMemberName = familyMember.name;
      }

      let categoryName = claim.category_name;
      if (updates.category_id && updates.category_id !== claim.category_id) {
        const insuranceCategory = await this.categoriesService.getById(updates.category_id);
        if (!insuranceCategory) throw new Error('Insurance category not found');
        categoryName = insuranceCategory.name;
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
        provider_name: updates.provider_name ?? claim.provider_name,
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
        throw new Error('Expected expense not found');
      }

      if (claim.status !== 'expected' || !claim.is_expected) {
        throw new Error('Can only cancel expected expenses');
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
    data: { actual_cost: number; update_bill_amount?: boolean }
  ): Promise<InsuranceClaim> {
    try {
      const claims = await this.getAllRaw();
      const index = claims.findIndex((c) => c.id === id);

      if (index === -1) {
        throw new Error('Expected expense not found');
      }

      const claim = claims[index];
      if (claim.status !== 'expected' || !claim.is_expected) {
        throw new Error('Can only convert expected expenses');
      }

      if (data.actual_cost < 0) {
        throw new Error('Actual cost must be non-negative');
      }

      const now = new Date().toISOString();

      // Get next claim number
      const claimNumber = await this.getNextClaimNumber();

      // Get family member for submissions
      const familyMember = await this.familyMembersService.getById(claim.family_member_id);
      if (!familyMember) throw new Error('Family member not found');

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

      // Update the claim
      claims[index] = {
        ...claim,
        claim_number: claimNumber,
        total_amount: data.actual_cost,
        status: 'draft',
        is_expected: false,
        converted_from_expected_at: now,
        submissions,
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
