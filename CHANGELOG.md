# Changelog

All notable changes to Doggy Bag will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
