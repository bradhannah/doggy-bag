// Storage Service Tests
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('StorageService', () => {
  let storage: StorageService;
  let testDir: string;

  beforeAll(async () => {
    // Create a unique test directory
    testDir = join(tmpdir(), `storage-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // Initialize storage service with test directory
    StorageServiceImpl.initialize(testDir);
    storage = StorageServiceImpl.getInstance();
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getInstance', () => {
    test('returns singleton instance', () => {
      const instance1 = StorageServiceImpl.getInstance();
      const instance2 = StorageServiceImpl.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getConfig', () => {
    test('returns storage configuration', () => {
      const config = storage.getConfig();
      expect(config.basePath).toBe(testDir);
      expect(config.entitiesDir).toBe(join(testDir, 'entities'));
      expect(config.monthsDir).toBe(join(testDir, 'months'));
    });

    test('static getConfig returns same config', () => {
      const config = StorageServiceImpl.getConfig();
      expect(config.basePath).toBe(testDir);
    });
  });

  describe('initialize', () => {
    test('initializes with provided basePath', () => {
      const customPath = join(tmpdir(), 'custom-test');
      StorageServiceImpl.initialize(customPath);
      const config = StorageServiceImpl.getConfig();
      expect(config.basePath).toBe(customPath);

      // Reset to testDir for other tests
      StorageServiceImpl.initialize(testDir);
    });

    test('initializes with defaults when no path provided', () => {
      // Save original env
      const originalDataDir = process.env.DATA_DIR;
      delete process.env.DATA_DIR;

      StorageServiceImpl.initialize();
      const config = StorageServiceImpl.getConfig();
      expect(config.basePath).toBe('data');
      expect(config.isDevelopment).toBe(true);

      // Restore
      if (originalDataDir) {
        process.env.DATA_DIR = originalDataDir;
      }
      StorageServiceImpl.initialize(testDir);
    });
  });

  describe('switchDataDirectory', () => {
    test('switches to new data directory', () => {
      const newPath = join(tmpdir(), 'switched-test');
      StorageServiceImpl.switchDataDirectory(newPath);
      const config = StorageServiceImpl.getConfig();
      expect(config.basePath).toBe(newPath);
      expect(config.isDevelopment).toBe(false); // Always false after switch

      // Reset to testDir
      StorageServiceImpl.initialize(testDir);
    });
  });

  describe('writeFile and readFile', () => {
    test('writes and reads JSON data', async () => {
      const testData = { name: 'Test', value: 42 };
      const path = 'test-file.json';

      await storage.writeFile(path, testData);
      const result = await storage.readFile(path);

      expect(result).toEqual(testData);
    });

    test('writes and reads array data', async () => {
      const testData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];
      const path = 'test-array.json';

      await storage.writeFile(path, testData);
      const result = await storage.readFile(path);

      expect(result).toEqual(testData);
    });

    test('returns null for non-existent file', async () => {
      const result = await storage.readFile('non-existent.json');
      expect(result).toBeNull();
    });

    test('returns null for invalid JSON', async () => {
      const path = join(testDir, 'invalid.json');
      await writeFile(path, 'not valid json', 'utf-8');

      const result = await storage.readFile('invalid.json');
      expect(result).toBeNull();
    });

    test('handles nested paths', async () => {
      const testData = { nested: true };
      const path = 'nested/dir/file.json';

      await storage.writeFile(path, testData);
      const result = await storage.readFile(path);

      expect(result).toEqual(testData);
    });
  });

  describe('writeJSON and readJSON', () => {
    test('aliases writeFile and readFile', async () => {
      const testData = { alias: true };
      const path = 'alias-test.json';

      await storage.writeJSON(path, testData);
      const result = await storage.readJSON(path);

      expect(result).toEqual(testData);
    });
  });

  describe('deleteFile', () => {
    test('deletes existing file', async () => {
      const path = 'to-delete.json';
      await storage.writeFile(path, { delete: 'me' });

      expect(await storage.fileExists(path)).toBe(true);
      await storage.deleteFile(path);
      expect(await storage.fileExists(path)).toBe(false);
    });

    test('handles non-existent file gracefully', async () => {
      // Should not throw
      await storage.deleteFile('does-not-exist.json');
    });
  });

  describe('fileExists', () => {
    test('returns true for existing file', async () => {
      const path = 'exists-test.json';
      await storage.writeFile(path, { exists: true });

      const exists = await storage.fileExists(path);
      expect(exists).toBe(true);
    });

    test('returns false for non-existent file', async () => {
      const exists = await storage.fileExists('does-not-exist.json');
      expect(exists).toBe(false);
    });
  });

  describe('ensureDirectory', () => {
    test('creates directory if not exists', async () => {
      const dirPath = 'new-dir';
      await storage.ensureDirectory(dirPath);

      // Verify by writing a file
      const filePath = join(dirPath, 'test.json');
      await storage.writeFile(filePath, { test: true });
      const result = await storage.readFile(filePath);
      expect(result).toEqual({ test: true });
    });

    test('does not fail if directory already exists', async () => {
      const dirPath = 'existing-dir';
      await storage.ensureDirectory(dirPath);
      await storage.ensureDirectory(dirPath); // Should not throw
    });
  });

  describe('listFiles', () => {
    test('lists files in directory', async () => {
      const dirPath = 'list-test';
      await storage.ensureDirectory(dirPath);
      await storage.writeFile(join(dirPath, 'file1.json'), { id: 1 });
      await storage.writeFile(join(dirPath, 'file2.json'), { id: 2 });

      const files = await storage.listFiles(dirPath);
      expect(files).toContain('file1.json');
      expect(files).toContain('file2.json');
      expect(files.length).toBe(2);
    });

    test('returns empty array for non-existent directory', async () => {
      const files = await storage.listFiles('non-existent-dir');
      expect(files).toEqual([]);
    });

    test('excludes directories from list', async () => {
      const dirPath = 'mixed-content';
      await storage.ensureDirectory(join(dirPath, 'subdir'));
      await storage.writeFile(join(dirPath, 'file.json'), { file: true });

      const files = await storage.listFiles(dirPath);
      expect(files).toEqual(['file.json']);
    });
  });

  describe('copyFile', () => {
    test('copies file to new location', async () => {
      const srcPath = 'copy-source.json';
      const destPath = 'copy-dest.json';
      const testData = { copy: 'test' };

      await storage.writeFile(srcPath, testData);
      await storage.copyFile(srcPath, destPath);

      const result = await storage.readFile(destPath);
      expect(result).toEqual(testData);
    });

    test('copies file to nested directory', async () => {
      const srcPath = 'copy-src2.json';
      const destPath = 'copy-dest-dir/nested/copy.json';
      const testData = { nested: 'copy' };

      await storage.writeFile(srcPath, testData);
      await storage.copyFile(srcPath, destPath);

      const result = await storage.readFile(destPath);
      expect(result).toEqual(testData);
    });
  });

  describe('path resolution', () => {
    test('handles data/ prefix paths', async () => {
      const path = 'entities/test-entity.json';
      const testData = { entity: true };

      await storage.writeFile(path, testData);
      const result = await storage.readFile(path);

      expect(result).toEqual(testData);
    });

    test('handles absolute paths', async () => {
      const absolutePath = join(testDir, 'absolute-test.json');
      const testData = { absolute: true };

      await storage.writeFile(absolutePath, testData);
      const result = await storage.readFile(absolutePath);

      expect(result).toEqual(testData);
    });
  });
});
