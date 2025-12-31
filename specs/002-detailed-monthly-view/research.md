# Research: Detailed Monthly View

**Feature**: [spec.md](./spec.md)  
**Date**: 2025-12-31

---

## Overview

This document captures research findings for implementing the Detailed Monthly View feature. All technical decisions are documented with rationale and alternatives considered.

---

## 1. Partial Payment Tracking

### Decision
Create a new `Payment` entity to track individual payments toward a bill. Store payments as an array within BillInstance rather than a separate JSON file.

### Rationale
- Keeps payment data co-located with bill instance (no extra file I/O)
- Simple array allows multiple payments per bill
- Easy to calculate total paid vs remaining
- Aligns with existing MonthlyData structure

### Alternatives Considered
1. **Single paid_amount field**: Rejected - doesn't track payment history or dates
2. **Separate payments.json file**: Rejected - adds complexity, requires cross-file lookups
3. **Running balance field**: Rejected - doesn't capture individual payment events

### Implementation
```typescript
interface Payment {
  id: string;
  amount: number;
  date: string;  // ISO date string
  created_at: string;
}

interface BillInstance {
  // ... existing fields
  expected_amount: number;  // From default bill
  actual_amount?: number;   // User-entered total (for non-partial)
  payments: Payment[];      // For partial payments
  is_adhoc: boolean;
}
```

---

## 2. Due Date Implementation

### Decision
Add `due_day` field (1-31) to Bill and Income entities. Calculate full due date at display time by combining with current month.

### Rationale
- Simple single field covers most use cases
- No complex recurrence patterns needed
- Handles month-end edge cases (day 31 → last day of short months)
- Aligns with user's mental model ("rent is due on the 1st")

### Alternatives Considered
1. **Full date field per instance**: Rejected - requires manual entry each month
2. **No due dates**: Rejected - user specifically requested overdue indicators
3. **Complex recurrence (like cron)**: Rejected - overkill for budgeting app

### Edge Case Handling
- Due day 31 in February → Use last day (28/29)
- Due day 30 in February → Use last day (28/29)
- Calculate via: `Math.min(due_day, daysInMonth)`

---

## 3. Category Ordering and Colors

### Decision
Add `sort_order` (number) and `color` (hex string) fields to Category entity. Add `type` field to distinguish bill vs income categories.

### Rationale
- `sort_order` enables drag-and-drop reordering without changing IDs
- `color` as hex string gives full flexibility
- `type` field separates bill categories from income categories
- Simple schema extension, backward compatible

### Alternatives Considered
1. **Position-based (array index)**: Rejected - fragile when adding/removing categories
2. **Color as enum**: Rejected - limits customization
3. **Shared categories for bills and income**: Rejected - user wants separate ordering

### Implementation
```typescript
interface Category {
  // ... existing fields
  sort_order: number;      // 0, 1, 2, ... (lower = first)
  color: string;           // "#3b82f6" hex format
  type: 'bill' | 'income'; // Separates bill vs income categories
}
```

### Default Colors
| Category | Default Color |
|----------|---------------|
| Home | #3b82f6 (blue) |
| Debt | #ef4444 (red) |
| Utilities | #f59e0b (amber) |
| Streaming | #8b5cf6 (purple) |
| Transportation | #10b981 (green) |
| Entertainment | #ec4899 (pink) |
| Insurance | #06b6d4 (cyan) |
| Subscriptions | #6366f1 (indigo) |
| Variable | #f97316 (orange) |
| Ad-hoc | #64748b (slate) |

---

## 4. Ad-hoc Items

### Decision
Use `is_adhoc` boolean flag on BillInstance/IncomeInstance. Ad-hoc items have no `bill_id`/`income_id` (null reference).

### Rationale
- Reuses existing instance structure (no new entity type)
- Clear distinction: `is_adhoc: true` + `bill_id: null` = ad-hoc item
- Easy to convert to regular: Create new Bill, update instance to reference it
- Appears in AD-HOC category section automatically

### Alternatives Considered
1. **Separate AdHocExpense entity**: Rejected - duplicates BillInstance structure
2. **Special category_id for ad-hoc**: Rejected - conflates category with item type
3. **FreeFlowingExpense as ad-hoc**: Rejected - already serves different purpose

### "Make Regular" Flow
1. User clicks "Make Regular?" on ad-hoc item
2. Drawer opens with pre-filled form (name, amount, category, payment source)
3. User selects category, due date, billing period
4. On save: Create new Bill entity, update BillInstance.bill_id to reference it
5. Instance is_adhoc remains true (historical record)

---

## 5. Expected vs Actual Columns

### Decision
Store both `expected_amount` (from default) and `actual_amount` (user-entered) on instances. Leftover calculation uses only actual_amount.

### Rationale
- Preserves original expected for comparison
- Actual used for real-world accuracy
- Amber highlighting when actual != expected
- Partial payments: actual = sum of payments

### Calculation Rules
```typescript
// For leftover calculation
const getEffectiveAmount = (instance: BillInstance): number => {
  if (instance.payments.length > 0) {
    // Partial payments: sum of all payments
    return instance.payments.reduce((sum, p) => sum + p.amount, 0);
  }
  // Non-partial: use actual if entered, otherwise 0 (not included)
  return instance.actual_amount ?? 0;
};
```

---

## 6. Section Tallies

### Decision
Calculate tallies client-side using derived Svelte stores. Three columns: Expected, Actual, Remaining.

### Rationale
- Real-time updates without API calls
- Simple reactive computation
- Remaining = unpaid expected + partial payment remainders

