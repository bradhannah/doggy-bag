# ADR-003: Controller Organization

**Status**: Accepted  
**Date**: 2026-01-03

---

## Context

With the decision to use tsoa for OpenAPI spec generation (ADR-002), we need to organize ~74 route endpoints into controllers. The routes have complex nested structures:

```
/api/bills                                          # Simple CRUD
/api/months/{month}/bills/{id}                      # Nested by month
/api/months/{month}/bills/{id}/occurrences/{occId}  # Deeply nested
/api/months/{month}/bills/{id}/occurrences/{occId}/payments  # Very deep
```

Options:
1. **Single large controller** - All routes in one file
2. **Split by resource** - Separate controllers for bills, incomes, etc.
3. **Nested route controllers** - Use tsoa's nested route feature

---

## Decision

We will use **Split controllers with nested routes**.

Each major resource gets its own controller with appropriate base route:

| Controller | Base Route | Endpoints |
|------------|------------|-----------|
| `HealthController` | `/health` | 2 |
| `BillsController` | `/bills` | 4 |
| `IncomesController` | `/incomes` | 4 |
| `PaymentSourcesController` | `/payment-sources` | 4 |
| `CategoriesController` | `/categories` | 5 |
| `MonthsController` | `/months` | 11 |
| `BillInstancesController` | `/months/{month}/bills` | 8 |
| `IncomeInstancesController` | `/months/{month}/incomes` | 8 |
| `BillOccurrencesController` | `/months/{month}/bills/{billId}/occurrences` | 7 |
| `IncomeOccurrencesController` | `/months/{month}/incomes/{incomeId}/occurrences` | 7 |
| `AdhocBillsController` | `/months/{month}/adhoc/bills` | 4 |
| `AdhocIncomesController` | `/months/{month}/adhoc/incomes` | 4 |
| `BackupController` | `/backup` | 3 |
| `UndoController` | `/undo` | 3 |
| `SettingsController` | `/settings` | 5 |
| `SeedController` | `/seed-defaults` | 1 |

---

## Consequences

### Positive

1. **Clean OpenAPI grouping** - Swagger UI groups by controller tag
2. **Manageable file sizes** - ~50-150 lines per controller vs one 1000+ line file
3. **Clear ownership** - Each controller handles one resource type
4. **Nested routes work naturally** - tsoa supports `@Route` with path params

### Negative

1. **Many files** - 16 controller files to maintain
2. **Path duplication** - Some path segments repeated in nested controllers

### Mitigations

1. **Consistent naming** - Controller name matches resource (BillsController → bills)
2. **Handler mirroring** - Controller structure matches handler file structure
3. **Shared types** - All controllers use types from `api/src/types/`

---

## Example: Nested Controller

```typescript
// api/src/controllers/BillOccurrencesController.ts
@Route('months/{month}/bills/{billId}/occurrences')
@Tags('Bill Occurrences')
export class BillOccurrencesController extends Controller {
  
  @Post()
  public async createOccurrence(
    @Path() month: string,
    @Path() billId: string,
    @Body() body: CreateOccurrenceRequest
  ): Promise<Occurrence> { ... }
  
  @Put('{occurrenceId}')
  public async updateOccurrence(
    @Path() month: string,
    @Path() billId: string,
    @Path() occurrenceId: string,
    @Body() body: UpdateOccurrenceRequest
  ): Promise<Occurrence> { ... }
  
  @Post('{occurrenceId}/close')
  public async closeOccurrence(
    @Path() month: string,
    @Path() billId: string,
    @Path() occurrenceId: string
  ): Promise<Occurrence> { ... }
}
```

---

## References

- [ADR-002: Type Synchronization](./002-type-synchronization.md)
- [Backend Patterns](../architecture/backend-patterns.md)
- [Technical Debt: TD-B7](../architecture/technical-debt.md)
