# Testing Guide

## Overview

BudgetForFun uses a dual test runner setup:

- **Backend**: Bun's native test runner (`bun test`)
- **Frontend**: Vitest (for Svelte/SvelteKit integration)

## Running Tests

### Quick Commands

```bash
# Run all tests
make test

# Run backend tests only
make test-backend

# Run frontend tests only
make test-frontend

# Run E2E tests
make test-e2e
```

### With Coverage

```bash
# Backend coverage (works with Bun natively)
make test-backend-coverage

# Frontend coverage (requires Node.js - see note below)
make test-frontend-coverage

# Both (skips frontend if Node.js not installed)
make test-coverage
```

## Coverage Goals

| Metric                 | Goal  | Current        |
| ---------------------- | ----- | -------------- |
| Backend line coverage  | >=80% | ~94%           |
| Frontend line coverage | >=80% | Measured in CI |
| Total test count       | >600  | 681            |

## Node.js Exception for Frontend Coverage

> **This is the only exception to the "no Node.js" rule in this project.**

### Why Node.js is Required

Vitest's coverage provider (`@vitest/coverage-v8`) depends on `node:inspector`, which Bun hasn't implemented yet.

- **Tracking issue**: https://github.com/oven-sh/bun/issues/2445
- **Status**: Active development (PR series in progress)

### Running Frontend Coverage Locally (macOS)

1. Install NVM (Node Version Manager) if you don't have it:

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   ```

2. Restart your terminal or run:

   ```bash
   source ~/.zshrc
   ```

3. Install Node.js 22 (LTS):

   ```bash
   nvm install 22
   nvm use 22
   ```

4. Run coverage:

   ```bash
   make test-frontend-coverage
   # or directly:
   npx vitest run --coverage
   ```

**Tip**: To automatically use Node.js 22 in this project, the `.nvmrc` file is already configured.

### In CI

GitHub Actions automatically uses Node.js for frontend tests with coverage. The coverage report is uploaded as an artifact on each PR.

## Test Structure

### Backend Tests (`api/src/**/*.test.ts`)

- **Runner**: `bun test`
- **Location**: Co-located with source files
- **Coverage**: Native Bun coverage (`bun test --coverage`)

### Frontend Tests (`src/**/*.test.ts`)

- **Runner**: Vitest
- **Location**: Co-located with source files (stores) or in test directories
- **Environment**: jsdom (for DOM APIs)
- **Coverage**: V8 provider (requires Node.js)

## Writing Tests

See existing test files for patterns:

- Backend: `api/src/services/*.test.ts`
- Frontend stores: `src/stores/*.test.ts`
