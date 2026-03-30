# Roadmap: Gravito-Core

## Milestones

- ✅ **v1.3.10 Stabilization** — Phases 1-6 (shipped 2026-03-26)
- ✅ **v1.4.0 JSDoc Coverage** — Phases 7-9 (shipped 2026-03-27)
- ✅ **v1.5.0 Hono Removal** — Phases 10-14 (shipped 2026-03-27)
- ✅ **v1.5.1 Satellite Verification** — Phase 15 (shipped 2026-03-27)
- ✅ **v2.0.0 Core & Orbit Resilience** — Phases 16-20 (shipped 2026-03-29)
- ✅ **v2.1.0 Core DX 改進** — Phases 21-26 (shipped 2026-03-30)
- 🚧 **v2.2.0 Framework Evolution** — Phases 27-31 (in progress)

## Phases

<details>
<summary>✅ v2.1.0 Core DX 改進 (Phases 21-26) — SHIPPED 2026-03-30</summary>

- [x] Phase 21: API Footgun Fixes (3/3 plans) — completed 2026-03-29
- [x] Phase 22: Exception Hierarchy Clarification (1/1 plans) — completed 2026-03-29
- [x] Phase 23: Named Export Conversion (2/2 plans) — completed 2026-03-29
- [x] Phase 24: Config Type Unification (1/1 plans) — completed 2026-03-30
- [x] Phase 25: Container Type Improvement (1/1 plans) — completed 2026-03-30
- [x] Phase 26: Documentation and Tooling (7/7 plans) — completed 2026-03-30

</details>

<details>
<summary>✅ v2.0.0 Core & Orbit Resilience (Phases 16-20) — SHIPPED 2026-03-29</summary>

See [v2.0.0-ROADMAP.md](milestones/v2.0.0-ROADMAP.md) for full details.

</details>

<details>
<summary>✅ Earlier Milestones (v1.3.10 — v1.5.1, Phases 1-15)</summary>

- v1.3.10: [v1.3.10-ROADMAP.md](milestones/v1.3.10-ROADMAP.md)
- v1.4.0: [v1.4.0-ROADMAP.md](milestones/v1.4.0-ROADMAP.md)

</details>

### 🚧 v2.2.0 Framework Evolution (In Progress)

**Milestone Goal:** 強化 Gravito 在極致效能、開發體驗、模組輕量化與 Bun-Native 整合四大維度，基於 BI 選型對比（ElysiaJS / Bun 原生）的洞察。

- [x] **Phase 27: Bun-Native Foundation** — NativeOrbitDetector 建立 + Bun.password / CryptoHasher 路徑驗證 + 開機能力報告 (completed 2026-03-30)
- [x] **Phase 28: Fast-Path Routing** — photon.fast() 旁路機制，直連 Bun.serve handler，含安全測試（CVE-2025-29927 防護） (completed 2026-03-30)
- [x] **Phase 29: Lite Satellite** — InlineOrbit + PlanetCore.plugin() 零樣板匿名衛星定義 (completed 2026-03-30)
- [x] **Phase 30: Static OpenAPI Generation** — Zod schema 元資料 + gravito openapi:generate CLI 靜態輸出 (completed 2026-03-30)
- [x] **Phase 31: Dependency Graph Tooling** — gravito deps:graph CLI + exports 最終確認 (completed 2026-03-30)

## Phase Details

### Phase 27: Bun-Native Foundation
**Goal**: 所有 Orbit 可在開機時查詢 Bun 原生能力，Sentinel 和 Crypto 路徑已確認直接使用 Bun 原生 API，框架開機時輸出能力摘要
**Depends on**: Phase 26 (v2.1.0 complete)
**Requirements**: BUN-01, BUN-02, BUN-03, PERF-03
**Success Criteria** (what must be TRUE):
  1. Framework logs a Bun-native capability report at boot showing which APIs are active (e.g. `[gravito] native: Bun.password argon2id ✓, Bun.CryptoHasher ✓, Bun.Glob ✓`) with fallback paths noted for any inactive APIs
  2. Sentinel HashManager calls `Bun.password.hash()` and `Bun.password.verify()` on Bun runtime — confirmed by integration test asserting argon2id algorithm is used, not bcryptjs
  3. RuntimeCryptoAdapter calls `Bun.CryptoHasher` for SHA-256/SHA-512/BLAKE2b on Bun runtime — confirmed by test asserting the Bun-native code path is exercised
  4. Any Orbit can call `NativeOrbitDetector.detectBunCapabilities()` and receive a typed `NativeFeatures` object with boolean flags — no direct `Bun.xxx` calls outside `adapter-bun.ts`
**Plans**: 3 plans
Plans:
- [x] 27-01-PLAN.md — NativeOrbitDetector + NativeFeatures type + HashAccelerator sha512/blake2b extension
- [x] 27-02-PLAN.md — NativeHasher sha512/blake2b implementation + argon2id integration test
- [x] 27-03-PLAN.md — Boot capability report in PlanetCore.boot() + public exports

