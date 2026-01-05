# Feature Specification: Responsive Layout Consistency

**Feature Branch**: `006-responsive-layout-consistency`  
**Created**: 2026-01-04  
**Status**: Draft  
**Input**: User description: "we will review every single screen. We will walk through the horizontal alignments, widths, sizing options. We will look to provide consistency when possible and ensure that it is able to adapt to all different widths."

## Overview

This feature involves a comprehensive audit and improvement of every screen in BudgetForFun to ensure consistent horizontal alignment, uniform widths, predictable sizing behavior, and seamless adaptation across all viewport widths. The goal is to eliminate layout inconsistencies, establish reusable spacing and width patterns, and ensure all screens respond gracefully from narrow mobile-width views to wide desktop displays.

---

## Screen Inventory

The application has the following screens to audit:

1. **Dashboard** (`/`) - Main landing page with month navigation, progress cards, leftover display
2. **Details View** (`/month/[month]`) - Detailed monthly view with sidebar and category sections
3. **Budget Config/Setup** (`/setup`) - Entity configuration with tabs (Payment Sources, Bills, Incomes, Categories)
4. **Settings** (`/settings`) - Data storage, backup, appearance settings
5. **Manage Months** (`/manage`) - Month list with create/lock/delete actions
6. **Navigation Sidebar** - Present on all screens

---

## Visual Wireframes

### Wireframe 1: App Layout Structure (Current State Analysis)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ NAVIGATION SIDEBAR │ MAIN CONTENT AREA                                         │
│                    │                                                            │
│  220px fixed       │  margin-left: 220px                                        │
│                    │  padding: varies by screen (INCONSISTENT)                  │
│  ┌──────────────┐  │                                                            │
│  │ BudgetForFun │  │  ┌──────────────────────────────────────────────────────┐  │
│  │              │  │  │                                                      │  │
│  │ [Today]      │  │  │  Dashboard: padding 24px, max-width 800px           │  │
│  │              │  │  │  Details:   padding 20px, max-width 1800px          │  │
│  │ □ Dashboard  │  │  │  Setup:     padding 30px, no max-width              │  │
│  │ □ Details    │  │  │  Settings:  padding 24px, max-width 800px           │  │
│  │              │  │  │  Manage:    padding 30px, max-width 1200px          │  │
│  │ ─────────────│  │  │                                                      │  │
│  │ □ Manage     │  │  │  *** INCONSISTENCIES TO FIX ***                     │  │
│  │ □ Config     │  │  │                                                      │  │
│  │              │  │  └──────────────────────────────────────────────────────┘  │
│  │ (footer)     │  │                                                            │
│  └──────────────┘  │                                                            │
│                    │                                                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 2: Target Layout Structure (Consistent)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ NAV (220px)  │ MAIN CONTENT AREA                                               │
│              │                                                                  │
│              │  ┌────────────────────────────────────────────────────────────┐  │
│              │  │ HEADER ZONE                                                │  │
│              │  │ padding: 24px horizontal (consistent)                      │  │
│              │  │ back-link, page title, actions aligned                     │  │
│              │  └────────────────────────────────────────────────────────────┘  │
│              │                                                                  │
│              │  ┌────────────────────────────────────────────────────────────┐  │
│              │  │ CONTENT ZONE                                               │  │
│              │  │ padding: 24px horizontal (consistent)                      │  │
│              │  │ max-width: 1200px (default), centered                      │  │
│              │  │                                                            │  │
│              │  │  ┌─────────────────────────────────────────────────────┐   │  │
│              │  │  │ Cards/Sections                                      │   │  │
│              │  │  │ gap: 24px (consistent)                              │   │  │
│              │  │  └─────────────────────────────────────────────────────┘   │  │
│              │  │                                                            │  │
│              │  └────────────────────────────────────────────────────────────┘  │
│              │                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 3: Dashboard Screen - Wide (≥1200px)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ NAV         │                                                                   │
│             │         ◀  January 2026  ▶          ★                             │
│ BudgetForFun│                                                                   │
│             │   ┌───────────────────────────────────────────────────────────┐   │
│ [Today]     │   │                     HERO SECTION                          │   │
│             │   │                                                           │   │
│ □ Dashboard │   │   ┌────────────────────┐ ┌────────────────────┐           │   │
│ □ Details   │   │   │ BILLS             │ │ INCOME             │           │   │
│             │   │   │ $500 / $1,200     │ │ $3,000 / $3,500    │           │   │
│ ───────────│   │   │ [███████░░░] 42%  │ │ [████████░░] 86%   │           │   │
│ □ Manage    │   │   └────────────────────┘ └────────────────────┘           │   │
│ □ Config    │   │                                                           │   │
│             │   │   ┌─────────────────────────────────────────┐             │   │
│ ───────────│   │   │ PROJECTED LEFTOVER                      │             │   │
│ [-] 100%[+]│   │   │        $2,300                           │             │   │
│ [Undo ⌘Z ] │   │   └─────────────────────────────────────────┘             │   │
│ [Exp][Imp] │   │                                                           │   │
│ ───────────│   │   [ View Details → ]                                       │   │
│ ⚙ Settings │   └───────────────────────────────────────────────────────────┘   │
│             │                                                                   │
│             │   ┌────────────────────────┐ ┌────────────────────────┐           │
│             │   │ ◀ Dec 2025             │ │ Feb 2026 ▶             │           │
│             │   │ Locked                 │ │ Not created            │           │
│             │   │ $1,500                 │ │                        │           │
│             │   └────────────────────────┘ └────────────────────────┘           │
│             │                                                                   │
│             │   max-width: 800px (centered in content area)                     │
│             │   padding: 24px                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 4: Dashboard Screen - Narrow (<768px)

