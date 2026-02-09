// Insurance Claims API Handlers
// Includes: CRUD, summary, documents, submissions

import {
  InsuranceClaimsService,
  InsuranceClaimsServiceImpl,
} from '../../services/insurance-claims-service';
import { formatErrorForUser } from '../../utils/errors';
import type { ClaimStatus, DocumentType } from '../../types';
import { readFile } from 'fs/promises';

const claimsService: InsuranceClaimsService = new InsuranceClaimsServiceImpl();

// ============================================================================
// Claims CRUD Handlers
// ============================================================================

export function createInsuranceClaimsHandlerGET() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);

      // Check if this is a single claim request (has ID in path)
      const pathParts = url.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];

      // If the last part looks like a UUID, get single claim
      if (lastPart && lastPart.match(/^[0-9a-f-]{36}$/i)) {
        const claim = await claimsService.getById(lastPart);

        if (!claim) {
          return new Response(
            JSON.stringify({
              error: 'Claim not found',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 404,
            }
          );
        }

        return new Response(JSON.stringify(claim), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Otherwise, get all claims with optional filters
      const status = url.searchParams.get('status') as ClaimStatus | null;
      const category_id = url.searchParams.get('category_id');
      const yearStr = url.searchParams.get('year');
      const year = yearStr ? parseInt(yearStr, 10) : undefined;

      const filters = {
        ...(status && { status }),
        ...(category_id && { category_id }),
        ...(year && !isNaN(year) && { year }),
      };

      const claims = await claimsService.getAll(
        Object.keys(filters).length > 0 ? filters : undefined
      );

      return new Response(JSON.stringify(claims), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[InsuranceClaimsHandler] GET failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load insurance claims',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createInsuranceClaimsSummaryHandler() {
  return async () => {
    try {
      const summary = await claimsService.getSummary();

      return new Response(JSON.stringify(summary), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[InsuranceClaimsHandler] Summary failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to get claims summary',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createInsuranceClaimsHandlerPOST() {
  return async (request: Request) => {
    try {
      const body = await request.json();
      const validation = claimsService.validate(body);

      if (!validation.isValid) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: validation.errors,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const newClaim = await claimsService.create(body);

      return new Response(JSON.stringify(newClaim), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (error) {
      console.error('[InsuranceClaimsHandler] POST failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to create insurance claim',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createInsuranceClaimsHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing claim ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();
      const updatedClaim = await claimsService.update(id, body);

      if (!updatedClaim) {
        return new Response(
          JSON.stringify({
            error: 'Insurance claim not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(updatedClaim), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[InsuranceClaimsHandler] PUT failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update insurance claim',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createInsuranceClaimsHandlerDELETE() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing claim ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      await claimsService.delete(id);

      return new Response(null, {
        status: 204,
      });
    } catch (error) {
      console.error('[InsuranceClaimsHandler] DELETE failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to delete insurance claim',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

// ============================================================================
// Document Handlers
// ============================================================================

export function createClaimDocumentUploadHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      // Path: /api/insurance-claims/{id}/documents
      const claimIdIndex = pathParts.indexOf('insurance-claims') + 1;
      const claimId = pathParts[claimIdIndex];

      if (!claimId) {
        return new Response(
          JSON.stringify({
            error: 'Missing claim ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Parse multipart form data
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const documentType = formData.get('document_type') as DocumentType | null;
      const relatedPlanId = formData.get('related_plan_id') as string | null;
      const notes = formData.get('notes') as string | null;

      if (!file) {
        return new Response(
          JSON.stringify({
            error: 'No file provided',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      if (!documentType || !['receipt', 'eob', 'other'].includes(documentType)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid document type',
            details: 'Document type must be: receipt, eob, or other',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return new Response(
          JSON.stringify({
            error: 'File too large',
            details: 'Maximum file size is 10MB',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      if (!allowedTypes.includes(file.type)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid file type',
            details: 'Allowed types: PDF, JPG, PNG, GIF, WebP',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const document = await claimsService.addDocument(
        claimId,
        file,
        documentType,
        relatedPlanId || undefined,
        notes || undefined
      );

      return new Response(JSON.stringify(document), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (error) {
      console.error('[InsuranceClaimsHandler] Document upload failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to upload document',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createClaimDocumentDownloadHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      // Path: /api/insurance-claims/{id}/documents/{docId}
      const claimIdIndex = pathParts.indexOf('insurance-claims') + 1;
      const claimId = pathParts[claimIdIndex];
      const docId = pathParts[pathParts.length - 1];

      if (!claimId || !docId) {
        return new Response(
          JSON.stringify({
            error: 'Missing claim ID or document ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const docInfo = await claimsService.getDocument(claimId, docId);

      if (!docInfo) {
        return new Response(
          JSON.stringify({
            error: 'Document not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      // Read and return file
      const fileBuffer = await readFile(docInfo.path);

      return new Response(fileBuffer, {
        headers: {
          'Content-Type': docInfo.mimeType,
          'Content-Length': String(fileBuffer.length),
        },
        status: 200,
      });
    } catch (error) {
      console.error('[InsuranceClaimsHandler] Document download failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to download document',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createClaimDocumentDeleteHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      // Path: /api/insurance-claims/{id}/documents/{docId}
      const claimIdIndex = pathParts.indexOf('insurance-claims') + 1;
      const claimId = pathParts[claimIdIndex];
      const docId = pathParts[pathParts.length - 1];

      if (!claimId || !docId) {
        return new Response(
          JSON.stringify({
            error: 'Missing claim ID or document ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      await claimsService.deleteDocument(claimId, docId);

      return new Response(null, {
        status: 204,
      });
    } catch (error) {
      console.error('[InsuranceClaimsHandler] Document delete failed:', error);

      const errorMessage = formatErrorForUser(error);
      const status = errorMessage.includes('referenced') ? 409 : 500;

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to delete document',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status,
        }
      );
    }
  };
}

// ============================================================================
// Submission Handlers
// ============================================================================

export function createClaimSubmissionPOSTHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      // Path: /api/insurance-claims/{id}/submissions
      const claimIdIndex = pathParts.indexOf('insurance-claims') + 1;
      const claimId = pathParts[claimIdIndex];

      if (!claimId) {
        return new Response(
          JSON.stringify({
            error: 'Missing claim ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();

      // Validate required fields
      if (!body.plan_id) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: ['Plan ID is required'],
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      if (body.amount_claimed === undefined || body.amount_claimed === null) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: ['Amount claimed is required'],
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const submission = await claimsService.addSubmission(claimId, {
        plan_id: body.plan_id,
        amount_claimed: body.amount_claimed,
        documents_sent: body.documents_sent || [],
      });

      return new Response(JSON.stringify(submission), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (error) {
      console.error('[InsuranceClaimsHandler] Submission POST failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to create submission',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createClaimSubmissionPUTHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      // Path: /api/insurance-claims/{id}/submissions/{subId}
      const claimIdIndex = pathParts.indexOf('insurance-claims') + 1;
      const claimId = pathParts[claimIdIndex];
      const subId = pathParts[pathParts.length - 1];

      if (!claimId || !subId) {
        return new Response(
          JSON.stringify({
            error: 'Missing claim ID or submission ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();
      const updatedSubmission = await claimsService.updateSubmission(claimId, subId, body);

      if (!updatedSubmission) {
        return new Response(
          JSON.stringify({
            error: 'Submission not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(updatedSubmission), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[InsuranceClaimsHandler] Submission PUT failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update submission',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createClaimSubmissionDELETEHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      // Path: /api/insurance-claims/{id}/submissions/{subId}
      const claimIdIndex = pathParts.indexOf('insurance-claims') + 1;
      const claimId = pathParts[claimIdIndex];
      const subId = pathParts[pathParts.length - 1];

      if (!claimId || !subId) {
        return new Response(
          JSON.stringify({
            error: 'Missing claim ID or submission ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      await claimsService.deleteSubmission(claimId, subId);

      return new Response(null, {
        status: 204,
      });
    } catch (error) {
      console.error('[InsuranceClaimsHandler] Submission DELETE failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to delete submission',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

// ============================================================================
// Bill Payment Handler
// ============================================================================

export function createClaimBillPaidHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      // Path: /api/insurance-claims/{id}/bill-paid
      const claimIdIndex = pathParts.indexOf('insurance-claims') + 1;
      const claimId = pathParts[claimIdIndex];

      if (!claimId) {
        return new Response(
          JSON.stringify({
            error: 'Missing claim ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();

      if (typeof body.paid !== 'boolean') {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: ['paid must be a boolean'],
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const updated = await claimsService.markBillPaid(claimId, body.paid);

      if (!updated) {
        return new Response(
          JSON.stringify({
            error: 'Claim not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(updated), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[InsuranceClaimsHandler] Bill paid PATCH failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update bill payment status',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

// ============================================================================
// Expected Expense Handlers
// ============================================================================

export function createExpectedExpenseHandler() {
  return async (request: Request) => {
    try {
      const body = await request.json();

      // Validate required fields
      if (!body.family_member_id) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: ['Family member is required'],
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      if (!body.category_id) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: ['Insurance category is required'],
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      if (!body.appointment_date) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: ['Appointment date is required'],
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      if (!body.payment_source_id) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: ['Payment source is required'],
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const expectedClaim = await claimsService.createExpectedExpense({
        family_member_id: body.family_member_id,
        category_id: body.category_id,
        provider_name: body.provider_name,
        appointment_date: body.appointment_date,
        expected_cost: body.expected_cost || 0,
        expected_reimbursement: body.expected_reimbursement || 0,
        payment_source_id: body.payment_source_id,
      });

      return new Response(JSON.stringify(expectedClaim), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (error) {
      console.error('[InsuranceClaimsHandler] Create expected expense failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to create expected expense',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function updateExpectedExpenseHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      // Path: /api/insurance-claims/{id}/expected
      const claimIdIndex = pathParts.indexOf('insurance-claims') + 1;
      const id = pathParts[claimIdIndex];

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing claim ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();
      const updated = await claimsService.updateExpectedExpense(id, body);

      if (!updated) {
        return new Response(
          JSON.stringify({
            error: 'Expected expense not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(updated), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[InsuranceClaimsHandler] Update expected expense failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update expected expense',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function cancelExpectedExpenseHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      // Path: /api/insurance-claims/{id}/expected
      const claimIdIndex = pathParts.indexOf('insurance-claims') + 1;
      const id = pathParts[claimIdIndex];

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing claim ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      await claimsService.cancelExpectedExpense(id);

      return new Response(null, {
        status: 204,
      });
    } catch (error) {
      console.error('[InsuranceClaimsHandler] Cancel expected expense failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to cancel expected expense',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function convertExpectedToClaimHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      // Path: /api/insurance-claims/{id}/convert
      const claimIdIndex = pathParts.indexOf('insurance-claims') + 1;
      const id = pathParts[claimIdIndex];

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing claim ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();

      if (body.actual_cost === undefined || body.actual_cost === null) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: ['Actual cost is required'],
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const claim = await claimsService.convertExpectedToClaim(id, {
        actual_cost: body.actual_cost,
        update_bill_amount: body.update_bill_amount,
      });

      return new Response(JSON.stringify(claim), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[InsuranceClaimsHandler] Convert expected expense failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to convert expected expense to claim',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}
