# API Contract: Occurrence-Only Model

**Feature**: 014-occurrence-only-simplify
**Date**: 2026-01-25

## Overview

This document defines the API changes for migrating to an occurrence-only payment model. The main changes are:

1. **REMOVE** all payment-related endpoints
2. **ADD** a split endpoint for partial payments
3. **MODIFY** existing occurrence endpoints to include `payment_source_id`

---

## Endpoints to REMOVE

These endpoints are removed as payments are no longer a separate entity:

### Bill Payment Endpoints

```yaml
# ❌ REMOVE
POST /api/months/{month}/bills/{instanceId}/occurrences/{occurrenceId}/payments
DELETE /api/months/{month}/bills/{instanceId}/occurrences/{occurrenceId}/payments/{paymentId}
```

### Income Payment Endpoints

```yaml
# ❌ REMOVE
POST /api/months/{month}/incomes/{instanceId}/occurrences/{occurrenceId}/payments
DELETE /api/months/{month}/incomes/{instanceId}/occurrences/{occurrenceId}/payments/{paymentId}
```

---

## Endpoints to MODIFY

### Update Occurrence

**Path**: `PUT /api/months/{month}/bills/{instanceId}/occurrences/{occurrenceId}`

**Change**: Add `payment_source_id` to request body.

```yaml
PUT /api/months/{month}/bills/{instanceId}/occurrences/{occurrenceId}
Content-Type: application/json

Request Body:
  expected_amount?: number    # Cents
  expected_date?: string      # YYYY-MM-DD
  notes?: string
  payment_source_id?: string  # NEW: Which account to use

Response: 200 OK
  {
    "id": "occ-123",
    "sequence": 1,
    "expected_date": "2026-01-15",
    "expected_amount": 30000,
    "is_closed": false,
    "payment_source_id": "ps-456",
    "notes": "Updated amount",
    "is_adhoc": false,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-25T12:00:00Z"
  }

Errors:
  400 Bad Request - Invalid amount or date
  404 Not Found - Occurrence or instance not found
```

Same pattern applies to:

- `PUT /api/months/{month}/incomes/{instanceId}/occurrences/{occurrenceId}`

---

### Close Occurrence

**Path**: `POST /api/months/{month}/bills/{instanceId}/occurrences/{occurrenceId}/close`

**Change**: Add optional `payment_source_id` to request body.

```yaml
POST /api/months/{month}/bills/{instanceId}/occurrences/{occurrenceId}/close
Content-Type: application/json

Request Body:
  closed_date: string           # Required: YYYY-MM-DD
  notes?: string                # Optional close notes
  payment_source_id?: string    # NEW: Which account was used

Response: 200 OK
  {
    "id": "occ-123",
    "sequence": 1,
    "expected_date": "2026-01-15",
    "expected_amount": 30000,
    "is_closed": true,
    "closed_date": "2026-01-25",
    "payment_source_id": "ps-456",
    "notes": "Paid via checking",
    "is_adhoc": false,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-25T12:00:00Z"
  }

Errors:
  400 Bad Request - Missing closed_date or already closed
  404 Not Found - Occurrence or instance not found
```

Same pattern applies to:

- `POST /api/months/{month}/incomes/{instanceId}/occurrences/{occurrenceId}/close`

---

## Endpoints to ADD

### Split Occurrence

**Purpose**: Close an occurrence with a different amount than expected, creating a new occurrence for the remainder.

**Path**: `POST /api/months/{month}/bills/{instanceId}/occurrences/{occurrenceId}/split`

```yaml
POST /api/months/{month}/bills/{instanceId}/occurrences/{occurrenceId}/split
Content-Type: application/json

Request Body:
  paid_amount: number           # Required: Amount being paid now (cents)
  closed_date: string           # Required: YYYY-MM-DD
  payment_source_id?: string    # Optional: Which account was used
  notes?: string                # Optional close notes

Response: 200 OK
  {
    "closed_occurrence": {
      "id": "occ-123",
      "sequence": 1,
      "expected_date": "2026-01-15",
      "expected_amount": 10000,        # Updated to paid_amount
      "is_closed": true,
      "closed_date": "2026-01-25",
      "payment_source_id": "ps-456",
      "notes": "Partial payment",
      "is_adhoc": false,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-25T12:00:00Z"
    },
    "new_occurrence": {
      "id": "occ-456",
      "sequence": 2,                   # Incremented sequence
      "expected_date": "2026-01-31",   # End of month
      "expected_amount": 20000,        # Remaining amount
      "is_closed": false,
      "is_adhoc": true,                # Marked as ad-hoc
      "created_at": "2026-01-25T12:00:00Z",
      "updated_at": "2026-01-25T12:00:00Z"
    }
  }

Errors:
  400 Bad Request:
    - paid_amount <= 0
    - paid_amount >= original expected_amount
    - Occurrence already closed
    - Missing required fields
  404 Not Found - Occurrence or instance not found
```

