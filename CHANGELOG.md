# Changelog

All notable changes to Doggy Bag will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Move to next month** on any open bill or income payment (row menu). The next month gets an ad-hoc copy named after the source month, e.g. "Rent (Oct)". An ad-hoc payment is removed from its month; a recurring one is recorded as skipped ($0) with a "Moved to …" note. This is the one change a locked month allows, so unfinished items can be carried out of a closed month.

### Removed

- The **Goals** feature. Goals were a layer on top of recurring savings bills; the Savings page already shows each account's planned and recorded transfers. On first start the app backs up your data (into `backups/` in the data folder) and converts goal contribution schedules into ordinary savings plans: a schedule is linked to the goal's account when that account is a savings or investment account (a goal "linked" to a chequing account becomes a plain bill in the Savings category), schedules of goals that were paused, bought or abandoned are deactivated, and the "Savings" category becomes a plain bill category. Use **Plan a transfer** on the Savings page to link a plan to an account. The old "unlinked" legacy savings amounts are no longer shown.

### Changed

- The Budget page's **Review budget updates** and **Refresh bill and income details** buttons are gone, along with the review flow. A new recurring bill, income or savings plan is added to the month you are viewing straight away (if it exists and is unlocked); editing an existing recurring item never changes existing months. Bank transaction name, URL and notes are now read live from Manage.
- Insurance reimbursements still on their way (submitted, or approved but unpaid) no longer sit in a locked month. They appear in the earliest unlocked month, dated the 1st, as expected income: a submitted claim shows the amount claimed instead of $0. Locking a month carries its open reimbursements forward; its frozen snapshot keeps only the bill and settled lines. Submitted claims no longer appear on the calendar until the insurer decides.

### Fixed

- Reading a month twice in one request (for example the Budget page's leftover calculation) stripped the insurance lines from the first result and rewrote the month file on every load.

## [0.13.1] - 2026-10-17

### Added

- Linked Savings and Budget transfer planning, with recurring and month-only contributions and withdrawals.
- Selective review of new recurring entries and changed amounts/dates, with explicit monthly-override choices and version-scoped keep decisions.
- Goal pause/resume/completion behaviour that manages future contributions while retaining recorded history.

### Improved

- Responsive Budget and Savings layouts, clearer payment/receipt actions, keyboard focus handling, and balance snapshot timestamps.
- Legacy Savings reconciliation, historical source snapshots, month-lock protections, and complete backup/restore including uploaded documents.

### Fixed

- Payment amount/date persistence, partial-payment handling, projection discrepancies, and stale month responses.
- Concurrent data operations and corrupt-data handling with atomic individual-file replacement.
- Release packaging dependency mismatch by pinning Tauri JavaScript packages to their locked Rust counterparts. The unpublished v0.13.0 build was superseded by this release.

## [0.1.0] - 2026-01-04

### Added

- Initial release of Doggy Bag
- Monthly budget dashboard with income, bills, and expenses tracking
- Detailed monthly view with day-by-day breakdown
- Payment sources management (checking, credit cards, cash)
- Bills management with recurring billing periods (weekly, bi-weekly, monthly, semi-annually, annually)
- Income tracking with recurring periods
- Categories for expense organization
- Leftover calculation showing money remaining at end of month
- Undo functionality (5-level undo stack)
- Backup and restore (JSON export/import)
- Configurable data storage directory
- Settings page with appearance options
- Dark theme (default)
- Sidebar navigation with collapse/expand
- Zoom controls (Ctrl+/-, Ctrl+0)
- Tauri desktop application for macOS (ARM64)
- Bun-powered backend sidecar

### Technical

- Svelte 5 frontend with TypeScript
- Bun HTTP API backend
- Tauri 2.x desktop wrapper
- tsoa-generated OpenAPI spec
- Type-safe API client
- 600+ automated tests (frontend + backend)
- GitHub Actions CI/CD workflows
- ESLint + Prettier code formatting
- Vitest test framework with coverage

[Unreleased]: https://github.com/bradhannah/DoggyBag/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/bradhannah/DoggyBag/releases/tag/v0.1.0
