# Research: Monthly Budget Tracker

**Feature**: [spec.md](./spec.md)
**Date**: 2025-12-29

---

## Summary

This document captures technical decisions made during the planning phase for the Monthly Budget Tracker feature. All decisions align with the [BudgetForFun Constitution](../../.specify/memory/constitution.md).

---

## Technical Stack Decisions

### Frontend Framework: Svelte + Tauri

**Decision**: Use Svelte for frontend UI with Tauri for desktop shell

**Rationale**:
- Constitution principle XVIII explicitly requires "Tauri + Svelte"
- Svelte compiles to vanilla JS (no runtime dependency) meeting constitution principle XIX
- Vite is the Svelte default build tool (principle XIX)
- Bundle size target <100KB gzipped including CSS (principle XIX)
- No external UI component libraries (principle XXIV)
- One concern per component structure (principle XX)

**Alternatives Considered**:
- React + Tauri: Rejected (principle XIX explicitly says "not React, Vue, or vanilla JS")
- Vue + Tauri: Rejected (principle XIX explicitly prohibits Vue)
- Vanilla JS + Tauri: Rejected (principle XIX explicitly prohibits vanilla JS)

---

### Backend Runtime: Bun

**Decision**: Use Bun runtime for HTTP server and test runner

**Rationale**:
- Constitution principle XVI explicitly requires "Bun (native TypeScript support)"
- Native TypeScript support without build step (principle XVI)
- bun.serve() for HTTP server (principle XVI)
- localhost:3000 for internal IPC only (principle XVI)
- No build step for development (principle XVI)

**Alternatives Considered**:
- Node.js: Rejected (constitution requires Bun)
- Deno: Rejected (constitution requires Bun)
- Python with FastAPI: Rejected (constitution principle XVI requires Bun)

---

### Storage: Local JSON Files

**Decision**: Store all data as local JSON files (no database)

**Rationale**:
- Constitution principle VIII explicitly requires local file storage
- "It does not need be aware of these services [cloud sync] - it will only know directories on disk"
- Simple, portable, no database dependencies
- JSON is human-readable for user-owned backups (FR-036)
- Automatic JSON writes are silent (backend transparency principle XVII)

**Alternatives Considered**:
- SQLite/PostgreSQL: Rejected (constitution principle VIII says "only know directories on disk")
- IndexedDB/LocalStorage: Rejected (too browser-specific, not suitable for Tauri)
- Redis/Memory store: Rejected (data persistence requirement)

---

### Project Structure: Tauri + Svelte + Bun

**Decision**: Three-process architecture with src-tauri/ (Rust), api/ (Bun), src/ (Svelte)

**Rationale**:
- Tauri provides desktop shell (principle XVIII)
- Bun backend for HTTP IPC communication (principle XVI, XVII)
- Svelte frontend for UI (principle XIX)
- Clear separation of concerns (principle XXII)
- Local-only execution (principle VI, XV)

**Alternatives Considered**:
- Single Bun process (no Tauri): Rejected (constitution requires Tauri desktop shell)
- Electron + Node.js: Rejected (constitution principle XVIII requires Tauri, principle VI prohibits web containers)
- Native-only (no web tech): Rejected (constitution VI and XVIII require web frameworks in local container)

---

## Data Model Decisions

### Entity Structure: Separate Default Definitions vs Monthly Instances

**Decision**: Store default bill/income definitions separately from monthly instances

**Rationale**:
- Constitution principle I: "Flexibility First" - users can edit any value in any month without tightly coupling back to defaults
- User Story 6: Generate Month With Flexible Editing
- FR-013: "allow users to edit individual bill/income instances for a specific month without changing default definitions"
- FR-014: "clearly indicate which values are defaults vs month-specific edits"

**Implementation Approach**:
- `data/entities/bills.json`: Default bill definitions (name, amount, billing period, payment source, category)
- `data/entities/incomes.json`: Default income source definitions
- `data/entities/payment-sources.json`: Payment source configurations
- `data/months/YYYY-MM.json`: Monthly instances (copy from defaults but independently editable)
- Flag each instance as `is_default: true/false` to track deviation

**Alternatives Considered**:
- Tightly coupled (edit default updates all instances): Rejected (violates flexibility principle)
- No defaults (copy previous month): Rejected (spec requires generation from defaults, not copy-paste)

---

### Billing Period Handling

**Decision**: Support monthly, bi-weekly, weekly, and semi-annually billing periods

