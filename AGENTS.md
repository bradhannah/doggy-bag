# BudgetForFun Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-30

## Active Technologies
- TypeScript (strict mode), Svelte 4.x, Bun 1.x + Svelte, Tauri, Bun HTTP server, existing API routes (002-detailed-monthly-view)
- Local JSON files (data/entities/, data/months/) (002-detailed-monthly-view)

- (001-monthly-budget)

## Project Structure

```text
src/
tests/
```

## OOF
- Before you tell me something works - I expect you to test it using Makefile test or curl if a web page. 
- I expect you to use curl to test your backends before you have me test

## Commands

# Add commands for 

## Code Style

: Follow standard conventions

## Recent Changes
- 002-detailed-monthly-view: Added TypeScript (strict mode), Svelte 4.x, Bun 1.x + Svelte, Tauri, Bun HTTP server, existing API routes

- 001-monthly-budget: Added
- 002: OpenAPI type coordination (tsoa, openapi-typescript, openapi-fetch)

<!-- MANUAL ADDITIONS START -->
  - Backend types (api/src/types/index.ts)
  - tsoa controllers (api/src/controllers/*.ts)
  - OpenAPI spec generation (api/openapi/swagger.json)
  - Svelte types (src/types/api.ts)
  - Type-safe API client (src/lib/api/client.ts)
  - Smoke test validation (scripts/smoke-test.sh)

  - Sidecar downloaded: Bun binary (57MB) for macOS ARM64
  - Rust sidecar command (start_bun_sidecar) implemented
  - Tauri config (externalBin enabled)
  - Shell permissions (allow-execute, allow-spawn) added
  - Production build tested: Tauri binary 11MB (close to 10MB limit)
  - Hot reload tests created (test-reload.svelte, test-endpoint.ts)
  - Bundle size verified: Tauri app (11MB), Bun sidecar (57MB)
  - Bundle size issue: Bun sidecar NOT bundled in production (to stay under 10MB limit)
  - TODO: Document compression strategy or alternative bundling approach

 - Phase 3.5: UI Component Prototyping - COMPLETE (2025-12-30)
   - Prototyping testbed page (src/routes/prototype.svelte) - Tabbed interface for testing variations
   - Mock data service (src/prototype-data.ts) - Sample bills, incomes, payment sources
   - All component variations created (8 components, 20+ variations tested)
   - Decisions documented in specs/001-monthly-budget/prototyping-decisions.md
   - Selected variations:
     - Inputs: Native input with $ prefix
     - Date Pickers: Native month input
     - Dropdowns: Native select
     - Modals: Right-side drawer
     - Lists: Card-based layout
     - Navigation: Sidebar navigation
     - Colors: Dark mode default (#24c8db primary)
     - Forms: Vertical form layout

 - Phase 4: Foundational Services - COMPLETE (2025-12-30)
   - Storage Service (api/src/services/storage.ts) - File I/O with Bun promises API
   - Validation Service (api/src/services/validation.ts) - Data integrity checks for all entities
   - Payment Sources Service (api/src/services/payment-sources-service.ts) - CRUD operations
   - Bills Service (api/src/services/bills-service.ts) - CRUD operations with validation
   - Incomes Service (api/src/services/incomes-service.ts) - CRUD operations with validation
   - Categories Service (api/src/services/categories-service.ts) - CRUD operations with validation
   - Months Service (api/src/services/months-service.ts) - Generate and manage monthly budget data
   - Backup Service (api/src/services/backup-service.ts) - Export/backup and restore functionality
   - Undo Service (api/src/services/undo-service.ts) - 5-entry undo stack management
   - Leftover Service (api/src/services/leftover-service.ts) - Calculate "leftover at end of month"
   - Auto-Save Service (api/src/services/auto-save.ts) - Debounced auto-save mechanism
   
   - Utilities (api/src/utils/):
     - errors.ts - Standardized error types (ValidationError, NotFoundError, StorageError, ConflictError)
     - formatters.ts - Currency and date formatting ($X,XXX.XX, YYYY-MM-DD)
     - validators.ts - Input validation helpers (required, length, amount, UUID, enum)
     - billing-period.ts - Billing period calculations (monthly, bi-weekly, weekly, semi-annually)
     - logger.ts - Centralized logging utility (debug, info, warn, error levels)
   
   - Models (api/src/models/):
     - bill.ts, income.ts, payment-source.ts, category.ts, expense.ts, monthly-data.ts, undo.ts
   
   - Entity Files (data/entities/):
     - bills.json (empty array)
     - incomes.json (empty array)
     - categories.json (8 pre-defined categories)
     - payment-sources.json (empty array)
     - undo.json (empty array)

<!-- MANUAL ADDITIONS END -->
