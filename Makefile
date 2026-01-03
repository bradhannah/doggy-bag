# BudgetForFun Makefile
# Makefile-based build automation for Tauri + Bun + Svelte development workflow

.PHONY: help dev build clean test lint format types smoke-test install-prereqs install-dev install-all kill-dev logs-clear logs-tail

# Log directory
LOGS_DIR := logs

# Default target
help: ## Show this help message
	@echo "BudgetForFun Makefile - Build Automation"
	@echo ""
	@echo "Development Targets:"
	@echo "  make dev        Start all services (Tauri + Bun + Vite) with logging"
	@echo "  make logs-tail  Tail all log files in real-time"
	@echo "  make logs-clear Clear all log files"
	@echo ""
	@echo "Build Targets:"
	@echo "  make build     Build Tauri application"
	@echo "  make clean     Remove build artifacts"
	@echo "  make types     Generate OpenAPI spec and Svelte types"
	@echo ""
	@echo "Installation Targets:"
	@echo "  make install-prereqs  Check and install prerequisites (Bun, Rust, Node.js, TypeScript)"
	@echo "  make install-dev      Install all development dependencies"
	@echo "  make install-all      Install all dependencies (Bun + npm)"
	@echo ""
	@echo "Testing Targets:"
	@echo "  make test      Run all tests (Bun + Jest + Playwright)"
	@echo "  make test-backend   Run backend tests (Bun)"
	@echo "  make test-frontend  Run frontend tests (Jest)"
	@echo "  make test-e2e      Run E2E tests (Playwright)"
	@echo "  make smoke-test Validate build system integration"
	@echo ""
	@echo "Utility Targets:"
	@echo "  make kill-dev   Terminate stray development processes"
	@echo ""
	@echo "Quality Targets:"
	@echo "  make lint      Run ESLint checks"
	@echo "  make format    Format all files with Prettier"
	@echo ""
	@echo "Logs:"
	@echo "  API log:      $(LOGS_DIR)/api.log"
	@echo "  Frontend log: $(LOGS_DIR)/frontend.log"
	@echo "  Tauri log:    $(LOGS_DIR)/tauri.log"

# Utility
kill-dev: ## Terminate stray development processes (Bun, Vite, Node)
	@echo "Terminating stray development processes..."
	@lsof -ti:1420 | xargs kill -9 2>/dev/null || echo "No Vite process on port 1420"
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "No Bun process on port 3000"
	@pkill -f "vite dev" 2>/dev/null || echo "No Vite processes"
	@pkill -f "bun.*server.ts" 2>/dev/null || echo "No Bun server processes"
	@pkill -f "tauri dev" 2>/dev/null || echo "No Tauri processes"
	@echo "✓ All stray processes terminated"

logs-clear: ## Clear all log files
	@echo "Clearing log files..."
	@mkdir -p $(LOGS_DIR)
	@> $(LOGS_DIR)/api.log
	@> $(LOGS_DIR)/frontend.log
	@> $(LOGS_DIR)/tauri.log
	@echo "✓ Log files cleared"

logs-tail: ## Tail all log files in real-time
	@echo "Tailing log files (Ctrl+C to stop)..."
	@tail -f $(LOGS_DIR)/api.log $(LOGS_DIR)/frontend.log $(LOGS_DIR)/tauri.log

# Installation
install-prereqs: ## Check and install all prerequisites (Bun, Rust, Node.js, TypeScript)
	@echo "Checking prerequisites..."
	@echo ""
	@$(MAKE) check-rust
	@$(MAKE) check-node
	@$(MAKE) check-bun
	@$(MAKE) check-typescript
	@echo ""
	@echo "✓ All prerequisites checked"

check-rust: ## Check if Rust is installed
	@echo "Checking Rust..."
	@if command -v rustc >/dev/null 2>&1 && command -v cargo >/dev/null 2>&1; then \
		echo "✓ Rust is installed"; \
	else \
		echo "✗ Rust is NOT installed"; \
		echo ""; \
		echo "To install Rust, run:"; \
		echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"; \
		echo ""; \
		echo "After installation, restart your terminal and run: source ~/.cargo/env"; \
	fi

check-node: ## Check if Node.js is installed (optional - Bun can be used instead)
	@echo "Checking Node.js..."
	@if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then \
		echo "✓ Node.js ($(shell node --version 2>/dev/null || echo 'N/A')) and npm ($(shell npm --version 2>/dev/null || echo 'N/A')) are installed"; \
	else \
		echo "⚠ Node.js is not installed (optional - Bun is the primary runtime)"; \
	fi

check-bun: ## Check if Bun is installed
	@echo "Checking Bun..."
	@if command -v bun >/dev/null 2>&1; then \
		echo "✓ Bun ($(shell bun --version)) is installed"; \
	else \
		echo "Installing Bun via official script..."; \
		curl -fsSL https://bun.sh/install | bash; \
		echo ""; \
		echo "✓ Bun installation complete"; \
		echo ""; \
		echo "IMPORTANT: Please close and reopen your terminal to use Bun"; \
		echo "Alternatively, refresh your shell: exec $$SHELL"; \
	fi

