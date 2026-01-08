/**
 * Theme Defaults
 *
 * Default color values for dark and light themes.
 * Used as fallbacks when optional colors are not defined.
 */

import type { ThemeColors, OptionalColorKey } from './types';

/**
 * Default dark theme colors.
 * These are the complete set of colors for the dark theme.
 */
export const DARK_THEME_COLORS: ThemeColors = {
  // Required: Backgrounds
  'bg-base': '#0f0f1a',
  'bg-surface': '#1a1a2e',
  'bg-elevated': '#1e1e2e',

  // Required: Text
  'text-primary': '#e4e4e7',
  'text-secondary': '#888888',

  // Required: Accent
  accent: '#24c8db',

  // Required: Border
  'border-default': '#333355',

  // Optional: Text variants
  'text-tertiary': '#666666',
  'text-inverse': '#000000',
  'text-disabled': '#555555',

  // Optional: Border variants
  'border-hover': '#444466',
  'border-focus': '#24c8db',

  // Optional: Accent variants
  'accent-hover': '#1ab0c9',
  'accent-muted': 'rgba(36, 200, 219, 0.1)',

  // Optional: Success
  success: '#4ade80',
  'success-dark': '#22c55e',
  'success-bg': 'rgba(74, 222, 128, 0.1)',
  'success-border': 'rgba(74, 222, 128, 0.3)',

  // Optional: Error/Danger
  error: '#f87171',
  'error-dark': '#ef4444',
  danger: '#ff4444',
  'danger-hover': '#cc3333',
  'error-bg': 'rgba(248, 113, 113, 0.1)',
  'error-border': 'rgba(248, 113, 113, 0.3)',

  // Optional: Warning
  warning: '#f59e0b',
  'warning-light': '#fbbf24',
  'warning-bg': 'rgba(251, 191, 36, 0.15)',
  'warning-border': 'rgba(251, 191, 36, 0.4)',

  // Optional: Info
  info: '#24c8db',
  'info-bg': 'rgba(36, 200, 219, 0.1)',

  // Optional: Purple
  purple: '#a78bfa',
  'purple-dark': '#8b5cf6',
  'purple-bg': 'rgba(139, 92, 246, 0.2)',

  // Optional: Orange
  orange: '#fb923c',
  'orange-bg': 'rgba(251, 146, 60, 0.1)',

  // Optional: Financial
  'income-color': '#22c55e',
  'expense-color': '#f87171',
  'positive-color': '#4ade80',
  'negative-color': '#f87171',

  // Optional: State
  'paid-color': '#4ade80',
  'unpaid-color': '#f87171',
  'partial-color': '#f59e0b',
  'pending-color': '#fbbf24',
};

/**
 * Default light theme colors.
 * Adjusted for light backgrounds.
 */
export const LIGHT_THEME_COLORS: ThemeColors = {
  // Required: Backgrounds
  'bg-base': '#f5f5f7',
  'bg-surface': '#ffffff',
  'bg-elevated': '#ffffff',

  // Required: Text
  'text-primary': '#1a1a2e',
  'text-secondary': '#666666',

  // Required: Accent
  accent: '#0891b2',

  // Required: Border
  'border-default': '#d1d5db',

  // Optional: Text variants
  'text-tertiary': '#888888',
  'text-inverse': '#ffffff',
  'text-disabled': '#a1a1aa',

  // Optional: Border variants
  'border-hover': '#9ca3af',
  'border-focus': '#0891b2',

  // Optional: Accent variants
  'accent-hover': '#0e7490',
  'accent-muted': 'rgba(8, 145, 178, 0.1)',

  // Optional: Success
  success: '#16a34a',
  'success-dark': '#15803d',
  'success-bg': 'rgba(22, 163, 74, 0.1)',
  'success-border': 'rgba(22, 163, 74, 0.3)',

  // Optional: Error/Danger
  error: '#dc2626',
  'error-dark': '#b91c1c',
  danger: '#dc2626',
  'danger-hover': '#b91c1c',
  'error-bg': 'rgba(220, 38, 38, 0.1)',
  'error-border': 'rgba(220, 38, 38, 0.3)',

  // Optional: Warning
  warning: '#d97706',
  'warning-light': '#f59e0b',
  'warning-bg': 'rgba(217, 119, 6, 0.1)',
  'warning-border': 'rgba(217, 119, 6, 0.3)',

  // Optional: Info
  info: '#0891b2',
  'info-bg': 'rgba(8, 145, 178, 0.1)',

  // Optional: Purple
  purple: '#7c3aed',
  'purple-dark': '#6d28d9',
  'purple-bg': 'rgba(124, 58, 237, 0.1)',

  // Optional: Orange
  orange: '#ea580c',
  'orange-bg': 'rgba(234, 88, 12, 0.1)',

  // Optional: Financial
  'income-color': '#16a34a',
  'expense-color': '#dc2626',
  'positive-color': '#16a34a',
  'negative-color': '#dc2626',

  // Optional: State
  'paid-color': '#16a34a',
  'unpaid-color': '#dc2626',
  'partial-color': '#d97706',
  'pending-color': '#f59e0b',
};

/**
 * Get default colors for optional keys based on theme darkness.
 */
export function getDefaultColors(isDark: boolean): ThemeColors {
  return isDark ? { ...DARK_THEME_COLORS } : { ...LIGHT_THEME_COLORS };
}

/**
 * Get the default value for a specific optional color key.
 */
export function getDefaultColor(key: OptionalColorKey, isDark: boolean): string {
  const defaults = isDark ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;
  return defaults[key] ?? '';
}
