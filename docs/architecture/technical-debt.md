# Technical Debt Registry

**Last Updated**: 2026-01-03  
**Review Session**: Architecture Deep Dive (US-0)

---

## Summary

| Severity | Count |
|----------|-------|
| High | 6 |
| Medium | 13 |
| Low | 5 |
| **Total** | **24** |

---

## Complete Registry

### Frontend (Svelte)

| ID | Issue | Severity | Effort | Location | Notes |
|----|-------|----------|--------|----------|-------|
| TD-F1 | `Navigation.svelte` too large (645 lines) | Medium | Medium | `src/components/Navigation.svelte` | Split into smaller components |
| TD-F2 | `detailed-month.ts` repetitive optimistic update logic (582 lines) | Medium | Medium | `src/stores/detailed-month.ts` | Extract shared update patterns |
| TD-F3 | Inconsistent persistence (localStorage vs Tauri Store) | Medium | Medium | Various stores | Standardize on Tauri Store |
| TD-F4 | Hardcoded API URL fallback | High | Low | `src/lib/api/client.ts:5` | Part of dynamic port feature |
| TD-F5 | Debug console.logs left in code | Low | Trivial | `src/lib/api/client.ts:80,84,87` | Remove or use logger |
| TD-F6 | No frontend logging utility | Medium | Low | N/A | Create logger wrapper |

### Backend (Bun)

| ID | Issue | Severity | Effort | Location | Notes |
|----|-------|----------|--------|----------|-------|
| TD-B1 | `server.ts` matchRoute too complex (270 lines) | High | High | `api/server.ts:54-327` | Works but hard to maintain |
| TD-B2 | `server.ts` does too much (400 lines) | Medium | Medium | `api/server.ts` | Extract CORS, logging utilities |
| TD-B3 | Models directory redundant | Low | Trivial | `api/src/models/` | Just re-exports types |
| TD-B4 | Hardcoded port 3000 | High | Medium | `api/server.ts:28` | Part of dynamic port feature |
| TD-B5 | No dependency injection | Medium | High | All services | Harder to test; consider for v2 |
| TD-B6 | 16 DEPRECATED fields in types | Medium | Medium | `api/src/types/index.ts` | User approved removal |
| TD-B7 | Incomplete OpenAPI generation | High | High | `api/openapi/swagger.json` | A2 approach: tsoa controllers |
| TD-B8 | Frontend types out of sync | High | Medium | `src/types/api.ts` | Depends on TD-B7 |

### Desktop Shell (Tauri/Rust)

| ID | Issue | Severity | Effort | Location | Notes |
|----|-------|----------|--------|----------|-------|
| TD-R1 | Hardcoded port 3000 in health check | High | Medium | `src-tauri/src/lib.rs:309` | Part of dynamic port feature |
| TD-R2 | No CSP configured | Medium | Low | `src-tauri/tauri.conf.json:21` | User declined for now |
| TD-R3 | Blocking `std::thread::sleep()` | Medium | Low | `src-tauri/src/lib.rs:256` | Use `tokio::time::sleep` |
| TD-R4 | Remove `greet` boilerplate command | Low | Trivial | `src-tauri/src/lib.rs:87-89` | Dead code |
| TD-R5 | Use proper logging crate (tracing) | Low | Medium | `src-tauri/src/lib.rs` | Uses println! |
| TD-R6 | FS scope too broad (`$HOME/**`) | Medium | Low | `src-tauri/capabilities/default.json` | User declined to restrict |
| TD-R7 | No graceful shutdown on app close | Medium | Medium | `src-tauri/src/lib.rs` | User approved fix |

### Cross-Cutting

| ID | Issue | Severity | Effort | Location | Notes |
|----|-------|----------|--------|----------|-------|
| TD-CC4 | Port hardcoded in 3+ places | High | Medium | Multiple | Consolidates TD-F4, TD-B4, TD-R1 |

---

## Prioritized Remediation Plan

### Phase 1: Quick Wins (Sprint 1)

Low effort items that can be done immediately.

