# API Contracts: Miscellaneous Fixes Round 4

**Branch**: `012-misc-fixes` | **Date**: 2026-01-11

This document describes new and modified API endpoints for this release.

---

## New Endpoints

### Insurance Plans

#### GET /api/insurance-plans

List all insurance plans.

**Response**: `200 OK`

```json
[
  {
    "id": "uuid",
    "name": "Sun Life - Brad",
    "provider_name": "Sun Life",
    "policy_number": "GRP-12345",
    "member_id": "98765",
    "owner": "Brad",
    "priority": 1,
    "portal_url": "https://sunlife.ca/claims",
    "notes": "",
    "is_active": true,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  }
]
```

#### POST /api/insurance-plans

Create a new insurance plan.

**Request**:

```json
{
  "name": "Sun Life - Brad",
  "provider_name": "Sun Life",
  "policy_number": "GRP-12345",
  "member_id": "98765",
  "owner": "Brad",
  "priority": 1,
  "portal_url": "https://sunlife.ca/claims",
  "notes": ""
}
```

**Response**: `201 Created` - Returns created plan

#### PUT /api/insurance-plans/:id

Update an insurance plan.

**Request**: Same as POST (partial updates allowed)

**Response**: `200 OK` - Returns updated plan

#### DELETE /api/insurance-plans/:id

Delete an insurance plan.

**Response**: `204 No Content`

**Error**: `409 Conflict` if plan has existing claims

---

### Insurance Categories

#### GET /api/insurance-categories

List all insurance categories.

**Response**: `200 OK`

```json
[
  {
    "id": "uuid",
    "name": "Dental",
    "icon": "🦷",
    "sort_order": 1,
    "is_predefined": true,
    "is_active": true,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  }
]
```

#### POST /api/insurance-categories

Create a new insurance category.

**Request**:

```json
{
  "name": "Custom Category",
  "icon": "🔹",
  "sort_order": 50
}
```

**Response**: `201 Created` - Returns created category

#### PUT /api/insurance-categories/:id

Update an insurance category.

**Request**: Same as POST (partial updates allowed)

**Response**: `200 OK` - Returns updated category

**Error**: `403 Forbidden` if attempting to modify predefined category name

#### DELETE /api/insurance-categories/:id

Delete an insurance category.

**Response**: `204 No Content`

**Error**: `403 Forbidden` if predefined category
**Error**: `409 Conflict` if category has existing claims

---

### Insurance Claims

#### GET /api/insurance-claims

List all insurance claims with optional filters.

**Query Parameters**:

- `status`: Filter by claim status (draft, in_progress, closed)
- `category_id`: Filter by category
- `year`: Filter by service date year

**Response**: `200 OK`

```json
[
  {
    "id": "uuid",
    "claim_number": 1,
    "category_id": "uuid",
    "category_name": "Dental",
    "description": "Annual cleaning",
    "provider_name": "Dr. Smith Dental",
    "service_date": "2026-01-05",
    "total_amount": 15000,
    "status": "in_progress",
    "documents": [...],
    "submissions": [...],
    "created_at": "2026-01-06T00:00:00Z",
    "updated_at": "2026-01-06T00:00:00Z"
  }
]
```

#### GET /api/insurance-claims/summary

Get summary statistics for claims.

**Response**: `200 OK`

```json
{
  "pending_count": 3,
  "pending_amount": 45000,
  "closed_count": 12,
  "reimbursed_amount": 234000
}
```

#### GET /api/insurance-claims/:id

Get a single claim with full details.

**Response**: `200 OK` - Returns claim object

#### POST /api/insurance-claims

Create a new claim.

**Request**:

```json
{
  "category_id": "uuid",
  "description": "Annual cleaning",
  "provider_name": "Dr. Smith Dental",
  "service_date": "2026-01-05",
  "total_amount": 15000
}
```