```
┌─────────────────────────────────────────────┐
│ ☰  (hamburger)    January 2026          ▶  │
├─────────────────────────────────────────────┤
│                                             │
│         ★  January 2026  ★                 │
│                                             │
│   ┌───────────────────────────────────┐     │
│   │ BILLS                             │     │
│   │ $500 / $1,200                     │     │
│   │ [████████░░░░░░░░░░░] 42%         │     │
│   └───────────────────────────────────┘     │
│                                             │
│   ┌───────────────────────────────────┐     │
│   │ INCOME                            │     │
│   │ $3,000 / $3,500                   │     │
│   │ [████████████████░░] 86%          │     │
│   └───────────────────────────────────┘     │
│                                             │
│   ┌───────────────────────────────────┐     │
│   │ PROJECTED LEFTOVER                │     │
│   │        $2,300                     │     │
│   └───────────────────────────────────┘     │
│                                             │
│         [ View Details → ]                  │
│                                             │
│   ┌───────────────────────────────────┐     │
│   │ ◀ Dec 2025                        │     │
│   │ Locked  |  $1,500                 │     │
│   └───────────────────────────────────┘     │
│                                             │
│   ┌───────────────────────────────────┐     │
│   │ Feb 2026 ▶                        │     │
│   │ Not created                       │     │
│   └───────────────────────────────────┘     │
│                                             │
│   padding: 16px (reduced for mobile)        │
│   sidebar: collapsed/overlay                │
└─────────────────────────────────────────────┘
```

### Wireframe 5: Details View - Wide (≥1200px)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ NAV         │ ← Dashboard                                    [⊡] [≡] [↻]               │
│             │                                                                            │
│             │         ◀  January 2026  ▶                                                │
│             │                                                                            │
│             │   ┌─────────────────┐  ┌──────────────────────────────────────────────┐   │
│             │   │ SUMMARY SIDEBAR │  │ BILLS SECTION                    (1/2 width) │   │
│             │   │ width: 260px    │  │                                              │   │
│             │   │                 │  │  ■ Housing (2)                    [+]        │   │
│             │   │ BANK ACCOUNTS   │  │    Rent              $1,200     ✓ Paid       │   │
│             │   │ Checking $1,234 │  │    Insurance           $300     Pending      │   │
│             │   │ Savings  $5,678 │  │                                              │   │
│             │   │ ────────────────│  │  ■ Utilities (3)                  [+]        │   │
│             │   │ Subtotal $6,912 │  │    Electric            $150     ✓ Paid       │   │
│             │   │                 │  │    Gas                 $100     Pending      │   │
│             │   │ CREDIT CARDS    │  │    Water               $100     Pending      │   │
│             │   │ Visa     -$500  │  │                                              │   │
│             │   │ ────────────────│  └──────────────────────────────────────────────┘   │
│             │   │ Leftover        │                                                     │
│             │   │     $2,300      │  ┌──────────────────────────────────────────────┐   │
│             │   │                 │  │ INCOME SECTION                   (1/2 width) │   │
│             │   └─────────────────┘  │                                              │   │
│             │                        │  ■ Salary (1)                     [+]        │   │
│             │   gap: 24px            │    Main Job          $3,500     ✓ Received   │   │
│             │                        │                                              │   │
│             │                        └──────────────────────────────────────────────┘   │
│             │                                                                            │
│             │   Content max-width: 1800px (or "wide" mode = 100%)                       │
│             │   Sidebar + Content use CSS Grid: 260px 1fr                               │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 6: Details View - Medium (768px - 1199px)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ NAV         │ ← Dashboard                              [⊡] [≡] [↻]           │
│             │                                                                 │
│             │         ◀  January 2026  ▶                                     │
│             │                                                                 │
│             │   ┌─────────────────┐  ┌───────────────────────────────────┐   │
│             │   │ SUMMARY SIDEBAR │  │ BILLS SECTION (full width)        │   │
│             │   │ width: 260px    │  │                                   │   │
│             │   │                 │  │  ■ Housing (2)              [+]   │   │
│             │   │ BANK ACCOUNTS   │  │    Rent        $1,200    ✓ Paid   │   │
│             │   │ Checking $1,234 │  │    Insurance     $300   Pending   │   │
│             │   │ Savings  $5,678 │  │                                   │   │
│             │   │                 │  └───────────────────────────────────┘   │
│             │   │ CREDIT CARDS    │                                          │
│             │   │ Visa     -$500  │  ┌───────────────────────────────────┐   │
│             │   │                 │  │ INCOME SECTION (full width)       │   │
│             │   │ Leftover        │  │                                   │   │
│             │   │     $2,300      │  │  ■ Salary (1)              [+]    │   │
│             │   └─────────────────┘  │    Main Job    $3,500  ✓ Received │   │
│             │                        │                                   │   │
│             │                        └───────────────────────────────────┘   │
│             │                                                                 │
│             │   Bills and Income sections STACKED (single column)            │
│             │   Container query: @container content (max-width: 900px)       │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 7: Details View - Narrow (<768px)

