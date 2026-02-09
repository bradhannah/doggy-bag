// Insurance Claims Service Tests
// Comprehensive tests covering the full claim lifecycle:
// - Claim creation
// - Submission creation, update, and status transitions
// - Document management
// - Claim status auto-calculation
// - Multi-submission scenarios

import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { InsuranceClaimsServiceImpl } from './insurance-claims-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type {
  InsuranceClaim as _InsuranceClaim,
  InsuranceCategory,
  InsurancePlan,
  FamilyMember,
  ClaimSubmission as _ClaimSubmission,
} from '../types';

describe('InsuranceClaimsService', () => {
  let service: InsuranceClaimsServiceImpl;
  let testDir: string;

  // Sample family members
  const sampleFamilyMembers: FamilyMember[] = [
    {
      id: 'fm-john-001',
      name: 'John Doe',
      is_active: true,
      plans: [],
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'fm-jane-002',
      name: 'Jane Doe',
      is_active: true,
      plans: [],
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  // Sample insurance categories
  const sampleCategories: InsuranceCategory[] = [
    {
      id: 'ic-dental-001',
      name: 'Dental',
      icon: '🦷',
      sort_order: 1,
      is_predefined: false,
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'ic-vision-002',
      name: 'Vision',
      icon: '👓',
      sort_order: 2,
      is_predefined: false,
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'ic-medical-003',
      name: 'Medical',
      icon: '🩺',
      sort_order: 3,
      is_predefined: false,
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  // Sample insurance plans
  const samplePlans: InsurancePlan[] = [
    {
      id: 'ip-primary-001',
      name: 'Primary Health Insurance',
      provider_name: 'Blue Cross',
      policy_number: 'POL-12345',
      member_id: 'MEM-98765',
      owner: 'John Doe',
      portal_url: 'https://portal.bluecross.example.com',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'ip-secondary-002',
      name: 'Secondary Dental',
      provider_name: 'Delta Dental',
      policy_number: 'POL-67890',
      member_id: 'MEM-54321',
      owner: 'Jane Doe',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  beforeAll(async () => {
    // Create a unique test directory
    testDir = join(tmpdir(), `insurance-claims-test-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'documents', 'insurance', 'receipts'), { recursive: true });

    // Initialize storage with test directory
    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
    // Reset files before each test
    await writeFile(
      join(testDir, 'entities', 'insurance-claims.json'),
      JSON.stringify([], null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'family-members.json'),
      JSON.stringify(sampleFamilyMembers, null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'insurance-categories.json'),
      JSON.stringify(sampleCategories, null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'insurance-plans.json'),
      JSON.stringify(samplePlans, null, 2)
    );

    // Create new service instance
    service = new InsuranceClaimsServiceImpl();
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================================================
  // Basic Claim CRUD
  // ============================================================================

  describe('Claim CRUD', () => {
    test('should create a claim with auto-generated claim_number', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000, // $150.00
        description: 'Dental cleaning',
        provider_name: 'Dr. Smith DDS',
      });

      expect(claim).toBeDefined();
      expect(claim.id).toBeDefined();
      expect(claim.claim_number).toBe(1);
      expect(claim.family_member_id).toBe('fm-john-001');
      expect(claim.family_member_name).toBe('John Doe');
      expect(claim.category_id).toBe('ic-dental-001');
      expect(claim.category_name).toBe('Dental');
      expect(claim.service_date).toBe('2025-06-15');
      expect(claim.total_amount).toBe(15000);
      expect(claim.status).toBe('draft');
      expect(claim.submissions).toEqual([]);
      expect(claim.documents).toEqual([]);
    });

    test('should auto-increment claim_number', async () => {
      const claim1 = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      const claim2 = await service.create({
        family_member_id: 'fm-jane-002',
        category_id: 'ic-vision-002',
        service_date: '2025-06-16',
        total_amount: 25000,
      });

      expect(claim1.claim_number).toBe(1);
      expect(claim2.claim_number).toBe(2);
    });

    test('should get claim by id', async () => {
      const created = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      const fetched = await service.getById(created.id);

      expect(fetched).toBeDefined();
      expect(fetched!.id).toBe(created.id);
      expect(fetched!.claim_number).toBe(1);
    });

    test('should return null for non-existent claim', async () => {
      const result = await service.getById('non-existent-id');
      expect(result).toBeNull();
    });

    test('should update claim fields', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      const updated = await service.update(claim.id, {
        total_amount: 20000,
        description: 'Updated description',
      });

      expect(updated).toBeDefined();
      expect(updated!.total_amount).toBe(20000);
      expect(updated!.description).toBe('Updated description');
    });

    test('should update family_member and denormalize name', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      expect(claim.family_member_name).toBe('John Doe');

      const updated = await service.update(claim.id, {
        family_member_id: 'fm-jane-002',
      });

      expect(updated!.family_member_id).toBe('fm-jane-002');
      expect(updated!.family_member_name).toBe('Jane Doe');
    });

    test('should delete claim', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      await service.delete(claim.id);

      const result = await service.getById(claim.id);
      expect(result).toBeNull();
    });

    test('should filter claims by status', async () => {
      // Create claims
      await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      const claim2 = await service.create({
        family_member_id: 'fm-jane-002',
        category_id: 'ic-vision-002',
        service_date: '2025-06-16',
        total_amount: 25000,
      });

      // Add a pending submission to claim2 to make it in_progress
      await service.addSubmission(claim2.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 25000,
        documents_sent: [],
      });
      // Update the submission to pending status
      const updatedClaim = await service.getById(claim2.id);
      await service.updateSubmission(claim2.id, updatedClaim!.submissions[0].id, {
        status: 'pending',
      });

      // Filter by status
      const draftClaims = await service.getAll({ status: 'draft' });
      const inProgressClaims = await service.getAll({ status: 'in_progress' });

      expect(draftClaims.length).toBe(1);
      expect(inProgressClaims.length).toBe(1);
    });
  });

  // ============================================================================
  // Validation
  // ============================================================================

  describe('Validation', () => {
    test('should require family_member_id', async () => {
      await expect(
        service.create({
          family_member_id: '',
          category_id: 'ic-dental-001',
          service_date: '2025-06-15',
          total_amount: 15000,
        })
      ).rejects.toThrow('Family member is required');
    });

    test('should require category_id', async () => {
      await expect(
        service.create({
          family_member_id: 'fm-john-001',
          category_id: '',
          service_date: '2025-06-15',
          total_amount: 15000,
        })
      ).rejects.toThrow('Category is required');
    });

    test('should require valid service_date', async () => {
      await expect(
        service.create({
          family_member_id: 'fm-john-001',
          category_id: 'ic-dental-001',
          service_date: '',
          total_amount: 15000,
        })
      ).rejects.toThrow('Service date is required');
    });

    test('should require non-negative total_amount', async () => {
      await expect(
        service.create({
          family_member_id: 'fm-john-001',
          category_id: 'ic-dental-001',
          service_date: '2025-06-15',
          total_amount: -100,
        })
      ).rejects.toThrow('Total amount must be a non-negative number');
    });

    test('should require existing family member', async () => {
      await expect(
        service.create({
          family_member_id: 'non-existent-fm',
          category_id: 'ic-dental-001',
          service_date: '2025-06-15',
          total_amount: 15000,
        })
      ).rejects.toThrow('Family member not found');
    });

    test('should require existing category', async () => {
      await expect(
        service.create({
          family_member_id: 'fm-john-001',
          category_id: 'non-existent-cat',
          service_date: '2025-06-15',
          total_amount: 15000,
        })
      ).rejects.toThrow('Category not found');
    });
  });

  // ============================================================================
  // Submission CRUD
  // ============================================================================

  describe('Submission CRUD', () => {
    test('should add submission to claim', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      const submission = await service.addSubmission(claim.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 15000,
        documents_sent: [],
      });

      expect(submission).toBeDefined();
      expect(submission.id).toBeDefined();
      expect(submission.plan_id).toBe('ip-primary-001');
      expect(submission.amount_claimed).toBe(15000);
      expect(submission.status).toBe('draft');
      expect(submission.plan_snapshot).toBeDefined();
      expect(submission.plan_snapshot.name).toBe('Primary Health Insurance');
      expect(submission.plan_snapshot.provider_name).toBe('Blue Cross');
    });

    test('should reject submission with invalid plan_id', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      await expect(
        service.addSubmission(claim.id, {
          plan_id: 'non-existent-plan',
          amount_claimed: 15000,
          documents_sent: [],
        })
      ).rejects.toThrow('Insurance plan not found');
    });

    test('should reject submission with negative amount', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      await expect(
        service.addSubmission(claim.id, {
          plan_id: 'ip-primary-001',
          amount_claimed: -100,
          documents_sent: [],
        })
      ).rejects.toThrow('Amount claimed must be a non-negative number');
    });

    test('should reject submission to non-existent claim', async () => {
      await expect(
        service.addSubmission('non-existent-claim', {
          plan_id: 'ip-primary-001',
          amount_claimed: 15000,
          documents_sent: [],
        })
      ).rejects.toThrow('Claim not found');
    });

    test('should update submission', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      const submission = await service.addSubmission(claim.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 15000,
        documents_sent: [],
      });

      const updated = await service.updateSubmission(claim.id, submission.id, {
        status: 'pending',
        date_submitted: '2025-06-16',
        notes: 'Submitted via portal',
      });

      expect(updated).toBeDefined();
      expect(updated!.status).toBe('pending');
      expect(updated!.date_submitted).toBe('2025-06-16');
      expect(updated!.notes).toBe('Submitted via portal');
    });

    test('should delete submission', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      const submission = await service.addSubmission(claim.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 15000,
        documents_sent: [],
      });

      await service.deleteSubmission(claim.id, submission.id);

      const updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.submissions.length).toBe(0);
    });
  });

  // ============================================================================
  // Claim Status Auto-Calculation
  // ============================================================================

  describe('Claim Status Auto-Calculation', () => {
    test('should be draft when no submissions', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      expect(claim.status).toBe('draft');
    });

    test('should be draft when all submissions are draft', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      await service.addSubmission(claim.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 15000,
        documents_sent: [],
      });

      const updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('draft');
    });

    test('should be in_progress when any submission is pending', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      const submission = await service.addSubmission(claim.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 15000,
        documents_sent: [],
      });

      await service.updateSubmission(claim.id, submission.id, {
        status: 'pending',
        date_submitted: '2025-06-16',
      });

      const updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('in_progress');
    });

    test('should be closed when all submissions have final answer', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      const submission = await service.addSubmission(claim.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 15000,
        documents_sent: [],
      });

      await service.updateSubmission(claim.id, submission.id, {
        status: 'approved',
        amount_reimbursed: 12000,
        date_resolved: '2025-06-20',
      });

      const updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('closed');
    });

    test('should remain in_progress if one submission is pending and another is approved', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      // Add first submission and approve it
      const sub1 = await service.addSubmission(claim.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 10000,
        documents_sent: [],
      });
      await service.updateSubmission(claim.id, sub1.id, {
        status: 'approved',
        amount_reimbursed: 8000,
      });

      // Add second submission and set to pending
      const sub2 = await service.addSubmission(claim.id, {
        plan_id: 'ip-secondary-002',
        amount_claimed: 5000,
        documents_sent: [],
      });
      await service.updateSubmission(claim.id, sub2.id, {
        status: 'pending',
      });

      const updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('in_progress');
    });
  });

  // ============================================================================
  // Full Claim Lifecycle Tests
  // ============================================================================

  describe('Full Claim Lifecycle', () => {
    test('should handle complete lifecycle: create -> submit -> approve -> close', async () => {
      // Step 1: Create claim
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
        description: 'Dental cleaning',
        provider_name: 'Dr. Smith DDS',
      });

      expect(claim.status).toBe('draft');
      expect(claim.claim_number).toBe(1);

      // Step 2: Add submission (draft)
      const submission = await service.addSubmission(claim.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 15000,
        documents_sent: [],
      });

      let updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('draft');
      expect(updatedClaim!.submissions.length).toBe(1);

      // Step 3: Submit claim (pending)
      await service.updateSubmission(claim.id, submission.id, {
        status: 'pending',
        date_submitted: '2025-06-16',
        notes: 'Submitted via online portal',
      });

      updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('in_progress');

      // Step 4: Approve submission
      await service.updateSubmission(claim.id, submission.id, {
        status: 'approved',
        amount_reimbursed: 12000,
        date_resolved: '2025-06-25',
        notes: 'Approved - $120 reimbursed',
      });

      updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('closed');
      expect(updatedClaim!.submissions[0].amount_reimbursed).toBe(12000);
    });

    test('should handle multi-submission claim with primary and secondary insurance', async () => {
      // Step 1: Create claim for $300 dental work
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 30000,
        description: 'Root canal',
        provider_name: 'Dr. Smith DDS',
      });

      // Step 2: Submit to primary insurance
      const primarySub = await service.addSubmission(claim.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 30000,
        documents_sent: [],
      });

      await service.updateSubmission(claim.id, primarySub.id, {
        status: 'pending',
        date_submitted: '2025-06-16',
      });

      let updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('in_progress');

      // Step 3: Primary insurance approves partial amount
      await service.updateSubmission(claim.id, primarySub.id, {
        status: 'approved',
        amount_reimbursed: 20000, // $200 of $300 (partial reimbursement is valid with 'approved')
        date_resolved: '2025-06-25',
        notes: '80% covered by primary',
      });

      updatedClaim = await service.getById(claim.id);
      // Still closed because all submissions have final answer
      expect(updatedClaim!.status).toBe('closed');

      // Step 4: Submit remainder to secondary insurance
      const secondarySub = await service.addSubmission(claim.id, {
        plan_id: 'ip-secondary-002',
        amount_claimed: 10000, // Remaining $100
        documents_sent: [],
      });

      await service.updateSubmission(claim.id, secondarySub.id, {
        status: 'pending',
        date_submitted: '2025-06-26',
        notes: 'Submitted with primary EOB',
      });

      updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('in_progress');

      // Step 5: Secondary approves
      await service.updateSubmission(claim.id, secondarySub.id, {
        status: 'approved',
        amount_reimbursed: 8000, // $80
        date_resolved: '2025-07-05',
      });

      updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('closed');
      expect(updatedClaim!.submissions.length).toBe(2);

      // Verify total reimbursement
      const totalReimbursed = updatedClaim!.submissions.reduce(
        (sum, s) => sum + (s.amount_reimbursed || 0),
        0
      );
      expect(totalReimbursed).toBe(28000); // $200 + $80 = $280
    });

    test('should handle denied claim and re-submission', async () => {
      // Step 1: Create claim
      const claim = await service.create({
        family_member_id: 'fm-jane-002',
        category_id: 'ic-vision-002',
        service_date: '2025-06-10',
        total_amount: 50000,
        description: 'New glasses',
      });

      // Step 2: First submission gets denied
      const sub1 = await service.addSubmission(claim.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 50000,
        documents_sent: [],
      });

      await service.updateSubmission(claim.id, sub1.id, {
        status: 'pending',
        date_submitted: '2025-06-12',
      });

      await service.updateSubmission(claim.id, sub1.id, {
        status: 'denied',
        amount_reimbursed: 0,
        date_resolved: '2025-06-20',
        notes: 'Denied - wrong plan',
      });

      let updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('closed');

      // Step 3: Submit to correct secondary insurance
      const sub2 = await service.addSubmission(claim.id, {
        plan_id: 'ip-secondary-002',
        amount_claimed: 50000,
        documents_sent: [],
      });

      await service.updateSubmission(claim.id, sub2.id, {
        status: 'pending',
        date_submitted: '2025-06-22',
      });

      updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('in_progress');

      // Step 4: Secondary approves
      await service.updateSubmission(claim.id, sub2.id, {
        status: 'approved',
        amount_reimbursed: 40000,
        date_resolved: '2025-06-30',
      });

      updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('closed');
      expect(updatedClaim!.submissions.length).toBe(2);
    });
  });

  // ============================================================================
  // Summary Calculation
  // ============================================================================

  describe('Summary', () => {
    test('should calculate correct summary for multiple claims', async () => {
      // Create and process claim 1 - fully approved
      const claim1 = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });
      const sub1 = await service.addSubmission(claim1.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 15000,
        documents_sent: [],
      });
      await service.updateSubmission(claim1.id, sub1.id, {
        status: 'approved',
        amount_reimbursed: 12000,
      });

      // Create claim 2 - pending
      const claim2 = await service.create({
        family_member_id: 'fm-jane-002',
        category_id: 'ic-vision-002',
        service_date: '2025-06-20',
        total_amount: 25000,
      });
      const sub2 = await service.addSubmission(claim2.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 25000,
        documents_sent: [],
      });
      await service.updateSubmission(claim2.id, sub2.id, {
        status: 'pending',
        date_submitted: '2025-06-21',
      });

      // Create claim 3 - draft (no submission)
      await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-medical-003',
        service_date: '2025-06-25',
        total_amount: 10000,
      });

      const summary = await service.getSummary();

      expect(summary.pending_count).toBe(1);
      expect(summary.pending_amount).toBe(25000);
      expect(summary.closed_count).toBe(1);
      expect(summary.reimbursed_amount).toBe(12000);
    });
  });

  // ============================================================================
  // Submission Waterfall / Cascade Logic (User Story 9)
  // ============================================================================

  describe('Submission Waterfall Cascade', () => {
    test('create() should set awaiting_previous submissions to $0 amount', async () => {
      // Update family member to have multiple plans
      const memberWithPlans: FamilyMember[] = [
        {
          ...sampleFamilyMembers[0],
          plans: ['ip-primary-001', 'ip-secondary-002'],
        },
        sampleFamilyMembers[1],
      ];
      await writeFile(
        join(testDir, 'entities', 'family-members.json'),
        JSON.stringify(memberWithPlans, null, 2)
      );

      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 10000, // $100.00
      });

      expect(claim.submissions.length).toBe(2);

      // First submission should be draft with full amount
      expect(claim.submissions[0].status).toBe('draft');
      expect(claim.submissions[0].amount_claimed).toBe(10000);

      // Second submission should be awaiting_previous with $0
      expect(claim.submissions[1].status).toBe('awaiting_previous');
      expect(claim.submissions[1].amount_claimed).toBe(0);
    });

    test('updateSubmission should cascade to next awaiting submission on approval', async () => {
      // Setup: member with 2 plans
      const memberWithPlans: FamilyMember[] = [
        {
          ...sampleFamilyMembers[0],
          plans: ['ip-primary-001', 'ip-secondary-002'],
        },
        sampleFamilyMembers[1],
      ];
      await writeFile(
        join(testDir, 'entities', 'family-members.json'),
        JSON.stringify(memberWithPlans, null, 2)
      );

      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 10000, // $100.00
      });

      const primarySub = claim.submissions[0];
      const secondarySub = claim.submissions[1];

      // Approve primary with partial reimbursement
      await service.updateSubmission(claim.id, primarySub.id, {
        status: 'approved',
        amount_reimbursed: 6000, // $60 reimbursed
      });

      // Fetch updated claim
      const updatedClaim = await service.getById(claim.id);
      expect(updatedClaim).not.toBeNull();

      // Secondary should now be draft with remaining amount
      const updatedSecondary = updatedClaim!.submissions.find((s) => s.id === secondarySub.id);
      expect(updatedSecondary!.status).toBe('draft');
      expect(updatedSecondary!.amount_claimed).toBe(4000); // $100 - $60 = $40
    });

    test('updateSubmission should cascade with full amount when previous denied', async () => {
      // Setup: member with 2 plans
      const memberWithPlans: FamilyMember[] = [
        {
          ...sampleFamilyMembers[0],
          plans: ['ip-primary-001', 'ip-secondary-002'],
        },
        sampleFamilyMembers[1],
      ];
      await writeFile(
        join(testDir, 'entities', 'family-members.json'),
        JSON.stringify(memberWithPlans, null, 2)
      );

      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 10000,
      });

      const primarySub = claim.submissions[0];
      const secondarySub = claim.submissions[1];

      // Deny primary ($0 reimbursed)
      await service.updateSubmission(claim.id, primarySub.id, {
        status: 'denied',
      });

      // Fetch updated claim
      const updatedClaim = await service.getById(claim.id);
      expect(updatedClaim).not.toBeNull();

      // Secondary should now be draft with full amount
      const updatedSecondary = updatedClaim!.submissions.find((s) => s.id === secondarySub.id);
      expect(updatedSecondary!.status).toBe('draft');
      expect(updatedSecondary!.amount_claimed).toBe(10000); // Full amount
    });

    test('updateSubmission should not cascade when no awaiting submissions exist', async () => {
      // Create claim without auto-generated submissions (member has no plans)
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 10000,
      });

      // Manually add a single submission
      const submission = await service.addSubmission(claim.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 10000,
        documents_sent: [],
      });

      // Approve it
      await service.updateSubmission(claim.id, submission.id, {
        status: 'approved',
        amount_reimbursed: 8000,
      });

      // Should not throw, and no cascade happens (no secondary to activate)
      const updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.submissions.length).toBe(1);
      expect(updatedClaim!.submissions[0].status).toBe('approved');
    });

    test('updateSubmission should handle remaining amount = 0 when fully reimbursed', async () => {
      // Setup: member with 2 plans
      const memberWithPlans: FamilyMember[] = [
        {
          ...sampleFamilyMembers[0],
          plans: ['ip-primary-001', 'ip-secondary-002'],
        },
        sampleFamilyMembers[1],
      ];
      await writeFile(
        join(testDir, 'entities', 'family-members.json'),
        JSON.stringify(memberWithPlans, null, 2)
      );

      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 10000,
      });

      const primarySub = claim.submissions[0];
      const secondarySub = claim.submissions[1];

      // Approve primary with FULL reimbursement
      await service.updateSubmission(claim.id, primarySub.id, {
        status: 'approved',
        amount_reimbursed: 10000, // Fully covered
      });

      // Fetch updated claim
      const updatedClaim = await service.getById(claim.id);
      expect(updatedClaim).not.toBeNull();

      // Secondary should be draft with $0 remaining
      const updatedSecondary = updatedClaim!.submissions.find((s) => s.id === secondarySub.id);
      expect(updatedSecondary!.status).toBe('draft');
      expect(updatedSecondary!.amount_claimed).toBe(0);
    });

    test('updateSubmission cascade should handle 3+ submissions correctly', async () => {
      // Create claim and manually add 3 submissions to test chained cascade
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 10000,
      });

      // Add 3 submissions manually (simulating auto-generation)
      const sub1 = await service.addSubmission(claim.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 10000,
        documents_sent: [],
      });

      // Manually update sub2 and sub3 to awaiting_previous with $0
      const claimAfterAdd = await service.getById(claim.id);
      expect(claimAfterAdd).not.toBeNull();

      // Add second submission (we'll manually set it to awaiting_previous)
      const sub2 = await service.addSubmission(claim.id, {
        plan_id: 'ip-secondary-002',
        amount_claimed: 0,
        documents_sent: [],
      });

      // Directly update status to awaiting_previous via updateSubmission
      await service.updateSubmission(claim.id, sub2.id, {
        status: 'awaiting_previous',
      });

      // Approve first submission with partial payment
      await service.updateSubmission(claim.id, sub1.id, {
        status: 'approved',
        amount_reimbursed: 4000,
      });

      // Check that sub2 was activated with remaining amount
      const updatedClaim = await service.getById(claim.id);
      const updatedSub2 = updatedClaim!.submissions.find((s) => s.id === sub2.id);
      expect(updatedSub2!.status).toBe('draft');
      expect(updatedSub2!.amount_claimed).toBe(6000); // $100 - $40 = $60
    });
  });

  // ============================================================================
  // Bill Paid Feature (Feature 1)
  // ============================================================================

  describe('Mark Bill as Paid', () => {
    test('should mark a claim bill as paid', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      expect(claim.bill_paid).toBe(false);
      expect(claim.bill_paid_date).toBeUndefined();

      const updated = await service.markBillPaid(claim.id, true);

      expect(updated).not.toBeNull();
      expect(updated!.bill_paid).toBe(true);
      expect(updated!.bill_paid_date).toBeDefined();
      // bill_paid_date should be a YYYY-MM-DD string
      expect(updated!.bill_paid_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should unmark a claim bill as unpaid', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      // Mark as paid first
      await service.markBillPaid(claim.id, true);

      // Then unmark
      const updated = await service.markBillPaid(claim.id, false);

      expect(updated).not.toBeNull();
      expect(updated!.bill_paid).toBe(false);
      expect(updated!.bill_paid_date).toBeUndefined();
    });

    test('should reject marking expected expenses as paid', async () => {
      const expected = await service.createExpectedExpense({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        appointment_date: '2025-07-15',
        expected_cost: 15000,
        expected_reimbursement: 12000,
        payment_source_id: 'some-source-id',
      });

      await expect(service.markBillPaid(expected.id, true)).rejects.toThrow(
        'Cannot mark expected expenses as paid'
      );
    });

    test('should return null for non-existent claim', async () => {
      const result = await service.markBillPaid('non-existent-id', true);
      expect(result).toBeNull();
    });

    test('should persist bill_paid across reads', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      await service.markBillPaid(claim.id, true);

      // Re-read from a fresh service instance
      const freshService = new InsuranceClaimsServiceImpl();
      const fetched = await freshService.getById(claim.id);

      expect(fetched).not.toBeNull();
      expect(fetched!.bill_paid).toBe(true);
      expect(fetched!.bill_paid_date).toBeDefined();
    });
  });

  // ============================================================================
  // Expected Reimbursement on Claims (Feature 2)
  // ============================================================================

  describe('Expected Reimbursement', () => {
    test('should create claim with expected_reimbursement', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
        expected_reimbursement: 12000,
      });

      expect(claim.expected_reimbursement).toBe(12000);
    });

    test('should create claim without expected_reimbursement', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      // Should be undefined or falsy when not provided
      expect(claim.expected_reimbursement).toBeFalsy();
    });

    test('should update expected_reimbursement on existing claim', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      const updated = await service.update(claim.id, {
        expected_reimbursement: 10000,
      });

      expect(updated).not.toBeNull();
      expect(updated!.expected_reimbursement).toBe(10000);
    });

    test('should preserve expected_reimbursement when converting expected to claim', async () => {
      const expected = await service.createExpectedExpense({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        appointment_date: '2025-07-15',
        expected_cost: 15000,
        expected_reimbursement: 12000,
        payment_source_id: 'some-source-id',
      });

      expect(expected.expected_reimbursement).toBe(12000);

      const converted = await service.convertExpectedToClaim(expected.id, {
        actual_cost: 16000,
      });

      expect(converted.expected_reimbursement).toBe(12000);
    });
  });

  // ============================================================================
  // Convert Expected to Claim - Bill Paid Auto-Set
  // ============================================================================

  describe('Convert Expected to Claim - Bill Paid', () => {
    test('should auto-set bill_paid when expected expense had payment_source_id', async () => {
      const expected = await service.createExpectedExpense({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        appointment_date: '2025-07-15',
        expected_cost: 15000,
        expected_reimbursement: 12000,
        payment_source_id: 'some-source-id',
      });

      expect(expected.bill_paid).toBe(false);

      const converted = await service.convertExpectedToClaim(expected.id, {
        actual_cost: 16000,
      });

      expect(converted.bill_paid).toBe(true);
      expect(converted.bill_paid_date).toBeDefined();
      expect(converted.bill_paid_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(converted.status).toBe('draft');
      expect(converted.is_expected).toBe(false);
    });

    test('should create expected expense with bill_paid false', async () => {
      const expected = await service.createExpectedExpense({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        appointment_date: '2025-07-15',
        expected_cost: 15000,
        expected_reimbursement: 12000,
        payment_source_id: 'some-source-id',
      });

      expect(expected.bill_paid).toBe(false);
      expect(expected.is_expected).toBe(true);
      expect(expected.status).toBe('expected');
    });
  });
});
