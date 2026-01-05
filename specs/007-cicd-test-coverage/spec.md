# Feature Specification: CI/CD Pipeline & Test Coverage

**Feature Branch**: `007-cicd-test-coverage`  
**Created**: 2026-01-04  
**Status**: Draft  
**Input**: Introduce remaining tests to maintain 80% test coverage including FrontEnd. Build CI/CD pipeline for GitHub with macOS DMG installer generation. Provide versioning and release advice.

---

## User Scenarios & Testing

### User Story 1 - Developer Achieves 80% Frontend Test Coverage (Priority: P1)

A developer adds comprehensive tests for Svelte components and stores, achieving 80% line coverage across the frontend codebase. Tests cover component rendering, user interactions, store state management, and API integration mocks. This uses a balanced approach covering both stores (data layer) and critical UI components.

**Why this priority**: The backend already has 93% coverage, but frontend is at ~5%. Achieving 80% frontend coverage ensures the entire application meets quality standards and catches regressions before they reach users.

**Independent Test**: Can be tested by running `make test-frontend` with coverage and verifying the report shows >=80% line coverage.

**Acceptance Scenarios**:

1. **Given** the frontend codebase, **When** `make test-frontend` runs with coverage, **Then** report shows >=80% line coverage
2. **Given** a Svelte store module, **When** tests are written, **Then** they verify state initialization, mutations, subscriptions, and error handling
3. **Given** a critical UI component (Dashboard, DetailedView), **When** tests are written, **Then** they cover rendering, props, user events, and edge cases
4. **Given** a component that calls APIs, **When** tests run, **Then** API calls are mocked and responses are verified

---

### User Story 2 - CI Pipeline Validates Every Pull Request (Priority: P1)

When a pull request is opened or updated, GitHub Actions automatically runs the full validation suite including linting, type checking, tests (frontend + backend), and build verification. Failed checks block the merge button.

**Why this priority**: Automated CI is essential for maintaining code quality across all contributions. It catches issues that bypass local pre-commit hooks and ensures consistent validation.

**Independent Test**: Can be tested by opening a PR with intentional failures and verifying GitHub Actions reports failures with clear details.

**Acceptance Scenarios**:

1. **Given** a PR is opened or updated, **When** GitHub Actions runs, **Then** lint, format check, type check, backend tests, frontend tests, and build all execute
2. **Given** any validation step fails, **When** results are reported, **Then** PR shows failed status with link to logs
3. **Given** all validations pass, **When** results are reported, **Then** PR shows success status
4. **Given** the CI workflow, **When** it runs on a typical PR, **Then** it completes in under 10 minutes

---

### User Story 3 - Release Generates macOS DMG Installer (Priority: P2)

When a version tag is pushed (e.g., `v0.2.0`), GitHub Actions builds a macOS DMG installer with ad-hoc signing and attaches it to the GitHub Release. Users can download and install the app.

**Why this priority**: Distributable builds are essential for sharing the application. This depends on CI being established first (P1).

**Independent Test**: Can be tested by pushing a version tag and verifying the GitHub Release has an attached DMG that installs and runs correctly.

**Acceptance Scenarios**:

1. **Given** a version tag is pushed (e.g., `v0.2.0`), **When** release workflow runs, **Then** macOS ARM64 DMG is built and attached to GitHub Release
2. **Given** the DMG is built, **When** ad-hoc signing is applied, **Then** `codesign --sign -` succeeds without errors
3. **Given** a user downloads the DMG, **When** they open it, **Then** they see the app icon with Applications folder shortcut
4. **Given** Gatekeeper blocks the app, **When** user right-clicks and selects Open, **Then** app launches and functions correctly
5. **Given** release documentation, **When** user references it, **Then** they find clear Gatekeeper bypass instructions

---

### User Story 4 - Team Follows Versioning and Release Strategy (Priority: P2)

The team has a documented process for semantic versioning, creating releases, and maintaining a changelog. Releases are feature-based and manually triggered.

**Why this priority**: Clear versioning prevents confusion and enables users to track changes. This is documentation that supports the release workflow.

**Independent Test**: Can be tested by following the documented release process and verifying a new version is correctly published.

**Acceptance Scenarios**:

1. **Given** a feature spec is complete, **When** release is prepared, **Then** version is bumped following semantic versioning (0.MINOR.PATCH for pre-1.0)
2. **Given** version is updated, **When** tag is pushed, **Then** release workflow triggers automatically
3. **Given** a release is published, **When** user views GitHub Release, **Then** they see release notes describing changes
4. **Given** RELEASING.md documentation, **When** developer references it, **Then** they understand the complete release process

---

### Edge Cases

- What happens if CI fails due to flaky tests?
  - _Resolution: Implement retry mechanism for known flaky scenarios; persistent failures block merge_
- What happens if the macOS runner doesn't have required tools?
  - _Resolution: Workflow installs Rust, Bun, and Tauri CLI as needed_
- What happens if version tags are inconsistent across files?
  - _Resolution: Document single source of truth; consider automated version sync in future_
