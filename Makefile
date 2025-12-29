# BudgetForFun Makefile
# Makefile-based build automation for Tauri + Bun + Svelte development workflow
# Includes automatic prerequisite installation for macOS using Homebrew

.PHONY: help dev build clean test lint format types smoke-test install-prereqs install-dev install-all

# Platform detection
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
	IS_MAC := yes
else ifeq ($(UNAME_S),Linux)
	IS_MAC := no
else ifeq ($(OS),Windows_NT)
	IS_MAC := no
endif

# Check for required tools
BUN_EXISTS := $(shell command -v bun >/dev/null 2>&1 && echo "yes" || echo "no")
NODE_EXISTS := $(shell command -v node >/dev/null 2>&1 && echo "yes" || echo "no")

# Default target
help: ## Show this help message
	@echo "BudgetForFun Makefile - Build Automation"
	@echo ""
	@echo "Prerequisites:"
	@echo "  make install-prereqs    Install missing tools (Bun, Node.js, Homebrew on macOS)"
	@echo ""
	@echo "Development Targets:"
	@echo "  make dev       Start all services (Tauri + Bun + Vite)"
	@echo ""
	@echo "Build Targets:"
	@echo "  make build     Build Tauri application"
	@echo "  make clean     Remove build artifacts"
	@echo "  make types     Generate OpenAPI spec and Svelte types"
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
	@echo ""
	@echo "Installation Targets:"
	@echo "  make install-dev    Install all development dependencies"
	@echo "  make install-all    Install all dependencies (Bun + npm)"

# Prerequisites
install-prereqs: ## Check and install missing tools (Bun, Node.js, Homebrew on macOS)
	@echo "Checking prerequisites..."
	@$(MAKE) check-prereqs
	@$(MAKE) install-missing-tools
	@echo ""
	@echo "Prerequisites check complete"

check-prereqs: ## Check which prerequisites are installed
	@echo "Platform: $(UNAME_S)"
	@echo "Bun installed: $(BUN_EXISTS)"
	@echo "Node.js installed: $(NODE_EXISTS)"

install-missing-tools: ## Install missing prerequisite tools
ifeq ($(IS_MAC),yes)
	@if [ "$(BUN_EXISTS)" = "no" ]; then \
		echo "Installing Bun via Homebrew..."; \
		brew install bun; \
		echo "✓ Bun installed successfully"; \
		echo ""; \
		echo "Please close and reopen your terminal to use Bun"; \
	fi
	@if [ "$(NODE_EXISTS)" = "no" ]; then \
		echo "Installing Node.js via Homebrew..."; \
		brew install node; \
		echo "✓ Node.js installed successfully"; \
		echo ""; \
		echo "Please close and reopen your terminal to use Node.js"; \
	fi
else ifeq ($(UNAME_S),Linux)
	@if [ "$(BUN_EXISTS)" = "no" ]; then \
		echo "To install Bun on Linux:"; \
		echo "  curl -fsSL https://bun.sh/install | bash"; \
	fi
	@if [ "$(NODE_EXISTS)" = "no" ]; then \
		echo "To install Node.js on Linux: Use your package manager"; \
		echo "  apt, yum, dnf, etc."; \
	fi
else ifeq ($(OS),Windows_NT)
	@echo "For Windows installation, see:"
	@echo "  Bun: https://bun.sh/docs/installation"
	@echo "  Node.js: https://nodejs.org/"
endif

# Development
dev: ## Start all services (Tauri + Bun + Vite)
	@$(MAKE) check-prereqs
	@if [ "$(BUN_EXISTS)" = "no" ]; then \
		echo "ERROR: Bun is not installed. Run 'make install-prereqs' to install."; \
		exit 1; \
	fi
	@echo "Starting all services in background..."
	@$(MAKE) start-bun &
	@$(MAKE) start-vite &
	@npm run tauri dev
	@wait

start-bun: ## Start Bun backend server on localhost:3000
	@echo "Starting Bun backend server on localhost:3000..."
	@cd api && bun run server.ts

start-vite: ## Start Vite dev server
	@echo "Starting Vite dev server..."
	@npm run dev

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
	@$(MAKE) check-prereqs
	@echo "Running all test suites..."
	@$(MAKE) test-backend
	@$(MAKE) test-frontend
	@$(MAKE) test-e2e
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
	@$(MAKE) check-prereqs
	@echo "Running ESLint..."
	@$(MAKE) lint-backend
	@$(MAKE) lint-frontend

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
	@$(MAKE) check-prereqs
	@if [ "$(BUN_EXISTS)" = "no" ]; then \
		echo "ERROR: Bun is not installed. Run 'make install-prereqs' to install."; \
		exit 1; \
	fi
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
	@$(MAKE) check-prereqs
	@$(MAKE) install-bun
	@$(MAKE) install-npm
	@echo "Development dependencies installed"

install-all: ## Install all dependencies
	@$(MAKE) check-prereqs
	@$(MAKE) install-bun
	@$(MAKE) install-npm
	@echo "All dependencies installed"

install-bun: ## Install Bun backend dependencies
	@if [ "$(BUN_EXISTS)" = "no" ]; then \
		echo "ERROR: Bun is not installed. Run 'make install-prereqs' to install."; \
		exit 1; \
	fi
	@echo "Installing Bun dependencies (api/)..."
	@cd api && bun install

install-npm: ## Install npm dependencies (frontend, Tauri, tools)
	@echo "Installing npm dependencies..."
	@npm install
