# Doggy Bag Development Guidelines

## Tech Stack

- **Frontend**: Svelte 5.x, TypeScript 5.x (strict), Vite
- **Backend**: Bun 1.x HTTP server, TypeScript
- **Desktop**: Tauri 2.x (Rust 2021 edition)
- **Data**: JSON files in user-configurable directory

## Project Structure

```
src/              # Svelte frontend (routes, components, stores, lib)
api/              # Bun backend (services, routes, models, utils)
src-tauri/        # Tauri/Rust code
tests/e2e/        # Playwright E2E tests
data/             # Local development data (JSON files)
docs/             # Documentation
.opencode/        # OpenCode skills and commands
```

## Workflow Rules

- Before telling me something works - test it using `make test` or curl
- Use curl to test backends before having me test manually

## HARD RULES

- **NO HARDCODED COLORS**: Never use hardcoded hex colors (e.g., `#1a1a2e`, `#24c8db`) in CSS. Always use CSS variables from the theme system (e.g., `var(--bg-surface)`, `var(--accent)`). This ensures Light Mode and Dark Mode work correctly. See `color-expert` skill or `docs/colour-themes.md`.

- **NO HARDCODED PIXEL SIZES**: Avoid hardcoded pixel values (e.g., `width: 660px`, `padding: 24px`) in CSS. Use shared CSS variables defined in `src/routes/+layout.svelte` (e.g., `var(--panel-width-medium)`, `var(--space-6)`). Fix opportunistically when editing files that contain hardcoded values. Use existing variables only - don't create new ones for one-off values. Available: `--space-1` (4px) through `--space-8` (32px), `--radius-sm/md/lg/xl`, `--section-gap`, `--card-gap`.

## Available Skills

Load on-demand for detailed guidance:

| Skill                        | When to Use                                  |
| ---------------------------- | -------------------------------------------- |
| `testing`                    | Running tests, coverage, writing new tests   |
| `homebrew-release`           | Creating and deploying new versions          |
| `color-expert`               | Theme system, color variables, accessibility |
| `tauri-sidecar-troubleshoot` | Debugging Tauri sidecar issues               |

## Quick Commands

```bash
make dev          # Start Tauri dev mode
make dev-browser  # Start browser dev mode (no Tauri)
make test         # Run all tests
make build        # Build production app
make lint         # Run linters
make format       # Format code
```

## Active Technologies

- TypeScript 5.x (Frontend & Backend), Rust (Tauri) + Svelte 5, Tauri v2, Bun 1.x (013-misc-fixes)
- Local JSON files via `StorageService` (013-misc-fixes)

- TypeScript 5.x (strict mode), Rust 2021 edition (Tauri) + Svelte 5.x, Bun 1.x, Tauri 2.x, Vite (012-misc-fixes)
- JSON files in user-configurable directory + new documents/ folder for uploads (012-misc-fixes)

## Recent Changes

- 012-misc-fixes: Added TypeScript 5.x (strict mode), Rust 2021 edition (Tauri) + Svelte 5.x, Bun 1.x, Tauri 2.x, Vite
