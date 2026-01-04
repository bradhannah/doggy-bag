# VSCode Configuration

This directory contains VSCode workspace configurations that integrate with the project's Makefile targets for streamlined development workflow.

## Launch Configurations (`.vscode/launch.json`)

### Debug Configurations

1. **Debug Bun Backend** - TypeScript debugging for Bun HTTP server on localhost:3000
   - File: `api/server.ts`
   - Debugger: Bun's built-in inspector
   - Hot reload: Manual restart required on file changes

2. **Debug Svelte Frontend** - Vite dev server debugging
   - File: `src/app.html` (Vite entry)
   - Browser: Chrome DevTools
   - Hot reload: Automatic via Vite

3. **Debug Tauri App** - Desktop application debugging
   - File: Tauri dev mode
   - Platform: Desktop window with webview
   - Hot reload: Automatic via Tauri

4. **Debug All Services** - Launch all three processes together
   - Pre-launch: Runs `make dev` task
   - Waits for "Running" output from Tauri
   - Attaches debugger to webview

### Usage

1. Press `F5` or click "Run and Debug" in VSCode
2. Select configuration from dropdown
3. Set breakpoints in TypeScript or Svelte files
4. Start debugging

## Build Tasks (`.vscode/tasks.json`)

### Development Tasks

1. **make: dev (All Services)** - Start Tauri, Bun, and Vite together
   - Runs in background terminal
   - Shows all three process outputs
   - Ideal for day-to-day development

2. **make: build (Tauri App)** - Build desktop application
   - Builds for current platform (macOS, Windows, Linux)
   - Output: `src-tauri/target/release/bundle/`

### Testing Tasks

1. **make: test (All Tests)** - Run complete test suite
   - Bun backend tests
   - Jest frontend tests
   - Playwright E2E tests
   - Shows combined results

2. **make: test: backend (Bun)** - Backend-only tests
   - Unit tests: `api/tests/unit/`
   - Integration tests: `api/tests/integration/`
   - Contract tests: `api/tests/contract/`

3. **make: test: frontend (Jest)** - Frontend-only tests
   - Unit tests: `src/tests/unit/`
   - Integration tests: `src/tests/integration/`

4. **make: test: e2e (Playwright)** - End-to-end user journey tests
   - File: `tests/e2e/`
   - Browsers: Chromium, Firefox, WebKit
   - Reports: HTML and JSON

### Build Automation Tasks

1. **make: types (Generate from OpenAPI)** - Type synchronization
   - Generates OpenAPI spec from backend types
   - Generates Svelte types from OpenAPI spec
   - Ensures backend/frontend type consistency

2. **make: clean (Build Artifacts)** - Remove temporary files
   - Cleans Tauri build artifacts
   - Cleans Vite cache
   - Cleans node_modules/bun.lockb cache

### Quality Tasks

1. **make: format (Prettier)** - Code formatting
   - Formats TypeScript files
   - Formats Svelte files
   - Formats JSON files

2. **make: lint (ESLint)** - Code quality checks
   - Lints backend TypeScript
   - Lints frontend TypeScript
   - Lints Svelte components
   - Shows warnings and errors

### Validation Tasks

1. **make: smoke-test (Build System Validation)** - Integration testing
   - Starts Bun server on localhost:3000
   - Starts Vite dev server
   - Starts Tauri dev mode
   - Sends health check to /health endpoint
   - Verifies 200 OK response
   - Shuts down all processes
   - Used to prove build system works before application logic

### Usage

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. Type "Tasks: Run Task" or "Tasks: Run Test Task"
3. Select desired task from list
4. Task runs in integrated terminal

## Keyboard Shortcuts

Recommended keyboard shortcuts (add to `keybindings.json` if desired):

- `Ctrl/Cmd + D` - Start `make dev`
- `Ctrl/Cmd + B` - Start `make build`
- `Ctrl/Cmd + T` - Start `make test`
- `Ctrl/Cmd + S` - Start `make smoke-test`

## Integration with Makefile

All VSCode tasks wrap Makefile targets defined in project root:

```makefile
dev      - Start all services (Tauri + Bun + Vite)
build     - Build Tauri app
test      - Run all tests (Bun + Jest + Playwright)
types     - Generate OpenAPI spec and Svelte types
clean     - Remove build artifacts
format    - Format all files with Prettier
lint      - Run ESLint checks
smoke-test - Validate build system integration
```

## Troubleshooting

### "Cannot find runtimeExecutable"

VSCode may not find Bun or Node automatically. Update `runtimeExecutable` path in `launch.json` to match your system:

- macOS: `/usr/local/bin/bun` or `/opt/homebrew/bin/bun`
- Linux: `/usr/bin/bun` or `~/.bun/bin/bun`
- Windows: Use `${env:HOME}/.bun/bin/bun.exe`

### "make: command not found"

Ensure Make is installed and available in PATH:

- macOS: Pre-installed with Xcode command line tools
- Linux: `sudo apt install build-essential` or equivalent
- Windows: Install via WSL or use MSYS2

### Tasks not showing in Command Palette

1. Close and reopen VSCode
2. Verify `.vscode/tasks.json` exists in project root
3. Check for syntax errors in JSON (VSCode shows squiggly lines)
4. Try running task directly: `Ctrl+Shift+P` → "Tasks: Configure Default Build Task"

### Debug configurations not working

1. Ensure you've run `npm install` in root (for Tauri, Vite, Jest, Playwright)
2. Ensure you've run `bun install` in `api/` directory
3. Check VSCode Extensions: Ensure "JavaScript and TypeScript Nightly" or similar is installed
4. Restart VSCode after installing dependencies

## Benefits of This Configuration

1. **Single Command Development**: `make dev` starts everything
2. **Integrated Debugging**: Debug Bun, Vite, or Tauri from VSCode
3. **Unified Testing**: All tests accessible via VSCode task runner
4. **Build Validation**: Smoke test ensures integration works
5. **Team Consistency**: Same commands for all developers via Makefile
