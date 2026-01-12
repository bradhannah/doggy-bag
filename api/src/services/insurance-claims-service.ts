// Insurance Claims Service - Full claims lifecycle management
// Includes: claim_number auto-increment, status auto-calculation, documents, submissions

import { StorageServiceImpl } from './storage';
import { InsuranceCategoriesServiceImpl } from './insurance-categories-service';
import { InsurancePlansServiceImpl } from './insurance-plans-service';
import type { StorageService } from './storage';
import type { InsuranceCategoriesService } from './insurance-categories-service';
import type { InsurancePlansService } from './insurance-plans-service';
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
import { mkdir, unlink, readdir, stat } from 'fs/promises';
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
    data: Pick<InsuranceClaim, 'category_id' | 'service_date' | 'total_amount'> &
      Partial<Pick<InsuranceClaim, 'description' | 'provider_name'>>
  ): Promise<InsuranceClaim>;
  update(
    id: string,
    updates: Partial<
      Pick<
        InsuranceClaim,
        'category_id' | 'description' | 'provider_name' | 'service_date' | 'total_amount'
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
    relatedPlanId?: string
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
}

export class InsuranceClaimsServiceImpl implements InsuranceClaimsService {
  private storage: StorageService;
  private categoriesService: InsuranceCategoriesService;
  private plansService: InsurancePlansService;

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
    this.categoriesService = new InsuranceCategoriesServiceImpl();
    this.plansService = new InsurancePlansServiceImpl();
  }

  /**
   * Calculate claim status based on submissions:
   * - draft: No submissions OR all submissions are draft
   * - in_progress: At least one submission is pending
   * - closed: All submissions have final answer (approved/denied/partial)
   */
  private calculateClaimStatus(submissions: ClaimSubmission[]): ClaimStatus {
    if (submissions.length === 0) {
      return 'draft';
    }

    const hasAnyPending = submissions.some((s) => s.status === 'pending');
    if (hasAnyPending) {
      return 'in_progress';
    }

    const allDraft = submissions.every((s) => s.status === 'draft');
    if (allDraft) {
      return 'draft';
    }

    // Check if all submissions have a final answer
    const finalStatuses: SubmissionStatus[] = ['approved', 'denied', 'partial'];
    const allFinal = submissions.every(
      (s) => finalStatuses.includes(s.status) || s.status === 'draft'
    );
    const hasAnyFinal = submissions.some((s) => finalStatuses.includes(s.status));

    if (allFinal && hasAnyFinal) {
      return 'closed';
    }

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
    data: Pick<InsuranceClaim, 'category_id' | 'service_date' | 'total_amount'> &
      Partial<Pick<InsuranceClaim, 'description' | 'provider_name'>>
  ): Promise<InsuranceClaim> {
    try {
      // Validate
      const validation = this.validate(data);
      if (!validation.isValid) {
        throw new Error('Validation failed: ' + validation.errors.join(', '));
      }

      // Get category for denormalized name
      const category = await this.categoriesService.getById(data.category_id);
      if (!category) {
        throw new Error('Category not found');
      }

      const claims = await this.getAllRaw();
      const claimNumber = await this.getNextClaimNumber();
      const now = new Date().toISOString();

      const newClaim: InsuranceClaim = {
        id: crypto.randomUUID(),
        claim_number: claimNumber,
        category_id: data.category_id,
        category_name: category.name,
        description: data.description,
        provider_name: data.provider_name,
        service_date: data.service_date,
        total_amount: data.total_amount,
        status: 'draft',
        documents: [],
        submissions: [],
        created_at: now,
        updated_at: now,
      };

      claims.push(newClaim);
      await this.storage.writeJSON(STORAGE_PATH, claims);

      console.log('[InsuranceClaimsService] Created claim #', claimNumber);
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
        'category_id' | 'description' | 'provider_name' | 'service_date' | 'total_amount'
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
    relatedPlanId?: string
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
        priority: plan.priority,
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
}
