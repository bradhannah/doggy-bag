#!/usr/bin/env bun
/**
 * Show Palette - Terminal Color Visualization
 *
 * Displays theme colors with actual colored swatches in the terminal.
 * Uses 24-bit ANSI escape codes (requires modern terminal).
 *
 * Usage:
 *   bun scripts/show-palette.ts           # Shows dark theme
 *   bun scripts/show-palette.ts light     # Shows light theme
 *   bun scripts/show-palette.ts compare   # Side-by-side comparison
 */

import { DARK_THEME_COLORS, LIGHT_THEME_COLORS } from '../src/lib/theme/defaults';
import type { ThemeColors } from '../src/lib/theme/types';

// Parse hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Handle rgba() format - extract the base color
  if (hex.startsWith('rgba(')) {
    const match = hex.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
    }
    return null;
  }

  // Handle hex format
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Create colored block using 24-bit ANSI escape codes
function colorBlock(hex: string, width = 4): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '░'.repeat(width); // Fallback for unparseable colors

  const block = '█'.repeat(width);
  return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m${block}\x1b[0m`;
}

// Format a color row
function colorRow(hex: string, varName: string, description: string): string {
  const block = colorBlock(hex);
  const hexPadded = hex.padEnd(24);
  const varPadded = varName.padEnd(18);
  return `  ${block}  ${hexPadded} ${varPadded} ${description}`;
}

// Color categories with descriptions
const COLOR_CATEGORIES: {
  name: string;
  colors: { key: keyof ThemeColors; desc: string }[];
}[] = [
  {
    name: 'BACKGROUNDS',
    colors: [
      { key: 'bg-base', desc: 'Page background' },
      { key: 'bg-surface', desc: 'Cards/panels' },
      { key: 'bg-elevated', desc: 'Modals/dropdowns' },
    ],
  },
  {
    name: 'TEXT',
    colors: [
      { key: 'text-primary', desc: 'Main text' },
      { key: 'text-secondary', desc: 'Muted text' },
      { key: 'text-tertiary', desc: 'Subtle text' },
      { key: 'text-inverse', desc: 'Text on accent' },
      { key: 'text-disabled', desc: 'Disabled text' },
    ],
  },
  {
    name: 'ACCENT',
    colors: [
      { key: 'accent', desc: 'Primary action' },
      { key: 'accent-hover', desc: 'Hover state' },
      { key: 'accent-muted', desc: 'Subtle background' },
    ],
  },
  {
    name: 'BORDERS',
    colors: [
      { key: 'border-default', desc: 'Default border' },
      { key: 'border-hover', desc: 'Hover border' },
      { key: 'border-focus', desc: 'Focus border' },
    ],
  },
  {
    name: 'SUCCESS',
    colors: [
      { key: 'success', desc: 'Success state' },
      { key: 'success-dark', desc: 'Success dark' },
      { key: 'success-bg', desc: 'Success background' },
      { key: 'success-border', desc: 'Success border' },
    ],
  },
  {
    name: 'ERROR',
    colors: [
      { key: 'error', desc: 'Error state' },
      { key: 'error-dark', desc: 'Error dark' },
      { key: 'danger', desc: 'Danger state' },
      { key: 'danger-hover', desc: 'Danger hover' },
      { key: 'error-bg', desc: 'Error background' },
      { key: 'error-border', desc: 'Error border' },
    ],
  },
  {
    name: 'WARNING',
    colors: [
      { key: 'warning', desc: 'Warning state' },
      { key: 'warning-light', desc: 'Warning light' },
      { key: 'warning-bg', desc: 'Warning background' },
      { key: 'warning-border', desc: 'Warning border' },
    ],
  },
  {
    name: 'INFO',
    colors: [
      { key: 'info', desc: 'Info state' },
      { key: 'info-bg', desc: 'Info background' },
    ],
  },
  {
    name: 'SPECIAL',
    colors: [
      { key: 'purple', desc: 'Purple accent' },
      { key: 'purple-dark', desc: 'Purple dark' },
      { key: 'purple-bg', desc: 'Purple background' },
      { key: 'orange', desc: 'Orange accent' },
      { key: 'orange-bg', desc: 'Orange background' },
    ],
  },
  {
    name: 'FINANCIAL',
    colors: [
      { key: 'income-color', desc: 'Income amounts' },
      { key: 'expense-color', desc: 'Expense amounts' },
      { key: 'positive-color', desc: 'Positive values' },
      { key: 'negative-color', desc: 'Negative values' },
    ],
  },
  {
    name: 'STATE',
    colors: [
      { key: 'paid-color', desc: 'Paid status' },
      { key: 'unpaid-color', desc: 'Unpaid status' },
      { key: 'partial-color', desc: 'Partial status' },
      { key: 'pending-color', desc: 'Pending status' },
    ],
  },
];

// Display a single theme palette
function showPalette(colors: ThemeColors, themeName: string): void {
  const width = 70;
  const line = '═'.repeat(width);

  console.log('');
  console.log(line);
  console.log(`  ${themeName.toUpperCase()} THEME PALETTE`);
  console.log(line);

  for (const category of COLOR_CATEGORIES) {
    console.log('');
    console.log(`  ${category.name}`);

    for (const { key, desc } of category.colors) {
      const hex = colors[key];
      if (hex) {
        console.log(colorRow(hex, `--${key}`, desc));
      }
    }
  }

  console.log('');
  console.log(line);
  console.log('');
}

// Compare two themes side by side
function comparePalettes(
  colors1: ThemeColors,
  name1: string,
  colors2: ThemeColors,
  name2: string
): void {
  const width = 90;
  const line = '═'.repeat(width);

  console.log('');
  console.log(line);
  console.log(`  PALETTE COMPARISON: ${name1.toUpperCase()} vs ${name2.toUpperCase()}`);
  console.log(line);

  for (const category of COLOR_CATEGORIES) {
    console.log('');
    console.log(`  ${category.name}`);
    console.log(`  ${'─'.repeat(width - 4)}`);

    for (const { key, desc } of category.colors) {
      const hex1 = colors1[key] || '';
      const hex2 = colors2[key] || '';

      if (hex1 || hex2) {
        const block1 = hex1 ? colorBlock(hex1) : '    ';
        const block2 = hex2 ? colorBlock(hex2) : '    ';
        const varName = `--${key}`.padEnd(18);
        const hex1Pad = (hex1 || 'N/A').padEnd(24);
        const hex2Pad = (hex2 || 'N/A').padEnd(24);

        console.log(`  ${block1} ${hex1Pad}  ${block2} ${hex2Pad} ${varName}`);
      }
    }
  }

  console.log('');
  console.log(line);
  console.log(`  Legend: Left = ${name1}, Right = ${name2}`);
  console.log(line);
  console.log('');
}

// Main
const arg = process.argv[2] || 'dark';

switch (arg.toLowerCase()) {
  case 'dark':
    showPalette(DARK_THEME_COLORS, 'Dark');
    break;
  case 'light':
    showPalette(LIGHT_THEME_COLORS, 'Light');
    break;
  case 'compare':
    comparePalettes(DARK_THEME_COLORS, 'Dark', LIGHT_THEME_COLORS, 'Light');
    break;
  default:
    console.log('Usage: bun scripts/show-palette.ts [dark|light|compare]');
    console.log('');
    console.log('  dark     Show dark theme palette (default)');
    console.log('  light    Show light theme palette');
    console.log('  compare  Side-by-side comparison');
    process.exit(1);
}