```
┌─────────────────────────────────────────────┐
│ ☰     ← Dashboard           [⊡] [≡] [↻]   │
├─────────────────────────────────────────────┤
│                                             │
│         ◀  January 2026  ▶                 │
│                                             │
│   ┌───────────────────────────────────┐     │
│   │ SUMMARY (collapsed or scrollable) │     │
│   │ Leftover: $2,300                  │     │
│   │ [Expand ▼]                        │     │
│   └───────────────────────────────────┘     │
│                                             │
│   ┌───────────────────────────────────┐     │
│   │ BILLS                             │     │
│   │  ■ Housing (2)             [+]    │     │
│   │    Rent        $1,200   ✓ Paid    │     │
│   │    Insurance     $300  Pending    │     │
│   └───────────────────────────────────┘     │
│                                             │
│   ┌───────────────────────────────────┐     │
│   │ INCOME                            │     │
│   │  ■ Salary (1)              [+]    │     │
│   │    Main Job    $3,500  ✓ Received │     │
│   └───────────────────────────────────┘     │
│                                             │
│   Sidebar: hidden or overlay                │
│   Summary: collapsible or top-positioned    │
│   All sections: full width, stacked         │
└─────────────────────────────────────────────┘
```

### Wireframe 8: Budget Config (Setup) - Wide

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ NAV         │ ← Dashboard     Entity Configuration          [Load Defaults]    │
│             │                                                                    │
│             │   ┌─────────────┐  ┌────────────────────────────────────────────┐  │
│             │   │ TABS        │  │ CONTENT AREA                              │  │
│             │   │ width: 200px│  │                                            │  │
│             │   │             │  │  Payment Sources (3)            [+ Add]    │  │
│             │   │ [Payment   ]│  │  ───────────────────────────────────────   │  │
│             │   │  Sources   ]│  │                                            │  │
│             │   │             │  │  ┌────────────────────────────────────┐    │  │
│             │   │ [Bills     ]│  │  │ Checking Account                   │    │  │
│             │   │             │  │  │ Bank of America | Balance: $1,234  │    │  │
│             │   │ [Incomes   ]│  │  │                     [View] [Edit]  │    │  │
│             │   │             │  │  └────────────────────────────────────┘    │  │
│             │   │ [Categories]│  │                                            │  │
│             │   │             │  │  ┌────────────────────────────────────┐    │  │
│             │   └─────────────┘  │  │ Savings Account                    │    │  │
│             │                    │  │ Credit Union | Balance: $5,678     │    │  │
│             │                    │  │                     [View] [Edit]  │    │  │
│             │                    │  └────────────────────────────────────┘    │  │
│             │                    │                                            │  │
│             │                    │  max-width: 900px for entity list          │  │
│             │                    │                                            │  │
│             │                    └────────────────────────────────────────────┘  │
│             │                                                                    │
│             │   Tab sidebar + Content use flexbox                               │
│             │   Header: consistent with other pages                             │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 9: Budget Config (Setup) - Narrow (<768px)

```
┌─────────────────────────────────────────────┐
│ ☰  ← Dashboard          [Load Defaults]    │
├─────────────────────────────────────────────┤
│                                             │
│   Entity Configuration                      │
│                                             │
│   ┌───────────────────────────────────┐     │
│   │ [Payment Sources] [Bills] [Inc] [Cat] │ │ ← Horizontal scroll tabs
│   └───────────────────────────────────┘     │
│                                             │
│   Payment Sources (3)        [+ Add New]    │
│   ─────────────────────────────────────     │
│                                             │
│   ┌───────────────────────────────────┐     │
│   │ Checking Account                  │     │
│   │ Bank of America                   │     │
│   │ Balance: $1,234                   │     │
│   │              [View] [Edit] [Del]  │     │
│   └───────────────────────────────────┘     │
│                                             │
│   ┌───────────────────────────────────┐     │
│   │ Savings Account                   │     │
│   │ Credit Union                      │     │
│   │ Balance: $5,678                   │     │
│   │              [View] [Edit] [Del]  │     │
│   └───────────────────────────────────┘     │
│                                             │
│   Tab bar: horizontal, scrollable           │
│   Cards: full width                         │
│   Buttons: stack or wrap                    │
└─────────────────────────────────────────────┘
```

