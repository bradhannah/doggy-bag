# Feature Specification: Miscellaneous Fixes Round 4

**Feature Branch**: `012-misc-fixes`  
**Created**: 2026-01-11  
**Status**: Draft  
**Input**: User description: "a hodge podge of fixes, features and improvements"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Insurance Claims Tracking (Priority: P1)

As a user with multiple health insurance plans, I want to track my insurance claim submissions across both plans so I can manage the claim lifecycle from initial submission through final reimbursement.

**Why this priority**: This is a significant new feature that addresses a real pain point - tracking claims across multiple insurance providers with proper documentation.

**Independent Test**: Can be fully tested by creating insurance plans, submitting a claim with documents, and tracking through approval. Delivers complete insurance claims management.

**Acceptance Scenarios**:

1. **Given** I have configured two insurance plans with priority order, **When** I create a new claim with a receipt, **Then** I can submit to Plan A first and Plan B second
2. **Given** a claim is submitted to Plan A, **When** I receive the EOB and upload it, **Then** I can submit the remainder to Plan B with the EOB attached
3. **Given** all submissions have final answers (approved/denied/partial), **When** viewing the claim, **Then** the claim status auto-updates to "Closed"

---

### User Story 2 - Savings Page Redesign (Priority: P2)

As a user tracking savings accounts, I want to see my expected monthly contribution alongside start/end balances so I can plan my savings strategy and see estimated end-of-month totals.

**Why this priority**: Enhances existing functionality with valuable planning capabilities and removes friction (auto-save).

**Independent Test**: Can be fully tested by navigating to Savings, entering contribution values, and verifying Est. EOM calculations.

**Acceptance Scenarios**:

1. **Given** I am on the Savings page, **When** I enter a contribution amount, **Then** the Est. EOM updates automatically (Start + Contribution)
2. **Given** I edit any field, **When** I click away, **Then** the value is saved automatically (no Save button needed)
3. **Given** the previous month has a Final value, **When** a new month is created, **Then** the new month's Start auto-populates from previous Final

---

### User Story 3 - Unsaved Changes Confirmation (Priority: P2)

As a user editing a bill, income, or other entity, I want to be warned when I click away with unsaved changes so I don't accidentally lose my work.

**Why this priority**: Prevents frustrating data loss across all edit drawers.

**Independent Test**: Can be fully tested by opening any edit drawer, making changes, clicking the backdrop, and verifying the confirmation modal appears.

**Acceptance Scenarios**:

1. **Given** I have made changes in an edit drawer, **When** I click the backdrop, **Then** a modal asks "Save", "Discard", or "Cancel"
2. **Given** I have NOT made changes in an edit drawer, **When** I click the backdrop, **Then** the drawer closes immediately (no modal)
3. **Given** the confirmation modal is shown, **When** I click "Save", **Then** changes are saved and drawer closes

---

### User Story 4 - Auto/Manual Pills in Manage Lists (Priority: P3)

As a user managing bills and incomes, I want to see Auto/Manual payment method indicators in the list views so I can quickly identify how each item is paid.

**Why this priority**: Improves visibility of payment method across the app.

**Independent Test**: Can be fully tested by viewing Manage > Bills and Manage > Incomes and verifying pills display.

**Acceptance Scenarios**:

1. **Given** I am viewing Manage > Bills, **When** a bill has payment_method = 'auto', **Then** a green "auto" pill is displayed
2. **Given** I am viewing Manage > Incomes, **When** an income has payment_method = 'manual', **Then** a yellow "manual" pill is displayed
3. **Given** an existing income without payment_method, **When** the app loads, **Then** it defaults to 'auto'

---

### User Story 5 - Allow $0 Amounts (Priority: P3)

As a user, I want to create bills and incomes with $0 amounts so I can use them as placeholders or track months with no cost.

**Why this priority**: Removes unnecessary restriction that blocks valid use cases.

**Independent Test**: Can be fully tested by creating a bill with $0 amount and verifying it saves successfully.

**Acceptance Scenarios**:

1. **Given** I am creating a new bill, **When** I enter $0.00 as the amount, **Then** the bill saves successfully
2. **Given** I am editing an income inline, **When** I change the amount to $0.00, **Then** the change saves without error

---

### User Story 6 - Hide System Categories (Priority: P3)

As a user managing bills and incomes, I want system categories (Uncategorized, Credit Card Payoffs) hidden from the Manage panels so I only see user-relevant categories.

**Why this priority**: Reduces clutter and confusion in Manage views.

**Independent Test**: Can be fully tested by viewing Manage > Bills and verifying Uncategorized and Credit Card Payoffs sections are not shown.

**Acceptance Scenarios**:

