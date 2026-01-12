# Quickstart: Miscellaneous Fixes Round 4

**Branch**: `012-misc-fixes` | **Date**: 2026-01-11

## Overview

This release contains 10 tasks organized by implementation order. Tasks are grouped to minimize context switching and maximize code reuse.

## Prerequisites

- Development environment set up (`make dev` works)
- Familiarity with existing codebase patterns
- Read the [spec.md](./spec.md) and [data-model.md](./data-model.md)

## Implementation Order

### Phase A: Quick Wins (Tasks 3, 5, 6, 9)

These are small, isolated changes with minimal dependencies.

1. **Task 3: Allow $0 Amounts**
   - Update validation in 7 files
   - ~30 minutes

2. **Task 5: Hide System Categories**
   - Filter categories in 2 list components
   - Add category required validation
   - ~45 minutes

3. **Task 6: Fix Version Reporting**
   - Modify version-service.ts to read from tauri.conf.json
   - Update version numbers in 3 files
   - Update homebrew-release skill
   - ~30 minutes

4. **Task 9: Variable Rate Disables Interest Rate**
   - UI change in PaymentSourceForm
   - Add migration in service
   - ~30 minutes

### Phase B: Enhancements (Tasks 1, 4, 7, 8)

Medium complexity enhancements building on existing patterns.

5. **Task 4: Auto/Manual Pills**
   - Add payment_method to Income entity
   - Display pills in 2 list components
   - ~1 hour

6. **Task 7: Backup Notes**
   - Add modal before backup
   - Modify API to accept note
   - Display note icon in list
   - ~1 hour

7. **Task 8: Investment Account Type**
   - Add 'investment' to type enum
   - Update form and dropdown
   - Add migration
   - ~1.5 hours

8. **Task 1: Unsaved Changes Confirmation** (cross-cutting)
   - Implement dirty tracking pattern
   - Apply to 5 form components
   - ~2 hours

### Phase C: Major Feature (Task 10)

Large new feature requiring multiple components.

9. **Task 10: Insurance Claims Feature** (4-6 hours)
   - Backend: 3 new services, 3 new handlers
   - Frontend: 7 new components, 3 new stores
   - New navigation item and route

### Phase D: Page Redesign (Task 2)

10. **Task 2: Savings Page Redesign**
    - Add Contribution column
    - Implement auto-save
    - Modify month creation
    - ~2 hours

## Testing Strategy

Each task should be tested before moving to the next:

| Task    | Test Method                                                    |
| ------- | -------------------------------------------------------------- |
| Task 3  | Create $0 bill, verify save succeeds                           |
| Task 5  | View Manage > Bills, verify no Uncategorized/CC Payoffs        |
| Task 6  | Check Settings > About, verify version matches tauri.conf.json |
| Task 9  | Check Variable Rate, verify Interest Rate grays out            |
| Task 4  | View Manage > Bills/Incomes, verify pills display              |
| Task 7  | Click Backup Now, enter note, verify appears in list           |
| Task 8  | Create Investment Account type, verify auto-sets flags         |
| Task 1  | Edit form, click backdrop, verify modal appears                |
| Task 10 | Full flow: create plan, create claim, upload doc, submit       |
| Task 2  | Enter contribution, verify Est. EOM, verify auto-save          |

## File Touch Summary

Files modified by multiple tasks (order matters):

| File                                            | Tasks   |
| ----------------------------------------------- | ------- |
| `api/src/services/validation.ts`                | 3, 5    |
| `api/src/services/payment-sources-service.ts`   | 8, 9    |
| `src/components/Setup/PaymentSourceForm.svelte` | 1, 8, 9 |
| `src/components/Setup/BillForm.svelte`          | 1, 5    |
| `src/components/Setup/IncomeForm.svelte`        | 1, 4, 5 |
| `src/components/Setup/SetupPage.svelte`         | 10      |
| `src/stores/payment-sources.ts`                 | 8       |

## Estimated Total Time

| Phase     | Estimate        |
| --------- | --------------- |
| Phase A   | ~2 hours        |
| Phase B   | ~5.5 hours      |
| Phase C   | ~5 hours        |
| Phase D   | ~2 hours        |
| **Total** | **~14.5 hours** |

## Key Patterns to Follow

### Dirty Tracking (Task 1)

```typescript
// Store initial values on form load
let initialValues = { ...editingItem };

// Check if dirty before close
function isDirty(): boolean {
  return JSON.stringify(currentValues) !== JSON.stringify(initialValues);
}

// Handle backdrop click
function handleBackdropClick() {
  if (isDirty()) {
    showConfirmDialog = true;
  } else {
    onClose();
  }
}
```

### Auto-save (Task 2)

```typescript
async function handleFieldBlur(field: string, value: number) {
  await apiClient.put(`/api/months/${month}/savings-balances`, {
    [field]: { [accountId]: value },
  });
}
```

### Migration Pattern (Tasks 8, 9)

```typescript
// In service load/save
private migrate(data: PaymentSource[]): PaymentSource[] {
  return data.map(ps => {
    // TODO: Remove migration after next major version
    if (ps.type === 'bank_account' && ps.is_investment) {
      return { ...ps, type: 'investment' };
    }
    return ps;
  });
}
```

## Ready to Start

Run `/speckit.tasks` to generate the detailed task breakdown, or begin implementation following the order above.
