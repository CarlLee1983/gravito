# Project Research Summary

**Project:** Gravito Core v2.2.0 — Performance Bypass, DX Agility, Bun-Native Integration
**Domain:** TypeScript Framework — Bun-native modular server framework (Galaxy Architecture)
**Researched:** 2026-03-30
**Confidence:** HIGH

## Executive Summary

Gravito v2.2.0 is an evolution milestone on top of a stable, production-ready v2.1.0 framework. The codebase already ships a Bun-native HTTP engine (`Gravito` + `AOTRouter`), a full middleware pipeline, a modular Satellite/Orbit system, Zod validation, typed IoC container, and OpenAPI runtime generation. This milestone is not greenfield work — it is targeted augmentation of five specific capability gaps: fast-path routing bypass, static OpenAPI generation, Lite Satellite inline plugins, Bun-native API abstractions, and a dependency graph CLI tool.

The recommended approach is additive and zero-surprise. Only two new external dependencies are needed (`ts-json-schema-generator ^2.9.0` for static TS interface analysis, and `madge ^8.0.0` if not already installed), and all other capabilities are implemented via Bun built-ins and existing framework primitives. Architecture research confirms this is achievable with approximately 210 lines of new code across four new files (`FastPathRegistry`, `InlineOrbit`, `NativeOrbitDetector`, `SatelliteContractExtractor`) and targeted modifications to six existing files. The `@gravito/astral` work (static OpenAPI) is fully decoupled from `@gravito/core` changes and can be developed in parallel.

The top risks are not implementation complexity — they are correctness traps that are invisible during development but dangerous in production. The critical one: fast-path handlers silently bypass auth and observability middleware if the boot order is wrong. This must be enforced as a Day 1 design constraint with an integration test that asserts a protected fast-path route returns 401, not 200, without credentials. A secondary risk is OpenAPI contract drift when Zod schemas and `AstralResource` declarations are maintained separately. Both risks have known mitigations and can be eliminated with upfront API design constraints and one CI test each.

## Key Findings

### Recommended Stack

The v2.1.0 stack (Bun runtime, Biome, Turbo, Zod 4, bun-types, mitata, publint, TypeDoc) is unchanged and fully validated. For v2.2.0, all new capabilities use zero new runtime dependencies. The only net-new additions are two dev-time tools.

**Core technologies:**
- `ts-json-schema-generator ^2.9.0` (devDependency in `@gravito/openapi-gen`): static OpenAPI generation from TypeScript interfaces — chosen over `tsoa` (requires decorators), Zod-first alternatives, and raw TypeScript Compiler API (500+ LOC rewrite). MIT license, TypeScript 5.x compatible, programmatic API confirmed via GitHub README.
- `madge ^8.0.0` (root devDependency, likely already installed): dependency graph visualization — referenced in existing CLAUDE.md troubleshooting scripts. Verify with `cat package.json | grep madge` before adding.
- `Bun.CryptoHasher`, `Bun.Glob`, `Bun.password` (zero install): all Bun built-ins, accessed through the existing `RuntimeAdapter` abstraction layer. Never called directly in Orbit source — always via `getDefaultRuntimeAdapter()` or `getRuntimeKind() === 'bun'` guard.
- `bun:test` (zero install): shared test utilities to be consolidated in a new `@gravito/testing` package, eliminating per-package mock reimplementation (mock PlanetCore, mock GravitoContext, mock Container).
- `FastPathRegistry`, `InlineOrbit`, `NativeOrbitDetector`, `SatelliteContractExtractor` (internal only): new files in `@gravito/core` and `@gravito/astral`, zero external deps.

### Expected Features

**Must have (table stakes — required to deliver the v2.2.0 performance/DX narrative):**
- Fast-path route registration API (`adapter.fastPathRoute()`) — any Bun-native performance framework must expose a bypass for high-frequency ops routes (health, metrics, ping)
- `Bun.password` natively called in Sentinel — audit `adapter-bun.ts`; if falling through to bcrypt it is 10-50x slower and misses argon2id native support
- `Bun.CryptoHasher` for non-password hashing — verify detection path in `Hasher.ts`
- Boot-time native capability report — surfaces which Bun APIs are active vs fallback at startup; builds production trust

