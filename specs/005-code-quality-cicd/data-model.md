# Data Model: Code Quality & CI/CD

**Feature Branch**: `005-code-quality-cicd`
**Date**: 2026-01-03
**Status**: Complete

---

## Overview

This feature primarily involves configuration files and tooling infrastructure. There are no new database entities or API data models. This document describes the configuration schemas and file structures.

---

## Configuration Schemas

### 1. ESLint Configuration

**File**: `eslint.config.js` (ESLint 9 flat config format)

```typescript
interface ESLintConfig {
  files?: string[];           // Glob patterns for files to lint
  ignores?: string[];         // Glob patterns to ignore
  languageOptions?: {
    ecmaVersion?: number;
    sourceType?: 'module' | 'script';
    parser?: object;
    parserOptions?: object;
    globals?: Record<string, boolean | 'readonly' | 'writable'>;
  };
  plugins?: Record<string, object>;
  rules?: Record<string, 'off' | 'warn' | 'error' | [string, ...any[]]>;
  settings?: Record<string, any>;
}
```

### 2. Prettier Configuration

**File**: `.prettierrc`

```typescript
interface PrettierConfig {
  printWidth?: number;        // Line width (default: 80)
  tabWidth?: number;          // Spaces per tab (default: 2)
  useTabs?: boolean;          // Use tabs instead of spaces
  semi?: boolean;             // Semicolons at end of statements
  singleQuote?: boolean;      // Use single quotes
  trailingComma?: 'none' | 'es5' | 'all';
  bracketSpacing?: boolean;   // Spaces in object literals
  plugins?: string[];         // Prettier plugins to load
  overrides?: Array<{
    files: string | string[];
    options: Partial<PrettierConfig>;
  }>;
}
```

### 3. Vitest Configuration

**File**: `vitest.config.ts`

```typescript
interface VitestConfig {
  test: {
    environment: 'jsdom' | 'happy-dom' | 'node';
    include: string[];        // Test file patterns
    exclude?: string[];       // Patterns to exclude
    setupFiles?: string[];    // Setup files to run before tests
    globals?: boolean;        // Inject test globals
    coverage?: {
      provider: 'v8' | 'istanbul';
      reporter: ('text' | 'lcov' | 'html')[];
      thresholds?: {
        lines?: number;       // Minimum line coverage %
        functions?: number;   // Minimum function coverage %
        branches?: number;    // Minimum branch coverage %
        statements?: number;  // Minimum statement coverage %
      };
      include?: string[];
      exclude?: string[];
    };
  };
  plugins?: any[];
}
```

### 4. Lefthook Configuration

**File**: `lefthook.yml`

```typescript
interface LefthookConfig {
  'pre-commit'?: HookConfig;
  'pre-push'?: HookConfig;
  'commit-msg'?: HookConfig;
}

interface HookConfig {
  parallel?: boolean;         // Run jobs in parallel
  piped?: boolean;           // Run jobs sequentially, stop on failure
  jobs: Job[];
}

interface Job {
  name: string;              // Job display name
  run: string;               // Command to execute
  glob?: string;             // File pattern filter
  root?: string;             // Directory to run in
  files?: string;            // Custom file list command
  tags?: string[];           // Tags for filtering
  fail_text?: string;        // Custom failure message
}
```

### 5. GitHub Actions Workflow

**File**: `.github/workflows/ci.yml`

```typescript
interface GitHubWorkflow {
  name: string;
  on: {
    push?: { branches: string[] };
    pull_request?: { branches: string[] };
  };
  jobs: Record<string, {
    'runs-on': string;
    needs?: string[];
    steps: Array<{
      name?: string;
      uses?: string;
      run?: string;
      with?: Record<string, string>;
      env?: Record<string, string>;
    }>;
  }>;
}
```

### 6. Playwright Configuration

**File**: `playwright.config.ts`

```typescript
interface PlaywrightConfig {
  testDir: string;           // Test directory
  fullyParallel?: boolean;   // Run tests in parallel
  forbidOnly?: boolean;      // Fail if .only is committed
  retries?: number;          // Retry failed tests
  workers?: number;          // Parallel workers
  reporter: string | [string, object][];
  use: {
    baseURL?: string;        // Base URL for navigation
    trace?: 'on' | 'off' | 'on-first-retry';
  };
  projects?: Array<{
    name: string;
    use: object;
  }>;
}
```

---

## File Structure

### New Configuration Files

```text
/                              # Repository root
├── eslint.config.js           # ESLint 9 flat config
├── .prettierrc                # Prettier config
├── .prettierignore            # Prettier ignore patterns
├── vitest.config.ts           # Vitest configuration
├── vitest-setup.ts            # Test setup file
├── playwright.config.ts       # E2E test configuration
├── lefthook.yml              # Pre-commit hooks
└── .github/
    └── workflows/
        ├── ci.yml            # PR validation workflow
        └── build.yml         # Tauri build workflow
```

### Documentation Files

```text
docs/
├── architecture/
│   ├── overview.md           # Component diagram + descriptions
│   ├── data-flow.md          # Request/response flow
│   └── api-entities.md       # High-level API entity docs
└── adr/
    ├── template.md           # ADR template
    └── 001-ipc-http.md       # IPC decision record
```

---

## Entities from Spec

The spec defined these conceptual entities for documentation purposes:

| Entity | Purpose | Implementation |
|--------|---------|----------------|
| Quality Check Result | Linting output | Console output (not persisted) |
| Test Result | Test execution output | Console + CI artifacts |
| Coverage Report | Coverage metrics | HTML/lcov files |
| Build Artifact | Build output | Tauri binary |
| Architecture Document | System docs | Markdown files |
| ADR | Decision records | Markdown files |

None of these require database storage or API endpoints.

---

## Validation Rules

### ESLint Configuration

- Must use ESLint 9 flat config format
- Must include TypeScript and Svelte plugins
- Must use eslint-config-prettier to avoid conflicts

### Coverage Thresholds

- Minimum 80% line coverage
- Minimum 80% function coverage
- Minimum 80% branch coverage
- Minimum 80% statement coverage

### Pre-commit Hook Timeout

- Maximum 120 seconds for all jobs combined
- Parallel execution where possible

---

## Notes

This feature does not introduce new runtime data models. All "entities" are either:
1. Configuration files (static)
2. Build/test output (ephemeral)
3. Documentation (markdown files)
