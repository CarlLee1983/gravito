# Feature Research

**Domain:** TypeScript framework — performance bypass, OpenAPI generation, lightweight plugins, Bun-native integration
**Researched:** 2026-03-30
**Confidence:** HIGH (codebase-verified) / MEDIUM (ecosystem patterns from ElysiaJS, Fastify, Hono official docs)

---

## Context: What Already Exists

This is milestone v2.2.0 — a subsequent milestone on top of a stable v2.1.0 framework. The following are already built and must not be re-implemented:

- `PhotonOrbit` + `BunNativeAdapter` + `Gravito` engine (`AOTRouter`, `ObjectPool`, `RadixRouter`)
- `Gravito` engine already has `isPureStaticApp` fast-path flag and `compileMiddlewareChain` optimization
- Full middleware chain pipeline with `GravitoMiddleware`, `GravitoHandler`
- `Satellite` system with `ServiceProvider`, `GravitoOrbit.install()`, lifecycle hooks
- Zod-based validation on routes
- `Container` with typed `ServiceMap` DI (declaration merging)
- `HashManager` in `@gravito/sentinel` using `getPasswordAdapter()` from `@gravito/core`
- `RuntimeAdapter` abstraction in `packages/core/src/runtime/` (wraps Bun fs, crypto, archive, password)
- `GravitoException` three-layer error hierarchy across 38 packages
- `GravitoConfig.orbits` type already accepts both `(new () => GravitoOrbit)[]` and `GravitoOrbit[]`

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist when a framework advertises Bun-native performance and API-first architecture.
Missing any of these = the framework feels incomplete for its stated v2.2.0 goals.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Fast-path route registration API** | Any Bun-native performance framework is expected to expose a way to bypass DI/lifecycle for high-frequency routes. ElysiaJS 1.3 does this via AOT `compileHandler` + Bun native router dual strategy. Bun's own `Bun.serve({ routes: { "/path": handler } })` is direct with zero overhead | MEDIUM | `Gravito` engine already has an internal `isPureStaticApp` fast-path. The missing piece is a **public API** on `PhotonOrbit` that registers a route bypassing the DI context construction step, wiring directly to a raw `(req: Request) => Response | Promise<Response>` Bun-compatible signature |
| **`Bun.password` natively called in Sentinel** | Sentinel's `HashManager` calls `getPasswordAdapter()` which returns a `RuntimePasswordAdapter`. The Bun-specific adapter must call `Bun.password.hash/verify` natively. If it falls through to a Node.js shim (e.g., bcryptjs), the hashing is 10-50x slower and misses argon2id native support | LOW | Direct audit required: `packages/core/src/runtime/adapter-bun.ts` — verify `createPasswordAdapter()` uses `Bun.password`. If it does, this is a capability-logging story. If it doesn't, it's a bug fix |
| **`Bun.CryptoHasher` for non-password hashing** | Frameworks targeting Bun must avoid Node's `crypto` module where Bun has native replacements. `Bun.CryptoHasher` supports SHA-256, SHA-512, BLAKE2b, etc. | LOW | `packages/core/src/ffi/NativeHasher.ts` and `packages/core/src/security/Hasher.ts` — verify the detection path uses `Bun.CryptoHasher` on Bun runtime |
| **OpenAPI spec output from registered Zod schemas** | Frameworks with built-in Zod validation are expected to generate OpenAPI 3.x docs in 2025. `@hono/zod-openapi` and `@elysiajs/swagger` both solve this. Gravito has Zod validation at the route level but no schema-to-spec pipeline | HIGH | Requires: (1) route registry that retains Zod schema metadata, (2) a schema-walking generator using `zod-to-openapi` or `@asteasolutions/zod-to-openapi`, (3) output as either a runtime endpoint or a build-time artifact |
| **Route-level opt-out of middleware** | FastAPI, ElysiaJS (via `parse: 'none'` and per-hook guards), and Hono's `.use()` scoping all support per-route middleware exclusion. Users registering fast-path routes expect to say "skip global auth for this health-check route" | MEDIUM | `BunNativeAdapter.useScoped()` partially addresses this via path-scoping. The fast-path registration pattern should codify bypass as a first-class, explicitly typed option |

### Differentiators (Competitive Advantage)