**Should have (genuine differentiators vs ElysiaJS/Hono):**
- Inline Lite Satellite in `gravito.config.ts` — zero-boilerplate plugin for <5 routes; ElysiaJS and Fastify have equivalent patterns; Gravito uniquely enforces install-only lifecycle (no two-phase register/boot in inline form)
- Static OpenAPI generation CLI (`gravito openapi:generate`) — emits static `openapi.json` at build time; neither ElysiaJS nor Hono generates a static CI artifact; this is a genuine ecosystem differentiator
- Dependency graph visualization (`gravito deps:graph`) — no TypeScript framework ships this first-party; reuses existing madge scripts with application-level Orbit/Satellite awareness

**Defer (v3+ or separate milestone):**
- Runtime OpenAPI spec regeneration on every request — anti-pattern; adds O(n) latency per request; in-memory cache is correct approach
- Inline Satellite with full two-phase lifecycle (register + boot + Signal emit/subscribe) — initialization order hazard; single `install(core)` hook is the safe design constraint
- Removing Node.js compatibility layers entirely — breaks 38 packages and violates multi-runtime goal; keep Bun as hot path, Node/Deno fallback with capability warning at boot
- Auto-generate OpenAPI from plain TypeScript interfaces (no Zod) — requires build-time compiler plugin, adds significant toolchain complexity; require Zod schemas for OpenAPI output

### Architecture Approach

The Galaxy Architecture (PlanetCore micro-kernel, Orbits, Satellites) is unchanged. v2.2.0 adds three parallel capability layers: a `FastPathRegistry` sibling to `AOTRouter` (pre-compiled bypass handlers fed directly into `Bun.serve routes:{}`), a `SatelliteContractExtractor` in `@gravito/astral` (CI-friendly OpenAPI generation without booting PlanetCore), and a `NativeOrbitDetector` utility called once in the `PlanetCore` constructor (cached Bun capability flags available to all Orbits during `install()`). The `InlineOrbit` class bridges the Lite Satellite DX into the existing `GravitoOrbit.install()` contract with no new concepts.

All four additions respect existing boundaries: `FastPathRegistry` is not merged into `AOTRouter` (single responsibility), `SatelliteContractExtractor` has zero side effects (no `Bun.serve`, no `atlas` connection), inline plugins are forbidden from emitting Signal events or extending `ServiceMap`, and all Bun API access remains inside `adapter-bun.ts`.

**New components (total ~210 LOC):**
1. `FastPathRegistry` (`core/engine/FastPathRegistry.ts`, ~30 lines) — typed `Map<string, BunHandler>`; consumed by `Gravito.serveConfig()` to populate `Bun.serve routes:{}`
2. `InlineOrbit` (`core/InlineOrbit.ts`, ~60 lines) — implements `GravitoOrbit`; translates `InlineOrbitConfig` into `adapter.route()` and `adapter.fastPathRoute()` calls
3. `NativeOrbitDetector` (`core/runtime/NativeOrbitDetector.ts`, ~40 lines) — `detectBunCapabilities()` returning `NativeFeatures` boolean flags; called once in `PlanetCore` constructor
4. `SatelliteContractExtractor` (`astral/SatelliteContractExtractor.ts`, ~80 lines) — imports Satellite module without side effects; produces `AstralResource[]` for `OpenApiGenerator`

**Modified existing files (6 files):** `Gravito.ts`, `GravitoEngineAdapter.ts`, `PlanetCore.ts`, `OpenApiGenerator.ts`, `export-static.ts`, `core/index.ts` + `astral/index.ts` (exports)

### Critical Pitfalls

1. **Fast-path silently bypasses auth/observability middleware if boot order is wrong** — All Orbits that inject middleware must complete `install()` before `serveConfig()` is called. Enforce with a boot-order contract (document `serveConfig()` as a snapshot) and an integration test asserting 401 on a protected fast-path route without credentials. Dev-mode: emit `SystemException('FAST_PATH_MIDDLEWARE_DRIFT')` if `use()` is called after `serveConfig()` snapshot.

2. **`serveConfig()` routes map does not update after `Bun.serve()` starts** — Bun reads the `routes:` object once at startup; post-startup `route()` or `use()` calls modify in-memory router only. Document explicitly: "routes object is a snapshot; call `server.reload(gravito.serveConfig())` to reflect changes." Keep `fetch` fallback mandatory — never `undefined`.

3. **OpenAPI static contract diverges from runtime Zod schema** — Zod schemas and `AstralResource` declarations maintained separately will drift during refactoring. Enforce single source of truth: derive `AstralResource` body/response schemas from the same Zod schema object via `zodToJsonSchema`. Add CI contract test: generate spec, send valid + invalid requests, assert expected responses.

