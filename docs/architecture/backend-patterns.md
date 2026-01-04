# Backend Patterns Guide

**Last Updated**: 2026-01-03  
**Runtime**: Bun 1.x

---

## Overview

The BudgetForFun backend is a Bun HTTP server with a service-oriented architecture. This guide documents the patterns for route handling, service implementation, error handling, and validation.

---

## Architecture

```
Request → server.ts → Route Matching → Handler → Service → Storage → Response
```

### Directory Structure

```
api/
├── server.ts              # HTTP server entry point
├── src/
│   ├── controllers/       # tsoa controllers (for OpenAPI spec)
│   ├── models/            # Type re-exports (deprecated)
│   ├── routes/
│   │   ├── handlers/      # Route handlers (15 files)
│   │   └── index.ts       # Route definitions
│   ├── services/          # Business logic (17 services)
│   ├── types/
│   │   └── index.ts       # All type definitions
│   └── utils/
│       ├── errors.ts      # Error classes
│       ├── formatters.ts  # Currency/date formatting
│       ├── validators.ts  # Input validation
│       ├── logger.ts      # Logging utility
│       └── billing-period.ts  # Billing calculations
└── openapi/
    └── swagger.json       # Generated OpenAPI spec
```

---

## Route Handler Pattern

### Standard Handler Structure

```typescript
// api/src/routes/handlers/example.handlers.ts
import { ExampleService, ExampleServiceImpl } from '../../services/example-service';
import { formatErrorForUser } from '../../utils/errors';

const service: ExampleService = new ExampleServiceImpl();

export function createExampleHandlerGET() {
  return async () => {
    try {
      const items = await service.getAll();

      return new Response(JSON.stringify(items), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[ExampleHandler] GET failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load items',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createExampleHandlerPOST() {
  return async (request: Request) => {
    try {
      const body = await request.json();
      const validation = service.validate(body);

      if (!validation.isValid) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: validation.errors,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const created = await service.create(body);

      return new Response(JSON.stringify(created), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (error) {
      console.error('[ExampleHandler] POST failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to create item',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createExampleHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();
      const updated = await service.update(id, body);

      if (!updated) {
        return new Response(
          JSON.stringify({
            error: 'Item not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(updated), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[ExampleHandler] PUT failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update item',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createExampleHandlerDELETE() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      await service.delete(id);

      return new Response(null, { status: 204 });
    } catch (error) {
      console.error('[ExampleHandler] DELETE failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to delete item',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}
```

### Route Registration

```typescript
// api/src/routes/index.ts
import { createExampleHandlerGET, ... } from './handlers/example.handlers';

export const routes = [
  { path: '/api/examples', definition: { method: 'GET', handler: createExampleHandlerGET() } },
  { path: '/api/examples', definition: { method: 'POST', handler: createExampleHandlerPOST() } },
  { path: '/api/examples', definition: { method: 'PUT', handler: createExampleHandlerPUT(), hasPathParam: true } },
  { path: '/api/examples', definition: { method: 'DELETE', handler: createExampleHandlerDELETE(), hasPathParam: true } },
];
```

---

## Service Layer Pattern

### Service Interface

```typescript
// api/src/services/example-service.ts
import type { Example, ValidationResult } from '../types';

export interface ExampleService {
  getAll(): Promise<Example[]>;
  getById(id: string): Promise<Example | null>;
  create(data: Partial<Example>): Promise<Example>;
  update(id: string, data: Partial<Example>): Promise<Example | null>;
  delete(id: string): Promise<void>;
  validate(data: Partial<Example>): ValidationResult;
}
```

### Service Implementation

```typescript
export class ExampleServiceImpl implements ExampleService {
  private storage = StorageServiceImpl;

  async getAll(): Promise<Example[]> {
    return this.storage.readEntity<Example[]>('examples') ?? [];
  }

  async getById(id: string): Promise<Example | null> {
    const items = await this.getAll();
    return items.find((item) => item.id === id) ?? null;
  }

  async create(data: Partial<Example>): Promise<Example> {
    const items = await this.getAll();
    const newItem: Example = {
      id: crypto.randomUUID(),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    items.push(newItem);
    await this.storage.writeEntity('examples', items);
    return newItem;
  }

  async update(id: string, data: Partial<Example>): Promise<Example | null> {
    const items = await this.getAll();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return null;

    items[index] = {
      ...items[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    await this.storage.writeEntity('examples', items);
    return items[index];
  }

  async delete(id: string): Promise<void> {
    const items = await this.getAll();
    const filtered = items.filter((item) => item.id !== id);
    await this.storage.writeEntity('examples', filtered);
  }

  validate(data: Partial<Example>): ValidationResult {
    const errors: string[] = [];

    if (!data.name || data.name.trim() === '') {
      errors.push('Name is required');
    }

    if (data.amount !== undefined && data.amount < 0) {
      errors.push('Amount must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
```

