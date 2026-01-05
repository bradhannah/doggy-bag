# Research: CI/CD Pipeline & Test Coverage

**Branch**: `007-cicd-test-coverage` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)

## Executive Summary

This research documents the technical approach for achieving 80% frontend test coverage and implementing GitHub Actions CI/CD workflows for BudgetForFun. Key findings: existing test patterns are well-established, GitHub Actions provides free macOS ARM64 runners, and ad-hoc code signing is sufficient for initial distribution.

## Current Testing Infrastructure

### Backend Tests (Bun)

- **Location**: `api/src/**/*.test.ts`
- **Runner**: `bun test`
- **Count**: 469 tests
- **Coverage**: 93%
- **Pattern**: Unit tests with mocked file system, comprehensive edge cases

### Frontend Tests (Vitest)

- **Location**: `src/**/*.test.ts`
- **Runner**: `npx vitest` (Node.js, not Bun due to coverage provider)
- **Count**: 46 tests (3 files)
- **Coverage**: ~5% (thresholds set to 5% minimum)
- **Existing Files**:
  - `src/stores/toast.test.ts` - 19 tests (excellent coverage pattern)
  - `src/stores/ui.test.ts` - 25 tests (excellent coverage pattern)
  - `src/lib/sample.test.ts` - 2 tests (sample)

### Test Pattern Analysis (from toast.test.ts)

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { toasts, addToast, removeToast } from './toast';

describe('Toast Store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearToasts();
  });

  it('adds a toast with default values', () => {
    const id = addToast('Test message');
    const currentToasts = get(toasts);
    expect(currentToasts).toHaveLength(1);
    expect(currentToasts[0].message).toBe('Test message');
  });
});
```

**Key patterns**:

- Use `get()` from `svelte/store` to read store values synchronously
- Use `vi.useFakeTimers()` for time-dependent tests
- Clear state in `beforeEach` to isolate tests
- Group related tests with `describe` blocks

## Store Modules Requiring Tests

| Store              | Lines | Complexity | API Calls     | Priority |
| ------------------ | ----- | ---------- | ------------- | -------- |
| bills.ts           | 191   | High       | Yes (CRUD)    | P1       |
| incomes.ts         | ~190  | High       | Yes (CRUD)    | P1       |
| categories.ts      | ~180  | High       | Yes (CRUD)    | P1       |
| payment-sources.ts | ~160  | High       | Yes (CRUD)    | P1       |
| payments.ts        | ~100  | Medium     | Yes (partial) | P1       |
| months.ts          | ~80   | Medium     | Yes           | P1       |
| detailed-month.ts  | ~250  | High       | Yes           | P1       |
| settings.ts        | ~150  | Medium     | Yes (Tauri)   | P2       |
| undo.ts            | ~50   | Low        | Yes           | P2       |
| toast.ts           | 98    | ✅ Done    | No            | -        |
| ui.ts              | 236   | ✅ Done    | No            | -        |

### Store Testing Strategy

For stores with API calls, mock the `apiClient`:

```typescript
import { vi } from 'vitest';
import { apiClient } from '$lib/api/client';

