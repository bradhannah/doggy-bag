# Data Model: CI/CD Pipeline & Test Coverage

**Branch**: `007-cicd-test-coverage` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)

## Overview

This feature is primarily a tooling/configuration feature with no runtime data model changes. The "data" for this feature consists of:

1. **Configuration files** - GitHub Actions workflows (YAML)
2. **Documentation files** - RELEASING.md, CHANGELOG.md (Markdown)
3. **Test files** - Vitest test suites (TypeScript)

## Configuration Schemas

### GitHub Actions Workflow Schema

GitHub Actions workflows follow the [GitHub Actions YAML syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions).

Key entities:

```yaml
# Workflow file structure
name: string # Workflow display name
on: # Trigger events
  pull_request:
    branches: string[] # Target branches
  push:
    tags: string[] # Tag patterns (e.g., "v*.*.*")

jobs:
  job_id:
    runs-on: string # Runner (ubuntu-latest, macos-latest)
    needs: string[] # Job dependencies (optional)
    steps:
      - name: string # Step display name
        uses: string # Action reference (optional)
        run: string # Shell command (optional)
        with: # Action inputs (optional)
          key: value
```

### Version Files

Three files must be kept in sync:

| File            | Format | Path                |
| --------------- | ------ | ------------------- |
| package.json    | JSON   | `.version`          |
| tauri.conf.json | JSON   | `.version`          |
| Cargo.toml      | TOML   | `[package] version` |

Example sync:

```json
// package.json
{ "version": "0.2.0" }

// tauri.conf.json
{ "version": "0.2.0" }
```

```toml
# Cargo.toml
[package]
version = "0.2.0"
```

### Test Coverage Report Schema

Vitest generates coverage in multiple formats:

| Format | Output              | Purpose            |
| ------ | ------------------- | ------------------ |
| text   | stdout              | Developer feedback |
| lcov   | coverage/lcov.info  | CI integration     |
| html   | coverage/index.html | Detailed browsing  |

Coverage thresholds (vitest.config.ts):

```typescript
{
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 70,
    statements: 80,
  }
}
```

## File Artifacts

### New Files Created

| Path                                  | Type       | Purpose                |
| ------------------------------------- | ---------- | ---------------------- |
| `.github/workflows/pr-validation.yml` | YAML       | PR checks workflow     |
| `.github/workflows/release.yml`       | YAML       | Release build workflow |
| `RELEASING.md`                        | Markdown   | Release process docs   |
| `CHANGELOG.md`                        | Markdown   | Version history        |
| `src/stores/*.test.ts`                | TypeScript | Store unit tests       |
| `src/components/**/*.test.ts`         | TypeScript | Component tests        |
| `src/lib/api/client.test.ts`          | TypeScript | API client tests       |

### Modified Files

| Path               | Change                            |
| ------------------ | --------------------------------- |
| `vitest.config.ts` | Update coverage thresholds to 80% |
| `Makefile`         | Add CI-specific targets if needed |

## No Runtime Data Changes

This feature does not modify:

- User data stored in `data/entities/*.json`
- Monthly budget data in `data/months/*.json`
- Backend API contracts (no new endpoints)
- Frontend component props/state interfaces

All changes are to tooling, configuration, and test infrastructure.
