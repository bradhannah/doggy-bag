# Implementation Plan: Miscellaneous Fixes and Improvements

**Branch**: `008-misc-fixes-improvements` | **Date**: 2026-01-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-misc-fixes-improvements/spec.md`

## Summary

This plan covers 8 independent items: 1 critical bug fix (due date field mismatch), 3 UX features (hide paid toggle, section headers, dashboard balance), 1 new page (savings/investments tracking), 1 bill enhancement (auto/manual badge), 1 cleanup (remove undo), and 1 UI polish (config page styling). Items are independent and can be implemented in priority order or parallel.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Rust 2021 edition (Tauri)
**Primary Dependencies**: Svelte 5.x, Bun 1.x, Tauri 2.x, tauri-plugin-store
**Storage**: Local JSON files (data/entities/, data/months/)
**Testing**: Bun test (backend), Playwright (e2e), Vitest (frontend)
**Target Platform**: macOS, Windows, Linux (Tauri desktop app)
**Project Type**: Desktop application with Bun backend + Svelte frontend + Tauri shell
**Performance Goals**: UI updates < 100ms, data operations < 500ms
**Constraints**: Single binary < 10MB (excluding Bun sidecar), offline-only, no external network
**Scale/Scope**: Single-user budget app, ~100 bills/incomes, ~12 months of data

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                    | Status     | Notes                                                                     |
| -------------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| **I. User-Centric Simplicity**               | ✅ PASS    | All features reduce friction (hide paid, section stats, savings tracking) |
| **II. Test-First Development**               | ⚠️ MONITOR | Tests required for all changes; existing undo tests will be deleted       |
| **III. Incremental Delivery**                | ✅ PASS    | 8 independent items, each deliverable separately                          |
| **IV. Specification Before Implementation**  | ✅ PASS    | Full spec completed with acceptance criteria                              |
| **V. Observability & Debuggability**         | ✅ PASS    | No new logging requirements; existing patterns sufficient                 |
| **VIII. Local file storage**                 | ✅ PASS    | New savings balances stored in existing MonthlyData structure             |
| **X. Avoid silly libraries**                 | ✅ PASS    | No new dependencies; pure Svelte/TypeScript                               |
| **XI. Makefiles for automation**             | ✅ PASS    | Existing Makefile targets sufficient                                      |
| **XIII. User Interface Consistency**         | ✅ PASS    | Item #8 specifically improves consistency                                 |
| **XIV. API Documentation**                   | ✅ PASS    | New endpoints documented via OpenAPI                                      |
| **XVI. Bun Backend**                         | ✅ PASS    | All backend changes in existing Bun services                              |
| **XIX. SvelteKit Frontend**                  | ✅ PASS    | All frontend changes in existing Svelte components                        |
| **XXIII. Styling via Scoped CSS Only**       | ✅ PASS    | No external CSS libraries                                                 |
| **XXIV. No External UI Component Libraries** | ✅ PASS    | Custom components only                                                    |
| **XXVII. Backend Testing**                   | ⚠️ MONITOR | Backend changes must be curl-tested before user testing                   |

**Gate Status**: ✅ PASSED - No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/008-misc-fixes-improvements/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
│   └── api-changes.yaml # OpenAPI additions/changes
├── checklists/
│   └── requirements.md  # Specification quality checklist (completed)
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
# Tauri Desktop Application Structure

api/                          # Bun backend
├── src/
│   ├── types/
│   │   └── index.ts          # Entity types (Bill, Income, PaymentSource, MonthlyData)
│   ├── services/
│   │   ├── bills-service.ts  # Bill CRUD
│   │   ├── incomes-service.ts # Income CRUD
│   │   ├── months-service.ts # Month generation
│   │   ├── validation.ts     # Entity validation
│   │   ├── undo-service.ts   # TO BE DELETED
│   │   └── leftover-service.ts # Leftover calculations
│   ├── routes/
│   │   ├── handlers/
│   │   │   ├── undo.handlers.ts # TO BE DELETED
│   │   │   └── settings.ts   # Settings API
│   │   └── index.ts          # Route registration
│   └── utils/
│       ├── occurrences.ts    # Occurrence generation (BUG FIX HERE)
│       └── leftover.ts       # Leftover calculation
└── tests/

src/                          # Svelte frontend
├── components/
│   ├── Dashboard/
│   │   └── Dashboard.svelte  # Add Starting Balance display
│   ├── DetailedView/
│   │   ├── DetailedMonthView.svelte  # Add section headers, hide toggle
│   │   ├── CategorySection.svelte    # Support collapse when all paid
│   │   ├── BillRow.svelte           # Add Auto/Manual badge
│   │   └── SummarySidebar.svelte    # Filter savings/investment accounts
│   ├── Setup/
│   │   ├── BillsListByCategory.svelte   # Fix styling
│   │   ├── IncomesListByCategory.svelte # Fix styling
│   │   └── PaymentSourceForm.svelte     # Add is_savings/is_investment
│   └── Navigation.svelte     # Remove undo button
├── routes/
│   └── savings/
│       └── +page.svelte      # NEW: Savings & Investments page
├── stores/
│   ├── ui.ts                 # Add hidePaidBills toggle
│   ├── undo.ts               # TO BE DELETED
│   └── undo.test.ts          # TO BE DELETED
└── types/
    └── api.ts                # Frontend type definitions

data/
├── entities/
│   ├── bills.json            # Existing bill data
│   ├── incomes.json          # Existing income data
│   ├── payment-sources.json  # Add is_savings, is_investment
│   └── undo.json             # TO BE DELETED
└── months/
    └── *.json                # Add savings_balances_start/end
```

