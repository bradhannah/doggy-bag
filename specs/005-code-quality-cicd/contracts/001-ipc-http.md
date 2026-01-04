# ADR-001: Keep HTTP for Tauri-Bun IPC

**Status**: Accepted  
**Date**: 2026-01-03  
**Decision Makers**: Development Team

---

## Context

The BudgetForFun application uses a multi-process architecture:
- **Tauri shell** (Rust): Desktop window, native OS integration
- **Bun backend** (TypeScript): HTTP server on localhost:3000, business logic
- **Svelte frontend**: WebView, communicates with backend via fetch()

The frontend communicates with the backend using HTTP over localhost. We evaluated whether alternative IPC mechanisms could provide benefits.

## Decision

**Keep HTTP over localhost:3000** for all Tauri-to-Bun communication.

## Alternatives Considered

### 1. Unix Domain Sockets

| Aspect | Assessment |
|--------|------------|
| Performance | ~40% faster (0.029ms vs 0.050ms per request) |
| Feasibility | High - Bun supports it natively |
| Limitation | Browser fetch() cannot use Unix sockets |
| Required Changes | Rust proxy layer needed |

**Rejected because**: Performance gain is imperceptible to users. Adds architectural complexity for no user-facing benefit.

### 2. Tauri Commands (Rust Proxy)

| Aspect | Assessment |
|--------|------------|
| Performance | Variable - depends on implementation |
| Feasibility | Medium |
| Required Changes | ~50 new Rust commands OR full backend rewrite |

**Rejected because**: Massive implementation effort. Would require either a proxy layer with double serialization, or rewriting the entire backend in Rust.

### 3. Tauri IPC Channels

| Aspect | Assessment |
|--------|------------|
| Purpose | Streaming data from Rust to JS |
| Fit for REST APIs | Poor - not request-response pattern |

**Rejected because**: Wrong tool for the job. Designed for streaming, not API calls.

### 4. Shared Memory / mmap

| Aspect | Assessment |
|--------|------------|
| Performance | Fastest possible |
| Feasibility | Very Low |
| Required Changes | Custom protocol, FFI bindings |

**Rejected because**: Impractical. Bun has no shared memory API. Would require custom native modules and complex synchronization.

## Consequences

### Positive

- **Simplicity**: No architectural changes needed
- **Debuggability**: curl, browser dev tools, network inspection all work
- **Consistency**: Same HTTP patterns in dev and production
- **Flexibility**: Easy to add new endpoints without infrastructure changes

### Negative

- **Port usage**: Occupies localhost:3000 (potential conflicts with other apps)
- **Slight overhead**: HTTP headers add ~100 bytes per request (negligible)

### Neutral

- **Performance**: 0.05ms per request is already imperceptible
- **Security**: localhost-only, no network exposure

## Future Considerations

If requirements change (e.g., port conflicts become common, or we need to remove network stack entirely), revisit Unix domain sockets with Rust proxy:

1. Bun server listens on Unix socket
2. Tauri command proxies requests from frontend to socket
3. Estimated effort: 2-3 days
4. Performance improvement: ~40% on IPC latency

## References

- [Bun Unix Sockets Documentation](https://bun.sh/docs/api/http#unix-sockets)
- [Tauri IPC Documentation](https://tauri.app/develop/calling-rust/)
- [research.md - IPC Alternatives Analysis](../research.md#5-ipc-alternatives-analysis)
