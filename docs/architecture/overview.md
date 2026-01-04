# BudgetForFun Architecture Overview

**Last Updated**: 2026-01-03  
**Version**: 0.1.0

---

## System Architecture

BudgetForFun is a desktop budgeting application built with a three-layer architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TAURI DESKTOP SHELL                             │
│                         (Rust + Tauri 2.x)                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      WebView (Frontend)                          │   │
│  │                      Svelte 5 + SvelteKit                        │   │
│  │                      localhost:1420 (dev)                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                  │                                      │
│                                  │ HTTP (fetch)                         │
│                                  ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Bun Sidecar (Backend)                       │   │
│  │                      localhost:3000                              │   │
│  │                      Spawned by Tauri on startup                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                  │                                      │
│                                  │ File I/O                             │
│                                  ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      JSON File Storage                           │   │
│  │                      ~/Documents/BudgetForFun/                   │   │
│  │                      (configurable via Settings)                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Overview

### 1. Tauri Desktop Shell (Rust)

**Location**: `src-tauri/`

The Rust layer provides:
- Native window management
- Sidecar process lifecycle (spawn, monitor, terminate)
- System integrations via plugins:
  - `tauri-plugin-shell` - Sidecar spawning
  - `tauri-plugin-store` - Persistent settings
  - `tauri-plugin-dialog` - Native folder picker
  - `tauri-plugin-fs` - File system operations
  - `tauri-plugin-window-state` - Window position/size persistence

**Key Commands** (exposed to frontend):
| Command | Purpose |
|---------|---------|
| `start_bun_sidecar` | Spawn backend with DATA_DIR |
| `stop_bun_sidecar` | Terminate backend process |
| `restart_bun_sidecar` | Stop + start with new config |
| `get_default_data_dir` | Returns ~/Documents/BudgetForFun |
| `get_config_dir` | Returns app config directory |
| `relaunch_app` | Full app restart |

### 2. Svelte Frontend

**Location**: `src/`

The frontend is a Svelte 5 + SvelteKit application:
- **Components**: 50+ components in `src/components/`
- **Stores**: 11 Svelte stores in `src/stores/`
- **Routes**: SvelteKit file-based routing in `src/routes/`
- **API Client**: Type-safe client in `src/lib/api/client.ts`

**Key Directories**:
```
src/
├── components/
│   ├── Dashboard/       # Main dashboard view
│   ├── DetailedView/    # Monthly detailed budget view
│   ├── Setup/           # Initial setup wizard
│   └── shared/          # Reusable components
├── stores/              # Svelte stores (state management)
├── routes/              # SvelteKit pages
└── lib/api/             # API client
```

### 3. Bun Backend

**Location**: `api/`

The backend is a Bun HTTP server:
- **Server**: Custom routing in `api/server.ts`
- **Services**: Business logic in `api/src/services/`
- **Handlers**: Route handlers in `api/src/routes/handlers/`
- **Types**: Shared types in `api/src/types/index.ts`

**Key Directories**:
```
api/
├── server.ts            # HTTP server entry point
├── src/
│   ├── services/        # Business logic (17 services)
│   ├── routes/
│   │   ├── handlers/    # Route handlers (15 files)
│   │   └── index.ts     # Route definitions (74 routes)
│   ├── types/           # Type definitions
│   └── utils/           # Utilities (errors, formatters, validators)
└── openapi/             # Generated OpenAPI spec
```

### 4. Data Storage

**Location**: Configurable (default: `~/Documents/BudgetForFun/`)

```
data/
├── entities/
│   ├── bills.json
│   ├── incomes.json
│   ├── categories.json
│   ├── payment-sources.json
│   └── undo.json
└── months/
    ├── 2025-01.json
    ├── 2025-02.json
    └── ...
```

---

## Process Lifecycle

```
App Launch
    │
    ▼
┌─────────────────────────────────────────┐
│  Tauri .setup() hook                    │
│  1. Read settings.json for dataDirectory│
│  2. Fall back to ~/Documents/BudgetForFun│
│  3. Spawn bun-sidecar with DATA_DIR env │
│  4. Health check loop (30 × 200ms)      │
│  5. Emit "sidecar-ready" event          │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  Frontend receives "sidecar-ready"      │
│  1. Initialize stores                   │
│  2. Fetch initial data from API         │
│  3. Render UI                           │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  Normal Operation                       │
│  Frontend ←→ Backend via HTTP           │
│  Backend ←→ JSON files via Bun I/O      │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  App Close                              │
│  (TODO: Graceful sidecar shutdown)      │
└─────────────────────────────────────────┘
```

---

## IPC Pattern

All frontend-backend communication uses HTTP:

```
Frontend (Svelte)          Backend (Bun)
      │                         │
      │  GET /api/bills         │
      │────────────────────────>│
      │                         │
      │  200 OK [{...}, {...}]  │
      │<────────────────────────│
      │                         │
```

**Why HTTP?** See [ADR-001: HTTP IPC](../adr/001-http-ipc.md)

**API Base URL**:
- Development: Proxied via Vite (relative URLs)
- Production: `http://localhost:3000`

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Desktop Shell | Tauri | 2.x |
| Frontend | Svelte | 5.x |
| Frontend Framework | SvelteKit | 2.x |
| Backend Runtime | Bun | 1.x |
| Backend Server | Bun HTTP (native) | - |
| Data Storage | JSON files | - |
| Type System | TypeScript | 5.6.x |
| Build Tool | Vite | 6.x |

---

## Key Patterns

### State Management
- Svelte writable/derived stores
- Optimistic updates with rollback
- Server sync on mutations

### Error Handling
- Backend: 5 typed error classes
- Frontend: Toast notifications
- See [Backend Patterns](./backend-patterns.md)

### Type Safety
- Backend types in `api/src/types/index.ts`
- OpenAPI spec generation via tsoa
- Frontend types auto-generated
- See [ADR-002: Type Synchronization](../adr/002-type-synchronization.md)

---

## Related Documentation

- [Technical Debt Registry](./technical-debt.md)
- [Frontend Patterns](./frontend-patterns.md)
- [Backend Patterns](./backend-patterns.md)
- [ADR Index](../adr/)
