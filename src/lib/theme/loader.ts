/**
 * Theme Loader
 *
 * Loads themes from JSON and merges with defaults.
 */

import type { Theme, PartialTheme, ThemeColors } from './types';
import { THEME_SCHEMA_VERSION, OPTIONAL_COLOR_KEYS } from './types';
import { getDefaultColors } from './defaults';
import { validateTheme } from './validator';

/**
 * Load a theme from a partial theme object.
 * Merges with defaults for missing optional colors.
 *
 * @param partial - Partial theme with at least required colors
 * @returns Complete theme with all colors filled in
 * @throws Error if theme is invalid
 */
export function loadTheme(partial: PartialTheme): Theme {
  const validation = validateTheme(partial);

  if (!validation.valid) {
    throw new Error(`Invalid theme: ${validation.errors.join(', ')}`);
  }

  // Get defaults based on dark/light
  const defaults = getDefaultColors(partial.isDark);

  // Merge colors: partial overrides defaults
  const colors: ThemeColors = { ...defaults };

  // Apply all colors from partial
  for (const [key, value] of Object.entries(partial.colors)) {
    if (value !== undefined && value !== '') {
      (colors as Record<string, string>)[key] = value;
    }
  }

  return {
    id: partial.id,
    name: partial.name,
    version: partial.version ?? THEME_SCHEMA_VERSION,
    isDark: partial.isDark,
    colors,
    meta: partial.meta,
  };
}

/**
 * Load a theme from a JSON string.
 *
 * @param json - JSON string representing a theme
 * @returns Complete theme
 * @throws Error if JSON is invalid or theme is invalid
 */
export function loadThemeFromJson(json: string): Theme {
  try {
    const parsed = JSON.parse(json) as PartialTheme;
    return loadTheme(parsed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create a minimal theme with just required colors.
 * All optional colors will use defaults.
 *
 * @param options - Theme options
 * @returns Complete theme
 */
export function createTheme(options: {
  id: string;
  name: string;
  isDark: boolean;
  colors?: Partial<ThemeColors>;
  meta?: Theme['meta'];
}): Theme {
  const defaults = getDefaultColors(options.isDark);

  const colors: ThemeColors = { ...defaults };

  if (options.colors) {
    for (const [key, value] of Object.entries(options.colors)) {
      if (value !== undefined && value !== '') {
        (colors as Record<string, string>)[key] = value;
      }
    }
  }

  return {
    id: options.id,
    name: options.name,
    version: THEME_SCHEMA_VERSION,
    isDark: options.isDark,
    colors,
    meta: options.meta,
  };
}

/**
 * Serialize a theme to JSON string.
 *
 * @param theme - Theme to serialize
 * @param minimal - If true, only include non-default colors
 * @returns JSON string
 */
export function serializeTheme(theme: Theme, minimal = false): string {
  if (!minimal) {
    return JSON.stringify(theme, null, 2);
  }

  // Create minimal version with only non-default colors
  const defaults = getDefaultColors(theme.isDark);
  const minimalColors: Partial<ThemeColors> = {};

  // Always include required colors
  for (const key of [
    'bg-base',
    'bg-surface',
    'bg-elevated',
    'text-primary',
    'text-secondary',
    'accent',
    'border-default',
  ] as const) {
    minimalColors[key] = theme.colors[key];
  }

  // Only include optional colors that differ from defaults
  for (const key of OPTIONAL_COLOR_KEYS) {
    const themeValue = theme.colors[key];
    const defaultValue = defaults[key];

    if (themeValue !== undefined && themeValue !== defaultValue) {
      minimalColors[key] = themeValue;
    }
  }

  const minimal_theme = {
    id: theme.id,
    name: theme.name,
    version: theme.version,
    isDark: theme.isDark,
    colors: minimalColors,
    ...(theme.meta ? { meta: theme.meta } : {}),
  };

  return JSON.stringify(minimal_theme, null, 2);
}
