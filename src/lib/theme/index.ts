/**
 * Theme Module - Public API
 *
 * A framework-agnostic theme system for CSS custom properties.
 * Designed for reuse across projects.
 *
 * @example
 * ```typescript
 * import { loadTheme, applyTheme, createTheme } from '$lib/theme';
 *
 * // Load from JSON
 * const theme = loadTheme(darkThemeJson);
 * applyTheme(theme);
 *
 * // Create programmatically
 * const customTheme = createTheme({
 *   id: 'custom',
 *   name: 'My Theme',
 *   isDark: true,
 *   colors: {
 *     'bg-base': '#1a1a2e',
 *     // ... other colors
 *   },
 * });
 * ```
 */

// Types
export type {
  Theme,
  PartialTheme,
  ThemeColors,
  ThemeMeta,
  ThemeMode,
  ThemeValidationResult,
  ColorKey,
  RequiredColorKey,
  OptionalColorKey,
} from './types';

export {
  THEME_SCHEMA_VERSION,
  REQUIRED_COLOR_KEYS,
  OPTIONAL_COLOR_KEYS,
  ALL_COLOR_KEYS,
} from './types';

// Defaults
export {
  DARK_THEME_COLORS,
  LIGHT_THEME_COLORS,
  getDefaultColors,
  getDefaultColor,
} from './defaults';

// Validation
export { validateTheme, isPartialTheme } from './validator';

// Loading
export { loadTheme, loadThemeFromJson, createTheme, serializeTheme } from './loader';

// Applying
export {
  applyTheme,
  clearTheme,
  getThemeValue,
  getCurrentThemeId,
  isCurrentThemeDark,
  systemPrefersDark,
  watchSystemColorScheme,
} from './applier';