Features that distinguish Gravito from ElysiaJS/Hono for the Bun ecosystem. Aligned with the v2.2.0 milestone goal statement.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Inline `gravito.config.ts` Satellite (Lite Satellite)** | ElysiaJS supports `new Elysia().use((app) => app.get(...))` inline functional callbacks. Fastify supports anonymous `register(async (instance) => ...)`. Gravito requires a full directory + `ServiceProvider` class. An inline API lets developers prototype domain logic without boilerplate, or add small cross-cutting concerns without a full Satellite | LOW-MEDIUM | `GravitoConfig.orbits` type already accepts `GravitoOrbit[]` (object literals). If `PlanetCore.boot()` handles plain objects alongside class constructors, this may be a near-zero-change addition. Constraint: inline Satellites should only have `install(core)` — no two-phase register/boot |
| **Static OpenAPI generation (build-time CLI)** | Hono has `@hono/zod-openapi` (runtime); ElysiaJS has `@elysiajs/swagger` (runtime Swagger UI). Neither generates a **static artifact at build time**. A `gravito openapi:generate` CLI command that emits `openapi.json` is a genuine differentiator for CI/CD pipelines where the spec becomes an auditable artifact in version control | HIGH | Depends on route schema metadata registry. Once metadata is collected, `@asteasolutions/zod-to-openapi` (MEDIUM confidence, widely cited) can walk it. The static-file output is the differentiator; a runtime endpoint is table stakes |
| **Boot-time native capability report** | Gravito is silent about which Bun APIs it uses. Surfacing this at boot ("Sentinel: using Bun.password (argon2id, native)" vs "Sentinel: using bcryptjs fallback (Node.js)") differentiates Gravito's operational transparency and makes runtime behavior auditable without reading source code | LOW | Requires: detection already present in `RuntimeAdapter`; add structured log output at `core.boot()` via the existing `Logger` interface |
| **Dependency graph visualization** | No TypeScript framework ships this as a first-party CLI tool. Gravito's monorepo already has `scripts/generate-dependency-graph.ts`. Exposing an application-level version (`gravito deps:graph`) that maps Orbit/Satellite coupling is a genuine differentiator for large apps debugging module coupling | MEDIUM | Scope: application-level module graph (which Orbits depend on which), not package-level. The existing script provides a reference implementation pattern |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Runtime OpenAPI spec regeneration on every request** | Seems convenient — always fresh, no build step | Schema walking is O(n) over all registered routes. On high-traffic APIs, even 5ms per request for spec generation adds up. Also causes cold-start spikes if done at first request | Generate once at app startup, cache in memory. Or better: `gravito openapi:generate` at build time as a static artifact |
| **Inline Satellite with full two-phase lifecycle** | Developers want a "micro-Satellite" with all Satellite features (register + boot + event bus + health check) | Full lifecycle in an inline object requires the container to be partially initialized before the inline definition runs, violating the register→boot contract. Leads to initialization order bugs that are hard to debug | Inline Satellite has only `install(core)` — a single synchronous hook. Full lifecycle requires a full Satellite class |
| **Fast-path as the default for all routes** | Performance-first developers ask "why not always bypass DI?" | Bypassing DI means no observability injection, no auth middleware, no error normalization via `GravitoException`. Applying this globally creates silent security/observability gaps that are hard to audit | Fast-path is explicitly opt-in per route. The standard path is the default |
| **Auto-generate OpenAPI from TypeScript interface types (no Zod)** | Developers who don't use Zod schemas want the same doc DX | TypeScript types are erased at runtime. Generating OpenAPI from plain interfaces requires a build-time compiler plugin (`ts-json-schema-generator` or TypeDoc + custom transformer), adding significant toolchain complexity and maintenance burden | Require Zod schemas on routes that want OpenAPI output. Routes without schemas are undocumented in the spec |
| **Bun-only removal of all Node.js compat layers** | Tempting since Bun is the primary runtime and compat layers add indirection | The existing `RuntimeAdapter` abstraction enables test environments (`bun test` can run against Node.js in CI), compatibility for downstream users deploying to Node.js, and future Deno support. Removing it would break 38 packages and violate the framework's stated multi-runtime goal | Ensure the Bun path is the hot path with zero overhead. Keep Node/Deno fallback but log a capability warning at boot |

---

## Feature Dependencies