**Rationale**:
- FR-010: "support different billing periods: monthly, bi-weekly, weekly"
- FR-004: Handle bi-weekly/weekly correctly when generating months
- User Story 1/2 explicitly mention billing periods
- Definition from spec: "Bi-weekly is once every two weeks on a given day of the week (~2.17 instances per month)"

**Implementation Approach**:
- Monthly: 1 instance per month
- Bi-weekly: ~2.17 instances per month (every 2 weeks on given day)
  - Example: If bill is every Friday, then February 2025 has 2 instances (Feb 7, Feb 21)
  - Pro-rate for partial months (e.g., January starts mid-week)
- Weekly: ~4.33 instances per month (every 7 days)
  - Example: If bill is every Monday, then February 2025 has 4 instances (Feb 3, 10, 17, 24)
- Semi-annually: 0 or 2 instances depending on month (twice per year)

**Alternatives Considered**:
- Only monthly: Rejected (spec requires bi-weekly/weekly)
- Fixed 2/4 instances for bi-weekly/weekly: Rejected (spec defines ~2.17/~4.33)
- No billing periods (user enters each instance manually): Rejected (violates FR-004)

---

### Multi-Payment Source Calculation

**Decision**: Calculate "leftover" using formula: (sum of all bank balances + cash) - credit card debt + total income - total expenses

**Rationale**:
- FR-006: "calculate and display 'leftover at end of month' using formula: bank balance(s) + total income - total expenses"
- User Story 3 acceptance scenarios show multi-payment-source examples
- Payment source entity definition: "Total cash/net worth = sum of all bank account balances + cash - credit card debt"
- Excel example shows multiple payment sources (Scotia, Visa, Chantale, Cash)

**Implementation Approach**:
- Sum all payment sources with positive balances (bank accounts, cash)
- Sum all payment sources with negative balances (credit card debt)
- "Leftover" = (positive balances sum) + (negative balances sum) + total income - (bills + variable + free-flowing)
- Display breakdown by payment source in summary (FR-027)

**Alternatives Considered**:
- Use single account only: Rejected (spec requires multiple payment sources, FR-008)
- Net only (ignore cash): Rejected (spec includes cash as payment source)
- Gross only (ignore debt): Rejected (spec includes credit card debt in calculation)

---

### Undo Stack Implementation

**Decision**: Maintain undo history of previous 5 changes (LIFO - last in, first out)

**Rationale**:
- FR-033: "maintain a history of most recent 5 changes"
- FR-034: "allow users to undo most recent change (LIFO - last in, first out)"
- User Story 9: Undo Changes
- Constitution principle I: "Users should never fear making a mistake"

**Implementation Approach**:
- Store undo stack in Svelte store or local file
- Each change includes: entity type, entity ID, old value, new value, timestamp
- Max 5 changes (older changes discarded)
- LIFO order for undo (most recent undone first)
- Clear undo stack when app closes (or persist - decide in tasks phase)

