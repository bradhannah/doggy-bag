/**
 * Theme Store
 *
 * Svelte store for managing theme state.
 * Wraps the framework-agnostic theme module.
 */

import { writable, derived, get } from 'svelte/store';
import {
  loadTheme,
  applyTheme,
  systemPrefersDark,
  watchSystemColorScheme,
  type Theme,
  type ThemeMode,
  type PartialTheme,
} from '$lib/theme';

// Import built-in themes
import darkThemeJson from '$lib/theme/themes/dark.json';
import lightThemeJson from '$lib/theme/themes/light.json';

/** Storage key for persisting theme preference */
const STORAGE_KEY = 'doggybag-theme-mode';

/** Load built-in themes (these are static imports, always available) */
const darkTheme = loadTheme(darkThemeJson as PartialTheme);
const lightTheme = loadTheme(lightThemeJson as PartialTheme);

/** Available themes */
const availableThemes: Theme[] = [darkTheme, lightTheme];

/**
 * Safe localStorage access
 */
function getStoredMode(): ThemeMode | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  return null;
}

function setStoredMode(mode: ThemeMode): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage not available
  }
}

/**
 * Create the theme mode store.
 * Persists to localStorage.
 */
function createThemeModeStore() {
  const initialMode: ThemeMode = getStoredMode() ?? 'system';
  const { subscribe, set, update } = writable<ThemeMode>(initialMode);

  return {
    subscribe,
    set: (mode: ThemeMode) => {
      set(mode);
      setStoredMode(mode);
    },
    toggle: () => {
      update((current) => {
        // Cycle through: system -> dark -> light -> system
        const next: ThemeMode =
          current === 'system' ? 'dark' : current === 'dark' ? 'light' : 'system';
        setStoredMode(next);
        return next;
      });
    },
  };
}

/**
 * Store for the system's color scheme preference.
 */
function createSystemPreferenceStore() {
  const initial = typeof window !== 'undefined' ? systemPrefersDark() : true;
  const { subscribe, set } = writable<boolean>(initial);

  return { subscribe, set };
}

/** Theme mode store (dark | light | system) */
export const themeMode = createThemeModeStore();

/** System preference store (true = prefers dark) */
export const systemPreference = createSystemPreferenceStore();

/**
 * Derived store for the currently active theme.
 * Resolves 'system' to actual theme based on system preference.
 */
export const currentTheme = derived(
  [themeMode, systemPreference],
  ([$mode, $systemPrefersDark]) => {
    if ($mode === 'system') {
      return $systemPrefersDark ? darkTheme : lightTheme;
    }
    return $mode === 'dark' ? darkTheme : lightTheme;
  }
);

/**
 * Derived store for whether current theme is dark.
 */
export const isDarkTheme = derived(currentTheme, ($theme) => $theme.isDark);

/**
 * Get all available themes.
 */
export function getAvailableThemes(): Theme[] {
  return [...availableThemes];
}

/**
 * Get a theme by ID.
 */
export function getThemeById(id: string): Theme | undefined {
  return availableThemes.find((t) => t.id === id);
}

/** Track if theme system is initialized */
let initialized = false;
let unsubscribeTheme: (() => void) | null = null;
let unsubscribeSystem: (() => void) | null = null;

/**
 * Initialize the theme system.
 * Call this once on app startup.
 */
export function initializeTheme(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;

  initialized = true;

  // Apply the current theme immediately
  const theme = get(currentTheme);
  applyTheme(theme);

  // Subscribe to theme changes and apply
  unsubscribeTheme = currentTheme.subscribe((theme) => {
    applyTheme(theme);
  });

  // Watch for system color scheme changes
  unsubscribeSystem = watchSystemColorScheme((prefersDark) => {
    systemPreference.set(prefersDark);
  });
}

/**
 * Cleanup theme system (for testing)
 */
export function cleanupTheme(): void {
  unsubscribeTheme?.();
  unsubscribeSystem?.();
  initialized = false;
}

/**
 * Set theme mode.
 */
export function setThemeMode(mode: ThemeMode): void {
  themeMode.set(mode);
}

/**
 * Get current theme mode.
 */
export function getThemeMode(): ThemeMode {
  return get(themeMode);
}
