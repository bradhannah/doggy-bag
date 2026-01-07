# Feature Specification: Misc Fixes Round 2

**Feature Branch**: `010-misc-fixes-round-2`  
**Created**: 2026-01-06  
**Status**: In Progress  
**Input**: User description: "Hodge podge of changes - app rename, nav reorganization, UI improvements"

## Tasks Overview

| #   | Task                                                                               | Complexity |
| --- | ---------------------------------------------------------------------------------- | ---------- |
| 1   | Fix TypeScript errors                                                              | Small      |
| 2   | Rename "Budget Config" → "Manage"                                                  | Small      |
| 3   | Change Savings icon to "$"                                                         | Small      |
| 4   | Move "Manage Months" into Manage page as first tab, delete `/manage` route         | Medium     |
| 5   | Rename app to "Doggy Bag"                                                          | Large      |
| 6   | Move refresh/sizing buttons to MonthPickerHeader, add refresh to Dashboard/Savings | Medium     |

---

## Task 1: Fix TypeScript Errors

### Current Errors

- `api/src/types/index.ts` - Missing `UndoEntry`, `UndoEntityType` exports
- `api/src/routes/handlers/seed.handlers.ts` - Missing `category_id` in bill/income seed data
- `src/stores/ui.ts` - Missing `hidePaidItems` export

### Acceptance Criteria

- All TypeScript errors resolved
- `make test` passes

---

## Task 2: Rename "Budget Config" → "Manage"

### Files to Modify

- `src/components/Navigation.svelte` - Change label and title

### Acceptance Criteria

- Nav item displays "Manage" instead of "Budget Config"

---

## Task 3: Change Savings Icon to "$"

### Files to Modify

- `src/components/Navigation.svelte` - Replace bookmark SVG with dollar sign SVG

### Acceptance Criteria

- Savings nav item shows "$" icon

---

## Task 4: Move "Manage Months" into Manage Page

### Changes Required

1. Remove "Manage Months" nav item from `Navigation.svelte`
2. Add "Months" tab to `SetupPage.svelte` as first tab
3. Integrate Manage Months content into SetupPage
4. Delete `/manage` route entirely

### Tab Order in Manage Page

1. Months (new - from old Manage Months)
2. Bills
3. Incomes
4. Payment Sources
5. Categories

### Acceptance Criteria

- "Manage Months" no longer appears in sidebar
- "Manage" page has Months as first tab
- All Manage Months functionality works in new location
- `/manage` route deleted

---

## Task 5: Rename App to "Doggy Bag"

### Files to Modify (~35 files)

#### Package Config

- `package.json` - name: `doggy-bag`
- `api/package.json` - name: `doggy-bag-api`, description update

#### Tauri Config

- `src-tauri/tauri.conf.json` - productName: `DoggyBag`, identifier: `com.bradhannah.doggybag`
- `tauri-test.conf.json` - similar updates
- `src-tauri/Cargo.toml` - crate name: `doggybag`

#### Rust Code

- `src-tauri/src/lib.rs` - Default path: `~/Documents/DoggyBag`

#### HTML/UI

- `src/app.html` - `<title>Doggy Bag</title>`
- `src/components/Navigation.svelte` - App title, backup filename
- `src/routes/+layout.svelte` - Loading message
- `src/routes/settings/+page.svelte` - Backup filename, suggested paths

#### Stores (localStorage keys)

- `src/stores/ui.ts` - `doggy-bag-*` prefix
- `src/stores/settings.ts` - `doggy-bag-*` prefix

#### API

- `api/openapi/swagger.json` - API title/description
- `api/src/types/index.ts` - Comment header

#### CI/CD

- `.github/workflows/release.yml` - Bundle name, DMG filename

#### Tests

- `src/stores/settings.test.ts` - Update fixtures
- `src/stores/ui.test.ts` - Update fixtures

#### Docs

- `README.md`, `AGENTS.md`, etc.

### Acceptance Criteria

- All UI shows "Doggy Bag"
- Default data directory: `~/Documents/DoggyBag`
- Backup files named `doggy-bag-backup-*.json`
- App builds with new identifiers
- All tests pass

---

## Task 6: Move Refresh/Sizing Buttons to Header

### Current State

- `MonthPickerHeader.svelte` - Month selector only
- `DetailedMonthView.svelte` - Has width, compact, hide-paid, refresh buttons
- Dashboard/Savings - No refresh button

### Target State

- `MonthPickerHeader.svelte` - Accepts optional control props
- Control buttons appear in header bar (right side)
- Dashboard and Savings get refresh button

### Props to Add to MonthPickerHeader

- `showRefresh?: boolean`
- `showWidthToggle?: boolean`
- `showCompactToggle?: boolean`
- `showHidePaid?: boolean`
- `onRefresh?: () => void`

### Acceptance Criteria

- All control buttons moved to header row
- Dashboard has refresh button
- Savings has refresh button
- Details page has all 4 buttons in header

---

## Success Criteria

- **SC-001**: All TypeScript errors resolved, tests pass
- **SC-002**: Navigation shows "Manage" with Months as first tab inside
- **SC-003**: Savings icon is "$" symbol
- **SC-004**: App displays "Doggy Bag" everywhere
- **SC-005**: Refresh button available on Dashboard, Details, and Savings pages
- **SC-006**: All sizing controls in header bar on Details page