4. **Lite Satellite leaks global container registrations** — inline plugins calling `core.bind('myService', ...)` participate in the flat global namespace. Require a `namespace` string prefix (`inline:<name>:`) on all inline plugin service bindings. Add dev-mode `CONTAINER_BINDING_COLLISION` exception. Preferred constraint: inline plugins register routes only — not services.

5. **Bun API called directly without runtime guard** — `Bun.password.hash()` or `Bun.CryptoHasher` referenced outside `adapter-bun.ts` causes `ReferenceError: Bun is not defined` in Node CI and downstream packages. All Bun-native API access must go through `getDefaultRuntimeAdapter()` or a `getRuntimeKind() === 'bun'` guard. Add a Biome lint rule flagging direct `Bun.xxx` calls outside `adapter-bun.ts`.

6. **New sub-path export breaks `publint` CI gate** — Four-step checklist required: source file → build output (ESM + CJS + types) → `exports` map in `package.json` → `publint` validation. Run `bun run check` locally before push. For Lite Satellite API — keep new types in the existing `@gravito/core` barrel to avoid new sub-path exports.

## Implications for Roadmap

Architecture research provides an explicit build order based on internal dependency resolution. Five phases map cleanly to the dependency graph:

### Phase 1: Foundation Utilities — Native Detection + Registry Leaf Nodes

**Rationale:** `FastPathRegistry` and `NativeOrbitDetector` are leaf nodes with zero upstream dependencies on v2.2.0 work. Building them first unblocks every subsequent phase. `NativeOrbitDetector` also immediately delivers the P1 boot-time capability report, which audits `Bun.password` usage in Sentinel — the highest-value, lowest-risk change.
**Delivers:** `FastPathRegistry` (~30 LOC), `NativeOrbitDetector` (~40 LOC), boot-time Bun capability logging in `PlanetCore`, audit confirmation that `Bun.password` is active in Sentinel
**Addresses:** Boot-time native capability report (table stakes), `Bun.password` / `Bun.CryptoHasher` verification
**Avoids:** Pitfall 5 (direct Bun API without guard) — establishes the correct detection pattern before any Orbit code uses it
**Research flag:** Standard patterns — no research phase needed; direct codebase implementation against confirmed Bun built-in APIs

### Phase 2: Core Engine Integration — Fast-Path Routing

**Rationale:** Requires Phase 1's `FastPathRegistry`. `Gravito.fastPath()` and `GravitoEngineAdapter.fastPathRoute()` touch the active request path and must have integration test coverage before Phase 3 builds on them. This is the highest-impact performance feature of the milestone.
**Delivers:** `Gravito.fastPath()` method, `GravitoEngineAdapter.fastPathRoute()` delegation, `serveConfig()` populating `routes:{}` from registry, integration test asserting 401 on a protected fast-path route without credentials
**Implements:** Fast-Path Bypass pattern (FastPathRegistry → `Bun.serve routes:{}` → direct Response, bypassing DI context construction)
**Avoids:** Pitfall 1 (auth middleware bypass), Pitfall 2 (`serveConfig()` snapshot semantics documented and enforced)
**Research flag:** Standard patterns — architecture is fully specified; `Bun.serve routes:{}` behavior confirmed via official docs and issue #17608

### Phase 3: Lite Satellite / PlanetCore Plugin API

**Rationale:** Depends on Phase 2's `fastPathRoute()` method — `InlineOrbit` needs it to register fast routes. `PlanetCore.plugin()` is a three-line wrapper. This phase delivers the DX differentiator and unblocks prototype-speed Satellite development. Audit whether `PlanetCore.boot()` already handles plain `GravitoOrbit` objects before building.
**Delivers:** `InlineOrbit` (~60 LOC), `PlanetCore.plugin()` method, namespace enforcement for inline bindings (`inline:<name>:` prefix), `nativeFeatures` accessor on `PlanetCore`, integration tests verifying route registration and namespace collision detection
**Addresses:** Inline Lite Satellite (differentiator), `gravito.config.ts` DX
**Avoids:** Pitfall 4 (container namespace collision), Pitfall 7 (Signal event name collision from generic inline event names)
**Research flag:** Standard patterns — all primitives exist; the only uncertainty is whether `PlanetCore.boot()` already handles plain objects (audit before building)

### Phase 4: Static OpenAPI Generation

