# Research: UI Polish & UX Improvements

**Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Research Areas

This document covers technical research for implementing the 12 UI/UX improvements specified in Feature 004.

---

## 1. Window Size Persistence (FR-001 to FR-003)

### Current State

- Tauri 2.x window configuration is in `src-tauri/tauri.conf.json`:
  ```json
  "windows": [{ "width": 800, "height": 600, ... }]
  ```
- App already uses `@tauri-apps/plugin-store` for zoom level persistence (`settings.json`)
- Pattern established in `src/stores/settings.ts` lines 82-131

### Tauri Window API Research

**Reading Window Size:**
```typescript
import { getCurrentWindow } from '@tauri-apps/api/window';

const window = getCurrentWindow();
const size = await window.outerSize(); // { width: number, height: number }
const position = await window.outerPosition(); // { x: number, y: number }
```

**Setting Window Size on Startup:**
```typescript
await window.setSize(new LogicalSize(savedWidth, savedHeight));
```

**Detecting Window Close:**
Two approaches:
1. **Rust-side (preferred)**: Use `on_window_event` in `lib.rs` to capture `CloseRequested` event
2. **Frontend-side**: Listen to `beforeunload` event (less reliable)

### Recommended Implementation

**Store settings in `settings.json`** (same as zoom):
```typescript
interface WindowState {
  width: number;
  height: number;
  x?: number;  // Optional position
  y?: number;
}
```

**Load on app start** (`src/routes/+layout.svelte`):
1. Load saved WindowState from Tauri Store
2. Call `window.setSize()` if saved dimensions exist
3. Validate window is visible on current display

**Save on window close** (Rust side in `lib.rs`):
```rust
.on_window_event(|window, event| {
    if let tauri::WindowEvent::CloseRequested { .. } = event {
        // Save window size to store before closing
    }
})
```

### Decision: Rust-side save, Frontend-side restore

- **Save**: Rust `on_window_event` for reliability
- **Restore**: Frontend `+layout.svelte` on mount for consistency with zoom
- **Store**: `settings.json` via plugin-store (key: `windowState`)
- **Default**: 800x600 (current default in tauri.conf.json)

---

## 2. Responsive Layout - Bills/Income Stacking (FR-004 to FR-006)

### Current State

The layout uses CSS container queries in `DetailedMonthView.svelte`:

```css
/* Line 343-345 */
.content-wrapper {
  container-type: inline-size;
  container-name: content;
}

/* Line 668-672 */
@container content (min-width: 1100px) {
  .sections-container {
    grid-template-columns: 1fr 1fr;
  }
}
```

### Problem Analysis

The current breakpoint (1100px) may not account for:
1. Left sidebar (260px for SummarySidebar)
2. Nav sidebar (220px)
3. Gap spacing (24px)

Available width = viewport - 220px (nav) - 260px (summary) - 24px (gap) - 40px (padding)
For 800px per section = 1600px + 544px = 2144px viewport minimum

**Current behavior**: At narrow widths, sections stack correctly, but user reports horizontal scrollbar appearing.

### Root Cause Investigation

Looking at the CSS:
- `.sections-container` defaults to `grid-template-columns: 1fr` (single column)
- Only becomes 2-column at `@container content (min-width: 1100px)`
- The issue may be individual section content causing overflow

### Solution Options

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Lower breakpoint to ~900px | Simple CSS change | May not fix root cause |
| B | Add `overflow-x: hidden` to container | Hides overflow | May cut off content |
| C | Fix internal component min-widths | Addresses root cause | More investigation needed |
| D | Use `flex-wrap` instead of grid | More flexible | Larger refactor |

### Decision: Option C + A

1. **Investigate** actual overflow source (likely bill/income row content)
2. **Add** `min-width: 0` to grid children to prevent blowout
3. **Lower** breakpoint to 900px for 2-column threshold
4. **Test** at various widths to confirm no horizontal scroll

### Implementation

```css
.sections-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

/* Stack at container < 900px */
@container content (min-width: 900px) {
  .sections-container {
    grid-template-columns: 1fr 1fr;
  }
}

/* Prevent grid child blowout */
.section {
  min-width: 0;
  overflow-x: hidden;
}
```

