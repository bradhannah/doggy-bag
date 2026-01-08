/**
 * Theme System Types
 *
 * Framework-agnostic theme definitions.
 * Designed for reuse across projects.
 */

/** Schema version for theme files */
export const THEME_SCHEMA_VERSION = '1.0';

/**
 * Required color keys that must be defined in every theme.
 * These are the minimum colors needed for a functional UI.
 */
export const REQUIRED_COLOR_KEYS = [
  'bg-base',
  'bg-surface',
  'bg-elevated',
  'text-primary',
  'text-secondary',
  'accent',
  'border-default',
] as const;

/**
 * Optional color keys with sensible defaults.
 * Themes can override these or inherit defaults.
 */
export const OPTIONAL_COLOR_KEYS = [
  // Text variants
  'text-tertiary',
  'text-inverse',
  'text-disabled',

  // Border variants
  'border-hover',
  'border-focus',

  // Accent variants
  'accent-hover',
  'accent-muted',

  // Semantic: Success
  'success',
  'success-dark',
  'success-bg',
  'success-border',

  // Semantic: Error/Danger
  'error',
  'error-dark',
  'danger',
  'danger-hover',
  'error-bg',
  'error-border',

  // Semantic: Warning
  'warning',
  'warning-light',
  'warning-bg',
  'warning-border',

  // Semantic: Info
  'info',
  'info-bg',

  // Special: Purple (Credit cards, etc.)
  'purple',
  'purple-dark',
  'purple-bg',

  // Special: Orange
  'orange',
  'orange-bg',

  // UI: Overlays and shadows
  'overlay-bg',
  'shadow-light',
  'shadow-medium',
  'shadow-heavy',

  // UI: Hover states
  'bg-hover',
  'bg-hover-strong',

  // Accent border (for highlighted elements)
  'accent-border',

  // Financial semantics
  'income-color',
  'expense-color',
  'positive-color',
  'negative-color',

  // State colors
  'paid-color',
  'unpaid-color',
  'partial-color',
  'pending-color',
] as const;

/** All valid color keys */
export const ALL_COLOR_KEYS = [...REQUIRED_COLOR_KEYS, ...OPTIONAL_COLOR_KEYS] as const;

/** Type for required color keys */
export type RequiredColorKey = (typeof REQUIRED_COLOR_KEYS)[number];

/** Type for optional color keys */
export type OptionalColorKey = (typeof OPTIONAL_COLOR_KEYS)[number];

/** Type for all color keys */
export type ColorKey = (typeof ALL_COLOR_KEYS)[number];

/**
 * Color definitions for a theme.
 * Required keys must be present, optional keys have defaults.
 */
export type ThemeColors = {
  [K in RequiredColorKey]: string;
} & {
  [K in OptionalColorKey]?: string;
};

/**
 * Optional metadata for a theme.
 */
export interface ThemeMeta {
  author?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Complete theme definition.
 */
export interface Theme {
  /** Unique identifier for the theme */
  id: string;

  /** Display name for the theme */
  name: string;

  /** Schema version for future migrations */
  version: string;

  /** Whether this is a dark theme (for system preference matching) */
  isDark: boolean;

  /** Color definitions */
  colors: ThemeColors;

  /** Optional metadata */
  meta?: ThemeMeta;
}

/**
 * Partial theme for loading from JSON.
 * Will be merged with defaults.
 */
export interface PartialTheme {
  id: string;
  name: string;
  version?: string;
  isDark: boolean;
  colors: Partial<ThemeColors>;
  meta?: ThemeMeta;
}

/**
 * Theme preference mode.
 */
export type ThemeMode = 'dark' | 'light' | 'system';

/**
 * Result of theme validation.
 */
export interface ThemeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
