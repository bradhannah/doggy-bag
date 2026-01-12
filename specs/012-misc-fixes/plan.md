# Implementation Plan: Miscellaneous Fixes Round 4

**Branch**: `012-misc-fixes` | **Date**: 2026-01-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-misc-fixes/spec.md`

## Summary

This release contains 10 distinct items: 1 major new feature (Insurance Claims Tracking), 2 bug fixes (version reporting, $0 amounts), and 7 enhancements (savings redesign, unsaved changes confirmation, backup notes, Auto/Manual pills, hide system categories, investment type, variable rate behavior). The technical approach follows existing patterns in the codebase with new entities for insurance tracking and file upload handling.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Rust 2021 edition (Tauri)  
**Primary Dependencies**: Svelte 5.x, Bun 1.x, Tauri 2.x, Vite  
**Storage**: JSON files in user-configurable directory + new documents/ folder for uploads  
**Testing**: Bun test (backend), Vitest (frontend), Playwright (E2E)  
**Target Platform**: macOS, Windows, Linux (Tauri desktop app)  
**Project Type**: Web application (frontend + backend in Tauri shell)  
**Performance Goals**: UI updates <100ms, auto-save <1s, file uploads <5s for typical documents  
**Constraints**: Offline-capable, single executable <50MB, no external network except localhost IPC  
**Scale/Scope**: Single user, hundreds of claims/year, documents <10MB each

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                | Status | Notes                                                                                |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| I. User-Centric Simplicity               | PASS   | All features designed for ease of use (auto-save, confirmation dialogs, clear pills) |
| II. Test-First Development               | PASS   | Will follow TDD for all implementations                                              |
| III. Incremental Delivery                | PASS   | 10 independent user stories, each shippable separately                               |
| IV. Specification Before Implementation  | PASS   | Spec complete with all clarifications resolved                                       |
| V. Observability & Debuggability         | PASS   | Backup notes improve debugging context                                               |
| VI. Build and Run Locality               | PASS   | All features run locally                                                             |
| VIII. Local file storage                 | PASS   | Documents stored in local directory                                                  |
| X. Avoid silly libraries                 | PASS   | No new libraries required for these features                                         |
| XI. Makefiles for automation             | PASS   | Will use existing Makefile targets                                                   |
| XIV. API Documentation                   | PASS   | New endpoints will be added to OpenAPI spec                                          |
| XVI. Bun Backend                         | PASS   | Using existing Bun server                                                            |
| XVIII. Tauri Desktop Shell               | PASS   | Using existing Tauri shell                                                           |
| XIX. SvelteKit Frontend                  | PASS   | Using existing Svelte components                                                     |
| XXIII. Styling via Scoped CSS Only       | PASS   | Will use CSS variables, no external frameworks                                       |
| XXIV. No External UI Component Libraries | PASS   | Building custom components                                                           |
| XXVII. Backend Testing                   | PASS   | Will test with curl before manual testing                                            |

**All gates pass. No violations requiring justification.**

## Project Structure

### Documentation (this feature)

```text
specs/012-misc-fixes/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI additions)
├── checklists/          # Quality checklists
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Frontend (Svelte)
src/
├── components/
│   ├── Setup/                    # Manage page components
│   │   ├── BillForm.svelte       # [MODIFY] Add dirty tracking, category required
│   │   ├── IncomeForm.svelte     # [MODIFY] Add payment_method, dirty tracking, category required
│   │   ├── PaymentSourceForm.svelte  # [MODIFY] Add investment type, variable rate behavior
│   │   ├── CategoryForm.svelte   # [MODIFY] Add dirty tracking
│   │   ├── BillsListByCategory.svelte    # [MODIFY] Add Auto/Manual pill, filter system categories
│   │   ├── IncomesListByCategory.svelte  # [MODIFY] Add Auto/Manual pill, filter system categories
│   │   ├── InsurancePlanForm.svelte      # [NEW] Insurance plan CRUD
│   │   ├── InsurancePlansList.svelte     # [NEW] Insurance plans list
│   │   ├── InsuranceCategoryForm.svelte  # [NEW] Insurance category CRUD
│   │   ├── InsuranceCategoriesList.svelte # [NEW] Insurance categories list
│   │   ├── Drawer.svelte         # [MODIFY] Pass dirty state check to backdrop handler
│   │   └── SetupPage.svelte      # [MODIFY] Add Insurance Plans/Categories tabs
│   ├── DetailedView/
│   │   ├── AdHocForm.svelte      # [MODIFY] Add dirty tracking, $0 validation
│   │   ├── BillRow.svelte        # [MODIFY] $0 validation
│   │   ├── IncomeRow.svelte      # [MODIFY] $0 validation
│   │   └── OccurrenceRow.svelte  # [MODIFY] $0 validation
│   ├── Insurance/                # [NEW] Insurance Claims components
│   │   ├── InsuranceClaimsPage.svelte
│   │   ├── ClaimsList.svelte
│   │   ├── ClaimDetail.svelte
│   │   ├── ClaimForm.svelte
│   │   ├── SubmissionCard.svelte
│   │   ├── DocumentUpload.svelte
│   │   └── ClaimsSummary.svelte
│   ├── shared/
│   │   └── ConfirmDialog.svelte  # [EXISTING] Reuse for unsaved changes modal
│   └── Navigation.svelte         # [MODIFY] Add Insurance Claims nav item
├── routes/
│   ├── savings/+page.svelte      # [MODIFY] Redesign with Contribution column, auto-save
│   ├── settings/+page.svelte     # [MODIFY] Backup notes modal
│   └── insurance/+page.svelte    # [NEW] Insurance claims route
├── stores/
│   ├── bills.ts                  # [EXISTING] No changes needed
│   ├── incomes.ts                # [MODIFY] Add payment_method
│   ├── payment-sources.ts        # [MODIFY] Add 'investment' type, migration
│   ├── months.ts                 # [MODIFY] Add savings_contributions
│   ├── insurance-plans.ts        # [NEW] Insurance plans store
│   ├── insurance-categories.ts   # [NEW] Insurance categories store
│   └── insurance-claims.ts       # [NEW] Insurance claims store
└── types/
    └── api.ts                    # [MODIFY] Add insurance types

