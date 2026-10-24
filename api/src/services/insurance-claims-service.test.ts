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
  InsuranceProvider,
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

  const sampleProviders: InsuranceProvider[] = [
    {
      id: 'provider-dental-001',
      name: 'Dr. Managed Dental',
      category_ids: ['ic-dental-001'],
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
    await writeFile(
      join(testDir, 'entities', 'insurance-providers.json'),
      JSON.stringify(sampleProviders, null, 2)
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

    test('should snapshot, update, and clear a managed provider', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        provider_id: 'provider-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      expect(claim.provider_id).toBe('provider-dental-001');
      expect(claim.provider_name).toBe('Dr. Managed Dental');

      sampleProviders[0].name = 'Renamed Dental';
      await writeFile(
        join(testDir, 'entities', 'insurance-providers.json'),
        JSON.stringify(sampleProviders, null, 2)
      );
      expect((await service.getById(claim.id))?.provider_name).toBe('Dr. Managed Dental');

      const updated = await service.update(claim.id, { provider_id: 'provider-dental-001' });
      expect(updated?.provider_name).toBe('Renamed Dental');

      const cleared = await service.update(claim.id, { provider_id: '' });
      expect(cleared?.provider_id).toBeUndefined();
      expect(cleared?.provider_name).toBeUndefined();

      sampleProviders[0].name = 'Dr. Managed Dental';
    });

    test('should reject providers outside the selected category', async () => {
      await expect(
        service.create({
          family_member_id: 'fm-john-001',
          category_id: 'ic-vision-002',
          provider_id: 'provider-dental-001',
          service_date: '2025-06-15',
          total_amount: 15000,
        })
      ).rejects.toThrow('Provider is not available for this category');
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

    test('should stay in_progress while approved money has not arrived, then close when paid', async () => {
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

      let updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('in_progress');

      await service.updateSubmission(claim.id, submission.id, {
        status: 'paid',
        date_paid: '2025-06-28',
      });

      updatedClaim = await service.getById(claim.id);
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
      expect(updatedClaim!.status).toBe('in_progress');
      expect(updatedClaim!.submissions[0].amount_reimbursed).toBe(12000);

      // Step 5: Money arrives
      await service.updateSubmission(claim.id, submission.id, {
        status: 'paid',
        date_paid: '2025-06-30',
      });

      updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('closed');
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
      // Approved but not received yet
      expect(updatedClaim!.status).toBe('in_progress');

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
      expect(updatedClaim!.status).toBe('in_progress');
      expect(updatedClaim!.submissions.length).toBe(2);

      // Step 6: Both payments arrive
      await service.updateSubmission(claim.id, primarySub.id, { status: 'paid' });
      await service.updateSubmission(claim.id, secondarySub.id, { status: 'paid' });
      updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('closed');

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

      // Step 4: Secondary approves, then pays
      await service.updateSubmission(claim.id, sub2.id, {
        status: 'approved',
        amount_reimbursed: 40000,
        date_resolved: '2025-06-30',
      });
      await service.updateSubmission(claim.id, sub2.id, { status: 'paid' });

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

      // Claim 1 is approved but not received, so it's still in progress
      expect(summary.pending_count).toBe(2);
      expect(summary.pending_amount).toBe(25000);
      expect(summary.closed_count).toBe(0);
      expect(summary.reimbursed_amount).toBe(0);
      expect(summary.awaiting_payment_count).toBe(1);
      expect(summary.awaiting_payment_amount).toBe(12000);
      expect(summary.waiting_count).toBe(1);
      expect(summary.waiting_amount).toBe(25000);

      // Money for claim 1 arrives: it closes and counts as received
      await service.updateSubmission(claim1.id, sub1.id, {
        status: 'paid',
        date_paid: '2025-06-30',
      });
      const after = await service.getSummary();
      expect(after.closed_count).toBe(1);
      expect(after.reimbursed_amount).toBe(12000);
      expect(after.awaiting_payment_amount).toBe(0);
    });

    test('counts plans ready to submit and money received this year', async () => {
      await writeFile(
        join(testDir, 'entities', 'family-members.json'),
        JSON.stringify(
          [{ ...sampleFamilyMembers[0], plans: ['ip-primary-001', 'ip-secondary-002'] }],
          null,
          2
        )
      );
      const year = new Date().getFullYear();
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: `${year}-01-10`,
        total_amount: 13560,
      });
      const [primary] = claim.submissions;
      await service.updateSubmission(claim.id, primary.id, {
        status: 'approved',
        amount_reimbursed: 12400,
      });
      await service.updateSubmission(claim.id, primary.id, {
        status: 'paid',
        date_paid: `${year}-01-20`,
      });

      const summary = await service.getSummary();
      expect(summary.to_submit_count).toBe(1);
      expect(summary.to_submit_amount).toBe(1160);
      expect(summary.received_year).toBe(year);
      expect(summary.received_this_year_amount).toBe(12400);
      expect(summary.received_this_year_claims).toBe(1);
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
      const thirdPlan: InsurancePlan = {
        ...samplePlans[1],
        id: 'ip-third-003',
        name: 'Third Plan',
      };
      await writeFile(
        join(testDir, 'entities', 'insurance-plans.json'),
        JSON.stringify([...samplePlans, thirdPlan], null, 2)
      );
      await writeFile(
        join(testDir, 'entities', 'family-members.json'),
        JSON.stringify(
          [
            {
              ...sampleFamilyMembers[0],
              plans: ['ip-primary-001', 'ip-secondary-002', 'ip-third-003'],
            },
          ],
          null,
          2
        )
      );

      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 10000,
      });
      const [sub1, sub2, sub3] = claim.submissions;
      expect(sub2.status).toBe('awaiting_previous');
      expect(sub3.status).toBe('awaiting_previous');

      // Primary approves $40: the second plan claims the $60 left; the third keeps waiting
      await service.updateSubmission(claim.id, sub1.id, {
        status: 'approved',
        amount_reimbursed: 4000,
      });
      let updated = await service.getById(claim.id);
      expect(updated!.submissions[1].status).toBe('draft');
      expect(updated!.submissions[1].amount_claimed).toBe(6000);
      expect(updated!.submissions[2].status).toBe('awaiting_previous');

      // Second approves $50: the third claims the last $10
      await service.updateSubmission(claim.id, sub2.id, { status: 'pending' });
      await service.updateSubmission(claim.id, sub2.id, {
        status: 'approved',
        amount_reimbursed: 5000,
      });
      updated = await service.getById(claim.id);
      expect(updated!.submissions[2].status).toBe('draft');
      expect(updated!.submissions[2].amount_claimed).toBe(1000);
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

  // ============================================================================
  // Paid Status Feature
  // ============================================================================

  describe('Paid Status', () => {
    test('should accept paid status transition from approved', async () => {
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

      // First approve
      await service.updateSubmission(claim.id, submission.id, {
        status: 'approved',
        amount_reimbursed: 12000,
        date_resolved: '2025-06-20',
      });

      // Then mark paid
      const updated = await service.updateSubmission(claim.id, submission.id, {
        status: 'paid',
        date_paid: '2025-06-25',
      });

      expect(updated).toBeDefined();
      expect(updated!.status).toBe('paid');
      expect(updated!.date_paid).toBe('2025-06-25');
    });

    test('should reject paid status from draft', async () => {
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

      await expect(
        service.updateSubmission(claim.id, submission.id, {
          status: 'paid',
        })
      ).rejects.toThrow('Record the approval before marking the money received');
    });

    test('should reject paid status from pending', async () => {
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

      await expect(
        service.updateSubmission(claim.id, submission.id, {
          status: 'paid',
        })
      ).rejects.toThrow('Record the approval before marking the money received');
    });

    test('should reject paid status from denied', async () => {
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

      await service.updateSubmission(claim.id, submission.id, {
        status: 'denied',
        date_resolved: '2025-06-20',
      });

      await expect(
        service.updateSubmission(claim.id, submission.id, {
          status: 'paid',
        })
      ).rejects.toThrow('Record the approval before marking the money received');
    });

    test('should allow re-setting paid on already-paid submission', async () => {
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
      });

      await service.updateSubmission(claim.id, submission.id, {
        status: 'paid',
        date_paid: '2025-06-25',
      });

      // Updating paid with a new date should work (already paid -> paid)
      const updated = await service.updateSubmission(claim.id, submission.id, {
        status: 'paid',
        date_paid: '2025-06-26',
      });

      expect(updated!.status).toBe('paid');
      expect(updated!.date_paid).toBe('2025-06-26');
    });

    test('calculateClaimStatus should return closed when all submissions are paid', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      const sub1 = await service.addSubmission(claim.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 10000,
        documents_sent: [],
      });

      const sub2 = await service.addSubmission(claim.id, {
        plan_id: 'ip-secondary-002',
        amount_claimed: 5000,
        documents_sent: [],
      });

      // Approve then pay both
      await service.updateSubmission(claim.id, sub1.id, {
        status: 'approved',
        amount_reimbursed: 8000,
      });
      await service.updateSubmission(claim.id, sub1.id, {
        status: 'paid',
        date_paid: '2025-06-25',
      });

      await service.updateSubmission(claim.id, sub2.id, {
        status: 'approved',
        amount_reimbursed: 4000,
      });
      await service.updateSubmission(claim.id, sub2.id, {
        status: 'paid',
        date_paid: '2025-06-26',
      });

      const updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('closed');
    });

    test('calculateClaimStatus should return closed with mix of paid and denied', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      const sub1 = await service.addSubmission(claim.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 10000,
        documents_sent: [],
      });

      const sub2 = await service.addSubmission(claim.id, {
        plan_id: 'ip-secondary-002',
        amount_claimed: 5000,
        documents_sent: [],
      });

      // Approve and pay first, deny second
      await service.updateSubmission(claim.id, sub1.id, {
        status: 'approved',
        amount_reimbursed: 8000,
      });
      await service.updateSubmission(claim.id, sub1.id, {
        status: 'paid',
        date_paid: '2025-06-25',
      });

      await service.updateSubmission(claim.id, sub2.id, {
        status: 'pending',
        date_submitted: '2025-06-20',
      });
      await service.updateSubmission(claim.id, sub2.id, {
        status: 'denied',
        date_resolved: '2025-06-22',
      });

      const updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('closed');
    });

    test('calculateClaimStatus should remain in_progress when one is paid and another is pending', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
      });

      const sub1 = await service.addSubmission(claim.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 10000,
        documents_sent: [],
      });

      const sub2 = await service.addSubmission(claim.id, {
        plan_id: 'ip-secondary-002',
        amount_claimed: 5000,
        documents_sent: [],
      });

      // Pay first submission
      await service.updateSubmission(claim.id, sub1.id, {
        status: 'approved',
        amount_reimbursed: 8000,
      });
      await service.updateSubmission(claim.id, sub1.id, {
        status: 'paid',
        date_paid: '2025-06-25',
      });

      // Second is pending
      await service.updateSubmission(claim.id, sub2.id, {
        status: 'pending',
        date_submitted: '2025-06-20',
      });

      const updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('in_progress');
    });

    test('paid submission should trigger cascade to next awaiting_previous', async () => {
      // Setup: member with 2 plans for auto-generation
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

      expect(claim.submissions.length).toBe(2);
      const primarySub = claim.submissions[0];
      const secondarySub = claim.submissions[1];

      expect(secondarySub.status).toBe('awaiting_previous');

      // Approve primary (this should already cascade)
      await service.updateSubmission(claim.id, primarySub.id, {
        status: 'approved',
        amount_reimbursed: 6000,
      });

      // Verify cascade happened on approval
      const updatedClaim = await service.getById(claim.id);
      const cascadedSecondary = updatedClaim!.submissions.find((s) => s.id === secondarySub.id);
      expect(cascadedSecondary!.status).toBe('draft');
      expect(cascadedSecondary!.amount_claimed).toBe(4000);
    });

    test('full lifecycle: draft -> pending -> approved -> paid', async () => {
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2025-06-15',
        total_amount: 15000,
        description: 'Full lifecycle with paid',
      });

      const submission = await service.addSubmission(claim.id, {
        plan_id: 'ip-primary-001',
        amount_claimed: 15000,
        documents_sent: [],
      });

      // draft -> pending
      await service.updateSubmission(claim.id, submission.id, {
        status: 'pending',
        date_submitted: '2025-06-16',
      });

      let updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('in_progress');

      // pending -> approved
      await service.updateSubmission(claim.id, submission.id, {
        status: 'approved',
        amount_reimbursed: 12000,
        date_resolved: '2025-06-25',
      });

      updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('in_progress');
      expect(updatedClaim!.submissions[0].status).toBe('approved');

      // approved -> paid
      await service.updateSubmission(claim.id, submission.id, {
        status: 'paid',
        date_paid: '2025-06-30',
      });

      updatedClaim = await service.getById(claim.id);
      expect(updatedClaim!.status).toBe('closed');
      expect(updatedClaim!.submissions[0].status).toBe('paid');
      expect(updatedClaim!.submissions[0].date_paid).toBe('2025-06-30');
      // Original resolved date should be preserved
      expect(updatedClaim!.submissions[0].date_resolved).toBe('2025-06-25');
      expect(updatedClaim!.submissions[0].amount_reimbursed).toBe(12000);
    });
  });

  // ============================================================================
  // Submission rules: amounts, clearing fields, keeping later plans in step
  // ============================================================================

  describe('Submission rules', () => {
    async function useTwoPlans() {
      await writeFile(
        join(testDir, 'entities', 'family-members.json'),
        JSON.stringify(
          [{ ...sampleFamilyMembers[0], plans: ['ip-primary-001', 'ip-secondary-002'] }],
          null,
          2
        )
      );
    }

    async function twoPlanClaim(total = 13560) {
      await useTwoPlans();
      const claim = await service.create({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        service_date: '2026-09-02',
        total_amount: total,
      });
      return { claim, primary: claim.submissions[0], secondary: claim.submissions[1] };
    }

    test('a new claim stays draft after an edit while nothing has been submitted', async () => {
      const { claim, primary } = await twoPlanClaim();
      await service.updateSubmission(claim.id, primary.id, { notes: 'Receipt is in the drawer' });
      expect((await service.getById(claim.id))!.status).toBe('draft');
    });

    test('approving without an amount is rejected', async () => {
      const { claim, primary } = await twoPlanClaim();
      await expect(
        service.updateSubmission(claim.id, primary.id, { status: 'approved' })
      ).rejects.toThrow('Enter the amount the insurer approved');
    });

    test('marking received keeps a typed amount', async () => {
      const { claim, primary } = await twoPlanClaim();
      await service.updateSubmission(claim.id, primary.id, {
        status: 'approved',
        amount_reimbursed: 12000,
      });
      const paid = await service.updateSubmission(claim.id, primary.id, {
        status: 'paid',
        amount_reimbursed: 12400,
      });
      expect(paid!.amount_reimbursed).toBe(12400);
      const secondary = (await service.getById(claim.id))!.submissions[1];
      expect(secondary.amount_claimed).toBe(1160);
    });

    test('a denial always records $0', async () => {
      const { claim, primary } = await twoPlanClaim();
      const denied = await service.updateSubmission(claim.id, primary.id, {
        status: 'denied',
        amount_reimbursed: 15000,
      });
      expect(denied!.amount_reimbursed).toBe(0);
    });

    test('null clears a field and unknown fields are ignored', async () => {
      const { claim, primary } = await twoPlanClaim();
      await service.updateSubmission(claim.id, primary.id, {
        status: 'pending',
        date_submitted: '2026-09-03',
        notes: 'Sent online',
      });
      const updated = await service.updateSubmission(claim.id, primary.id, {
        notes: null,
        date_submitted: null,
        plan_id: 'someone-else',
        amount_claimed: 1,
      } as unknown as Parameters<typeof service.updateSubmission>[2]);
      expect(updated!.notes).toBeUndefined();
      expect(updated!.date_submitted).toBeUndefined();
      expect(updated!.plan_id).toBe('ip-primary-001');
      expect(updated!.amount_claimed).toBe(13560);
    });

    test('clients cannot set waiting for a previous plan', async () => {
      const { claim, primary } = await twoPlanClaim();
      await expect(
        service.updateSubmission(claim.id, primary.id, { status: 'awaiting_previous' })
      ).rejects.toThrow('set automatically');
    });

    test('moving to a new status fills in a missing date with today', async () => {
      const { claim, primary } = await twoPlanClaim();
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const pending = await service.updateSubmission(claim.id, primary.id, { status: 'pending' });
      expect(pending!.date_submitted).toBe(todayStr);
      const approved = await service.updateSubmission(claim.id, primary.id, {
        status: 'approved',
        amount_reimbursed: 12400,
      });
      expect(approved!.date_resolved).toBe(todayStr);
      const paid = await service.updateSubmission(claim.id, primary.id, { status: 'paid' });
      expect(paid!.date_paid).toBe(todayStr);
    });

    test('changing the approved amount recalculates what the secondary claims', async () => {
      const { claim, primary } = await twoPlanClaim();
      await service.updateSubmission(claim.id, primary.id, {
        status: 'approved',
        amount_reimbursed: 10000,
      });
      expect((await service.getById(claim.id))!.submissions[1].amount_claimed).toBe(3560);
      await service.updateSubmission(claim.id, primary.id, { amount_reimbursed: 12400 });
      expect((await service.getById(claim.id))!.submissions[1].amount_claimed).toBe(1160);
    });

    test('undoing the primary decision sends an unsubmitted secondary back to waiting', async () => {
      const { claim, primary } = await twoPlanClaim();
      await service.updateSubmission(claim.id, primary.id, {
        status: 'approved',
        amount_reimbursed: 12400,
      });
      await service.updateSubmission(claim.id, primary.id, {
        status: 'pending',
        amount_reimbursed: null,
        date_resolved: null,
      });
      const secondary = (await service.getById(claim.id))!.submissions[1];
      expect(secondary.status).toBe('awaiting_previous');
      expect(secondary.amount_claimed).toBe(0);
    });

    test('a submitted secondary is never changed by the primary', async () => {
      const { claim, primary, secondary } = await twoPlanClaim();
      await service.updateSubmission(claim.id, primary.id, {
        status: 'approved',
        amount_reimbursed: 12400,
      });
      await service.updateSubmission(claim.id, secondary.id, { status: 'pending' });
      await service.updateSubmission(claim.id, primary.id, { amount_reimbursed: 10000 });
      const after = (await service.getById(claim.id))!.submissions[1];
      expect(after.status).toBe('pending');
      expect(after.amount_claimed).toBe(1160);
    });

    test('deleting the primary makes the secondary next in line', async () => {
      const { claim, primary } = await twoPlanClaim();
      await service.deleteSubmission(claim.id, primary.id);
      const [only] = (await service.getById(claim.id))!.submissions;
      expect(only.status).toBe('draft');
      expect(only.amount_claimed).toBe(13560);
    });

    test('a new claim total updates what unsubmitted plans claim', async () => {
      const { claim, primary } = await twoPlanClaim();
      await service.update(claim.id, { total_amount: 14000 });
      expect((await service.getById(claim.id))!.submissions[0].amount_claimed).toBe(14000);
      await service.updateSubmission(claim.id, primary.id, {
        status: 'approved',
        amount_reimbursed: 12400,
      });
      await service.update(claim.id, { total_amount: 13560 });
      const subs = (await service.getById(claim.id))!.submissions;
      // The approved primary keeps what it claimed; only the unsubmitted secondary moves
      expect(subs[0].amount_claimed).toBe(14000);
      expect(subs[1].amount_claimed).toBe(1160);
    });

    test('claim updates ignore fields that are not editable', async () => {
      const { claim } = await twoPlanClaim();
      const updated = await service.update(claim.id, {
        description: 'Massage',
        submissions: [],
        status: 'closed',
      } as unknown as Parameters<typeof service.update>[1]);
      expect(updated!.description).toBe('Massage');
      expect(updated!.submissions.length).toBe(2);
      expect(updated!.status).toBe('draft');
    });

    test('a primary that covers everything closes the claim once paid', async () => {
      const { claim, primary } = await twoPlanClaim(10000);
      await service.updateSubmission(claim.id, primary.id, {
        status: 'approved',
        amount_reimbursed: 10000,
      });
      await service.updateSubmission(claim.id, primary.id, { status: 'paid' });
      const updated = await service.getById(claim.id);
      expect(updated!.submissions[1].amount_claimed).toBe(0);
      expect(updated!.status).toBe('closed');
    });

    test('scheduled appointments cannot take submissions until converted', async () => {
      const expected = await service.createExpectedExpense({
        family_member_id: 'fm-john-001',
        category_id: 'ic-dental-001',
        appointment_date: '2026-11-15',
        expected_cost: 13560,
        expected_reimbursement: 12400,
        payment_source_id: 'ps-checking',
      });
      await expect(
        service.addSubmission(expected.id, {
          plan_id: 'ip-primary-001',
          amount_claimed: 13560,
          documents_sent: [],
        })
      ).rejects.toThrow('Convert this scheduled appointment');
    });

    test('stored data: a wrong status is corrected and old rows can still be edited', async () => {
      const { claim, primary } = await twoPlanClaim();
      // An approval saved without an amount, under a stale "closed" status
      const raw = [
        {
          ...claim,
          status: 'closed',
          submissions: [
            { ...primary, status: 'approved', date_resolved: '2026-01-21' },
            { ...claim.submissions[1], status: 'approved', amount_reimbursed: 1160 },
          ],
        },
      ];
      await writeFile(join(testDir, 'entities', 'insurance-claims.json'), JSON.stringify(raw));

      expect((await service.getById(claim.id))!.status).toBe('in_progress');
      const edited = await service.updateSubmission(claim.id, primary.id, { notes: 'Check EOB' });
      expect(edited!.notes).toBe('Check EOB');
      await expect(
        service.updateSubmission(claim.id, primary.id, { status: 'paid' })
      ).rejects.toThrow('Enter the amount the insurer approved');
    });
  });
});