---

## 3. Category Visual States (FR-013 to FR-017)

### Current State

`CategorySection.svelte` renders categories with items. Need to add:
1. Detection of "all paid" or "empty" state
2. Visual styling (strikethrough, opacity)
3. Sorting logic

### State Detection

```typescript
// Computed in CategorySection.svelte
$: allPaid = section.items.length > 0 && section.items.every(item => item.is_paid);
$: isEmpty = section.items.length === 0;
$: isComplete = allPaid || isEmpty;
```

### Visual Styling

```css
.category-header.complete {
  opacity: 0.6;
}

.category-name.complete {
  text-decoration: line-through;
}

/* Keep [+] button visible and functional */
.add-button {
  opacity: 1 !important;
}
```

### Sorting Implementation

Sorting should happen at the parent level (`DetailedMonthView.svelte`):

```typescript
$: sortedBillSections = [...$detailedMonthData.billSections].sort((a, b) => {
  const aComplete = isComplete(a);
  const bComplete = isComplete(b);
  if (aComplete === bComplete) return 0;
  return aComplete ? 1 : -1; // Complete sections go to bottom
});
```

### Decision: Component-level styling, Parent-level sorting

- **Styling**: Each `CategorySection` handles its own visual state
- **Sorting**: `DetailedMonthView` sorts the sections array before rendering
- **Column Alignment**: Use same grid layout; strikethrough only on text, not row

---

## 4. Credit Card Payoff Balance Sync (FR-024 to FR-026)

### Current State

- CC payoff payments are recorded via `/api/months/{month}/bills/{instanceId}/paid` 
- Payment sources have `balance` field (stored in cents, negative for debt)
- No current mechanism to prompt balance update after payment

### User Flow

1. User clicks "Mark Paid" on CC payoff bill row
2. Payment is recorded successfully
3. **NEW**: Modal appears: "Would you like to update your [Card Name] balance?"
4. Modal shows: Current balance, Payment amount, New balance
5. User clicks "Update Balance" or "Skip"
6. If Update: Call existing balance update endpoint

### API Endpoint (existing)

Balance updates already work via:
```
PUT /api/months/{month}/bank-balances
Body: { [paymentSourceId]: newBalanceCents }
```

### Modal Component

Create `CCBalanceSyncModal.svelte`:

```svelte
<script>
  export let paymentSourceName: string;
  export let currentBalance: number; // cents, negative
  export let paymentAmount: number;  // cents, positive
  export let onConfirm: (newBalance: number) => void;
  export let onSkip: () => void;
  
  $: newBalance = currentBalance + paymentAmount; // Less negative
</script>
```

### Trigger Logic

In `BillRow.svelte` or parent, after successful mark-paid for CC payoff:

```typescript
if (bill.is_cc_payoff && result.success) {
  // Find payment source
  const ps = paymentSources.find(p => p.id === bill.payment_source_id);
  if (ps) {
    showCCSyncModal = true;
    syncModalData = { ps, paymentAmount: bill.actual_amount };
  }
}
```

### Decision: New modal component, triggered from BillRow

- **Modal**: `CCBalanceSyncModal.svelte` in `DetailedView/`
- **Trigger**: After successful CC payoff mark-paid
- **Update**: Uses existing PUT bank-balances endpoint
- **UI**: Right-side drawer style (consistent with other modals)

---

## 5. Compact Mode Persistence (FR-018 to FR-019)

### Current State

- `compactMode` is local state in `DetailedMonthView.svelte` (line 115)
- `widthMode` is persisted in localStorage via `src/stores/ui.ts` (line 63-106)
- Zoom is persisted via Tauri Store in `settings.ts`

### Recommended Pattern

Follow the `widthMode` pattern (simpler than Tauri Store for UI preference):

```typescript
// In src/stores/ui.ts
function getStoredCompactMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('budgetforfun-compact-mode') === 'true';
}

function createCompactModeStore() {
  const { subscribe, set } = writable<boolean>(false);
  
  if (typeof window !== 'undefined') {
    set(getStoredCompactMode());
  }
  
  return {
    subscribe,
    toggle: () => {
      let current = false;
      subscribe(v => current = v)();
      const next = !current;
      set(next);
      localStorage.setItem('budgetforfun-compact-mode', String(next));
    },
    set: (value: boolean) => {
      set(value);
      localStorage.setItem('budgetforfun-compact-mode', String(value));
    }
  };
}

export const compactMode = createCompactModeStore();
```

