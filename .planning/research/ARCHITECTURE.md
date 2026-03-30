# Architecture Research

**Domain:** TypeScript framework evolution — performance bypass, DX, lightweight plugins, Bun-native integration
**Researched:** 2026-03-30
**Confidence:** HIGH (direct codebase inspection — engine, adapter, astral, runtime layers all read)

---

## Standard Architecture

### System Overview — Existing Galaxy Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Satellites (Business Domains — isolated, event-only cross-communication)   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  satellite-  │  │  satellite-  │  │  satellite-  │  │  Lite/Inline │   │
│  │  catalog     │  │  commerce    │  │  membership  │  │  Plugin (NEW)│   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                  │                  │           │
├─────────┴─────────────────┴──────────────────┴──────────────────┴───────────┤
│  Orbits (Infrastructure — GravitoOrbit.install() lifecycle)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ photon   │  │ astral   │  │ signal   │  │ fortify  │  │ sentinel    │  │
│  │ (HTTP)   │  │ (OpenAPI)│  │ (events) │  │ (auth)   │  │ (native auth│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘  │
│       │              │              │              │               │          │
├───────┴──────────────┴──────────────┴──────────────┴───────────────┴─────────┤
│  PlanetCore (micro-kernel)                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Container (IoC) | HookManager | Router | EventManager | ConfigManager│    │
│  │ GravitoEngineAdapter → Gravito engine → AOTRouter                   │    │
│  │  (static: O(1) Map)   (dynamic: Radix Tree)                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What v2.2.0 Adds to This Picture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  gravito.config.ts                                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  plugins: [{ name: 'ops', fastRoutes: [{GET: '/health', handler}] }]  │  │
│  │      ↓ PlanetCore.plugin()  ↓ InlineOrbit.install()                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Fast-Path Layer  (NEW — inside Gravito engine, parallel to AOTRouter)      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  FastPathRegistry (Map)  →  Bun.serve routes{}  →  direct Response   │  │
│  │  (no DI, no middleware chain, no context pool)                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Static Contract Layer  (NEW — in @gravito/astral)                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  SatelliteContractExtractor  →  OpenApiGenerator  →  openapi.json    │  │
│  │  (no server boot required — CI/build-time generation)                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Bun-Native Abstraction  (NEW — in @gravito/core/runtime)                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  NativeOrbitDetector  →  hasPassword | hasCryptoHasher | hasFileAPI  │  │
│  │  (called once in PlanetCore constructor; flags cached on instance)    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### Existing Components Relevant to v2.2.0

| Component | Package | Responsibility | v2.2.0 Touch? |
|-----------|---------|----------------|---------------|
| `Gravito` | `core/engine/Gravito.ts` | AOT router, object pool, `serveConfig()` for Bun.serve integration | YES — `fastPath()` + `FastPathRegistry` |
| `AOTRouter` | `core/engine/AOTRouter.ts` | Static O(1) `Map` + dynamic Radix Tree; `getNativeRoutes()` for Bun offload | MINIMAL — `FastPathRegistry` is a sibling, not merged into `AOTRouter` |
| `GravitoEngineAdapter` | `core/adapters/GravitoEngineAdapter.ts` | Adapts `Gravito` engine to `HttpAdapter` interface used by `PlanetCore` | YES — `fastPathRoute()` method added |
| `BunNativeAdapter` | `core/adapters/bun/BunNativeAdapter.ts` | Legacy Bun adapter (wraps `RadixRouter`) | NOT MODIFIED — active adapter is `GravitoEngineAdapter` for new code |
| `PlanetCore` | `core/PlanetCore.ts` | Micro-kernel: container, hooks, router, event bus | YES — `plugin()` method; call `NativeOrbitDetector` in constructor |
| `BunHasher` | `core/security/Hasher.ts` | Wraps `Bun.password.hash/verify`; already native | NO — already correct; `NativeOrbitDetector` documents the pattern explicitly |
| `OpenApiGenerator` | `astral/OpenApiGenerator.ts` | `generate(routes[])` → `OpenAPIV3_1.Document` | YES — `generateFromContracts()` overload |
| `generateStaticSite()` | `astral/export-static.ts` | `openapi.json` + Swagger HTML from live `core.router.compile()` | YES — accept `{ contracts }` as alternative to `{ core }` |
| `getRuntimeKind()` | `core/runtime/detection.ts` | Detect Bun / Deno / Node; already used by `adapter-bun.ts` | YES — `NativeOrbitDetector` extends this with capability-level flags |

### New Components for v2.2.0

| Component | Package / Path | Responsibility |
|-----------|---------------|----------------|
| `FastPathRegistry` | `core/engine/FastPathRegistry.ts` (new) | `Map<string, (req: Request) => Response \| Promise<Response>>`. Holds routes registered via `fastPath()`. Consumed by `Gravito.serveConfig()` to populate Bun.serve `routes{}`. |
| `InlineOrbit` | `core/InlineOrbit.ts` (new) | Implements `GravitoOrbit`. Accepts `InlineOrbitConfig { name, routes?, fastRoutes?, register? }`. Converts config into standard `adapter.route()` or `adapter.fastPathRoute()` calls during `install()`. |
| `NativeOrbitDetector` | `core/runtime/NativeOrbitDetector.ts` (new) | `detectBunCapabilities(): NativeFeatures`. Probes `typeof Bun`, `typeof Bun.password`, `typeof Bun.CryptoHasher`, `typeof Bun.file`. Returns `NativeFeatures` record. Called once per `PlanetCore` construction. |
| `SatelliteContractExtractor` | `astral/SatelliteContractExtractor.ts` (new) | `extract(module: unknown): AstralResource[]`. Imports a Satellite module (no side effects), reads its exported `contracts` property, and converts it to `AstralResource[]` compatible with `OpenApiGenerator`. |

---

## Recommended Project Structure — Changes Only

Only net-new and modified files are listed. Unchanged files are omitted.

```
packages/core/src/
├── engine/
│   ├── Gravito.ts              MODIFIED: fastPath() method; consumes FastPathRegistry in serveConfig()
│   ├── AOTRouter.ts            UNTOUCHED: FastPathRegistry is a sibling, not merged here
│   └── FastPathRegistry.ts     NEW: ~30 lines; pure Map wrapper
├── adapters/
│   └── GravitoEngineAdapter.ts MODIFIED: fastPathRoute() delegates to engine.fastPath()
├── InlineOrbit.ts              NEW: ~60 lines; implements GravitoOrbit from inline config
├── runtime/
│   ├── detection.ts            UNTOUCHED: NativeOrbitDetector extends it by importing from it
│   └── NativeOrbitDetector.ts  NEW: ~40 lines; probes Bun capability flags
├── PlanetCore.ts               MODIFIED: plugin() method; _nativeFeatures init; export new symbols
└── index.ts                    MODIFIED: add FastPathRegistry, InlineOrbit, NativeOrbitDetector exports

packages/astral/src/
├── OpenApiGenerator.ts         MODIFIED: generateFromContracts() static overload
├── SatelliteContractExtractor.ts NEW: ~80 lines; module inspection → AstralResource[]
├── export-static.ts            MODIFIED: accept { contracts: AstralResource[] } as alternative input
└── index.ts                    MODIFIED: export SatelliteContractExtractor
```

### Structure Rationale

- **`FastPathRegistry` as sibling to `AOTRouter`:** Keeping it separate avoids entangling the bypass mechanism with the standard routing tree. `AOTRouter` owns matching logic; `FastPathRegistry` owns bypass registration. Single responsibility.
- **`InlineOrbit` at `core/InlineOrbit.ts`:** Parallel to `ServiceProvider.ts` at the same level. Users composing inline plugins think in terms of the orbit system, not the engine internals.
- **`NativeOrbitDetector` in `core/runtime/`:** Runtime detection is already the concern of `core/runtime/detection.ts`. The new file extends that concern without moving unrelated code.
- **`SatelliteContractExtractor` in `astral/`:** OpenAPI concerns belong in `@gravito/astral`, not `@gravito/core`. The extractor reads Satellite module shapes but produces `AstralResource[]` — an astral type, not a core type.

---

## Architectural Patterns

### Pattern 1: Fast-Path Bypass

**What:** A secondary registration method on `Gravito` that stores a handler directly in `FastPathRegistry` — a flat `Map<string, BunHandler>`. When `Gravito.serveConfig()` builds the Bun.serve configuration, fast-path handlers are included in the `routes{}` object alongside AOT-compiled static routes. The difference: fast-path handlers skip the middleware chain, context pool, and DI resolution entirely. They are compiled once at registration time.

**When to use:** High-frequency, zero-dependency infrastructure routes: `/health`, `/ping`, `/metrics`, `/favicon.ico`. The rule of thumb: if the handler body is a single `return new Response(...)` or equivalent, it qualifies for fast-path.

**Trade-offs:** Zero middleware means zero CORS, zero auth enforcement, zero logging. A fast-path route must never process authenticated data or business logic. The explicit opt-in (`fastPath()` vs `get()`) prevents accidental misuse.

**Integration point chain:**
```
Satellite registers fastRoute
    ↓
GravitoEngineAdapter.fastPathRoute(method, path, handler)
    ↓
Gravito.fastPath(method, path, handler)
    ↓
FastPathRegistry.set('get:/health', handler)
    ↓
Gravito.serveConfig() includes FastPathRegistry entries in routes{}
    ↓
Bun.serve({ routes: { '/health': handler, ...aotRoutes }, fetch: fallback })
```

**Example signature:**
```typescript
// Gravito engine (new method)
fastPath(method: HttpMethod, path: string, handler: (req: Request) => Response | Promise<Response>): this

// InlineOrbit config
{
  name: 'ops',
  fastRoutes: [
    { method: 'GET', path: '/health', handler: () => new Response('ok') }
  ]
}
```

### Pattern 2: Static Contract Generation

**What:** `SatelliteContractExtractor` imports a Satellite module (without booting PlanetCore, without connecting to a database) and reads its exported `contracts` property. The contracts are plain objects — `AstralResource[]` or a shape convertible to that type. The extractor outputs `AstralResource[]` which `OpenApiGenerator.generateFromContracts()` consumes to produce an `OpenAPIV3_1.Document`.

**When to use:** CI pipeline (`bun run openapi:generate`), pre-commit spec drift detection, documentation deployment. The existing live-server approach (`core.router.compile()`) remains for development preview.

**Trade-offs:** Requires Satellite contracts to be statically expressible (no computed paths, no runtime-only Zod schemas). Satellites that build routes dynamically from database config cannot use static extraction — they fall back to the live approach. This is acceptable: the common case (CRUD Satellites) is static.

**Integration point:** New `generateStaticSite({ contracts })` overload in `astral/export-static.ts` accepts `{ contracts: AstralResource[] }` instead of (or in addition to) `{ core }`. The `OpenApiGenerator` already accepts an empty `routes[]` — the only gap is the extractor that converts Satellite module exports into `AstralResource[]`.

**Data flow:**
```
CLI: bun run openapi:generate
    ↓
SatelliteContractExtractor.extract(import('./satellite-catalog'))
    ↓ AstralResource[]
OpenApiGenerator.generateFromContracts(resources)    // no routes[] needed
    ↓ OpenAPIV3_1.Document
writeFile('openapi.json', JSON.stringify(spec))
```

### Pattern 3: Lite Satellite / Inline Plugin

**What:** `InlineOrbit` is a concrete implementation of `GravitoOrbit` that accepts a plain configuration object (`InlineOrbitConfig`) instead of requiring a class hierarchy, ServiceProvider, and directory structure. `PlanetCore.plugin(config)` is a convenience method that instantiates `InlineOrbit` and calls `.install(this)`.

**When to use:** Single-file utilities, ops endpoints, feature-flagged routes, experimental handlers. A plugin that fits in one function or fewer than 5 routes. If it grows beyond that, promote it to a full Satellite.

**Promotion path:** Inline plugin → copy routes to `satellites/<domain>/` directory → delete plugin entry from `gravito.config.ts`. The migration preserves all route definitions.

**Trade-offs:** No DI into the inline handler (receives raw `GravitoContext`, not container-resolved services). No Signal emit/subscribe. No message services. These limitations are intentional guards against over-using the inline pattern.

**Example usage in gravito.config.ts:**
```typescript
// gravito.config.ts
export default {
  plugins: [
    {
      name: 'ops',
      routes: [
        { method: 'GET', path: '/version', handler: (c) => c.json({ version: '2.2.0' }) }
      ],
      fastRoutes: [
        { method: 'GET', path: '/health', handler: () => new Response('ok') }
      ]
    }
  ]
}
```

### Pattern 4: Native Orbit Detection

**What:** `NativeOrbitDetector` is a stateless utility module (not a class) called exactly once during `PlanetCore` construction. It returns a `NativeFeatures` record of boolean flags. Orbits query these flags in their `install()` method to select between a Bun-native implementation and a universal fallback.

**Why this matters for v2.2.0:** `BunHasher` already hardcodes `Bun.password` calls. Other Orbits (e.g., a future storage orbit using `Bun.file`) need a consistent pattern for detecting capability availability. `NativeOrbitDetector` makes that pattern explicit and testable.

**When to use:** Any Orbit that has a Bun-native path and a Node/universal fallback. Currently: hashing (`fortify`), crypto operations (`sentinel`), file I/O in any Orbit. Not needed if the Orbit is Bun-only and the codebase has no Node target.

**Trade-offs:** Detection at boot time means the decision is made once and cached. If a Bun update adds a new API at runtime (impossible in practice), the detection would be stale until restart. Acceptable.

**Example structure:**
```typescript
// NativeOrbitDetector.ts
export interface NativeFeatures {
  hasPassword: boolean      // Bun.password.hash/verify
  hasCryptoHasher: boolean  // Bun.CryptoHasher
  hasFileAPI: boolean       // Bun.file()
  hasTestAPI: boolean       // Bun.jest / bun:test
}

export function detectBunCapabilities(): NativeFeatures {
  const isBun = typeof Bun !== 'undefined'
  return {
    hasPassword: isBun && typeof (Bun as any).password?.hash === 'function',
    hasCryptoHasher: isBun && typeof (Bun as any).CryptoHasher === 'function',
    hasFileAPI: isBun && typeof (Bun as any).file === 'function',
    hasTestAPI: isBun && typeof (Bun as any).jest !== 'undefined',
  }
}
```

---

## Data Flow

### Request Flow — Standard vs Fast-Path

```
Incoming Request
      ↓
Bun.serve (configured by Gravito.serveConfig())
      │
      ├── routes{} match (includes fast-path + AOT-compiled static)
      │       │
      │       ├── Fast-path handler → direct Response (zero middleware overhead)
      │       │
      │       └── AOT-compiled static → pre-compiled middleware chain → FastContext → Response
      │
      └── no routes{} match → fetch() fallback
              ↓
          AOTRouter.match() (dynamic Radix Tree)
              ↓
          Context Pool → acquire FastContext
              ↓
          compileMiddlewareChain (cached per route version)
              ↓
          GravitoHandler (may use DI via closure over Container)
              ↓
          Context Pool → release → Response
```

### OpenAPI Generation — Static (new) vs Live (existing)

```
STATIC (new — CI-friendly, no server boot):

  import('./satellite-catalog')      ← no Bun.serve, no atlas, no redis
          ↓
  SatelliteContractExtractor.extract(module)
          ↓  AstralResource[]
  OpenApiGenerator.generateFromContracts(resources)
          ↓  OpenAPIV3_1.Document
  writeFile('openapi.json', JSON.stringify(spec))


LIVE (existing — unchanged):

  core.router.compile()              ← requires booted PlanetCore + registered routes
          ↓  AstralRoute[]
  OpenApiGenerator.generateWithCache(routes)
          ↓  OpenAPIV3_1.Document
  Served at GET /docs/openapi.json
```

### Inline Plugin Registration Flow

```
gravito.config.ts: plugins: [{ name, routes, fastRoutes }]
        ↓
PlanetCore.plugin(config)            ← new 3-line method
        ↓
new InlineOrbit(config).install(core)
        ↓
InlineOrbit reads config.routes[]    → core.adapter.route(method, path, handler)
InlineOrbit reads config.fastRoutes[] → core.adapter.fastPathRoute(method, path, handler)
                                              ↓
                                   FastPathRegistry.set(key, handler)
```

### Native Detection Flow

```
new PlanetCore(config)
        ↓
this._nativeFeatures = detectBunCapabilities()   ← called once in constructor
        ↓ NativeFeatures cached on instance

Later, during orbit boot:
core.orbit(new FortifyOrbit())
        ↓
FortifyOrbit.install(core)
        ↓
const features = core.nativeFeatures           ← read cached flags
if (features.hasPassword) {
  // use BunHasher (Bun.password)
} else {
  // use bcrypt fallback
}
```

---

## Integration Points — New vs Modified Explicit Breakdown

| Component | Status | Package | What Changes |
|-----------|--------|---------|--------------|
| `Gravito` | MODIFIED | `core` | `fastPath(method, path, handler)` method; `FastPathRegistry` as private field; include registry entries in `serveConfig()` |
| `GravitoEngineAdapter` | MODIFIED | `core` | `fastPathRoute(method, path, handler)` delegates to `this.engine.fastPath()` |
| `PlanetCore` | MODIFIED | `core` | `plugin(config): Promise<this>` method; `_nativeFeatures: NativeFeatures` field initialized in constructor; `get nativeFeatures()` accessor |
| `core/index.ts` | MODIFIED | `core` | Export `FastPathRegistry`, `InlineOrbit`, `InlineOrbitConfig`, `NativeOrbitDetector`, `NativeFeatures`, `detectBunCapabilities` |
| `OpenApiGenerator` | MODIFIED | `astral` | `generateFromContracts(resources: AstralResource[]): OpenAPIV3_1.Document` — no `routes[]` required |
| `generateStaticSite()` | MODIFIED | `astral` | Accept `{ contracts: AstralResource[] }` as alternative to `{ core: PlanetCore }` |
| `astral/index.ts` | MODIFIED | `astral` | Export `SatelliteContractExtractor` |
| `FastPathRegistry` | NEW | `core/engine/` | `Map<string, BunHandler>` with `set/get/entries/has` |
| `InlineOrbit` | NEW | `core/` | `implements GravitoOrbit`; accepts `InlineOrbitConfig` |
| `NativeOrbitDetector` | NEW | `core/runtime/` | `detectBunCapabilities(): NativeFeatures` |
| `SatelliteContractExtractor` | NEW | `astral/` | `extract(module): AstralResource[]` |

### Boundaries That Must Not Be Crossed

| Boundary | Rule | Reason |
|----------|------|--------|
| Fast-path handlers ↔ DI container | Fast-path handlers MUST NOT call `core.container.make()` | Defeats the bypass; defeats testing isolation |
| `InlineOrbit` ↔ Signal bus | Inline plugins MUST NOT emit or subscribe to Signal events | Requires fully booted Satellite context |
| `SatelliteContractExtractor` ↔ database / Bun.serve | Extractor import MUST NOT trigger atlas connections or server startup | Static generation must be zero-side-effect |
| `FastPathRegistry` ↔ `AOTRouter` | Registry is a sibling Map, not merged into `AOTRouter` | Avoids entangling bypass logic with standard routing match logic |
| `NativeOrbitDetector` ↔ orbit `install()` timing | Detection runs in `PlanetCore` constructor; flags available by the time any `orbit()` call reaches `install()` | Calling detection inside `install()` would duplicate work |

### Components NOT Modified

| Component | Why Untouched |
|-----------|--------------|
| `AOTRouter` | `FastPathRegistry` is a sibling; no AOT logic changes needed |
| `BunNativeAdapter` | Legacy adapter; active path uses `GravitoEngineAdapter` |
| `BunHasher` | Already uses `Bun.password` natively; `NativeOrbitDetector` documents the pattern but does not change the hasher |
| All Satellite packages | Satellite isolation principle — core changes propagate via the adapter/orbit interface, not direct satellite modification |
| `signal` package | No interaction with fast-path or inline plugin features |

---

## Anti-Patterns

### Anti-Pattern 1: Fast-Path for Business Logic Routes

**What people do:** Register `/api/orders` as a fast-path route to reduce latency on a critical endpoint.
**Why it's wrong:** Business routes require auth middleware, request validation, and DI-resolved services. Fast-path bypasses all three unconditionally. This is a security hole, not a performance win.
**Do this instead:** Use standard `get('/api/orders', authMiddleware, handler)`. Reserve fast-path exclusively for ops/infrastructure endpoints that have no auth or business logic requirements.

### Anti-Pattern 2: Growing an Inline Plugin Beyond Its Scope

**What people do:** Keep adding routes and service registrations to an `InlineOrbit` config because the API is convenient.
**Why it's wrong:** Inline plugins have no test fixture structure, no message services, no typed DI. Past three routes or any DI dependency, the inline format becomes harder to test than a proper Satellite.
**Do this instead:** Promote to a full Satellite. Copy the inline routes to `satellites/<domain>/routes/`, create `ServiceProvider`, `MessageService`, and test fixtures. Delete the plugin entry from `gravito.config.ts`.

### Anti-Pattern 3: Using `SatelliteContractExtractor` at Request Time

**What people do:** Call `SatelliteContractExtractor.extract()` inside a request handler to generate OpenAPI on demand.
**Why it's wrong:** The extractor imports modules (cold-import cost), inspects their shape, and builds an AST-like structure. This is a build-time operation. Calling it per-request bypasses the `SpecCache` in `OpenApiGenerator` and adds significant latency to the first `/docs` request.
**Do this instead:** Run the extractor in the build step. Cache the result as `openapi.json`. Serve it as a static file.

### Anti-Pattern 4: Calling `detectBunCapabilities()` per Request

**What people do:** Check native capability inside a handler to decide which hash function to call.
**Why it's wrong:** Runtime capabilities do not change between requests. Repeated detection is wasted work.
**Do this instead:** Call `detectBunCapabilities()` once in `install(core)`, store the result on the Orbit instance (`this.features = detectBunCapabilities()`), and branch on `this.features.hasPassword` in handler code.

### Anti-Pattern 5: Merging `FastPathRegistry` into `AOTRouter`

**What people do:** Add a `fastPathRoutes` map directly inside `AOTRouter` to keep routing logic in one place.
**Why it's wrong:** `AOTRouter` owns request-time matching with middleware resolution. `FastPathRegistry` owns compile-time bypass registration. Merging them forces `AOTRouter.match()` to handle both code paths, complicating the hot path and making the bypass harder to reason about independently.
**Do this instead:** Keep them as separate fields on `Gravito`. `serveConfig()` merges their outputs when building the Bun.serve configuration.

---

## Scaling Considerations

| Concern | Current State (v2.1.0) | With v2.2.0 |
|---------|----------------------|-------------|
| High-frequency route throughput | AOT Map O(1) + Bun.serve `routes{}` offload | Fast-path eliminates context pool + middleware overhead; suitable for `/health` at 10k+ req/s |
| OpenAPI spec generation | Runtime-only; requires booted server | Also available at build/CI time via static extraction |
| Plugin registration overhead | Full `ServiceProvider` + directory structure for every plugin | `InlineOrbit` skips directory and provider lifecycle; suitable for <5 routes |
| Bun API compatibility | `BunHasher` uses `Bun.password` directly; no fallback detection | `NativeOrbitDetector` makes fallback explicit; other Orbits can adopt the pattern |
| Module coupling visibility | Implicit; no tooling | `DependencyGraph` (Phase 5 optional) adds CLI output; zero runtime overhead |

---

## Suggested Build Order

Ordered by dependency. Each phase is independently buildable and testable.

### Phase 1 — Foundation Utilities (no dependencies on each other or on modified components)

1. **`FastPathRegistry`** (~30 lines): pure `Map` wrapper with typed `BunHandler`. No imports beyond TypeScript types. Unit test: `set/get/entries/has`.
2. **`NativeOrbitDetector`** (~40 lines): imports `getRuntimeKind` from existing `detection.ts`; adds capability-level probing. Unit test: mock `typeof Bun` via `globalThis` override.

Rationale: Both are leaf nodes in the dependency graph. Building them first unblocks all subsequent phases.

### Phase 2 — Core Engine Integration

3. **`Gravito.fastPath()` + `serveConfig()` update**: add `FastPathRegistry` as a private field; wire it into the `routes{}` object built by `serveConfig()`. Integration test: register a fast-path route, call `serveConfig()`, verify the handler is present in `routes{}` and invoked directly without middleware.
4. **`GravitoEngineAdapter.fastPathRoute()`**: one-line delegation to `this.engine.fastPath()`. Integration test: call through `PlanetCore` adapter interface.

Rationale: These two changes touch the active request path. They must have test coverage before Phase 3 builds on them.

### Phase 3 — PlanetCore Plugin API

5. **`InlineOrbit`** (~60 lines): implements `GravitoOrbit`; reads `InlineOrbitConfig.routes` and `fastRoutes`; calls `core.adapter.route()` and `core.adapter.fastPathRoute()`. Unit test: boot a minimal `PlanetCore` with an inline plugin; assert routes are registered; assert a fast-route is in `FastPathRegistry`.
6. **`PlanetCore.plugin()`**: three-line wrapper: `new InlineOrbit(config).install(this)`. Test: call `plugin()` on a live `PlanetCore` instance.
7. **`PlanetCore` constructor** update: call `detectBunCapabilities()` and store on `this._nativeFeatures`; add `get nativeFeatures()` accessor.

Rationale: `InlineOrbit` depends on Phase 2 work (`fastPathRoute()` must exist). `PlanetCore` changes are last in this phase to avoid rebuilding during Phase 2 iteration.

### Phase 4 — Static OpenAPI

8. **`SatelliteContractExtractor`** (~80 lines): imports a module, checks for `contracts` export, converts to `AstralResource[]`. Unit test: fixture module with a known contract shape; assert correct `AstralResource` structure.
9. **`OpenApiGenerator.generateFromContracts()`**: thin wrapper calling the existing `generate()` with an empty `routes[]`. Test: generate a spec from a fixture `AstralResource[]`; assert valid OpenAPI 3.1 output.
10. **`generateStaticSite()` overload**: detect `{ contracts }` vs `{ core }` input; branch accordingly. Test: generate a static site file tree without instantiating `PlanetCore`.

Rationale: `@gravito/astral` is an optional dependency of `@gravito/core`. Its changes do not block Phases 1-3 and can be developed in parallel by a second contributor.

### Phase 5 — Exports and Tooling (cleanup)

11. **`core/index.ts` exports**: add `FastPathRegistry`, `InlineOrbit`, `InlineOrbitConfig`, `NativeOrbitDetector`, `NativeFeatures`, `detectBunCapabilities`. Run `publint` to verify exports map stays valid.
12. **`astral/index.ts` exports**: add `SatelliteContractExtractor`. Run `publint`.
13. **`DependencyGraph`** (optional, additive): walk `core._orbits` at runtime; emit DOT/JSON; exposed as a CLI command. Zero integration surface with Phases 1-4.

---

## Sources

- Direct codebase inspection (2026-03-30):
  - `packages/core/src/engine/Gravito.ts` (AOT router, `serveConfig()`, object pool)
  - `packages/core/src/engine/AOTRouter.ts` (static Map, `getNativeRoutes()`)
  - `packages/core/src/adapters/GravitoEngineAdapter.ts`
  - `packages/core/src/adapters/bun/BunNativeAdapter.ts`
  - `packages/core/src/PlanetCore.ts` (micro-kernel, `GravitoOrbit` interface, `orbit()` method)
  - `packages/core/src/security/Hasher.ts` (existing `BunHasher` pattern for `Bun.password`)
  - `packages/core/src/runtime/detection.ts` (`getRuntimeKind`, `getRuntimeEnv`)
  - `packages/astral/src/OpenApiGenerator.ts` (`generate()`, schema caching, route matching)
  - `packages/astral/src/export-static.ts` (`generateStaticSite()`, `core.router.compile()` usage)
  - `packages/photon/src/photon.ts` (Photon wraps `BunNativeAdapter`)
- Project context: `.planning/PROJECT.md` (v2.2.0 milestone goals confirmed)
- Architecture reference: `docs/claude/design.md` (Galaxy Architecture principles, dependency flow rules)

---

*Architecture research for: Gravito v2.2.0 — Fast-Path routing, Static OpenAPI, Lite Satellite, Bun-Native abstractions*
*Researched: 2026-03-30*
