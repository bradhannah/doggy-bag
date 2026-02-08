// Auto-Save Service Tests
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { AutoSaveServiceImpl } from './auto-save';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('AutoSaveService', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `autosave-test-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
    // Clear entities directory
    try {
      const { readdir } = await import('node:fs/promises');
      const files = await readdir(join(testDir, 'entities'));
      for (const file of files) {
        await rm(join(testDir, 'entities', file), { force: true });
      }
    } catch {
      // Ignore
    }
  });

  afterAll(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('queueSave', () => {
    test('queues a save that writes after debounce period', async () => {
      const service = new AutoSaveServiceImpl(50); // 50ms debounce
      const data = [{ id: 'test-1', name: 'Test' }];

      service.queueSave('bills', data);

      // Wait for debounce to fire
      await new Promise((resolve) => setTimeout(resolve, 100));

      const content = await readFile(join(testDir, 'entities', 'bills.json'), 'utf-8');
      expect(JSON.parse(content)).toEqual(data);
    });

    test('replaces pending save for same entity type', async () => {
      const service = new AutoSaveServiceImpl(50);
      const data1 = [{ id: 'test-1' }];
      const data2 = [{ id: 'test-2' }];

      service.queueSave('bills', data1);
      service.queueSave('bills', data2); // Should replace data1

      await new Promise((resolve) => setTimeout(resolve, 100));

      const content = await readFile(join(testDir, 'entities', 'bills.json'), 'utf-8');
      expect(JSON.parse(content)).toEqual(data2);
    });
  });

  describe('clearQueue', () => {
    test('cancels pending saves without writing', async () => {
      const service = new AutoSaveServiceImpl(200); // Long debounce
      const data = [{ id: 'test-1' }];

      service.queueSave('bills', data);
      service.clearQueue();

      // Wait past the debounce period
      await new Promise((resolve) => setTimeout(resolve, 250));

      // File should not exist since save was cancelled
      const exists = await Bun.file(join(testDir, 'entities', 'bills.json')).exists();
      expect(exists).toBe(false);
    });
  });

  describe('shutdown', () => {
    test('flushes pending saves before clearing', async () => {
      const service = new AutoSaveServiceImpl(5000); // Long debounce (won't fire naturally)
      const billsData = [{ id: 'bill-1', name: 'Rent' }];
      const incomesData = [{ id: 'income-1', name: 'Salary' }];

      service.queueSave('bills', billsData);
      service.queueSave('incomes', incomesData);

      // Shutdown should flush immediately without waiting for debounce
      await service.shutdown();

      const billsContent = await readFile(join(testDir, 'entities', 'bills.json'), 'utf-8');
      expect(JSON.parse(billsContent)).toEqual(billsData);

      const incomesContent = await readFile(join(testDir, 'entities', 'incomes.json'), 'utf-8');
      expect(JSON.parse(incomesContent)).toEqual(incomesData);
    });

    test('works with empty queue', async () => {
      const service = new AutoSaveServiceImpl(50);

      // Should not throw
      await service.shutdown();
    });

    test('clears queue after flushing', async () => {
      const service = new AutoSaveServiceImpl(50);
      service.queueSave('bills', [{ id: 'bill-1' }]);

      await service.shutdown();

      // Queue a new save after shutdown — it should work independently
      // (verifies the queue was cleared, not stuck)
      service.queueSave('categories', [{ id: 'cat-1' }]);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const content = await readFile(join(testDir, 'entities', 'categories.json'), 'utf-8');
      expect(JSON.parse(content)).toEqual([{ id: 'cat-1' }]);
    });
  });
});
