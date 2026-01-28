# Future Work

Ideas and features that have been considered but deferred for future implementation.

## Recurring Expected Insurance Expenses

**Context**: When implementing the Expected Insurance Expenses feature, we considered adding the ability to schedule recurring expected expenses (e.g., "massage every 2 weeks").

**Why Deferred**: This adds significant complexity:

1. **UI complexity**: Need a recurring pattern builder (every X days/weeks, specific days, end date or count)
2. **Auto-generation logic**: When to create the next expected expense? On app load? Background job?
3. **Edge cases**: What happens when you skip an appointment? Cancel the series? Modify one instance?
4. **Calendar integration**: Users might expect sync with external calendars
5. **Conflict with existing patterns**: Bills already have recurring patterns - would this duplicate or extend that?

**Current Approach**: Users manually create each expected expense one at a time. This is simpler and covers the primary use case of "I know I have appointments on specific dates."

**Potential Future Implementation**:

- Add a "Recurring" toggle to the Expected Expense form
- Allow patterns: weekly, bi-weekly, monthly
- Auto-generate expected expenses N months ahead (configurable)
- Add "Skip" and "Cancel series" actions
- Consider reusing the Bill recurring pattern infrastructure
