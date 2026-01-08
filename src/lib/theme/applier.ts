/**
 * Theme Applier
 *
 * Applies themes to the DOM by setting CSS custom properties.
 * Framework-agnostic - works with any frontend.
 */

import type { Theme, ColorKey } from './types';
import { ALL_COLOR_KEYS } from './types';

/**
 * Apply a theme to an element by setting CSS custom properties.
 *
 * @param theme - The theme to apply
 * @param element - The element to apply to (defaults to document.documentElement)
 */
export function applyTheme(theme: Theme, element?: HTMLElement): void {
  const target = element ?? document.documentElement;

  // Set all color variables
  for (const key of ALL_COLOR_KEYS) {
    const value = theme.colors[key];
    if (value !== undefined && value !== '') {
      target.style.setProperty(`--${key}`, value);
    }
  }

  // Set theme metadata as data attributes
  target.dataset.theme = theme.id;
  target.dataset.themeIsDark = String(theme.isDark);
}

/**
 * Remove all theme-related CSS custom properties from an element.
 *
 * @param element - The element to clear (defaults to document.documentElement)
 */
export function clearTheme(element?: HTMLElement): void {
  const target = element ?? document.documentElement;

  // Remove all color variables
  for (const key of ALL_COLOR_KEYS) {
    target.style.removeProperty(`--${key}`);
  }

  // Remove data attributes
  delete target.dataset.theme;
  delete target.dataset.themeIsDark;
}

/**
 * Get a theme color value from an element.
 *
 * @param key - The color key to get
 * @param element - The element to read from (defaults to document.documentElement)
 * @returns The color value or empty string if not set
 */
export function getThemeValue(key: ColorKey, element?: HTMLElement): string {
  const target = element ?? document.documentElement;
  return getComputedStyle(target).getPropertyValue(`--${key}`).trim();
}

/**
 * Get the current theme ID from an element.
 *
 * @param element - The element to read from (defaults to document.documentElement)
 * @returns The theme ID or undefined if not set
 */
export function getCurrentThemeId(element?: HTMLElement): string | undefined {
  const target = element ?? document.documentElement;
  return target.dataset.theme;
}

/**
 * Check if the current theme is dark.
 *
 * @param element - The element to read from (defaults to document.documentElement)
 * @returns True if dark theme, false otherwise
 */
export function isCurrentThemeDark(element?: HTMLElement): boolean {
  const target = element ?? document.documentElement;
  return target.dataset.themeIsDark === 'true';
}

/**
 * Check if the system prefers dark mode.
 *
 * @returns True if system prefers dark mode
 */
export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') {
    return true; // Default to dark in SSR
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Watch for system color scheme changes.
 *
 * @param callback - Called when system preference changes
 * @returns Cleanup function to stop watching
 */
export function watchSystemColorScheme(callback: (prefersDark: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op in SSR
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches);
  };

  mediaQuery.addEventListener('change', handler);

  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
}
