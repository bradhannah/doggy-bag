# Feature Specification: Configurable Data Storage Directory

**Feature Branch**: `003-configurable-data-storage`  
**Created**: 2026-01-01  
**Status**: Draft  
**Input**: User description: "Allow users to configure where BudgetForFun stores data, enabling cloud sync (iCloud, Google Drive, Dropbox) while keeping development simple. Include a Settings page for future expansion."

## Design Vision

The Configurable Data Storage feature enables users to choose where their budget data is stored on disk. This unlocks seamless cloud sync via iCloud Drive, Google Drive, or Dropbox without the app needing any cloud-specific integration—it just reads/writes to a local directory that happens to sync.

### Design Principles

- **Invisible complexity**: The app "just works" with a sensible default; power users can customize
- **Cloud-sync friendly**: Default to `~/Documents/BudgetForFun/` which is visible and syncs with most cloud services
- **Non-destructive**: Never delete or overwrite data without explicit user confirmation
- **Dev/Prod separation**: Development uses `./api/data`, production uses user-configurable path

---

## Visual Wireframes

### Wireframe 1: Settings Page (Main View)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back                              SETTINGS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DATA STORAGE                                                               │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  Data Directory                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ~/Documents/BudgetForFun                               [ Browse ] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Tip: Place in iCloud Drive, Google Drive, or Dropbox for auto-sync        │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  BACKUP & RESTORE                                                           │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  [ Export Backup ]     [ Import Backup ]                                    │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  APPEARANCE  (future)                                                       │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  Theme:  ( ) Dark   ( ) Light   ( ) System                (coming soon)    │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  ABOUT                                                                      │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  Version: 0.1.0                                                             │
│  Data Format: 1.0                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 2: Browse Directory Dialog (Native OS Picker)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Choose Data Directory                                              [  X  ]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  [folder] iCloud Drive                                                │ │
│  │  [folder] Documents                                                   │ │
│  │     [folder] BudgetForFun  <--                                        │ │
│  │  [folder] Google Drive                                                │ │
│  │  [folder] Dropbox                                                     │ │
│  │  [folder] Desktop                                                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Selected: ~/Documents/BudgetForFun                                         │
│                                                                             │
│                                              [ Cancel ]    [ Select ]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

*Note: This uses the native OS folder picker via Tauri's `dialog` plugin, not a custom UI.*

### Wireframe 3: Data Migration Dialog

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Move Data to New Location?                                         [  X  ]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  You're changing your data directory from:                                  │
│                                                                             │
│    FROM: ~/Documents/BudgetForFun                                           │
│    TO:   ~/iCloud Drive/BudgetForFun                                        │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  What would you like to do with your existing data?                         │
│                                                                             │
│    (*) Copy existing data to new location                                   │
│        Your data will be copied. Original stays intact.                     │
│                                                                             │
│    ( ) Start fresh (empty)                                                  │
│        New location will have empty data. Original stays intact.            │
│                                                                             │
│    ( ) Use existing data at new location                                    │
│        Only available if data already exists at the new path.               │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│                                              [ Cancel ]    [ Continue ]     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 4: Migration Progress

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Copying Data...                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                                                             │
│  [████████████████████████░░░░░░░░░░░░░░░░░░]  60%                          │
│                                                                             │
│  Copying: entities/bills.json                                               │
│                                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 5: Migration Complete

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [checkmark] Data Moved Successfully                                [  X  ]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Your data has been copied to:                                              │
│                                                                             │
│    ~/iCloud Drive/BudgetForFun                                              │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  Copied:                                                                    │
│     - 5 entity files (bills, incomes, categories...)                        │
│     - 12 month files (2025-01 through 2025-12)                              │
│                                                                             │
│  Your original data is still at:                                            │
│     ~/Documents/BudgetForFun                                                │
│     You can delete it manually once you've verified everything works.       │
│                                                                             │
│                                                            [ Done ]         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 6: Error State (Directory Not Writable)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [warning] Cannot Use This Directory                                [  X  ]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  The selected directory cannot be used:                                     │
│                                                                             │
│    /System/Library/Protected                                                │
│                                                                             │
│  Reason: Permission denied - directory is not writable                      │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  Please choose a directory where you have write permissions,                │
│  such as:                                                                   │
│    - ~/Documents/BudgetForFun                                               │
│    - ~/iCloud Drive/BudgetForFun                                            │
│    - ~/Dropbox/BudgetForFun                                                 │
│                                                                             │
│                                                            [ OK ]           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 7: Navigation (Sidebar with Settings)

