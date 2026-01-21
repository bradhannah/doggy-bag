# Data Model: Miscellaneous Fixes & Improvements

**Feature**: `013-misc-fixes`

## Entities

### 1. Insurance Plan (Modified)

_Existing entity in `data/entities/insurance-plans.json`_

**Changes**:

- **Remove**: `priority` (number) - Replaced by per-member ordering.

```typescript
interface InsurancePlan {
  id: string;
  name: string;
  provider_name?: string;
  policy_number?: string;
  member_id?: string;
  owner?: string;
  // priority: number; // REMOVED
  portal_url?: string; // Existing field, used for US10
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### 2. Family Member (Modified)

_Existing entity in `data/entities/family-members.json`_

**Changes**:

- **Add**: `plans` (string[]) - Ordered list of Insurance Plan IDs.

```typescript
interface FamilyMember {
  id: string;
  name: string;
  plans: string[]; // NEW: Ordered Plan IDs
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### 3. Claim Submission (Modified Types)

_Embedded in `InsuranceClaim` entity_

**Changes**:

- **Update Enum**: `SubmissionStatus` adds `'awaiting_previous'`.

```typescript
type SubmissionStatus = 'draft' | 'pending' | 'approved' | 'denied' | 'awaiting_previous'; // NEW
```

### 4. Savings Goal (New Entity)

_New storage file: `data/entities/savings-goals.json`_

**Purpose**: Tracks long-term savings targets.

```typescript
interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number; // Cents
  current_amount: number; // Cents (Virtual balance)
  target_date: string; // YYYY-MM-DD
  linked_account_id: string; // Reference to PaymentSource (informational)
  linked_bill_ids: string[]; // IDs of Bills created for this goal
  status: 'active' | 'completed' | 'archived';
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

## Validation Rules

### Savings Goal

- `target_amount`: Must be > 0.
- `target_date`: Should be in the future (warning only).
- `current_amount`: Can be >= 0.

### Family Member

- `plans`: Must contain valid UUIDs. Duplicates not allowed.

## Migration Strategy

### Family Member Plans

- **Trigger**: `FamilyMembersService.getAll()` or `getById()`.
- **Logic**:
  - If `member.plans` is undefined:
    - Load all active `InsurancePlan`s.
    - Sort by legacy `priority` field (if available) or `name`.
    - Set `member.plans` = `[plan1.id, plan2.id, ...]`.
    - Persist updated member to disk.

### Insurance Plan Priority

- **Trigger**: None (passive).
- **Logic**: The `priority` field in JSON will be ignored by the updated interface and removed upon next save of the plan.

## Storage Schema

**`data/entities/savings-goals.json`**:

```json
[
  {
    "id": "uuid",
    "name": "Winter Tires",
    "target_amount": 80000,
    "current_amount": 20000,
    "target_date": "2026-11-01",
    "linked_account_id": "account-uuid",
    "linked_bill_ids": ["bill-uuid-1"],
    "status": "active",
    "created_at": "...",
    "updated_at": "..."
  }
]
```