### Wireframe 10: Settings Page - All Widths

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ NAV         │ [ ← Back ]     Settings                                           │
│             │                                                                    │
│             │   ┌────────────────────────────────────────────────────────────┐  │
│             │   │ DATA STORAGE                                               │  │
│             │   │ ─────────────────────────────────────────────────────────  │  │
│             │   │ Data Directory                                             │  │
│             │   │ ┌────────────────────────────────────────────┐ [Browse]    │  │
│             │   │ │ /Users/brad/Documents/BudgetForFun         │             │  │
│             │   │ └────────────────────────────────────────────┘             │  │
│             │   │ Tip: Place in iCloud/Dropbox for auto-sync                 │  │
│             │   └────────────────────────────────────────────────────────────┘  │
│             │                                                                    │
│             │   ┌────────────────────────────────────────────────────────────┐  │
│             │   │ BACKUP & RESTORE                                           │  │
│             │   │ ─────────────────────────────────────────────────────────  │  │
│             │   │ [ Export Backup ]    [ Import Backup ]                     │  │
│             │   └────────────────────────────────────────────────────────────┘  │
│             │                                                                    │
│             │   ┌────────────────────────────────────────────────────────────┐  │
│             │   │ APPEARANCE                                                 │  │
│             │   │ ─────────────────────────────────────────────────────────  │  │
│             │   │ Zoom: Use sidebar controls or Ctrl+/-/0                    │  │
│             │   │ Theme: (•) Dark  ( ) Light  ( ) System  (coming soon)      │  │
│             │   └────────────────────────────────────────────────────────────┘  │
│             │                                                                    │
│             │   ┌────────────────────────────────────────────────────────────┐  │
│             │   │ ABOUT                                                      │  │
│             │   │ Version: 0.1.0 | Data Format: 1.0 | Mode: Development      │  │
│             │   └────────────────────────────────────────────────────────────┘  │
│             │                                                                    │
│             │   max-width: 800px (same as Dashboard for reading comfort)        │
│             │   Section cards: consistent border-radius, padding                 │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 11: Manage Months Page - Wide

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ NAV         │ ← Dashboard     Manage Months                                     │
│             │                                                                    │
│             │   ┌────────────────────────────────────────────────────────────┐  │
│             │   │ January 2026                                    [Active]   │  │
│             │   │ ─────────────────────────────────────────────────────────  │  │
│             │   │ Income      Bills       Expenses     Leftover              │  │
│             │   │ $3,500      $1,200      $500         $1,800                │  │
│             │   │                                                            │  │
│             │   │ [View Details]   [Lock]   [Delete]                         │  │
│             │   └────────────────────────────────────────────────────────────┘  │
│             │                                                                    │
│             │   ┌────────────────────────────────────────────────────────────┐  │
│             │   │ December 2025                                   [Locked]   │  │
│             │   │ ─────────────────────────────────────────────────────────  │  │
│             │   │ Income      Bills       Expenses     Leftover              │  │
│             │   │ $3,500      $1,400      $600         $1,500                │  │
│             │   │                                                            │  │
│             │   │ [View Details]   [Unlock]   [Delete disabled]              │  │
│             │   └────────────────────────────────────────────────────────────┘  │
│             │                                                                    │
│             │   ┌────────────────────────────────────────────────────────────┐  │
│             │   │ February 2026                               [Not Created]  │  │
│             │   │ ─────────────────────────────────────────────────────────  │  │
│             │   │ This month hasn't been created yet.                        │  │
│             │   │                                                            │  │
│             │   │                              [Create Month]                │  │
│             │   └────────────────────────────────────────────────────────────┘  │
│             │                                                                    │
│             │   max-width: 1200px                                               │
│             │   Cards: full width within max-width container                    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 12: Drawer Component - Consistent Width

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                        │ DRAWER (right side)   │
│                                                        │ width: 400px fixed    │
│  [Main content dimmed/overlay]                         │ max-width: 90vw       │
│                                                        │                       │
│                                                        │ ┌───────────────────┐ │
│                                                        │ │ Add Bill     [X]  │ │
│                                                        │ │ ─────────────────│ │
│                                                        │ │                   │ │
│                                                        │ │ Name              │ │
│                                                        │ │ [______________ ] │ │
│                                                        │ │                   │ │
│                                                        │ │ Amount            │ │
│                                                        │ │ [$ 0.00        ]  │ │
│                                                        │ │                   │ │
│                                                        │ │ Category          │ │
│                                                        │ │ [Select... ▼  ]   │ │
│                                                        │ │                   │ │
│                                                        │ │ [Cancel] [Save]   │ │
│                                                        │ │                   │ │
│                                                        │ └───────────────────┘ │
│                                                        │                       │
│                                                        │ Consistent across:    │
│                                                        │ - Setup drawers       │
│                                                        │ - Details drawers     │
│                                                        │ - Transaction drawer  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 13: Modal Component - Consistent Sizing

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                    ┌─────────────────────────────────────────┐                   │
│                    │ MODAL                                   │                   │
│                    │ width: 90%                              │                   │
│                    │ max-width: 500px (default)              │                   │
│                    │ max-width: 400px (small)                │                   │
│                    │ max-width: 600px (large)                │                   │
│                    │                                         │                   │
│                    │ ┌─────────────────────────────────────┐ │                   │
│                    │ │ Lock December 2025?                 │ │                   │
│                    │ │ ───────────────────────────────────│ │                   │
│                    │ │                                     │ │                   │
│                    │ │ Locking this month will prevent     │ │                   │
│                    │ │ any changes to bills, income, or    │ │                   │
│                    │ │ expenses.                           │ │                   │
│                    │ │                                     │ │                   │
│                    │ │            [Cancel]  [Lock Month]   │ │                   │
│                    │ └─────────────────────────────────────┘ │                   │
│                    │                                         │                   │
│                    │ border-radius: 16px                     │                   │
│                    │ padding: 24px                           │                   │
│                    └─────────────────────────────────────────┘                   │
│                                                                                  │
│  [Overlay: rgba(0,0,0,0.7)]                                                     │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 14: Component Size Standards

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  BUTTONS                                                                         │
│  ─────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  Primary:   height: 44px    padding: 12px 24px    border-radius: 8px            │
│  ┌────────────────────────┐                                                      │
│  │      Create Month      │  background: #24c8db  color: #000                   │
│  └────────────────────────┘                                                      │
│                                                                                  │
│  Secondary: height: 44px    padding: 12px 24px    border-radius: 8px            │
│  ┌────────────────────────┐                                                      │
│  │        Cancel          │  background: transparent  border: #333355           │
│  └────────────────────────┘                                                      │
│                                                                                  │
│  Small:     height: 32px    padding: 6px 14px     border-radius: 6px            │
│  ┌──────────────┐                                                                │
│  │    View      │                                                                │
│  └──────────────┘                                                                │
│                                                                                  │
│  Icon:      height: 36px    width: 36px           border-radius: 8px            │
│  ┌────┐                                                                          │
│  │ ◀  │                                                                          │
│  └────┘                                                                          │
│                                                                                  │
│  INPUTS                                                                          │
│  ─────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  Text Input: height: 44px   padding: 12px 16px    border-radius: 8px            │
│  ┌────────────────────────────────────────────────────────────────┐              │
│  │ Enter bill name...                                             │              │
│  └────────────────────────────────────────────────────────────────┘              │
│                                                                                  │
│  Select:    height: 44px   padding: 12px 16px    border-radius: 8px             │
│  ┌────────────────────────────────────────────────────────────┬──┐              │
│  │ Select category                                            │▼ │              │
│  └────────────────────────────────────────────────────────────┴──┘              │
│                                                                                  │
│  SPACING SCALE                                                                   │
│  ─────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  4px  - micro (icon gaps)                                                        │
│  8px  - small (between related items)                                            │
│  12px - medium (form field labels)                                               │
│  16px - base (between cards in a list)                                           │
│  24px - large (between sections)                                                 │
│  32px - xlarge (page padding, major separators)                                  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe 15: Breakpoint Behavior Summary

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  BREAKPOINT: DESKTOP (≥1200px)                                                   │
│  ─────────────────────────────────────────────────────────────────────────────   │
│  • Sidebar: 220px fixed, always visible                                          │
│  • Details: Summary sidebar (260px) + 2-column Bills/Income grid                 │
│  • Setup: Tab sidebar (200px) + content area                                     │
│  • Content max-widths respected                                                  │
│                                                                                  │
│  BREAKPOINT: TABLET (768px - 1199px)                                            │
│  ─────────────────────────────────────────────────────────────────────────────   │
│  • Sidebar: 220px fixed, still visible                                           │
│  • Details: Summary sidebar + 1-column stacked Bills/Income                      │
│  • Setup: Tab sidebar + content (narrower)                                       │
│  • Reduced horizontal padding (20px)                                             │
│                                                                                  │
│  BREAKPOINT: MOBILE (<768px)                                                     │
│  ─────────────────────────────────────────────────────────────────────────────   │
│  • Sidebar: Collapsed, hamburger menu trigger                                    │
│  • Details: Summary collapsible/top, full-width sections                         │
│  • Setup: Horizontal scrollable tabs, full-width cards                           │
│  • Reduced horizontal padding (16px)                                             │
│  • Buttons may stack vertically                                                  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Manual Test Procedures

