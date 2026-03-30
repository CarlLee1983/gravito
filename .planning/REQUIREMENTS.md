# Requirements: Gravito-Core Framework

**Defined:** 2026-03-30
**Core Value:** 穩定可靠的核心基礎設施 — core 及所有 Orbit 包必須具備 production-ready 品質

## v2.2.0 Requirements

Requirements for Framework Evolution milestone. Each maps to roadmap phases.

### Performance

- [ ] **PERF-01**: Developer can register fast-path routes via `photon.fast(method, path, handler)` that bypass DI context construction and lifecycle hooks, wiring directly to Bun.serve handler
- [ ] **PERF-02**: Developer can opt-out of global middleware on per-route basis with explicit typed flag at registration time
- [ ] **PERF-03**: Framework logs Bun-native capability report at boot time showing which native APIs are active (e.g. Bun.password argon2id, Bun.CryptoHasher, Bun.Glob)

### Developer Experience

- [ ] **DX-01**: Route registration retains Zod input/output schemas as metadata accessible to downstream consumers (OpenAPI generator, documentation tools)
- [ ] **DX-02**: Developer can generate static OpenAPI 3.1 spec via `gravito openapi:generate` CLI command, emitting `openapi.json` as build-time artifact
- [ ] **DX-03**: Developer can define Lite Satellite as object literal in `gravito.config.ts` with single `install(core)` hook, without requiring full directory structure or ServiceProvider class

### Bun-Native

- [ ] **BUN-01**: Sentinel HashManager uses `Bun.password` natively on Bun runtime for hash/verify operations (not Node.js bcryptjs shim)
- [ ] **BUN-02**: RuntimeCryptoAdapter uses `Bun.CryptoHasher` for non-password hashing (SHA-256, SHA-512, BLAKE2b) on Bun runtime
- [ ] **BUN-03**: NativeOrbitDetector utility allows any Orbit to query available Bun capabilities at boot time via structured API

### Tooling

- [ ] **TOOL-01**: Developer can generate application-level Orbit/Satellite dependency graph via CLI command showing module coupling relationships

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Advanced OpenAPI

- **OAPI-01**: Runtime `/openapi.json` endpoint serving cached spec
- **OAPI-02**: Swagger UI endpoint integrated with PhotonOrbit

### Extended Bun-Native

- **EBUN-01**: Bun.Glob integration for file-system scanning operations
- **EBUN-02**: Bun.SQLite adapter for lightweight embedded database use cases

### Module System

- **MOD-01**: Full Satellite two-phase lifecycle support for Lite Satellites (register + boot)
- **MOD-02**: Satellite hot-reload in development mode

## Out of Scope

| Feature | Reason |
|---------|--------|
| Runtime OpenAPI spec regeneration per-request | O(n) schema walking per request; cache at startup or generate at build time |
| Inline Satellite with full two-phase lifecycle | Violates register→boot contract; causes initialization order bugs |
| Fast-path as default for all routes | Bypasses observability, auth, error normalization; must be opt-in |
| Remove all Node.js compat layers | Breaks RuntimeAdapter multi-runtime abstraction; 38 packages depend on it |
| Container full generic refactor | Affects 50+ packages; deferred from v2.1.0, remains deferred |
| Auto-generate OpenAPI from TypeScript interfaces (no Zod) | Type erasure at runtime; requires compiler plugin with high maintenance |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PERF-01 | Phase 28 | Pending |
| PERF-02 | Phase 28 | Pending |
| PERF-03 | Phase 27 | Pending |
| DX-01 | Phase 30 | Pending |
| DX-02 | Phase 30 | Pending |
| DX-03 | Phase 29 | Pending |
| BUN-01 | Phase 27 | Pending |
| BUN-02 | Phase 27 | Pending |
| BUN-03 | Phase 27 | Pending |
| TOOL-01 | Phase 31 | Pending |

**Coverage:**
- v2.2.0 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after roadmap creation — all 10 requirements mapped to Phases 27-31*
