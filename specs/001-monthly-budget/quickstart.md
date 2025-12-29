# Quickstart Guide: Monthly Budget Tracker

**Feature**: [spec.md](./spec.md)
**Date**: 2025-12-29

---

## Overview

This guide helps you get started with the Monthly Budget Tracker application. By following these steps, you'll have a working local development environment and understand the codebase structure.

---

## Prerequisites

### Required Tools

**1. Rust Toolchain**
```bash
# Check if Rust is installed
rustc --version

# If not, install from https://rustup.rs/
curl --proto '=https' sh.rustup.rs | sh
source $HOME/.cargo/env
```

**2. Bun Runtime**
```bash
# Check if Bun is installed
bun --version

# If not, install from https://bun.sh/
curl -fsSL https://bun.sh/install | bash
```

**3. Node.js** (for Tauri CLI tools only)
```bash
# Check if Node.js is installed
node --version

# Install from https://nodejs.org/ if needed
```

**4. System Dependencies**

**macOS**:
```bash
# Install Xcode command line tools
xcode-select --install
```

**Windows**:
- Microsoft Visual C++ Redistributable
- WebView2 Runtime
- Tauri CLI requirements (see Tauri docs)

**Linux**:
```bash
# Install webkit2gtk4.0-dev libraries (for WebView)
sudo apt-get install libwebkit2gtk-4.0-dev
```

---

## Project Setup

### 1. Clone and Navigate

```bash
# Navigate to project directory
cd /path/to/BudgetForFun

# Checkout the feature branch
git checkout 001-monthly-budget
```

### 2. Install Dependencies

```bash
# Install Bun dependencies (backend)
bun install

# Note: Tauri and Svelte dependencies are installed automatically
```

### 3. Start Development Server

```bash
# Start all services in one command
make dev

# This will:
# - Start Bun HTTP server on localhost:3000
# - Start Vite dev server for Svelte frontend
# - Start Tauri dev mode
```

---

## Project Structure

```
BudgetForFun/
├── src-tauri/         # Rust backend for Tauri (desktop shell)
│   ├── src/
│   │   ├── main.rs        # Tauri entry point
│   │   ├── commands.rs     # Tauri command handlers
│   │   ├── models.rs       # Rust data models
│   │   └── utils.rs        # Shared Rust utilities
│   ├── Cargo.toml          # Rust dependencies
│   ├── tauri.conf.json    # Tauri configuration
│   └── icons/              # App icons for different platforms
│
├── api/                # Bun HTTP backend for IPC
│   ├── src/
│   │   ├── models/         # TypeScript data models
│   │   ├── services/       # Business logic
│   │   ├── routes/         # HTTP endpoints
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Shared utilities
│   ├── tests/
│   │   ├── contract/       # Contract tests
│   │   ├── integration/    # Integration tests
│   │   └── unit/           # Unit tests
│   ├── package.json          # Bun dependencies
│   └── server.ts            # Bun server entry point
│
├── src/                # Svelte frontend
│   ├── components/
│   │   ├── Setup/         # Setup page components
│   │   ├── Dashboard/      # Dashboard/summary view
│   │   ├── Bills/          # Bill management
│   │   ├── Incomes/        # Income management
│   │   ├── PaymentSources/ # Payment source management
│   │   ├── Expenses/       # Variable + free-flowing expenses
│   │   └── shared/         # Shared components
│   ├── stores/             # Svelte stores
│   ├── routes/             # Svelte routes
│   ├── app.html            # HTML entry point
│   ├── vite.config.ts       # Vite configuration
│   ├── tsconfig.json        # TypeScript configuration
│   └── package.json          # Frontend dependencies
│
├── data/                # Data storage (JSON files)
│   ├── entities/           # Default entities
│   └── months/             # Monthly data
│
├── tests/               # Frontend tests
│   ├── contract/           # Contract tests for Bun backend
│   ├── integration/        # Integration tests
│   └── unit/               # Unit tests
│
├── Makefile             # Build automation
└── README.md            # Project documentation
```

---

## Development Workflow

### Starting the App

```bash
# Start development server (all services)
make dev

# This launches:
# 1. Bun backend on http://localhost:3000
# 2. Vite dev server on http://localhost:5173 (auto-assigned port)
# 3. Tauri dev mode (desktop window with hot reload)
```

### Accessing the Application

1. **Tauri Window**: Desktop window opens automatically when you run `make dev`
2. **Backend API**: Access at `http://localhost:3000` (internal IPC, not exposed externally)
3. **Frontend**: Tauri window loads Svelte app at `http://localhost:5173`