### Test Suite 1: Cross-Screen Alignment Audit

**MT-1.1: Main Content Padding Consistency**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Open Dashboard at 1200px width | Note the left edge of the hero section |
| 2 | Navigate to Details view | Main content left edge aligns with Dashboard |
| 3 | Navigate to Settings | Content left edge aligns with Dashboard |
| 4 | Navigate to Manage Months | Content left edge aligns with Dashboard |
| 5 | Navigate to Budget Config | Content left edge aligns with Dashboard |
| 6 | Measure padding | All screens use 24px horizontal padding |

**MT-1.2: Section Header Alignment**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Open Dashboard, note "BILLS" label position | Record left offset from content edge |
| 2 | Open Details view, find "BILLS" section header | Same left offset as Dashboard |
| 3 | Open Settings, find "DATA STORAGE" header | Same left offset |
| 4 | Open Manage Months, find month card headers | Same left offset |

**MT-1.3: Sidebar Width Consistency**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Open Dashboard at any width >768px | Sidebar visible |
| 2 | Use browser dev tools to measure sidebar width | 220px |
| 3 | Navigate to each screen | Sidebar width remains exactly 220px |
| 4 | Measure main content margin-left | 220px on all screens |

---

### Test Suite 2: Responsive Breakpoint Testing

**MT-2.1: Desktop to Tablet Transition (1200px → 768px)**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Set viewport to 1200px width | Desktop layout active |
| 2 | Open Details view | Bills and Income in 2-column grid |
| 3 | Slowly resize to 900px | Bills and Income stack to single column |
| 4 | Verify no horizontal scrollbar | No overflow visible |
| 5 | Verify content remains readable | No truncation, proper wrapping |

**MT-2.2: Tablet to Mobile Transition (768px → 375px)**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Set viewport to 768px width | Tablet layout active |
| 2 | Verify sidebar is visible | Sidebar shows at 220px |
| 3 | Resize to 767px | Sidebar collapses/hides |
| 4 | Hamburger menu appears | Menu icon visible in header |
| 5 | Content fills full width | No sidebar offset |

