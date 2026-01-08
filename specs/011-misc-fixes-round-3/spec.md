# Feature Specification: Miscellaneous Fixes Round 3

**Feature Branch**: `011-misc-fixes-round-3`  
**Created**: 2026-01-07  
**Status**: In Progress

## Summary

A collection of UI improvements, data safety features, and metadata enhancements:

1. Remove Dashboard link from Manage page
2. Version-based backup system with restore UI
3. Bill/Income metadata fields
4. Payment Source metadata fields (conditional by type)
5. Section Headers with Stats (remaining from 008)
6. Light Mode + Reusable Theme System

---

## User Stories

### US1 - Remove Dashboard Link from Manage (Priority: Low)

**As a** user on the Manage page  
**I want** the redundant "← Dashboard" link removed  
**So that** the UI is cleaner (sidebar already has Dashboard link)

**Acceptance Criteria:**

- Header shows: `Manage [spacer] [Load Defaults]`
- No "← Dashboard" link visible on Manage page

**Files:** `src/components/Setup/SetupPage.svelte` (line 419)

---

### US2 - Version-Based Backup on Startup (Priority: Medium)

**As a** user upgrading the app  
**I want** automatic backups created before any data changes  
**So that** I can restore my data if something goes wrong

**Acceptance Criteria:**

1. On app startup, detect if version changed (compare `version.json` with current app version)
2. If version changed, create backup using existing `BackupService.exportBackup()`
3. Store backup in `data/backups/v{old}_to_v{new}_{timestamp}.json`
4. Keep last 5 version backups (delete oldest)
5. Skip backup on first run (no previous data)
6. Sync `APP_VERSION` with central source (`tauri.conf.json`)
7. Settings UI shows list of backups with restore button
8. Restore confirmation modal with backup contents summary

---

### US3 - Bill/Income Metadata Fields (Priority: Medium)

**As a** user managing bills and incomes  
**I want** to store additional info (bank transaction name, account number, URL, notes)  
**So that** I can easily identify and manage my accounts

**Fields (all optional):**

| Field                   | Type      | Description              |
| ----------------------- | --------- | ------------------------ |
| `bank_transaction_name` | `string?` | Name on bank statement   |
| `account_number`        | `string?` | Account/reference number |
| `account_url`           | `string?` | URL to manage/pay        |
| `notes`                 | `string?` | Freeform notes           |

**Acceptance Criteria:**

1. Fields added to Bill and Income types (backend + frontend)
2. Form inputs always visible in Bill/Income forms
3. Config list displays: transaction name, account #, shortened URL with ↗ icon
4. Notes shown via 📝 icon that opens modal/popover
5. URL clickable but not too easy to accidentally trigger

---

### US4 - Payment Source Metadata Fields (Priority: Medium)

**As a** user managing payment sources  
**I want** to store relevant metadata (last 4 digits, limits, rates, etc.)  
**So that** I have quick reference info for each account

**Fields (conditional by type):**

| Field                        | Type       | Bank | Credit Card | LOC | Savings | Investment |
| ---------------------------- | ---------- | :--: | :---------: | :-: | :-----: | :--------: |
| `last_four_digits`           | `string?`  |  ✓   |      ✓      |  ✓  |    ✓    |     ✓      |
| `credit_limit`               | `number?`  |      |      ✓      |  ✓  |         |            |
| `interest_rate`              | `number?`  |  ✓   |      ✓      |  ✓  |    ✓    |     ✓      |
| `interest_rate_cash_advance` | `number?`  |      |      ✓      |     |         |            |
| `is_variable_rate`           | `boolean?` |      |             |  ✓  |    ✓    |     ✓      |
| `statement_day`              | `number?`  |      |      ✓      |  ✓  |         |            |
| `account_url`                | `string?`  |  ✓   |      ✓      |  ✓  |    ✓    |     ✓      |
| `notes`                      | `string?`  |  ✓   |      ✓      |  ✓  |    ✓    |     ✓      |

**Acceptance Criteria:**

1. Fields added to PaymentSource type
2. Form shows conditional fields based on payment source type
3. Config list displays: last 4, limit, rate, statement day, URL
4. Notes via 📝 icon with modal