### Tally Calculations
```typescript
// Bills section tally
const billsTally = {
  expected: bills.reduce((sum, b) => sum + b.expected_amount, 0),
  actual: bills.reduce((sum, b) => sum + getEffectiveAmount(b), 0),
  remaining: bills.reduce((sum, b) => {
    if (b.payments.length > 0) {
      // Partial: remaining = expected - sum(payments)
      const paid = b.payments.reduce((s, p) => s + p.amount, 0);
      return sum + Math.max(0, b.expected_amount - paid);
    }
    if (!b.is_paid && b.actual_amount === undefined) {
      // Unpaid with no actual: count expected as remaining
      return sum + b.expected_amount;
    }
    return sum;
  }, 0)
};
```

---

## 7. Svelte Drag-and-Drop for Categories

### Decision
Implement custom drag-and-drop using native HTML5 drag events. No external library.

### Rationale
- Aligns with constitution (no external UI libraries)
- HTML5 drag events are well-supported
- Simple use case (reorder list)
- ~50 lines of code

### Implementation Approach
```svelte
<script>
  let draggedIndex = null;
  
  function handleDragStart(e, index) {
    draggedIndex = index;
    e.dataTransfer.effectAllowed = 'move';
  }
  
  function handleDragOver(e, index) {
    e.preventDefault();
    if (draggedIndex !== index) {
      // Reorder array
      const item = categories[draggedIndex];
      categories.splice(draggedIndex, 1);
      categories.splice(index, 0, item);
      categories = categories; // Trigger reactivity
      draggedIndex = index;
    }
  }
  
  function handleDragEnd() {
    // Update sort_order values and save
    categories.forEach((cat, i) => cat.sort_order = i);
    saveCategories();
    draggedIndex = null;
  }
</script>
```

---

## 8. Color Picker Component

### Decision
Build simple custom color picker with preset swatches + hex input.

### Rationale
- Aligns with constitution (no external UI libraries)
- Preset swatches cover 90% of use cases
- Hex input for advanced users
- ~100 lines of code

### Implementation Approach
```svelte
<script>
  export let value = '#3b82f6';
  const presets = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', ...];
</script>

<div class="color-picker">
  <div class="swatches">
    {#each presets as color}
      <button 
        class="swatch" 
        style="background: {color}"
        class:selected={value === color}
        on:click={() => value = color}
      />
    {/each}
  </div>
  <input type="text" bind:value placeholder="#000000" />
</div>
```

---

## 9. Route Structure

### Decision
New route `/month/[month]` for Detailed View. Dashboard at `/` remains high-level summary.

### Rationale
- Clear URL structure: `/month/2025-01` is intuitive
- Shareable/bookmarkable URLs
- SvelteKit dynamic route `[month]` parameter
- Dashboard untouched (backward compatible)

### Navigation Flow
1. Dashboard shows summary with "View Details →" button
2. Click navigates to `/month/2025-01`
3. Detailed View has "← Dashboard" back link
4. Month selector in Detailed View changes URL

---

## 10. Income Categories (Default)

### Decision
Pre-populate income categories similar to bill categories.

### Default Income Categories
| Name | Color | Sort Order |
|------|-------|------------|
| Salary | #10b981 (green) | 0 |
| Freelance/Contract | #8b5cf6 (purple) | 1 |
| Investment | #3b82f6 (blue) | 2 |
| Government | #f59e0b (amber) | 3 |
| Other | #64748b (slate) | 4 |
| Ad-hoc | #ec4899 (pink) | 5 |

---

## Summary of Entity Extensions

### Category (Extended)
```typescript
interface Category {
  id: string;
  name: string;
  is_predefined: boolean;
  sort_order: number;      // NEW
  color: string;           // NEW
  type: 'bill' | 'income'; // NEW
  created_at: string;
  updated_at: string;
}
```

### Bill/Income (Extended)
```typescript
interface Bill {
  // ... existing fields
  due_day?: number;  // NEW: 1-31
}

interface Income {
  // ... existing fields
  due_day?: number;  // NEW: 1-31
}
```

### BillInstance/IncomeInstance (Extended)
```typescript
interface BillInstance {
  id: string;
  bill_id: string | null;   // null for ad-hoc
  month: string;
  expected_amount: number;  // NEW: from default
  actual_amount?: number;   // NEW: user-entered
  payments: Payment[];      // NEW: partial payments
  is_default: boolean;
  is_paid: boolean;
  is_adhoc: boolean;        // NEW
  due_date?: string;        // NEW: calculated
  created_at: string;
  updated_at: string;
}

interface Payment {          // NEW entity
  id: string;
  amount: number;
  date: string;
  created_at: string;
}
```

---

## API Endpoints (New/Extended)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/categories | Extended: returns with sort_order, color, type |
| PUT | /api/categories/:id | Extended: updates sort_order, color |
| PUT | /api/categories/reorder | NEW: Bulk update sort_order |
| POST | /api/months/:month/bills/:id/payments | NEW: Add partial payment |
| DELETE | /api/months/:month/bills/:id/payments/:paymentId | NEW: Remove payment |
| POST | /api/months/:month/adhoc/bills | NEW: Create ad-hoc bill |
| POST | /api/months/:month/adhoc/incomes | NEW: Create ad-hoc income |
| POST | /api/months/:month/adhoc/:id/make-regular | NEW: Convert to regular |

---

**Research Complete**: All technical decisions documented. Ready for Phase 1 design.
