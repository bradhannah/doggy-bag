# BudgetForFun Makefile
# Makefile-based build automation for Tauri + Bun + Svelte development workflow

.PHONY: help dev build clean test lint format types smoke-test install-prereqs install-dev install-all

# Default target
help: ## Show this help message
	@echo "BudgetForFun Makefile - Build Automation"
	@echo ""
	@echo "Development Targets:"
	@echo "  make dev       Start all services (Tauri + Bun + Vite)"
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
	@echo "Quality Targets:"
	@echo "  make lint      Run ESLint checks"
	@echo "  make format    Format all files with Prettier"

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

check-node: ## Check if Node.js is installed
	@echo "Checking Node.js..."
	@if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then \
		echo "✓ Node.js ($(shell node --version)) and npm ($(shell npm --version)) are installed"; \
	else \
		echo "✗ Node.js is NOT installed"; \
		echo ""; \
		echo "To install Node.js, visit: https://nodejs.org/"; \
		echo "Or use nvm: https://github.com/nvm-sh/nvm"; \
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

check-typescript: ## Check if TypeScript is installed
	@echo "Checking TypeScript..."
	@if command -v tsc >/dev/null 2>&1; then \
		echo "✓ TypeScript ($(shell tsc --version)) is installed"; \
	else \
		echo "✗ TypeScript is NOT installed globally"; \
		echo ""; \
		echo "To install TypeScript globally, run:"; \
		echo "  npm install -g typescript"; \
	fi

# Development
dev: ## Start all services (Tauri + Bun + Vite)
	@$(MAKE) check-prereqs
	@echo "Starting Bun backend server in background..."
	@$(MAKE) start-bun &
	@sleep 2
	@echo "Starting Tauri (which will start Vite)..."
	@npm run tauri dev
	@wait

start-bun: ## Start Bun backend server on localhost:3000
	@echo "Starting Bun backend server on localhost:3000..."
	@cd api && bun run server.ts

start-vite: ## Start Vite dev server
	@echo "Starting Vite dev server..."
	@npm run dev

check-prereqs: ## Quick check that all prerequisites are installed
	@echo "Checking prerequisites..."
	@command -v rustc >/dev/null 2>&1 || (echo "ERROR: Rust is not installed. Run 'make install-prereqs'." && exit 1)
	@command -v cargo >/dev/null 2>&1 || (echo "ERROR: Cargo is not installed. Run 'make install-prereqs'." && exit 1)
	@command -v node >/dev/null 2>&1 || (echo "ERROR: Node.js is not installed. Run 'make install-prereqs'." && exit 1)
	@command -v bun >/dev/null 2>&1 || (echo "ERROR: Bun is not installed. Run 'make install-prereqs'." && exit 1)
	@command -v tsc >/dev/null 2>&1 || (echo "ERROR: TypeScript is not installed. Run 'npm install -g typescript'." && exit 1)
	@echo "✓ All prerequisites installed"

# Build
build: ## Build Tauri application for current platform
	@$(MAKE) check-prereqs
	@echo "Building Tauri application..."
	@npm run build

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
	@cd api && bun run scripts/generate-openapi.ts
	@echo "Generating Svelte types from OpenAPI spec..."
	@cd src && bun run scripts/generate-types.ts
	@echo "Type generation complete"

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
	@npm test

test-e2e: ## Run E2E tests with Playwright
	@echo "Running E2E tests (Playwright)..."
	@cd src && npx playwright test

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
	@npx eslint src/ --ext .ts,.tsx,.svelte

format: ## Format all files with Prettier
	@echo "Formatting files..."
	@npx prettier --write "**/*.{ts,tsx,svelte,json,md}"
	@echo "Format complete"

# Smoke test (build system validation)
smoke-test: ## Validate Bun, Svelte, and Tauri integration
	@echo "Starting smoke test..."
	@echo "1. Starting Bun server on localhost:3000..."
	@cd api && bun run server.ts &
	BUN_PID=$$!
	@sleep 2
	@echo "2. Starting Vite dev server..."
	@npm run dev &
	VITE_PID=$$!
	@sleep 2
	@echo "3. Checking health endpoint..."
	@curl -f http://localhost:3000/health || (echo "Smoke test FAILED" && kill $BUN_PID $VITE_PID 2>/dev/null; exit 1)
	@echo "4. Checking Vite server..."
	@curl -f http://localhost:5173 || (echo "Smoke test FAILED" && kill $BUN_PID $VITE_PID 2>/dev/null; exit 1)
	@echo "5. All services started successfully"
	@echo "6. Shutting down test services..."
	@kill $BUN_PID $VITE_PID 2>/dev/null
	@echo "Smoke test PASSED"

# Installation
install-dev: ## Install all development dependencies
	@$(MAKE) check-typescript
	@echo "Installing development dependencies..."
	@make install-bun
	@make install-npm
	@echo "Development dependencies installed"

install-all: ## Install all dependencies (same as install-dev)
	@$(MAKE) install-dev

install-bun: ## Install Bun backend dependencies
	@echo "Installing Bun dependencies (api/)..."
	@cd api && bun install

install-npm: ## Install npm dependencies (frontend, Tauri, tools)
	@echo "Installing npm dependencies..."
	@npm install