| ID | Task | Effort | Owner |
|----|------|--------|-------|
| TD-R4 | Remove `greet` boilerplate | Trivial | - |
| TD-F5 | Remove debug console.logs | Trivial | - |
| TD-B3 | Clean up models directory | Trivial | - |
| TD-R3 | Replace blocking sleep with async | Low | - |

**Estimated Time**: 2-4 hours

### Phase 2: Type System Cleanup (Sprint 1-2)

Prerequisite for other work. Enables proper type synchronization.

| ID | Task | Effort | Dependencies |
|----|------|--------|--------------|
| TD-B6 | Remove 16 DEPRECATED fields | Medium | None |
| TD-B7 | Create tsoa controllers (A2 approach) | High | TD-B6 |
| TD-B8 | Regenerate frontend types | Medium | TD-B7 |

**Estimated Time**: 2-3 days

**Key Deliverables**:
- `api/src/types/requests.ts` - Shared request types
- `api/src/controllers/*.ts` - 16 controller files
- Updated `src/types/api.ts` - Auto-generated

### Phase 3: Dynamic Port (Sprint 2)

Resolves high-severity cluster of port-related issues.

| ID | Task | Effort | Dependencies |
|----|------|--------|--------------|
| TD-CC4 | Implement dynamic port allocation | Medium | None |

**Implementation Steps**:
1. Backend starts with port 0 (OS assigns)
2. Backend prints `PORT=XXXX` to stdout
3. Rust captures port from sidecar stdout
4. Rust stores port in app state
5. Rust emits `sidecar-ready` with port number
6. Frontend receives port via Tauri event
7. Frontend configures API client with dynamic port
8. Health check uses dynamic port

**Estimated Time**: 1-2 days

### Phase 4: Code Quality (Sprint 2-3)

Medium severity improvements for maintainability.

| ID | Task | Effort | Dependencies |
|----|------|--------|--------------|
| TD-F1 | Split Navigation.svelte | Medium | None |
| TD-F2 | Extract optimistic update patterns | Medium | None |
| TD-F6 | Create frontend logger | Low | None |
| TD-B2 | Extract server.ts utilities | Medium | None |
| TD-R7 | Add graceful sidecar shutdown | Medium | None |

**Estimated Time**: 3-4 days

### Phase 5: Future Improvements (Backlog)

Lower priority items for future consideration.

| ID | Task | Effort | Notes |
|----|------|--------|-------|
| TD-F3 | Standardize on Tauri Store | Medium | Requires testing |
| TD-B5 | Dependency injection | High | Major refactor |
| TD-R5 | Add tracing crate | Medium | Nice to have |
| TD-B1 | Simplify matchRoute | High | Works, low priority |

---

## Decisions Log

Decisions made during architecture review (2026-01-03):

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Type synchronization | A2: Spec generation only | Lower risk, keeps working Bun routing |
| Controller organization | Split with nested routes | Cleaner OpenAPI, manageable files |
| Request type naming | `Create*Request` pattern | Industry standard |
| Graceful shutdown | Add to scope | User approved |
| DEPRECATED fields | Remove now | User approved cleanup |
| FS scope restriction | Keep broad | User declined |
| CSP configuration | Skip for now | User declined |

---

## Mapping to Spec User Stories

| Tech Debt | Spec User Story | Phase |
|-----------|-----------------|-------|
| TD-B7, TD-B8 | US-7 (Zero Warnings) | 2 |
| TD-B6 | US-7 (Zero Warnings) | 2 |
| TD-F5 | US-1 (Local Quality) | 1 |
| TD-F1 | US-1 (Local Quality) | 4 |
| TD-CC4 | US-8 (IPC Research) | 3 |
| TD-R7 | US-8 (IPC Research) | 4 |

---

## References

- [Architecture Overview](./overview.md)
- [Frontend Patterns](./frontend-patterns.md)
- [Backend Patterns](./backend-patterns.md)
- [ADR-002: Type Synchronization](../adr/002-type-synchronization.md)
