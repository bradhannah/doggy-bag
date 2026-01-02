# Quickstart: Configurable Data Storage

**Feature Branch**: `003-configurable-data-storage`

## TL;DR

Users can change where BudgetForFun stores data. Default: `~/Documents/BudgetForFun/`. Great for iCloud/Dropbox sync.

## Key Files

| File | Purpose |
|------|---------|
| `api/src/services/storage.ts` | Storage with configurable base path |
| `api/src/services/settings-service.ts` | Settings management |
| `src/routes/settings/+page.svelte` | Settings UI |
| `src/stores/settings.ts` | Tauri Store wrapper |
| `src-tauri/src/lib.rs` | Pass DATA_DIR to sidecar |

## Environment Variable

```bash
# Production (set by Tauri)
DATA_DIR=/Users/brad/Documents/BudgetForFun

# Development (default)
DATA_DIR=./data  # (or unset = ./data)
```

## Testing Commands

```bash
# Test with custom directory
DATA_DIR=/tmp/budget-test bun run api/server.ts

# Verify settings endpoint
curl http://localhost:3000/api/settings

# Validate a directory
curl -X POST http://localhost:3000/api/settings/validate-directory \
  -H "Content-Type: application/json" \
  -d '{"path": "/tmp/test"}'

# Migrate data
curl -X POST http://localhost:3000/api/settings/migrate-data \
  -H "Content-Type: application/json" \
  -d '{"sourceDir": "./data", "destDir": "/tmp/new-location", "mode": "copy"}'
```

## Tauri Plugins Used

- `tauri-plugin-store` - Persist settings
- `tauri-plugin-dialog` - Native folder picker
- `tauri-plugin-fs` - File operations

## User Flow

1. Open Settings (sidebar link)
2. Click Browse next to Data Directory
3. Select new folder (native picker)
4. Choose "Copy existing data"
5. Wait for migration
6. Done - app uses new location

## Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Data location | `./api/data/` | `~/Documents/BudgetForFun/` |
| Configurable | No | Yes |
| DATA_DIR env | Not set | Set by Tauri |
| Settings page | Shows path (read-only) | Full functionality |
