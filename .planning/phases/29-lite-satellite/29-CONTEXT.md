# Phase 29: Lite Satellite - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Developer can define a Lite Satellite as an object literal in `gravito.config.ts` with a single `install(core)` hook, without creating a directory structure or ServiceProvider class. Inline plugin service bindings are namespaced under `inline:<name>:` prefix with collision detection.

**Scope reduction note:** Most foundational API (`PlanetCore.plugin()`, `Container.singletonInline()`, `GravitoOrbit` interface with `name?`/`dependencies?`) was pre-implemented during Phase 28. This phase focuses on: collision detection, `boot()` integration, and comprehensive testing.

</domain>

<decisions>
## Implementation Decisions

### Collision Detection Strategy
- **D-01:** Two-layer collision protection — both `plugin()` layer (name collision) and `Container.singletonInline()` layer (key collision)
- **D-02:** Dev-only throw — collision detection throws `SystemException('CONTAINER_BINDING_COLLISION')` only in dev mode. Production silently warns via logger.warn, does not crash.
- **D-03:** plugin() layer checks `installedOrbits` array for duplicate Lite Satellite names (reuses existing tracking mechanism)
- **D-04:** Container layer checks `has(namespacedKey)` in `singletonInline()` before binding. If key already exists, throws in dev mode.

### boot() Integration
- **D-05:** `PlanetCore.boot()` auto-routes plain objects with `name` property through `core.plugin()` flow (including collision checks and namespace tracking), rather than directly calling `orbit.install(core)`
- **D-06:** Discrimination heuristic: plain object + has `name` property → `plugin()` flow. Constructor or class instance → existing `orbit()` flow. Backward compatible.

### gravito.config.ts Usage
- **D-07:** Direct object literal — no `definePlugin()` helper. Usage: `orbits: [PhotonOrbit, { name: 'ping', install(core) { ... } }]`

### Error Message Design
- **D-08:** Both collision types use `SystemException('CONTAINER_BINDING_COLLISION')` — consistent with `MiddlewareDriftException` pattern from Phase 28
- **D-09:** Error messages include conflict source info:
  - plugin() layer: `"Lite Satellite name 'ping' already registered"`
  - Container layer: `"Binding 'inline:ping:cache' already registered by plugin 'ping-v1'"`
- **D-10:** plugin() layer name collision uses same `CONTAINER_BINDING_COLLISION` error code (not a separate code), consistent with Container layer

### Claude's Discretion
- Implementation details for dev-mode detection (how to check if running in dev mode)
- Exact error message wording and formatting
- Test structure and organization

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Implementation (already exists)
- `packages/core/src/PlanetCore.ts` §743-758 — Existing `plugin()` method with name validation and `installedOrbits` tracking
- `packages/core/src/PlanetCore.ts` §868-896 — `boot()` method that needs inline object routing
- `packages/core/src/PlanetCore.ts` §78-94 — `GravitoOrbit` interface with `name?` and `dependencies?`
- `packages/core/src/Container.ts` §126-143 — `singletonInline()` with `inline:<name>:<key>` namespacing

### Prior Phase Patterns
- `packages/core/src/Route.ts` — `MiddlewareDriftException` pattern (Phase 28) — reference for `SystemException` usage in dev-only context

### Existing Tests
- `packages/core/tests/lite-satellite.test.ts` — 3 existing tests covering basic plugin registration and name validation

### Requirements
- `.planning/REQUIREMENTS.md` §DX-03 — Lite Satellite requirement definition

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PlanetCore.plugin()`: Already implements name validation, logging, `installedOrbits` push, and `install()` call
- `Container.singletonInline()`: Already implements `inline:<name>:<key>` namespacing via delegation to `singleton()`
- `installedOrbits` array: Already tracks `{ name, dependencies }` for all registered orbits/plugins
- `GravitoOrbit` interface: Already supports `name?` and `dependencies?` optional properties
- `SystemException` pattern: Used by `MiddlewareDriftException` in Phase 28 for dev-only throwing

### Established Patterns
- Dev-mode detection: Check `process.env.NODE_ENV !== 'production'` or similar (verify existing pattern in codebase)
- Exception hierarchy: `SystemException` extends `GravitoException` — used for framework internal errors
- Immutable patterns: All state changes must create new objects (per coding standards)

### Integration Points
- `PlanetCore.boot()` line 882-893: Loop over `config.orbits` — needs conditional routing to `plugin()` for plain objects with `name`
- `Container.singletonInline()`: Needs collision check before `this.singleton()` call
- `PlanetCore.plugin()`: Needs collision check against `installedOrbits` before proceeding

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Key insight: this phase is primarily about hardening existing pre-implemented API with collision protection and proper `boot()` integration, not building from scratch.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-lite-satellite*
*Context gathered: 2026-03-31*
