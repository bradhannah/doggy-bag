# Implementation Plan: UI Polish & UX Improvements

**Branch**: `004-ui-polish-ux` | **Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-ui-polish-ux/spec.md`

## Summary

This feature consolidates 12 UI/UX improvements including window size persistence, responsive layout fixes (eliminating horizontal scrollbar), category visual states (crossed out when complete/empty, sorted to bottom), credit card payoff balance sync workflow, navigation reorganization, and developer tooling for generating anonymized example data.

**Technical Approach**: 
- Window size persistence via Tauri window events and plugin-store
- Responsive layout via CSS container queries with overflow detection
- Category states via computed properties and sorting in Svelte stores
- CC payoff sync via modal component with API integration
- Compact mode persistence using existing settings store pattern

## Technical Context

**Language/Version**: TypeScript (strict mode), Svelte 4.x, Rust (Tauri 2.x)
**Primary Dependencies**: Tauri 2.x, @tauri-apps/plugin-store, @tauri-apps/api (window, path), Bun 1.x
**Storage**: Tauri Store (settings.json for preferences), Local JSON files (data/entities/, data/months/)
**Testing**: Manual testing via `make dev`, curl for API endpoints
**Target Platform**: macOS, Windows, Linux (Tauri desktop app)
**Project Type**: Desktop application with embedded web frontend + Bun sidecar backend
**Performance Goals**: Window restore < 500ms, category state updates < 100ms, no horizontal scrollbar
**Constraints**: Bundle size < 10MB (excluding Bun sidecar), offline-capable
**Scale/Scope**: Single user, ~100 bills/incomes, ~12 months of data

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. User-Centric Simplicity | ✅ PASS | All changes reduce friction and improve daily usability |
| II. Test-First Development | ⚠️ PARTIAL | Manual testing for UI changes; script testing for data generation |
| VI. Build and Run Locality | ✅ PASS | No cloud dependencies; all local storage |
| VIII. Local File Storage | ✅ PASS | Settings via Tauri Store, data in local JSON |
| X. Avoid Silly Libraries | ✅ PASS | Using native Tauri APIs, no new dependencies |
| XI. Makefiles for Automation | ✅ PASS | Existing `make dev` workflow sufficient |
| XVIII. Tauri Desktop Shell | ✅ PASS | Using Tauri window APIs for size persistence |
| XIX. SvelteKit Frontend | ✅ PASS | Svelte components, scoped CSS |
| XX. Component Structure | ✅ PASS | Single concern per component |
| XXI. Reactive Declarations | ✅ PASS | Using Svelte stores for state |
| XXIII. Styling via Scoped CSS | ✅ PASS | All styles in component `<style>` blocks |
| XXIV. No External UI Libraries | ✅ PASS | Custom modal, native elements |
| XXV. Tauri IPC Integration | ✅ PASS | Using @tauri-apps/api for window management |
| XXVII. Backend Testing | ✅ PASS | Will test API endpoints with curl |
| XXVIII. Developer Time | ✅ PASS | All changes are localized and testable |

**Gate Result**: ✅ PASS - All principles satisfied or justified.

## Project Structure

### Documentation (this feature)

```text
specs/004-ui-polish-ux/
├── plan.md              # This file
├── research.md          # Phase 0 output - Tauri window APIs, CSS overflow detection
├── data-model.md        # Phase 1 output - WindowState, UserPreferences
├── quickstart.md        # Phase 1 output - Testing instructions
├── contracts/           # Phase 1 output - API contracts for CC sync
│   └── cc-balance-sync.md
└── checklists/
    └── requirements.md  # Already created
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── Navigation.svelte           # Modified: reorder nav, move Settings to footer
│   ├── DetailedView/
│   │   ├── DetailedMonthView.svelte  # Modified: remove header leftover, scroll handling
│   │   ├── CategorySection.svelte    # Modified: crossed out states, sorting
│   │   ├── SummarySidebar.svelte     # Modified: green header, remove net worth
│   │   ├── BillRow.svelte            # Modified: hide delete for CC payoffs
│   │   └── CCBalanceSyncModal.svelte # NEW: sync modal for CC payoff payments
│   └── shared/
│       └── Modal.svelte              # May reuse existing drawer pattern
├── stores/
│   ├── settings.ts                   # Modified: add compactMode persistence
│   └── ui.ts                         # Modified: add window size handling (Tauri)
├── routes/
│   └── +layout.svelte                # Modified: window resize event handlers

src-tauri/
├── src/
│   └── lib.rs                        # Modified: window size save/restore on close/open
└── capabilities/
    └── default.json                  # May need window permissions

api/
├── src/
│   ├── routes/
│   │   └── handlers/
│   │       └── months.ts             # Modified: CC balance sync endpoint
│   └── services/
│       └── months-service.ts         # Modified: updatePaymentSourceBalance method

scripts/
└── generate-example-data.ts          # NEW: anonymize data script
```

**Structure Decision**: Uses existing Tauri + Svelte + Bun backend structure. No new projects needed.

## Complexity Tracking

> No violations requiring justification. All changes use existing patterns and technologies.

| Aspect | Complexity | Justification |
|--------|------------|---------------|
| Window size persistence | Low | Standard Tauri window API |
| Responsive layout | Medium | CSS container queries + overflow detection |
| Category sorting | Low | Computed property in Svelte |
| CC sync modal | Medium | New modal + API endpoint |
| Data scrubbing script | Low | Standalone TypeScript script |