```
[Fast-Path Route API]
    └──requires──> [BunNativeAdapter direct handler signature (Request → Response)]
    └──requires──> [Route registration flag: { fastPath: true }]
    └──enhances──> [Bun.serve native throughput]
    └──conflicts──> [Global middleware stack (intentional bypass)]

[Static OpenAPI Generation]
    └──requires──> [Route schema metadata registry (Zod schema stored at registration time)]
    └──requires──> [@asteasolutions/zod-to-openapi or equivalent]
    └──enables──> [gravito openapi:generate CLI command]
    └──enables──> [Runtime /openapi.json endpoint (optional, lower priority)]
    └──depends-on phase-order──> [Route schema metadata registry must ship first]

[Lite Satellite / Inline Plugin]
    └──requires──> [PlanetCore.boot() handles plain GravitoOrbit objects (not just class constructors)]
    └──type already supports──> [GravitoConfig.orbits: GravitoOrbit[] — check if boot() implements it]
    └──enhances──> [gravito.config.ts DX]
    └──conflicts──> [Full Satellite two-phase lifecycle in inline form]

[Native Orbit Detection / Capability Report]
    └──requires──> [RuntimeAdapter detection (already exists in packages/core/src/runtime/)]
    └──requires──> [Logger at boot time (already exists: GravitoConfig.logger)]
    └──enhances──> [Sentinel HashManager — verify Bun.password path]
    └──standalone──> [No blocking dependencies; can ship in Phase 1]

[Dependency Graph Visualization]
    └──requires──> [Orbit/Satellite registry awareness at boot time]
    └──enhances──> [scripts/generate-dependency-graph.ts (existing reference)]
    └──standalone──> [Does not block or depend on other v2.2.0 features]
```

### Dependency Notes

- **Static OpenAPI requires route schema metadata:** Routes must store their Zod input/output schemas at registration time, not just validate against them. This is the core infrastructure change. Without it, the generator has nothing to walk. Ship the metadata registry before the generator.
- **Lite Satellite may already work:** `GravitoConfig.orbits` accepts `GravitoOrbit[]` objects. If `PlanetCore.boot()` already handles both class constructors and plain objects, the feature is already present but undocumented. Audit `PlanetCore.ts` boot logic before building.
- **Fast-path does not replace Photon:** Fast-path is an additional registration method on `PhotonOrbit` (e.g., `photon.fast(method, path, rawHandler)`). Routes registered this way bypass the DI context construction step but still go through `Bun.serve`'s router infrastructure.
- **Capability report has zero-risk implementation:** Uses existing `RuntimeAdapter` detection and existing `Logger`. Ships independently and unblocks trust validation for Sentinel in production.

---

## MVP Definition

This is milestone v2.2.0 on an existing, healthy framework. "Launch with" means what must be in the first phase to validate the performance/DX narrative and unblock subsequent features.

### Launch With (Phase 1 of v2.2.0)

- [ ] **Native Orbit Detection + Sentinel Bun.password audit** — Lowest complexity, highest safety and trust impact. Verify `adapter-bun.ts` calls `Bun.password` natively. Add boot-time capability logging. Unblocks trust in Sentinel for production deployments.
- [ ] **Lite Satellite / Inline Plugin** — Audit whether `PlanetCore.boot()` already handles plain `GravitoOrbit` objects. If not, the delta is small. Once working, document with examples in `gravito.config.ts`. Unblocks DX for prototyping and small cross-cutting concerns.

### Add After Validation (Phase 2)

- [ ] **Route Zod schema metadata registry** — Required foundation for OpenAPI generation. Add `meta?: { schema?: { input?: ZodType; output?: ZodType } }` to route registration in `BunNativeAdapter` and `Gravito` engine. This is the prerequisite for Phase 3 OpenAPI work.
- [ ] **Fast-Path Route API** — Requires understanding `AOTRouter`'s static routes map and compiled handler path. `PhotonOrbit` gains a `.fast(method, path, rawHandler)` method registering directly against the static routes map without DI context construction.

### Future Consideration (Phase 3 / v2.2 end)

