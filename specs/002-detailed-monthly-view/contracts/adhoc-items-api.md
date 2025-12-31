# API Contract: Ad-hoc Items Endpoints

**Feature**: [spec.md](../spec.md)  
**Date**: 2025-12-31

---

## Overview

Endpoints for creating and managing one-time ad-hoc bills and incomes that don't have a recurring pattern.

---

## Endpoints

### POST /api/months/:month/adhoc/bills

**Description**: Creates an ad-hoc (one-time) bill for a specific month.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | string | Yes | Month in YYYY-MM format |

**Request Body**:
```typescript
interface CreateAdhocBillRequest {
  name: string;                  // Required, 1-100 characters
  amount: number;                // Required, positive (in cents)
  category_id?: string;          // Optional, defaults to "Ad-hoc" category
  payment_source_id?: string;    // Optional
  date?: string;                 // Optional, ISO date for when paid
}
```

**Response**: `201 Created`
```typescript
interface CreateAdhocBillResponse {
  billInstance: BillInstance;
}

interface BillInstance {
  id: string;
  bill_id: null;                 // Always null for ad-hoc
  month: string;
  name: string;                  // From request
  expected_amount: number;       // Set to 0 for ad-hoc
  actual_amount: number;         // From request amount
  payments: [];                  // Empty for new ad-hoc
  is_default: false;
  is_paid: boolean;              // true if date provided
  is_adhoc: true;
  due_date: null;
  category_id: string;
  payment_source_id: string | null;
  created_at: string;
  updated_at: string;
}
```

**Behavior**:
- Creates BillInstance with `bill_id: null` and `is_adhoc: true`
- Sets `expected_amount: 0` (ad-hoc items have no expected)
- Sets `actual_amount` from request
- If `date` provided, sets `is_paid: true`
- If no `category_id`, uses default "Ad-hoc" bill category

**Errors**:
- `400 Bad Request`: Missing name or invalid amount
- `404 Not Found`: Month, category, or payment source not found

**Example Request**:
```json
{
  "name": "Car Repair",
  "amount": 80000,
  "category_id": "cat-adhoc",
  "payment_source_id": "ps-visa",
  "date": "2025-01-12"
}
```

---

### POST /api/months/:month/adhoc/incomes

**Description**: Creates an ad-hoc (one-time) income for a specific month.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | string | Yes | Month in YYYY-MM format |

**Request Body**:
```typescript
interface CreateAdhocIncomeRequest {
  name: string;                  // Required, 1-100 characters
  amount: number;                // Required, positive (in cents)
  category_id?: string;          // Optional, defaults to "Ad-hoc" income category
  payment_source_id?: string;    // Optional (where received)
  date?: string;                 // Optional, ISO date for when received
}
```

**Response**: `201 Created`
```typescript
interface CreateAdhocIncomeResponse {
  incomeInstance: IncomeInstance;
}

interface IncomeInstance {
  id: string;
  income_id: null;               // Always null for ad-hoc
  month: string;
  name: string;
  expected_amount: number;       // Set to 0 for ad-hoc
  actual_amount: number;         // From request amount
  is_default: false;
  is_paid: boolean;              // true if date provided
  is_adhoc: true;
  due_date: null;
  category_id: string;
  payment_source_id: string | null;
  created_at: string;
  updated_at: string;
}
```

**Example Request**:
```json
{
  "name": "Sold old laptop",
  "amount": 45000,
  "category_id": "cat-adhoc-income",
  "date": "2025-01-08"
}
```

---

### PUT /api/months/:month/adhoc/bills/:id

**Description**: Updates an ad-hoc bill instance.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | string | Yes | Month in YYYY-MM format |
| id | string | Yes | Bill instance ID |

**Request Body**:
```typescript
interface UpdateAdhocBillRequest {
  name?: string;
  actual_amount?: number;
  category_id?: string;
  payment_source_id?: string;
  is_paid?: boolean;
}
```

**Response**: `200 OK`
```typescript
interface UpdateAdhocBillResponse {
  billInstance: BillInstance;
}
```

**Errors**:
- `400 Bad Request`: Instance is not ad-hoc
- `404 Not Found`: Month or instance not found

---

### PUT /api/months/:month/adhoc/incomes/:id

**Description**: Updates an ad-hoc income instance.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | string | Yes | Month in YYYY-MM format |
| id | string | Yes | Income instance ID |

**Request Body**:
```typescript
interface UpdateAdhocIncomeRequest {
  name?: string;
  actual_amount?: number;
  category_id?: string;
  payment_source_id?: string;
  is_paid?: boolean;
}
```

**Response**: `200 OK`
```typescript
interface UpdateAdhocIncomeResponse {
  incomeInstance: IncomeInstance;
}
```

---

### DELETE /api/months/:month/adhoc/bills/:id