**MT-2.3: Minimum Width Usability (375px)**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Set viewport to 375px (iPhone SE width) | Mobile layout |
| 2 | Open Dashboard | All content visible, scrollable vertically |
| 3 | Open Details view | Category sections readable |
| 4 | Open Budget Config | Tab bar scrollable horizontally |
| 5 | Open Settings | Form inputs usable (not cramped) |
| 6 | Check for horizontal scrollbar | No horizontal scrollbar on body |

**MT-2.4: Maximum Width Behavior (1920px+)**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Set viewport to 1920px | Ultra-wide layout |
| 2 | Open Dashboard | Hero section centered, max-width 800px |
| 3 | Open Settings | Content centered, max-width 800px |
| 4 | Open Manage Months | Content centered, max-width 1200px |
| 5 | Open Details view | Content respects width mode setting |
| 6 | Verify text line lengths | No lines exceed ~100 characters |

---

### Test Suite 3: Component Width Consistency

**MT-3.1: Card Component Widths**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Open Dashboard, observe progress cards | Note card width and padding |
| 2 | Open Setup, observe entity list cards | Same padding (16px-24px) |
| 3 | Open Manage Months, observe month cards | Same padding and border-radius |
| 4 | At narrow width, verify cards go full-width | Cards stretch to container |

**MT-3.2: Drawer Width Consistency**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Open Budget Config | |
| 2 | Click "+ Add New" on Payment Sources | Drawer opens from right |
| 3 | Measure drawer width | 400px (or consistent value) |
| 4 | Close drawer, switch to Bills tab | |
| 5 | Click "+ Add New" | Drawer width identical to step 3 |
| 6 | Go to Details view, open a category's [+] | Drawer width identical |

**MT-3.3: Modal Width Consistency**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Open Manage Months | |
| 2 | Click "Lock" on an active month | Confirm modal appears |
| 3 | Measure modal width | ~400-500px |
| 4 | Cancel, click "Delete" on a month | Confirm modal appears |
| 5 | Modal width matches Lock modal | Same max-width applied |

**MT-3.4: Button Height Consistency**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Open Dashboard | Note "Create Month" or "View Details" button |
| 2 | Measure button height | 44px |
| 3 | Open Settings | Note "Browse" button height |
| 4 | Same height as Dashboard buttons | 44px |
| 5 | Open Manage Months | Note action button heights |
| 6 | All primary/secondary buttons same height | 44px |

**MT-3.5: Input Height Consistency**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Open Settings | Note Data Directory input height |
| 2 | Measure input height | 44px |
| 3 | Open Budget Config, add a Bill | Note form input heights |
| 4 | All inputs same height | 44px |
| 5 | Open Details view, open payment drawer | Note amount input height |
| 6 | Same height as other inputs | 44px |

---

### Test Suite 4: Spacing Consistency

**MT-4.1: Section Gap Consistency**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Open Dashboard | Measure gap between hero and adjacent months |
| 2 | Record gap value | 20-24px |
| 3 | Open Settings | Measure gap between setting sections |
| 4 | Same gap value | Matches Dashboard |
| 5 | Open Manage Months | Gap between month cards |
| 6 | Same gap value | Consistent 16-24px |

**MT-4.2: Form Field Spacing**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Open Budget Config, add Bill drawer | |
| 2 | Measure vertical gap between form fields | Note value (12-16px) |
| 3 | Open Details view, open payment modal | |
| 4 | Measure form field gaps | Same as Setup drawer |

---

### Test Suite 5: Dynamic Resize Testing

**MT-5.1: Live Resize Smoothness**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Open Details view at 1200px | Two-column layout |
| 2 | Slowly drag window edge to resize narrower | |
| 3 | Watch for layout transitions | Smooth, no jumps or flickers |
| 4 | Continue to 768px | Single column layout |
| 5 | Continue to 375px | Mobile layout, still smooth |
| 6 | Resize back to 1200px | Returns to two-column smoothly |

**MT-5.2: No Horizontal Overflow Check**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | At each breakpoint (375, 768, 1024, 1200, 1920) | |
| 2 | Open each screen | |
| 3 | Check for horizontal scrollbar | None visible |
| 4 | Try to scroll horizontally | No horizontal scroll possible |

---

### Test Suite 6: Screen-Specific Tests

**MT-6.1: Dashboard Specific**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | At 1200px, hero section centered | max-width 800px, centered |
| 2 | Progress cards side-by-side | 2-column grid |
| 3 | Adjacent month cards side-by-side | 2-column grid |
| 4 | At 600px, progress cards stacked | 1-column |
| 5 | Adjacent month cards stacked | 1-column |

**MT-6.2: Details View Specific**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Verify Summary Sidebar width | 260px fixed |
| 2 | Width mode toggle works | Cycles small → medium → wide |
| 3 | In "small" mode, content narrower | max-width ~1000px |
| 4 | In "wide" mode, content full width | No max-width constraint |
| 5 | At <900px container width, Bills/Income stack | Container query triggers |

**MT-6.3: Budget Config Specific**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Tab sidebar width | 200px |
| 2 | Entity list max-width | 900px |
| 3 | At <768px, tabs become horizontal | Horizontal tab bar |
| 4 | Horizontal tabs scrollable | Can scroll to see all tabs |

**MT-6.4: Settings Specific**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Content max-width | 800px centered |
| 2 | Section cards consistent width | Full width within max-width |
| 3 | At narrow width, Browse button wraps | Stacks below input or shrinks gracefully |

