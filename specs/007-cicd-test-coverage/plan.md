# Implementation Plan: CI/CD Pipeline & Test Coverage

**Branch**: `007-cicd-test-coverage` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-cicd-test-coverage/spec.md`

## Summary

Achieve 80% frontend test coverage (balanced approach: stores + critical UI components), create GitHub Actions CI/CD workflows for PR validation and release automation, and establish a documented versioning strategy with macOS DMG generation using ad-hoc code signing.

## Technical Context

**Language/Version**: TypeScript 5.6.x (strict mode), Rust 2021 edition
**Primary Dependencies**: Vitest 4.x, GitHub Actions, Tauri 2.x, Bun 1.x
**Storage**: N/A (tooling/configuration feature)
**Testing**: Vitest (frontend with Node.js for coverage), Bun test (backend)
**Target Platform**: macOS ARM64 (initial release), GitHub-hosted runners
**Project Type**: Web (Tauri desktop app with Bun backend + Svelte frontend)
**Performance Goals**: CI pipeline completes in <10 minutes
**Constraints**: Free tools only (no paid Apple Developer account), ad-hoc code signing
**Scale/Scope**: 600+ total tests (currently 515), 80% frontend coverage (currently ~5%)

### Current State

| Metric                   | Current | Target   |
| ------------------------ | ------- | -------- |
| Backend tests            | 469     | Maintain |
| Backend coverage         | 93%     | Maintain |
| Frontend tests           | 46      | ~300+    |
| Frontend coverage        | ~5%     | 80%      |
| Total tests              | 515     | 600+     |
| GitHub Actions workflows | 0       | 2        |

### Technical Constraints

1. **Vitest coverage**: Must run with Node.js (not Bun) due to `@vitest/coverage-v8` incompatibility with Bun's missing `node:inspector`
2. **GitHub Actions runners**: Use `macos-latest` which supports ARM64 builds
3. **Code signing**: Ad-hoc only (`codesign --sign -`) - no notarization

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                    | Status  | Notes                                                   |
| ---------------------------- | ------- | ------------------------------------------------------- |
| II. Test-First Development   | ✅ PASS | This feature improves TDD infrastructure                |
| XI. Makefiles for automation | ✅ PASS | Existing `make test-frontend`, `make test-backend` used |
| XVI. Bun Backend             | ✅ PASS | Backend tests continue using Bun                        |
| XIX. SvelteKit Frontend      | ✅ PASS | Frontend tests use Vitest with Svelte testing library   |
| XIV. API Documentation       | N/A     | No API changes in this feature                          |
| XV. No Containers            | ✅ PASS | GitHub Actions runners, no Docker                       |

**Constitution Violations**: None

## Project Structure

### Documentation (this feature)

```text
specs/007-cicd-test-coverage/
├── plan.md              # This file
├── research.md          # Phase 0 output - GitHub Actions patterns
├── data-model.md        # Phase 1 output - N/A (no data model)
├── quickstart.md        # Phase 1 output - Quick test commands
├── contracts/           # Phase 1 output - Workflow YAML schemas
│   ├── pr-validation.yml
│   └── release.yml
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# CI/CD Configuration
.github/
└── workflows/
    ├── pr-validation.yml    # Triggered on PRs to main
    └── release.yml          # Triggered on version tags (v*.*.*)

# Documentation
RELEASING.md                 # Release process documentation
CHANGELOG.md                 # Version history

# Frontend Tests (new files)
src/
├── stores/
│   ├── bills.test.ts        # NEW
│   ├── categories.test.ts   # NEW
│   ├── incomes.test.ts      # NEW
│   ├── months.test.ts       # NEW
│   ├── payment-sources.test.ts # NEW
│   ├── payments.test.ts     # NEW
│   ├── detailed-month.test.ts # NEW
│   ├── settings.test.ts     # NEW
│   ├── toast.test.ts        # EXISTS (19 tests)
│   └── ui.test.ts           # EXISTS (25 tests)
├── components/
│   ├── Dashboard/
│   │   ├── Dashboard.test.ts # NEW
│   │   └── *.test.ts        # NEW - critical components
│   ├── DetailedView/
│   │   ├── DetailedView.test.ts # NEW
│   │   └── *.test.ts        # NEW - critical components
│   └── shared/
│       └── *.test.ts        # NEW - shared components
└── lib/
    └── api/
        └── client.test.ts   # NEW

# Configuration
vitest.config.ts             # UPDATE - raise coverage thresholds to 80%
```

**Structure Decision**: Web application structure with separate frontend tests using Vitest and backend tests using Bun. GitHub Actions workflows added to `.github/workflows/`.

## Complexity Tracking

No constitution violations requiring justification.

## Implementation Phases

### Phase 0: Research (this plan)

- Analyze existing test patterns
- Research GitHub Actions for Tauri apps
- Document coverage strategy

### Phase 1: Design (contracts/)

- Define PR validation workflow YAML
- Define release workflow YAML
- Create test file templates

### Phase 2: Tasks (tasks.md)

- P1: Frontend store tests (8 store modules)
- P1: Frontend component tests (critical UI)
- P1: PR validation workflow
- P2: Release workflow
- P2: RELEASING.md and CHANGELOG.md

### Phase 3: Implementation

- Execute tasks following test-first approach
- Validate coverage thresholds
- Test workflows with dry runs
