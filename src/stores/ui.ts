// UI Store - Manages UI state including current month selection

import { writable, derived } from 'svelte/store';

// Get current month in YYYY-MM format
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Get previous month
function getPreviousMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  if (m === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(m - 1).padStart(2, '0')}`;
}

// Get next month
function getNextMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  if (m === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(m + 1).padStart(2, '0')}`;
}

// Format month for display (e.g., "January 2025")
function formatMonthDisplay(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Current month store
export const currentMonth = writable<string>(getCurrentMonth());

// Derived store for display format
export const currentMonthDisplay = derived(currentMonth, ($currentMonth) =>
  formatMonthDisplay($currentMonth)
);

// Navigation actions
export function goToPreviousMonth() {
  currentMonth.update((m) => getPreviousMonth(m));
}

export function goToNextMonth() {
  currentMonth.update((m) => getNextMonth(m));
}

export function goToMonth(month: string) {
  currentMonth.set(month);
}

export function goToCurrentMonth() {
  currentMonth.set(getCurrentMonth());
}

// Wide mode store with localStorage persistence
// Supports 2 levels: medium (1400px), wide (100%)
export type WidthMode = 'medium' | 'wide';

function getStoredWidthMode(): WidthMode {
  if (typeof window === 'undefined') return 'medium';
  const stored = localStorage.getItem('doggybag-width-mode');
  // Handle legacy values (map 'small' to 'medium')
  if (stored === 'true' || stored === 'wide') return 'wide';
  if (stored === 'false' || stored === 'small') return 'medium';
  if (stored === 'medium' || stored === 'wide') return stored;
  return 'medium';
}

function createWidthModeStore() {
  const { subscribe, set, update } = writable<WidthMode>('medium');

  // Initialize from localStorage on client side
  if (typeof window !== 'undefined') {
    set(getStoredWidthMode());
  }

  return {
    subscribe,
    // Toggle between modes: medium <-> wide
    cycle: () => {
      update((current) => {
        const nextMode: WidthMode = current === 'medium' ? 'wide' : 'medium';
        if (typeof window !== 'undefined') {
          localStorage.setItem('doggybag-width-mode', nextMode);
        }
        return nextMode;
      });
    },
    set: (value: WidthMode) => {
      set(value);
      if (typeof window !== 'undefined') {
        localStorage.setItem('doggybag-width-mode', value);
      }
    },
  };
}

export const widthMode = createWidthModeStore();

export type FilterScopeMode = {
  categories: boolean;
  items: boolean;
  bills: boolean;
  income: boolean;
};

const filterScopeStorageKey = 'doggybag-filter-scope';

function getStoredFilterScope(): FilterScopeMode {
  if (typeof window === 'undefined') {
    return { categories: true, items: true, bills: true, income: true };
  }

  const stored = localStorage.getItem(filterScopeStorageKey);
  if (!stored) {
    return { categories: true, items: true, bills: true, income: true };
  }

  try {
    const parsed = JSON.parse(stored) as Partial<FilterScopeMode>;
    return {
      categories: parsed.categories ?? true,
      items: parsed.items ?? true,
      bills: parsed.bills ?? true,
      income: parsed.income ?? true,
    };
  } catch {
    return { categories: true, items: true, bills: true, income: true };
  }
}

function createFilterScopeStore() {
  const { subscribe, set, update } = writable<FilterScopeMode>({
    categories: true,
    items: true,
    bills: true,
    income: true,
  });

  if (typeof window !== 'undefined') {
    set(getStoredFilterScope());
  }

  function persist(next: FilterScopeMode) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(filterScopeStorageKey, JSON.stringify(next));
    }
  }

  return {
    subscribe,
    set: (value: FilterScopeMode) => {
      set(value);
      persist(value);
    },
    update: (fn: (value: FilterScopeMode) => FilterScopeMode) => {
      update((current) => {
        const next = fn(current);
        persist(next);
        return next;
      });
    },
  };
}

export const filterScope = createFilterScopeStore();

// Hide paid items mode store with localStorage persistence
function getStoredHidePaidItems(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('doggybag-hide-paid-items') === 'true';
}

function createHidePaidItemsStore() {
  const { subscribe, set, update } = writable<boolean>(false);

  // Initialize from localStorage on client side
  if (typeof window !== 'undefined') {
    set(getStoredHidePaidItems());
  }

  return {
    subscribe,
    toggle: () => {
      update((current) => {
        const next = !current;
        if (typeof window !== 'undefined') {
          localStorage.setItem('doggybag-hide-paid-items', String(next));
        }
        return next;
      });
    },
    set: (value: boolean) => {
      set(value);
      if (typeof window !== 'undefined') {
        localStorage.setItem('doggybag-hide-paid-items', String(value));
      }
    },
  };
}