**Rationale:** `@gravito/astral` is an optional dependency of `@gravito/core` and can be developed in parallel with Phases 2-3 by a second contributor. `SatelliteContractExtractor` has no dependency on `FastPathRegistry` or `InlineOrbit`. Sequenced as Phase 4 because it is the highest complexity feature and requires the `ts-json-schema-generator` programmatic API to be validated against real Satellite contract file shapes first.
**Delivers:** `SatelliteContractExtractor` (~80 LOC), `OpenApiGenerator.generateFromContracts()` static overload, `generateStaticSite({ contracts })` alternative input, `gravito openapi:generate` CLI command emitting static `openapi.json`
**Uses:** `ts-json-schema-generator ^2.9.0` (devDependency in `@gravito/openapi-gen`)
**Implements:** Static Contract Generation pattern (CI-friendly, no server boot, no database connection)
**Avoids:** Pitfall 3 (spec/Zod schema drift — single source of truth constraint enforced in API design), anti-pattern of runtime spec regeneration per request
**Research flag:** Needs research-phase validation — `ts-json-schema-generator` programmatic API against monorepo glob paths is MEDIUM confidence; validate `createGenerator({ path: 'packages/*/src/contracts/**/*.ts', type: '*' })` against a real Satellite contract file before full implementation

### Phase 5: Exports, Tooling, and Testing Package

**Rationale:** Cleanup and consolidation. Exports cannot be finalized until all new symbols from Phases 1-4 are stable. `publint` validation prevents the class of publish bugs where consumers get `ERR_PACKAGE_PATH_NOT_EXPORTED` despite a clean build. `@gravito/testing` consolidates mock utilities duplicated across all packages.
**Delivers:** Updated `core/index.ts` and `astral/index.ts` exports, `publint` validation passing for all modified packages, `@gravito/testing` package (mock PlanetCore, mock GravitoContext, mock Container), optional `gravito deps:graph` CLI (madge-backed Orbit/Satellite coupling visualization)
**Avoids:** Pitfall 6 (publint CI gate failures on new sub-path exports)
**Research flag:** Standard patterns — no research phase needed; madge usage confirmed via existing scripts; `publint` already in CI

### Phase Ordering Rationale

- **Leaf-node-first ordering** (Phases 1-2 before 3): `FastPathRegistry` must exist before `InlineOrbit` can register fast routes, which must exist before `PlanetCore.plugin()` wraps it. Building leaf nodes first prevents rebuild cycles during iteration.
- **`@gravito/astral` decoupling** (Phase 4 parallel-capable): Static OpenAPI work has zero dependency on fast-path or inline plugin features. A second contributor can develop Phase 4 in parallel with Phases 2-3 without merge conflicts.
- **Boot-time capability report in Phase 1** (not Phase 5): Sentinel `Bun.password` audit must happen before any subsequent Bun-native work to validate that the detection foundation is correct. Deferring it to cleanup would mean building on an unverified assumption.
- **Security-critical test in Phase 2** (not Phase 5): The integration test asserting 401 on a protected fast-path route without credentials must be written in the same phase as the bypass mechanism, before any consumer of the API exists. Security constraints are not retrofit items.
- **Exports in Phase 5** (not Phase 1): New public symbols cannot be finalized until their implementations are stable. Adding exports before the API is settled causes churn in downstream type declarations.

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:
- **Phase 4 (Static OpenAPI):** Validate `ts-json-schema-generator` programmatic API against a real Satellite contract file before committing to the approach. Specifically: test that `createGenerator({ path: 'packages/*/src/contracts/**/*.ts', tsconfig: 'tsconfig.json' })` resolves correctly in a Turbo monorepo. One 30-minute spike is sufficient; if it fails, the fallback is `@asteasolutions/zod-to-openapi` (requires Zod-schema-first contract definitions instead of plain TS interfaces).

