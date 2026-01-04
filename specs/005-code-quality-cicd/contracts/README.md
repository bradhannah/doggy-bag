# API Contracts: Code Quality & CI/CD

**Feature Branch**: `005-code-quality-cicd`
**Date**: 2026-01-03

---

## Overview

This feature does not introduce new API endpoints. The feature focuses on:

- Development tooling (linting, testing, formatting)
- CI/CD configuration (GitHub Actions workflows)
- Documentation (architecture docs, ADRs)

All functionality is developer-facing and operates via CLI commands (make targets, bun scripts) rather than HTTP APIs.

---

## CLI Contracts

While there are no HTTP API contracts, this feature establishes the following CLI contracts:

### Make Targets

| Target        | Input | Output                           | Exit Codes        |
| ------------- | ----- | -------------------------------- | ----------------- |
| `make lint`   | None  | Lint violations (stdout)         | 0=pass, 1=fail    |
| `make format` | None  | Formatted file list (stdout)     | 0=success         |
| `make test`   | None  | Test results + coverage (stdout) | 0=pass, 1=fail    |
| `make check`  | None  | Type errors (stdout)             | 0=pass, 1=fail    |
| `make build`  | None  | Build artifacts                  | 0=success, 1=fail |

### Pre-commit Hook Contract

| Trigger                  | Checks Run                          | Behavior on Failure       |
| ------------------------ | ----------------------------------- | ------------------------- |
| `git commit`             | lint, format, typecheck, unit tests | Block commit, show errors |
| `git commit --no-verify` | None                                | Bypass (escape hatch)     |
| `git push`               | Full test suite                     | Block push, show errors   |

### CI/CD Contract

| Event              | Workflow    | Required Checks                               |
| ------------------ | ----------- | --------------------------------------------- |
| Push to any branch | `ci.yml`    | lint, typecheck, test, build                  |
| Pull request       | `ci.yml`    | lint, typecheck, test, build, coverage report |
| Push to main       | `build.yml` | Full Tauri build (macOS)                      |

---

## Related ADRs

- [001-ipc-http.md](./001-ipc-http.md) - IPC communication decision (HTTP over localhost)