```
┌────────────────────┬────────────────────────────────────────────────────────┐
│                    │                                                        │
│  BudgetForFun      │                                                        │
│  ────────────────  │                                                        │
│                    │                                                        │
│  [chart] Dashboard │                    [Main Content Area]                 │
│                    │                                                        │
│  [calendar] Jan 26 │                                                        │
│                    │                                                        │
│  [wrench] Setup    │                                                        │
│                    │                                                        │
│  ────────────────  │                                                        │
│                    │                                                        │
│  [gear] Settings <-│                                                        │
│                    │                                                        │
└────────────────────┴────────────────────────────────────────────────────────┘
```

---

## User Scenarios & Testing

### User Story 1 - Default Data Location Works Out-of-Box (Priority: P1)

User launches BudgetForFun for the first time. The app automatically uses `~/Documents/BudgetForFun/` and creates the necessary directories. User doesn't need to configure anything.

**Why this priority**: Zero-friction first run is essential. Users should immediately be able to use the app.

**Independent Test**: Can be fully tested by launching app on a fresh system and verifying data is created in the default location.

**Acceptance Scenarios**:

1. **Given** user has never run the app before, **When** user launches BudgetForFun, **Then** app creates `~/Documents/BudgetForFun/entities/` and `~/Documents/BudgetForFun/months/` directories
2. **Given** user creates a bill in the app, **When** user checks the file system, **Then** `~/Documents/BudgetForFun/entities/bills.json` contains the bill data
3. **Given** user is in development mode (via `make dev`), **When** server starts, **Then** data is stored in `./api/data/` (project-relative)

---

### User Story 2 - View and Change Data Directory (Priority: P1)

User wants to move their data to a cloud-synced folder. User opens Settings, sees current data location, clicks Browse, selects a new folder, and confirms the migration.

**Why this priority**: Core feature - without this, users cannot sync their data across devices.

**Independent Test**: Can be fully tested by changing data directory and verifying data is accessible from the new location.

**Acceptance Scenarios**:

1. **Given** user opens Settings page, **When** viewing Data Storage section, **Then** current data directory path is displayed
2. **Given** user clicks Browse button, **When** native folder picker opens, **Then** user can navigate to any writable directory
3. **Given** user selects a new directory, **When** user confirms selection, **Then** Migration Dialog appears with copy options
4. **Given** user chooses "Copy existing data", **When** migration completes, **Then** all entity and month files exist in new location

---

### User Story 3 - Copy Data During Directory Change (Priority: P1)

User changes data directory and wants to copy their existing data to the new location without losing anything.

**Why this priority**: Non-destructive data handling is critical for user trust.

**Independent Test**: Can be fully tested by performing a directory change with copy option and verifying all data is intact.

**Acceptance Scenarios**:

1. **Given** user has 5 months of budget data, **When** user copies data to new location, **Then** all 5 month files are copied
2. **Given** migration is in progress, **When** user views progress dialog, **Then** progress bar and current file name are shown
3. **Given** migration completes, **When** user views success dialog, **Then** summary shows number of files copied
4. **Given** migration completes, **When** user checks original location, **Then** original data is still intact (not deleted)

---

### User Story 4 - Settings Page Navigation (Priority: P1)

User can access Settings from the main navigation and navigate back to other areas of the app.

**Why this priority**: Settings must be discoverable and accessible.

**Independent Test**: Can be fully tested by clicking Settings in navigation and verifying the page loads correctly.

**Acceptance Scenarios**:

1. **Given** user is on Dashboard, **When** user clicks Settings in sidebar, **Then** Settings page is displayed
2. **Given** user is on Settings page, **When** user clicks Back or Dashboard, **Then** user returns to previous page
3. **Given** user is on any page, **When** user views sidebar, **Then** Settings link is visible at bottom of navigation

---

### User Story 5 - Validate Directory Before Use (Priority: P2)

App validates that the selected directory is writable before allowing it to be set as the data directory.

**Why this priority**: Prevents confusing errors when user selects a read-only or protected location.

**Independent Test**: Can be fully tested by attempting to select a read-only directory.

**Acceptance Scenarios**:

1. **Given** user selects a directory, **When** app checks permissions, **Then** write test is performed before accepting
2. **Given** user selects a read-only directory, **When** validation fails, **Then** error dialog shows reason and suggestions
3. **Given** user selects a valid directory, **When** validation passes, **Then** migration dialog proceeds normally

---

### User Story 6 - Use Existing Data at New Location (Priority: P2)

