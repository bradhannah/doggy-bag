# API Changelog

All notable API changes will be documented in this file.

## [Unreleased] - 014-occurrence-only-simplify

### Breaking Changes

This release removes the Payment data structure entirely. Occurrences now represent individual payment events directly.

#### Removed Endpoints

The following endpoints have been removed as payments are no longer a separate entity:

**Bill Payment Endpoints:**

- `POST /api/months/{month}/bills/{instanceId}/occurrences/{occurrenceId}/payments` - REMOVED
- `DELETE /api/months/{month}/bills/{instanceId}/occurrences/{occurrenceId}/payments/{paymentId}` - REMOVED

**Income Payment Endpoints:**

- `POST /api/months/{month}/incomes/{instanceId}/occurrences/{occurrenceId}/payments` - REMOVED
- `DELETE /api/months/{month}/incomes/{instanceId}/occurrences/{occurrenceId}/payments/{paymentId}` - REMOVED

#### Modified Endpoints

**Close Occurrence:**

- `POST /api/months/{month}/bills/{instanceId}/occurrences/{occurrenceId}/close`
- `POST /api/months/{month}/incomes/{instanceId}/occurrences/{occurrenceId}/close`
- Added `payment_source_id` to request body

**Update Occurrence:**

- `PUT /api/months/{month}/bills/{instanceId}/occurrences/{occurrenceId}`
- `PUT /api/months/{month}/incomes/{instanceId}/occurrences/{occurrenceId}`
- Added `payment_source_id` field support

#### New Endpoints

**Split Occurrence (for partial payments):**

- `POST /api/months/{month}/bills/{instanceId}/occurrences/{occurrenceId}/split`
- `POST /api/months/{month}/incomes/{instanceId}/occurrences/{occurrenceId}/split`
- Closes original occurrence at paid amount, creates new occurrence for remainder

**Migration:**

- `POST /api/migrate/payments-to-occurrences` - One-time migration of existing payment data

### Data Model Changes

**Occurrence Interface:**

- REMOVED: `payments: Payment[]` - No longer exists
- ADDED: `payment_source_id?: string` - Which account was used for payment

**Payment Interface:**

- REMOVED entirely - No longer part of the data model

### Migration Notes

Existing payment data will be automatically migrated:

1. Occurrences with payments totaling >= expected_amount: Closed with sum of payments
2. Occurrences with partial payments: Split into closed + open occurrences
3. Occurrences with no payments: `payments` array simply removed

Run `POST /api/migrate/payments-to-occurrences` with `dry_run: true` to preview changes before applying.