Phases with standard patterns (skip research-phase):
- **Phase 1:** Bun capability detection is direct `typeof Bun !== 'undefined'` probing — no external API uncertainty.
- **Phase 2:** Fast-path routing pattern is fully specified in architecture research; `Bun.serve routes:{}` read-once behavior confirmed via official Bun docs and community issue #17608.
- **Phase 3:** Inline plugin pattern maps directly to existing `GravitoOrbit.install()` contract — no new concepts. Audit `PlanetCore.boot()` at start of phase; delta may be smaller than expected.
- **Phase 5:** `publint` and `madge` are well-documented tools with established usage patterns in this repo.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Bun built-ins verified via official docs (2026-02-26 to 2026-03-30). `ts-json-schema-generator` v2.9.0 version confirmed via npm (MEDIUM for programmatic API behavior with monorepo globs — gap noted). `madge` existence in repo is inferred, not directly confirmed — verify before Phase 5. |
| Features | HIGH | Feature research based on direct codebase inspection of 10+ source files across `core`, `photon`, `sentinel`, `astral`, plus official ElysiaJS/Hono/Fastify documentation. Competitor feature table cross-referenced with official release notes (ElysiaJS 1.3 release blog). |
| Architecture | HIGH | Architecture research based on direct codebase inspection of all relevant engine, adapter, runtime, and astral source files. Component boundaries, integration points, and anti-patterns confirmed against actual source code state. Build order derived from actual dependency graph, not assumptions. |
| Pitfalls | HIGH | Critical pitfalls corroborated by: CVE-2025-29927 (middleware bypass vulnerability class), Bun issue #17608 (routes map read-once confirmation), and direct engine source inspection confirming `serveConfig()` snapshot behavior and `compileMiddlewareChain` timing. |

**Overall confidence:** HIGH

### Gaps to Address

- **`madge` installation status:** Run `cat package.json | grep madge` before Phase 5 planning. If already installed, no action. If absent, add to root `devDependencies`.
- **`ts-json-schema-generator` with monorepo glob paths:** Validate programmatic API behavior against a real Satellite contract file during Phase 4 kickoff. The library's `path` config accepts globs, but multi-package monorepo resolution may require explicit `tsconfig.json` path mapping. Test before full implementation — this is the highest-uncertainty technical gap in the milestone.
- **`PlanetCore.boot()` plain object handling:** FEATURES.md notes that `GravitoConfig.orbits` type already accepts `GravitoOrbit[]` objects — audit whether `PlanetCore.boot()` already handles plain objects alongside class constructors. If it does, Phase 3 `InlineOrbit` may already be partially functional without code changes, reducing phase scope.
- **`Bun.password` detection guard in `adapter-bun.ts`:** Verify `typeof Bun?.password !== 'undefined'` guard is in place at start of Phase 1. If missing, this is the first fix to make before any other work.

## Sources

### Primary (HIGH confidence)
- Bun official docs: https://bun.com/docs/runtime/hashing, https://bun.com/docs/runtime/file-io, https://bun.com/reference/bun/CryptoHasher, https://bun.com/reference/bun/password, https://bun.com/reference/bun/Glob — Bun built-in API verification (verified 2026-02-26 to 2026-03-30)
- ElysiaJS official docs: https://elysiajs.com/essential/plugin, https://elysiajs.com/essential/life-cycle, https://elysiajs.com/blog/elysia-13 — competitor feature baseline and fast-path pattern inspiration
- Fastify official docs: https://fastify.dev/docs/latest/Reference/Plugins/ — inline plugin pattern reference
- Bun GitHub issue #17608: https://github.com/oven-sh/bun/issues/17608 — confirms `routes:` map is read once at startup; middleware not supported natively
- CVE-2025-29927 analysis: https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass — fast-path auth bypass vulnerability class
- publint rules: https://publint.dev/rules — exports map validation requirements
- Gravito codebase direct inspection (2026-03-30): `packages/core/src/engine/Gravito.ts`, `AOTRouter.ts`, `GravitoEngineAdapter.ts`, `BunNativeAdapter.ts`, `PlanetCore.ts`, `security/Hasher.ts`, `runtime/detection.ts`, `packages/astral/src/OpenApiGenerator.ts`, `export-static.ts`, `packages/sentinel/src/HashManager.ts`, `packages/photon/src/photon.ts`, `examples/rest-api-demo/src/gravito.config.ts`

### Secondary (MEDIUM confidence)
- ts-json-schema-generator GitHub: https://github.com/vega/ts-json-schema-generator — programmatic API confirmed via README; v2.9.0 on npm 19 days prior to research
- madge npm: https://www.npmjs.com/package/madge — version 8 from npm page; repo usage inferred from CLAUDE.md
- asteasolutions/zod-to-openapi: https://github.com/asteasolutions/zod-to-openapi — widely cited fallback option if `ts-json-schema-generator` monorepo glob fails
- JS Runtimes Have Forked in 2025: https://debugg.ai/resources/js-runtimes-have-forked-2025-cross-runtime-libraries-node-bun-deno-edge-workers — cross-runtime abstraction recommendations

### Tertiary (LOW confidence — needs validation)
- ElysiaJS JIT Compiler: https://elysiajs.com/internal/jit-compiler — pattern reference for fast-path inspiration only; Gravito's implementation uses no code generation

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
