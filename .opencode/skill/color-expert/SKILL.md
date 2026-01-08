---
name: color-expert
description: Expert guide for the Doggy Bag color/theme system with color theory principles
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: design
---

# Color Expert - Theme System Guide

Use this skill when working with colors, themes, or the visual design system in Doggy Bag.

## System Architecture

### Theme Module Location

```
src/lib/theme/
├── index.ts      # Public API exports
├── types.ts      # Type definitions, color key constants
├── defaults.ts   # Complete color definitions (dark + light)
├── loader.ts     # Load/merge themes from JSON
├── applier.ts    # Apply themes to DOM via CSS variables
├── validator.ts  # Validate theme JSON
└── themes/
    ├── dark.json   # Dark theme (7 required colors + meta)
    └── light.json  # Light theme (7 required colors + meta)
```

### Theme Storage Locations

| Type                | Location                                       | Purpose            |
| ------------------- | ---------------------------------------------- | ------------------ |
| Built-in defaults   | `src/lib/theme/themes/dark.json`, `light.json` | Ship with app      |
| User-created themes | `data/themes/*.json`                           | User customization |

### Data Flow

```
User selects theme (Settings)
         │
         ▼
┌─────────────────┐
│ Svelte Store    │  themeMode: 'dark' | 'light' | 'system'
│ (stores/theme)  │  Persisted in localStorage
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ loadTheme()     │  Reads JSON, merges with defaults.ts
│ (loader.ts)     │  Returns complete Theme object
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ applyTheme()    │  Sets CSS custom properties on :root
│ (applier.ts)    │  document.documentElement.style.setProperty()
└────────┬────────┘
         │
         ▼
   CSS Variables Active
   Components use var(--color-name)
```

---

## Color Variables Reference

### Required Colors (7) - Must Be Defined

| Variable           | Dark Value | Light Value | Purpose              |
| ------------------ | ---------- | ----------- | -------------------- |
| `--bg-base`        | `#0f0f1a`  | `#f5f5f7`   | Page background      |
| `--bg-surface`     | `#1a1a2e`  | `#ffffff`   | Cards/panels         |
| `--bg-elevated`    | `#1e1e2e`  | `#ffffff`   | Modals/dropdowns     |
| `--text-primary`   | `#e4e4e7`  | `#1a1a2e`   | Main text            |
| `--text-secondary` | `#888888`  | `#666666`   | Muted text           |
| `--accent`         | `#24c8db`  | `#0891b2`   | Primary action color |
| `--border-default` | `#333355`  | `#d1d5db`   | Default borders      |

### Optional Colors (~40) - Have Smart Defaults

#### Text Variants

| Variable          | Purpose                    |
| ----------------- | -------------------------- |
| `--text-tertiary` | Even more muted text       |
| `--text-inverse`  | Text on accent backgrounds |
| `--text-disabled` | Disabled element text      |

#### Border Variants

| Variable         | Purpose                          |
| ---------------- | -------------------------------- |
| `--border-hover` | Border on hover                  |
| `--border-focus` | Border on focus (usually accent) |

#### Accent Variants

| Variable         | Purpose                            |
| ---------------- | ---------------------------------- |
| `--accent-hover` | Accent on hover (darker/lighter)   |
| `--accent-muted` | Transparent accent for backgrounds |

#### Semantic: Success

| Variable           | Purpose                          |
| ------------------ | -------------------------------- |
| `--success`        | Success state (green)            |
| `--success-dark`   | Darker success variant           |
| `--success-bg`     | Success background (10% opacity) |
| `--success-border` | Success border (30% opacity)     |

#### Semantic: Error/Danger

| Variable         | Purpose                    |
| ---------------- | -------------------------- |
| `--error`        | Error state (red)          |
| `--error-dark`   | Darker error variant       |
| `--danger`       | Danger state (same family) |
| `--danger-hover` | Danger hover               |
| `--error-bg`     | Error background           |
| `--error-border` | Error border               |