**Description**: Deletes an ad-hoc bill instance.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | string | Yes | Month in YYYY-MM format |
| id | string | Yes | Bill instance ID |

**Response**: `204 No Content`

**Errors**:
- `400 Bad Request`: Instance is not ad-hoc
- `404 Not Found`: Month or instance not found

---

### DELETE /api/months/:month/adhoc/incomes/:id

**Description**: Deletes an ad-hoc income instance.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | string | Yes | Month in YYYY-MM format |
| id | string | Yes | Income instance ID |

**Response**: `204 No Content`

---

### POST /api/months/:month/adhoc/bills/:id/make-regular

**Description**: Converts an ad-hoc bill to a regular recurring bill.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | string | Yes | Month in YYYY-MM format |
| id | string | Yes | Ad-hoc bill instance ID |

**Request Body**:
```typescript
interface MakeRegularBillRequest {
  name: string;                   // Bill name (may differ from ad-hoc)
  amount: number;                 // Default amount for recurring bill
  category_id: string;            // Required for regular bill
  payment_source_id: string;      // Required for regular bill
  billing_period: BillingPeriod;  // 'monthly' | 'bi-weekly' | 'weekly' | 'semi-annually'
  due_day?: number;               // Optional, 1-31
}
```

**Response**: `201 Created`
```typescript
interface MakeRegularBillResponse {
  bill: Bill;                     // Newly created recurring bill
  billInstance: BillInstance;     // Updated instance (now references bill)
}
```

**Behavior**:
1. Creates new Bill entity with provided details
2. Updates BillInstance:
   - Sets `bill_id` to new bill's ID
   - Keeps `is_adhoc: true` (historical record)
   - Sets `expected_amount` from bill amount
3. Future months will include this bill as recurring

**Errors**:
- `400 Bad Request`: Instance is not ad-hoc
- `400 Bad Request`: Missing required fields
- `404 Not Found`: Month, instance, category, or payment source not found

**Example Request**:
```json
{
  "name": "Car Insurance",
  "amount": 15000,
  "category_id": "cat-insurance",
  "payment_source_id": "ps-checking",
  "billing_period": "monthly",
  "due_day": 15
}
```

---

### POST /api/months/:month/adhoc/incomes/:id/make-regular

**Description**: Converts an ad-hoc income to a regular recurring income.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | string | Yes | Month in YYYY-MM format |
| id | string | Yes | Ad-hoc income instance ID |

**Request Body**:
```typescript
interface MakeRegularIncomeRequest {
  name: string;
  amount: number;
  category_id: string;
  payment_source_id: string;
  billing_period: BillingPeriod;
  due_day?: number;
}
```

**Response**: `201 Created`
```typescript
interface MakeRegularIncomeResponse {
  income: Income;
  incomeInstance: IncomeInstance;
}
```

---

## UI Flow: "Make Regular?"

### Drawer Pre-fill
When user clicks "Make Regular?" on an ad-hoc item:

```typescript
const prefillData = {
  name: adhocInstance.name,
  amount: adhocInstance.actual_amount,
  category_id: adhocInstance.category_id,
  payment_source_id: adhocInstance.payment_source_id,
  billing_period: 'monthly',  // Default
  due_day: undefined
};
```

### Drawer Fields
1. **Name** - Text input (pre-filled)
2. **Amount** - Currency input (pre-filled)
3. **Category** - Dropdown of bill/income categories (pre-filled)
4. **Payment Source** - Dropdown (pre-filled)
5. **Billing Period** - Dropdown: Monthly, Bi-weekly, Weekly, Semi-annually
6. **Due Day** - Number input 1-31 (optional)

### Submit Flow
1. Validate all required fields
2. Call `/api/months/:month/adhoc/:type/:id/make-regular`
3. Show success toast: "Created recurring bill: {name}"
4. Close drawer
5. Refresh month data (bill now appears with expected amount)

---

## Ad-hoc Item Display

### In Category Groups
Ad-hoc items appear under their assigned category (or "Ad-hoc" category by default).

### Visual Indicators
- Italic text or badge indicating "one-time"
- "Make Regular?" link/button
- No expected amount column (shows "-" or blank)

### Sorting Within Category
Ad-hoc items sort by:
1. is_paid (unpaid first)
2. created_at (newest first)

---

## Validation Rules

### Name
- Required, 1-100 characters
- Trimmed of whitespace

### Amount
- Required, positive integer (cents)
- Must be > 0

### Category
- Must exist and match type (bill category for bills, income for incomes)
- If not provided, uses default "Ad-hoc" category

### Payment Source
- Optional
- If provided, must exist

---

## Undo Support

All ad-hoc operations support undo:
- Create: Undo deletes the instance
- Update: Undo reverts changes
- Delete: Undo restores the instance
- Make Regular: Undo deletes the Bill/Income and reverts the instance

---

**Contract Complete**
