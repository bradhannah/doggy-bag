# Colour Themes

Doggy Bag supports Dark and Light themes with a System option that follows your OS preference.

## Using Themes

Go to **Settings > Appearance > Theme** and select:

- **Dark** - Dark backgrounds with light text (default)
- **Light** - Light backgrounds with dark text
- **System** - Automatically follows your OS preference

## How It Works

### Theme Files

Theme definitions are in `src/lib/theme/`:

- `themes/dark.json` - Dark theme overrides
- `themes/light.json` - Light theme overrides
- `defaults.ts` - Complete color definitions for both themes

### CSS Variables

Themes work by setting CSS custom properties on `:root`. Components use these variables instead of hardcoded colors.

### Available CSS Variables

#### Required Colors (must be defined)

| Variable           | Description                 |
| ------------------ | --------------------------- |
| `--bg-base`        | Page background             |
| `--bg-surface`     | Card/panel background       |
| `--bg-elevated`    | Elevated element background |
| `--text-primary`   | Main text color             |
| `--text-secondary` | Secondary/muted text        |
| `--accent`         | Primary accent color        |
| `--border-default` | Default border color        |

#### Optional Colors (have defaults)

**Naming conventions:**

- `{color}` - Primary color (text, icons, solid elements)
- `{color}-hover` - Hover state for buttons/interactive elements
- `{color}-bg` - Background fill (~0.1 opacity)
- `{color}-muted` - Subtle background for hover states (~0.05 opacity)
- `{color}-border` - Border color (~0.3 opacity)

**Text Variants:**

| Variable          | Description                |
| ----------------- | -------------------------- |
| `--text-tertiary` | Even more muted text       |
| `--text-inverse`  | Text on accent backgrounds |
| `--text-disabled` | Disabled element text      |

**Border Variants:**

| Variable          | Description                          |
| ----------------- | ------------------------------------ |
| `--border-hover`  | Border color on hover                |
| `--border-focus`  | Border color on focus                |
| `--border-subtle` | Softer borders (list dividers, etc.) |

**Accent Variants:**

| Variable          | Description                        |
| ----------------- | ---------------------------------- |
| `--accent-hover`  | Accent color on hover              |
| `--accent-muted`  | Transparent accent for backgrounds |
| `--accent-border` | Accent border color                |

**Semantic: Success:**

| Variable           | Description               |
| ------------------ | ------------------------- |
| `--success`        | Success/positive color    |
| `--success-hover`  | Success color on hover    |
| `--success-bg`     | Success background (~0.1) |
| `--success-muted`  | Subtle success background |
| `--success-border` | Success border            |

**Semantic: Error:**

| Variable         | Description             |
| ---------------- | ----------------------- |
| `--error`        | Error/danger color      |
| `--error-hover`  | Error color on hover    |
| `--error-bg`     | Error background (~0.1) |
| `--error-muted`  | Subtle error background |
| `--error-border` | Error border            |

**Semantic: Warning:**

| Variable           | Description               |
| ------------------ | ------------------------- |
| `--warning`        | Warning color             |
| `--warning-hover`  | Warning color on hover    |
| `--warning-bg`     | Warning background        |
| `--warning-muted`  | Subtle warning background |
| `--warning-border` | Warning border            |

**Semantic: Info:**

| Variable       | Description            |
| -------------- | ---------------------- |
| `--info`       | Info color             |
| `--info-hover` | Info color on hover    |
| `--info-bg`    | Info background        |
| `--info-muted` | Subtle info background |

**Special: Purple (credit cards, etc.):**

| Variable         | Description              |
| ---------------- | ------------------------ |
| `--purple`       | Purple accent            |
| `--purple-hover` | Purple on hover          |
| `--purple-bg`    | Purple background        |
| `--purple-muted` | Subtle purple background |

**Special: Orange:**

| Variable         | Description       |
| ---------------- | ----------------- |
| `--orange`       | Orange accent     |
| `--orange-hover` | Orange on hover   |
| `--orange-bg`    | Orange background |

**UI: Overlays and Shadows:**

| Variable          | Description              |
| ----------------- | ------------------------ |
| `--overlay-bg`    | Modal overlay background |
| `--shadow-light`  | Light shadow             |
| `--shadow-medium` | Medium shadow            |
| `--shadow-heavy`  | Heavy shadow             |

**UI: Hover States:**

| Variable            | Description                  |
| ------------------- | ---------------------------- |
| `--bg-hover`        | Background on hover          |
| `--bg-hover-strong` | Stronger background on hover |

**Financial Semantics:**

| Variable           | Description     |
| ------------------ | --------------- |
| `--income-color`   | Income amounts  |
| `--expense-color`  | Expense amounts |
| `--positive-color` | Positive values |
| `--negative-color` | Negative values |

**State Colors:**

| Variable          | Description           |
| ----------------- | --------------------- |
| `--paid-color`    | Paid status           |
| `--unpaid-color`  | Unpaid status         |
| `--partial-color` | Partially paid status |
| `--pending-color` | Pending status        |

## For Developers

### Using Theme Colors in Components

Always use CSS variables instead of hardcoded colors:

```css
/* Good */
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

/* Bad - don't do this */
.card {
  background: #1a1a2e;
  color: #e4e4e7;
}
```

### Color Mapping Reference

| Old Hardcoded                   | New Variable            |
| ------------------------------- | ----------------------- |
| `#0f0f1a`                       | `var(--bg-base)`        |
| `#1a1a2e`                       | `var(--bg-surface)`     |
| `#252538`                       | `var(--bg-elevated)`    |
| `#e4e4e7`                       | `var(--text-primary)`   |
| `#949494`                       | `var(--text-secondary)` |
| `#7a7a7a`                       | `var(--text-tertiary)`  |
| `#24c8db`                       | `var(--accent)`         |
| `#1ab0c9`                       | `var(--accent-hover)`   |
| `rgba(36, 200, 219, 0.1)`       | `var(--accent-muted)`   |
| `#3d3d66`                       | `var(--border-default)` |
| `#4ade80`, `#22c55e`            | `var(--success)`        |
| `#f87171`, `#ff6b6b`, `#ef4444` | `var(--error)`          |
| `#e5a91f`                       | `var(--warning)`        |
| `#000`, `#000000`               | `var(--text-inverse)`   |

### Theme Store API

```typescript
import { themeMode, currentTheme, isDarkTheme } from '../stores/theme';

// Get current mode
$themeMode; // 'dark' | 'light' | 'system'

// Set mode
themeMode.set('light');

// Check if dark theme is active
$isDarkTheme; // boolean

// Get full theme object
$currentTheme; // Theme object with all colors
```

### Initializing Theme

The theme is initialized in `+layout.svelte`:

```typescript
import { initializeTheme } from '../stores/theme';

if (typeof window !== 'undefined') {
  initializeTheme();
}
```

This must run before the app renders to prevent a flash of wrong colors.
