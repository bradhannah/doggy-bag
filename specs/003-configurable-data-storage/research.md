# Research: Configurable Data Storage

**Feature Branch**: `003-configurable-data-storage`  
**Date**: 2026-01-01

## Research Topics

### 1. Tauri Plugin: Store

**Decision**: Use `@tauri-apps/plugin-store` for persisting user settings (data directory path)

**Rationale**:
- Official Tauri plugin with v2 support
- Stores data in platform-appropriate location (`~/Library/Application Support/` on macOS)
- Simple key-value API with JSON serialization
- Persists across app restarts
- Separate from user data (won't be in synced folder)

**Alternatives Considered**:
- localStorage: Not available in Tauri by default, requires WebView APIs
- Custom JSON file: Reinventing the wheel, plugin handles edge cases
- Environment variables: Not persistent across sessions

**Implementation**:
```rust
// Cargo.toml
tauri-plugin-store = "2"
```

```typescript
// Frontend usage
import { Store } from '@tauri-apps/plugin-store';

const store = new Store('settings.json');
await store.set('dataDirectory', '/path/to/data');
await store.save();

const dir = await store.get<string>('dataDirectory');
```

**Store Location**:
- macOS: `~/Library/Application Support/com.bradhannah.budgetforfun/settings.json`
- Windows: `%APPDATA%/com.bradhannah.budgetforfun/settings.json`
- Linux: `~/.local/share/com.bradhannah.budgetforfun/settings.json`

---

### 2. Tauri Plugin: Dialog

**Decision**: Use `@tauri-apps/plugin-dialog` for native folder picker

**Rationale**:
- Native OS folder picker (familiar to users)
- Handles permissions automatically
- Returns absolute paths
- Works across all platforms

**Alternatives Considered**:
- Custom file browser UI: Much more work, unfamiliar to users
- Text input for path: Error-prone, bad UX

**Implementation**:
```rust
// Cargo.toml
tauri-plugin-dialog = "2"
```

```typescript
// Frontend usage
import { open } from '@tauri-apps/plugin-dialog';

const selected = await open({
  directory: true,
  multiple: false,
  title: 'Choose Data Directory',
  defaultPath: await documentDir(),
});

if (selected) {
  // selected is string path to directory
}
```

---

### 3. Tauri Plugin: FS

**Decision**: Use `@tauri-apps/plugin-fs` for file operations in frontend (validation, migration)

**Rationale**:
- Required for checking if directory is writable
- Needed for copying files during migration
- Works with Tauri's permission system

**Alternatives Considered**:
- Backend-only file operations: Would work but requires more IPC calls
- Node.js fs module: Not available in Tauri context

**Implementation**:
```rust
// Cargo.toml
tauri-plugin-fs = "2"
```

```typescript
// Frontend usage
import { exists, mkdir, copyFile, readDir } from '@tauri-apps/plugin-fs';

// Check if directory exists
const dirExists = await exists(path);

// Create directory
await mkdir(path, { recursive: true });

// Copy files
await copyFile(src, dest);
```

---

### 4. Tauri Path API

**Decision**: Use `@tauri-apps/api/path` for platform-agnostic path resolution

**Rationale**:
- Resolves `~` to actual home directory
- Provides `documentDir()` for default location
- Cross-platform path joining

**Implementation**:
```typescript
import { documentDir, join } from '@tauri-apps/api/path';

// Get default data directory
const defaultDir = await join(await documentDir(), 'BudgetForFun');
```

---

### 5. Passing Data Directory to Bun Sidecar

**Decision**: Pass via environment variable when spawning sidecar

**Rationale**:
- Environment variables are the standard way to configure processes
- Simple to implement in both Rust and TypeScript
- Can be overridden in development

**Alternatives Considered**:
- Command-line argument: Would work but env vars are more conventional
- Config file: Adds complexity, sidecar would need to know where to look
- API call after startup: Race condition risk, sidecar starts processing before config

**Implementation**:
```rust
// lib.rs
use std::env;

#[tauri::command]
async fn start_bun_sidecar(app: tauri::AppHandle, data_dir: String) -> Result<String, String> {
    let sidecar_command = app
        .shell()
        .sidecar("bun-sidecar")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .env("DATA_DIR", data_dir);  // Pass data directory

    // ... spawn sidecar
}
```

```typescript
// server.ts
const DATA_DIR = process.env.DATA_DIR || './data';
console.log(`Using data directory: ${DATA_DIR}`);
```

---

### 6. Dev vs Production Mode Detection

**Decision**: Use `DATA_DIR` environment variable presence and Tauri context

**Rationale**:
- In development (`make dev`), sidecar runs standalone with default `./api/data`
- In production (Tauri app), sidecar receives `DATA_DIR` from Tauri
- Simple and reliable

**Implementation**:
```typescript
// server.ts
function getDataDirectory(): string {
  // If DATA_DIR is set (production via Tauri), use it
  if (process.env.DATA_DIR) {
    return process.env.DATA_DIR;
  }
  
  // Development mode: use project-relative path
  return './data';
}
```

---

### 7. Storage Service Refactoring

**Decision**: Add static `initialize()` method to set base path before use

**Rationale**:
- Minimal changes to existing code
- Services continue using relative paths
- Base path is prepended automatically

**Alternatives Considered**:
- Constructor injection: Would require changing all service instantiations
- Global config object: Less explicit, harder to trace
- Dependency injection framework: Overkill for this project

**Implementation**:
```typescript
// storage.ts
export class StorageServiceImpl implements StorageService {
  private static basePath: string = './data';
  
  public static initialize(basePath: string): void {
    StorageServiceImpl.basePath = basePath;
    console.log(`[StorageService] Initialized with base path: ${basePath}`);
  }
  
  private resolvePath(relativePath: string): string {
    return path.join(StorageServiceImpl.basePath, relativePath);
  }
  
  // All file operations use resolvePath()
}
```

---

### 8. Capabilities/Permissions

**Decision**: Add necessary permissions to `capabilities/default.json`

**Required Permissions**:
```json
{
  "permissions": [
    "core:default",
    "opener:default",
    "shell:allow-execute",
    "shell:allow-spawn",
    "store:default",
    "dialog:default",
    "fs:default",
    "path:default"
  ]
}
```

---

## Summary

| Component | Technology | Notes |
|-----------|------------|-------|
| Settings persistence | tauri-plugin-store | Stores in app support dir |
| Folder picker | tauri-plugin-dialog | Native OS dialog |
| File operations | tauri-plugin-fs | Copy, validate, create dirs |
| Path resolution | @tauri-apps/api/path | Cross-platform paths |
| Sidecar config | Environment variable | DATA_DIR passed at spawn |
| Dev detection | Env var presence | No DATA_DIR = dev mode |

---

**Research Complete**: 2026-01-01