**MT-6.5: Manage Months Specific**
| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Content max-width | 1200px centered |
| 2 | Month stats grid at wide width | 4-column grid |
| 3 | At <768px, stats become 2-column | Responsive grid |
| 4 | Action buttons wrap at narrow width | Flex-wrap behavior |

---

## User Scenarios & Testing

### User Story 1 - Consistent Horizontal Alignment Across Screens (Priority: P1)

User navigates between different screens (Dashboard, Details, Setup/Budget Config, Settings, Manage Months) and experiences consistent horizontal alignment of content. Elements like headers, cards, form fields, and buttons align predictably regardless of which screen they are on.

**Why this priority**: Inconsistent alignment creates a disjointed, unprofessional feel and makes the app harder to scan and use. This is the foundational visual improvement.

**Independent Test**: Run MT-1.1, MT-1.2, MT-1.3 from Manual Test Procedures.

**Acceptance Scenarios**:

1. **Given** user is on the Dashboard, **When** they navigate to Details view, **Then** the main content area has the same horizontal padding/margins
2. **Given** user is on the Setup page, **When** they view card layouts, **Then** card edges align with other screens' content edges
3. **Given** user is on the Settings page, **When** viewing form sections, **Then** section headers align consistently with other pages' headers
4. **Given** any screen with a sidebar, **When** the sidebar is visible, **Then** the main content area offset is identical across all screens

---

### User Story 2 - Uniform Component Widths (Priority: P1)

User sees that similar components (cards, forms, lists, modals/drawers) have consistent maximum widths and behave predictably. A card on the Dashboard should feel the same as a card on Setup.

**Why this priority**: Width inconsistencies are immediately noticeable and make the interface feel unpolished.

**Independent Test**: Run MT-3.1, MT-3.2, MT-3.3 from Manual Test Procedures.

**Acceptance Scenarios**:

1. **Given** user views cards on Dashboard, **When** comparing to cards on Setup, **Then** they have the same maximum width and min-width behavior
2. **Given** user opens a form drawer on Details view, **When** comparing to form drawers on Setup, **Then** drawer widths are identical
3. **Given** user views list items, **When** comparing bill lists to income lists, **Then** row heights and content spacing are consistent
4. **Given** user sees modals, **When** comparing different modals across the app, **Then** modal widths follow a consistent sizing scale

---

### User Story 3 - Graceful Width Adaptation (Priority: P1)

User resizes the window from wide (1920px) to narrow (375px mobile equivalent) and observes smooth transitions. Content never gets cut off, overflow never occurs, and layouts adapt logically at defined breakpoints.

**Why this priority**: Users access the app on various screen sizes and window configurations. Poor adaptation makes the app unusable on certain devices.

**Independent Test**: Run MT-2.1, MT-2.2, MT-2.3, MT-2.4, MT-5.1, MT-5.2 from Manual Test Procedures.

**Acceptance Scenarios**:

1. **Given** user has a wide window (≥1200px), **When** viewing any screen, **Then** content uses available space without stretching excessively
2. **Given** user has a medium window (768px-1199px), **When** viewing multi-column layouts, **Then** columns stack or reflow logically
3. **Given** user has a narrow window (<768px), **When** viewing any screen, **Then** single-column layout is used with no horizontal scroll
4. **Given** user at any width, **When** resizing the window dynamically, **Then** layout transitions smoothly without jumps or flickers

---

### User Story 4 - Minimum and Maximum Content Widths (Priority: P2)

Content areas respect sensible minimum widths (preventing cramped unreadable layouts) and maximum widths (preventing excessively wide line lengths that hurt readability).

**Why this priority**: Readability and usability depend on proper content width constraints.

**Independent Test**: Run MT-2.3, MT-2.4 from Manual Test Procedures.

**Acceptance Scenarios**:

1. **Given** user has extremely wide window (≥1920px), **When** viewing text-heavy content, **Then** line length is capped at a readable maximum (approximately 80-100 characters)
2. **Given** user has narrow window approaching minimum, **When** content width reaches minimum threshold, **Then** layout maintains minimum usable width and allows vertical scrolling
3. **Given** any form field, **When** viewed at various widths, **Then** input fields never become too narrow to type in (minimum ~200px)

---

### User Story 5 - Sidebar Behavior Consistency (Priority: P2)

The navigation sidebar behaves consistently across all screens—same width, same collapse behavior, same interaction with main content area.

**Why this priority**: The sidebar is present on every screen, so inconsistencies are highly visible.

**Independent Test**: Run MT-1.3, MT-2.2 from Manual Test Procedures.

**Acceptance Scenarios**:

1. **Given** user is on any screen, **When** sidebar is visible, **Then** sidebar width is exactly the same (220px)
2. **Given** user has narrow window (<768px), **When** sidebar would cause content cramping, **Then** sidebar collapses or overlays consistently
3. **Given** user toggles sidebar (if applicable), **When** toggled, **Then** animation and final state are consistent across screens

---

### User Story 6 - Spacing and Gap Consistency (Priority: P2)

Users perceive consistent spacing between elements. Gaps between cards, sections, form fields, and list items follow a predictable spacing scale.

**Why this priority**: Inconsistent spacing creates visual noise and makes the interface feel haphazard.

**Independent Test**: Run MT-4.1, MT-4.2 from Manual Test Procedures.

**Acceptance Scenarios**:

