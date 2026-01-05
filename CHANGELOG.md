# Changelog

All notable changes to BudgetForFun will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-01-04

### Added

- Initial release of BudgetForFun
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

[Unreleased]: https://github.com/bradhannah/BudgetForFun/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/bradhannah/BudgetForFun/releases/tag/v0.1.0
