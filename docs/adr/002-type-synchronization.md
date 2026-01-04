# ADR-002: Type Synchronization Strategy

**Status**: Accepted  
**Date**: 2026-01-03

---

## Context

The BudgetForFun application has types defined in the backend (`api/src/types/index.ts`) that must be used by the frontend. Currently:

- Backend has 442 lines of type definitions
- Frontend has auto-generated types in `src/types/api.ts` but only covers 4 of 74 endpoints
- The generated types are out of sync with actual API responses
- Manual type copying leads to drift and bugs

We evaluated two approaches:

**Option A: Full tsoa Runtime** - Use tsoa to generate both OpenAPI spec AND route handlers

- Pros: Single source of truth, auto-generated everything
- Cons: Requires replacing working custom routing, Bun adapter complexity

**Option C: Shared Types Package** - Extract types to a monorepo package

- Pros: Simple, no generation step, works with existing routing
- Cons: No OpenAPI spec, need to set up bun workspaces

**Option A2: tsoa for Spec Generation Only** (Hybrid)

- Pros: Keeps working routing, generates OpenAPI for future web version
- Cons: Controllers must stay in sync with handlers

---

## Decision

We will use **Option A2: tsoa for OpenAPI Spec Generation Only**.

1. Keep the existing custom routing in `server.ts` (it works)
2. Create tsoa Controllers that mirror handlers (for documentation)
3. Controllers call the same services as handlers
4. Run `tsoa spec` to generate `swagger.json`
5. Run `openapi-typescript` to generate frontend types

```
Runtime Path (unchanged):
  server.ts → handlers/*.ts → services/*

Spec Generation Path (new):
  tsoa spec → controllers/*.ts → swagger.json → src/types/api.ts
```

---

## Consequences

### Positive

1. **Lower risk** - No changes to working production code paths
2. **OpenAPI spec** - Enables future web version, API documentation
3. **Type safety** - Frontend gets accurate types from spec
4. **Incremental** - Can migrate to full tsoa runtime later if desired

### Negative

1. **Dual maintenance** - Controllers and handlers must stay in sync
2. **No runtime validation** - tsoa doesn't validate at runtime in this mode
3. **Extra files** - Need to maintain ~16 controller files

### Mitigations

1. **Shared request/response types** - Both controllers and handlers import from `api/src/types/requests.ts`
2. **CI validation** - Script compares route count with controller endpoint count
3. **Documentation comments** - Cross-reference between handlers and controllers

---

## Implementation

### Shared Types

```typescript
// api/src/types/requests.ts
export interface CreateBillRequest {
  name: string;
  amount: number;
  billing_period: BillingPeriod;
  payment_source_id: string;
  // ...
}

export interface UpdateBillRequest extends Partial<CreateBillRequest> {}
```

### Controller Example

```typescript
// api/src/controllers/BillsController.ts
@Route('bills')
@Tags('Bills')
export class BillsController extends Controller {
  private billsService = new BillsServiceImpl();

  @Get()
  public async getBills(): Promise<Bill[]> {
    return this.billsService.getAll();
  }

  @Post()
  public async createBill(@Body() body: CreateBillRequest): Promise<Bill> {
    return this.billsService.create(body);
  }
}
```

---

## References

- [Technical Debt: TD-B7, TD-B8](../architecture/technical-debt.md)
- [Backend Patterns](../architecture/backend-patterns.md)
- [ADR-003: Controller Organization](./003-controller-organization.md)