1. **Given** I am viewing Manage > Bills, **When** the page loads, **Then** "Uncategorized" and "Credit Card Payoffs" sections are not displayed
2. **Given** I am viewing Manage > Incomes, **When** the page loads, **Then** "Uncategorized" section is not displayed
3. **Given** I am creating a new bill, **When** I try to save without a category, **Then** validation requires a category

---

### User Story 7 - Fix Version Reporting (Priority: P3)

As a user, I want to see the correct app version in the UI so I know which version I'm running.

**Why this priority**: Bug fix that affects user trust and debugging.

**Independent Test**: Can be fully tested by checking Settings > About and verifying version matches tauri.conf.json.

**Acceptance Scenarios**:

1. **Given** the app is running, **When** I view Settings > About, **Then** the version matches src-tauri/tauri.conf.json
2. **Given** tauri.conf.json is updated, **When** the app rebuilds, **Then** the version is read dynamically (no hardcoded fallback)

---

### User Story 8 - Backup Notes (Priority: P3)

As a developer/user creating manual backups, I want to add a brief note so I can remember why I created the backup.

**Why this priority**: Improves backup management and context.

**Independent Test**: Can be fully tested by clicking Backup Now, entering a note, and verifying it appears in the backup list.

**Acceptance Scenarios**:

1. **Given** I click "Backup Now", **When** the modal appears, **Then** I can enter an optional note (max 100 characters)
2. **Given** a backup has a note, **When** viewing the backup list, **Then** a note icon indicates the note exists
3. **Given** I hover/click the note icon, **Then** the note content is displayed

---

### User Story 9 - Investment Account Type (Priority: P3)

As a user managing payment sources, I want "Investment Account" as a proper account type so it appears alongside Bank Account, Credit Card, etc.

**Why this priority**: Improves data model consistency and user experience.

**Independent Test**: Can be fully tested by creating a new payment source and selecting "Investment Account" from the type dropdown.

**Acceptance Scenarios**:

1. **Given** I am creating a payment source, **When** I view the Type dropdown, **Then** "Investment Account" appears with icon
2. **Given** I select "Investment Account" type, **When** the form updates, **Then** Savings/Investment checkboxes are hidden (type implies investment)
3. **Given** existing accounts with type=bank_account + is_investment=true, **When** the app loads, **Then** they are migrated to type=investment

---

### User Story 10 - Variable Rate Disables Interest Rate (Priority: P3)

As a user managing payment sources, I want the Interest Rate field disabled when Variable Rate is checked since variable rates change and a specific value is meaningless.

**Why this priority**: Improves data integrity and user guidance.

**Independent Test**: Can be fully tested by checking Variable Rate and verifying Interest Rate becomes disabled.

**Acceptance Scenarios**:

1. **Given** I am editing a payment source, **When** I check "Variable Rate", **Then** the Interest Rate field becomes disabled (grayed out)
2. **Given** Variable Rate is checked, **When** saving, **Then** no interest_rate value is stored
3. **Given** existing records with is_variable_rate=true AND interest_rate set, **When** the app loads, **Then** interest_rate is cleared (migration)

---

### Edge Cases

- What happens when a user tries to close a drawer with unsaved changes but the save fails? (Show error, keep drawer open)
- How does the system handle claims with no submissions yet? (Status = Draft)
- What if a user deletes an insurance plan that has existing claims? (Plan snapshot preserved in claims)
- How are $0 bills/incomes displayed in totals? (Included in counts, contribute $0 to sums)

## Requirements _(mandatory)_

### Functional Requirements

**Task 1: Auto/Manual Pills**

- **FR-001**: System MUST display Auto/Manual pill in Manage > Bills list based on payment_method
- **FR-002**: System MUST add payment_method field to Income entity (default: 'auto')
- **FR-003**: System MUST display Auto/Manual pill in Manage > Incomes list

**Task 2: Unsaved Changes Confirmation**

- **FR-004**: System MUST track dirty state for all edit drawers (BillForm, IncomeForm, PaymentSourceForm, CategoryForm, AdHocForm)
- **FR-005**: System MUST show confirmation modal when backdrop is clicked with unsaved changes
- **FR-006**: Confirmation modal MUST offer Save, Discard, and Cancel options

**Task 3: Allow $0 Amounts**

- **FR-007**: System MUST allow $0 amounts for bills in all creation/editing locations
- **FR-008**: System MUST allow $0 amounts for incomes in all creation/editing locations
- **FR-009**: System MUST continue requiring >$0 for payments and transactions

**Task 4: Hide System Categories**