**Structure Decision**: Existing Tauri desktop app structure. Changes span backend services, frontend components, and data models. No new top-level directories required; savings page added under existing routes structure.

## Complexity Tracking

> No Constitution Check violations requiring justification.

| Item                 | Complexity | Rationale                                       |
| -------------------- | ---------- | ----------------------------------------------- |
| #1 Due Date Bug      | Low        | 2-line fix in occurrences.ts + type cleanup     |
| #2 Hide Paid Toggle  | Medium     | New store, UI updates, category collapse logic  |
| #3 Section Headers   | Medium     | New component, calculations, styling            |
| #4 Dashboard Balance | Low        | Add single row to existing Dashboard            |
| #5 Savings Page      | High       | New page, new entity fields, new data storage   |
| #6 Auto/Manual Badge | Low        | New field + badge display                       |
| #7 Remove Undo       | Low        | Delete files, remove imports                    |
| #8 Config Styling    | Medium     | Restyle existing components, validation changes |

## Implementation Order (Recommended)

Based on priority and dependencies:

1. **#1 Due Date Bug** (P1) - Critical fix, no dependencies
2. **#7 Remove Undo** (P3) - Cleanup, simplifies codebase early
3. **#8 Config Styling** (P3) - Includes category validation changes needed by other items
4. **#6 Auto/Manual Badge** (P3) - Simple addition to bills
5. **#4 Dashboard Balance** (P2) - Uses existing leftover data
6. **#3 Section Headers** (P2) - Builds on existing detailed view
7. **#2 Hide Paid Toggle** (P2) - Builds on section headers work
8. **#5 Savings Page** (P3) - Largest item, most independent

---

## Post-Design Constitution Re-Check

_Completed after Phase 1 design artifacts._

| Principle                                    | Status  | Post-Design Notes                                                    |
| -------------------------------------------- | ------- | -------------------------------------------------------------------- |
| **I. User-Centric Simplicity**               | ✅ PASS | Designs validated - no unnecessary complexity introduced             |
| **II. Test-First Development**               | ✅ PASS | Test patterns identified in quickstart.md for each item              |
| **III. Incremental Delivery**                | ✅ PASS | Implementation order defined; each item independently testable       |
| **IV. Specification Before Implementation**  | ✅ PASS | spec.md, data-model.md, contracts/api-changes.md, quickstart.md done |
| **V. Observability & Debuggability**         | ✅ PASS | Existing logging patterns sufficient                                 |
| **VIII. Local file storage**                 | ✅ PASS | MonthlyData extensions documented in data-model.md                   |
| **X. Avoid silly libraries**                 | ✅ PASS | No new dependencies confirmed                                        |
| **XI. Makefiles for automation**             | ✅ PASS | No new Makefile targets needed                                       |
| **XIII. User Interface Consistency**         | ✅ PASS | Badge colors and styling defined in quickstart.md                    |
| **XIV. API Documentation**                   | ✅ PASS | API contracts complete in contracts/api-changes.md                   |
| **XVI. Bun Backend**                         | ✅ PASS | All service changes documented                                       |
| **XIX. SvelteKit Frontend**                  | ✅ PASS | Component changes mapped in project structure                        |
| **XXIII. Styling via Scoped CSS Only**       | ✅ PASS | No external CSS; scoped styles only                                  |
| **XXIV. No External UI Component Libraries** | ✅ PASS | Custom badge/toggle components specified                             |
| **XXVII. Backend Testing**                   | ✅ PASS | Curl commands documented in quickstart.md for each backend change    |

**Post-Design Status**: ✅ ALL PASSED - Ready for `/speckit.tasks`

---

## Artifacts Summary

| Artifact                     | Status   | Purpose                                      |
| ---------------------------- | -------- | -------------------------------------------- |
| `spec.md`                    | Complete | Feature requirements and acceptance criteria |
| `checklists/requirements.md` | Complete | Specification quality checklist              |
| `plan.md`                    | Complete | Implementation plan (this file)              |
| `research.md`                | Complete | Technical decisions and unknowns             |
| `data-model.md`              | Complete | Entity schema changes                        |
| `contracts/api-changes.md`   | Complete | API contract modifications                   |
| `quickstart.md`              | Complete | Developer implementation guide               |
| `tasks.md`                   | Pending  | Generated by `/speckit.tasks`                |

---

## Next Steps

Run `/speckit.tasks` to generate implementation tasks from this plan.