---

## Error Handling

### Error Classes

```typescript
// api/src/utils/errors.ts

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} with id ${id} not found` : `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class StorageError extends Error {
  constructor(
    message: string,
    public path?: string
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ReadOnlyError extends Error {
  constructor(month: string) {
    super(`Month ${month} is read-only. Unlock it to make changes.`);
    this.name = 'ReadOnlyError';
  }
}
```

### Error-to-HTTP Mapping

| Error Type        | HTTP Status | User Message          |
| ----------------- | ----------- | --------------------- |
| `ValidationError` | 400         | Error message         |
| `NotFoundError`   | 404         | Error message         |
| `ConflictError`   | 409         | Error message         |
| `ReadOnlyError`   | 423         | Error message         |
| `StorageError`    | 500         | "Failed to save data" |
| Generic `Error`   | 500         | "An error occurred"   |

### User-Friendly Messages

```typescript
export function formatErrorForUser(error: unknown): string {
  if (error instanceof ValidationError) return error.message;
  if (error instanceof NotFoundError) return error.message;
  if (error instanceof ConflictError) return error.message;
  if (error instanceof ReadOnlyError) return error.message;
  if (error instanceof StorageError) return 'Failed to save data. Please try again.';
  if (error instanceof Error) return 'An error occurred. Please try again.';
  return 'An unknown error occurred';
}
```

---

## Validation Pattern

### Validator Utilities

```typescript
// api/src/utils/validators.ts

export function required(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') {
    return `${field} is required`;
  }
  return null;
}

export function minLength(value: string, min: number, field: string): string | null {
  if (value.length < min) {
    return `${field} must be at least ${min} characters`;
  }
  return null;
}

export function isUUID(value: string, field: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    return `${field} must be a valid UUID`;
  }
  return null;
}

export function isPositiveAmount(value: number, field: string): string | null {
  if (value < 0) {
    return `${field} must be positive`;
  }
  return null;
}

export function isEnum<T>(value: T, allowed: T[], field: string): string | null {
  if (!allowed.includes(value)) {
    return `${field} must be one of: ${allowed.join(', ')}`;
  }
  return null;
}
```

---

## Logging

### Logger Utility

```typescript
// api/src/utils/logger.ts
import { createLogger } from './logger';

const logger = createLogger('ServiceName');

logger.debug('Detailed info', { data }); // Only in development
logger.info('Operation completed');
logger.warn('Something unusual');
logger.error('Operation failed', { error });
```

---

## Storage Service

### Interface

```typescript
// api/src/services/storage.ts
export interface StorageService {
  readEntity<T>(name: string): Promise<T | null>;
  writeEntity<T>(name: string, data: T): Promise<void>;
  readMonth(month: string): Promise<MonthlyData | null>;
  writeMonth(month: string, data: MonthlyData): Promise<void>;
  listMonths(): Promise<string[]>;
  deleteMonth(month: string): Promise<void>;
}
```

### Configuration

```typescript
// Reads DATA_DIR from environment or defaults to ./data
StorageServiceImpl.initialize();

// Get current config
const config = StorageServiceImpl.getConfig();
// { basePath: '/path/to/data', isDevelopment: boolean }
```

---

## Type Definitions

All types are centralized in `api/src/types/index.ts`:

- Entity types: `Bill`, `Income`, `PaymentSource`, `Category`
- Instance types: `BillInstance`, `IncomeInstance`, `Occurrence`
- Response types: `DetailedMonthResponse`, `LeftoverBreakdown`
- Validation: `ValidationResult`

See [ADR-002: Type Synchronization](../adr/002-type-synchronization.md) for the approach to keeping frontend/backend types in sync.

---

## Known Issues

See [Technical Debt Registry](./technical-debt.md) for:

- TD-B1: Complex matchRoute function (270 lines)
- TD-B2: server.ts does too much
- TD-B5: No dependency injection
- TD-B6: DEPRECATED fields need cleanup
- TD-B7: Incomplete OpenAPI generation

---

## References

- [Bun Documentation](https://bun.sh/docs)
- [Architecture Overview](./overview.md)
- [Frontend Patterns](./frontend-patterns.md)
- [ADR-002: Type Synchronization](../adr/002-type-synchronization.md)
