# Doggy Bag

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

![Doggy Bag Detailed View](docs/assets/BudgetForFunExample-Dec-2025.png)

Desktop budgeting app focused on fixed monthly costs. Answers one question: **"How much do I have left at end of month?"**

## What It Does

- Track recurring bills with different billing periods (monthly, bi-weekly, weekly, semi-annual)
- Manage multiple payment sources (bank accounts, credit cards, cash)
- Calculate leftover from actual bank balances + income - expenses
- Month-by-month isolation—each month is its own snapshot

## Features

- Category-organized bill view with colored headers
- Partial payment tracking for bills paid incrementally
- Due dates with overdue indicators
- Ad-hoc expenses for unexpected costs
- Undo (last 5 changes)
- Export/import for manual backup
- Configurable data directory
- Dark mode

## Screenshot

_Detailed view of the Budget Details pane showing bills grouped by category with Expected/Actual columns, partial payments, and monthly summary._

## Installation

**Download Binary (macOS ARM)**

Grab the latest `.dmg` from [GitHub Releases](https://github.com/bradhannah/DoggyBag/releases).

Windows and Linux builds coming.

**Build from Source**

```bash
make install-prereqs   # Check Rust, Bun, Node
make install-all       # Install dependencies
make build             # Build Tauri app
```

Requires: Rust, Bun 1.x, Node.js (optional)

## Tech Stack

- **Desktop**: Tauri 2.x (Rust)
- **Frontend**: Svelte 5 / SvelteKit
- **Backend**: Bun (compiled sidecar)
- **Language**: TypeScript (strict mode)
- **Data**: Local JSON files