### Building for Production

```bash
# Build for current platform (macOS, Windows, or Linux)
make build

# This creates a single executable:
# macOS: src-tauri/target/release/bundle/bundle/macos/Budgetforfun.app
# Windows: src-tauri/target/release/bundle/bundle/msi/Budgetforfun.exe
# Linux: src-tauri/target/release/bundle/appimage/deb/budgetforfun.deb
```

### Running Tests

```bash
# Run backend tests (Bun test runner)
bun test

# Run contract tests
bun test api/tests/contract/

# Run integration tests
bun test api/tests/integration/

# Run unit tests
bun test api/tests/unit/

# Run frontend tests (Jest)
npm test

# Run E2E tests (Playwright)
npx playwright test

# Run all tests (Makefile)
make test
```

---

## Code Style and Conventions

### TypeScript

**Type Safety**:
- All code must use TypeScript (no `any` types without justification)
- Enable strict mode in `tsconfig.json`
- Use interfaces for all public API contracts

**Naming Conventions**:
- **Interfaces**: PascalCase (e.g., `Bill`, `IncomeSource`)
- **Types**: PascalCase (e.g., `BillingPeriod`, `PaymentSourceType`)
- **Variables**: camelCase (e.g., `billId`, `amount`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_UNDO_STACK_SIZE`)

**File Organization**:
- One public export per file
- Barrel files for related exports (e.g., `models/index.ts`)
- Keep files focused on single responsibility

### Svelte

**Component Structure**:
- One concern per component (principle XX)
- Props for data input, events for data output
- Reactive declarations ($:) for derived state (principle XX)
- Use Svelte stores for cross-component state only (principle XXI)

**Naming Conventions**:
- **Components**: PascalCase (e.g., `BillList.svelte`, `BudgetForm.svelte`)
- **Props**: camelCase (e.g., `billId`, `onSave`)
- **Events**: on:camelCase (e.g., `on:click`, `on:submit`)
- **Stores**: camelCase with 'Store' suffix (e.g., `billsStore`, `uiStore`)

### Rust

**Code Style**:
- Use `cargo fmt` for formatting
- Follow Rust naming conventions:
  - **Structs**: PascalCase (e.g., `Bill`, `Income`)
  - **Fields**: snake_case (e.g., `amount`, `payment_source_id`)
  - **Functions**: snake_case (e.g., `calculate_leftover`)
- Use `cargo clippy` for linting

---

## Key Concepts

### Month Generation Flow

When a user navigates to a new month or generates one:

1. **Copy Default Bills**: All active `Bill` entities
2. **Apply Billing Periods**: Calculate instances per month:
   - Monthly: 1 instance
   - Bi-weekly: ~2.17 instances (calculate specific dates)
   - Weekly: ~4.33 instances (calculate specific dates)
   - Semi-annually: 0-2 instances depending on month
3. **Copy Default Incomes**: Similar process for income sources
4. **Create Month Data**: `MonthlyData` with:
   - Generated `BillInstance` records
   - Generated `IncomeInstance` records
   - Empty arrays for `VariableExpense` and `FreeFlowingExpense`
   - Empty `bank_balances` map (user fills in)
5. **Save Month File**: Write to `data/months/YYYY-MM.json`

### Flexible Editing

Users can edit any value in a month instance:

- **Bill Instance Amount**: Change for this month only, doesn't affect default `Bill` definition
- **Income Instance Amount**: Change for this month only, doesn't affect default `Income` definition
- **Customization Tracking**: `is_default: false` flag marks deviations from defaults

When generating future months:
- Use original default definitions (not modified instances)
- Users can optionally adopt new default values (not automatic)

### Undo Stack Implementation

Every change triggers undo entry creation:

1. **User Action**: Add bill, edit amount, delete income, etc.
2. **Capture State**: Save old value and new value
3. **Push to Stack**: Add `UndoEntry` to top of stack (max 5)
4. **If Stack Full**: Remove oldest entry (pop) before pushing new
5. **Undo Action**: Pop most recent entry, revert entity to old value

### Multi-Payment Source "Leftover" Calculation

Formula from FR-006:

```
Leftover = (sum of all bank balances + cash) - (sum of all credit card debt) + total income - total expenses
```

**Example**:
- Bank accounts: Scotia ($3,000), Checking ($2,000) → sum = $5,000
- Credit cards: Visa (-$1,500 debt) → sum = -$1,500
- Cash on hand: $500
- Total cash/net worth = $5,000 - $1,500 + $500 = $4,000
- If income = $5,000 and expenses = $2,000
- Leftover = $4,000 + $5,000 - $2,000 = $7,000

---

## Data Persistence

### File Locations

**Default Entities**:
```text
data/entities/bills.json           # Default bill definitions (templates)
data/entities/incomes.json         # Default income definitions (templates)
data/entities/payment-sources.json # Payment source configurations
data/entities/categories.json       # Bill categories
```

**Monthly Data**:
```text
data/months/2025-01.json      # January 2025 budget
data/months/2025-02.json      # February 2025 budget
data/months/2025-03.json      # March 2025 budget
# ... one file per month
```

### Auto-Save Behavior

Every change triggers auto-save to appropriate file:

- **Entity Changes**: Update default entity files (bills.json, incomes.json, etc.)
- **Instance Changes**: Update monthly data file (data/months/YYYY-MM.json)
- **Bank Balance Updates**: Update monthly data file
- **Undo Operations**: Update monthly data file (revert entity instance)

### Backup and Restore

**Export**: User-triggered export of all data to single JSON file
- Includes: All default entities, all monthly data, categories
- User saves to their cloud drive (Google Drive, iCloud, Dropbox)

**Import**: User selects backup file, line-by-line restore:
- Parse JSON file
- Display entities in selectable list
- User selects which entities to restore
- Merge with existing data (or overwrite)
- Validates restored data before applying

---

## Common Tasks

### Adding a New Bill

1. Navigate to "Setup" or "Bills" page
2. Click "Add Bill" button
3. Fill in form:
   - Name (required): "Rent"
   - Amount (required): "1500" ($15.00)
   - Billing Period (required): Select from dropdown (Monthly, Bi-weekly, Weekly)
   - Payment Source (required): Select from dropdown (Scotia Checking, Visa, Cash)
   - Category (optional): Select from dropdown (Home, Debt, Streaming, etc.)
4. Click "Save"
5. Bill appears in list and is saved to `data/entities/bills.json`

### Adding a Variable Expense

1. Navigate to current month (e.g., January 2025)
2. Click "Add Expense" button
3. Fill in form:
   - Name (required): "Groceries"
   - Amount (required): "600" ($6.00)
   - Payment Source (required): Select from dropdown
4. Click "Save"
5. Expense appears in list and is saved to `data/months/2025-01.json`

### Viewing "Leftover" Calculation

1. Navigate to current month
2. Top of page displays summary:
   ```
   ┌─────────────────────────────────┐
   │  Leftover at End of Month:    │
   │         $7,000                │
   └─────────────────────────────────┘
   ```
3. Below shows breakdown:
   - Income: $5,000
   - Bills: $2,000
   - Variable Expenses: $500
   - Free-Flowing Expenses: $500
   - Bank Balances:
     - Scotia Checking: $3,000
     - Visa: -$1,500
     - Cash: $500
   - Total Cash/Net Worth: $4,000
   - Calculation: $4,000 + $5,000 - $3,000 = $6,000

### Undoing a Change

1. Make any change (edit bill amount, add expense, etc.)
2. Change appears immediately
3. Click "Undo" button (or Cmd+Z/Ctrl+Z)
4. Most recent change is reverted
5. Undo button disabled when no changes to undo

### Generating a New Month

1. Click "Next Month" or use month selector
2. New month opens with data generated from defaults
3. Review generated bills/incomes
4. Make changes as needed (edit amounts, add expenses, etc.)
5. Changes are saved to new month's file (data/months/YYYY-MM.json)
6. Previous month's data remains unchanged

---

## Troubleshooting

### Port Already in Use

```bash
# If error: Address already in use
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Restart dev server
make dev
```

### Tauri Build Issues

```bash
# Clean build artifacts
make clean

# Try building again
make build
```

### Data File Errors

**Corrupt JSON**: App will show error and offer restore from backup
- User manually restores from backup file using line-by-line restore

**Missing Entity Files**: App creates default empty files on first run
- No manual intervention required

---

## Next Steps

After completing this quickstart:

1. **Read the contracts** in `specs/001-monthly-budget/contracts/` directory
   - `setup-page-contract.md`: Setup page UI structure
   - `dashboard-contract.md`: Summary view layout
   - `bills-contract.md`: Bill management UI
   - And other contract files for each major component

2. **Review data model**: `data-model.md` for entity relationships

3. **Start implementation**:
   ```bash
   # Generate tasks from spec
   /speckit.tasks

   # Implement first user story (Setup/Onboarding)
   ```
