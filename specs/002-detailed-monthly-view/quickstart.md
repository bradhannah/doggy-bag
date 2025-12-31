# Quickstart: Detailed Monthly View

**Feature**: [spec.md](./spec.md)  
**Date**: 2025-12-31

---

## Prerequisites

- Bun installed at `~/.bun/bin/bun`
- Node.js 18+
- Tauri CLI (`cargo install tauri-cli`)

---

## Development Setup

### 1. Start the API Server

```bash
# From project root
~/.bun/bin/bun run api/server.ts
```

API runs at `http://localhost:3000`

### 2. Start the Frontend

```bash
# From project root
npm run dev
```

Frontend runs at `http://localhost:5173`

### 3. Start Tauri (Optional)

```bash
# For desktop app development
npm run tauri dev
```

---

## Key Files for This Feature

### Backend (API)

| File | Purpose |
|------|---------|
| `api/src/types/index.ts` | Type definitions (extend with Payment, CategoryType) |
| `api/src/models/` | Entity models (extend Category, Bill, Income) |
| `api/src/services/` | Business logic services |
| `api/src/controllers/` | tsoa controllers |
| `api/src/routes/handlers/` | Route handlers |

### Frontend (Svelte)

| File | Purpose |
|------|---------|
| `src/routes/month/[month]/+page.svelte` | **NEW**: Detailed View page |
| `src/components/` | Reusable components |
| `src/stores/` | Svelte stores |
| `src/lib/api/client.ts` | Type-safe API client |
| `src/types/api.ts` | Generated API types |

### Data

| File | Purpose |
|------|---------|
| `data/entities/categories.json` | Category definitions |
| `data/entities/bills.json` | Bill definitions |
| `data/months/YYYY-MM.json` | Monthly instance data |

---

## Type Regeneration

After modifying `api/src/types/index.ts` or controllers:

```bash
# Generate OpenAPI spec and frontend types
cd api && ~/.bun/bin/bun run generate-openapi
npm run generate:types
```

---

## Testing Endpoints

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Get Categories (Extended)
```bash
curl http://localhost:3000/api/categories
```

### Get Detailed Month View
```bash
curl http://localhost:3000/api/months/2025-01/detailed
```

### Add Partial Payment
```bash
curl -X POST http://localhost:3000/api/months/2025-01/bills/bi-gas/payments \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "date": "2025-01-15"}'
```

### Create Ad-hoc Bill
```bash
curl -X POST http://localhost:3000/api/months/2025-01/adhoc/bills \
  -H "Content-Type: application/json" \
  -d '{"name": "Car Repair", "amount": 80000}'
```

### Reorder Categories
```bash
curl -X PUT http://localhost:3000/api/categories/reorder \
  -H "Content-Type: application/json" \
  -d '{"type": "bill", "order": ["cat-home", "cat-utilities", "cat-debt"]}'
```

---

## Implementation Order

### Phase 1: Backend Types & Models (Current)
1. Extend types in `api/src/types/index.ts`
2. Update category model with sort_order, color, type
3. Update bill/income models with due_day
4. Create Payment type

### Phase 2: Backend Services
1. Extend categories-service.ts (reorder, color updates)
2. Create payments-service.ts (partial payment CRUD)
3. Extend months-service.ts (detailed view aggregation)
4. Create adhoc-service.ts (ad-hoc item management)

### Phase 3: Backend Controllers & Routes
1. Extend CategoriesController
2. Create PaymentsController
3. Create AdhocController
4. Extend MonthsController with /detailed endpoint

### Phase 4: Frontend Stores
1. Extend categories store (sort_order, color, type filtering)
2. Create detailed-month store (aggregated view data)

### Phase 5: Frontend Components
1. Create `/month/[month]/+page.svelte` route
2. Create CategorySection.svelte
3. Create BillRow.svelte with inline editing
4. Create PartialPaymentModal.svelte
5. Create AdhocItemForm.svelte
6. Create ColorPicker.svelte
7. Create CategoryOrderer.svelte (drag-and-drop)

### Phase 6: Integration & Polish
1. Connect components to stores
2. Add keyboard navigation
3. Add loading states
4. Test with real data

---

## Coding Standards

### API Response Format
```typescript
// Success
{ entity: {...}, message?: string }

// Error
{ error: string, details?: any }
```

### Money Values
- All amounts in **cents** (integers)
- Display: `$X,XXX.XX` format
- Use `formatCurrency()` from `api/src/utils/formatters.ts`

### Dates
- Storage: ISO 8601 (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ssZ`)
- Month format: `YYYY-MM`
- Display: Use locale-appropriate format

### Colors
- Hex format: `#RRGGBB` or `#RGB`
- Validate with regex: `/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/`

---

## Key Decisions Reference

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Partial payments | Embedded in BillInstance.payments[] | Co-located data, no extra file I/O |
| Due dates | `due_day` field (1-31) on Bill/Income | Simple, covers 99% of use cases |
| Category colors | Hex string on Category entity | Full flexibility |
| Ad-hoc items | `is_adhoc` flag + null bill_id | Reuses existing instance structure |
| Leftover calculation | Actuals only | Real-world accuracy |
| Drag-and-drop | Native HTML5 events | No external libraries |
| Route | `/month/[month]` | Clean, shareable URLs |

See [research.md](./research.md) for full decision documentation.

---

## Smoke Test

After implementation, run:

```bash
./scripts/smoke-test.sh
```

Manual verification:
1. Navigate to `/month/2025-01`
2. See bills grouped by category with colors
3. Click a bill to see expected vs actual
4. Add a partial payment
5. Create an ad-hoc expense
6. Reorder categories in Setup
7. Verify leftover updates correctly

---

**Ready to implement!**