- What happens if DMG build fails on ARM64?
  - _Resolution: Use `macos-latest` runner which supports ARM64; document troubleshooting steps_
- How do users install on Intel Macs?
  - _Resolution: Initial release targets ARM64 only; Intel builds can be added later if needed_

---

## Requirements

### Functional Requirements

**Frontend Testing**

- **FR-001**: System MUST have unit tests for all Svelte store modules achieving >=80% line coverage
- **FR-002**: System MUST have unit tests for critical UI components (Dashboard, DetailedView, Setup) achieving >=80% line coverage
- **FR-003**: Tests MUST mock API calls to avoid external dependencies
- **FR-004**: Coverage reports MUST be generated in lcov and HTML formats
- **FR-005**: Vitest MUST run with Node.js (not Bun) due to coverage provider compatibility

**CI/CD Pipeline - PR Validation**

- **FR-006**: System MUST have GitHub Actions workflow triggered on pull requests to main
- **FR-007**: PR workflow MUST run ESLint and Prettier checks
- **FR-008**: PR workflow MUST run TypeScript type checking (svelte-check)
- **FR-009**: PR workflow MUST run backend tests with Bun
- **FR-010**: PR workflow MUST run frontend tests with Vitest
- **FR-011**: PR workflow MUST verify build succeeds (Tauri build check)
- **FR-012**: PR workflow MUST block merge if any check fails
- **FR-013**: PR workflow MUST complete in under 10 minutes

**CI/CD Pipeline - Release**

- **FR-014**: System MUST have GitHub Actions workflow triggered on version tags (v*.*.\*)
- **FR-015**: Release workflow MUST build macOS ARM64 application using Tauri
- **FR-016**: Release workflow MUST apply ad-hoc code signing (`codesign --sign -`)
- **FR-017**: Release workflow MUST generate DMG installer
- **FR-018**: Release workflow MUST attach DMG to GitHub Release
- **FR-019**: Release workflow MUST use only free tools (no paid certificates)

**Versioning & Documentation**

- **FR-020**: Version MUST follow Semantic Versioning (MAJOR.MINOR.PATCH)
- **FR-021**: Version MUST be defined in tauri.conf.json and package.json (kept in sync)
- **FR-022**: System MUST include RELEASING.md documenting the release process
- **FR-023**: RELEASING.md MUST include Gatekeeper bypass instructions for users
- **FR-024**: System MUST maintain CHANGELOG.md with notable changes per version

### Key Entities

- **Test Suite**: Collection of test files covering a code area (frontend stores, frontend components, backend services)
- **Coverage Report**: Metrics showing tested vs untested code (file, lines covered, percentage, uncovered lines)
- **CI Workflow**: GitHub Actions configuration defining validation steps (triggers, jobs, steps)
- **Release Artifact**: Built application package for distribution (DMG file, version, platform)
- **Version**: Semantic version identifier (major, minor, patch components)

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Frontend test coverage reaches >=80% line coverage
- **SC-002**: Combined project test count exceeds 600 tests (currently 515)
- **SC-003**: PR validation workflow completes in under 10 minutes
- **SC-004**: 100% of PRs are validated by CI before merge is allowed
- **SC-005**: macOS DMG is successfully generated and attached to GitHub Releases
- **SC-006**: Users can download, install, and run the app from the DMG
- **SC-007**: Release process is documented and can be followed by any team member

---

## Assumptions

1. **GitHub Actions**: CI/CD platform (confirmed by user)
2. **macOS ARM64 only**: Initial release targets Apple Silicon; Intel support deferred
3. **Ad-hoc signing**: Free signing without Apple Developer account; users accept Gatekeeper bypass
4. **Node.js for Vitest coverage**: Due to Bun incompatibility with v8 coverage provider
5. **Manual releases**: No automated release on merge; developer pushes tag to trigger
6. **Pre-1.0 versioning**: MINOR bumps for features, PATCH for fixes (no MAJOR changes yet)
7. **macos-latest runner**: GitHub's macOS runner includes Xcode, codesign, and supports ARM64 builds

---

## Out of Scope

- Windows/Linux builds (future enhancement)
- Intel macOS builds (can be added if users request)
- Apple Developer code signing and notarization ($99/year)
- Automated release on merge to main
- End-to-end Playwright tests in CI (deferred to future spec)
- Coverage badges on README (nice-to-have, not required)

---

## Versioning Strategy (Reference)

### Semantic Versioning Rules (Pre-1.0)

| Change Type                 | Version Bump    | Example        |
| --------------------------- | --------------- | -------------- |
| New feature (spec complete) | MINOR           | 0.1.0 -> 0.2.0 |
| Bug fix                     | PATCH           | 0.2.0 -> 0.2.1 |
| Breaking change             | MINOR (pre-1.0) | 0.2.1 -> 0.3.0 |

### Release Process

1. Complete feature development and merge to main
2. Update version in `tauri.conf.json` and `package.json`
3. Update `CHANGELOG.md` with changes
4. Commit: `chore: bump version to 0.2.0`
5. Tag: `git tag v0.2.0 && git push origin v0.2.0`
6. GitHub Actions builds and publishes DMG to Release
