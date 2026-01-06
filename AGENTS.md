# BudgetForFun Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-30

## Active Technologies

- TypeScript 5.x (strict mode), Rust 2021 edition (Tauri) + Svelte 5.x, Bun 1.x, Tauri 2.x, tauri-plugin-store (008-misc-fixes-improvements)

- TypeScript (strict mode), Svelte 4.x, Bun 1.x + Svelte, Tauri, Bun HTTP server, existing API routes (002-detailed-monthly-view)
- Local JSON files (data/entities/, data/months/) (002-detailed-monthly-view)
- TypeScript (strict mode), Rust (Tauri) + Bun 1.x, Svelte 4.x, Tauri 2.x, tauri-plugin-store, tauri-plugin-dialog, tauri-plugin-fs (003-configurable-data-storage)
- JSON files in user-configurable directory (003-configurable-data-storage)
- TypeScript 5.6.x (strict mode), Rust 2021 edition, Svelte 5.x + ESLint 9, Prettier, Vitest, Playwright, Husky/lefthook, GitHub Actions (005-code-quality-cicd)
- N/A (tooling/configuration feature, no data storage) (005-code-quality-cicd)

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

## Test Coverage

### Running Coverage

```bash
# Backend (Bun native - always works)
make test-backend-coverage

# Frontend (requires Node.js)
make test-frontend-coverage

# Both (skips frontend if Node.js not available)
make test-coverage
```

### Node.js Exception

Frontend coverage requires Node.js because Vitest's coverage provider needs `node:inspector`, which Bun hasn't implemented yet. This is the **only exception** to the no-Node rule.

See `docs/testing.md` for details.

## Code Style

: Follow standard conventions

## Recent Changes

- 008-misc-fixes-improvements: Added TypeScript 5.x (strict mode), Rust 2021 edition (Tauri) + Svelte 5.x, Bun 1.x, Tauri 2.x, tauri-plugin-store

- 005-code-quality-cicd: Added TypeScript 5.6.x (strict mode), Rust 2021 edition, Svelte 5.x + ESLint 9, Prettier, Vitest, Playwright, Husky/lefthook, GitHub Actions
- 003-configurable-data-storage: Added TypeScript (strict mode), Rust (Tauri) + Bun 1.x, Svelte 4.x, Tauri 2.x, tauri-plugin-store, tauri-plugin-dialog, tauri-plugin-fs

<!-- MANUAL ADDITIONS START -->

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

- Feature branch: 003-configurable-data-storage
- Backend Storage Refactoring:
  - StorageServiceImpl.initialize(basePath) - Configurable base path via DATA_DIR env var
  - Development mode: uses ./data (relative path)
  - Production mode: uses DATA_DIR environment variable (absolute path)
- Settings API (api/src/routes/handlers/settings.ts):
  - GET /api/settings - Returns current settings (dataDirectory, isDevelopment, version)
  - GET /api/settings/data-directory - Returns data directory config
  - POST /api/settings/validate-directory - Validates a directory for use
  - POST /api/settings/migrate-data - Migrates data between directories (copy/fresh/use_existing)
- Settings Service (api/src/services/settings-service.ts):
  - getSettings(), getDataDirectory(), validateDirectory(), migrateData()
- Settings Models (api/src/models/settings.ts):
  - AppSettings, StorageConfig, DirectoryValidation, MigrationResult, MigrationMode
- Tauri Plugin Integration (src-tauri/):
  - Cargo.toml: Added tauri-plugin-store, tauri-plugin-dialog, tauri-plugin-fs, dirs
  - lib.rs: Added get_default_data_dir(), get_config_dir(), modified start_bun_sidecar(data_dir)
  - capabilities/default.json: Added store, dialog, fs permissions with scope
- Settings Store (src/stores/settings.ts):
  - loadSettings(), validateDirectory(), migrateData(), openFolderPicker()
  - saveDataDirectorySetting(), getSavedDataDirectory()
  - Tauri Store wrapper with browser localStorage fallback
- Settings Page (src/routes/settings/+page.svelte):
  - Data Storage section with Browse button
  - Backup & Restore section (Export/Import)
  - Appearance section (placeholder for future themes)
  - About section (version, data format, mode)
  - Migration dialog modal (copy/fresh/use_existing options)
  - Progress, Success, Error modals
- Navigation updated: Added Settings link to sidebar

<!-- MANUAL ADDITIONS END -->