User has data already in a folder (e.g., synced from another device) and wants to use that data without copying.

**Why this priority**: Essential for multi-device sync workflows.

**Independent Test**: Can be fully tested by pointing app to a folder with existing valid data.

**Acceptance Scenarios**:

1. **Given** user selects a directory that already contains `entities/bills.json`, **When** migration dialog appears, **Then** "Use existing data" option is available
2. **Given** user chooses "Use existing data", **When** app loads, **Then** existing bills, incomes, and months are displayed
3. **Given** new location has no existing data, **When** migration dialog appears, **Then** "Use existing data" option is disabled/hidden

---

### User Story 7 - Start Fresh at New Location (Priority: P3)

User wants to start with empty data at a new location (e.g., for testing or separate budget).

**Why this priority**: Nice-to-have for power users.

**Independent Test**: Can be fully tested by selecting "Start fresh" and verifying empty data structures are created.

**Acceptance Scenarios**:

1. **Given** user selects new directory, **When** user chooses "Start fresh", **Then** empty entity files are created
2. **Given** user starts fresh, **When** user opens Dashboard, **Then** app shows empty state with prompts to add bills/income

---

### Edge Cases

- What happens when target directory already has some but not all data files? (Offer merge or overwrite options)
- What happens when copy fails mid-way (disk full)? (Show error, leave partial copy, don't update settings)
- What happens when directory becomes unavailable (USB unplugged, cloud sync offline)? (Show error on next access, prompt to choose new location)
- What happens when user selects a file instead of a directory? (Show error: "Please select a folder, not a file")
- What happens when app is in dev mode? (Settings page shows dev directory as read-only info, not changeable)

---

## Requirements

### Functional Requirements

**Storage Configuration**:
- **FR-001**: System MUST use `~/Documents/BudgetForFun/` as default data directory in production
- **FR-002**: System MUST use `./api/data/` (project-relative) as data directory in development mode
- **FR-003**: System MUST persist user's data directory preference using Tauri Store plugin
- **FR-004**: System MUST pass data directory path to Bun sidecar via environment variable

**Settings Page**:
- **FR-005**: System MUST provide a Settings page accessible from main navigation
- **FR-006**: System MUST display current data directory path in Settings
- **FR-007**: System MUST provide Browse button to open native folder picker
- **FR-008**: System MUST display placeholder sections for future settings (Appearance, About)

**Directory Validation**:
- **FR-009**: System MUST validate selected directory is writable before accepting
- **FR-010**: System MUST show clear error message if directory is not usable
- **FR-011**: System MUST create `entities/` and `months/` subdirectories if they don't exist

**Data Migration**:
- **FR-012**: System MUST offer "Copy existing data" option when changing directories
- **FR-013**: System MUST offer "Start fresh" option when changing directories
- **FR-014**: System MUST offer "Use existing data" option if data exists at new location
- **FR-015**: System MUST show progress during data copy operation
- **FR-016**: System MUST NOT delete original data after copy (user deletes manually)
- **FR-017**: System MUST show summary of copied files on completion

**Backend Integration**:
- **FR-018**: Storage service MUST accept base path as configuration
- **FR-019**: All file paths in services MUST be relative to configured base path
- **FR-020**: System MUST reload/restart backend when data directory changes

**Tauri Integration**:
- **FR-021**: System MUST use `@tauri-apps/plugin-dialog` for native folder picker
- **FR-022**: System MUST use `@tauri-apps/plugin-store` for persisting settings
- **FR-023**: System MUST use `@tauri-apps/api/path` for resolving user directories

---

### Key Entities

- **AppSettings**: New entity stored via Tauri Store (not in data directory)
  - `dataDirectory`: string - absolute path to data storage root
  - `version`: string - settings format version for migrations

- **StorageConfig**: Runtime configuration for storage service
  - `basePath`: string - root path for all file operations
  - `entitiesDir`: string - derived as `{basePath}/entities`
  - `monthsDir`: string - derived as `{basePath}/months`

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: App launches and creates default data directory in under 2 seconds on first run
- **SC-002**: Users can change data directory in under 1 minute (including migration)
- **SC-003**: Data migration of 50 files completes in under 10 seconds
- **SC-004**: 100% of entity and month files are copied during migration (no data loss)
- **SC-005**: Settings page loads in under 500ms
- **SC-006**: Error messages clearly explain the problem and suggest solutions
- **SC-007**: Development mode correctly uses project-relative paths (no production paths in dev)

---

**Version**: 1.0.0 | **Created**: 2026-01-01