**Response**: `201 Created` - Returns created claim with auto-generated claim_number

#### PUT /api/insurance-claims/:id

Update a claim.

**Request**: Same as POST (partial updates allowed)

**Response**: `200 OK` - Returns updated claim

#### DELETE /api/insurance-claims/:id

Delete a claim and all associated documents.

**Response**: `204 No Content`

---

### Claim Documents

#### POST /api/insurance-claims/:id/documents

Upload a document to a claim.

**Request**: `multipart/form-data`

- `file`: The document file (PDF, JPG, PNG; max 10MB)
- `document_type`: Type of document (receipt, eob, other)
- `related_plan_id`: (optional) For EOBs, which plan issued it

**Response**: `201 Created`

```json
{
  "id": "uuid",
  "filename": "0001_2026-01-05_dental_receipt.pdf",
  "original_filename": "invoice.pdf",
  "document_type": "receipt",
  "mime_type": "application/pdf",
  "size_bytes": 245678,
  "uploaded_at": "2026-01-06T10:30:00Z"
}
```

#### GET /api/insurance-claims/:id/documents/:docId

Download a document.

**Response**: `200 OK` - File stream with appropriate Content-Type

#### DELETE /api/insurance-claims/:id/documents/:docId

Delete a document.

**Response**: `204 No Content`

---

### Claim Submissions

#### POST /api/insurance-claims/:id/submissions

Create a submission for a claim.

**Request**:

```json
{
  "plan_id": "uuid",
  "amount_claimed": 15000,
  "documents_sent": ["doc-uuid-1", "doc-uuid-2"]
}
```

**Response**: `201 Created` - Returns submission with plan_snapshot

#### PUT /api/insurance-claims/:id/submissions/:subId

Update a submission (status, amounts, dates).

**Request**:

```json
{
  "status": "approved",
  "amount_reimbursed": 12000,
  "date_submitted": "2026-01-06",
  "date_resolved": "2026-01-15",
  "eob_document_id": "doc-uuid-3"
}
```

**Response**: `200 OK` - Returns updated submission

#### DELETE /api/insurance-claims/:id/submissions/:subId

Delete a submission.

**Response**: `204 No Content`

---

## Modified Endpoints

### POST /api/version/backups/manual

**Request** (MODIFIED - was empty body):

```json
{
  "note": "Before refactoring payment sources"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "filename": "manual_2026-01-11T10-30-45-123Z.json",
  "message": "Manual backup created successfully"
}
```

### GET /api/version/backups

**Response** (MODIFIED - added note field):

```json
[
  {
    "filename": "manual_2026-01-11T10-30-45-123Z.json",
    "fromVersion": "",
    "toVersion": "",
    "timestamp": "2026-01-11T10:30:45.123Z",
    "size": 12345,
    "backupType": "manual",
    "note": "Before refactoring payment sources"
  }
]
```

### PUT /api/months/:month/savings-balances

**Request** (MODIFIED - added contributions):

```json
{
  "start": { "account-id": 100000 },
  "end": { "account-id": 118000 },
  "contributions": { "account-id": 20000 }
}
```

---

## Validation Changes

### POST/PUT /api/bills

**Validation changes**:

- `amount`: Changed from `>= 100` to `>= 0`
- `category_id`: Changed from optional to **required**

### POST/PUT /api/incomes

**Validation changes**:

- `amount`: Changed from `> 0` to `>= 0`
- `category_id`: Changed from optional to **required**
- `payment_method`: New optional field, one of: 'auto', 'manual' (default: 'auto')

---

## Error Responses

All endpoints return standard error format:

```json
{
  "error": "Error message",
  "details": "Additional details if available"
}
```

Common status codes:

- `400 Bad Request`: Validation error
- `403 Forbidden`: Operation not allowed
- `404 Not Found`: Resource not found
- `409 Conflict`: Operation would create conflict
- `500 Internal Server Error`: Unexpected error