#### Semantic: Warning

| Variable           | Purpose               |
| ------------------ | --------------------- |
| `--warning`        | Warning state (amber) |
| `--warning-light`  | Lighter warning       |
| `--warning-bg`     | Warning background    |
| `--warning-border` | Warning border        |

#### Semantic: Info

| Variable    | Purpose                           |
| ----------- | --------------------------------- |
| `--info`    | Info state (often same as accent) |
| `--info-bg` | Info background                   |

#### Special Colors

| Variable        | Purpose                            |
| --------------- | ---------------------------------- |
| `--purple`      | Purple accent (credit cards, etc.) |
| `--purple-dark` | Darker purple                      |
| `--purple-bg`   | Purple background                  |
| `--orange`      | Orange accent                      |
| `--orange-bg`   | Orange background                  |

#### Financial Semantics

| Variable           | Purpose                |
| ------------------ | ---------------------- |
| `--income-color`   | Income amounts (green) |
| `--expense-color`  | Expense amounts (red)  |
| `--positive-color` | Positive values        |
| `--negative-color` | Negative values        |

#### State Colors

| Variable          | Purpose                |
| ----------------- | ---------------------- |
| `--paid-color`    | Paid status (green)    |
| `--unpaid-color`  | Unpaid status (red)    |
| `--partial-color` | Partially paid (amber) |
| `--pending-color` | Pending (yellow)       |

---

## Theme JSON Format

### Schema

```json
{
  "id": "string", // Unique identifier (e.g., "dark", "ocean")
  "name": "string", // Display name (e.g., "Dark", "Ocean Blue")
  "version": "1.0", // Schema version
  "isDark": true, // true = dark theme, false = light theme
  "colors": {
    // 7 required colors (must be defined)
    "bg-base": "#hex",
    "bg-surface": "#hex",
    "bg-elevated": "#hex",
    "text-primary": "#hex",
    "text-secondary": "#hex",
    "accent": "#hex",
    "border-default": "#hex",
    // Optional colors (omit to use defaults)
    "success": "#hex"
    // ... etc
  },
  "meta": {
    // Optional metadata
    "description": "string",
    "author": "string"
  }
}
```

### Minimal Theme Example (7 colors)

```json
{
  "id": "ocean",
  "name": "Ocean",
  "version": "1.0",
  "isDark": true,
  "colors": {
    "bg-base": "#0a1628",
    "bg-surface": "#0f2744",
    "bg-elevated": "#153357",
    "text-primary": "#e0f2fe",
    "text-secondary": "#7dd3fc",
    "accent": "#38bdf8",
    "border-default": "#1e4976"
  },
  "meta": {
    "description": "Deep ocean blue theme",
    "author": "Your Name"
  }
}
```

All ~40 optional colors will be derived from defaults based on `isDark`.

---

## Palette Visualization

### Terminal Command

```bash
make show-palette              # Shows dark theme (default)
make show-palette theme=light  # Shows light theme
make show-palette theme=compare # Side-by-side comparison
```

This displays actual colored swatches in your terminal using ANSI escape codes.

**Note:** Run in your terminal directly, not through OpenCode's output panel.

### What You'll See

```
══════════════════════════════════════════════════════════════════════
  DARK THEME PALETTE
══════════════════════════════════════════════════════════════════════

  BACKGROUNDS
  ████  #0f0f1a  --bg-base         Page background
  ████  #1a1a2e  --bg-surface      Cards/panels
  ████  #1e1e2e  --bg-elevated     Modals/dropdowns

  TEXT
  ████  #e4e4e7  --text-primary    Main text
  ████  #888888  --text-secondary  Muted text
  ...
```

---

## Creating New Color Profiles

### Step 1: Choose Base Type

Decide if your theme is dark (`isDark: true`) or light (`isDark: false`).
This affects how defaults are derived.

### Step 2: Create Minimal JSON

