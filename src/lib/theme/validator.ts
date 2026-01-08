/**
 * Theme Validator
 *
 * Validates theme JSON against the schema.
 */

import {
  THEME_SCHEMA_VERSION,
  REQUIRED_COLOR_KEYS,
  ALL_COLOR_KEYS,
  type ThemeValidationResult,
  type PartialTheme,
} from './types';

/**
 * Validate a theme object.
 *
 * @param theme - The theme object to validate
 * @returns Validation result with errors and warnings
 */
export function validateTheme(theme: unknown): ThemeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if theme is an object
  if (!theme || typeof theme !== 'object') {
    return {
      valid: false,
      errors: ['Theme must be an object'],
      warnings: [],
    };
  }

  const t = theme as Record<string, unknown>;

  // Required fields
  if (typeof t.id !== 'string' || t.id.trim() === '') {
    errors.push('Theme must have a non-empty "id" string');
  }

  if (typeof t.name !== 'string' || t.name.trim() === '') {
    errors.push('Theme must have a non-empty "name" string');
  }

  if (typeof t.isDark !== 'boolean') {
    errors.push('Theme must have an "isDark" boolean');
  }

  // Version check
  if (t.version && t.version !== THEME_SCHEMA_VERSION) {
    warnings.push(
      `Theme version "${t.version}" differs from current schema version "${THEME_SCHEMA_VERSION}"`
    );
  }

  // Colors validation
  if (!t.colors || typeof t.colors !== 'object') {
    errors.push('Theme must have a "colors" object');
  } else {
    const colors = t.colors as Record<string, unknown>;

    // Check required colors
    for (const key of REQUIRED_COLOR_KEYS) {
      if (typeof colors[key] !== 'string' || colors[key] === '') {
        errors.push(`Missing required color: "${key}"`);
      }
    }

    // Check for unknown color keys
    for (const key of Object.keys(colors)) {
      if (!ALL_COLOR_KEYS.includes(key as (typeof ALL_COLOR_KEYS)[number])) {
        warnings.push(`Unknown color key: "${key}"`);
      }
    }

    // Validate color values are valid CSS colors
    for (const [key, value] of Object.entries(colors)) {
      if (typeof value === 'string' && value !== '') {
        if (!isValidCssColor(value)) {
          warnings.push(`Color "${key}" may not be a valid CSS color: "${value}"`);
        }
      }
    }
  }

  // Meta validation (optional)
  if (t.meta !== undefined && typeof t.meta !== 'object') {
    warnings.push('"meta" should be an object if provided');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Basic check if a string looks like a valid CSS color.
 * Not exhaustive, but catches common mistakes.
 */
function isValidCssColor(value: string): boolean {
  // Hex colors
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?$/.test(value)) {
    return true;
  }

  // RGB/RGBA
  if (/^rgba?\s*\([\d\s,.%]+\)$/i.test(value)) {
    return true;
  }

  // HSL/HSLA
  if (/^hsla?\s*\([\d\s,.%deg]+\)$/i.test(value)) {
    return true;
  }

  // Named colors (basic check - just ensure it's a simple word)
  if (/^[a-zA-Z]+$/.test(value)) {
    return true;
  }

  // CSS variables
  if (/^var\s*\(--[\w-]+\)$/i.test(value)) {
    return true;
  }

  return false;
}

/**
 * Check if an object is a valid partial theme (for loading).
 */
export function isPartialTheme(obj: unknown): obj is PartialTheme {
  const result = validateTheme(obj);
  return result.valid;
}
