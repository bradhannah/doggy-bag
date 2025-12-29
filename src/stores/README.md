# Svelte Stores

This directory contains all Svelte stores for BudgetForFun application.

## Store Structure

### Data Stores (Sync with Backend API)

- bills.ts - Bills state management (default definitions + instances)
- incomes.ts - Incomes state management (default definitions + instances)
- payment-sources.ts - Payment sources state management
- expenses.ts - Expenses state management (variable + free-flowing)
- categories.ts - Categories state management

### Utility Stores

- undo.ts - Undo stack (previous 5 changes)
- ui.ts - UI state (current month, navigation, modals)

## Store Pattern

### Typical Store Structure

```typescript
import { writable } from 'svelte/store';

// Create writable store
const store = writable<DataType[]>([]);

// Export store
export const entityStore = store;

// Export actions
export const addEntity = (entity: DataType) => {
  entityStore.update(items => [...items, entity]);
};

export const updateEntity = (id: string, updates: Partial<DataType>) => {
  entityStore.update(items => 
    items.map(item => item.id === id ? { ...item, ...updates } : item)
  );
};

export const deleteEntity = (id: string) => {
  entityStore.update(items => items.filter(item => item.id !== id));
};
```

## Implementation Notes

- All stores are writable (no derived stores unless needed)
- Fetch from API on initialization
- Auto-update via polling or event (simple polling for MVP)
- Actions for add/update/delete
- Derived calculations (e.g., total income) computed with $: syntax in components

## API Integration

Each data store will:
1. Fetch entities from backend API on mount
2. Provide add/update/delete actions that call backend
3. Re-fetch on backend changes (poll or event)
4. Handle loading states and errors