1. **Given** user views vertical gaps between cards, **When** comparing Dashboard to Setup, **Then** gaps are identical
2. **Given** user views form field spacing, **When** comparing Setup forms to Settings forms, **Then** vertical spacing between fields is consistent
3. **Given** user views section headers, **When** comparing across screens, **Then** space above/below headers is uniform

---

### User Story 7 - Button and Input Sizing Consistency (Priority: P3)

Interactive elements (buttons, inputs, dropdowns) have consistent sizes across the application. Primary buttons are the same height everywhere, inputs have consistent padding.

**Why this priority**: Inconsistent interactive element sizing affects muscle memory and visual polish.

**Independent Test**: Run MT-3.4, MT-3.5 from Manual Test Procedures.

**Acceptance Scenarios**:

1. **Given** user sees primary action buttons, **When** comparing across screens, **Then** all primary buttons have the same height (44px) and padding
2. **Given** user interacts with text inputs, **When** comparing across forms, **Then** input heights are identical (44px)
3. **Given** user sees dropdown selects, **When** comparing across screens, **Then** dropdown trigger heights match other inputs

---

### Edge Cases

- What happens when content overflows due to very long text (e.g., bill names)? → Text truncates with ellipsis; tooltip shows full text on hover
- What happens when user has browser zoom at non-100% levels? → Layout adapts based on effective viewport size; no horizontal scroll
- What happens on extremely narrow widths (<320px)? → Minimum width enforced; user may need to scroll horizontally at extreme cases below minimum
- What happens when sidebar and main content compete for space at medium widths? → Sidebar takes precedence; main content adapts or stacks

---

## Requirements

### Functional Requirements

**Horizontal Alignment**:

- **FR-001**: System MUST use consistent horizontal padding (24px) for main content areas across all screens
- **FR-002**: System MUST align section headers at the same left position on all screens
- **FR-003**: System MUST ensure sidebar-offset content areas have identical margins (220px margin-left) on every screen

**Component Widths**:

- **FR-004**: System MUST define maximum content widths: 800px (Settings, Dashboard), 1200px (Manage), 1800px (Details)
- **FR-005**: System MUST apply consistent padding (16-24px) to cards across all screens
- **FR-006**: System MUST use identical drawer widths (400px) for all form drawers
- **FR-007**: System MUST use consistent modal widths (400-500px default)

**Responsive Adaptation**:

- **FR-008**: System MUST define consistent breakpoints: 768px (mobile), 1024px (tablet), 1200px (desktop)
- **FR-009**: System MUST stack multi-column layouts to single column below 900px container width
- **FR-010**: System MUST NOT display horizontal scrollbar at any viewport width between 375px-1920px
- **FR-011**: System MUST collapse sidebar at viewport widths below 768px

**Interactive Element Sizing**:

- **FR-012**: System MUST use consistent button heights: 44px (primary/secondary), 32px (small)
- **FR-013**: System MUST use consistent input heights: 44px for all text inputs and selects
- **FR-014**: System MUST use consistent icon button size: 36px x 36px

**Spacing System**:

- **FR-015**: System MUST use spacing scale: 4px, 8px, 12px, 16px, 24px, 32px
- **FR-016**: System MUST apply 16-24px gaps between cards and sections
- **FR-017**: System MUST apply 12-16px vertical spacing between form fields

---

### Key Entities

- **Spacing Scale**: 4px, 8px, 12px, 16px, 24px, 32px
- **Breakpoints**: 768px (mobile), 1024px (tablet), 1200px (desktop)
- **Layout Tokens**:
  - Navigation sidebar: 220px
  - Summary sidebar: 260px
  - Tab sidebar: 200px
  - Drawer: 400px
  - Modal: 400-500px
  - Max content widths: 800px, 1200px, 1800px

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of screens pass horizontal alignment audit (main content edges align within 2px) - verified by MT-1.1
- **SC-002**: 0 horizontal scrollbars appear at any viewport width between 375px and 1920px - verified by MT-5.2
- **SC-003**: All drawer widths are exactly 400px across all screens - verified by MT-3.2
- **SC-004**: All modal widths are within 400-500px range - verified by MT-3.3
- **SC-005**: 100% of responsive breakpoints trigger at documented viewport widths ±5px - verified by MT-2.1, MT-2.2
- **SC-006**: 100% of screens render usably at minimum supported width (375px) - verified by MT-2.3
- **SC-007**: Layout transitions complete smoothly during window resize - verified by MT-5.1
- **SC-008**: All primary/secondary button heights are exactly 44px - verified by MT-3.4
- **SC-009**: All input field heights are exactly 44px - verified by MT-3.5
- **SC-010**: All screens use 24px horizontal content padding - verified by MT-1.1

---

## Assumptions

- The application currently has 6 main screens: Dashboard, Details, Setup (Budget Config), Settings, Manage Months, and root layout
- Existing responsive behavior from 004-ui-polish-ux provides a foundation to build upon
- The navigation sidebar (220px) is present on all main screens
- The summary sidebar in Details view is 260px
- Native inputs (as selected during prototyping) will be used for form elements
- Dark mode is the default theme (per prototyping decisions)
- The minimum supported viewport width is 375px (standard mobile minimum)
- The maximum tested viewport width is 1920px (standard desktop maximum)

---

**Version**: 2.0.0 | **Created**: 2026-01-04
