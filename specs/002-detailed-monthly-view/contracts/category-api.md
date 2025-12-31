# API Contract: Category Endpoints

**Feature**: [spec.md](../spec.md)  
**Date**: 2025-12-31

---

## Overview

Extends the existing Category API to support ordering, colors, and income categories for the Detailed Monthly View.

---

## Endpoints

### GET /api/categories

**Description**: Retrieves all categories with extended fields.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | 'bill' \| 'income' | No | Filter by category type |

**Response**: `200 OK`
```typescript
interface GetCategoriesResponse {
  categories: Category[];
}

interface Category {
  id: string;
  name: string;
  is_predefined: boolean;
  sort_order: number;     // Display order (lower = first)
  color: string;          // Hex color (#RRGGBB)
  type: 'bill' | 'income';
  created_at: string;
  updated_at: string;
}
```

**Example Response**:
```json
{
  "categories": [
    {
      "id": "cat-home",
      "name": "Home",
      "is_predefined": true,
      "sort_order": 0,
      "color": "#3b82f6",
      "type": "bill",
      "created_at": "2025-12-31T00:00:00Z",
      "updated_at": "2025-12-31T00:00:00Z"
    },
    {
      "id": "cat-salary",
      "name": "Salary",
      "is_predefined": true,
      "sort_order": 0,
      "color": "#10b981",
      "type": "income",
      "created_at": "2025-12-31T00:00:00Z",
      "updated_at": "2025-12-31T00:00:00Z"
    }
  ]
}
```

---

### PUT /api/categories/:id

**Description**: Updates a category's properties including color and sort_order.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Category ID |

**Request Body**:
```typescript
interface UpdateCategoryRequest {
  name?: string;           // Max 100 characters
  color?: string;          // Hex format (#RRGGBB or #RGB)
  sort_order?: number;     // >= 0
}
```

**Response**: `200 OK`
```typescript
interface UpdateCategoryResponse {
  category: Category;
}
```

**Errors**:
- `400 Bad Request`: Invalid color format or sort_order
- `404 Not Found`: Category not found
- `409 Conflict`: Name already exists for same type

**Example Request**:
```json
{
  "color": "#ef4444",
  "sort_order": 2
}
```

---

### PUT /api/categories/reorder

**Description**: Bulk updates sort_order for multiple categories. Use for drag-and-drop reordering.

**Request Body**:
```typescript
interface ReorderCategoriesRequest {
  type: 'bill' | 'income';     // Which category type to reorder
  order: string[];              // Array of category IDs in new order
}
```

**Response**: `200 OK`
```typescript
interface ReorderCategoriesResponse {
  categories: Category[];      // All categories of the specified type
}
```

**Errors**:
- `400 Bad Request`: Missing or invalid category IDs
- `400 Bad Request`: Order array doesn't contain all categories of type

**Behavior**:
- Sets `sort_order` based on array position (index 0 = sort_order 0)
- Ignores categories not in the order array
- Only affects categories of specified type

**Example Request**:
```json
{
  "type": "bill",
  "order": ["cat-home", "cat-utilities", "cat-debt", "cat-streaming"]
}
```

---

### POST /api/categories

**Description**: Creates a new custom category.

**Request Body**:
```typescript
interface CreateCategoryRequest {
  name: string;                  // Required, 1-100 characters
  color: string;                 // Required, hex format
  type: 'bill' | 'income';       // Required
}
```

**Response**: `201 Created`
```typescript
interface CreateCategoryResponse {
  category: Category;
}
```

**Behavior**:
- Generates UUID for id
- Sets `is_predefined: false`
- Sets `sort_order` to max existing + 1 (appends to end)
- Sets timestamps

**Errors**:
- `400 Bad Request`: Missing required fields
- `400 Bad Request`: Invalid color format
- `409 Conflict`: Name already exists for same type

---

### DELETE /api/categories/:id

**Description**: Deletes a custom category.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Category ID |

**Response**: `204 No Content`

**Errors**:
- `400 Bad Request`: Cannot delete predefined category
- `404 Not Found`: Category not found
- `409 Conflict`: Category has associated bills/incomes

**Behavior**:
- Only custom categories (`is_predefined: false`) can be deleted
- Fails if any bills or incomes reference this category
- Does not update sort_order of remaining categories (gaps allowed)

---

## Validation Rules

### Color Format
- Must be valid hex: `#RRGGBB` or `#RGB`
- Regex: `/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/`

### Name
- Required, 1-100 characters
- Must be unique within type (bill categories and income categories can have same name)

### Sort Order
- Must be >= 0
- Integer only

---

## Migration Notes

### Existing Categories
When loading categories without new fields, apply defaults:
- `sort_order`: Based on array position
- `color`: From default palette based on name
- `type`: 'bill' for all existing categories

### Default Colors Palette
```typescript
const defaultColors: Record<string, string> = {
  'Home': '#3b82f6',
  'Debt': '#ef4444',
  'Utilities': '#f59e0b',
  'Streaming': '#8b5cf6',
  'Transportation': '#10b981',
  'Entertainment': '#ec4899',
  'Insurance': '#06b6d4',
  'Subscriptions': '#6366f1',
  'Variable': '#f97316',
  'Ad-hoc': '#64748b',
  'Salary': '#10b981',
  'Freelance/Contract': '#8b5cf6',
  'Investment': '#3b82f6',
  'Government': '#f59e0b',
  'Other': '#64748b'
};
```

---

## Controller Implementation

File: `api/src/controllers/CategoriesController.ts`

Extends existing controller with:
- `reorder()` method for bulk sort_order update
- Validation for color format
- Type filtering on GET

---

**Contract Complete**