vi.mock('$lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});
```

### Coverage Calculation

**Current State**:

- Total frontend source files: ~50 (stores + components + lib)
- Lines to cover (estimated): ~5,000
- Currently covered: ~250 lines (5%)
- Target: 4,000 lines (80%)

**Store Coverage Estimate**:

- 11 store modules × ~150 lines avg = 1,650 lines
- With thorough tests: expect ~85% coverage = 1,400 lines covered

**Component Coverage Estimate** (balanced approach):

- Critical components: Dashboard, DetailedView, Setup main pages = ~1,500 lines
- Shared components: Toast, ConfirmDialog, LoadDefaultsButton = ~300 lines
- With component tests: expect ~70% coverage = 1,260 lines covered

**Projected Coverage**: ~53% from stores + components alone. Need additional lib/api coverage.

## GitHub Actions Configuration

### Runner Selection

| Runner         | Architecture | Cost                | Availability |
| -------------- | ------------ | ------------------- | ------------ |
| `macos-latest` | ARM64 (M1)   | Free (public repos) | Stable       |
| `macos-13`     | Intel x86_64 | Free                | Stable       |
| `macos-14`     | ARM64 (M1)   | Free                | Stable       |

**Decision**: Use `macos-latest` for ARM64 builds.

### Required Tools

| Tool      | Installation                                | Purpose                |
| --------- | ------------------------------------------- | ---------------------- |
| Bun       | `curl -fsSL https://bun.sh/install \| bash` | Backend runtime, tests |
| Rust      | `rustup` (pre-installed on macos-latest)    | Tauri compilation      |
| Node.js   | `actions/setup-node@v4`                     | Vitest coverage runner |
| Tauri CLI | Installed via npm devDependencies           | Build DMG              |

### PR Validation Workflow Structure

```yaml
name: PR Validation
on:
  pull_request:
    branches: [main]

jobs:
  lint-format:
    runs-on: ubuntu-latest
    steps:
      - ESLint
      - Prettier check

  type-check:
    runs-on: ubuntu-latest
    steps:
      - svelte-check

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - bun test (api/)

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - npx vitest run --coverage

  build:
    runs-on: macos-latest
    needs: [lint-format, type-check, test-backend, test-frontend]
    steps:
      - Tauri build (--debug for speed)
```

**Estimated Time**: 5-8 minutes (parallel jobs)

### Release Workflow Structure

```yaml
name: Release
on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  build-macos:
    runs-on: macos-latest
    steps:
      - Install Bun, Rust
      - bun install && npm install
      - Generate types
      - Build Tauri (release mode)
      - Ad-hoc sign: codesign --sign - --force --deep
      - Create DMG
      - Upload to GitHub Release
```

### Ad-Hoc Code Signing

```bash
# Sign the app bundle
codesign --sign - --force --deep "target/release/bundle/macos/BudgetForFun.app"

# Verify signature
codesign --verify --verbose "target/release/bundle/macos/BudgetForFun.app"
```

**User Experience**:

1. User downloads DMG
2. Opens DMG, drags app to Applications
3. First launch: Gatekeeper blocks ("unidentified developer")
4. User right-clicks → Open → confirms to allow
5. App runs normally thereafter

**Documentation Required**: RELEASING.md must include Gatekeeper bypass instructions.

## Versioning Strategy

### Semantic Versioning (Pre-1.0)

| Change Type                 | Version Bump | Example       |
| --------------------------- | ------------ | ------------- |
| New feature (spec complete) | MINOR        | 0.1.0 → 0.2.0 |
| Bug fix                     | PATCH        | 0.2.0 → 0.2.1 |
| Breaking change (pre-1.0)   | MINOR        | 0.2.1 → 0.3.0 |

### Version Sources (must stay in sync)

| File            | Path                | Current |
| --------------- | ------------------- | ------- |
| package.json    | `.version`          | "0.1.0" |
| tauri.conf.json | `.version`          | "0.1.0" |
| Cargo.toml      | `[package] version` | "0.1.0" |

### Release Process

1. Complete feature development, merge to main
2. Update versions in all 3 files
3. Update CHANGELOG.md
4. Commit: `chore: bump version to 0.X.0`
5. Tag: `git tag v0.X.0 && git push origin v0.X.0`
6. GitHub Actions builds and publishes DMG

## Technical Constraints & Workarounds

### Vitest + Bun Incompatibility

**Problem**: `@vitest/coverage-v8` requires `node:inspector` which Bun doesn't fully implement.

**Solution**: Run Vitest with Node.js for coverage:

```bash
# In Makefile
test-frontend:
    npx vitest run

test-frontend-coverage:
    npx vitest run --coverage
```

### Svelte Component Testing

**Challenge**: Svelte components require DOM environment and proper module resolution.

**Solution**: Vitest with jsdom + @testing-library/svelte:

```typescript
import { render, screen, fireEvent } from '@testing-library/svelte';
import MyComponent from './MyComponent.svelte';

it('renders correctly', () => {
  render(MyComponent, { props: { value: 'test' } });
  expect(screen.getByText('test')).toBeInTheDocument();
});
```

### API Client Mocking

**Challenge**: Store modules import `apiClient` which makes HTTP calls.

**Solution**: Mock at module level:

```typescript
vi.mock('$lib/api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
}));
```

## Risk Assessment

| Risk                 | Likelihood | Impact | Mitigation                                         |
| -------------------- | ---------- | ------ | -------------------------------------------------- |
| Flaky tests in CI    | Medium     | Medium | Add retry logic, isolate tests                     |
| Coverage <80%        | Low        | Medium | Focus on stores first (high coverage/effort ratio) |
| macOS build fails    | Low        | High   | Test locally before PR, use same runner version    |
| Gatekeeper confusion | Medium     | Low    | Clear documentation with screenshots               |
| Version sync issues  | Medium     | Medium | Document process, consider future automation       |

## Recommendations

1. **Start with store tests** - highest coverage impact, established patterns
2. **Mock API calls** - avoid test flakiness from network
3. **Run lint/format in parallel** - faster CI
4. **Use debug builds in PR validation** - faster, catches most issues
5. **Release builds only on tags** - saves CI minutes
6. **Document Gatekeeper bypass** - essential for user experience

## References

- [Tauri GitHub Actions](https://tauri.app/distribute/ci-cd/github-actions/)
- [Vitest Coverage](https://vitest.dev/guide/coverage)
- [GitHub Actions macOS runners](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners)
- [Apple Code Signing](https://developer.apple.com/documentation/xcode/signing-a-daemon-with-a-restricted-entitlement)
