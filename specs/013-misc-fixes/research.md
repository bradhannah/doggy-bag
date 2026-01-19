# Research Plan: Miscellaneous Fixes & Improvements

**Status**: Phase 1 (Design)
**Feature**: `013-misc-fixes`

## Technical Context & Unknowns

### 1. Tauri External URL Handling

- **Decision**: Use explicit `open()` from `@tauri-apps/plugin-opener`.
- **Rationale**: While `<a>` tags exist in legacy code, the `opener` plugin provides a guaranteed API for launching the default browser across all platforms (macOS/Windows/Linux) without relying on webview behavior quirks.
- **Pattern**:
  ```typescript
  import { open } from '@tauri-apps/plugin-opener';
  // ...
  await open(url);
  ```

### 2. Frontend Date Selection Components

- **Decision**: Use native HTML `<input type="date">`.
- **Rationale**: Confirmed existing pattern in `AddPaymentModal.svelte`. Meets Constitution Principle XXIV. Svelte binding works seamlessly.
- **Implementation**: Default value set to `new Date().toISOString().split('T')[0]`.

### 3. Backend Data Persistence for "Waterfall" Logic

- **Decision**: In-memory cascading updates with single file write.
- **Rationale**: `StorageService` writes the entire `insurance-claims.json` file at once. To ensure atomicity and performance, `updateSubmission` must calculate all downstream effects (Sub 2, Sub 3...) in memory and write the final state in one operation, rather than chaining multiple async save calls.

### 4. Charting Library for Histogram

- **Decision**: Custom SVG Component.
- **Rationale**: No existing charting libraries in `package.json`. A monthly histogram is geometrically simple (30-31 bars). Installing a heavy library violates Constitution Principle X ("Avoid silly libraries") and XIX ("Bundle size target <100KB").
- **Design**:
  - `<svg>` container.
  - Scale utility function (value -> height).
  - Loop for bars `<rect>`.
  - CSS for hover tooltips.

### 5. Data Model Migration

- **Decision**: Lazy Migration in Service Layer.
- **Rationale**: `api/src/utils/migration.ts` pattern exists. For `FamilyMember` priorities:
  - On `getAll()` or `getById()`: Check if `plans` array is missing.
  - If missing: Fetch all active `InsurancePlans`.
  - Sort by legacy `priority` field (present in JSON, even if removed from Type).
  - Assign sorted IDs to `plans`.
  - Save back to disk (optional, or just return migrated structure).
  - **Note**: `InsurancePlan` interface will remove `priority`, but the runtime JSON will still have it until we overwrite it. We can treat it as "any" or extend a Legacy interface for migration logic.

## Decisions Log

- **Charting**: SVG over library.
- **URLs**: Plugin `open()` over `<a>`.
- **Migration**: Lazy load + populate.
- **Waterfall**: Synchronous calculation, atomic save.