Start with just the 7 required colors in `data/themes/mytheme.json`:

```json
{
  "id": "mytheme",
  "name": "My Theme",
  "version": "1.0",
  "isDark": true,
  "colors": {
    "bg-base": "#...",
    "bg-surface": "#...",
    "bg-elevated": "#...",
    "text-primary": "#...",
    "text-secondary": "#...",
    "accent": "#...",
    "border-default": "#..."
  }
}
```

### Step 3: Override Optional Colors (As Needed)

Add optional colors only if you want different values from defaults:

```json
{
  "colors": {
    // ... required colors ...
    "success": "#00ff88", // Custom success color
    "income-color": "#00ff88" // Match success
  }
}
```

### Step 4: Validate

```typescript
import { validateTheme } from './src/lib/theme/validator';
import { loadTheme } from './src/lib/theme/loader';

const result = validateTheme(myThemeJson);
if (!result.valid) {
  console.error(result.errors);
}

const fullTheme = loadTheme(myThemeJson); // Merges with defaults
```

### Step 5: Test

```typescript
import { applyTheme } from './src/lib/theme/applier';
applyTheme(fullTheme); // Applies to document.documentElement
```

---

## Color Theory Fundamentals

### Color Harmony Types

| Harmony                 | Description                       | Best For                  |
| ----------------------- | --------------------------------- | ------------------------- |
| **Complementary**       | Opposite on color wheel           | High contrast accents     |
| **Analogous**           | Adjacent colors                   | Cohesive, subtle palettes |
| **Triadic**             | Three evenly spaced               | Balanced variety          |
| **Split-complementary** | Base + two adjacent to complement | Vibrant but balanced      |

### Choosing an Accent Color

1. **Brand alignment** - Match your brand identity
2. **Accessibility** - Must have sufficient contrast on backgrounds
3. **Emotional resonance** - Cyan = modern/tech, Green = growth, Purple = premium

### The 60-30-10 Rule

| Proportion | Role       | Example                                |
| ---------- | ---------- | -------------------------------------- |
| 60%        | Background | `--bg-base`, `--bg-surface`            |
| 30%        | Secondary  | `--text-secondary`, `--border-default` |
| 10%        | Accent     | `--accent`, semantic colors            |

---

## Color Derivation Patterns

### Hover States

```
Dark theme:  base color → lighten 10-15%
Light theme: base color → darken 10-15%
```

Example:

- `--accent: #24c8db` → `--accent-hover: #1ab0c9` (darker)

### Muted/Background Variants

```
accent-muted = rgba(accent, 0.1)
success-bg   = rgba(success, 0.1)
error-border = rgba(error, 0.3)
```

### Semantic Color Families

Each semantic color (success, error, warning) has 4 variants:

```
success family:
  --success        = #4ade80  (primary, for icons/text)
  --success-dark   = #22c55e  (darker, for text on light bg)
  --success-bg     = rgba(..., 0.1)  (subtle background)
  --success-border = rgba(..., 0.3)  (visible but soft)
```

---

## Accessibility & Contrast

### WCAG Contrast Requirements

| Level          | Normal Text (< 18pt) | Large Text (>= 18pt) |
| -------------- | -------------------- | -------------------- |
| AA (minimum)   | 4.5:1                | 3:1                  |
| AAA (enhanced) | 7:1                  | 4.5:1                |

### Key Pairs to Verify

| Foreground         | Background     | Requirement                |
| ------------------ | -------------- | -------------------------- |
| `--text-primary`   | `--bg-base`    | Must pass AA (4.5:1)       |
| `--text-primary`   | `--bg-surface` | Must pass AA               |
| `--text-secondary` | `--bg-surface` | Should pass AA             |
| `--text-inverse`   | `--accent`     | Must pass AA (button text) |

### Contrast Calculation

Relative luminance formula:

```
L = 0.2126 * R + 0.7152 * G + 0.0722 * B
Contrast = (L1 + 0.05) / (L2 + 0.05)
```