### Decision: localStorage store (same pattern as widthMode)

- **Store location**: `src/stores/ui.ts`
- **Storage**: localStorage (not Tauri Store - simpler for UI pref)
- **Key**: `budgetforfun-compact-mode`
- **Migration**: Remove local `compactMode` state from `DetailedMonthView.svelte`

---

## 6. Scroll Position Stability (FR-020 to FR-022)

### Problem Analysis

Page may jump to top when:
1. Opening edit drawer (modal)
2. Saving edits (data refresh)
3. Adding new items (data refresh)

### Root Cause

Likely culprit: `detailedMonth.refresh()` triggers full re-render, causing scroll reset.

### Solution Approaches

| Approach | Implementation | When to Use |
|----------|----------------|-------------|
| Save/Restore | Store `scrollY` before refresh, restore after | Edit saves |
| ScrollIntoView | Call `element.scrollIntoView()` on new item | New item creation |
| Keyed blocks | Ensure Svelte `{#each}` has stable keys | All cases |

### Implementation

**For edits (maintain position):**
```typescript
async function handleSave() {
  const scrollY = window.scrollY;
  await saveData();
  await refreshData();
  // Wait for DOM update
  await tick();
  window.scrollTo(0, scrollY);
}
```

**For new items (scroll to new item):**
```typescript
async function handleCreate() {
  const result = await createItem();
  await refreshData();
  await tick();
  // Scroll new item into view
  const newElement = document.querySelector(`[data-id="${result.id}"]`);
  newElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
```

### Decision: Save/restore for edits, scrollIntoView for creates

- **Edits**: Capture scrollY, restore after tick
- **Creates**: Add data-id to rows, scrollIntoView on new element
- **Drawer open**: No scroll change needed (drawer is fixed position)

---

## 7. Navigation Reorganization (FR-007 to FR-009)

### Current State

`Navigation.svelte` structure (lines 175-256):
1. Main nav: Dashboard, Details, Manage Months
2. Separator
3. Bottom nav: Setup, Settings

### Target State

1. Main nav: Dashboard, Details
2. Separator
3. Secondary: Manage Months, Budget Config (renamed from Setup)
4. Footer area: Zoom, Undo, Export/Import, Settings (small)

### Implementation

Restructure nav-list sections:
```svelte
<!-- Main navigation -->
<ul class="nav-list">
  <li>Dashboard</li>
  <li>Details</li>
</ul>

<div class="nav-separator"></div>

<ul class="nav-list secondary-nav">
  <li>Manage Months</li>
  <li>Budget Config</li>  <!-- Renamed from Setup -->
</ul>

<!-- Footer (existing) with Settings added -->
<div class="sidebar-footer">
  <!-- Zoom controls -->
  <!-- Undo -->
  <!-- Backup buttons -->
  <div class="footer-separator"></div>
  <a href="/settings" class="footer-link">Settings</a>
</div>
```

### Decision: Simple reordering and rename

- **Rename**: "Setup" -> "Budget Config" (text change only)
- **Move**: "Manage Months" to secondary section
- **Move**: "Settings" to footer as smaller link
- **Files**: Only `Navigation.svelte` needs changes

---

## 8. Visual Cleanup Items

### Bank Accounts Header Green (FR-011)

Current in `SummarySidebar.svelte` line 194:
```svelte
<h3 class="box-title">Bank Accounts & Cash</h3>
```

Current CSS (line 462):
```css
.box-title { color: #888; }
```

Fix:
```css
.box-title.asset-title { color: #4ade80; }
```

### Remove Net Worth (FR-012)

Current in `SummarySidebar.svelte` lines 357-367:
```svelte
<div class="box-section">
  <div class="section-subtotal networth-row">
    <span class="subtotal-label">Net Worth</span>
    <span class="subtotal-value">...</span>
  </div>
</div>
```

