# Data Model: Configurable Data Storage

**Feature Branch**: `003-configurable-data-storage`  
**Date**: 2026-01-01

## Entities

### 1. AppSettings (Tauri Store)

Stored via Tauri Store plugin in the platform-specific application support directory. **NOT** in the user's data directory (this is intentional - settings should not sync).

**Location**: 
- macOS: `~/Library/Application Support/com.bradhannah.budgetforfun/settings.json`
- Windows: `%APPDATA%/com.bradhannah.budgetforfun/settings.json`
- Linux: `~/.local/share/com.bradhannah.budgetforfun/settings.json`

```typescript
interface AppSettings {
  /** Absolute path to user's data storage root */
  dataDirectory: string;
  
  /** Settings format version for future migrations */
  version: string;
}
```

**Default Values**:
```typescript
const DEFAULT_SETTINGS: AppSettings = {
  dataDirectory: '', // Empty = use default ~/Documents/BudgetForFun
  version: '1.0.0'
};
```

**Notes**:
- `dataDirectory` empty string means "use default location"
- This allows distinguishing between "never set" and "explicitly set to X"

---

### 2. StorageConfig (Runtime)

Runtime configuration object used by the storage service. Not persisted - derived from environment and settings at startup.

```typescript
interface StorageConfig {
  /** Root path for all file operations */
  basePath: string;
  
  /** Path to entities directory: {basePath}/entities */
  entitiesDir: string;
  
  /** Path to months directory: {basePath}/months */
  monthsDir: string;
  
  /** Whether this is a development environment */
  isDevelopment: boolean;
}
```

**Resolution Logic**:
```typescript
function resolveStorageConfig(): StorageConfig {
  let basePath: string;
  
  if (process.env.DATA_DIR) {
    // Production: Tauri passed the path
    basePath = process.env.DATA_DIR;
  } else {
    // Development: use project-relative path
    basePath = './data';
  }
  
  return {
    basePath,
    entitiesDir: path.join(basePath, 'entities'),
    monthsDir: path.join(basePath, 'months'),
    isDevelopment: !process.env.DATA_DIR
  };
}
```

---

### 3. MigrationResult (Runtime)

Result of a data migration operation, used to display feedback to user.

```typescript
interface MigrationResult {
  /** Whether the migration succeeded */
  success: boolean;
  
  /** Number of entity files copied */
  entityFilesCopied: number;
  
  /** Number of month files copied */
  monthFilesCopied: number;
  
  /** List of files that were copied */
  filesCopied: string[];
  
  /** Error message if failed */
  error?: string;
  
  /** Source directory */
  sourceDir: string;
  
  /** Destination directory */
  destDir: string;
}
```

---

### 4. DirectoryValidation (Runtime)

Result of validating a directory for use as data storage.

```typescript
interface DirectoryValidation {
  /** Whether the directory can be used */
  isValid: boolean;
  
  /** Whether the directory exists */
  exists: boolean;
  
  /** Whether the directory is writable */
  isWritable: boolean;
  
  /** Whether data already exists at this location */
  hasExistingData: boolean;
  
  /** List of existing data files found */
  existingFiles: string[];
  
  /** Error message if not valid */
  error?: string;
}
```

---

## Data Flow

### Startup Flow (Production)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Tauri     │────>│ Load Store  │────>│ Get dataDir │────>│ Spawn Bun   │
│   Starts    │     │ settings    │     │ or default  │     │ with ENV    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                                                                   v
                                              ┌─────────────────────────────┐
                                              │  Bun sidecar starts with    │
                                              │  DATA_DIR=/path/to/data     │
                                              │  StorageService.initialize()│
                                              └─────────────────────────────┘
```

### Startup Flow (Development)

```
┌─────────────┐     ┌─────────────┐
│  make dev   │────>│ Bun starts  │
│             │     │ DATA_DIR    │
│             │     │ not set     │
└─────────────┘     └─────────────┘
                          │
                          v
          ┌───────────────────────────────┐
          │  StorageService.initialize()  │
          │  uses './data' as basePath    │
          └───────────────────────────────┘
```

### Directory Change Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ User clicks │────>│ Native      │────>│ Validate    │────>│ Show        │
│ Browse      │     │ folder pick │     │ directory   │     │ migration   │
└─────────────┘     └─────────────┘     └─────────────┘     │ dialog      │
                                                            └─────────────┘
                                                                   │
                    ┌──────────────────────────────────────────────┘
                    │
                    v
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Copy files  │────>│ Update      │────>│ Restart     │────>│ App uses    │
│ (if chosen) │     │ Tauri Store │     │ sidecar     │     │ new path    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

---

## File Structure

### User Data Directory (Production Default)

```
~/Documents/BudgetForFun/
├── entities/
│   ├── bills.json
│   ├── incomes.json
│   ├── categories.json
│   ├── payment-sources.json
│   ├── variable-expense-templates.json
│   └── undo.json
└── months/
    ├── 2025-01.json
    ├── 2025-02.json
    └── ...
```

### App Settings (Not Synced)

```
~/Library/Application Support/com.bradhannah.budgetforfun/
└── settings.json
```

### Development Data

```
/project-root/api/data/
├── entities/
│   └── ...
└── months/
    └── ...
```

---

## Validation Rules

### dataDirectory (AppSettings)

| Rule | Validation |
|------|------------|
| Format | Must be absolute path or empty string |
| Existence | Directory must exist or be creatable |
| Permissions | Must be writable by current user |
| Content | Optional - can have existing data or be empty |

### Migration

| Rule | Validation |
|------|------------|
| Source | Must exist and contain data |
| Destination | Must be writable |
| Conflict | If destination has data, user must acknowledge |
| Atomicity | If copy fails, settings are not updated |

---

**Data Model Complete**: 2026-01-01
