# Implementation Plan: Configurable Data Storage

**Branch**: `003-configurable-data-storage` | **Date**: 2026-01-01 | **Spec**: [spec.md](./spec.md)

## Summary

Enable users to configure where BudgetForFun stores data on disk, with a sensible default of `~/Documents/BudgetForFun/`. This unlocks cloud sync via iCloud, Google Drive, or Dropbox without app-specific cloud integration.

## Technical Context

**Language/Version**: TypeScript (strict mode), Rust (Tauri)  
**Primary Dependencies**: Bun 1.x, Svelte 4.x, Tauri 2.x, tauri-plugin-store, tauri-plugin-dialog, tauri-plugin-fs  
**Storage**: JSON files in user-configurable directory  
**Testing**: Manual testing, curl for API endpoints  
**Target Platform**: macOS (primary), Windows, Linux  
**Project Type**: Desktop app (Tauri + Bun sidecar)  
**Performance Goals**: Migration of 50 files < 10 seconds  
**Constraints**: No cloud-specific code, works offline  
**Scale/Scope**: Single user, local data only

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| VIII. Local file storage | PASS | Core feature enables cloud sync via local directories |
| XI. Makefiles for automation | PASS | No new Makefile changes needed |
| XVI. Bun Backend | PASS | Storage service refactoring only |
| XVIII. Tauri Desktop Shell | PASS | Adding Tauri plugins |
| XXIV. No External UI Libraries | PASS | Custom Svelte components |
| XXVII. Backend Testing | PASS | Will test with curl |

## Project Structure

### Documentation (this feature)

```text
specs/003-configurable-data-storage/
├── spec.md              # Feature specification with wireframes
├── plan.md              # This file
├── research.md          # Tauri plugin research
├── data-model.md        # Entity definitions
├── quickstart.md        # Quick reference
└── contracts/
    └── settings-contract.md  # Settings API contract
```

### Source Code Changes

```text
api/
├── src/
│   ├── services/
│   │   ├── storage.ts           # MODIFY: Add configurable base path
│   │   └── settings-service.ts  # NEW: Settings management
│   ├── routes/
│   │   ├── index.ts             # MODIFY: Add settings routes
│   │   └── handlers/
│   │       └── settings.ts      # NEW: Settings handlers
│   └── models/
│       └── settings.ts          # NEW: Settings types
└── server.ts                    # MODIFY: Read DATA_DIR env var

src/
├── routes/
│   └── settings/
│       └── +page.svelte         # NEW: Settings page
├── stores/
│   └── settings.ts              # NEW: Settings store (Tauri Store)
└── components/
    └── Navigation.svelte        # MODIFY: Add Settings link

src-tauri/
├── src/
│   └── lib.rs                   # MODIFY: Pass DATA_DIR to sidecar
├── Cargo.toml                   # MODIFY: Add plugins
└── capabilities/
    └── default.json             # MODIFY: Add permissions
```

## Implementation Phases

### Phase 1: Backend Storage Refactoring (2h)

Make the storage service configurable with a base path.

**Tasks**:
1. Add `StorageServiceImpl.initialize(basePath)` static method
2. Add private `basePath` field and `resolvePath()` helper
3. Update all file path references to use `resolvePath()`
4. Update `server.ts` to read `DATA_DIR` from environment
5. Test with curl that API works with custom DATA_DIR

**Files Changed**:
- `api/src/services/storage.ts`
- `api/server.ts`

**Verification**:
```bash
# Test with custom data directory
DATA_DIR=/tmp/budget-test bun run api/server.ts &
curl http://localhost:3000/api/bills
ls -la /tmp/budget-test/entities/
```

### Phase 2: Settings API (1h)

Add API endpoints for settings management.

**Tasks**:
1. Create `api/src/models/settings.ts` with types
2. Create `api/src/services/settings-service.ts`
3. Create `api/src/routes/handlers/settings.ts`
4. Register routes in `api/src/routes/index.ts`
5. Test endpoints with curl

**Files Created**:
- `api/src/models/settings.ts`
- `api/src/services/settings-service.ts`
- `api/src/routes/handlers/settings.ts`

**Verification**:
```bash
curl http://localhost:3000/api/settings
curl http://localhost:3000/api/settings/data-directory
curl -X POST http://localhost:3000/api/settings/validate-directory \
  -H "Content-Type: application/json" \
  -d '{"path": "/tmp/test"}'
```

### Phase 3: Tauri Plugin Integration (3h)

Add Tauri plugins and pass data directory to sidecar.

**Tasks**:
1. Add `tauri-plugin-store`, `tauri-plugin-dialog`, `tauri-plugin-fs` to Cargo.toml
2. Register plugins in `lib.rs`
3. Add permissions to `capabilities/default.json`
4. Modify `start_bun_sidecar` to accept and pass `data_dir` parameter
5. Add Tauri command to get/set settings
6. Test with Tauri dev

**Files Changed**:
- `src-tauri/Cargo.toml`
- `src-tauri/src/lib.rs`
- `src-tauri/capabilities/default.json`

**Verification**:
- Launch Tauri app
- Check console for DATA_DIR being passed to sidecar
- Verify store plugin creates settings file

### Phase 4: Settings Page UI (3h)

Create the Settings page with data directory configuration.

**Tasks**:
1. Create `src/stores/settings.ts` (Tauri Store wrapper)
2. Create `src/routes/settings/+page.svelte`
3. Add Settings link to `src/components/Navigation.svelte`
4. Implement Browse button with native folder picker
5. Implement migration dialog modal
6. Implement progress and success/error modals
7. Style to match existing app theme

**Files Created**:
- `src/stores/settings.ts`
- `src/routes/settings/+page.svelte`

**Files Changed**:
- `src/components/Navigation.svelte`

**Verification**:
- Navigate to Settings page
- Click Browse, select folder
- Verify migration dialog appears
- Verify folder picker works

### Phase 5: Data Migration (2h)

Implement data copy functionality.

**Tasks**:
1. Implement `POST /api/settings/migrate-data` endpoint
2. Create migration progress tracking
3. Handle partial failures gracefully
4. Show progress in UI
5. Show summary on completion

**Files Changed**:
- `api/src/services/settings-service.ts`
- `api/src/routes/handlers/settings.ts`
- `src/routes/settings/+page.svelte`

**Verification**:
```bash
curl -X POST http://localhost:3000/api/settings/migrate-data \
  -H "Content-Type: application/json" \
  -d '{"sourceDir": "./data", "destDir": "/tmp/migrate-test", "mode": "copy"}'
ls -la /tmp/migrate-test/
```

### Phase 6: Polish & Testing (2h)

Final testing and edge case handling.

**Tasks**:
1. Test first-run with no existing data
2. Test migration to various locations (Documents, iCloud, etc.)
3. Test error scenarios (read-only dir, disk full simulation)
4. Test dev mode doesn't show change option
5. Add helpful tooltips and error messages
6. Update AGENTS.md with new context

**Verification**:
- Full end-to-end test of all user stories
- Verify no regressions in existing features

---

## Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Backend Storage | 2h | High |
| Phase 2: Settings API | 1h | High |
| Phase 3: Tauri Plugins | 3h | High |
| Phase 4: Settings UI | 3h | High |
| Phase 5: Data Migration | 2h | Medium |
| Phase 6: Polish | 2h | Medium |
| **Total** | **13h** | |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Tauri plugin compatibility | Use official v2 plugins only |
| Sidecar restart complexity | Kill and respawn cleanly |
| Data loss during migration | Copy-only (never delete original) |
| Permission issues | Validate before attempting operations |

---

**Plan Complete**: 2026-01-01
