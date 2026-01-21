// Savings Goals Service Tests
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { SavingsGoalsServiceImpl } from './savings-goals-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { SavingsGoal } from '../types';

describe('SavingsGoalsService', () => {
  let service: SavingsGoalsServiceImpl;
  let testDir: string;

  // Sample savings goals for testing
  const sampleGoals: SavingsGoal[] = [
    {
      id: 'goal-winter-tires-001',
      name: 'Winter Tires',
      target_amount: 80000, // $800.00
      current_amount: 20000, // $200.00 saved so far
      target_date: '2026-10-01',
      linked_account_id: 'ps-savings-001',
      status: 'saving',
      notes: 'For the SUV',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'goal-vacation-002',
      name: 'Vacation Fund',
      target_amount: 300000, // $3,000.00
      current_amount: 100000, // $1,000.00
      target_date: '2026-07-01',
      linked_account_id: 'ps-savings-001',
      status: 'paused',
      paused_at: '2026-01-15T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-15T00:00:00.000Z',
    },
    {
      id: 'goal-bought-003',
      name: 'New Laptop',
      target_amount: 150000, // $1,500.00
      current_amount: 150000,
      target_date: '2025-12-01',
      linked_account_id: 'ps-savings-001',
      status: 'bought',
      completed_at: '2025-11-15T00:00:00.000Z',
      created_at: '2025-06-01T00:00:00.000Z',
      updated_at: '2025-11-15T00:00:00.000Z',
    },
  ];

  beforeAll(async () => {
    // Create a unique test directory
    testDir = join(tmpdir(), `savings-goals-test-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });

    // Initialize storage with test directory
    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
    // Reset files before each test
    await writeFile(
      join(testDir, 'entities', 'savings-goals.json'),
      JSON.stringify(sampleGoals, null, 2)
    );
    // Create new service instance
    service = new SavingsGoalsServiceImpl();
  });

  afterAll(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  // ============================================================================
  // Basic CRUD Tests
  // ============================================================================

  describe('getAll', () => {
    test('should return all savings goals', async () => {
      const goals = await service.getAll();
      expect(goals).toHaveLength(3);
    });

    test('should return empty array if no goals exist', async () => {
      await writeFile(join(testDir, 'entities', 'savings-goals.json'), '[]');
      const goals = await service.getAll();
      expect(goals).toHaveLength(0);
    });
  });

  describe('getById', () => {
    test('should return goal by ID', async () => {
      const goal = await service.getById('goal-winter-tires-001');
      expect(goal).not.toBeNull();
      expect(goal?.name).toBe('Winter Tires');
    });

    test('should return null for non-existent ID', async () => {
      const goal = await service.getById('non-existent-id');
      expect(goal).toBeNull();
    });
  });

  describe('getByStatus', () => {
    test('should return goals with saving status', async () => {
      const goals = await service.getByStatus('saving');
      expect(goals).toHaveLength(1);
      expect(goals[0].name).toBe('Winter Tires');
    });

    test('should return goals with paused status', async () => {
      const goals = await service.getByStatus('paused');
      expect(goals).toHaveLength(1);
      expect(goals[0].name).toBe('Vacation Fund');
    });

    test('should return goals with bought status', async () => {
      const goals = await service.getByStatus('bought');
      expect(goals).toHaveLength(1);
      expect(goals[0].name).toBe('New Laptop');
    });

    test('should return empty array for status with no goals', async () => {
      const goals = await service.getByStatus('abandoned');
      expect(goals).toHaveLength(0);
    });
  });

  describe('create', () => {
    test('should create a new savings goal', async () => {
      const newGoal = await service.create({
        name: 'Emergency Fund',
        target_amount: 500000,
        target_date: '2027-01-01',
        linked_account_id: 'ps-savings-001',
        status: 'saving',
      });

      expect(newGoal.id).toBeDefined();
      expect(newGoal.name).toBe('Emergency Fund');
      expect(newGoal.current_amount).toBe(0);
      expect(newGoal.status).toBe('saving');
    });

    test('should fail validation for missing name', async () => {
      await expect(
        service.create({
          name: '',
          target_amount: 500000,
          target_date: '2027-01-01',
          linked_account_id: 'ps-savings-001',
          status: 'saving',
        })
      ).rejects.toThrow('Validation failed');
    });

    test('should fail validation for zero target amount', async () => {
      await expect(
        service.create({
          name: 'Test Goal',
          target_amount: 0,
          target_date: '2027-01-01',
          linked_account_id: 'ps-savings-001',
          status: 'saving',
        })
      ).rejects.toThrow('Target amount must be greater than 0');
    });
  });

  describe('update', () => {
    test('should update an existing goal', async () => {
      const updated = await service.update('goal-winter-tires-001', {
        name: 'Winter Tires Set',
        target_amount: 90000,
      });

      expect(updated?.name).toBe('Winter Tires Set');
      expect(updated?.target_amount).toBe(90000);
    });

    test('should return null for non-existent goal', async () => {
      const updated = await service.update('non-existent', { name: 'Test' });
      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    test('should delete an existing goal', async () => {
      await service.delete('goal-winter-tires-001');
      const goals = await service.getAll();
      expect(goals).toHaveLength(2);
      expect(goals.find((g) => g.id === 'goal-winter-tires-001')).toBeUndefined();
    });
  });

  // ============================================================================
  // Status Transition Tests
  // ============================================================================

  describe('pause', () => {
    test('should pause a saving goal', async () => {
      const paused = await service.pause('goal-winter-tires-001');
      expect(paused?.status).toBe('paused');
      expect(paused?.paused_at).toBeDefined();
    });

    test('should throw error when pausing non-saving goal', async () => {
      await expect(service.pause('goal-vacation-002')).rejects.toThrow(
        "Cannot pause goal with status 'paused'"
      );
    });

    test('should throw error when pausing bought goal', async () => {
      await expect(service.pause('goal-bought-003')).rejects.toThrow(
        "Cannot pause goal with status 'bought'"
      );
    });

    test('should return null for non-existent goal', async () => {
      const result = await service.pause('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('resume', () => {
    test('should resume a paused goal', async () => {
      const resumed = await service.resume('goal-vacation-002');
      expect(resumed?.status).toBe('saving');
      expect(resumed?.paused_at).toBeUndefined();
    });

    test('should throw error when resuming saving goal', async () => {
      await expect(service.resume('goal-winter-tires-001')).rejects.toThrow(
        "Cannot resume goal with status 'saving'"
      );
    });

    test('should throw error when resuming bought goal', async () => {
      await expect(service.resume('goal-bought-003')).rejects.toThrow(
        "Cannot resume goal with status 'bought'"
      );
    });
  });

  describe('complete', () => {
    test('should complete a saving goal', async () => {
      const completed = await service.complete('goal-winter-tires-001');
      expect(completed?.status).toBe('bought');
      expect(completed?.completed_at).toBeDefined();
    });

    test('should complete a paused goal', async () => {
      const completed = await service.complete('goal-vacation-002');
      expect(completed?.status).toBe('bought');
      expect(completed?.completed_at).toBeDefined();
      expect(completed?.paused_at).toBeUndefined();
    });

    test('should accept custom completion date', async () => {
      const customDate = '2026-05-15T10:00:00.000Z';
      const completed = await service.complete('goal-winter-tires-001', customDate);
      expect(completed?.completed_at).toBe(customDate);
    });

    test('should throw error when completing already bought goal', async () => {
      await expect(service.complete('goal-bought-003')).rejects.toThrow(
        "Cannot complete goal with status 'bought'"
      );
    });
  });

  describe('abandon', () => {
    test('should abandon a saving goal', async () => {
      const abandoned = await service.abandon('goal-winter-tires-001');
      expect(abandoned?.status).toBe('abandoned');
      expect(abandoned?.completed_at).toBeDefined();
    });

    test('should abandon a paused goal', async () => {
      const abandoned = await service.abandon('goal-vacation-002');
      expect(abandoned?.status).toBe('abandoned');
      expect(abandoned?.paused_at).toBeUndefined();
    });

    test('should throw error when abandoning bought goal', async () => {
      await expect(service.abandon('goal-bought-003')).rejects.toThrow(
        "Cannot abandon goal with status 'bought'"
      );
    });
  });

  // ============================================================================
  // Temperature Calculation Tests
  // ============================================================================

  describe('calculateTemperature', () => {
    test('should return green when saved amount equals target', () => {
      const goal = sampleGoals[0]; // target: 80000
      const temp = service.calculateTemperature(goal, 80000);
      expect(temp).toBe('green');
    });

    test('should return green when saved exceeds target', () => {
      const goal = sampleGoals[0];
      const temp = service.calculateTemperature(goal, 100000);
      expect(temp).toBe('green');
    });

    test('should return green when on track or ahead of schedule', () => {
      // Create a goal where we expect to be at 50% progress
      const goal: SavingsGoal = {
        ...sampleGoals[0],
        target_amount: 100000, // $1000
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      };

      // Expected is ~50%, saved is 60% -> green
      const temp = service.calculateTemperature(goal, 60000);
      expect(temp).toBe('green');
    });

    test('should return yellow when slightly behind (75-99%)', () => {
      const goal: SavingsGoal = {
        ...sampleGoals[0],
        target_amount: 100000,
        created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(), // 50 days ago
        target_date: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString(), // 50 days from now
      };

      // Expected is ~50% = 50000, saved is 40000 (80% of expected) -> yellow
      const temp = service.calculateTemperature(goal, 40000);
      expect(temp).toBe('yellow');
    });

    test('should return red when significantly behind (<75%)', () => {
      const goal: SavingsGoal = {
        ...sampleGoals[0],
        target_amount: 100000,
        created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
        target_date: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString(),
      };

      // Expected is ~50% = 50000, saved is 30000 (60% of expected) -> red
      const temp = service.calculateTemperature(goal, 30000);
      expect(temp).toBe('red');
    });
  });

  describe('getExpectedSavedAmount', () => {
    test('should return full amount when target date is past', () => {
      const goal: SavingsGoal = {
        ...sampleGoals[0],
        target_date: '2025-01-01', // Past date
      };

      const expected = service.getExpectedSavedAmount(goal);
      expect(expected).toBe(goal.target_amount);
    });

    test('should return 0 when current date is before creation', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const goal: SavingsGoal = {
        ...sampleGoals[0],
        created_at: futureDate.toISOString(),
        target_date: new Date(futureDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const expected = service.getExpectedSavedAmount(goal);
      expect(expected).toBe(0);
    });

    test('should calculate linear progress correctly', () => {
      const now = new Date();
      const created = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const target = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const goal: SavingsGoal = {
        ...sampleGoals[0],
        target_amount: 100000, // $1000
        created_at: created.toISOString(),
        target_date: target.toISOString(),
      };

      // We're exactly halfway, so expect ~50000
      const expected = service.getExpectedSavedAmount(goal);
      // Allow some tolerance for timing
      expect(expected).toBeGreaterThan(45000);
      expect(expected).toBeLessThan(55000);
    });

    test('should accept custom asOfDate parameter', () => {
      const created = new Date('2026-01-01');
      const target = new Date('2026-07-01'); // 6 months
      const asOf = new Date('2026-04-01'); // 3 months in (50%)

      const goal: SavingsGoal = {
        ...sampleGoals[0],
        target_amount: 100000,
        created_at: created.toISOString(),
        target_date: target.toISOString(),
      };

      const expected = service.getExpectedSavedAmount(goal, asOf);
      // 50% of 100000 = 50000
      expect(expected).toBeGreaterThan(45000);
      expect(expected).toBeLessThan(55000);
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================

  // ============================================================================
  // Archive/Unarchive Tests
  // ============================================================================

  describe('archive', () => {
    test('should archive a bought goal', async () => {
      const archived = await service.archive('goal-bought-003');
      expect(archived?.status).toBe('archived');
      expect(archived?.archived_at).toBeDefined();
      expect(archived?.previous_status).toBe('bought');
    });

    test('should archive an abandoned goal', async () => {
      // First abandon a goal
      await service.abandon('goal-winter-tires-001');
      const archived = await service.archive('goal-winter-tires-001');
      expect(archived?.status).toBe('archived');
      expect(archived?.archived_at).toBeDefined();
      expect(archived?.previous_status).toBe('abandoned');
    });

    test('should throw error when archiving saving goal', async () => {
      await expect(service.archive('goal-winter-tires-001')).rejects.toThrow(
        "Cannot archive goal with status 'saving'"
      );
    });

    test('should throw error when archiving paused goal', async () => {
      await expect(service.archive('goal-vacation-002')).rejects.toThrow(
        "Cannot archive goal with status 'paused'"
      );
    });

    test('should return null for non-existent goal', async () => {
      const result = await service.archive('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('unarchive', () => {
    test('should unarchive a goal to bought status', async () => {
      // First archive a bought goal
      await service.archive('goal-bought-003');
      const unarchived = await service.unarchive('goal-bought-003', 'bought');
      expect(unarchived?.status).toBe('bought');
      expect(unarchived?.archived_at).toBeUndefined();
      expect(unarchived?.previous_status).toBeUndefined();
    });

    test('should unarchive a goal to abandoned status', async () => {
      // First abandon then archive
      await service.abandon('goal-winter-tires-001');
      await service.archive('goal-winter-tires-001');
      const unarchived = await service.unarchive('goal-winter-tires-001', 'abandoned');
      expect(unarchived?.status).toBe('abandoned');
      expect(unarchived?.archived_at).toBeUndefined();
    });

    test('should throw error when unarchiving non-archived goal', async () => {
      await expect(service.unarchive('goal-winter-tires-001', 'bought')).rejects.toThrow(
        "Cannot unarchive goal with status 'saving'"
      );
    });

    test('should throw error when unarchiving bought goal', async () => {
      await expect(service.unarchive('goal-bought-003', 'bought')).rejects.toThrow(
        "Cannot unarchive goal with status 'bought'"
      );
    });

    test('should return null for non-existent goal', async () => {
      const result = await service.unarchive('non-existent', 'bought');
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('validate', () => {
    test('should pass validation for valid goal', () => {
      const result = service.validate({
        name: 'Test Goal',
        target_amount: 50000,
        current_amount: 0,
        linked_account_id: 'ps-001',
        status: 'saving',
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail for empty name', () => {
      const result = service.validate({
        name: '',
        target_amount: 50000,
        linked_account_id: 'ps-001',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    test('should fail for negative target amount', () => {
      const result = service.validate({
        name: 'Test',
        target_amount: -100,
        linked_account_id: 'ps-001',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Target amount must be greater than 0');
    });

    test('should fail for negative current amount', () => {
      const result = service.validate({
        name: 'Test',
        target_amount: 50000,
        current_amount: -100,
        linked_account_id: 'ps-001',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current amount cannot be negative');
    });

    test('should fail for missing linked account', () => {
      const result = service.validate({
        name: 'Test',
        target_amount: 50000,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Linked account is required');
    });
  });
});
