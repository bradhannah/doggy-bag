# UI Component Prototyping Decisions

**Date**: 2025-12-30  
**Purpose**: Document decisions made from UI prototyping phase

---

## Inputs

### Selected Variation: **Variation 1 - Native Input with $ Prefix**

**Reasoning**:

- Familiar to all users
- Works well on all platforms and screen readers
- Simple implementation, good accessibility
- Can enhance with formatting in future if needed

**Rejected Alternatives**:

- Variation 2 (Auto-formatting): Adds complexity, may confuse users when typing
- Variation 3 (Split inputs): Extra friction, users expect single field
- Variation 5 (Floating label): Nice visual but adds complexity for simple forms

**Configuration**:

- Prefix: `$` positioned before input
- Input: Native text field
- Formatting: Apply on blur (optional enhancement)

---

## Date Pickers

### Selected Variation: **Variation 2 - Native Month Input**

**Reasoning**:

- Platform-native experience (iOS wheel picker, Android calendar, OS-native dropdowns)
- Built-in validation and accessibility
- Clean, simple UX for month selection
- Works great on mobile

**Rejected Alternatives**:

- Variation 1 (Native date input): Too granular for monthly budget, users don't need specific days
- Variation 3 (Custom year + dropdown): More complex than needed
- Variation 4 (Custom year + grid): Overkill for simple month selection

**Configuration**:

- Input: `<input type="month">` native element
- Display format: YYYY-MM internally, localized display
- Validation: Native browser validation

---

## Dropdowns

### Selected Variation: **Variation 1 - Native Select**

**Reasoning**:

- Simple, familiar UX
- Works well on all platforms
- Great accessibility (keyboard navigation, screen reader support)
- Minimal implementation effort
- No custom code to maintain

**Rejected Alternatives**:

- Variation 2 (Search dropdown): Overkill for small lists (< 20 items)
- Variation 3 (Categorized): Adds complexity for simple use cases, categories evolve over time

**Configuration**:

- Input: Native `<select>` element
- Styling: Minimal custom CSS, preserve native behavior
- Accessibility: Native ARIA support

**Future Enhancement**: For very long lists (> 50 items), consider search dropdown

---

## Modals

### Selected Variation: **Variation 2 - Right-side Drawer**

**Reasoning**:

- Desktop-friendly (doesn't block entire screen)
- Mobile-friendly (slides up on small screens)
- Shows context (list on left, editor on right)
- Good for CRUD operations (edit while viewing list)
- Common pattern in productivity apps

**Rejected Alternatives**:

- Variation 1 (Centered modal): Blocks entire screen, no context of what you're editing
- Variation 3 (Inline editing): Can get cluttered with multiple inline edits
- Variation 4 (Full-screen): Overkill for simple edits, disorienting

**Configuration**:

- Layout: Right-side drawer (400px wide on desktop)
- Backdrop: Yes (dimmed background)
- Animation: Slide in from right
- Mobile: Full-width drawer from bottom

---

## Lists & Tables

### Selected Variation: **Variation 2 - Card-based Layout**

**Reasoning**:

- Mobile-friendly (cards stack well on small screens)
- Information hierarchy is clear (name, amount, period grouped visually)
- Touch-friendly target areas
- Can show more info without overcrowding
- Modern, clean aesthetic

**Rejected Alternatives**:

- Variation 1 (Table layout): Cramped on mobile, hard to tap small cells
- Variation 3 (Compact list): Too minimal, loses visual hierarchy
- Variation 4 (Grid layout): Too horizontal scrolling, hard to compare items

**Configuration**:

- Card border: 1px solid #e0e0e0, 8px rounded
- Card padding: 1rem
- Card header: Name (left), Amount (right), emphasized
- Card body: Period (left), Actions (right)
- Hover state: Subtle background change (#f5f5f5)

---

## Navigation

### Selected Variation: **Variation 2 - Sidebar Navigation**

**Reasoning**:

- Works well for productivity apps with 5-7 main sections
- Desktop-friendly (persistent, always visible)
- Mobile-friendly (collapsible to hamburger menu)
- Good scalability (can add more sections without breaking layout)
- Common pattern in SaaS apps

**Rejected Alternatives**:

- Variation 1 (Top nav): Horizontal scrolling issues with many sections
- Variation 3 (Tab-based): Tabs get cramped with > 5 sections
- Variation 4 (Bottom nav): Good for mobile-only, but awkward on desktop

**Configuration**:

- Layout: Left sidebar (250px wide on desktop)
- Positioning: Fixed on desktop, collapsible on mobile
- Active state: Highlighted background (#24c8db)
- Mobile behavior: Hamburger menu that slides in from left

---

## Color Scheme

### Selected Variation: **Variation 1 - Dark Mode (Default)**

**Reasoning**:

- Modern, developer-friendly aesthetic
- Reduces eye strain for extended use
- High contrast with bright accent colors
- Fits budget tracking context (productivity app)

**Colors**:

- Primary: `#24c8db` (cyan/teal)
- Secondary: `#7c4dff` (purple)
- Accent: `#4ade80` (green)
- Background: `#1a1a2e` (deep dark blue/purple)
- Surface: `#16213e` (slightly lighter)
- Text: `#e4e4e7` (off-white)
- Border: `#333355` (dark blue-gray)

**Future Enhancement**: Add light mode toggle with system preference detection

---

## Form Layouts

### Selected Variation: **Variation 1 - Vertical Form**

**Reasoning**:

- Most accessible (screen readers, keyboard navigation)
- Works well on all screen sizes
- Clear visual hierarchy
- Easy to scan from top to bottom
- Mobile-friendly (stacks naturally)

**Rejected Alternatives**:

- Variation 2 (Horizontal form): Cramped on mobile, labels get truncated
- Variation 3 (Grid): Adds complexity without clear benefit
- Variation 4 (Compact): Labels beside inputs harder to scan

**Configuration**:

- Layout: Vertical stack of fields
- Label position: Above input
- Spacing: 1rem between fields
- Alignment: Left-aligned labels, full-width inputs
- Actions: Right-aligned at bottom (Cancel left, Save right)

---

## Summary

### Overall Design Philosophy

- **Simplicity over complexity**: Native controls over custom widgets
- **Accessibility first**: Keyboard navigation, screen reader support
- **Mobile-first**: Responsive design, touch-friendly
- **Visual hierarchy**: Clear information grouping
- **Familiar patterns**: Common UX patterns users expect

### Component Architecture

```
App
├── Sidebar (navigation)
├── Main Content
│   ├── List (cards)
│   └── Drawer (editor)
└── Header (app bar)
```

### Responsive Breakpoints

- Mobile: < 768px (stacked layout, hamburger menu)
- Tablet: 768px - 1200px (sidebar collapsed, cards adjust)
- Desktop: > 1200px (full sidebar, 3-column grid)

### Accessibility Requirements

- All interactive elements keyboard-accessible
- ARIA labels on custom components
- Focus indicators on all inputs/buttons
- Screen reader announcements for actions
- Minimum 4.5:1 color contrast ratio