- **FR-010**: System MUST hide "Uncategorized" section from Manage > Bills
- **FR-011**: System MUST hide "Credit Card Payoffs" section from Manage > Bills
- **FR-012**: System MUST hide "Uncategorized" section from Manage > Incomes
- **FR-013**: System MUST require category selection when creating/editing bills and incomes

**Task 5: Savings Page Redesign**

- **FR-014**: System MUST display columns: Account, Start of Month, Contribution, Est. EOM, Final
- **FR-015**: System MUST calculate Est. EOM as Start + Contribution
- **FR-016**: System MUST auto-save after every field edit (no Save button)
- **FR-017**: System MUST display Contribution in green (positive) or red (negative)
- **FR-018**: System MUST auto-copy previous month's Final to new month's Start during month creation

**Task 6: Version Reporting Fix**

- **FR-019**: System MUST read version dynamically from tauri.conf.json
- **FR-020**: System MUST update version in: Cargo.toml, package.json, api/package.json to 0.3.0
- **FR-021**: System MUST update homebrew-release skill with all version locations

**Task 7: Backup Notes**

- **FR-022**: System MUST show modal before creating backup to collect optional note
- **FR-023**: System MUST store note in backup file (max 100 characters)
- **FR-024**: System MUST display note icon in backup list when note exists
- **FR-025**: System MUST show note content on icon hover/click

**Task 8: Investment Account Type**

- **FR-026**: System MUST add 'investment' to PaymentSourceType enum
- **FR-027**: System MUST display "Investment Account" with icon in type dropdown
- **FR-028**: System MUST auto-set is_investment=true when type=investment
- **FR-029**: System MUST migrate existing bank_account+is_investment records to type=investment
- **FR-030**: System MUST add TODO comment for future cleanup of is_investment boolean

**Task 9: Variable Rate Disables Interest Rate**

- **FR-031**: System MUST disable Interest Rate field when Variable Rate is checked
- **FR-032**: System MUST NOT store interest_rate when is_variable_rate=true
- **FR-033**: System MUST clear interest_rate for existing records where is_variable_rate=true (migration)
- **FR-034**: System MUST add TODO comment for future cleanup of migration

**Task 10: Insurance Claims Feature**

- **FR-035**: System MUST add "Insurance Claims" to main navigation
- **FR-036**: System MUST add "Insurance Plans" tab to Manage
- **FR-037**: System MUST add "Insurance Categories" tab to Manage
- **FR-038**: System MUST allow creating/editing insurance plans with priority order
- **FR-039**: System MUST allow creating claims with category, provider, service date, amount
- **FR-040**: System MUST allow uploading documents to claims (receipts, EOBs)
- **FR-041**: System MUST store documents in documents/insurance/receipts/ with sortable filenames
- **FR-042**: System MUST allow creating submissions linked to plans with status tracking
- **FR-043**: System MUST snapshot plan details at submission time
- **FR-044**: System MUST auto-calculate claim status based on submission statuses
- **FR-045**: System MUST display summary stats (pending count/amount, closed count/reimbursed)
- **FR-046**: System MUST provide filters: Open/Closed/All, Category, Year

### Key Entities

**InsurancePlan**: Represents an insurance provider/policy. Key attributes: name, provider_name, policy_number, member_id, owner, priority, portal_url, is_active.

**InsuranceCategory**: Predefined claim types (Dental, Vision, Massage, etc.). Key attributes: name, icon, sort_order, is_predefined.

**InsuranceClaim**: An expense/incident with documents and submissions. Key attributes: claim_number (auto-increment int), category, provider_name, service_date, total_amount, status (auto-calculated), documents[], submissions[].

**ClaimDocument**: Document attached to a claim. Key attributes: filename (sortable), original_filename, document_type (receipt/eob/other), related_plan_id.

**ClaimSubmission**: A submission to one insurance plan. Key attributes: plan_snapshot, plan_id, status (draft/pending/approved/denied/partial), amount_claimed, amount_reimbursed, date_submitted, date_resolved, documents_sent[], eob_document_id.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create and track insurance claims through the full lifecycle in under 5 minutes per claim
- **SC-002**: Unsaved changes confirmation prevents 100% of accidental data loss when clicking backdrop
- **SC-003**: Savings page updates save within 1 second of field change (no manual save required)
- **SC-004**: All version displays match tauri.conf.json without manual intervention
- **SC-005**: Users can identify Auto/Manual payment method at a glance in Manage lists
- **SC-006**: $0 bills/incomes can be created and edited without validation errors
- **SC-007**: System categories are not visible in Manage panels
- **SC-008**: Backup notes are visible and retrievable from backup list
- **SC-009**: Investment accounts use dedicated type (no checkbox workaround needed)
- **SC-010**: Variable rate accounts have no stale interest rate values stored