Same pattern applies to:

- `POST /api/months/{month}/incomes/{instanceId}/occurrences/{occurrenceId}/split`

---

## Response Schema Changes

### Occurrence Object

The `Occurrence` object in all responses is updated to remove `payments` and add `payment_source_id`:

```yaml
Occurrence:
  type: object
  properties:
    id:
      type: string
      format: uuid
    sequence:
      type: integer
      minimum: 1
    expected_date:
      type: string
      format: date
      example: '2026-01-15'
    expected_amount:
      type: integer
      description: Amount in cents
      minimum: 1
    is_closed:
      type: boolean
    closed_date:
      type: string
      format: date
      nullable: true
    payment_source_id: # NEW
      type: string
      format: uuid
      nullable: true
    notes:
      type: string
      nullable: true
    is_adhoc:
      type: boolean
    created_at:
      type: string
      format: date-time
    updated_at:
      type: string
      format: date-time
  required:
    - id
    - sequence
    - expected_date
    - expected_amount
    - is_closed
    - is_adhoc
    - created_at
    - updated_at
```

### REMOVED: Payment Object

```yaml
# ❌ REMOVED - No longer used
Payment:
  type: object
  properties:
    id: string
    amount: integer
    date: string
    payment_source_id: string
    created_at: string
```

---

## Business Logic

### Split Rules

1. **Minimum Split**: `paid_amount` must be at least 1 cent
2. **Maximum Split**: `paid_amount` must be less than `expected_amount`
3. **Remainder Calculation**: `new_occurrence.expected_amount = original_expected_amount - paid_amount`
4. **Sequence Assignment**: New occurrence gets next available sequence number
5. **Date Assignment**: New occurrence defaults to end of month if original was mid-month

### Instance Status Updates

After any occurrence state change:

- `instance.is_closed = ALL occurrences.is_closed`
- `instance.closed_date = last occurrence.closed_date` (when all closed)

### Calculation Changes

**Paid Amount** (for display):

```
paid_amount = SUM(occurrences.filter(is_closed).map(expected_amount))
```

**Remaining Amount**:

```
remaining = SUM(occurrences.filter(!is_closed).map(expected_amount))
```

---

## Migration Endpoint

### Run Migration

**Purpose**: Convert existing payment data to occurrence-only model. One-time operation.

**Path**: `POST /api/migrate/payments-to-occurrences`

```yaml
POST /api/migrate/payments-to-occurrences
Content-Type: application/json

Request Body:
  dry_run?: boolean    # Default: false - if true, only report changes without applying

Response: 200 OK
  {
    "status": "success",
    "summary": {
      "months_processed": 12,
      "occurrences_migrated": 156,
      "occurrences_split": 23,
      "payments_removed": 289
    },
    "backup_created": "2026-01-25T12:00:00Z"
  }

Errors:
  409 Conflict - Migration already completed
  500 Internal Server Error - Migration failed (backup available)
```

---

## Endpoint Summary

| Method | Path                                         | Status    | Description                          |
| ------ | -------------------------------------------- | --------- | ------------------------------------ |
| POST   | `/.../occurrences/{id}/payments`             | ❌ REMOVE | No longer needed                     |
| DELETE | `/.../occurrences/{id}/payments/{paymentId}` | ❌ REMOVE | No longer needed                     |
| PUT    | `/.../occurrences/{id}`                      | MODIFY    | Add `payment_source_id`              |
| POST   | `/.../occurrences/{id}/close`                | MODIFY    | Add `payment_source_id`              |
| POST   | `/.../occurrences/{id}/split`                | ✅ NEW    | Split occurrence for partial payment |
| POST   | `/api/migrate/payments-to-occurrences`       | ✅ NEW    | One-time migration                   |

---

## Versioning

This is a **breaking change** to the API. Clients using payment endpoints will receive 404 errors after migration.

**Recommendation**: Include version header for transition period:

```
X-API-Version: 2.0
```

Clients should update to use:

- Split endpoint for partial payments
- Close endpoint with `payment_source_id` for tracking payment source
