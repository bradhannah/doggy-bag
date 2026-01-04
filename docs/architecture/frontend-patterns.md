# Frontend Patterns Guide

**Last Updated**: 2026-01-03  
**Framework**: Svelte 5 + SvelteKit 2.x

---

## Overview

The BudgetForFun frontend follows consistent patterns for state management, component organization, and API integration. This guide documents these patterns for maintainability and onboarding.

---

## State Management

### Store Pattern

All application state is managed through Svelte stores in `src/stores/`.

**Standard Store Structure**:

```typescript
// src/stores/example.ts
import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';

// Types
interface Example {
  id: string;
  name: string;
}

// State
const examples = writable<Example[]>([]);
const loading = writable(false);
const error = writable<string | null>(null);

// Derived state
const activeExamples = derived(examples, $examples => 
  $examples.filter(e => e.isActive)
);

// Actions
async function loadExamples() {
  loading.set(true);
  error.set(null);
  try {
    const data = await apiClient.get('/api/examples');
    examples.set(data);
  } catch (e) {
    error.set(e.message);
  } finally {
    loading.set(false);
  }
}

async function createExample(example: Partial<Example>) {
  // Optimistic update
  const tempId = crypto.randomUUID();
  const optimistic = { ...example, id: tempId };
  examples.update(list => [...list, optimistic]);
  
  try {
    const created = await apiClient.post('/api/examples', example);
    // Replace optimistic with real
    examples.update(list => 
      list.map(e => e.id === tempId ? created : e)
    );
  } catch (e) {
    // Rollback
    examples.update(list => list.filter(e => e.id !== tempId));
    throw e;
  }
}

// Export
export const exampleStore = {
  subscribe: examples.subscribe,
  loading,
  error,
  active: activeExamples,
  load: loadExamples,
  create: createExample,
};
```

### Current Stores

| Store | Purpose | Lines |
|-------|---------|-------|
| `bills.ts` | Bill templates | ~150 |
| `incomes.ts` | Income templates | ~150 |
| `categories.ts` | Category management | ~120 |
| `payment-sources.ts` | Bank accounts, credit cards | ~150 |
| `detailed-month.ts` | Monthly budget data | ~580 |
| `months.ts` | Month navigation | ~100 |
| `payments.ts` | Payment tracking | ~100 |
| `settings.ts` | App settings + Tauri Store | ~200 |
| `toast.ts` | Toast notifications | ~50 |
| `ui.ts` | UI state (sidebar, modals) | ~80 |
| `undo.ts` | Undo stack | ~100 |

### Optimistic Updates

The pattern for optimistic updates:

```typescript
async function updateItem(id: string, changes: Partial<Item>) {
  // 1. Capture current state for rollback
  let previousState: Item[];
  items.update(list => {
    previousState = [...list];
    return list.map(item => 
      item.id === id ? { ...item, ...changes } : item
    );
  });
  
  // 2. Make API call
  try {
    await apiClient.put('/api/items', id, changes);
  } catch (e) {
    // 3. Rollback on error
    items.set(previousState);
    toast.error('Failed to update');
    throw e;
  }
}
```

---

## Component Organization

### Directory Structure

```
src/components/
├── Dashboard/           # Main dashboard view
│   ├── Dashboard.svelte
│   ├── DashboardCard.svelte
│   └── ...
├── DetailedView/        # Monthly budget detail
│   ├── DetailedMonthView.svelte
│   ├── BillSection.svelte
│   ├── IncomeSection.svelte
│   └── ...
├── Setup/               # Setup wizard
│   ├── SetupWizard.svelte
│   ├── Step1.svelte
│   └── ...
├── shared/              # Reusable components
│   ├── Modal.svelte
│   ├── Button.svelte
│   └── ...
└── Navigation.svelte    # Main navigation
```

### Component Conventions

1. **One component per file** - Named after the component
2. **Props interface** - Define props with TypeScript
3. **Events** - Use `createEventDispatcher` for child-to-parent
4. **Slots** - Use for flexible content injection

**Example Component**:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Props
  interface Props {
    title: string;
    amount: number;
    variant?: 'default' | 'highlight';
  }
  
  let { title, amount, variant = 'default' }: Props = $props();
  
  // Events
  const dispatch = createEventDispatcher<{
    click: { id: string };
    delete: void;
  }>();
  
  // Derived
  const formattedAmount = $derived(
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100)
  );
</script>

<div class="card {variant}">
  <h3>{title}</h3>
  <span class="amount">{formattedAmount}</span>
  <slot name="actions" />
</div>

<style>
  .card { /* styles */ }
  .highlight { /* styles */ }
</style>
```

---

## API Integration

### API Client

Located at `src/lib/api/client.ts`:

```typescript
export const apiClient = {
  async get(path: string) { ... },
  async post(path: string, body: unknown) { ... },
  async put(path: string, id: string, body: unknown) { ... },
  async delete(path: string, id: string) { ... },
  async putPath(path: string, body: unknown) { ... },
  async deletePath(path: string) { ... },
};
```

### Usage in Stores

```typescript
import { apiClient } from '$lib/api/client';

async function loadBills() {
  const bills = await apiClient.get('/api/bills');
  billsStore.set(bills);
}

async function createBill(bill: CreateBillRequest) {
  const created = await apiClient.post('/api/bills', bill);
  billsStore.update(list => [...list, created]);
}
```

### Error Handling

```typescript
try {
  await apiClient.post('/api/bills', bill);
  toast.success('Bill created');
} catch (e) {
  toast.error(e.message || 'Failed to create bill');
}
```

---

## Routing

SvelteKit file-based routing in `src/routes/`:

```
src/routes/
├── +layout.svelte       # Root layout (navigation)
├── +layout.ts           # Layout load function
├── +page.svelte         # Home/dashboard
├── manage/
│   └── +page.svelte     # Manage entities
├── month/
│   └── [month]/
│       └── +page.svelte # Monthly detail view
├── settings/
│   └── +page.svelte     # App settings
└── setup/
    └── +page.svelte     # Setup wizard
```

### Route Parameters

```svelte
<!-- src/routes/month/[month]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  
  // Access route param
  const month = $derived($page.params.month);
</script>
```

---

## Styling Conventions

### CSS Variables (Theme)

```css
:root {
  --primary: #24c8db;
  --primary-hover: #1ea8b8;
  --background: #1a1a1a;
  --surface: #2a2a2a;
  --text: #ffffff;
  --text-muted: #888888;
  --border: #3a3a3a;
  --error: #ef4444;
  --success: #22c55e;
  --warning: #f59e0b;
}
```

### Component Styles

- Use `<style>` block (scoped by default)
- Use CSS variables for theming
- Use flexbox/grid for layout

---

## Known Issues

See [Technical Debt Registry](./technical-debt.md) for:
- TD-F1: Navigation.svelte too large
- TD-F2: Repetitive optimistic update logic
- TD-F3: Inconsistent persistence patterns
- TD-F5: Debug console.logs in client.ts
- TD-F6: No frontend logging utility

---

## References

- [Svelte 5 Documentation](https://svelte.dev/docs)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Architecture Overview](./overview.md)
- [Backend Patterns](./backend-patterns.md)
