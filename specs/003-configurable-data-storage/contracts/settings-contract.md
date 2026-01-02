# API Contract: Settings

**Feature Branch**: `003-configurable-data-storage`  
**Date**: 2026-01-01

## Overview

The Settings API provides endpoints for managing application settings, specifically the data directory configuration.

**Note**: Most settings operations happen directly via Tauri Store plugin on the frontend. The backend API is minimal - primarily for querying current state and triggering restarts.

---

## Endpoints

### GET /api/settings

Returns current application settings from the backend's perspective.

**Request**:
```http
GET /api/settings HTTP/1.1
Host: localhost:3000
```

**Response** (200 OK):
```json
{
  "dataDirectory": "/Users/brad/Documents/BudgetForFun",
  "isDevelopment": false,
  "version": "0.1.0"
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| dataDirectory | string | Current data directory path |
| isDevelopment | boolean | Whether running in dev mode |
| version | string | Application version |

---

### GET /api/settings/data-directory

Returns the current data directory configuration.

**Request**:
```http
GET /api/settings/data-directory HTTP/1.1
Host: localhost:3000
```

**Response** (200 OK):
```json
{
  "path": "/Users/brad/Documents/BudgetForFun",
  "entitiesDir": "/Users/brad/Documents/BudgetForFun/entities",
  "monthsDir": "/Users/brad/Documents/BudgetForFun/months",
  "isDevelopment": false,
  "isWritable": true
}
```

---

### POST /api/settings/validate-directory

Validates a directory for use as data storage.

**Request**:
```http
POST /api/settings/validate-directory HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "path": "/Users/brad/iCloud Drive/BudgetForFun"
}
```

**Response** (200 OK - Valid):
```json
{
  "isValid": true,
  "exists": true,
  "isWritable": true,
  "hasExistingData": false,
  "existingFiles": []
}
```

**Response** (200 OK - Has Existing Data):
```json
{
  "isValid": true,
  "exists": true,
  "isWritable": true,
  "hasExistingData": true,
  "existingFiles": [
    "entities/bills.json",
    "entities/incomes.json",
    "months/2025-01.json"
  ]
}
```

**Response** (200 OK - Invalid):
```json
{
  "isValid": false,
  "exists": true,
  "isWritable": false,
  "hasExistingData": false,
  "existingFiles": [],
  "error": "Permission denied: directory is not writable"
}
```

---

### POST /api/settings/migrate-data

Copies data from current directory to a new directory.

**Request**:
```http
POST /api/settings/migrate-data HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "sourceDir": "/Users/brad/Documents/BudgetForFun",
  "destDir": "/Users/brad/iCloud Drive/BudgetForFun",
  "mode": "copy"
}
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sourceDir | string | Yes | Current data directory |
| destDir | string | Yes | New data directory |
| mode | string | Yes | Migration mode: "copy", "fresh", or "use_existing" |

**Response** (200 OK):
```json
{
  "success": true,
  "entityFilesCopied": 5,
  "monthFilesCopied": 12,
  "filesCopied": [
    "entities/bills.json",
    "entities/incomes.json",
    "entities/categories.json",
    "entities/payment-sources.json",
    "entities/undo.json",
    "months/2025-01.json",
    "months/2025-02.json"
  ],
  "sourceDir": "/Users/brad/Documents/BudgetForFun",
  "destDir": "/Users/brad/iCloud Drive/BudgetForFun"
}
```

**Response** (500 Error):
```json
{
  "success": false,
  "error": "Failed to copy entities/bills.json: Disk full",
  "entityFilesCopied": 2,
  "monthFilesCopied": 0,
  "filesCopied": [
    "entities/incomes.json",
    "entities/categories.json"
  ],
  "sourceDir": "/Users/brad/Documents/BudgetForFun",
  "destDir": "/Users/brad/iCloud Drive/BudgetForFun"
}
```

---

## Error Responses

All endpoints return standard error format:

```json
{
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

**Error Codes**:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_PATH | 400 | Path is malformed or invalid |
| NOT_FOUND | 404 | Directory does not exist |
| PERMISSION_DENIED | 403 | Cannot read/write to directory |
| COPY_FAILED | 500 | File copy operation failed |
| DISK_FULL | 500 | Insufficient disk space |

---

## Notes

1. **Sidecar Restart**: After successful migration, the frontend should restart the Bun sidecar with the new `DATA_DIR` environment variable. This is handled by Tauri, not the backend.

2. **Atomic Operations**: The migration endpoint does NOT update any settings. It only copies files. The frontend updates Tauri Store after confirming migration success.

3. **Development Mode**: In development, the `/api/settings/migrate-data` endpoint returns an error because dev mode uses a fixed directory.

---

**Contract Version**: 1.0.0
