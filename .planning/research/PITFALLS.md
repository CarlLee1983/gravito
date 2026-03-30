# Pitfalls Research

**Domain:** Modular TypeScript Framework — Fast-Path Routing, Static OpenAPI Generation, Lite Satellite Plugins, Bun-Native Abstractions
**Researched:** 2026-03-30
**Confidence:** HIGH (codebase directly inspected; corroborated by web research)

---

## Critical Pitfalls

### Pitfall 1: Fast-Path Bypass Silently Skips Auth / Observability Middleware

**What goes wrong:**
A route registered through the fast-path mechanism (`serveConfig()` → Bun.serve `routes:` map, or the `isPureStaticApp` ultra-fast path inside `Gravito.fetch()`) receives pre-compiled handler closures at startup time. Any Orbit that installs middleware via `use()` / `useGlobal()` *after* that compilation step — or any middleware added on the Photon (`BunNativeAdapter`) path — is not automatically present in those pre-compiled chains. Result: auth, rate-limiting, observability, and request-scope cleanup silently stop executing for fast-path requests while still running for dynamic routes. The system appears fully functional during testing (most test routes are dynamic) and the gap only surfaces in production under specific static route patterns.

**Why it happens:**
The `Gravito` engine pre-compiles `compileMiddlewareChain(middleware, handler)` at route registration time when `serveConfig()` is called. If middleware is registered later (e.g., OrbitSentinel's `install()` runs during `core.boot()`, which occurs *after* the app configures routes), those middlewares are absent from the compiled chain. Developers see the `serveConfig()` pattern as a pure performance optimisation and do not realise it freezes middleware order.

**How to avoid:**
1. Define a strict registration contract: all Orbits that inject middleware must complete their `install()` phase before `serveConfig()` / fast-path route compilation is called.
2. Expose an explicit `FastPath.freeze()` step that validates no global middleware has been installed after the last compilation.
3. Add an integration test fixture that registers auth middleware, registers a fast-path route, then asserts a request without credentials gets a 401 — not a 200.
4. Consider a dev-mode assertion: if `isPureStaticApp === false` at serve time but `serveConfig()` was already called, emit a `SystemException` with `code: 'FAST_PATH_MIDDLEWARE_DRIFT'`.

**Warning signs:**
- Tests pass on dynamic routes but silent 200s appear on static routes that should be protected.
- Auth headers ignored on endpoints tagged `@FastPath`.
- Request-scope metrics show `cleanup()` never called for certain routes (missing from pool release logs).

**Phase to address:** Fast-Path Routing phase — Day 1 design constraint, not a post-implementation fix.

---

### Pitfall 2: `serveConfig()` Routes Map Does Not Update After Post-Startup `use()` Calls

**What goes wrong:**
`Bun.serve({ routes: {...} })` consumes the routes object at server start. Calling `Gravito.route()` or `use()` after `Bun.serve()` has started modifies the in-memory router but does NOT update the live Bun native routes map. New routes added post-startup are silently routed to the `fetch` fallback, not the SIMD-accelerated native handler. If the `fetch` fallback is not configured (or is stripped), those routes 404.

**Why it happens:**
Bun's native routing is a startup-time optimisation. The `routes:` field is read once. This is documented implicitly by Bun's server API but is not surfaced clearly in Gravito's `serveConfig()` return value. Developers familiar with Express/Hono expect live route mutation.

**How to avoid:**
1. Document `serveConfig()` explicitly: "Returns a snapshot. Call again and use `server.reload()` to reflect new routes."
2. Make the `fetch` fallback mandatory — never omit it from the `serveConfig()` return object (it is already included in the current implementation as `fetch: this.fetch`).
3. If hot-reload is required, call `server.reload(gravito.serveConfig())` instead of mutating the existing instance.
4. In tests, always exercise both the native route path and the `fetch` fallback path.

**Warning signs:**
- Routes added after `Bun.serve()` starts return 404 in production but pass in unit tests (which call `gravito.fetch()` directly, bypassing the native map).
- Routes missing from Bun's native router show up only in `fetch` fallback timing metrics (slower p99).

**Phase to address:** Fast-Path Routing phase — document and enforce in the `serveConfig()` API surface.

---

### Pitfall 3: Static OpenAPI Generation Diverges from Runtime Behaviour

**What goes wrong:**
The static contract (`astral.resource(...)`) declares the API shape at definition time. The actual request handling in the Satellite uses Zod (or raw validation) at runtime. If the Zod schema and the `AstralResource` contract are maintained separately, they diverge. The generated OpenAPI spec shows types that the runtime rejects (or vice versa). Clients generated from the spec fail with real API calls.

**Why it happens:**
`OrbitAstral` / `astral.resource()` describes resources declaratively. There is no compile-time or test-time assertion that `resource.operations.create.body` matches the actual `z.parse()` schema in the route handler. Because both exist in separate files (contract definition vs handler implementation), they drift during refactoring.

**How to avoid:**
1. Enforce a single source of truth: define the Zod schema first, then derive the `AstralResource` body/response schemas from the same Zod schema object using `zodToJsonSchema` (already possible via `astral`'s existing Zod bridge).
2. Add a CI contract test: run static generation, then send a valid-per-spec request and a minimally-invalid request to the live handler; assert correct acceptance/rejection.
3. Lint rule or PR checklist: any change to a route handler's Zod schema must update the `astral.resource()` contract in the same commit.
4. For Satellite Lite plugins, keep contract and handler co-located in the same `gravito.config.ts` closure — this eliminates drift by construction.

**Warning signs:**
- OpenAPI spec says a field is `string`, but runtime throws `ZodError: expected number`.
- Spec shows `required: ['email']`, but a missing email returns 200.
- Existing `AstralSchemaError` thrown during generation (schema incompatible with OpenAPI) — this surfaces at generation time, not in tests.

**Phase to address:** Static OpenAPI Generation phase — single-source-of-truth constraint established upfront.

---

### Pitfall 4: Lite Satellite / Inline Plugin Leaks Container Registrations Globally

**What goes wrong:**
An inline Lite Satellite defined in `gravito.config.ts` registers services or middleware on the global `PlanetCore` container. If the config is hot-reloaded or if two different config files are loaded in the same process (test environment, multi-tenancy), the inline plugin's registrations accumulate or collide with existing registrations from named Satellites. Because Lite Satellites have no package boundary, there is no `@gravito/<name>` namespace to isolate them.

**Why it happens:**
Named Satellites use `GravitoOrbit.install(core: PlanetCore)` which enforces an isolated registration scope. An inline lambda that calls `core.bind('myService', ...)` directly participates in the same flat namespace. Two inline satellites with the same service key silently overwrite each other.

**How to avoid:**
1. Require inline Lite Satellites to declare a `namespace` string that is auto-prefixed to all their service bindings: `core.bind('inline:health:checker', ...)` not `core.bind('checker', ...)`.
2. Add a dev-mode duplicate-binding check: if `Container.bind()` is called with a key that already exists and the caller is a different Satellite namespace, throw a `SystemException` with `code: 'CONTAINER_BINDING_COLLISION'`.
3. Design Lite Satellites to be stateless lambdas that only register routes (HTTP concern), not services (DI concern) — push any DI needs into a proper named Orbit.
4. In tests, always create a fresh `PlanetCore` instance per test suite when testing inline plugins.

**Warning signs:**
- Service resolved from container returns wrong implementation in mixed Satellite environments.
- `Container.make('x')` throws `CircularDependencyException` after adding an inline plugin that registers a similarly-named service.
- Tests pass in isolation but fail when run together (`bun test` discovers ordering dependency).

**Phase to address:** Lite Satellite / Inline Plugin phase — namespace requirement enforced in the API design.

---

### Pitfall 5: Bun-Native Abstraction Uses Direct `Bun.xxx` API Instead of Runtime Guard

**What goes wrong:**
New Orbit code for Bun-native APIs (crypto, fs, password) calls `require('bun')` or directly references `Bun.password.hash(...)` without checking for Bun availability. This causes `ReferenceError: Bun is not defined` when:
- Tests run with `bun test --conditions node` for CI parity checks.
- `@gravito/core` is imported by a downstream package that runs in Node (e.g., integration tests in `gravito-satellites`).
- The package is bundled for a non-Bun environment (edge workers, WASM).

**Why it happens:**
The existing `getRuntimeKind()` in `packages/core/src/runtime/detection.ts` provides the correct pattern, but new contributors writing Orbit code often reach for `require('bun')` directly (it is the shortest path), bypassing the detection layer. The `adapter-bun.ts` pattern is not enforced by linting.

**How to avoid:**
1. All Bun-native API access must go through the existing `getDefaultRuntimeAdapter()` or a `getRuntimeKind() === 'bun'` guard — never call Bun APIs directly in Orbit source.
2. Add a Biome lint rule (custom or via regex lint hook) that flags direct `Bun.password`, `Bun.crypto`, `Bun.file` usage outside of `packages/core/src/runtime/adapter-bun.ts`.
3. Write cross-runtime tests: every Bun-native abstraction must have a test that runs against a Node polyfill fallback to verify graceful degradation.
4. The `OrbitDegradationManager` pattern (already in v2.0.0) is the correct model for Bun-unavailable fallback — use it.

**Warning signs:**
- `ReferenceError: Bun is not defined` in CI for packages that previously had no Bun dependency.
- `publint` CI gate passes but downstream package test fails with `ERR_MODULE_NOT_FOUND: bun`.
- Hash benchmark shows identical timing in Node and Bun (Bun.password not activated, falling through to bcrypt).

**Phase to address:** Bun-Native Abstraction phase — enforced via adapter pattern and lint from the start.

---

### Pitfall 6: New Package or Sub-Path Export Breaks publint CI Gate

**What goes wrong:**
Adding a new sub-path export for fast-path, OpenAPI static export, or Lite Satellite API (e.g., `@gravito/core/fast-path`, `@gravito/astral/static`) without updating the `exports` field in `package.json` causes the publint CI gate to fail. More insidiously, if the entry is added to `exports` but the dist file does not exist (build step not run), consumers get `ERR_PACKAGE_PATH_NOT_EXPORTED` at runtime.

**Why it happens:**
Gravito has 57 packages validated by publint in CI. Each new sub-path export requires: (1) source file, (2) build output (ESM `.mjs` + CJS `.cjs` + types `.d.ts`), (3) `exports` map entry in `package.json`, and (4) publint validation. Developers focus on (1) and forget (3) or (4) during rapid development. The CLAUDE.md already documents the ESM naming / `buildCJSStub` consistency constraint but it is easy to miss during new feature work.

**How to avoid:**
1. publint CI gate is already in place — it will catch the missing entry. The pitfall is that it only catches it at CI time, not locally.
2. Add `publint` to the local `bun run check` flow so it fails fast before push.
3. Template for new sub-path exports: document the four-step checklist (source → build → exports → publint) in `docs/claude/development.md`.
4. For Lite Satellites (`gravito.config.ts`-based), avoid new sub-path exports entirely — keep them in the existing `@gravito/core` barrel export.

**Warning signs:**
- publint CI fails with "Package path './fast-path' is not exported".
- `ERR_PACKAGE_PATH_NOT_EXPORTED` at runtime despite the file existing on disk.
- TypeScript resolves the type correctly (`d.ts` found) but runtime import fails (`.mjs` not in exports map).

**Phase to address:** Any phase that adds new public sub-path exports — enforce the checklist immediately when creating the package structure.

---

### Pitfall 7: Inline Lite Satellite Violates Satellite Isolation Principle via Event Name Collision

**What goes wrong:**
The Satellite isolation principle forbids direct Satellite-to-Satellite imports. Inline Lite Satellites communicate via Signal bus events. If an inline plugin emits a generic event name (`user:created`) that collides with a named Satellite's Signal handler, the inline plugin accidentally triggers business logic it has no knowledge of. Unlike import-based coupling (caught by the pre-push circular dependency check), event-name coupling is invisible to static analysis.

**Why it happens:**
Named Satellites typically namespace events (e.g., `catalog:product:created`). Inline plugins lack the package discipline that enforces this convention. A developer writing a quick inline health-check plugin emits `health:checked` without realising a named Satellite is listening for `health:*` events as a dependency signal.

**How to avoid:**
1. Require inline Lite Satellite events to use the `inline:<name>:<event>` naming convention enforced by the plugin definition API.
2. Register inline plugin event names in the Signal bus manifest at install time so conflicts surface at startup, not in production.
3. Document the naming convention prominently in the Lite Satellite API design.
4. Add an integration test that verifies no named Satellite handler fires when an inline plugin event is emitted.

**Warning signs:**
- Named Satellite performs unexpected action after an inline plugin is added to config.
- Signal bus metrics show unexpected event subscriber counts after config change.
- Production: business logic triggered without corresponding user action.

**Phase to address:** Lite Satellite / Inline Plugin phase — event namespace constraint in API design.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip middleware validation on fast-path routes | Faster p99 in benchmarks | Auth silently skipped; security incident | Never — always validate middleware chain coverage |
| Inline Lite Satellite registers services globally without namespace | Less boilerplate | Container collision in multi-satellite environments | Never — namespace is free and prevents collisions |
| Single `AstralResource` contract without linking to Zod schema | Fast to write | Contract drift; generated client fails | Only during initial spike with a TODO marker; must be unified before merge |
| Bun API called directly without runtime guard | Shortest code | Crashes in Node CI, edge environments | Never in Orbit packages; acceptable only in `adapter-bun.ts` |
| `serveConfig()` called mid-lifecycle (before all Orbits install) | Convenience | Middleware missing from native routes | Never — document boot order explicitly |
| New sub-path export without running publint locally | Fast iteration | CI red; consumer `ERR_PACKAGE_PATH_NOT_EXPORTED` | Never — run `bun run check` before push |
| Generic event names in inline plugins | Less typing | Accidental named Satellite handler trigger | Never — namespace all inline plugin events |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Bun.serve `routes:` + Gravito | Calling `gravito.route()` after `Bun.serve()` starts and expecting native routing | Call `server.reload(gravito.serveConfig())` — routes map is read once |
| OrbitSentinel + fast-path | Installing auth middleware after `serveConfig()` snapshot | Complete all Orbit `install()` calls before generating `serveConfig()` |
| OrbitAstral static export + CI | Generating spec in build script that references runtime `core` instance | Use `StaticExportConfig` with a lightweight core fixture, not a live server |
| Bun.password + Node fallback | No availability check; direct call crashes | Use `getPasswordAdapter()` (already in HashManager) — this pattern is correct, duplicate it |
| Lite Satellite + existing Orbit events | Emitting event names that collide with Signal bus events in named Satellites | Namespace all inline-plugin events: `inline:<name>:<event>` |
| Container.make() ServiceMap overload + inline plugin | Extending `ServiceMap` in `gravito.config.ts` causes declaration merging issues in monorepo CI | Only extend `ServiceMap` in a proper package with `.d.ts` output; inline plugins must not extend global types |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Object pool exhaustion on fast-path surge | Requests queue behind pool wait; latency spike | Size pool relative to expected concurrency (default 256 is conservative for >500 RPS bursts) | ~2x pool size in concurrent requests |
| High-cardinality dynamic route patterns | `RadixRouter` cache fills to 10,000 entries; memory grows; GC pressure | Use static route registration for all known URL patterns; keep dynamic parameters well-bounded | >10,000 unique path patterns |
| OpenAPI static generation on every request | `OrbitAstral` re-generates spec on each `/openapi.json` hit during load test | Cache is already in `OrbitAstral.cachedSpec` — verify cache invalidation does not fire during normal operation | First request after any route change clears cache |
| Inline Lite Satellite with per-request closure allocation | New closure created per request inside handler | Move closure outside handler; keep handler as pure function reference | >1,000 RPS on Lite Satellite routes |
| `compileMiddlewareChain` called on every post-startup `use()` | `Gravito.use()` calls `compileRoutes()` which recompiles all routes | Batch all route/middleware registrations before starting server; avoid post-startup `use()` calls | Servers with >50 routes + 5+ middleware layers |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Fast-path route with no auth middleware in chain | Auth bypass — identical to CVE-2025-29927 class (middleware skipped via bypass mechanism) | Integration test: assert 401 on every fast-path route that should be protected, before fast-path activation |
| Inline Lite Satellite exposing admin endpoint without rate limiting | Brute-force on config-level endpoints | Any route registered via Lite Satellite must pass the same Orbit-level security review as named Satellites |
| Bun.crypto used for token signing without checking availability | Falls back to weaker polyfill silently | Explicit capability check: if Bun.crypto unavailable, throw `SystemException` with `code: 'CRYPTO_UNAVAILABLE'` — do not silently degrade cryptographic operations |
| OpenAPI spec exposes internal error codes or stack traces in `AstralGenerationError` context | Information disclosure via spec endpoint | Strip `AstralGenerationError.context` before serialising spec to HTTP response |
| Lite Satellite container binding accessible via `Container.make()` from other Satellites | Satellite isolation violation | Inline plugins must not bind services to the global DI container (routes only) |

---

## "Looks Done But Isn't" Checklist

- [ ] **Fast-Path Routing:** Middleware chain coverage — verify auth Orbit middleware is present in compiled chain for every fast-path route, not just dynamic routes.
- [ ] **Fast-Path Routing:** `fetch` fallback is never `undefined` in `serveConfig()` output — dynamic routes and error routes must still resolve.
- [ ] **Fast-Path Routing:** Integration test explicitly asserts a protected fast-path route returns 401 without credentials (not just that it returns 200 with them).
- [ ] **Static OpenAPI Generation:** Generated spec is validated against `openapi-types` `OpenAPIV3_1.Document` schema — do not assume `OrbitAstral`'s in-memory validation is sufficient.
- [ ] **Static OpenAPI Generation:** Static file output passes through `export-static.ts` archive logic — verify archive integrity in CI.
- [ ] **Static OpenAPI Generation:** Spec generated from a fresh `PlanetCore` fixture (not a live server instance) in CI.
- [ ] **Lite Satellite / Inline Plugin:** Registering an inline plugin does NOT extend `ServiceMap` in global TypeScript scope — verify no `declare module` block in `gravito.config.ts`.
- [ ] **Lite Satellite / Inline Plugin:** Inline plugin routes are exercised by at least one integration test (not just unit test).
- [ ] **Lite Satellite / Inline Plugin:** Event names use `inline:<name>:<event>` convention — no generic names.
- [ ] **Bun-Native Abstraction:** Every new Bun API abstraction has a Node fallback test that runs in the monorepo CI matrix.
- [ ] **Bun-Native Abstraction:** `getPasswordAdapter()` / `getDefaultRuntimeAdapter()` used — not direct `Bun.xxx` calls in Orbit source files.
- [ ] **Any new package or sub-path export:** `publint` passes locally (`bun run check`) before pushing.
- [ ] **GravitoException compliance:** All new error throws use `SystemException` / `DomainException` / `OperationalException` hierarchy — zero bare `throw new Error(...)` in Orbit source.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Auth middleware missing from fast-path compiled chain | HIGH | 1. Disable fast-path (`serveConfig()` → remove from `Bun.serve`). 2. Re-enable full `fetch` fallback. 3. Fix boot order. 4. Re-enable fast-path after verification. 5. Incident: all fast-path requests since deploy were unauthenticated — treat as security incident. |
| Contract drift between Zod schema and AstralResource | MEDIUM | 1. Regenerate spec from current Zod schemas. 2. Diff against committed spec. 3. Update `AstralResource` contracts. 4. Pin to single-source pattern. Clients may need re-generation. |
| Container binding collision from Lite Satellite | MEDIUM | 1. Add namespace prefix to inline plugin bindings. 2. `bun run typecheck` to surface declaration conflicts. 3. Restart server — bindings resolved in new instance. |
| New export missing from publint gate | LOW | 1. Add entry to `exports` in `package.json`. 2. Run `bun run build`. 3. Run `bun run check`. 4. Push. No user impact if caught in CI before release. |
| Direct Bun API crash in non-Bun environment | LOW-MEDIUM | 1. Wrap in `getRuntimeKind() === 'bun'` guard. 2. Route through existing `adapter-bun.ts`. 3. Add Node fallback test. Impact: dependent packages crash on Node until patched. |
| `serveConfig()` routes not updated after post-startup `use()` | MEDIUM | 1. Call `server.reload(gravito.serveConfig())`. 2. If reload not available, restart server process. 3. Long-term: document that post-startup middleware changes require reload. |
| Inline plugin event name collision | MEDIUM | 1. Rename inline plugin event to use `inline:<name>:<event>` convention. 2. Search Signal bus listeners for false matches. 3. Deploy; verify named Satellite no longer fires spuriously. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Fast-path silently skips auth middleware | Fast-Path Routing phase — boot-order contract before implementing bypass | Integration test: protected fast-path route returns 401 without auth header |
| `serveConfig()` routes not updated after post-startup `use()` | Fast-Path Routing phase — document and test | Test: register route after `serveConfig()`, verify it resolves via `fetch` fallback |
| OpenAPI contract diverges from Zod schema | Static OpenAPI Generation phase — single-source-of-truth constraint | CI contract test: generate spec, send valid + invalid requests, assert expected responses |
| Lite Satellite leaks global container registrations | Lite Satellite phase — namespace requirement in API design | Unit test: two inline plugins with same logical service key throw collision error |
| Lite Satellite event name collision | Lite Satellite phase — event namespace in API design | Integration test: inline plugin event does not trigger named Satellite handler |
| Bun API called without runtime guard | Bun-Native Abstraction phase — lint rule + cross-runtime test | `bun test --conditions node` passes for every new Bun abstraction |
| publint CI gate fails on new sub-path export | Any new export phase — pre-push `bun run check` | publint runs clean locally before PR is opened |
| GravitoException hierarchy not followed | Any phase — Biome `noExplicitAny` and review checklist | `grep -r "throw new Error" packages/*/src` returns zero results in new code |
| Container ServiceMap polluted by inline plugin | Lite Satellite phase — `declare module` forbidden in config files | TypeScript `--noEmit` on `gravito.config.ts` shows no `declare module` blocks |

---

## Sources

- Gravito codebase direct inspection: `packages/core/src/engine/Gravito.ts`, `packages/core/src/adapters/bun/BunNativeAdapter.ts`, `packages/core/src/runtime/detection.ts`, `packages/astral/src/export-static.ts`, `packages/astral/src/errors.ts`, `packages/sentinel/src/HashManager.ts` (2026-03-30)
- [CVE-2025-29927: Next.js Middleware Authorization Bypass](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass) — illustrates the class of vulnerability when fast-path bypasses middleware
- [Bun Middleware Support Issue #17608](https://github.com/oven-sh/bun/issues/17608) — confirms Bun.serve routes map does not support per-route middleware natively; routes object is read once at startup
- [JS Runtimes Have Forked in 2025: Cross-Runtime Libraries](https://debugg.ai/resources/js-runtimes-have-forked-2025-cross-runtime-libraries-node-bun-deno-edge-workers) — Bun-specific API abstraction recommendations and pitfalls
- [publint Rules](https://publint.dev/rules) — exports map validation requirements
- [TypeScript in 2025 with ESM and CJS](https://lirantal.com/blog/typescript-in-2025-with-esm-and-cjs-npm-publishing) — dual-publish type file requirements
- [Request Validation at the Edge: Zod Schemas, OpenAPI](https://dev.to/young_gao/request-validation-at-the-edge-zod-schemas-openapi-and-type-safe-apis-1kib) — runtime vs compile-time schema validation gap

---
*Pitfalls research for: Gravito v2.2.0 — Fast-Path Routing, Static OpenAPI, Lite Satellite, Bun-Native*
*Researched: 2026-03-30*
