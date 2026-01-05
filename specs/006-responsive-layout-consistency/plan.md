# Implementation Plan: Responsive Layout Consistency

**Feature Branch**: `006-responsive-layout-consistency`  
**Created**: 2026-01-04  
**Status**: Ready for Implementation

## Overview

This plan outlines the implementation approach for achieving consistent responsive layouts across all screens in BudgetForFun. The implementation follows a systematic approach: first establishing design tokens, then updating the root layout, and finally applying consistent styles to each screen.

---

## Phase 1: Design Tokens & CSS Variables

**Goal**: Create a centralized set of CSS custom properties for spacing, sizing, breakpoints, and layout values.

### Task 1.1: Add Design Tokens to Root Layout

**File**: `src/routes/+layout.svelte`

Add the following CSS custom properties to `:global(:root)`:

```css
:root {
  /* Spacing Scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* Layout Widths */
  --sidebar-width: 220px;
  --summary-sidebar-width: 260px;
  --tab-sidebar-width: 200px;
  --drawer-width: 400px;
  --modal-width: 500px;
  --modal-width-sm: 400px;

  /* Content Max Widths */
  --content-max-sm: 800px; /* Dashboard, Settings */
  --content-max-md: 1200px; /* Manage Months */
  --content-max-lg: 1800px; /* Details View */

  /* Content Padding */
  --content-padding: 24px;
  --content-padding-mobile: 16px;

  /* Component Sizes */
  --button-height: 44px;
  --button-height-sm: 32px;
  --input-height: 44px;
  --icon-button-size: 36px;

  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Breakpoints (for reference - use in media queries) */
  /* Mobile: < 768px */
  /* Tablet: 768px - 1199px */
  /* Desktop: >= 1200px */
}
```

### Task 1.2: Update Main Content Margin

**File**: `src/routes/+layout.svelte`

Update `.main-content` to use the CSS variable:

```css
.main-content {
  flex: 1;
  margin-left: var(--sidebar-width);
  padding: 0;
  min-height: 100vh;
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
  }
}
```

---

## Phase 2: Screen-by-Screen Updates

### Task 2.1: Dashboard (`src/components/Dashboard/Dashboard.svelte`)

**Current Issues**:

- Uses `padding: 24px` (hardcoded) - OK
- Uses `max-width: 800px` (hardcoded)
- Button heights inconsistent

**Changes**:

1. Replace hardcoded values with CSS variables
2. Ensure button heights use `var(--button-height)`
3. Add mobile responsive padding

```css
.dashboard {
  max-width: var(--content-max-sm);
  margin: 0 auto;
  padding: var(--content-padding);
}

@media (max-width: 768px) {
  .dashboard {
    padding: var(--content-padding-mobile);
  }
}

.btn {
  height: var(--button-height);
  padding: 0 var(--space-6);
  /* ... */
}
```

### Task 2.2: Settings Page (`src/routes/settings/+page.svelte`)

**Current Issues**:

- Uses `max-width: 800px` and `padding: 24px` (hardcoded but correct values)
- Button heights may vary
- Modal widths hardcoded

**Changes**:

1. Replace hardcoded max-width and padding with CSS variables
2. Standardize button heights to `var(--button-height)`
3. Update modal widths to use `var(--modal-width)`
4. Add mobile responsive padding

```css
.settings-page {
  max-width: var(--content-max-sm);
  margin: 0 auto;
  padding: var(--content-padding);
}

@media (max-width: 768px) {
  .settings-page {
    padding: var(--content-padding-mobile);
  }
}

.modal {
  width: 90%;
  max-width: var(--modal-width);
}

.browse-button,
.action-button,
.btn-primary,
.btn-secondary {
  height: var(--button-height);
}

.directory-path {
  height: var(--input-height);
}
```

### Task 2.3: Manage Months Page (`src/routes/manage/+page.svelte`)

**Current Issues**:

- Uses `padding: 30px` (inconsistent - should be 24px)
- Uses `max-width: 1200px` (correct)
- Header has different padding than content

**Changes**:

1. Standardize padding to `var(--content-padding)`
2. Replace hardcoded max-width with CSS variable
3. Align header padding with content padding
4. Standardize button heights

```css
.manage-header {
  padding: var(--space-4) var(--content-padding);
  /* ... */
}

.manage-content {
  padding: var(--content-padding);
  max-width: var(--content-max-md);
  margin: 0 auto;
}

@media (max-width: 768px) {
  .manage-header {
    padding: var(--space-4) var(--content-padding-mobile);
  }

  .manage-content {
    padding: var(--content-padding-mobile);
  }
}

.btn {
  height: var(--button-height-sm);
  /* ... */
}
```

### Task 2.4: Setup/Budget Config Page (`src/components/Setup/SetupPage.svelte`)

**Current Issues**:

- Uses `padding: 30px` (inconsistent)
- No max-width defined
- Tab sidebar width hardcoded
- Drawer widths may vary

**Changes**:

1. Standardize padding to `var(--content-padding)`
2. Add max-width for entity list content
3. Use CSS variable for tab sidebar width
4. Standardize drawer width to `var(--drawer-width)`

**Files to update**:

- `src/components/Setup/SetupPage.svelte`
- `src/components/Setup/Drawer.svelte`
- `src/components/Setup/setup-styles.css`

