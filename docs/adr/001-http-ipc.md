# ADR-001: HTTP for IPC Communication

**Status**: Accepted  
**Date**: 2025-12-30 (original), 2026-01-03 (documented)

---

## Context

BudgetForFun is a Tauri desktop application with a Svelte frontend and a Bun backend running as a sidecar process. We need to establish communication between the frontend (running in Tauri's WebView) and the backend (running as a separate Bun process).

Options considered:

1. **Tauri Commands** - Direct Rust function calls from frontend
2. **Unix Domain Sockets** - Local socket communication
3. **Tauri IPC Channels** - Tauri's built-in event system
4. **HTTP over localhost** - Standard REST API

---

## Decision

We will use **HTTP communication over localhost:3000** for all frontend-backend communication.

The frontend makes standard `fetch()` calls to `http://localhost:3000/api/*`, and the Bun backend responds with JSON.

---

## Consequences

### Positive

1. **Standard web patterns** - Can use existing HTTP client libraries, REST conventions
2. **Easy debugging** - Can test API with curl, Postman, browser dev tools
3. **Future web version** - Same API can serve a web application
4. **Hot reload friendly** - Frontend and backend can restart independently
5. **OpenAPI documentation** - Can generate API docs via tsoa

### Negative

1. **Port collision risk** - Another process might use port 3000
2. **Startup coordination** - Frontend must wait for backend to be ready
3. **No built-in auth** - Relies on localhost assumption for security
4. **Overhead** - HTTP has more overhead than direct IPC

### Mitigations

- **Port collision**: Implement dynamic port allocation (see TD-CC4 in technical debt)
- **Startup coordination**: Health check loop in Tauri setup hook
- **Security**: Only bind to localhost, no external access

---

## References

- [Technical Debt: Dynamic Port](../architecture/technical-debt.md#phase-3-dynamic-port-sprint-2)
- [Architecture Overview](../architecture/overview.md)
