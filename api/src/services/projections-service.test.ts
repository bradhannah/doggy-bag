// Projections Service Tests
// Tests for:
// 1. Missing month returns empty projection with no_data: true
// 2. DST date loop produces no duplicate dates (31 unique days for 31-day month)
// 3. End date zero-padding (single-digit days are zero-padded)

import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { ProjectionsServiceImpl } from './projections-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { PaymentSource, MonthlyData, Category } from '../types';

describe('ProjectionsService', () => {
  let service: ProjectionsServiceImpl;
  let testDir: string;

  const samplePaymentSource: PaymentSource = {
    id: 'ps-checking-001',
    name: 'Checking',
    type: 'bank_account',
    is_active: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  };

  const sampleCategory: Category = {
    id: 'cat-housing-001',
    name: 'Housing',
    type: 'bill',
    color: '#3b82f6',
    sort_order: 0,
    is_predefined: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  };

  const now = '2025-01-01T00:00:00.000Z';

  beforeAll(async () => {
    testDir = join(tmpdir(), `projections-test-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'months'), { recursive: true });
    await mkdir(join(testDir, 'documents', 'insurance', 'receipts'), { recursive: true });

    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
    // Write minimal entity files (required by services that ProjectionsService depends on)
    await writeFile(
      join(testDir, 'entities', 'payment-sources.json'),
      JSON.stringify([samplePaymentSource], null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'categories.json'),
      JSON.stringify([sampleCategory], null, 2)
    );
    await writeFile(join(testDir, 'entities', 'bills.json'), JSON.stringify([], null, 2));
    await writeFile(join(testDir, 'entities', 'incomes.json'), JSON.stringify([], null, 2));
    await writeFile(
      join(testDir, 'entities', 'insurance-claims.json'),
      JSON.stringify([], null, 2)
    );
    await writeFile(join(testDir, 'entities', 'family-members.json'), JSON.stringify([], null, 2));
    await writeFile(
      join(testDir, 'entities', 'insurance-categories.json'),
      JSON.stringify([], null, 2)
    );
    await writeFile(join(testDir, 'entities', 'insurance-plans.json'), JSON.stringify([], null, 2));

    service = new ProjectionsServiceImpl();
  });

  afterAll(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================================================
  // Missing Month - Empty Projection
  // ============================================================================

  describe('Missing month (no data file)', () => {
    test('should return empty projection with no_data: true when month file does not exist', async () => {
      // Do NOT create a month file for 2026-04
      const result = await service.getProjection('2026-04');

      expect(result).toBeDefined();
      expect(result.no_data).toBe(true);
      expect(result.starting_balance).toBe(0);
      expect(result.start_date).toBe('2026-04-01');
      expect(result.end_date).toBe('2026-04-30');
      expect(result.overdue_bills).toEqual([]);
    });

    test('should return correct number of days for missing month', async () => {
      const result = await service.getProjection('2026-04');

      // April has 30 days
      expect(result.days.length).toBe(30);
    });

    test('should have zero values for all days in missing month', async () => {
      const result = await service.getProjection('2026-04');

      for (const day of result.days) {
        expect(day.balance).toBeNull();
        expect(day.has_balance).toBe(false);
        expect(day.income).toBe(0);
        expect(day.expense).toBe(0);
        expect(day.events).toEqual([]);
        expect(day.is_deficit).toBe(false);
      }
    });

    test('should have sequential dates with no gaps or duplicates', async () => {
      const result = await service.getProjection('2026-04');

      const dates = result.days.map((d) => d.date);
      expect(dates[0]).toBe('2026-04-01');
      expect(dates[dates.length - 1]).toBe('2026-04-30');

      // Check uniqueness
      const uniqueDates = new Set(dates);
      expect(uniqueDates.size).toBe(dates.length);

      // Check sequential
      for (let i = 1; i < dates.length; i++) {
        const prevDay = parseInt(dates[i - 1].split('-')[2]);
        const currDay = parseInt(dates[i].split('-')[2]);
        expect(currDay).toBe(prevDay + 1);
      }
    });

    test('should handle February correctly for missing month', async () => {
      const result = await service.getProjection('2026-02');

      // 2026 is not a leap year, so February has 28 days
      expect(result.days.length).toBe(28);
      expect(result.no_data).toBe(true);
      expect(result.end_date).toBe('2026-02-28');
    });

    test('should handle February in leap year for missing month', async () => {
      const result = await service.getProjection('2028-02');

      // 2028 is a leap year, so February has 29 days
      expect(result.days.length).toBe(29);
      expect(result.no_data).toBe(true);
      expect(result.end_date).toBe('2028-02-29');
    });

    test('should handle 31-day month correctly for missing month', async () => {
      const result = await service.getProjection('2026-07');

      // July has 31 days
      expect(result.days.length).toBe(31);
      expect(result.no_data).toBe(true);
      expect(result.end_date).toBe('2026-07-31');
    });
  });

  // ============================================================================
  // DST Date Loop - No Duplicate Dates
  // ============================================================================

  describe('DST date loop (no duplicate dates)', () => {
    // March 2026: DST spring-forward happens on March 8, 2026 in US
    // This was the original bug: local-time Date manipulation produced
    // duplicate "2026-03-08" entries.

    test('March 2026 should have exactly 31 unique dates (DST month)', async () => {
      // Create a minimal month file so we don't get the no_data path
      const marchData: MonthlyData = {
        month: '2026-03',
        bill_instances: [],
        income_instances: [],
        variable_expenses: [],
        free_flowing_expenses: [],
        bank_balances: { 'ps-checking-001': 100000 },
        is_read_only: false,
        created_at: now,
        updated_at: now,
      };
      await writeFile(join(testDir, 'months', '2026-03.json'), JSON.stringify(marchData, null, 2));

      const result = await service.getProjection('2026-03');

      expect(result.days.length).toBe(31);

      const dates = result.days.map((d) => d.date);
      const uniqueDates = new Set(dates);

      // The critical assertion: no duplicate dates
      expect(uniqueDates.size).toBe(31);

      // Verify first and last dates
      expect(dates[0]).toBe('2026-03-01');
      expect(dates[30]).toBe('2026-03-31');

      // Specifically check March 8 (DST day) appears exactly once
      const march8Count = dates.filter((d) => d === '2026-03-08').length;
      expect(march8Count).toBe(1);

      // Verify March 9 exists (was missing in the bug)
      expect(dates).toContain('2026-03-09');
    });

    test('November 2026 should have exactly 30 unique dates (DST fall-back month)', async () => {
      // DST fall-back happens first Sunday of November (Nov 1, 2026)
      const novData: MonthlyData = {
        month: '2026-11',
        bill_instances: [],
        income_instances: [],
        variable_expenses: [],
        free_flowing_expenses: [],
        bank_balances: { 'ps-checking-001': 100000 },
        is_read_only: false,
        created_at: now,
        updated_at: now,
      };
      await writeFile(join(testDir, 'months', '2026-11.json'), JSON.stringify(novData, null, 2));

      const result = await service.getProjection('2026-11');

      expect(result.days.length).toBe(30);

      const dates = result.days.map((d) => d.date);
      const uniqueDates = new Set(dates);
      expect(uniqueDates.size).toBe(30);

      expect(dates[0]).toBe('2026-11-01');
      expect(dates[29]).toBe('2026-11-30');
    });

    test('all dates should be zero-padded (no single-digit days)', async () => {
      const marchData: MonthlyData = {
        month: '2026-03',
        bill_instances: [],
        income_instances: [],
        variable_expenses: [],
        free_flowing_expenses: [],
        bank_balances: { 'ps-checking-001': 100000 },
        is_read_only: false,
        created_at: now,
        updated_at: now,
      };
      await writeFile(join(testDir, 'months', '2026-03.json'), JSON.stringify(marchData, null, 2));

      const result = await service.getProjection('2026-03');

      // Every date should match YYYY-MM-DD format with zero-padded day
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      for (const day of result.days) {
        expect(day.date).toMatch(datePattern);
      }

      // Specifically check end_date is zero-padded
      expect(result.end_date).toBe('2026-03-31');

      // Check a single-digit day is zero-padded
      expect(result.days[0].date).toBe('2026-03-01');
      expect(result.days[8].date).toBe('2026-03-09');
    });
  });

  // ============================================================================
  // End Date Zero-Padding
  // ============================================================================

  describe('End date formatting', () => {
    test('end_date should be zero-padded for months ending in single-digit day', async () => {
      // September has 30 days, but we need a month that ends on a day < 10
      // Actually all months end on >= 28, so just verify the format is correct
      // for various months
      const months = ['2026-02', '2026-04', '2026-06', '2026-09', '2026-11'];
      const expectedEndDates = [
        '2026-02-28',
        '2026-04-30',
        '2026-06-30',
        '2026-09-30',
        '2026-11-30',
      ];

      for (let i = 0; i < months.length; i++) {
        const result = await service.getProjection(months[i]);
        expect(result.end_date).toBe(expectedEndDates[i]);
      }
    });

    test('end_date for 31-day months', async () => {
      const months31 = [
        '2026-01',
        '2026-03',
        '2026-05',
        '2026-07',
        '2026-08',
        '2026-10',
        '2026-12',
      ];

      for (const month of months31) {
        const result = await service.getProjection(month);
        expect(result.end_date).toBe(`${month}-31`);
      }
    });
  });
});
