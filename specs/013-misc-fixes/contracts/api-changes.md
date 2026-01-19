# API Changes: Miscellaneous Fixes

**Feature**: `013-misc-fixes`

## New Endpoints

### 1. Savings Goals

**`GET /api/savings-goals`**

- Returns all savings goals.
- **Response**: `SavingsGoal[]`

**`POST /api/savings-goals`**

- Create a new goal.
- **Body**:
  ```typescript
  {
    name: string;
    target_amount: number;
    target_date: string;
    linked_account_id: string;
    initial_deposit?: number; // Optional
  }
  ```
- **Response**: `SavingsGoal`

**`PUT /api/savings-goals/:id`**

- Update goal details.
- **Body**: Partial `SavingsGoal`

**`POST /api/savings-goals/:id/withdraw`**

- Execute "Buy That Thing". Creates Income + Expense.
- **Body**: `{ amount: number, date: string }`
- **Response**: `{ goal: SavingsGoal, income_id: string, bill_id: string }`

### 2. Projections

**`GET /api/projections/:month`**

- Get daily balance projection for a specific month (e.g., "2026-03").
- **Response**:
  ```typescript
  interface ProjectionResponse {
    start_date: string; // YYYY-MM-DD (Today or 1st of month)
    end_date: string; // YYYY-MM-DD
    starting_balance: number;
    days: {
      date: string;
      balance: number;
      income: number;
      expense: number;
      events: { name: string; amount: number; type: 'income' | 'expense' }[];
      is_deficit: boolean;
    }[];
    overdue_bills: { name: string; amount: number; due_date: string }[];
  }
  ```

## Modified Endpoints

### 1. Insurance Claims

**`POST /api/insurance-claims`** (Create)

- **Change**: Now triggers auto-creation of `submissions` based on `family_member_id` plans list.
- **Response**: `InsuranceClaim` (now populated with draft submissions).

**`PUT /api/insurance-claims/:id/submissions/:subId`** (Update)

- **Change**: If status becomes `approved` or `denied`, triggers cascade update on next submission.

### 2. Family Members

**`PUT /api/family-members/:id`**

- **Change**: Accepts `plans: string[]` in body.

### 3. Detailed Month

**`GET /api/months/:month/detailed`**

- **Change**: (Bug Fix US6) `billSections[].items[].payments` array is now populated correctly by flattening occurrences.
