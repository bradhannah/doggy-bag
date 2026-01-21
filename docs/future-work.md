# Future Work

This document tracks planned improvements and technical debt that should be addressed in future development cycles.

## Category Type Cleanup

**Priority:** Low  
**Added:** 2026-01-20  
**Context:** User Story 7 (Savings Goals & Tracking)

### Background

When implementing savings goals, we introduced a new category type `'savings_goal'` to distinguish goal-related bills from regular variable expenses. This provides semantic clarity and enables filtering in the detailed view.

### Current State

The `CategoryType` union is:

```typescript
type CategoryType = 'bill' | 'income' | 'variable' | 'savings_goal';
```

The "Savings Goals" category (created via `ensureGoalsCategoryExists()`) uses the `'savings_goal'` type.

### Future Consideration

Some older "Goals" categories may still exist with `type: 'variable'`. While the migration logic in `ensureGoalsCategoryExists()` handles this for new goal operations, existing data may have inconsistencies.

**Potential improvements:**

1. **Data migration script**: Create a one-time migration to update any existing "Goals" categories from `type: 'variable'` to `type: 'savings_goal'`

2. **Validation tightening**: Once migration is complete, consider whether the `'variable'` type is still needed or if it can be deprecated

3. **Category cleanup UI**: Add UI for users to clean up duplicate or misnamed categories

### Files Involved

- `api/src/types/index.ts` - CategoryType definition
- `api/src/services/categories-service.ts` - ensureGoalsCategoryExists()
- `api/src/services/validation.ts` - validateCategoryType()
- `src/stores/categories.ts` - Frontend CategoryType

---

## Savings Goal Bill Linking

**Priority:** Medium  
**Added:** 2026-01-20  
**Context:** User Story 7 (Savings Goals & Tracking)

### Background

Bills can now be linked to savings goals via the `goal_id` field. This enables tracking savings progress through regular bill payments.

### Future Improvements

1. **Goal progress from bills**: Calculate saved_amount by summing paid occurrences of bills linked to a goal

2. **Goal completion detection**: Automatically detect when a goal's saved_amount reaches target_amount and prompt user to mark as "bought"

3. **Bill removal on goal completion**: When a goal is marked as "bought" or "abandoned", offer to deactivate linked bills

4. **Goal detail view**: Show linked bills and their payment history on the goal edit/detail page
