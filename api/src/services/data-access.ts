import { AsyncLocalStorage } from 'node:async_hooks';
import { runWithRequestCache } from './request-cache';

interface DataAccessContext {
  failure?: Error;
}
const context = new AsyncLocalStorage<DataAccessContext>();
let pending: Promise<unknown> = Promise.resolve();

/**
 * Single-process isolation for a complete API operation, including reads and
 * migrations. Queueing only writeFile allows callers to overwrite newer data
 * with an older in-memory copy. Nested service operations share the same scope.
 */
export function runWithDataAccess<T>(operation: () => Promise<T>): Promise<T> {
  if (context.getStore()) return operation();
  const result = pending.then(() =>
    context.run({}, () =>
      runWithRequestCache(async () => {
        const value = await operation();
        assertDataAccessHealthy();
        return value;
      })
    )
  );
  pending = result.catch(() => undefined);
  return result;
}

// A swallowed read error must never turn into a successful empty-data response
// or allow a subsequent write to replace the unreadable data.
export function failDataAccess(error: Error): void {
  const active = context.getStore();
  if (active) active.failure ??= error;
}

export function assertDataAccessHealthy(): void {
  const failure = context.getStore()?.failure;
  if (failure) throw failure;
}
