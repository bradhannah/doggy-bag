# Data Model: Miscellaneous Fixes Round 4

**Branch**: `012-misc-fixes` | **Date**: 2026-01-11

## Overview

This document describes new entities and modifications to existing entities for this release.

---

## New Entities

### InsurancePlan

Represents an insurance provider/policy that the user can submit claims to.

**Storage**: `entities/insurance-plans.json`

| Field         | Type          | Required | Description                                        |
| ------------- | ------------- | -------- | -------------------------------------------------- |
| id            | string (uuid) | Yes      | Unique identifier                                  |
| name          | string        | Yes      | Display name (e.g., "Sun Life - Brad")             |
| provider_name | string        | No       | Provider company name                              |
| policy_number | string        | No       | Policy/group number                                |
| member_id     | string        | No       | User's member ID on this plan                      |
| owner         | string        | No       | Who this plan belongs to (e.g., "Brad", "Partner") |
| priority      | number        | Yes      | Submission order (1 = primary, 2 = secondary)      |
| portal_url    | string        | No       | URL to submit claims online                        |
| notes         | string        | No       | Freeform notes                                     |
| is_active     | boolean       | Yes      | Whether plan is currently active                   |
| created_at    | string (ISO)  | Yes      | Creation timestamp                                 |
| updated_at    | string (ISO)  | Yes      | Last update timestamp                              |

**Validation rules**:

- `name` is required and must be non-empty
- `priority` must be a positive integer, unique across active plans
- `portal_url` must be a valid URL if provided

---

### InsuranceCategory

Predefined and user-created claim types.

**Storage**: `entities/insurance-categories.json`

| Field         | Type          | Required | Description                    |
| ------------- | ------------- | -------- | ------------------------------ |
| id            | string (uuid) | Yes      | Unique identifier              |
| name          | string        | Yes      | Category name (e.g., "Dental") |
| icon          | string        | Yes      | Emoji icon                     |
| sort_order    | number        | Yes      | Display order                  |
| is_predefined | boolean       | Yes      | True for built-in categories   |
| is_active     | boolean       | Yes      | Whether category is active     |
| created_at    | string (ISO)  | Yes      | Creation timestamp             |
| updated_at    | string (ISO)  | Yes      | Last update timestamp          |

**Predefined categories** (seeded on first load):

| name                 | icon | sort_order |
| -------------------- | ---- | ---------- |
| Dental               | 🦷   | 1          |
| Vision / Eye Care    | 👁️   | 2          |
| Massage Therapy      | 💆   | 3          |
| Physiotherapy        | 🏃   | 4          |
| Chiropractic         | 🦴   | 5          |
| Orthodontics         | 🦷   | 6          |
| Mental Health        | 🧠   | 7          |
| Prescription Drugs   | 💊   | 8          |
| Medical Equipment    | 🩼   | 9          |
| Hospital / Emergency | 🏥   | 10         |
| Other                | 📋   | 99         |

---

### InsuranceClaim

An expense/incident with documents and submissions.

**Storage**: `entities/insurance-claims.json`

| Field         | Type              | Required | Description                                    |
| ------------- | ----------------- | -------- | ---------------------------------------------- |
| id            | string (uuid)     | Yes      | Unique identifier                              |
| claim_number  | number            | Yes      | Human-readable ID (auto-increment: 1, 2, 3...) |
| category_id   | string            | Yes      | Reference to InsuranceCategory                 |
| category_name | string            | Yes      | Denormalized category name for display         |
| description   | string            | No       | Optional notes (auto-generated if empty)       |
| provider_name | string            | No       | Service provider (e.g., "Dr. Smith Dental")    |
| service_date  | string (ISO date) | Yes      | When the service occurred                      |
| total_amount  | number            | Yes      | Original invoice amount in cents               |
| status        | string            | Yes      | Auto-calculated: draft / in_progress / closed  |
| documents     | ClaimDocument[]   | Yes      | Array of attached documents                    |
| submissions   | ClaimSubmission[] | Yes      | Array of plan submissions                      |
| created_at    | string (ISO)      | Yes      | Creation timestamp                             |
| updated_at    | string (ISO)      | Yes      | Last update timestamp                          |

**Status calculation**:

- `draft`: No submissions OR all submissions are draft
- `in_progress`: At least one submission is pending
- `closed`: All submissions have final answer (approved/denied/partial)

---

### ClaimDocument (embedded in InsuranceClaim)

A document attached to a claim.

| Field             | Type          | Required | Description                       |
| ----------------- | ------------- | -------- | --------------------------------- |
| id                | string (uuid) | Yes      | Unique identifier                 |
| filename          | string        | Yes      | Stored filename (sortable format) |
| original_filename | string        | Yes      | Original uploaded filename        |
| document_type     | string        | Yes      | Type: receipt / eob / other       |
| related_plan_id   | string        | No       | For EOBs, which plan issued it    |
| mime_type         | string        | Yes      | File MIME type                    |
| size_bytes        | number        | Yes      | File size in bytes                |
| uploaded_at       | string (ISO)  | Yes      | Upload timestamp                  |

**Filename format**: `{claim_number:04d}_{date}_{category}_{type}.{ext}`

- Example: `0001_2024-01-05_dental_receipt.pdf`

**Storage location**: `{data_dir}/documents/insurance/receipts/`

---

### ClaimSubmission (embedded in InsuranceClaim)

A submission of a claim to one insurance plan.