Simply remove this entire block.

### Remove Header Leftover (FR-010)

Current in `DetailedMonthView.svelte` lines 227-237:
```svelte
<div class="leftover-display" class:negative={...}>
  ...
</div>
```

Remove this block. Leftover is already shown in `SummarySidebar.svelte`.

---

## 9. Remove Delete from CC Payoffs (FR-023)

### Current State

CC payoff bills are dynamically generated based on `pay_off_monthly` flag on payment sources. They appear as regular bill rows with delete buttons.

### Detection

Bill rows need to identify if they're CC payoff entries:
```typescript
// In bill instance data
$: isCCPayoff = bill.is_cc_payoff ?? false;
```

### Implementation

In `BillRow.svelte`:
```svelte
{#if !readOnly && !isCCPayoff}
  <button class="delete-btn" on:click={handleDelete}>Delete</button>
{/if}
```

---

## 10. Generate Anonymized Example Data (FR-027 to FR-031)

### Script Location

`scripts/generate-example-data.ts`

### Anonymization Strategy

1. **Names**: Replace with generic labels
   - Bills: "Bill 1", "Bill 2", ...
   - Incomes: "Income 1", "Income 2", ...
   - Payment Sources: "Bank 1", "Credit Card 1", ...
   - Categories: Keep original (not sensitive)

2. **Amounts**: Randomize ±20%
   ```typescript
   function randomizeAmount(cents: number): number {
     const factor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
     return Math.round(cents * factor);
   }
   ```

3. **Dates**: Shift to current period
   - If data is from 2025, shift to 2026
   - Maintain relative patterns (bi-weekly stays bi-weekly)

4. **IDs**: Generate new UUIDs

5. **Output**: Write to `data/example/` (new directory)

### Script Outline

```typescript
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';

async function generateExampleData() {
  // Read original data
  const bills = JSON.parse(await readFile('data/entities/bills.json', 'utf-8'));
  const incomes = JSON.parse(await readFile('data/entities/incomes.json', 'utf-8'));
  // ... etc
  
  // Anonymize
  const anonBills = bills.map((b, i) => ({
    ...b,
    id: crypto.randomUUID(),
    name: `Bill ${i + 1}`,
    amount: randomizeAmount(b.amount),
  }));
  
  // Write to example directory
  await mkdir('data/example/entities', { recursive: true });
  await writeFile('data/example/entities/bills.json', JSON.stringify(anonBills, null, 2));
}
```

---

## Summary of Decisions

| Feature | Decision | Rationale |
|---------|----------|-----------|
| Window size | Rust save, Frontend restore | Reliability + consistency |
| Responsive | Lower breakpoint + min-width fix | Address root cause |
| Category states | Component styling, parent sorting | Clean separation |
| CC sync modal | New modal component | Isolated feature |
| Compact mode | localStorage store | Simple, matches widthMode |
| Scroll position | Save/restore + scrollIntoView | Different needs for edit vs create |
| Navigation | Simple restructure | Minimal changes |
| Bank header | Add CSS class | One-line change |
| Net Worth | Remove block | Simple deletion |
| Header leftover | Remove block | Simple deletion |
| CC delete | Conditional render | Check isCCPayoff flag |
| Example data | Standalone script | Non-invasive |

---

## Files to Modify

### Frontend (src/)
- `routes/+layout.svelte` - Window size restore
- `stores/ui.ts` - Add compactMode store
- `stores/settings.ts` - Add windowState load/save helpers
- `components/Navigation.svelte` - Reorganize nav
- `components/DetailedView/DetailedMonthView.svelte` - Remove header leftover, fix responsive
- `components/DetailedView/SummarySidebar.svelte` - Green header, remove net worth
- `components/DetailedView/CategorySection.svelte` - Complete states, sorting
- `components/DetailedView/BillRow.svelte` - Hide delete for CC payoffs

### New Components
- `components/DetailedView/CCBalanceSyncModal.svelte`

### Tauri (src-tauri/)
- `src/lib.rs` - Window size save on close

### Scripts
- `scripts/generate-example-data.ts` (new)

---

**Version**: 1.0.0 | **Created**: 2026-01-03
