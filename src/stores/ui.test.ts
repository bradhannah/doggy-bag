// UI Store Tests
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  getCurrentMonth,
  currentMonth,
  currentMonthDisplay,
  goToPreviousMonth,
  goToNextMonth,
  goToMonth,
  goToCurrentMonth,
  widthMode,
  compactMode,
  uiState,
  toggleSidebar,
  openDrawer,
  closeDrawer,
} from './ui';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

describe('UI Store', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getCurrentMonth', () => {
    it('returns current month in YYYY-MM format', () => {
      const result = getCurrentMonth();
      expect(result).toMatch(/^\d{4}-\d{2}$/);
    });

    it('returns the actual current month', () => {
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      expect(getCurrentMonth()).toBe(expected);
    });
  });

  describe('currentMonth store', () => {
    beforeEach(() => {
      goToCurrentMonth();
    });

    it('initializes to current month', () => {
      const month = get(currentMonth);
      expect(month).toBe(getCurrentMonth());
    });

    describe('goToPreviousMonth', () => {
      it('goes to previous month', () => {
        goToMonth('2025-06');
        goToPreviousMonth();
        expect(get(currentMonth)).toBe('2025-05');
      });

      it('wraps to previous year from January', () => {
        goToMonth('2025-01');
        goToPreviousMonth();
        expect(get(currentMonth)).toBe('2024-12');
      });
    });

    describe('goToNextMonth', () => {
      it('goes to next month', () => {
        goToMonth('2025-06');
        goToNextMonth();
        expect(get(currentMonth)).toBe('2025-07');
      });

      it('wraps to next year from December', () => {
        goToMonth('2025-12');
        goToNextMonth();
        expect(get(currentMonth)).toBe('2026-01');
      });
    });

    describe('goToMonth', () => {
      it('sets specific month', () => {
        goToMonth('2024-03');
        expect(get(currentMonth)).toBe('2024-03');
      });
    });

    describe('goToCurrentMonth', () => {
      it('resets to current month', () => {
        goToMonth('2020-01');
        goToCurrentMonth();
        expect(get(currentMonth)).toBe(getCurrentMonth());
      });
    });
  });

  describe('currentMonthDisplay', () => {
    it('formats month for display', () => {
      goToMonth('2025-01');
      const display = get(currentMonthDisplay);
      expect(display).toBe('January 2025');
    });

    it('updates when month changes', () => {
      goToMonth('2025-06');
      expect(get(currentMonthDisplay)).toBe('June 2025');

      goToMonth('2025-12');
      expect(get(currentMonthDisplay)).toBe('December 2025');
    });
  });

  describe('widthMode store', () => {
    it('defaults to medium', () => {
      expect(get(widthMode)).toBe('medium');
    });

    it('cycles through modes: small -> medium -> wide', () => {
      widthMode.set('small');
      expect(get(widthMode)).toBe('small');

      widthMode.cycle();
      expect(get(widthMode)).toBe('medium');

      widthMode.cycle();
      expect(get(widthMode)).toBe('wide');

      widthMode.cycle();
      expect(get(widthMode)).toBe('small');
    });

    it('persists to localStorage', () => {
      widthMode.set('wide');
      expect(localStorageMock.getItem('budgetforfun-width-mode')).toBe('wide');
    });

    it('persists on cycle', () => {
      widthMode.set('small');
      widthMode.cycle();
      expect(localStorageMock.getItem('budgetforfun-width-mode')).toBe('medium');
    });
  });

  describe('compactMode store', () => {
    it('defaults to false', () => {
      expect(get(compactMode)).toBe(false);
    });

    it('toggles on and off', () => {
      compactMode.toggle();
      expect(get(compactMode)).toBe(true);

      compactMode.toggle();
      expect(get(compactMode)).toBe(false);
    });

    it('can set directly', () => {
      compactMode.set(true);
      expect(get(compactMode)).toBe(true);

      compactMode.set(false);
      expect(get(compactMode)).toBe(false);
    });

    it('persists to localStorage', () => {
      compactMode.set(true);
      expect(localStorageMock.getItem('budgetforfun-compact-mode')).toBe('true');

      compactMode.set(false);
      expect(localStorageMock.getItem('budgetforfun-compact-mode')).toBe('false');
    });
  });

  describe('uiState store', () => {
    beforeEach(() => {
      closeDrawer();
      // Reset sidebar to open
      const state = get(uiState);
      if (!state.sidebarOpen) {
        toggleSidebar();
      }
    });

    it('has correct initial state', () => {
      const state = get(uiState);
      expect(state.sidebarOpen).toBe(true);
      expect(state.drawerOpen).toBe(false);
      expect(state.drawerContent).toBe('none');
      expect(state.editingId).toBeNull();
    });

    describe('toggleSidebar', () => {
      it('toggles sidebar open state', () => {
        expect(get(uiState).sidebarOpen).toBe(true);

        toggleSidebar();
        expect(get(uiState).sidebarOpen).toBe(false);

        toggleSidebar();
        expect(get(uiState).sidebarOpen).toBe(true);
      });
    });

    describe('openDrawer', () => {
      it('opens drawer with content type', () => {
        openDrawer('edit-bill');
        const state = get(uiState);

        expect(state.drawerOpen).toBe(true);
        expect(state.drawerContent).toBe('edit-bill');
        expect(state.editingId).toBeNull();
      });

      it('opens drawer with content and ID', () => {
        openDrawer('edit-income', 'income-123');
        const state = get(uiState);

        expect(state.drawerOpen).toBe(true);
        expect(state.drawerContent).toBe('edit-income');
        expect(state.editingId).toBe('income-123');
      });

      it('opens drawer for expense editing', () => {
        openDrawer('edit-expense', 'expense-456');
        const state = get(uiState);

        expect(state.drawerContent).toBe('edit-expense');
        expect(state.editingId).toBe('expense-456');
      });
    });

    describe('closeDrawer', () => {
      it('closes drawer and resets state', () => {
        openDrawer('edit-bill', 'bill-123');
        closeDrawer();

        const state = get(uiState);
        expect(state.drawerOpen).toBe(false);
        expect(state.drawerContent).toBe('none');
        expect(state.editingId).toBeNull();
      });
    });
  });
});