---

### US5 - Section Headers with Stats (Priority: Medium)

_Remaining from 008 spec - Phase 7_

**As a** user viewing my monthly budget  
**I want** to see summary stats at Bills/Income section headers  
**So that** I can see progress at a glance

**Acceptance Criteria:**

1. Bills section header shows: "X/Y left", $paid, $remaining, progress bar
2. Income section header shows: "X/Y received", $pending, progress bar
3. Stats update in real-time when items are closed/paid
4. Progress bar styled with scoped CSS

---

### US6 - Light Mode + Reusable Theme System (Priority: Medium)

**As a** user  
**I want** to switch between dark and light mode  
**So that** I can use the app comfortably in different environments

**Acceptance Criteria:**

1. Theme toggle in Settings: Dark / Light / System
2. Default to System (respects `prefers-color-scheme`)
3. Persist choice in localStorage
4. All pages/components properly themed
5. CSS variables for all colors (consolidated from current fragmented usage)
6. Documentation in `docs/colour-themes.md`
7. Reusable theme module in `src/lib/theme/` (framework-agnostic)
8. Theme definitions as JSON files

**Theme System Design:**

- Framework-agnostic core module (`src/lib/theme/`)
- JSON schema for themes with version for migrations
- 7 required core colors, ~18 optional with defaults
- Svelte store wraps core module for app integration
- Future-proof: extractable to npm package

---

## Implementation Phases

### Phase 1: Quick Win + Foundation

- US1: Remove Dashboard link
- US6 Part 1: Create theme infrastructure

**Checkpoint:** Theme system in place, ready for color migration

### Phase 2: Version Backup System

- US2: Full implementation

**Checkpoint:** Backups created on version change, can restore from Settings

### Phase 3: Metadata Fields

- US3: Bill/Income metadata
- US4: Payment Source metadata

**Checkpoint:** All metadata fields working, displayed in config lists

### Phase 4: Section Headers

- US5: Bills/Income section headers with stats

**Checkpoint:** Section headers show progress at a glance

### Phase 5: Color Migration + Light Mode

- US6 Part 2: Migrate all components to CSS variables
- US6 Part 3: Add light mode values
- Track color changes for review
- Create `docs/colour-themes.md`

**Checkpoint:** Light mode working, colors consolidated

### Phase 6: Polish

- Final color tweaks based on review
- Test all themes across all pages

---

## Files to Create/Modify

### New Files

- `src/lib/theme/index.ts` - Public API exports
- `src/lib/theme/types.ts` - Theme interface, schema
- `src/lib/theme/loader.ts` - Load theme from JSON/object
- `src/lib/theme/applier.ts` - Apply theme to DOM
- `src/lib/theme/defaults.ts` - Default/fallback values
- `src/lib/theme/validator.ts` - Validate theme JSON
- `src/stores/theme.ts` - Svelte store
- `themes/dark.json` - Built-in dark theme
- `themes/light.json` - Built-in light theme
- `docs/colour-themes.md` - Color documentation
- `data/version.json` - Version tracking (runtime)
- `data/backups/*.json` - Backup files (runtime)

### Modified Files

**Backend:**

- `api/src/types/index.ts` - Add metadata fields
- `api/src/services/backup-service.ts` - Version-aware methods
- `api/src/services/settings-service.ts` - Sync APP_VERSION

**Frontend:**

- `src/components/Setup/SetupPage.svelte` - Remove Dashboard link
- `src/components/Setup/BillForm.svelte` - Metadata fields
- `src/components/Setup/IncomeForm.svelte` - Metadata fields
- `src/components/Setup/PaymentSourceForm.svelte` - Conditional fields
- `src/components/Setup/BillsListByCategory.svelte` - Show metadata
- `src/components/Setup/IncomesListByCategory.svelte` - Show metadata
- `src/components/Setup/PaymentSourcesList.svelte` - Show metadata
- `src/components/DetailedView/DetailedMonthView.svelte` - Section headers
- `src/routes/settings/+page.svelte` - Theme toggle, backup UI
- `src/routes/+layout.svelte` - Apply theme
- ~50 component files for color variable migration
