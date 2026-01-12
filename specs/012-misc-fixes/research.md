# Research: Miscellaneous Fixes Round 4

**Branch**: `012-misc-fixes` | **Date**: 2026-01-11

## Overview

This document captures research decisions for the 10 tasks in this release. Most tasks build on existing patterns in the codebase, requiring minimal new research.

---

## 1. Dirty State Tracking for Edit Drawers

**Decision**: Implement dirty tracking by comparing current form values to initial values.

**Rationale**:

- Simple comparison approach works for all form types
- No external library needed (Constitution X: Avoid silly libraries)
- Pattern already exists conceptually in form validation

**Alternatives considered**:

- Form library with built-in dirty tracking (rejected: adds dependency, overkill)
- Deep object comparison (rejected: overhead not needed for flat forms)

**Implementation approach**:

- Store initial values on form load
- Compare current values to initial on backdrop click
- Use existing `ConfirmDialog.svelte` component for modal

---

## 2. Auto-save Pattern for Savings Page

**Decision**: Save on `blur` event for each input field.

**Rationale**:

- Immediate feedback to user
- Prevents data loss if browser/app crashes
- Consistent with modern UX expectations

**Alternatives considered**:

- Debounced save on every keystroke (rejected: too many API calls)
- Save on page leave (rejected: user expects immediate persistence)
- Periodic auto-save (rejected: lag between edit and save confusing)

**Implementation approach**:

- Add `on:blur` handlers to each input
- Call API endpoint for each field change
- Show brief "Saved" indicator or rely on no-error as confirmation

---

## 3. File Upload and Storage for Insurance Claims

**Decision**: Store uploaded files in `{data_dir}/documents/insurance/receipts/` with sortable filenames.

**Rationale**:

- Follows local file storage principle (Constitution VIII)
- Human-readable filenames aid debugging and backup review
- Separate from entity JSON files for clarity

**Filename format**: `{claim_number}_{date}_{category}_{type}.{ext}`

- Example: `0001_2024-01-05_dental_receipt.pdf`

**Alternatives considered**:

- Store base64 in JSON (rejected: bloats files, harder to manage)
- UUID-only filenames (rejected: not human-readable)
- Store in single flat directory (rejected: harder to organize)

**Implementation approach**:

- Use Bun's native file handling for uploads
- Generate claim_number as auto-incrementing integer
- Validate file types: PDF, JPG, PNG
- Limit file size: 10MB per document

---

## 4. Version Reading from tauri.conf.json

**Decision**: Read version at runtime from `src-tauri/tauri.conf.json` using file system.

**Rationale**:

- Single source of truth (tauri.conf.json already authoritative)
- No build-time injection needed
- Works in both dev and production

**Alternatives considered**:

- Environment variable injection at build (rejected: requires build pipeline changes)
- Hardcoded fallback kept updated (rejected: prone to human error, current bug)
- Read from package.json (rejected: not the authoritative source for Tauri apps)

**Implementation approach**:

- Backend reads JSON file once at startup
- Cache value in memory
- Fallback to "unknown" only if file unreadable

---

## 5. Investment Type Migration Strategy

**Decision**: Migrate on service load, with TODO for future cleanup.

**Rationale**:

- Automatic migration ensures data consistency
- No user action required
- TODO documents technical debt for future removal

**Migration logic**:

```
IF type === 'bank_account' AND is_investment === true
THEN set type = 'investment'
```

**Alternatives considered**:

- One-time migration script (rejected: requires manual execution)
- Migrate only on next save (rejected: inconsistent state possible)
- No migration, support both (rejected: complex conditional logic forever)

---

## 6. Variable Rate Interest Clearing Migration

**Decision**: Clear interest_rate when is_variable_rate is true, on service load.

**Rationale**:

- Removes stale/meaningless data
- Consistent behavior going forward
- Automatic, no user action needed

**Migration logic**:

```
IF is_variable_rate === true AND interest_rate !== undefined
THEN delete interest_rate
```

---

## 7. Insurance Claim Status Calculation

**Decision**: Auto-calculate claim status based on submission statuses.

**Status logic**:
| Claim Status | Condition |
|--------------|-----------|
| Draft | No submissions OR all submissions are Draft |
| In Progress | At least one submission is Pending |
| Closed | All submissions have final answer (Approved/Denied/Partial) |

**Rationale**:

- Reduces manual status management
- Prevents invalid state combinations
- Users focus on submissions, claim state follows automatically

---

## 8. Plan Snapshot Strategy

**Decision**: Deep copy plan details into submission at creation time.

**Rationale**:

- Historical accuracy: claim records show plan as it was
- Plan updates don't retroactively change past submissions
- UUID preserved for filtering/linking

**What to snapshot**:

- name, provider_name, policy_number, member_id, owner, priority, portal_url

**What NOT to snapshot**:

- id (keep as reference)
- is_active, created_at, updated_at (not relevant to submission)

---

## 9. Category Requirement Enforcement

**Decision**: Validate category_id is required at both frontend and backend.

**Rationale**:

- Prevents "Uncategorized" items from being created
- Frontend validation for UX, backend for data integrity
- Consistent with hiding Uncategorized from Manage views

**Implementation approach**:

- Frontend: Disable save button until category selected
- Backend: Return 400 if category_id missing or null

---

## 10. Insurance Categories - Predefined List

**Decision**: Start with predefined list, allow user additions via Manage UI.

**Predefined categories**:
| Name | Icon |
|------|------|
| Dental | 🦷 |
| Vision / Eye Care | 👁️ |
| Massage Therapy | 💆 |
| Physiotherapy | 🏃 |
| Chiropractic | 🦴 |
| Orthodontics | 🦷 |
| Mental Health | 🧠 |
| Prescription Drugs | 💊 |
| Medical Equipment | 🩼 |
| Hospital / Emergency | 🏥 |
| Other | 📋 |

**Rationale**:

- Covers common claim types
- User can add custom categories for specific needs
- Consistent with existing Category pattern in app

---

## Summary

All research items resolved. No external dependencies needed. All implementations follow existing codebase patterns and constitution principles.
