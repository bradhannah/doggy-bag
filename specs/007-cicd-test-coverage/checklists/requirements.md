# Requirements Checklist: CI/CD Pipeline & Test Coverage

**Branch**: `007-cicd-test-coverage` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)

## Functional Requirements

### Frontend Testing

- [ ] **FR-001**: System MUST have unit tests for all Svelte store modules achieving >=80% line coverage
  - [ ] bills.test.ts
  - [ ] incomes.test.ts
  - [ ] categories.test.ts
  - [ ] payment-sources.test.ts
  - [ ] payments.test.ts
  - [ ] months.test.ts
  - [ ] detailed-month.test.ts
  - [ ] settings.test.ts
  - [ ] undo.test.ts
  - [x] toast.test.ts (existing - 19 tests)
  - [x] ui.test.ts (existing - 25 tests)

- [ ] **FR-002**: System MUST have unit tests for critical UI components achieving >=80% line coverage
  - [ ] Dashboard.test.ts
  - [ ] DetailedMonthView.test.ts
  - [ ] SetupPage.test.ts
  - [ ] Navigation.test.ts
  - [ ] Shared components (Toast, ConfirmDialog, etc.)

- [ ] **FR-003**: Tests MUST mock API calls to avoid external dependencies
  - [ ] apiClient mock created and documented

- [ ] **FR-004**: Coverage reports MUST be generated in lcov and HTML formats
  - [ ] vitest.config.ts configured with ['text', 'lcov', 'html']

- [ ] **FR-005**: Vitest MUST run with Node.js (not Bun) due to coverage provider compatibility
  - [ ] Makefile uses `npx vitest` for coverage

### CI/CD Pipeline - PR Validation

- [ ] **FR-006**: System MUST have GitHub Actions workflow triggered on pull requests to main
  - [ ] `.github/workflows/pr-validation.yml` created
  - [ ] Triggers on `pull_request` to `main`

- [ ] **FR-007**: PR workflow MUST run ESLint and Prettier checks
  - [ ] `lint-format` job defined
  - [ ] Uses `bun run lint`
  - [ ] Uses `bun run format-check`

- [ ] **FR-008**: PR workflow MUST run TypeScript type checking (svelte-check)
  - [ ] `type-check` job defined
  - [ ] Uses `bun run check`

- [ ] **FR-009**: PR workflow MUST run backend tests with Bun
  - [ ] `test-backend` job defined
  - [ ] Uses `bun test` in `api/` directory

- [ ] **FR-010**: PR workflow MUST run frontend tests with Vitest
  - [ ] `test-frontend` job defined
  - [ ] Uses `npx vitest run --coverage`

- [ ] **FR-011**: PR workflow MUST verify build succeeds (Tauri build check)
  - [ ] `build` job defined
  - [ ] Uses `cargo build` in `src-tauri/`

- [ ] **FR-012**: PR workflow MUST block merge if any check fails
  - [ ] Branch protection rules configured (manual step)

- [ ] **FR-013**: PR workflow MUST complete in under 10 minutes
  - [ ] Verified via test PR

### CI/CD Pipeline - Release

- [ ] **FR-014**: System MUST have GitHub Actions workflow triggered on version tags (v*.*.\*)
  - [ ] `.github/workflows/release.yml` created
  - [ ] Triggers on tags matching `v*.*.*`

- [ ] **FR-015**: Release workflow MUST build macOS ARM64 application using Tauri
  - [ ] Uses `macos-latest` runner
  - [ ] Targets `aarch64-apple-darwin`

- [ ] **FR-016**: Release workflow MUST apply ad-hoc code signing (`codesign --sign -`)
  - [ ] `codesign --sign - --force --deep` step added

- [ ] **FR-017**: Release workflow MUST generate DMG installer
  - [ ] DMG created by Tauri build
  - [ ] DMG file located and renamed

- [ ] **FR-018**: Release workflow MUST attach DMG to GitHub Release
  - [ ] Uses `softprops/action-gh-release`
  - [ ] DMG uploaded to release

- [ ] **FR-019**: Release workflow MUST use only free tools (no paid certificates)
  - [ ] No Apple Developer account required
  - [ ] Ad-hoc signing only

### Versioning & Documentation

- [ ] **FR-020**: Version MUST follow Semantic Versioning (MAJOR.MINOR.PATCH)
  - [ ] Documented in RELEASING.md

- [ ] **FR-021**: Version MUST be defined in tauri.conf.json and package.json (kept in sync)
  - [ ] Documented in RELEASING.md

- [ ] **FR-022**: System MUST include RELEASING.md documenting the release process
  - [ ] RELEASING.md created
  - [ ] Contains step-by-step instructions

- [ ] **FR-023**: RELEASING.md MUST include Gatekeeper bypass instructions for users
  - [ ] Instructions for right-click → Open

- [ ] **FR-024**: System MUST maintain CHANGELOG.md with notable changes per version
  - [ ] CHANGELOG.md created
  - [ ] Contains initial version (0.1.0)

## Success Criteria

- [ ] **SC-001**: Frontend test coverage reaches >=80% line coverage
  - [ ] `npx vitest run --coverage` shows >=80%

- [ ] **SC-002**: Combined project test count exceeds 600 tests (currently 515)
  - [ ] Backend: 469 + Frontend: 131+ = 600+

- [ ] **SC-003**: PR validation workflow completes in under 10 minutes
  - [ ] Verified via GitHub Actions run

- [ ] **SC-004**: 100% of PRs are validated by CI before merge is allowed
  - [ ] Branch protection enabled (manual)

- [ ] **SC-005**: macOS DMG is successfully generated and attached to GitHub Releases
  - [ ] Test release created

- [ ] **SC-006**: Users can download, install, and run the app from the DMG
  - [ ] Manual verification

- [ ] **SC-007**: Release process is documented and can be followed by any team member
  - [ ] RELEASING.md reviewed

## Implementation Order

### Phase 1: Test Infrastructure (P1)

1. [ ] Create API client mock utility
2. [ ] Write store tests (9 modules)
3. [ ] Write critical component tests
4. [ ] Update coverage thresholds to 80%

### Phase 2: PR Validation Workflow (P1)

1. [ ] Create `.github/workflows/` directory
2. [ ] Create `pr-validation.yml`
3. [ ] Test with a PR
4. [ ] Configure branch protection (manual)

### Phase 3: Release Workflow (P2)

1. [ ] Create `release.yml`
2. [ ] Test with a tag push
3. [ ] Verify DMG creation and signing

### Phase 4: Documentation (P2)

1. [ ] Create RELEASING.md
2. [ ] Create CHANGELOG.md
3. [ ] Update README if needed
