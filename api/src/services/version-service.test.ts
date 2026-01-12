// Version Service Tests
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { VersionServiceImpl } from './version-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('VersionService', () => {
  let service: VersionServiceImpl;
  let testDir: string;

  // Sample data for testing
  const sampleBills = [
    {
      id: 'bill-001',
      name: 'Test Bill',
      amount: 10000,
      billing_period: 'monthly',
      day_of_month: 1,
      payment_source_id: 'ps-001',
      category_id: 'cat-001',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  const sampleIncomes = [
    {
      id: 'income-001',
      name: 'Test Income',
      amount: 100000,
      frequency: 'monthly',
      day_of_month: 15,
      payment_source_id: 'ps-001',
      category_id: 'cat-income-001',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  const samplePaymentSources = [
    {
      id: 'ps-001',
      name: 'Checking',
      type: 'bank_account',
      balance: 500000,
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  const sampleCategories = [
    {
      id: 'cat-001',
      name: 'Housing',
      type: 'bill',
      color: '#3b82f6',
      sort_order: 0,
      is_predefined: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  beforeAll(async () => {
    // Create a unique test directory
    testDir = join(tmpdir(), `version-test-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    await mkdir(join(testDir, 'months'), { recursive: true });
    await mkdir(join(testDir, 'backups'), { recursive: true });

    // Initialize storage with test directory
    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
    // Reset entity files before each test
    await writeFile(join(testDir, 'entities', 'bills.json'), JSON.stringify(sampleBills, null, 2));
    await writeFile(
      join(testDir, 'entities', 'incomes.json'),
      JSON.stringify(sampleIncomes, null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'payment-sources.json'),
      JSON.stringify(samplePaymentSources, null, 2)
    );
    await writeFile(
      join(testDir, 'entities', 'categories.json'),
      JSON.stringify(sampleCategories, null, 2)
    );

    // Remove version file if exists
    try {
      await rm(join(testDir, 'version.json'), { force: true });
    } catch {
      // Ignore if doesn't exist
    }

    // Clear backups directory
    try {
      const files = await readdir(join(testDir, 'backups'));
      for (const file of files) {
        await rm(join(testDir, 'backups', file), { force: true });
      }
    } catch {
      // Ignore if directory doesn't exist
    }

    // Create new service instance (reset singleton for testing)
    service = new VersionServiceImpl();
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getAppVersion', () => {
    test('returns a version string', async () => {
      const version = await service.getAppVersion();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });

    test('version matches semver pattern', async () => {
      const version = await service.getAppVersion();
      // Basic semver pattern check
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('getVersionInfo', () => {
    test('returns version info with current version', async () => {
      const info = await service.getVersionInfo();
      expect(info.current).toBe(await service.getAppVersion());
      expect(info.lastChecked).toBeDefined();
    });

    test('returns null previous on first run', async () => {
      const info = await service.getVersionInfo();
      expect(info.previous).toBeNull();
    });

    test('returns previous version after version check', async () => {
      // Write a version file
      await writeFile(
        join(testDir, 'version.json'),
        JSON.stringify({
          version: '0.1.0',
          previous: null,
          lastChecked: new Date().toISOString(),
        })
      );

      service = new VersionServiceImpl();
      const info = await service.getVersionInfo();
      expect(info.current).toBe(await service.getAppVersion());
    });
  });

  describe('checkVersionAndBackup', () => {
    test('first run - no backup created, version saved', async () => {
      const result = await service.checkVersionAndBackup();

      expect(result.versionChanged).toBe(false);
      expect(result.previousVersion).toBeNull();
      expect(result.currentVersion).toBe(await service.getAppVersion());
      expect(result.backupCreated).toBe(false);
    });

    test('same version - no backup created', async () => {
      const currentVersion = await service.getAppVersion();

      // Set version file to current version
      await writeFile(
        join(testDir, 'version.json'),
        JSON.stringify({
          version: currentVersion,
          previous: null,
          lastChecked: new Date().toISOString(),
        })
      );

      service = new VersionServiceImpl();
      const result = await service.checkVersionAndBackup();

      expect(result.versionChanged).toBe(false);
      expect(result.backupCreated).toBe(false);
    });

    test('version changed with data - backup created', async () => {
      // Set version file to old version
      await writeFile(
        join(testDir, 'version.json'),
        JSON.stringify({
          version: '0.0.1',
          previous: null,
          lastChecked: new Date().toISOString(),
        })
      );

      service = new VersionServiceImpl();
      const result = await service.checkVersionAndBackup();

      expect(result.versionChanged).toBe(true);
      expect(result.previousVersion).toBe('0.0.1');
      expect(result.backupCreated).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(result.backupPath).toContain('v0.0.1_to_v');
    });

    test('version changed without data - no backup created', async () => {
      // Clear entity files
      await writeFile(join(testDir, 'entities', 'bills.json'), '[]');
      await writeFile(join(testDir, 'entities', 'incomes.json'), '[]');
      await writeFile(join(testDir, 'entities', 'payment-sources.json'), '[]');

      // Set version file to old version
      await writeFile(
        join(testDir, 'version.json'),
        JSON.stringify({
          version: '0.0.1',
          previous: null,
          lastChecked: new Date().toISOString(),
        })
      );

      service = new VersionServiceImpl();
      const result = await service.checkVersionAndBackup();

      expect(result.versionChanged).toBe(true);
      expect(result.backupCreated).toBe(false);
    });
  });

  describe('listVersionBackups', () => {
    test('returns empty array when no backups exist', async () => {
      const backups = await service.listVersionBackups();
      expect(backups).toEqual([]);
    });

    test('lists backups after version change', async () => {
      // Trigger a version change to create a backup
      await writeFile(
        join(testDir, 'version.json'),
        JSON.stringify({
          version: '0.0.1',
          previous: null,
          lastChecked: new Date().toISOString(),
        })
      );

      service = new VersionServiceImpl();
      await service.checkVersionAndBackup();

      const backups = await service.listVersionBackups();
      expect(backups.length).toBe(1);
      expect(backups[0].fromVersion).toBe('0.0.1');
      expect(backups[0].toVersion).toBe(await service.getAppVersion());
      expect(backups[0].filename).toContain('.json');
      expect(backups[0].size).toBeGreaterThan(0);
    });

    test('returns backups sorted newest first', async () => {
      // Create multiple backup files manually
      const backupsDir = join(testDir, 'backups');
      await writeFile(
        join(backupsDir, 'v0.0.1_to_v0.0.2_2025-01-01T10-00-00-000Z.json'),
        JSON.stringify({ export_date: '2025-01-01T10:00:00.000Z', bills: [], incomes: [] })
      );
      await writeFile(
        join(backupsDir, 'v0.0.2_to_v0.0.3_2025-01-02T10-00-00-000Z.json'),
        JSON.stringify({ export_date: '2025-01-02T10:00:00.000Z', bills: [], incomes: [] })
      );

      const backups = await service.listVersionBackups();
      expect(backups.length).toBe(2);
      expect(backups[0].fromVersion).toBe('0.0.2'); // Newer first
      expect(backups[1].fromVersion).toBe('0.0.1'); // Older second
    });
  });

  describe('deleteVersionBackup', () => {
    test('deletes a backup file', async () => {
      // Create a backup file
      const backupsDir = join(testDir, 'backups');
      const filename = 'v0.0.1_to_v0.0.2_2025-01-01T10-00-00-000Z.json';
      await writeFile(
        join(backupsDir, filename),
        JSON.stringify({ export_date: '2025-01-01T10:00:00.000Z', bills: [] })
      );

      // Verify it exists
      let backups = await service.listVersionBackups();
      expect(backups.length).toBe(1);

      // Delete it
      await service.deleteVersionBackup(filename);

      // Verify it's gone
      backups = await service.listVersionBackups();
      expect(backups.length).toBe(0);
    });

    test('throws error for non-existent backup', async () => {
      await expect(service.deleteVersionBackup('non-existent.json')).rejects.toThrow();
    });
  });

  describe('restoreVersionBackup', () => {
    test('restores data from backup file', async () => {
      // Create a backup file with different data
      const backupsDir = join(testDir, 'backups');
      const filename = 'v0.0.1_to_v0.0.2_2025-01-01T10-00-00-000Z.json';
      const backupData = {
        export_date: '2025-01-01T10:00:00.000Z',
        bills: [
          {
            id: 'restored-bill-001',
            name: 'Restored Bill',
            amount: 5000,
            billing_period: 'monthly',
            day_of_month: 5,
            payment_source_id: 'ps-001',
            category_id: 'cat-001',
            is_active: true,
          },
        ],
        incomes: [],
        payment_sources: [],
        categories: [],
      };
      await writeFile(join(backupsDir, filename), JSON.stringify(backupData));

      // Restore from backup
      await service.restoreVersionBackup(filename);

      // Verify bills were restored
      const storage = StorageServiceImpl.getInstance();
      const restoredBills = await storage.readJSON<unknown[]>(
        join(testDir, 'entities', 'bills.json')
      );
      expect(restoredBills).toHaveLength(1);
      expect((restoredBills?.[0] as { id: string }).id).toBe('restored-bill-001');
    });

    test('throws error for non-existent backup', async () => {
      await expect(service.restoreVersionBackup('non-existent.json')).rejects.toThrow(
        'Backup file not found'
      );
    });

    test('throws error for invalid backup format', async () => {
      const backupsDir = join(testDir, 'backups');
      const filename = 'v0.0.1_to_v0.0.2_2025-01-01T10-00-00-000Z.json';
      // Invalid backup - missing export_date
      await writeFile(join(backupsDir, filename), JSON.stringify({ bills: [] }));

      await expect(service.restoreVersionBackup(filename)).rejects.toThrow(
        'Invalid backup file format'
      );
    });
  });

  describe('pruneOldBackups', () => {
    test('keeps only specified number of backups', async () => {
      const backupsDir = join(testDir, 'backups');

      // Create 7 backup files
      for (let i = 1; i <= 7; i++) {
        const day = i.toString().padStart(2, '0');
        await writeFile(
          join(backupsDir, `v0.0.${i}_to_v0.0.${i + 1}_2025-01-${day}T10-00-00-000Z.json`),
          JSON.stringify({ export_date: `2025-01-${day}T10:00:00.000Z`, bills: [] })
        );
      }

      // Verify 7 backups exist
      let backups = await service.listVersionBackups();
      expect(backups.length).toBe(7);

      // Prune to keep only 3
      const deleted = await service.pruneOldBackups(3);
      expect(deleted.length).toBe(4);

      // Verify only 3 remain (newest)
      backups = await service.listVersionBackups();
      expect(backups.length).toBe(3);
      // Should keep 07, 06, 05 (newest)
      expect(backups[0].fromVersion).toBe('0.0.7');
      expect(backups[1].fromVersion).toBe('0.0.6');
      expect(backups[2].fromVersion).toBe('0.0.5');
    });

    test('does nothing when fewer backups than limit', async () => {
      const backupsDir = join(testDir, 'backups');

      // Create 2 backup files
      await writeFile(
        join(backupsDir, 'v0.0.1_to_v0.0.2_2025-01-01T10-00-00-000Z.json'),
        JSON.stringify({ export_date: '2025-01-01T10:00:00.000Z', bills: [] })
      );
      await writeFile(
        join(backupsDir, 'v0.0.2_to_v0.0.3_2025-01-02T10-00-00-000Z.json'),
        JSON.stringify({ export_date: '2025-01-02T10:00:00.000Z', bills: [] })
      );

      // Prune to keep 5 (more than exist)
      const deleted = await service.pruneOldBackups(5);
      expect(deleted.length).toBe(0);

      // Verify all still exist
      const backups = await service.listVersionBackups();
      expect(backups.length).toBe(2);
    });

    test('uses default keep count of 5', async () => {
      const backupsDir = join(testDir, 'backups');

      // Create 8 backup files
      for (let i = 1; i <= 8; i++) {
        const day = i.toString().padStart(2, '0');
        await writeFile(
          join(backupsDir, `v0.0.${i}_to_v0.0.${i + 1}_2025-01-${day}T10-00-00-000Z.json`),
          JSON.stringify({ export_date: `2025-01-${day}T10:00:00.000Z`, bills: [] })
        );
      }

      // Prune with default (5)
      const deleted = await service.pruneOldBackups();
      expect(deleted.length).toBe(3);

      // Verify only 5 remain
      const backups = await service.listVersionBackups();
      expect(backups.length).toBe(5);
    });
  });
});
