// Request Cache Tests
// Tests for per-request read caching in StorageService using AsyncLocalStorage
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import { requestStorage, runWithRequestCache } from './request-cache';
import { mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Request Cache', () => {
  let storage: StorageService;
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `request-cache-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    StorageServiceImpl.initialize(testDir);
    storage = StorageServiceImpl.getInstance();
  });

  afterAll(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('requestStorage (AsyncLocalStorage)', () => {
    test('store is undefined outside of request context', () => {
      const store = requestStorage.getStore();
      expect(store).toBeUndefined();
    });

    test('store is available inside runWithRequestCache', async () => {
      let storeInside: Map<string, unknown> | undefined;
      await runWithRequestCache(async () => {
        storeInside = requestStorage.getStore();
      });
      expect(storeInside).toBeInstanceOf(Map);
    });

    test('each request gets its own isolated cache', async () => {
      let cache1: Map<string, unknown> | undefined;
      let cache2: Map<string, unknown> | undefined;

      await Promise.all([
        runWithRequestCache(async () => {
          cache1 = requestStorage.getStore();
          cache1?.set('key', 'request1');
        }),
        runWithRequestCache(async () => {
          cache2 = requestStorage.getStore();
          cache2?.set('key', 'request2');
        }),
      ]);

      expect(cache1).not.toBe(cache2);
      expect(cache1?.get('key')).toBe('request1');
      expect(cache2?.get('key')).toBe('request2');
    });

    test('cache is garbage collected after request completes', async () => {
      let cacheRef: Map<string, unknown> | undefined;
      await runWithRequestCache(async () => {
        cacheRef = requestStorage.getStore();
        cacheRef?.set('test', 'value');
      });
      // After the run completes, getStore() returns undefined
      expect(requestStorage.getStore()).toBeUndefined();
    });
  });

  describe('read caching within a request', () => {
    test('second readJSON for same path returns cached result without disk read', async () => {
      const path = 'cache-read-test.json';
      const testData = { name: 'cached', value: 42 };
      await storage.writeFile(path, testData);

      await runWithRequestCache(async () => {
        // First read: should hit disk
        const result1 = await storage.readJSON(path);
        expect(result1).toEqual(testData);

        // Second read: should return cached value
        const result2 = await storage.readJSON(path);
        expect(result2).toEqual(testData);

        // Both should return the same reference (cached)
        expect(result1).toBe(result2);
      });
    });

    test('different paths are cached independently', async () => {
      const pathA = 'cache-path-a.json';
      const pathB = 'cache-path-b.json';
      await storage.writeFile(pathA, { file: 'a' });
      await storage.writeFile(pathB, { file: 'b' });

      await runWithRequestCache(async () => {
        const resultA = await storage.readJSON(pathA);
        const resultB = await storage.readJSON(pathB);

        expect(resultA).toEqual({ file: 'a' });
        expect(resultB).toEqual({ file: 'b' });

        // Re-read should return same references
        const resultA2 = await storage.readJSON(pathA);
        const resultB2 = await storage.readJSON(pathB);
        expect(resultA2).toBe(resultA);
        expect(resultB2).toBe(resultB);
      });
    });

    test('null results (missing files) are also cached', async () => {
      await runWithRequestCache(async () => {
        const result1 = await storage.readJSON('non-existent-cache-test.json');
        expect(result1).toBeNull();

        // Second read should also return null (cached)
        const result2 = await storage.readJSON('non-existent-cache-test.json');
        expect(result2).toBeNull();
      });
    });

    test('reads outside request context still work (no caching)', async () => {
      const path = 'no-context-read.json';
      await storage.writeFile(path, { outside: true });

      // Should work fine without request context
      const result = await storage.readJSON(path);
      expect(result).toEqual({ outside: true });
    });

    test('readFile also uses cache (same as readJSON)', async () => {
      const path = 'cache-readfile-test.json';
      await storage.writeFile(path, { method: 'readFile' });

      await runWithRequestCache(async () => {
        const result1 = await storage.readFile(path);
        const result2 = await storage.readFile(path);
        expect(result1).toEqual({ method: 'readFile' });
        expect(result1).toBe(result2); // Same reference
      });
    });
  });

  describe('cache invalidation on write', () => {
    test('writeFile invalidates cache for that path', async () => {
      const path = 'cache-invalidate-write.json';
      await storage.writeFile(path, { version: 1 });

      await runWithRequestCache(async () => {
        // Read and cache
        const result1 = await storage.readJSON(path);
        expect(result1).toEqual({ version: 1 });

        // Write new data
        await storage.writeFile(path, { version: 2 });

        // Read again - should get fresh data, not cached version 1
        const result2 = await storage.readJSON(path);
        expect(result2).toEqual({ version: 2 });
        expect(result2).not.toBe(result1);
      });
    });

    test('writeJSON invalidates cache for that path', async () => {
      const path = 'cache-invalidate-writejson.json';
      await storage.writeFile(path, { version: 1 });

      await runWithRequestCache(async () => {
        const result1 = await storage.readJSON(path);
        expect(result1).toEqual({ version: 1 });

        await storage.writeJSON(path, { version: 2 });

        const result2 = await storage.readJSON(path);
        expect(result2).toEqual({ version: 2 });
      });
    });

    test('deleteFile invalidates cache for that path', async () => {
      const path = 'cache-invalidate-delete.json';
      await storage.writeFile(path, { willDelete: true });

      await runWithRequestCache(async () => {
        const result1 = await storage.readJSON(path);
        expect(result1).toEqual({ willDelete: true });

        await storage.deleteFile(path);

        const result2 = await storage.readJSON(path);
        expect(result2).toBeNull();
      });
    });

    test('writing to path A does not invalidate cache for path B', async () => {
      const pathA = 'cache-no-cross-invalidate-a.json';
      const pathB = 'cache-no-cross-invalidate-b.json';
      await storage.writeFile(pathA, { file: 'a' });
      await storage.writeFile(pathB, { file: 'b' });

      await runWithRequestCache(async () => {
        // Cache both
        const resultA = await storage.readJSON(pathA);
        const resultB = await storage.readJSON(pathB);

        // Write only to A
        await storage.writeFile(pathA, { file: 'a-updated' });

        // B should still be cached (same reference)
        const resultB2 = await storage.readJSON(pathB);
        expect(resultB2).toBe(resultB);

        // A should be fresh
        const resultA2 = await storage.readJSON(pathA);
        expect(resultA2).toEqual({ file: 'a-updated' });
      });
    });
  });

  describe('cache isolation between requests', () => {
    test('cache from one request does not leak to another', async () => {
      const path = 'cache-isolation.json';
      await storage.writeFile(path, { version: 1 });

      let ref1: unknown;

      // First request caches version 1
      await runWithRequestCache(async () => {
        ref1 = await storage.readJSON(path);
        expect(ref1).toEqual({ version: 1 });
      });

      // Modify data between requests
      await storage.writeFile(path, { version: 2 });

      // Second request should read version 2 from disk
      await runWithRequestCache(async () => {
        const ref2 = await storage.readJSON(path);
        expect(ref2).toEqual({ version: 2 });
        expect(ref2).not.toBe(ref1);
      });
    });

    test('concurrent requests have independent caches', async () => {
      const path = 'cache-concurrent.json';
      await storage.writeFile(path, { shared: 'data' });

      let ref1: unknown;
      let ref2: unknown;

      await Promise.all([
        runWithRequestCache(async () => {
          ref1 = await storage.readJSON(path);
        }),
        runWithRequestCache(async () => {
          ref2 = await storage.readJSON(path);
        }),
      ]);

      // Both should have the same data
      expect(ref1).toEqual({ shared: 'data' });
      expect(ref2).toEqual({ shared: 'data' });
    });
  });

  describe('copyFile cache invalidation', () => {
    test('copyFile invalidates cache for destination path', async () => {
      const src = 'cache-copy-src.json';
      const dest = 'cache-copy-dest.json';
      await storage.writeFile(src, { source: 'data' });
      await storage.writeFile(dest, { old: 'data' });

      await runWithRequestCache(async () => {
        // Cache destination
        const result1 = await storage.readJSON(dest);
        expect(result1).toEqual({ old: 'data' });

        // Copy source to destination
        await storage.copyFile(src, dest);

        // Destination cache should be invalidated
        const result2 = await storage.readJSON(dest);
        expect(result2).toEqual({ source: 'data' });
      });
    });
  });
});
