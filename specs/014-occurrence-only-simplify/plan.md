# Implementation Plan: Occurrence-Only Payment Model & UI Simplification

**Branch**: `014-occurrence-only-simplify` | **Date**: 2026-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-occurrence-only-simplify/spec.md`

## Summary

Remove the `Payment` data structure entirely and consolidate all transaction tracking into `Occurrence` entities only. Each occurrence represents a single payment event - closing an occurrence equals paying the expected amount. Partial payments are handled through a split workflow that creates additional occurrences. The UI is simplified with a unified Edit & Close Modal (replacing TransactionsDrawer), consolidated row buttons, and clear confirmation modals.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Rust 2021 edition (Tauri)
**Primary Dependencies**: Svelte 5.x, Bun 1.x, Tauri 2.x, Vite
**Storage**: JSON files in user-configurable directory
**Testing**: Bun test (backend), Vitest (frontend), Playwright (E2E)
**Target Platform**: macOS, Windows, Linux desktop (Tauri)
**Project Type**: Desktop application with Bun backend + Svelte frontend + Tauri shell
**Performance Goals**: Core user flows complete within 2 seconds, responsive with thousands of transactions
**Constraints**: Single executable <10MB, no external network (localhost IPC only)
**Scale/Scope**: Personal finance app handling typical household budget data

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                | Status  | Notes                                                                |
| ---------------------------------------- | ------- | -------------------------------------------------------------------- |
| I. User-Centric Simplicity               | PASS    | Feature explicitly focused on reducing complexity and cognitive load |
| II. Test-First Development               | PENDING | Will be enforced during implementation phase                         |
| III. Incremental Delivery                | PASS    | User stories are prioritized and independently testable              |
| IV. Specification Before Implementation  | PASS    | Spec completed with measurable success criteria                      |
| VIII. Local File Storage                 | PASS    | No changes to storage architecture                                   |
| X. Avoid Silly Libraries                 | PASS    | No new dependencies required                                         |
| XIX. SvelteKit Frontend                  | PASS    | Using Svelte patterns (scoped CSS, reactive declarations)            |
| XXIII. Styling via Scoped CSS Only       | PASS    | All UI changes use scoped CSS                                        |
| XXIV. No External UI Component Libraries | PASS    | Custom drawer components                                             |

**Gate Result**: PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/014-occurrence-only-simplify/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API changes)
│   └── occurrence-api.md
├── checklists/
│   └── requirements.md  # Specification quality checklist (complete)
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
api/
├── src/
│   ├── types/
│   │   └── index.ts           # MODIFY: Remove Payment, update Occurrence
│   ├── services/
│   │   └── months-service.ts  # MODIFY: Remove payment logic
│   ├── utils/
│   │   ├── occurrences.ts     # MODIFY: Update occurrence calculations
│   │   ├── tally.ts           # MODIFY: Remove payment aggregation
│   │   └── leftover.ts        # MODIFY: Update leftover calculations
│   └── routes/
│       └── handlers/
│           └── instances.handlers.ts  # MODIFY: Remove payment endpoints, add split
└── tests/
    └── *.test.ts              # UPDATE: All tests using payments

src/
├── components/
│   └── DetailedView/
│       ├── EditCloseModal.svelte           # NEW: Unified edit & close modal
│       ├── SplitConfirmModal.svelte        # NEW: Confirm partial payment split
│       ├── DeleteConfirmModal.svelte       # NEW: Confirm occurrence deletion
│       ├── ReopenConfirmModal.svelte       # NEW: Confirm reopening closed occurrence
│       ├── OccurrenceDetailsDrawer.svelte  # NEW: Read-only occurrence info (replaces ItemDetailsDrawer for occurrences)
│       ├── TransactionsDrawer.svelte       # DELETE: Replaced by EditCloseModal
│       ├── BillRow.svelte                  # MODIFY: New button layout (Edit + overflow)
│       ├── IncomeRow.svelte                # MODIFY: New button layout (Edit + overflow)
│       ├── OccurrenceRow.svelte            # MODIFY: New button layout (Edit + overflow)
│       └── OccurrenceCard.svelte           # MODIFY: + Add Occurrence at instance level
├── stores/
│   └── detailed-month.ts      # MODIFY: Remove payment store functions
└── lib/
    └── api/
        └── client.ts          # MODIFY: Update API client methods
```

**Structure Decision**: Existing web application structure (api/ + src/). Changes involve:

- 5 new modal/drawer components for UI simplification
- 1 deleted component (TransactionsDrawer)
- Multiple modified row components for new button layout

## UI Component Summary

| Component                 | Type   | Trigger                             | Purpose                                       |
| ------------------------- | ------ | ----------------------------------- | --------------------------------------------- |
| `EditCloseModal`          | Modal  | "Edit" button on occurrence row     | Edit amount/date/source + choose close option |
| `SplitConfirmModal`       | Modal  | "Partial Payment" in EditCloseModal | Confirm split into paid + remaining           |
| `DeleteConfirmModal`      | Modal  | "Delete" in overflow menu           | Confirm occurrence deletion                   |
| `ReopenConfirmModal`      | Modal  | "Reopen" button on closed row       | Confirm reopening                             |
| `OccurrenceDetailsDrawer` | Drawer | "View Details" in overflow          | Read-only occurrence info                     |

## Complexity Tracking

No constitution violations requiring justification. Feature simplifies existing complexity rather than adding new layers.
