# Data Model: UI Polish & UX Improvements

**Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Overview

This feature introduces minimal new data structures focused on user preferences. No database schema changes are required; all new data is stored in the Tauri Store (`settings.json`) or localStorage.

---

## New Data Structures

### WindowState

Stores the user's preferred window dimensions for restoration on app launch.

**Storage Location**: Tauri Store (`settings.json`, key: `windowState`)

```typescript
interface WindowState {
  width: number;   // Window width in pixels
  height: number;  // Window height in pixels
  x?: number;      // Optional: Window X position
  y?: number;      // Optional: Window Y position
}
```

**Field Details**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `width` | number | Yes | 800 | Window width in logical pixels |
| `height` | number | Yes | 600 | Window height in logical pixels |
| `x` | number | No | - | Window X position (optional, for multi-monitor) |
| `y` | number | No | - | Window Y position (optional, for multi-monitor) |

**Validation Rules**:
- `width` must be >= 600 (minimum usable width)
- `height` must be >= 400 (minimum usable height)
- Position values are validated against current display bounds on restore

**Example**:
```json
{
  "windowState": {
    "width": 1200,
    "height": 800
  }
}
```

---

### UserPreferences (Extended)

The existing settings store is extended with additional UI preferences.

**Storage Location**: 
- Tauri: `settings.json` via plugin-store
- Browser: `localStorage`

```typescript
interface UserPreferences {
  // Existing
  zoomLevel: number;        // 0.5 to 2.0, default 1.0
  dataDirectory?: string;   // Custom data directory path
  
  // New for this feature
  compactMode: boolean;     // Compact view toggle, default false
  windowState?: WindowState; // Window dimensions
}
```

**New Fields**:

| Field | Type | Required | Default | Storage |
|-------|------|----------|---------|---------|
| `compactMode` | boolean | No | false | localStorage |
| `windowState` | WindowState | No | {width:800,height:600} | Tauri Store |

**Note**: `compactMode` uses localStorage (not Tauri Store) for simplicity, following the existing `widthMode` pattern.

---

## Modified Data Structures

### Bill Instance (Extended Flag)

Bill instances may have an `is_cc_payoff` flag indicating they are auto-generated credit card payoff entries.

**Location**: In-memory (derived from bill template)

```typescript
interface BillInstance {
  // Existing fields...
  id: string;
  bill_id: string;
  name: string;
  expected_amount: number;
  actual_amount?: number;
  is_paid: boolean;
  
  // Existing (may not be consistently used)
  is_cc_payoff?: boolean;  // True if this is a CC payoff entry
  payment_source_id?: string; // ID of the payment source (for CC sync)
}
```

**Note**: The `is_cc_payoff` flag already exists in the backend; this documents its use for the CC balance sync feature.

---

## Storage Keys Reference

### Tauri Store (`settings.json`)

| Key | Type | Description |
|-----|------|-------------|
| `zoomLevel` | number | WebView zoom factor (0.5-2.0) |
| `dataDirectory` | string | Custom data directory path |
| `windowState` | WindowState | Window size and position |

### localStorage

| Key | Type | Description |
|-----|------|-------------|
| `budgetforfun-width-mode` | string | Width mode: "small", "medium", "wide" |
| `budgetforfun-compact-mode` | string | Compact mode: "true" or "false" |
| `budgetforfun_zoom` | string | Browser zoom fallback (numeric string) |
| `budgetforfun_data_dir` | string | Browser data directory fallback |

---

## Data Flow

### Window Size Persistence

```
App Launch
    |
    v
+-------------------+     +-------------------+
|  Tauri Store      |---->|  Frontend         |
|  settings.json    |     |  +layout.svelte   |
|  (windowState)    |     |                   |
+-------------------+     +-------------------+
                                   |
                                   v
                          +-------------------+
                          |  Tauri Window API |
                          |  setSize()        |
                          +-------------------+

App Close
    |
    v
+-------------------+     +-------------------+
|  Rust lib.rs      |---->|  Tauri Store      |
|  on_window_event  |     |  settings.json    |
|  (CloseRequested) |     |  (windowState)    |
+-------------------+     +-------------------+
```

### Compact Mode Persistence

```
User Toggles Compact
    |
    v
+-------------------+     +-------------------+
|  DetailedMonth    |---->|  ui.ts store      |
|  View.svelte      |     |  compactMode      |
|  (button click)   |     |                   |
+-------------------+     +-------------------+
                                   |
                                   v
                          +-------------------+
                          |  localStorage     |
                          |  compact-mode     |
                          +-------------------+

Page Load / App Restart
    |
    v
+-------------------+     +-------------------+
|  localStorage     |---->|  ui.ts store      |
|  compact-mode     |     |  (on init)        |
+-------------------+     +-------------------+
```

---

## Example Data (Anonymized)

For the data generation script, here's the structure of anonymized output:

### Anonymized Bill

```json
{
  "id": "a1b2c3d4-...",
  "name": "Bill 1",
  "amount": 12500,
  "category_id": "utilities",
  "frequency": "monthly",
  "due_day": 15,
  "is_active": true
}
```

### Anonymized Income

```json
{
  "id": "e5f6g7h8-...",
  "name": "Income 1",
  "amount": 250000,
  "category_id": "salary",
  "frequency": "bi-weekly",
  "is_active": true
}
```

### Anonymized Payment Source

```json
{
  "id": "i9j0k1l2-...",
  "name": "Bank 1",
  "type": "checking",
  "balance": 150000,
  "is_active": true
}
```

---

## Migration Notes

### No Migration Required

This feature adds optional fields with sensible defaults:
- `windowState`: Default to 800x600 (current default)
- `compactMode`: Default to false (current behavior)

Users upgrading will experience no change in behavior until they modify these settings.

### Backward Compatibility

- Apps without `windowState` will use default dimensions
- Apps without `compactMode` in localStorage will default to false
- All existing data structures remain unchanged

---

**Version**: 1.0.0 | **Created**: 2026-01-03
