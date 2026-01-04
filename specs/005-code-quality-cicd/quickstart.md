# Quickstart: Code Quality & CI/CD

**Feature Branch**: `005-code-quality-cicd`
**Date**: 2026-01-03
**Estimated Setup Time**: 15 minutes

---

## Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Bun | 1.3.5+ | `bun --version` |
| Rust/Cargo | 1.75+ | `cargo --version` |
| Git | 2.x | `git --version` |

**Note**: Node.js is NOT required. All tooling runs on Bun.

---

## Quick Setup (After Implementation)

Once this feature is implemented, setting up quality tooling on a new machine takes 3 commands:

```bash
# 1. Clone repository
git clone https://github.com/your-org/BudgetForFun.git
cd BudgetForFun

# 2. Install all dependencies (includes quality tools)
make install-dev

# 3. Verify setup
make lint && make test
```

The `make install-dev` command will:
- Install Bun dependencies (`bun install`)
- Install pre-commit hooks (`bunx lefthook install`)
- Verify all tools are working

---

## Available Commands

### Quality Checks

| Command | Purpose | Duration |
|---------|---------|----------|
| `make lint` | Run ESLint on all TypeScript/Svelte files | ~10-30s |
| `make lint-fix` | Auto-fix linting issues where possible | ~10-30s |
| `make format` | Format all files with Prettier | ~5-10s |
| `make format-check` | Check formatting without modifying | ~5s |
| `make check` | Run TypeScript type checking | ~10-20s |

### Testing

| Command | Purpose | Duration |
|---------|---------|----------|
| `make test` | Run all tests with coverage | ~1-5min |
| `make test-backend` | Run backend tests only (Bun) | ~30s |
| `make test-frontend` | Run frontend tests only (Vitest) | ~1-2min |
| `make test-e2e` | Run E2E tests (Playwright) | ~2-5min |

### Build

| Command | Purpose | Duration |
|---------|---------|----------|
| `make build` | Build Tauri application | ~2-5min |
| `make dev` | Start development server | N/A (ongoing) |

---

## Pre-commit Hooks

Pre-commit hooks are installed automatically via `make install-dev`. They run on every commit:

1. **Lint** - ESLint checks on staged TypeScript/Svelte files
2. **Format Check** - Prettier validation on staged files
3. **Type Check** - svelte-check for type errors
4. **Unit Tests** - Fast unit tests

### Bypassing Hooks (Emergency Only)

```bash
# Use --no-verify to skip hooks
git commit --no-verify -m "emergency fix"
```

**Warning**: Bypassing hooks should be rare. CI will still run all checks.

---

## CI/CD Pipeline

All pull requests trigger the CI pipeline:

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│    Lint     │────▶│  Type Check  │────▶│     Test      │
└─────────────┘     └──────────────┘     └───────────────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │     Build     │
                                        └───────────────┘
```

### CI Checks

| Check | Blocking? | Details |
|-------|-----------|---------|
| Lint | Yes | Must pass ESLint |
| Type Check | Yes | Must pass svelte-check |
| Tests | Yes | Must pass all tests |
| Coverage | Warning | Warns if below 80% |
| Build | Yes | Must build successfully |

---

## Configuration Files

| File | Purpose |
|------|---------|
| `eslint.config.js` | ESLint 9 configuration |
| `.prettierrc` | Prettier formatting rules |
| `vitest.config.ts` | Vitest test configuration |
| `playwright.config.ts` | E2E test configuration |
| `lefthook.yml` | Pre-commit hook configuration |
| `.github/workflows/ci.yml` | GitHub Actions CI workflow |

---

## Troubleshooting

### "bunx: command not found"

Ensure Bun is installed and in your PATH:
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or ~/.zshrc
```

### Pre-commit hooks not running

Reinstall hooks:
```bash
bunx lefthook install
```

### ESLint errors on fresh clone

Install dependencies first:
```bash
bun install
```

### Coverage below threshold

The project requires 80% line coverage. Run with coverage report:
```bash
bun run test -- --coverage
```

---

## Common Workflows

### Before Opening a PR

```bash
# 1. Run all checks
make lint && make check && make test

# 2. Format code
make format

# 3. Commit changes (hooks will run automatically)
git add .
git commit -m "feat: your feature"
```

### Adding a New Test

1. Create test file: `*.test.ts` or `*.spec.ts`
2. Run tests: `make test`
3. Check coverage: `make test` (coverage report included)

### Viewing Coverage Report

```bash
# After running tests, open HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
```

---

## Documentation

Architecture documentation is in the `docs/` directory:

- `docs/architecture/overview.md` - System component diagram
- `docs/architecture/data-flow.md` - Request/response flow
- `docs/architecture/api-entities.md` - High-level API entities
- `docs/adr/` - Architecture Decision Records

---

## Success Criteria Verification

After setup, verify these work:

| Criterion | Verification Command | Expected |
|-----------|---------------------|----------|
| Lint runs | `make lint` | Completes in <30s |
| Tests run | `make test` | All pass, >80% coverage |
| Build works | `make build` | Zero warnings |
| Hooks work | `git commit` (with staged changes) | Hooks execute |