**Alternatives Considered**:
- Infinite undo history: Rejected (FR-033 specifies "most recent 5")
- Selective undo: Rejected (FR-034 says "LIFO - last in, first out")
- Redo functionality: Not in scope (FR-034, spec doesn't mention)

---

## UI/UX Decisions

### Month Navigation: Year Selector (Top Left) + Month Selector (Side-by-Side)

**Decision**: Use native pickers if available on platform

**Rationale**:
- FR-031: "display month navigation with a year selector (top left) and month selector (side-by-side)"
- FR-032: "use native pickers for year and month selection if available on platform"
- User Story 7 acceptance scenarios require month selector
- Native pickers feel more "desktop-app-like" than custom dropdowns

**Implementation Approach**:
- Desktop platforms (macOS, Windows): Use native <select> or <input type="date"> with month/year selection
- If platform provides native date picker (macOS NSComboBox, Windows DatePicker), use it
- Otherwise, fallback to custom dropdowns
- Top-left: Year selector (2024, 2025, 2026...)
- Side-by-side: Month selector (January, February, March...) or month arrows

**Alternatives Considered**:
- Top-left year, top-left month: Rejected (FR-031 specifies "side-by-side" for month)
- Single month/year picker: Rejected (FR-031 specifies separate year and month selectors)
- Custom dropdowns only: Rejected (FR-032 prefers native pickers if available)

---

### Direct Value Entry (No Modals)

**Decision**: Allow direct entry in primary interface without opening modal dialogs

**Rationale**:
- FR-026 removed "generally" (now requires no modals)
- Constitution principle I: Users should be able to enter values without opening modal dialogs
- Reduces friction, faster data entry
- Simpler to implement (no modal state management)

**Implementation Approach**:
- Inline editing in list view (click field, type, press Enter/Tab)
- Quick-add buttons or inline forms
- Only use modals for complex multi-field entities (e.g., full bill setup with all fields)
- Inline validation with immediate error feedback

**Alternatives Considered**:
- Modal-based entry for all: Rejected (FR-026 prohibits this)
- Separate edit pages: Rejected (violates direct entry principle, harder to navigate)

---

## Integration Decisions

### IPC Communication: Bun HTTP Server + Tauri Commands

**Decision**: Use Bun HTTP server (bun.serve()) on localhost:3000 for IPC

**Rationale**:
- Constitution principle XVI: "bun.serve() for HTTP server" and "Port: localhost:3000 (internal IPC only)"
- Constitution principle XVIII: "IPC: Communicates with Bun backend over localhost HTTP"
- Constitution principle XVII: "All data flow is automatic and invisible"
- Frontend fetches data via fetch() calls to localhost:3000

**Implementation Approach**:
- Backend: Bun server with endpoints for data CRUD, calculations, undo operations
- Frontend: fetch() calls to http://localhost:3000/api/*
- Tauri: Window lifecycle, file access (data write/read for backup/export)
- No user-facing terminal or server logs (principle XVII)

**Alternatives Considered**:
- Tauri events for all communication: Rejected (constitution requires HTTP IPC)
- Direct file access from Svelte: Rejected (violates XVII backend transparency - would be visible to frontend)
- External HTTP server: Rejected (must be localhost only per constitution)

---

## Testing Decisions

### Test Runner: Bun (Backend) + Jest (Frontend) + Playwright (E2E)

**Decision**: Use Bun test runner for backend, Jest for frontend unit/integration tests, Playwright for end-to-end tests

**Rationale**:
- Constitution principle XVI: Bun runtime for backend with native TypeScript support
- Constitution principle XI: Automated testing with clear expectations
- Jest is mature ecosystem for Svelte/Vite frontend testing
- Playwright is modern E2E framework with cross-browser support
- Separation allows using right tool for each testing concern

**Implementation Approach**:
- **Backend Tests**: Use `bun test` command
  - Test files: `api/tests/unit/`, `api/tests/integration/`, `api/tests/contract/`
  - Contract tests verify API behavior per OpenAPI spec
  - Integration tests verify data persistence, calculation logic, undo functionality
  - Unit tests verify models, services, utilities
- **Frontend Unit/Integration Tests**: Use Jest with Svelte Testing Library
  - Test files: `src/tests/unit/`, `src/tests/integration/`
  - Unit tests verify Svelte components in isolation
  - Integration tests verify component interactions and store behavior
- **E2E Tests**: Use Playwright
  - Test files: `tests/e2e/`
  - Full user journey tests (onboarding, bill management, "leftover" calculation)
  - Cross-browser testing (Chromium, Firefox, WebKit)
- **Test Coverage**: Aim for 80%+ coverage on critical paths (bills, incomes, payments, "leftover" calculation)
- **Makefile Target**: `make test` runs all test suites (Bun + Jest + Playwright)

**Alternatives Considered**:
- Bun for all tests: Rejected (Jest has better Svelte/Vite integration, Playwright has better E2E support)
- Vitest: Rejected (Jest ecosystem is more mature for Svelte)
- Cypress: Rejected (Playwright has better cross-browser support and faster test execution)

---

## Build Automation

### Makefile for Automation

**Decision**: Use Makefile for build, dev, test, lint, format, clean targets

**Rationale**:
- Constitution principle XI: "The application build, test and quality assurance processes will be automated using Makefiles"
- Constitution principle XI: "Ensures consistency, reduces manual errors, and improves efficiency"
- Single command for common operations

**Implementation Approach**:
- `make build`: Build Tauri app for current platform
- `make dev`: Start development server (Bun + Vite + Tauri dev)
- `make test`: Run Bun test suite
- `make lint`: Run linter and type checker
- `make format`: Format code
- `make clean`: Clean build artifacts

**Alternatives Considered**:
- npm scripts: Rejected (constitution XI requires Makefiles)
- Custom build script: Rejected (less discoverable, not standard)

---

## Best Practices Researched

### Svelte State Management: Stores Over External Libraries

**Decision**: Use Svelte stores for global state, not Redux/Pinia

**Rationale**:
- Constitution principle XXI: "NO Redux, Pinia, or external state libraries"
- Constitution principle XX: "Store integration (Svelte stores) for global UI state only"
- Simpler, less code
- Native to Svelte ecosystem

**Implementation Approach**:
- `stores/bills.ts`: Bills store (default definitions, instances)
- `stores/incomes.ts`: Incomes store
- `stores/payment-sources.ts`: Payment sources store
- `stores/expenses.ts`: Variable and free-flowing expenses store
- `stores/undo.ts`: Undo stack
- `stores/ui.ts`: UI state (current month, navigation)

**Alternatives Considered**:
- Redux: Rejected (constitution XXI explicitly prohibits)
- Pinia: Rejected (constitution XXI explicitly prohibits)
- Zustand/Jotai: Rejected (external library, violates constitution XXI)

---

### CSS: Scoped Styles Only, No Frameworks

**Decision**: Use scoped CSS in <style> blocks, no Tailwind/Bootstrap

**Rationale**:
- Constitution principle XXIII: "Scoped styles in <style> blocks (CSS is component-local by default)"
- Constitution principle XXIII: "NO Tailwind, Bootstrap, or utility CSS frameworks"
- Constitution principle XXIV: "NO Material-UI, shadcn/ui, Headless UI, or component libraries"

**Implementation Approach**:
- Scoped styles in each Svelte component (<style>)
- CSS variables for theming in root component (app.html)
- Mobile-first responsive design (media queries)
- Consistent spacing, colors, typography via CSS custom properties

**Alternatives Considered**:
- Tailwind CSS: Rejected (constitution XXIII explicitly prohibits)
- Bootstrap: Rejected (constitution XXIII explicitly prohibits)
- Global CSS: Rejected (violates scoped styles principle)

---

## Architecture Patterns

### Component Structure: Single Responsibility

**Decision**: One concern per component (BudgetForm, TransactionList, CategorySelector, etc.)

**Rationale**:
- Constitution principle XX: "One concern per component"
- Constitution principle XXVI: "Single responsibility per component"
- Props for data input, events for data output (principle XX)
- Reactive declarations ($:) for derived state (principle XX)

**Implementation Approach**:
- `components/Setup/`: Onboarding flow (Setup page)
- `components/Dashboard/`: Summary view, "leftover" calculation
- `components/Bills/`: Bill management (list, add, edit, delete)
- `components/Incomes/`: Income source management
- `components/PaymentSources/`: Payment source management
- `components/Expenses/`: Variable and free-flowing expense tracking
- `components/shared/`: Reusable components (forms, inputs, modals)
- Each component focused on single concern (e.g., BillList displays bills, BillForm adds/edits bill)

**Alternatives Considered**:
- Monolithic components: Rejected (violates single responsibility principle)
- Complex multi-concern components: Rejected (violates principle XX)

---

## Open Questions / Deferred Decisions

### Default Color Scheme Values

**Decision**: DEFER to user to fill in

**Rationale**:
- Spec includes "Visual Design Requirements" section with placeholders: `[TO BE FILLED IN BY USER]`
- User needs to provide actual color values (backgrounds, text, accents, indicators)
- Don't get distracted by color customization early (constitution principle: "Get to MVP working first")

**Action Required**: User must fill in color values in spec.md before implementation

---

## Best Practices for Domain

### Budgeting Domain

**Patterns Identified**:
- Bi-weekly billing = "every two weeks on a given day of the week" (~2.17 instances/month)
- Weekly billing = "every seven days" (~4.33 instances/month)
- Semi-annually = "twice per year" (0-2 instances/month depending)
- Total cash/net worth = sum of all bank account balances + cash - credit card debt
- "Leftover" calculation = (bank balances + cash - credit card debt) + income - expenses

**Common Pitfalls to Avoid**:
- Fixed 2/4 instances for bi-weekly/weekly (use pro-rate for partial months)
- Tightly coupling defaults to instances (use "is_default" flag to track)
- Ignoring credit card debt in calculations (negative balances subtract from total)
- Complex "budget summary" views (keep it simple: "how much money do I have left?")

---

## No [NEEDS CLARIFICATION] Markers Remaining

All technical decisions have been made based on:
- Constitution requirements
- Feature specification
- User requirements
- Best practices for the domain

No items require further research or clarification. Phase 0 is complete.
