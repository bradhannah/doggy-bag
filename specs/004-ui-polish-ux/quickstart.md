# Quickstart: UI Polish & UX Improvements

**Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md) | **Branch**: `004-ui-polish-ux`

## Prerequisites

- Bun 1.x installed
- Rust toolchain with Tauri CLI (`cargo install tauri-cli`)
- Node.js 18+ (for npm scripts)

## Getting Started

### 1. Start Development Environment

```bash
# Terminal 1: Start the API server
cd api && bun run dev

# Terminal 2: Start the frontend
bun run dev

# Terminal 3 (optional): Start Tauri desktop app
cargo tauri dev
```

Or use the Makefile:
```bash
make dev
```

### 2. Access the App

- **Browser**: http://localhost:5173
- **Tauri**: Desktop window opens automatically

---

## Testing Each Feature

### Feature 1: Window Size Persistence

**Test Steps** (Tauri only):
1. Launch the Tauri app: `cargo tauri dev`
2. Resize the window to a custom size (e.g., 1200x800)
3. Close the app completely
4. Relaunch the app
5. **Verify**: Window opens at the same size (1200x800)

**Edge Cases**:
- Maximize window, close, reopen - should restore maximized
- Resize to minimum, close, reopen - should restore minimum

### Feature 2: Responsive Layout

**Test Steps**:
1. Navigate to Details view (`/month/2026-01`)
2. Resize window width from wide to narrow
3. **Verify**: Bills and Income sections stack vertically when narrow
4. **Verify**: No horizontal scrollbar appears at any width above 600px
5. Resize back to wide
6. **Verify**: Sections return to side-by-side layout

**Breakpoints to Test**:
- 900px container width: Sections should stack
- 1100px+ container width: Sections should be side-by-side

### Feature 3: Category Visual States

**Test Steps**:
1. Navigate to Details view
2. Mark all items in a category as paid
3. **Verify**: Category header becomes crossed out and grayed (opacity 0.6)
4. **Verify**: Category moves to bottom of list
5. Check an empty category (no items)
6. **Verify**: Empty category is also crossed out and at bottom
7. Click [+] on a completed/empty category
8. **Verify**: Add item modal still works

### Feature 4: CC Payoff Balance Sync

**Test Steps**:
1. Set up a credit card with `pay_off_monthly` enabled in Setup
2. Navigate to Details view
3. Find the CC payoff bill row
4. Mark the payment as paid
5. **Verify**: Sync modal appears asking to update balance
6. Modal shows: Current balance, Payment amount, New balance
7. Click "Update Balance"
8. **Verify**: Credit card balance in sidebar updates
9. Repeat with "Skip" button
10. **Verify**: Balance remains unchanged

### Feature 5: Navigation Reorganization

**Test Steps**:
1. View the navigation sidebar
2. **Verify** order: Dashboard, Details, (separator), Manage Months, Budget Config
3. **Verify**: "Setup" is renamed to "Budget Config"
4. **Verify**: Settings is in the footer area (small link)
5. Click each nav item
6. **Verify**: All navigation works correctly

### Feature 6: Remove Duplicate Leftover

**Test Steps**:
1. Navigate to Details view
2. **Verify**: No Leftover display in the header area
3. **Verify**: Leftover is displayed only in the left sidebar box

### Feature 7: Bank Accounts Header Green

**Test Steps**:
1. Navigate to Details view
2. Look at the left sidebar
3. **Verify**: "BANK ACCOUNTS & CASH" header is green (#4ade80)
4. **Verify**: "CREDIT & LINES OF CREDIT" header is red (#f87171)

### Feature 8: Remove Net Worth

**Test Steps**:
1. Navigate to Details view
2. Look at the left sidebar
3. **Verify**: No "Net Worth" row after the debt accounts section

### Feature 9: Persist Compact Mode

**Test Steps**:
1. Navigate to Details view
2. Click the Compact toggle button (two-line icon)
3. **Verify**: View switches to compact mode
4. Navigate to Dashboard, then back to Details
5. **Verify**: Compact mode is still enabled
6. Close and reopen the app
7. **Verify**: Compact mode is still enabled

### Feature 10: Scroll Position Stability

**Test Steps**:
1. Navigate to Details view with many items
2. Scroll down partway
3. Click on a bill to open edit drawer
4. **Verify**: Page does not jump to top
5. Save changes
6. **Verify**: Page returns to approximately same scroll position
7. Add a new ad-hoc item
8. **Verify**: Page scrolls to show the new item

### Feature 11: Remove Delete from CC Payoffs

**Test Steps**:
1. Set up a credit card with `pay_off_monthly` enabled
2. Navigate to Details view
3. Find the CC payoff bill row
4. **Verify**: No delete button on CC payoff rows
5. **Verify**: Regular bill rows still have delete buttons

### Feature 12: Generate Anonymized Example Data

**Test Steps**:
```bash
# Run the script
bun run scripts/generate-example-data.ts

# Check output
ls data/example/entities/
cat data/example/entities/bills.json

# Verify
# - Names are generic ("Bill 1", "Income 1", etc.)
# - Amounts are different from original (±20%)
# - Original data in data/entities/ is unchanged
```

---

## API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/months/{month}` | GET | Get detailed month data |
| `/api/months/{month}/bills/{id}/paid` | POST | Toggle bill paid status |
| `/api/months/{month}/bank-balances` | PUT | Update bank balances |
| `/api/payment-sources` | GET | Get all payment sources |

---

## Common Issues

### Window size not persisting
- Ensure you're testing in Tauri (`cargo tauri dev`), not browser
- Check console for Tauri Store errors
- Verify `settings.json` exists in app data directory

### Horizontal scrollbar still appears
- Check DevTools for which element is causing overflow
- Verify CSS changes were applied (hard refresh)
- Test at exactly 900px container width

### CC sync modal not appearing
- Verify the bill has `is_cc_payoff: true`
- Check browser console for errors
- Ensure payment source exists and has a balance

### Compact mode not persisting
- Clear localStorage: `localStorage.removeItem('budgetforfun-compact-mode')`
- Check browser console for storage errors
- Verify in Dev Tools > Application > Local Storage

---

## Debugging

### Enable verbose logging
```typescript
// In any component
console.log('[Debug]', { value });
```

### Check Tauri Store contents
```typescript
import { Store } from '@tauri-apps/plugin-store';
const store = await Store.load('settings.json');
const all = await store.entries();
console.log('Store contents:', all);
```

### Check localStorage
```javascript
// In browser console
Object.entries(localStorage).filter(([k]) => k.startsWith('budgetforfun'))
```

---

**Version**: 1.0.0 | **Created**: 2026-01-03