- [ ] **Static OpenAPI generation** — Depends on route schema registry. Once metadata is collected, `@asteasolutions/zod-to-openapi` can walk it and emit `openapi.json`. The CLI command (`gravito openapi:generate`) is the deliverable.
- [ ] **Dependency graph visualization** — Valuable for large applications but not blocking. Can reuse `scripts/generate-dependency-graph.ts` as reference with application-level awareness added.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Bun.password native detection + logging | HIGH | LOW | P1 |
| Lite Satellite inline in gravito.config.ts | HIGH | LOW-MEDIUM | P1 |
| Boot-time capability report | MEDIUM | LOW | P1 |
| Route Zod schema metadata registry | HIGH (blocks OpenAPI) | MEDIUM | P1 (prerequisite) |
| Fast-Path route API | HIGH | MEDIUM | P2 |
| Runtime `/openapi.json` endpoint | MEDIUM | LOW (after registry) | P2 |
| Static OpenAPI generation CLI | HIGH | HIGH | P2 |
| Dependency graph visualization | LOW-MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for this milestone to deliver its stated value
- P2: Core deliverable — should ship within this milestone
- P3: Stretch goal or next milestone

---

## Competitor Feature Analysis

| Feature | ElysiaJS | Hono | Fastify | Gravito v2.2.0 Planned |
|---------|----------|------|---------|------------------------|
| **Route bypass / fast-path** | AOT `compileHandler` + Bun native router dual strategy (1.3); `compileHandler` eliminates conditional branches and inlines validators | Route handlers are already thin (Hono itself is the fast path); no explicit bypass API | Plugin-based; fast routes register without middleware encapsulation | `photon.fast(method, path, rawHandler)` — direct `BunNativeAdapter` static route registration bypassing DI context construction |
| **Inline plugin / anonymous module** | `new Elysia().use((app) => app.get(...))` functional callback; also instance-based plugins | `app.use(async (c, next) => ...)` middleware only; no inline plugin with state | `fastify.register(async (instance) => { instance.get(...) })` anonymous function | `orbits: [{ install(core) { core.router.get(...) } }]` — object literal in `gravito.config.ts` |
| **OpenAPI generation** | Built-in `@elysiajs/swagger` (runtime Swagger UI + JSON endpoint); no build-time static export | `@hono/zod-openapi` (runtime schema + response validation); `@hono/swagger-ui` for UI | `@fastify/swagger` (runtime); requires schema registration per route | `zod-to-openapi` walker over schema metadata registry; `gravito openapi:generate` CLI emitting static `openapi.json` |
| **Bun.password / native crypto** | Direct `Bun.password` calls in guides; no abstraction layer | No auth primitives | N/A (Node.js target) | `RuntimePasswordAdapter` already abstracts; verify `adapter-bun.ts` calls `Bun.password` natively; log at boot |
| **Dependency graph** | None | None | None | First-party CLI — genuine ecosystem differentiator |

---

## Sources

- [ElysiaJS Plugin documentation](https://elysiajs.com/essential/plugin) — HIGH confidence (official docs, fetched 2026-03-30)
- [ElysiaJS Lifecycle documentation](https://elysiajs.com/essential/life-cycle) — HIGH confidence (official docs, fetched 2026-03-30)
- [ElysiaJS 1.3 release blog — dual router strategy](https://elysiajs.com/blog/elysia-13) — HIGH confidence (official release, fetched 2026-03-30)
- [Bun Hashing API reference](https://bun.com/docs/runtime/hashing) — HIGH confidence (official docs, fetched 2026-03-30)
- [Fastify plugin system guide](https://fastify.dev/docs/latest/Reference/Plugins/) — HIGH confidence (official docs)
- [asteasolutions/zod-to-openapi](https://github.com/asteasolutions/zod-to-openapi) — MEDIUM confidence (WebSearch, widely cited library)
- [samchungy/zod-openapi](https://www.npmjs.com/package/zod-openapi) — MEDIUM confidence (WebSearch, uses Zod native `.meta()`)
- [GitHub middleware support for Bun.serve](https://github.com/oven-sh/bun/issues/17608) — MEDIUM confidence (community discussion confirming Bun routes have no native middleware layer)
- Gravito codebase direct inspection: `packages/core/src/engine/Gravito.ts`, `packages/core/src/engine/AOTRouter.ts`, `packages/core/src/runtime/index.ts`, `packages/photon/src/photon.ts`, `packages/sentinel/src/HashManager.ts`, `packages/core/src/PlanetCore.ts`, `packages/core/src/ServiceProvider.ts`, `examples/rest-api-demo/src/gravito.config.ts` — HIGH confidence (source of truth)

---
*Feature research for: Gravito v2.2.0 — performance bypass, OpenAPI generation, Lite Satellite, Bun-native integration*
*Researched: 2026-03-30*