### Phase 28: Fast-Path Routing
**Goal**: Developer can register fast-path routes that bypass DI context construction and lifecycle hooks, and can opt specific routes out of global middleware, with a security contract guaranteeing auth middleware still fires
**Depends on**: Phase 27
**Requirements**: PERF-01, PERF-02
**Success Criteria** (what must be TRUE):
  1. Developer calls `photon.fast('GET', '/health', handler)` and the route is served directly by `Bun.serve routes:{}` without constructing a DI context or running lifecycle hooks
  2. Developer registers a route with an explicit opt-out flag and that route bypasses the specified global middleware — confirmed by test asserting the middleware callback is not invoked
  3. A protected fast-path route returns 401 (not 200) when called without valid credentials — integration test enforces this as a non-negotiable boot-order contract (CVE-2025-29927 class prevention)
  4. `serveConfig()` snapshot semantics are documented: calling `use()` after `serveConfig()` in dev mode emits a `SystemException('FAST_PATH_MIDDLEWARE_DRIFT')` warning
**Plans**: 2 plans
Plans:
- [x] 28-01-PLAN.md — Fast-Path Registry & photon.fast() implementation
- [ ] 28-02-PLAN.md — Middleware opt-out via RadixRouter metadata & Security Mitigation Test

### Phase 29: Lite Satellite
**Goal**: Developer can define a Lite Satellite as an object literal in gravito.config.ts with a single install(core) hook, without creating a directory structure or ServiceProvider class
**Depends on**: Phase 28
**Requirements**: DX-03
**Success Criteria** (what must be TRUE):
  1. Developer defines `{ name: 'ping', install(core) { core.route('GET', '/ping', ...) } }` in `gravito.config.ts` and it registers routes with no additional files required
  2. Inline plugin service bindings are namespaced under `inline:<name>:` prefix — attempting a collision in dev mode throws `CONTAINER_BINDING_COLLISION` exception
  3. `PlanetCore.plugin(inlineConfig)` accepts the object literal and integrates it into the existing `GravitoOrbit.install()` lifecycle without requiring a class constructor
**Plans**: TBD

### Phase 30: Static OpenAPI Generation
**Goal**: Route registrations carry Zod schema metadata accessible to downstream tools, and the developer can generate a static openapi.json artifact at build time via a single CLI command
**Depends on**: Phase 29
**Requirements**: DX-01, DX-02
**Success Criteria** (what must be TRUE):
  1. A Zod input/output schema attached at route registration time is retrievable as structured metadata from the route registry — accessible without booting a server
  2. Running `gravito openapi:generate` from the project root produces `openapi.json` in the configured output directory with valid OpenAPI 3.1 structure
  3. The generated spec reflects all routes that have associated Zod schemas — routes without schemas are included with empty request/response bodies, not omitted
  4. The CLI command exits with code 0 on success and non-zero on schema extraction failure, making it safe to run in CI
**Plans**: TBD

### Phase 31: Dependency Graph Tooling
**Goal**: Developer can generate a visual Orbit/Satellite dependency graph via a CLI command that reveals module coupling relationships in the application
**Depends on**: Phase 30
**Requirements**: TOOL-01
**Success Criteria** (what must be TRUE):
  1. Running `gravito deps:graph` produces a dependency graph output (JSON, DOT, or SVG) showing which Orbits and Satellites depend on each other
  2. The command works from the project root without additional configuration — auto-discovers Orbit/Satellite registrations from `gravito.config.ts`
  3. All new public symbols from Phases 27-30 pass `publint` validation — no `ERR_PACKAGE_PATH_NOT_EXPORTED` regressions
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 21. API Footgun Fixes | v2.1.0 | 3/3 | Complete | 2026-03-29 |
| 22. Exception Hierarchy Clarification | v2.1.0 | 1/1 | Complete | 2026-03-29 |
| 23. Named Export Conversion | v2.1.0 | 2/2 | Complete | 2026-03-29 |
| 24. Config Type Unification | v2.1.0 | 1/1 | Complete | 2026-03-30 |
| 25. Container Type Improvement | v2.1.0 | 1/1 | Complete | 2026-03-30 |
| 26. Documentation and Tooling | v2.1.0 | 7/7 | Complete | 2026-03-30 |
| 27. Bun-Native Foundation | v2.2.0 | 3/3 | Complete    | 2026-03-30 |
| 28. Fast-Path Routing | v2.2.0 | 1/2 | In Progress|  |
| 29. Lite Satellite | v2.2.0 | 3/3 | Completed | - |
| 30. Static OpenAPI Generation | v2.2.0 | 4/4 | Completed | - |
| 31. Dependency Graph Tooling | v2.2.0 | 2/2 | Completed | - |