# Backend (Bun)
api/
├── src/
│   ├── routes/
│   │   ├── index.ts              # [MODIFY] Add insurance routes
│   │   └── handlers/
│   │       ├── backup.handlers.ts    # [MODIFY] Accept note parameter
│   │       ├── months.handlers.ts    # [MODIFY] Savings contributions
│   │       ├── insurance-plans.handlers.ts    # [NEW]
│   │       ├── insurance-categories.handlers.ts # [NEW]
│   │       └── insurance-claims.handlers.ts   # [NEW]
│   ├── services/
│   │   ├── version-service.ts    # [MODIFY] Read version from tauri.conf.json
│   │   ├── validation.ts         # [MODIFY] $0 validation, category required
│   │   ├── payment-sources-service.ts # [MODIFY] Investment type migration, variable rate migration
│   │   ├── months-service.ts     # [MODIFY] Copy Final to Start on month creation
│   │   ├── insurance-plans-service.ts # [NEW]
│   │   ├── insurance-categories-service.ts # [NEW]
│   │   └── insurance-claims-service.ts # [NEW]
│   └── types/
│       └── index.ts              # [MODIFY] Add insurance types, Income payment_method
├── openapi/
│   └── swagger.json              # [MODIFY] Add insurance endpoints
└── package.json                  # [MODIFY] Version to 0.3.0

# Tauri
src-tauri/
├── tauri.conf.json               # [EXISTING] Version source of truth (0.3.0)
└── Cargo.toml                    # [MODIFY] Version to 0.3.0

# Root
package.json                      # [MODIFY] Version to 0.3.0

# Data
data/
├── entities/
│   ├── insurance-plans.json      # [NEW]
│   ├── insurance-categories.json # [NEW]
│   └── insurance-claims.json     # [NEW]
└── documents/
    └── insurance/
        └── receipts/             # [NEW] Uploaded documents

# Skills
.opencode/skill/homebrew-release/SKILL.md  # [MODIFY] Document all version locations
```

**Structure Decision**: Existing web application structure with new Insurance feature module. Documents stored in dedicated subdirectory.

## Complexity Tracking

> No violations to justify - all gates pass.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       | N/A        | N/A                                  |