check-typescript: ## Check if TypeScript is installed (optional - uses local tsc from node_modules)
	@echo "Checking TypeScript..."
	@if command -v tsc >/dev/null 2>&1; then \
		echo "✓ TypeScript ($(shell tsc --version 2>/dev/null || echo 'N/A')) is installed globally"; \
	else \
		echo "⚠ TypeScript is not installed globally (will use local node_modules version)"; \
	fi

# Development
dev: ## Start all services (Tauri + Bun + Vite) with logging
	@$(MAKE) check-prereqs
	@$(MAKE) logs-clear
	@echo "Starting Bun backend server in background (logging to $(LOGS_DIR)/api.log)..."
	@$(MAKE) start-bun 2>&1 | tee -a $(LOGS_DIR)/api.log &
	@sleep 2
	@echo "Starting Tauri (which will start Vite)..."
	@echo "Frontend logs: $(LOGS_DIR)/frontend.log"
	@echo "Tauri logs: $(LOGS_DIR)/tauri.log"
	@echo ""
	@echo "TIP: Run 'make logs-tail' in another terminal to watch all logs"
	@echo ""
	@bun run tauri dev 2>&1 | tee -a $(LOGS_DIR)/tauri.log
	@wait

start-bun: ## Start Bun backend server on localhost:3000
	@echo "[$(shell date '+%Y-%m-%d %H:%M:%S')] Starting Bun backend server on localhost:3000..."
	@cd api && DATA_DIR=../data bun run server.ts

start-vite: ## Start Vite dev server
	@echo "Starting Vite dev server..."
	@bun run dev

check-prereqs: ## Quick check that all prerequisites are installed
	@echo "Checking prerequisites..."
	@command -v rustc >/dev/null 2>&1 || (echo "ERROR: Rust is not installed. Run 'make install-prereqs'." && exit 1)
	@command -v cargo >/dev/null 2>&1 || (echo "ERROR: Cargo is not installed. Run 'make install-prereqs'." && exit 1)
	@command -v bun >/dev/null 2>&1 || (echo "ERROR: Bun is not installed. Run 'make install-prereqs'." && exit 1)
	@echo "✓ All prerequisites installed"

# Build
build: ## Build Tauri application for current platform
	@$(MAKE) check-prereqs
	@$(MAKE) build-sidecar
	@echo "Building Tauri application..."
	@bun run tauri build

build-sidecar: ## Build the standalone Bun sidecar executable
	@echo "Building standalone sidecar executable..."
	@cd api && bun build --compile --outfile ../src-tauri/binaries/bun-sidecar-aarch64-apple-darwin ./server.ts
	@echo "✓ Sidecar built: src-tauri/binaries/bun-sidecar-aarch64-apple-darwin"

# Clean
clean: ## Remove build artifacts and temporary files
	@echo "Removing build artifacts..."
	@rm -rf src-tauri/target
	@rm -rf dist
	@rm -rf node_modules/.vite
	@find . -type d -name ".svelte-kit" -exec rm -rf {} \;
	@echo "Clean complete"

# Type generation
types: ## Generate OpenAPI spec and Svelte types
	@$(MAKE) check-prereqs
	@echo "Generating OpenAPI spec from backend types..."
	@cd api && bun run src/scripts/generate-openapi.ts
	@echo "Generating Svelte types from OpenAPI spec..."
	@bun run src/scripts/generate-types.ts
	@echo "✓ Type generation complete"

# Testing
test: ## Run all tests (Bun backend + Jest frontend + Playwright E2E)
	@echo "Running all test suites..."
	@make test-backend
	@make test-frontend
	@make test-e2e
	@echo "All tests complete"

test-backend: ## Run backend tests with Bun test runner
	@echo "Running backend tests (Bun)..."
	@cd api && bun test

test-frontend: ## Run frontend tests with Jest
	@echo "Running frontend tests (Jest)..."
	@bun test

test-e2e: ## Run E2E tests with Playwright
	@echo "Running E2E tests (Playwright)..."
	@cd src && bunx playwright test

# Quality
lint: ## Run ESLint checks
	@echo "Running ESLint..."
	@make lint-backend
	@make lint-frontend

lint-backend: ## Lint backend TypeScript
	@echo "Linting backend (api/)..."
	@cd api && bunx eslint src/ --ext .ts,.tsx

lint-frontend: ## Lint frontend TypeScript and Svelte
	@echo "Linting frontend (src/)..."
	@bunx eslint src/ --ext .ts,.tsx,.svelte

format: ## Format all files with Prettier
	@echo "Formatting files..."
	@bunx prettier --write "**/*.{ts,tsx,svelte,json,md}"
	@echo "Format complete"

# Smoke test (build system validation)
smoke-test: ## Validate Bun, Svelte, and Tauri integration
	@echo "Running smoke test script..."
	@./scripts/smoke-test.sh

# Installation
install-dev: ## Install all development dependencies
	@echo "Installing development dependencies..."
	@make install-bun
	@make install-npm
	@echo "Development dependencies installed"

install-all: ## Install all dependencies (same as install-dev)
	@$(MAKE) install-dev

install-bun: ## Install Bun backend dependencies
	@echo "Installing Bun dependencies (api/)..."
	@cd api && bun install

install-npm: ## Install npm dependencies (frontend, Tauri, tools) using Bun
	@echo "Installing npm dependencies with Bun..."
	@bun install
