// Per-request read cache using AsyncLocalStorage
// Each HTTP request gets its own Map<string, unknown> that caches file reads.
// The cache is automatically garbage-collected when the request handler completes.
// Writes invalidate the relevant cache entry so subsequent reads see fresh data.

import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * AsyncLocalStorage instance that holds a per-request cache.
 * - Outside a request context, getStore() returns undefined.
 * - Inside runWithRequestCache(), getStore() returns a Map<string, unknown>.
 */
export const requestStorage = new AsyncLocalStorage<Map<string, unknown>>();

/**
 * Run an async function within a fresh per-request cache context.
 * The cache Map is created at the start and discarded when the function completes.
 *
 * Usage in server.ts:
 *   const response = await runWithRequestCache(() => definition.handler(req));
 */
export async function runWithRequestCache<T>(fn: () => Promise<T>): Promise<T> {
  return requestStorage.run(new Map(), fn);
}