### Task 2.5: Details View (`src/routes/month/[month]/+page.svelte`)

**Current Issues**:

- Uses `padding: 20px` (inconsistent - should be 24px)
- Summary sidebar width hardcoded (260px - correct value)
- Uses `max-width: 1800px` (correct)

**Changes**:

1. Standardize padding to `var(--content-padding)`
2. Replace hardcoded sidebar width with CSS variable
3. Ensure drawer widths use `var(--drawer-width)`
4. Add mobile responsive behavior

**Files to update**:

- `src/routes/month/[month]/+page.svelte`
- `src/components/DetailedView/*.svelte`

### Task 2.6: Navigation Sidebar (`src/components/Navigation.svelte`)

**Current Issues**:

- Width may be hardcoded

**Changes**:

1. Ensure width uses `var(--sidebar-width)`
2. Verify mobile collapse behavior at 768px breakpoint

---

## Phase 3: Shared Components

### Task 3.1: Drawer Component Standardization

**File**: `src/components/Setup/Drawer.svelte`

Ensure all drawers use consistent width:

```css
.drawer {
  width: var(--drawer-width);
  max-width: 90vw;
}
```

### Task 3.2: Modal/Dialog Standardization

**Files**:

- `src/components/shared/ConfirmDialog.svelte`
- Any inline modals in pages

Ensure all modals use consistent sizing:

```css
.modal {
  width: 90%;
  max-width: var(--modal-width);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
}
```

### Task 3.3: Button Standardization

Create consistent button styles across all components:

```css
/* Primary button - all screens */
.btn-primary {
  height: var(--button-height);
  padding: 0 var(--space-6);
  border-radius: var(--radius-md);
}

/* Small button - inline actions */
.btn-sm {
  height: var(--button-height-sm);
  padding: 0 var(--space-4);
  border-radius: var(--radius-sm);
}
```

### Task 3.4: Input Standardization

Ensure all form inputs have consistent height:

```css
input[type='text'],
input[type='number'],
input[type='email'],
input[type='password'],
input[type='date'],
input[type='month'],
select,
textarea {
  height: var(--input-height);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
}
```

---

## Phase 4: Responsive Breakpoint Behavior

### Task 4.1: Mobile Breakpoint (<768px)

Add consistent mobile behavior across all screens:

1. **Navigation**: Collapse to hamburger menu (if not already implemented)
2. **Content Padding**: Reduce to `var(--content-padding-mobile)` (16px)
3. **Multi-column Layouts**: Stack to single column
4. **Buttons**: May wrap or stack

### Task 4.2: Container Queries (Future Enhancement)

Consider adding container queries for components that need to respond to their container size rather than viewport:

```css
@container content (max-width: 900px) {
  .two-column-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## Implementation Order

1. **Phase 1**: Design tokens (30 min)
   - Task 1.1: Add CSS variables to root
   - Task 1.2: Update main content styles

2. **Phase 2**: Screen updates (2-3 hours)
   - Task 2.1: Dashboard
   - Task 2.2: Settings
   - Task 2.3: Manage Months
   - Task 2.4: Setup/Budget Config
   - Task 2.5: Details View
   - Task 2.6: Navigation

3. **Phase 3**: Shared components (1 hour)
   - Task 3.1: Drawer
   - Task 3.2: Modal/Dialog
   - Task 3.3: Buttons
   - Task 3.4: Inputs

4. **Phase 4**: Responsive polish (1 hour)
   - Task 4.1: Mobile breakpoint consistency
   - Task 4.2: Testing at all breakpoints

---

## Testing Checklist

After implementation, run through the manual test procedures from the spec:

- [ ] MT-1.1: Main Content Padding Consistency
- [ ] MT-1.2: Section Header Alignment
- [ ] MT-1.3: Sidebar Width Consistency
- [ ] MT-2.1: Desktop to Tablet Transition
- [ ] MT-2.2: Tablet to Mobile Transition
- [ ] MT-2.3: Minimum Width Usability (375px)
- [ ] MT-2.4: Maximum Width Behavior (1920px+)
- [ ] MT-3.1: Card Component Widths
- [ ] MT-3.2: Drawer Width Consistency
- [ ] MT-3.3: Modal Width Consistency
- [ ] MT-3.4: Button Height Consistency
- [ ] MT-3.5: Input Height Consistency
- [ ] MT-4.1: Section Gap Consistency
- [ ] MT-4.2: Form Field Spacing
- [ ] MT-5.1: Live Resize Smoothness
- [ ] MT-5.2: No Horizontal Overflow Check

---

## Success Criteria

From the spec:

- SC-001: 100% of screens pass horizontal alignment audit (24px padding)
- SC-002: 0 horizontal scrollbars at any viewport 375px-1920px
- SC-003: All drawer widths are exactly 400px
- SC-004: All modal widths are within 400-500px range
- SC-005: 100% of breakpoints trigger at documented widths
- SC-006: 100% of screens render usably at 375px
- SC-007: Layout transitions complete smoothly during resize
- SC-008: All primary/secondary button heights are exactly 44px
- SC-009: All input field heights are exactly 44px
- SC-010: All screens use 24px horizontal content padding

---

**Version**: 1.0.0 | **Created**: 2026-01-04
