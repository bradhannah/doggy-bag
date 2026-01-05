# Implementation Tasks: CI/CD Pipeline & Test Coverage

**Branch**: `007-cicd-test-coverage` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)

## Task Summary

| Phase | Description                  | Priority | Est. Tasks |
| ----- | ---------------------------- | -------- | ---------- |
| 1     | Frontend Test Infrastructure | P1       | 12         |
| 2     | PR Validation Workflow       | P1       | 3          |
| 3     | Release Workflow             | P2       | 3          |
| 4     | Documentation                | P2       | 2          |

**Total**: 20 tasks

---

## Phase 1: Frontend Test Infrastructure (P1)

### 1.1 Create API Client Mock Utility

- [ ] Create `src/lib/api/__mocks__/client.ts` with mock implementations
- [ ] Document mock usage pattern in test files

### 1.2 Store Tests

#### 1.2.1 Bills Store

- [ ] Create `src/stores/bills.test.ts`
- [ ] Test: loadBills() success and error
- [ ] Test: createBill() with mock API
- [ ] Test: updateBill() with mock API
- [ ] Test: deleteBill() with mock API
- [ ] Test: derived stores (billsWithContribution, billsByCategory, totalFixedCosts)
- [ ] Test: calculateMonthlyContribution() for all billing periods

#### 1.2.2 Incomes Store

- [ ] Create `src/stores/incomes.test.ts`
- [ ] Test: loadIncomes() success and error
- [ ] Test: createIncome(), updateIncome(), deleteIncome()
- [ ] Test: derived stores (activeIncomes, totalMonthlyIncome)

#### 1.2.3 Categories Store

- [ ] Create `src/stores/categories.test.ts`
- [ ] Test: loadCategories() success and error
- [ ] Test: CRUD operations
- [ ] Test: derived stores (billCategories, incomeCategories)

#### 1.2.4 Payment Sources Store

- [ ] Create `src/stores/payment-sources.test.ts`
- [ ] Test: loadPaymentSources() success and error
- [ ] Test: CRUD operations
- [ ] Test: derived stores

#### 1.2.5 Payments Store

- [ ] Create `src/stores/payments.test.ts`
- [ ] Test: payment operations
- [ ] Test: derived calculations

#### 1.2.6 Months Store

- [ ] Create `src/stores/months.test.ts`
- [ ] Test: loadMonth() for different month formats
- [ ] Test: month navigation

#### 1.2.7 Detailed Month Store

- [ ] Create `src/stores/detailed-month.test.ts`
- [ ] Test: loadDetailedMonth() success and error
- [ ] Test: complex derived calculations

#### 1.2.8 Settings Store

- [ ] Create `src/stores/settings.test.ts`
- [ ] Test: loadSettings() success and error
- [ ] Test: Tauri API mocks

#### 1.2.9 Undo Store

- [ ] Create `src/stores/undo.test.ts`
- [ ] Test: undo stack operations

### 1.3 Component Tests (Critical UI)

#### 1.3.1 Shared Components

- [ ] Create `src/components/shared/Toast.test.ts`
- [ ] Create `src/components/shared/ConfirmDialog.test.ts`
- [ ] Create `src/components/shared/ToastContainer.test.ts`

#### 1.3.2 Navigation

- [ ] Create `src/components/Navigation.test.ts`
- [ ] Test: navigation links render correctly
- [ ] Test: sidebar collapse/expand

### 1.4 API Client Tests

- [ ] Create `src/lib/api/client.test.ts`
- [ ] Test: get(), post(), put(), delete() methods
- [ ] Test: error handling

### 1.5 Update Coverage Thresholds

- [ ] Update `vitest.config.ts` thresholds to 80%

---

## Phase 2: PR Validation Workflow (P1)

### 2.1 Create Workflow Directory

- [ ] Create `.github/workflows/` directory

### 2.2 Create PR Validation Workflow

- [ ] Create `.github/workflows/pr-validation.yml`
- [ ] Copy from `specs/007-cicd-test-coverage/contracts/pr-validation.yml`
- [ ] Adjust paths and commands for project structure

### 2.3 Test Workflow

- [ ] Push branch and open test PR
- [ ] Verify all jobs pass
- [ ] Verify timing <10 minutes

---

## Phase 3: Release Workflow (P2)

### 3.1 Create Release Workflow

- [ ] Create `.github/workflows/release.yml`
- [ ] Copy from `specs/007-cicd-test-coverage/contracts/release.yml`
- [ ] Adjust for project structure

### 3.2 Test Release Build Locally

- [ ] Run `make build` locally
- [ ] Verify DMG creation
- [ ] Test ad-hoc signing

### 3.3 Test Release Workflow

- [ ] Create test tag (e.g., v0.1.0-test)
- [ ] Verify workflow runs
- [ ] Verify DMG attached to release
- [ ] Delete test release

---

## Phase 4: Documentation (P2)

### 4.1 Create RELEASING.md

- [ ] Document version bump process
- [ ] Document tagging process
- [ ] Include Gatekeeper bypass instructions
- [ ] Include troubleshooting section

### 4.2 Create CHANGELOG.md

- [ ] Create initial structure
- [ ] Document v0.1.0 changes
- [ ] Follow Keep a Changelog format

---

## Execution Order

```
Week 1: Phase 1 (Tests)
├── Day 1: API mock + bills.test.ts + incomes.test.ts
├── Day 2: categories.test.ts + payment-sources.test.ts
├── Day 3: payments.test.ts + months.test.ts + detailed-month.test.ts
├── Day 4: settings.test.ts + undo.test.ts
└── Day 5: Component tests + coverage threshold update

Week 2: Phases 2-4 (CI/CD + Docs)
├── Day 1: PR validation workflow + test PR
├── Day 2: Release workflow + local testing
├── Day 3: RELEASING.md + CHANGELOG.md
└── Day 4: Final testing + cleanup
```

## Definition of Done

- [ ] All store modules have >=80% test coverage
- [ ] PR validation workflow runs successfully
- [ ] Release workflow creates DMG on tag push
- [ ] RELEASING.md documents complete process
- [ ] CHANGELOG.md exists with v0.1.0 entry
- [ ] Total test count exceeds 600
