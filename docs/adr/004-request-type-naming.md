# ADR-004: Request Type Naming Convention

**Status**: Accepted  
**Date**: 2026-01-03

---

## Context

With the type synchronization strategy (ADR-002) requiring shared request/response types, we need a consistent naming convention for API contract types.

Common conventions in the industry:

| Convention                          | Example                | Used By                |
| ----------------------------------- | ---------------------- | ---------------------- |
| `Create*Request` / `Update*Request` | `CreateBillRequest`    | Microsoft, Google APIs |
| `*CreateDto` / `*UpdateDto`         | `BillCreateDto`        | NestJS, .NET           |
| `*Input` / `*Payload`               | `BillInput`            | GraphQL conventions    |
| `New*` / `*Patch`                   | `NewBill`, `BillPatch` | REST informal          |

---

## Decision

We will use the **`Create*Request` / `Update*Request`** naming convention.

```typescript
// api/src/types/requests.ts

// Bills
export interface CreateBillRequest { ... }
export interface UpdateBillRequest extends Partial<CreateBillRequest> {}

// Incomes
export interface CreateIncomeRequest { ... }
export interface UpdateIncomeRequest extends Partial<CreateIncomeRequest> {}

// Occurrences
export interface CreateOccurrenceRequest { ... }
export interface UpdateOccurrenceRequest { ... }

// Actions
export interface CloseInstanceRequest { closed_date?: string }
export interface AddPaymentRequest { amount: number; date: string; payment_source_id?: string }
```

---

## Consequences

### Positive

1. **Explicit purpose** - Clear what each type is for (request body)
2. **Consistent** - Matches OpenAPI conventions (`requestBody`)
3. **Searchable** - Easy to find all request types with `*Request`
4. **Familiar** - Widely used in enterprise APIs

### Negative

1. **Verbose** - `CreateBillRequest` is longer than `BillInput`
2. **Response types** - Need parallel convention (`*Response` if needed)

### Type Organization

```
api/src/types/
├── index.ts       # Entity types (Bill, Income, etc.)
├── requests.ts    # Request body types (Create*, Update*, etc.)
└── responses.ts   # Response types if needed (optional)
```

---

## Examples

```typescript
// api/src/types/requests.ts

export interface CreateBillRequest {
  name: string;
  amount: number;
  billing_period: 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually';
  payment_source_id: string;
  day_of_month?: number;
  start_date?: string;
  category_id?: string;
  is_active?: boolean;
}

export interface UpdateBillRequest extends Partial<CreateBillRequest> {}

export interface CreatePaymentSourceRequest {
  name: string;
  type: 'bank_account' | 'credit_card' | 'line_of_credit' | 'cash';
  balance: number;
  is_active?: boolean;
  exclude_from_leftover?: boolean;
  pay_off_monthly?: boolean;
}

export interface ReorderCategoriesRequest {
  categoryIds: string[];
}

export interface MigrateDataRequest {
  targetPath: string;
  mode: 'copy' | 'fresh' | 'use_existing';
}
```

---

## References

- [ADR-002: Type Synchronization](./002-type-synchronization.md)
- [Backend Patterns](../architecture/backend-patterns.md)
