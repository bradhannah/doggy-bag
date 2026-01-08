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

| Variable           | Description                        |
| ------------------ | ---------------------------------- |
| `--text-tertiary`  | Even more muted text               |
| `--text-inverse`   | Text on accent backgrounds         |
| `--text-disabled`  | Disabled element text              |
| `--border-hover`   | Border color on hover              |
| `--border-focus`   | Border color on focus              |
| `--accent-hover`   | Accent color on hover              |
| `--accent-muted`   | Transparent accent for backgrounds |
| `--success`        | Success/positive color             |
| `--success-dark`   | Darker success variant             |
| `--success-bg`     | Success background                 |
| `--success-border` | Success border                     |
| `--error`          | Error/danger color                 |
| `--error-dark`     | Darker error variant               |
| `--error-bg`       | Error background                   |
| `--error-border`   | Error border                       |
| `--warning`        | Warning color                      |
| `--warning-light`  | Lighter warning variant            |
| `--warning-bg`     | Warning background                 |
| `--warning-border` | Warning border                     |
| `--info`           | Info color                         |
| `--info-bg`        | Info background                    |
| `--purple`         | Purple accent                      |
| `--purple-dark`    | Darker purple variant              |
| `--purple-bg`      | Purple background                  |
| `--orange`         | Orange accent                      |
| `--orange-bg`      | Orange background                  |
| `--income-color`   | Income amounts                     |
| `--expense-color`  | Expense amounts                    |
| `--positive-color` | Positive values                    |
| `--negative-color` | Negative values                    |
| `--paid-color`     | Paid status                        |
| `--unpaid-color`   | Unpaid status                      |
| `--partial-color`  | Partially paid status              |
| `--pending-color`  | Pending status                     |

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
