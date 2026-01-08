# Tasks: Miscellaneous Fixes Round 3

**Branch**: `011-misc-fixes-round-3` | **Date**: 2026-01-07 | **Spec**: [spec.md](./spec.md)

## Phase 1: Quick Win + Theme Foundation

### US1: Remove Dashboard Link

- [ ] T001 Remove `<a href="/" class="back-link">` from `src/components/Setup/SetupPage.svelte`
- [ ] T002 Remove associated `.back-link` CSS styles
- [ ] T003 Verify header displays: `Manage [spacer] [Load Defaults]`

### US6 Part 1: Theme Infrastructure

- [ ] T004 Create `src/lib/theme/types.ts` - Theme interface, color keys
- [ ] T005 Create `src/lib/theme/defaults.ts` - Default color values, required keys
- [ ] T006 Create `src/lib/theme/validator.ts` - Validate theme JSON
- [ ] T007 Create `src/lib/theme/loader.ts` - Load and merge with defaults
- [ ] T008 Create `src/lib/theme/applier.ts` - Apply theme to DOM (CSS variables)
- [ ] T009 Create `src/lib/theme/index.ts` - Public API exports
- [ ] T010 Create `themes/dark.json` - Built-in dark theme
- [ ] T011 Create `themes/light.json` - Built-in light theme
- [ ] T012 Create `src/stores/theme.ts` - Svelte store with persistence
- [ ] T013 Update `src/routes/+layout.svelte` - Initialize theme on load
- [ ] T014 Verify theme applies without breaking existing styles

**Checkpoint:** Theme system functional, app still looks correct in dark mode

---

## Phase 2: Version Backup System

### US2: Backend Implementation

- [ ] T015 Sync APP_VERSION - read from central source or env var
- [ ] T016 Create `data/version.json` schema and read/write functions
- [ ] T017 Add `listBackups()` method to BackupService
- [ ] T018 Add `createVersionBackup(oldVersion, newVersion)` method
- [ ] T019 Add `restoreBackup(backupId)` method
- [ ] T020 Add `deleteOldBackups(keepCount)` method - retain last 5
- [ ] T021 Add version check on API startup - create backup if changed
- [ ] T022 Create backup API endpoints: `GET /api/backups`, `POST /api/backups/:id/restore`
- [ ] T023 Write tests for backup service methods

### US2: Settings UI

- [ ] T024 Add "Version Backups" section to Settings page
- [ ] T025 Display list of backups (version transition, date, entity counts)
- [ ] T026 Add Restore button per backup
- [ ] T027 Create restore confirmation modal with contents summary
- [ ] T028 Handle restore success/error states
- [ ] T029 Show empty state when no backups exist

**Checkpoint:** Backups created on version change, can restore from Settings

---

## Phase 3: Metadata Fields

### US3: Bill/Income Metadata

- [ ] T030 Add fields to Bill interface: `bank_transaction_name`, `account_number`, `account_url`, `notes`
- [ ] T031 Add fields to Income interface: same 4 fields
- [ ] T032 Update frontend Bill type in `src/types/api.ts`
- [ ] T033 Update frontend Income type in `src/types/api.ts`
- [ ] T034 Add metadata inputs to `src/components/Setup/BillForm.svelte`
- [ ] T035 Add metadata inputs to `src/components/Setup/IncomeForm.svelte`
- [ ] T036 Update `src/components/Setup/BillsListByCategory.svelte` - display metadata
- [ ] T037 Update `src/components/Setup/IncomesListByCategory.svelte` - display metadata
- [ ] T038 Create notes modal/popover component
- [ ] T039 Add clickable URL with ↗ icon (opens in browser)

### US4: Payment Source Metadata

- [ ] T040 Add fields to PaymentSource interface (8 fields)
- [ ] T041 Update frontend PaymentSource type
- [ ] T042 Add conditional field visibility logic to PaymentSourceForm
- [ ] T043 Add metadata inputs to `src/components/Setup/PaymentSourceForm.svelte`
- [ ] T044 Update `src/components/Setup/PaymentSourcesList.svelte` - display metadata
- [ ] T045 Test conditional fields for each payment source type

**Checkpoint:** All metadata fields working, displayed in config lists

---

## Phase 4: Section Headers with Stats

### US5: Section Headers

- [ ] T046 Create `calculateBillStats()` helper in DetailedMonthView
- [ ] T047 Create `calculateIncomeStats()` helper in DetailedMonthView
- [ ] T048 Add stats header component for Bills section
- [ ] T049 Add stats header component for Income section
- [ ] T050 Style progress bars with scoped CSS
- [ ] T051 Verify stats update when items are closed/paid
- [ ] T052 Add tests for stats calculation

**Checkpoint:** Section headers show progress at a glance

---

## Phase 5: Color Migration + Light Mode

### US6 Part 2: Color Migration

- [ ] T053 Create color consolidation tracking document
- [ ] T054 Migrate `src/routes/+layout.svelte` to CSS variables
- [ ] T055 Migrate `src/components/Navigation.svelte`
- [ ] T056 Migrate `src/components/Setup/*.svelte` components
- [ ] T057 Migrate `src/components/DetailedView/*.svelte` components
- [ ] T058 Migrate `src/components/Dashboard/*.svelte` components
- [ ] T059 Migrate `src/routes/settings/+page.svelte`
- [ ] T060 Migrate `src/routes/savings/+page.svelte`
- [ ] T061 Migrate remaining components
- [ ] T062 Remove `setup-styles.css` variables (consolidated into theme)

### US6 Part 3: Light Mode

- [ ] T063 Complete `themes/light.json` with all color values
- [ ] T064 Add theme toggle UI to Settings page
- [ ] T065 Test light mode on all pages
- [ ] T066 Adjust light mode colors for readability if needed
- [ ] T067 Create `docs/colour-themes.md` documentation

**Checkpoint:** Light mode working, colors consolidated

---

## Phase 6: Polish

- [ ] T068 Review color changes with user
- [ ] T069 Apply any color tweaks requested
- [ ] T070 Run full test suite
- [ ] T071 Manual smoke test all pages in both themes
- [ ] T072 Final commit and PR preparation

---

## Color Consolidation Tracking

| Original Color | New Variable       | Files Affected | Notes |
| -------------- | ------------------ | -------------- | ----- |
| `#0f0f1a`      | `--bg-base`        | TBD            |       |
| `#1a1a2e`      | `--bg-surface`     | TBD            |       |
| `#16213e`      | `--bg-surface`     | TBD            | Shift |
| `#e4e4e7`      | `--text-primary`   | TBD            |       |
| `#888888`      | `--text-secondary` | TBD            |       |
| `#24c8db`      | `--accent`         | TBD            |       |
| `#333355`      | `--border-default` | TBD            |       |
| `#4ade80`      | `--success`        | TBD            |       |
| `#f87171`      | `--error`          | TBD            |       |
| `#f59e0b`      | `--warning`        | TBD            |       |

_Full tracking to be updated during Phase 5_
