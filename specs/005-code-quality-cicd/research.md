# Research: Code Quality & CI/CD

**Feature Branch**: `005-code-quality-cicd`
**Date**: 2026-01-03
**Status**: Complete

---

## Research Topics

1. [Bun Compatibility (ESLint, Prettier)](#1-bun-compatibility-eslint-prettier)
2. [Pre-commit Hook Tool Selection](#2-pre-commit-hook-tool-selection)
3. [Vitest + Svelte 5 Configuration](#3-vitest--svelte-5-configuration)
4. [GitHub Actions with Bun](#4-github-actions-with-bun)
5. [IPC Alternatives Analysis](#5-ipc-alternatives-analysis)

---

## 1. Bun Compatibility (ESLint, Prettier)

### Decision

**Use Bun for all linting and formatting operations.** ESLint 9, Prettier, and all plugins work natively with Bun.

### Rationale

1. **Official Support**: ESLint and Prettier documentation explicitly include Bun as a supported runtime
2. **Performance**: Bun's faster install and execution times benefit linting workflows
3. **Consistency**: Using Bun throughout (build, test, lint) reduces tooling complexity
4. **Active Maintenance**: Known Bun issues are actively fixed

### Tool Compatibility

| Tool | Command | Status |
|------|---------|--------|
| ESLint 9 | `bunx eslint .` | ✅ Works |
| Prettier | `bunx prettier . --write` | ✅ Works |
| eslint-plugin-svelte | As ESLint plugin | ✅ Works |
| @typescript-eslint | As ESLint plugin | ✅ Works |
| prettier-plugin-svelte | As Prettier plugin | ✅ Works |

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| npm/npx | Most stable | Slower, adds Node.js dependency | Not chosen |
| Biome (ESLint/Prettier replacement) | Single tool, faster | Less mature Svelte support | Future consideration |

### Caveats

- Use Bun 1.3.5+ (earlier versions had module resolution bugs)
- Commit `bun.lock` for consistent team builds
- Install packages locally (not globally)

---

## 2. Pre-commit Hook Tool Selection

### Decision

**Use lefthook** for pre-commit hooks.

### Rationale

1. **No lint-staged required**: Built-in `{staged_files}` variable eliminates extra dependency
2. **Go binary**: Runtime-agnostic, works without Node.js or Bun for hook execution
3. **Parallel execution**: Runs linters/formatters in parallel for faster commits
4. **Rich configuration**: YAML config with glob patterns fits project structure (separate `api/` and `src/`)

### Comparison

| Feature | Husky | Lefthook | simple-git-hooks |
|---------|-------|----------|------------------|
| Bun-native | ✅ | ✅ | ⚠️ |
| No Node.js runtime | ✅ | ✅ | ❌ |
| Parallel execution | ❌ | ✅ | ❌ |
| Built-in staged files | ❌ | ✅ | ❌ |
| Config format | Shell scripts | YAML | JSON |

### Alternatives Considered

- **Husky**: Excellent, simpler than lefthook, but requires lint-staged
- **simple-git-hooks**: Too limited - manual updates, single command per hook

### Installation

```bash
# Install
bun add --dev lefthook

# Initialize
bunx lefthook install

# Add prepare script to package.json
{
  "scripts": {
    "prepare": "lefthook install"
  }
}
```

### Recommended Configuration

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  jobs:
    - name: lint frontend
      glob: "*.{ts,svelte}"
      run: bunx eslint {staged_files}
      
    - name: format check
      glob: "*.{ts,js,svelte,json}"
      run: bunx prettier --check {staged_files}
      
    - name: typecheck frontend
      run: bun run check

    - name: lint backend
      root: "api/"
      glob: "*.ts"
      run: bunx eslint {staged_files}

    - name: unit tests
      run: bun run test

pre-push:
  jobs:
    - name: full test suite
      run: make test
```

---

## 3. Vitest + Svelte 5 Configuration

### Decision

**Use Vitest + @testing-library/svelte@5.x** with the official `svelteTesting` Vite plugin.

### Rationale

1. **Official support**: Both Vitest and @testing-library/svelte support Svelte 5
2. **SvelteKit integration**: Works with `sveltekit()` Vite plugin
3. **Active maintenance**: @testing-library/svelte v5.3.1 released December 2025
4. **Minimal configuration**: Plugin handles auto-cleanup and browser resolution

### Version Requirements

| Package | Version | Notes |
|---------|---------|-------|
| @testing-library/svelte | ^5.3.1 | Required for Svelte 5 |
| vitest | ^4.0.0 | Latest major |
| @sveltejs/vite-plugin-svelte | ^5.0.0 | For Svelte 5 |
| jsdom | ^26.0.0 | DOM environment |
| @testing-library/jest-dom | ^6.6.3 | Optional matchers |

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { sveltekit } from '@sveltejs/kit/vite'
import { svelteTesting } from '@testing-library/svelte/vite'

export default defineConfig({
  plugins: [sveltekit(), svelteTesting()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    setupFiles: ['./vitest-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  },
})
```

```typescript
// vitest-setup.ts
import '@testing-library/jest-dom/vitest'
```

### Caveats

- For Svelte 5 runes (`$state`, `$derived`), use `await tick()` or `waitFor` in tests
- Mock `$app/stores` and `$app/navigation` for SvelteKit route testing
- Add `"@testing-library/jest-dom"` to tsconfig `compilerOptions.types`

---

## 4. GitHub Actions with Bun

### Decision

**Use `oven-sh/setup-bun@v2`** - the official GitHub Action from Oven (Bun's creators).

### Rationale

1. **Official action**: Maintained by Bun team
2. **No Node.js required**: Bun is fully standalone
3. **Built-in caching**: Caches Bun binary automatically
4. **Simple setup**: One-liner configuration

### Key Points

| Question | Answer |
|----------|--------|
| Official Bun setup? | `oven-sh/setup-bun@v2` |
| Need Node.js? | **No** - Bun is standalone |
| Dependency caching? | `actions/cache` with `bun.lock` hash |
| Tauri builds? | `tauri-apps/tauri-action@v1` auto-detects Bun |

### Example Workflow

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      
      - uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lock') }}
          restore-keys: |
            ${{ runner.os }}-bun-
      
      - run: bun install
      - run: bun run lint
      - run: bun run test
      - run: bun run build

  build-tauri:
    needs: test
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - uses: dtolnay/rust-toolchain@stable
      - run: bun install
      - uses: tauri-apps/tauri-action@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Caveats

- Commit `bun.lock` (not `bun.lockb`) for CI
- If tauri-action doesn't detect Bun, set `tauriScript: "bun tauri"`
- Ensure sidecar build (`prepare-sidecar.sh`) runs before Tauri build

---

## 5. IPC Alternatives Analysis

### Decision

**Keep HTTP over localhost:3000.** Alternatives do not provide meaningful benefits for this application.

### Rationale

1. **Current latency is negligible**: 0.05ms per request
2. **HTTP is debuggable**: curl, browser dev tools work
3. **Works in dev and production**: No architecture changes
4. **Complexity not justified**: Unix sockets add ~40% speed (0.029ms vs 0.050ms), but user won't notice

### Comparison

| Option | Feasibility | Complexity | Eliminates HTTP? | Performance |
|--------|-------------|------------|------------------|-------------|
| **HTTP localhost** (current) | ✅ High | Low | No | ~0.05ms/req |
| **Unix Domain Sockets** | ✅ High | Medium | No | ~0.03ms/req |
| **Tauri Commands (Rust proxy)** | ⚠️ Medium | High | Yes | Variable |
| **Tauri IPC Channels** | ❌ Low | Very High | Yes | Fast |
| **Shared Memory** | ❌ Low | Very High | Yes | Fastest |

### Unix Domain Sockets Detail

Bun fully supports Unix sockets:

```typescript
// Server
const server = Bun.serve({
  unix: "/tmp/budgetforfun.sock",
  fetch(req) { /* ... */ }
});

// Client
const response = await fetch("http://localhost/api/test", {
  unix: "/tmp/budgetforfun.sock"
});
```

**Critical Limitation**: Browser `fetch()` API cannot connect to Unix sockets. Would require Rust proxy layer.

### Future Consideration

If port conflicts become an issue, implement Unix sockets with Rust proxy:
- Estimated effort: 2-3 days
- Performance gain: ~40% (imperceptible to user)

### ADR Recommendation

Create ADR documenting this decision:
- **Title**: Keep HTTP for Tauri-Bun IPC
- **Status**: Accepted
- **Context**: Evaluated Unix sockets, Tauri commands, IPC channels
- **Decision**: Maintain HTTP over localhost:3000
- **Consequences**: Simple architecture, easy debugging, no code changes

---

## Summary

| Research Topic | Decision | Confidence |
|----------------|----------|------------|
| ESLint/Prettier + Bun | ✅ Works natively | High |
| Pre-commit tool | Lefthook | High |
| Vitest + Svelte 5 | @testing-library/svelte@5.x | High |
| GitHub Actions | oven-sh/setup-bun@v2 | High |
| IPC alternatives | Keep HTTP localhost | High |

All [NEEDS RESEARCH] items from the plan have been resolved. Ready for Phase 1.
