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
  currentMonth.update(m => getPreviousMonth(m));
}

export function goToNextMonth() {
  currentMonth.update(m => getNextMonth(m));
}

export function goToMonth(month: string) {
  currentMonth.set(month);
}

export function goToCurrentMonth() {
  currentMonth.set(getCurrentMonth());
}

// Wide mode store with localStorage persistence
// Supports 3 levels: small (900px), medium (1200px), wide (100%)
export type WidthMode = 'small' | 'medium' | 'wide';

function getStoredWidthMode(): WidthMode {
  if (typeof window === 'undefined') return 'medium';
  const stored = localStorage.getItem('budgetforfun-width-mode');
  // Handle legacy values
  if (stored === 'true' || stored === 'wide') return 'wide';
  if (stored === 'false') return 'medium';
  if (stored === 'small' || stored === 'medium' || stored === 'wide') return stored;
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
    // Cycle through modes: small -> medium -> wide -> small
    cycle: () => {
      update(current => {
        const nextMode: WidthMode = current === 'small' ? 'medium' : current === 'medium' ? 'wide' : 'small';
        if (typeof window !== 'undefined') {
          localStorage.setItem('budgetforfun-width-mode', nextMode);
        }
        return nextMode;
      });
    },
    set: (value: WidthMode) => {
      set(value);
      if (typeof window !== 'undefined') {
        localStorage.setItem('budgetforfun-width-mode', value);
      }
    }
  };
}

export const widthMode = createWidthModeStore();

// Compact mode store with localStorage persistence
function getStoredCompactMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('budgetforfun-compact-mode') === 'true';
}

function createCompactModeStore() {
  const { subscribe, set, update } = writable<boolean>(false);
  
  // Initialize from localStorage on client side
  if (typeof window !== 'undefined') {
    set(getStoredCompactMode());
  }
  
  return {
    subscribe,
    toggle: () => {
      update(current => {
        const next = !current;
        if (typeof window !== 'undefined') {
          localStorage.setItem('budgetforfun-compact-mode', String(next));
        }
        return next;
      });
    },
    set: (value: boolean) => {
      set(value);
      if (typeof window !== 'undefined') {
        localStorage.setItem('budgetforfun-compact-mode', String(value));
      }
    }
  };
}

export const compactMode = createCompactModeStore();

// Legacy alias for backwards compatibility (if needed)
export const wideMode = {
  subscribe: widthMode.subscribe,
  toggle: widthMode.cycle
};

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
  editingId: null
};

export const uiState = writable<UIState>(initialUIState);

export function toggleSidebar() {
  uiState.update(state => ({ ...state, sidebarOpen: !state.sidebarOpen }));
}

export function openDrawer(content: UIState['drawerContent'], id?: string) {
  uiState.update(state => ({
    ...state,
    drawerOpen: true,
    drawerContent: content,
    editingId: id || null
  }));
}

export function closeDrawer() {
  uiState.update(state => ({
    ...state,
    drawerOpen: false,
    drawerContent: 'none',
    editingId: null
  }));
}