| Field             | Type              | Required | Description                                           |
| ----------------- | ----------------- | -------- | ----------------------------------------------------- |
| id                | string (uuid)     | Yes      | Unique identifier                                     |
| plan_id           | string            | Yes      | Reference to InsurancePlan (for filtering)            |
| plan_snapshot     | object            | Yes      | Deep copy of plan details at submission time          |
| status            | string            | Yes      | Status: draft / pending / approved / denied / partial |
| amount_claimed    | number            | Yes      | Amount claimed in cents                               |
| amount_reimbursed | number            | No       | Amount received in cents (when resolved)              |
| date_submitted    | string (ISO date) | No       | When submitted to insurer                             |
| date_resolved     | string (ISO date) | No       | When response received                                |
| documents_sent    | string[]          | Yes      | Array of document IDs sent with this submission       |
| eob_document_id   | string            | No       | Document ID of EOB received for this submission       |
| notes             | string            | No       | Freeform notes                                        |

**plan_snapshot fields**:

- name, provider_name, policy_number, member_id, owner, priority, portal_url

---

## Modified Entities

### Income

**Add field**:

| Field          | Type   | Required | Default | Description                        |
| -------------- | ------ | -------- | ------- | ---------------------------------- |
| payment_method | string | No       | 'auto'  | Payment method: 'auto' or 'manual' |

**Migration**: Existing incomes without payment_method default to 'auto' on load.

---

### PaymentSource

**Modify type enum**:

Current: `'bank_account' | 'credit_card' | 'line_of_credit' | 'cash'`

New: `'bank_account' | 'credit_card' | 'line_of_credit' | 'cash' | 'investment'`

**Migration**:

1. Records with `type === 'bank_account' AND is_investment === true` → set `type = 'investment'`
2. Records with `is_variable_rate === true AND interest_rate !== undefined` → delete `interest_rate`

**TODO**: Add inline comments for future removal of:

- `is_investment` boolean (redundant with type=investment)
- Migration logic once all data migrated

---

### MonthlyData

**Add field**:

| Field                 | Type                   | Required | Description                               |
| --------------------- | ---------------------- | -------- | ----------------------------------------- |
| savings_contributions | Record<string, number> | No       | Expected contribution per account (cents) |

**Modify month creation**:

- When creating a new month, copy previous month's `savings_balances_end` (Final) to new month's `savings_balances_start` (Start)

---

### VersionBackup (in version-service.ts)

**Add field**:

| Field | Type   | Required | Description                        |
| ----- | ------ | -------- | ---------------------------------- |
| note  | string | No       | User-provided note (max 100 chars) |

---

## State Diagrams

### ClaimSubmission Status Flow

```
                    ┌─────────┐
                    │  Draft  │
                    └────┬────┘
                         │ submit
                         ▼
                    ┌─────────┐
                    │ Pending │
                    └────┬────┘
                         │ resolve
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
      ┌─────────┐  ┌─────────┐  ┌─────────┐
      │Approved │  │ Denied  │  │ Partial │
      └─────────┘  └─────────┘  └─────────┘
```

### InsuranceClaim Status (Auto-calculated)

```
┌──────────────────────────────────────────────────────────┐
│ IF no submissions OR all submissions = draft             │
│    → claim.status = 'draft'                              │
│                                                          │
│ ELSE IF any submission = pending                         │
│    → claim.status = 'in_progress'                        │
│                                                          │
│ ELSE (all submissions have final answer)                 │
│    → claim.status = 'closed'                             │
└──────────────────────────────────────────────────────────┘
```

---

## Relationships

```
InsurancePlan (1) ──────────────────────────────┐
                                                │ referenced by
                                                ▼
InsuranceClaim (1) ─────── contains ─────► ClaimSubmission (N)
       │                                        │
       │                                        │ plan_snapshot (copy)
       │                                        │ plan_id (reference)
       │                                        │
       │                                        ▼
       │                                   InsurancePlan
       │
       └─────── contains ─────► ClaimDocument (N)
                                        │
                                        │ referenced by
                                        ▼
                               ClaimSubmission.documents_sent[]
                               ClaimSubmission.eob_document_id

InsuranceCategory (1) ◄───── category_id ───── InsuranceClaim (N)
```

---

## Validation Summary

| Entity            | Field          | Rule                                              |
| ----------------- | -------------- | ------------------------------------------------- |
| InsurancePlan     | name           | Required, non-empty                               |
| InsurancePlan     | priority       | Positive integer, unique among active             |
| InsurancePlan     | portal_url     | Valid URL if provided                             |
| InsuranceCategory | name           | Required, non-empty                               |
| InsuranceCategory | icon           | Required, non-empty                               |
| InsuranceClaim    | category_id    | Required, must exist                              |
| InsuranceClaim    | service_date   | Required, valid date                              |
| InsuranceClaim    | total_amount   | Required, >= 0                                    |
| ClaimDocument     | filename       | Required, matches format                          |
| ClaimDocument     | document_type  | One of: receipt, eob, other                       |
| ClaimSubmission   | plan_id        | Required, must exist                              |
| ClaimSubmission   | status         | One of: draft, pending, approved, denied, partial |
| ClaimSubmission   | amount_claimed | Required, >= 0                                    |
| Bill              | category_id    | Required (new validation)                         |
| Income            | category_id    | Required (new validation)                         |
| Bill              | amount         | >= 0 (changed from >= 100)                        |
| Income            | amount         | >= 0 (changed from > 0)                           |
| VersionBackup     | note           | Max 100 characters                                |