export const hidePaidItems = createHidePaidItemsStore();

// Legacy alias for backwards compatibility (if needed)
export const wideMode = {
  subscribe: widthMode.subscribe,
  toggle: widthMode.cycle,
};

// Calendar size store with localStorage persistence
// Supports 3 levels: small (compact), medium, large (full details)
export type CalendarSize = 'small' | 'medium' | 'large';

function getStoredCalendarSize(): CalendarSize {
  if (typeof window === 'undefined') return 'small';
  const stored = localStorage.getItem('doggybag-calendar-size');
  if (stored === 'small' || stored === 'medium' || stored === 'large') return stored;
  return 'small';
}

function createCalendarSizeStore() {
  const { subscribe, set, update } = writable<CalendarSize>('small');

  // Initialize from localStorage on client side
  if (typeof window !== 'undefined') {
    set(getStoredCalendarSize());
  }

  return {
    subscribe,
    // Cycle through modes: small -> medium -> large -> small
    cycle: () => {
      update((current) => {
        const nextSize: CalendarSize =
          current === 'small' ? 'medium' : current === 'medium' ? 'large' : 'small';
        if (typeof window !== 'undefined') {
          localStorage.setItem('doggybag-calendar-size', nextSize);
        }
        return nextSize;
      });
    },
    set: (value: CalendarSize) => {
      set(value);
      if (typeof window !== 'undefined') {
        localStorage.setItem('doggybag-calendar-size', value);
      }
    },
  };
}

export const calendarSize = createCalendarSizeStore();

// Column mode store with localStorage persistence
// Supports 2 modes: '1-col' (stacked), '2-col' (side by side)
export type ColumnMode = '1-col' | '2-col';

function getStoredColumnMode(): ColumnMode {
  if (typeof window === 'undefined') return '2-col';
  const stored = localStorage.getItem('doggybag-column-mode');
  if (stored === '1-col' || stored === '2-col') return stored;
  return '2-col'; // Default to 2 columns
}

function createColumnModeStore() {
  const { subscribe, set, update } = writable<ColumnMode>('2-col');

  // Initialize from localStorage on client side
  if (typeof window !== 'undefined') {
    set(getStoredColumnMode());
  }

  return {
    subscribe,
    // Toggle between modes: 1-col <-> 2-col
    toggle: () => {
      update((current) => {
        const nextMode: ColumnMode = current === '1-col' ? '2-col' : '1-col';
        if (typeof window !== 'undefined') {
          localStorage.setItem('doggybag-column-mode', nextMode);
        }
        return nextMode;
      });
    },
    set: (value: ColumnMode) => {
      set(value);
      if (typeof window !== 'undefined') {
        localStorage.setItem('doggybag-column-mode', value);
      }
    },
  };
}

export const columnMode = createColumnModeStore();

// Sidebar collapsed state with localStorage persistence
function getStoredSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('doggybag-sidebar-collapsed') === 'true';
}

function createSidebarCollapsedStore() {
  const { subscribe, set, update } = writable<boolean>(false);

  // Initialize from localStorage on client side
  if (typeof window !== 'undefined') {
    set(getStoredSidebarCollapsed());
  }

  return {
    subscribe,
    toggle: () => {
      update((current) => {
        const next = !current;
        if (typeof window !== 'undefined') {
          localStorage.setItem('doggybag-sidebar-collapsed', String(next));
        }
        return next;
      });
    },
    set: (value: boolean) => {
      set(value);
      if (typeof window !== 'undefined') {
        localStorage.setItem('doggybag-sidebar-collapsed', String(value));
      }
    },
    expand: () => {
      set(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('doggybag-sidebar-collapsed', 'false');
      }
    },
    collapse: () => {
      set(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('doggybag-sidebar-collapsed', 'true');
      }
    },
  };
}

export const sidebarCollapsed = createSidebarCollapsedStore();

// UI state store for sidebar, drawers, etc.
interface UIState {
  sidebarOpen: boolean;
  drawerOpen: boolean;
  drawerContent: 'none' | 'edit-bill' | 'edit-income' | 'edit-expense';
  editingId: string | null;
}

const initialUIState: UIState = {
  sidebarOpen: true,
  drawerOpen: false,
  drawerContent: 'none',
  editingId: null,
};

export const uiState = writable<UIState>(initialUIState);

export function toggleSidebar() {
  sidebarCollapsed.toggle();
}

export function openDrawer(content: UIState['drawerContent'], id?: string) {
  uiState.update((state) => ({
    ...state,
    drawerOpen: true,
    drawerContent: content,
    editingId: id || null,
  }));
}

export function closeDrawer() {
  uiState.update((state) => ({
    ...state,
    drawerOpen: false,
    drawerContent: 'none',
    editingId: null,
  }));
}