Tools:

- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Browser DevTools: Inspect element → Color picker shows contrast ratio

---

## Financial & State Color Psychology

### Financial Colors

| Variable           | Color | Psychology                     |
| ------------------ | ----- | ------------------------------ |
| `--income-color`   | Green | Growth, positive, "go" signal  |
| `--expense-color`  | Red   | Caution, negative, attention   |
| `--positive-color` | Green | Universal positive association |
| `--negative-color` | Red   | Universal negative association |

**Cultural note:** Green/red associations are Western-centric. Some cultures reverse these meanings.

### State Colors

| State   | Color        | Reason                         |
| ------- | ------------ | ------------------------------ |
| Paid    | Green        | Completion, success            |
| Unpaid  | Red          | Attention needed, urgent       |
| Partial | Amber/Orange | In-progress, caution           |
| Pending | Yellow       | Awaiting action, neutral alert |

---

## Component Usage Rules

### Hard Rule (from AGENTS.md)

> **NO HARDCODED COLORS**: Never use hardcoded hex colors in CSS. Always use CSS variables from the theme system.

### Correct Usage

```css
/* Good - Always use variables */
.card {
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.button-primary {
  background: var(--accent);
  color: var(--text-inverse);
}

.button-primary:hover {
  background: var(--accent-hover);
}

.income-amount {
  color: var(--income-color);
}

.expense-amount {
  color: var(--expense-color);
}
```

### Incorrect Usage

```css
/* Bad - Never hardcode */
.card {
  background: #1a1a2e; /* DON'T DO THIS */
  color: #e4e4e7; /* DON'T DO THIS */
}
```

---

## Quick Reference

### Files to Modify

| Task                   | File(s)                                                  |
| ---------------------- | -------------------------------------------------------- |
| Change default colors  | `src/lib/theme/defaults.ts`                              |
| Add new color variable | `src/lib/theme/types.ts` (add to arrays) + `defaults.ts` |
| Create built-in theme  | `src/lib/theme/themes/*.json`                            |
| Create user theme      | `data/themes/*.json`                                     |

### Theme Store API

```typescript
import { themeMode, currentTheme, isDarkTheme } from '../stores/theme';

$themeMode; // 'dark' | 'light' | 'system'
$isDarkTheme; // boolean
$currentTheme; // Full Theme object

themeMode.set('light'); // Change theme
```

### Programmatic Theme Creation

```typescript
import { createTheme, loadTheme, applyTheme } from './src/lib/theme';

// Create from scratch
const theme = createTheme({
  id: 'custom',
  name: 'Custom',
  isDark: true,
  colors: {
    /* required colors */
  },
});

// Load from JSON
const theme = loadTheme(jsonObject);

// Apply to DOM
applyTheme(theme);
```

---

## Old → New Color Mapping

For migrating hardcoded colors:

| Old Hardcoded                   | New Variable            |
| ------------------------------- | ----------------------- |
| `#0f0f1a`                       | `var(--bg-base)`        |
| `#1a1a2e`                       | `var(--bg-surface)`     |
| `#1e1e2e`                       | `var(--bg-elevated)`    |
| `#e4e4e7`                       | `var(--text-primary)`   |
| `#888888`, `#888`               | `var(--text-secondary)` |
| `#666666`, `#666`               | `var(--text-tertiary)`  |
| `#24c8db`                       | `var(--accent)`         |
| `#1ba8b8`                       | `var(--accent-hover)`   |
| `rgba(36, 200, 219, 0.1)`       | `var(--accent-muted)`   |
| `#333355`                       | `var(--border-default)` |
| `#4ade80`, `#22c55e`            | `var(--success)`        |
| `#f87171`, `#ff6b6b`, `#ef4444` | `var(--error)`          |
| `#f59e0b`                       | `var(--warning)`        |
| `#000`, `#000000`               | `var(--text-inverse)`   |
