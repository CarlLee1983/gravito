# Phase 29: Lite Satellite - Research

**Researched:** 2026-03-31
**Domain:** PlanetCore plugin system — collision detection, boot() integration, dev-mode exception patterns
**Confidence:** HIGH

## Summary

Phase 29 is a hardening phase, not a greenfield feature. The foundational Lite Satellite API (`PlanetCore.plugin()`, `Container.singletonInline()`, `GravitoOrbit` interface with `name?`/`dependencies?`) was fully implemented during Phase 28. What remains is: (1) collision detection in `plugin()` and `singletonInline()`, (2) routing plain objects through `plugin()` in `PlanetCore.boot()` instead of directly calling `orbit.install()`, and (3) comprehensive test coverage for all edge cases.

The work scope is small (~60-80 lines of production code across 2-3 files) but must be precise. The collision detection must follow the established Phase 28 pattern: `process.env.NODE_ENV !== 'production'` guard with `SystemException` subclass throw in dev mode and `logger.warn()` fallback in production. A new `ContainerBindingCollisionException` class must be created following the exact structural pattern of `MiddlewareDriftException`.

The `boot()` integration is a one-liner discrimination heuristic: if the item from `config.orbits` is a plain object (not a function/constructor) AND has a `name` property, route it through `await core.plugin(orbit)` instead of `await orbit.install(core)`. This preserves backward compatibility entirely.

**Primary recommendation:** Build `ContainerBindingCollisionException` first, add collision checks to `plugin()` and `singletonInline()` second, update `boot()` third, then expand tests. Three focused tasks.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Two-layer collision protection — both `plugin()` layer (name collision) and `Container.singletonInline()` layer (key collision)
- **D-02:** Dev-only throw — collision detection throws `SystemException('CONTAINER_BINDING_COLLISION')` only in dev mode. Production silently warns via logger.warn, does not crash.
- **D-03:** plugin() layer checks `installedOrbits` array for duplicate Lite Satellite names (reuses existing tracking mechanism)
- **D-04:** Container layer checks `has(namespacedKey)` in `singletonInline()` before binding. If key already exists, throws in dev mode.
- **D-05:** `PlanetCore.boot()` auto-routes plain objects with `name` property through `core.plugin()` flow (including collision checks and namespace tracking), rather than directly calling `orbit.install(core)`
- **D-06:** Discrimination heuristic: plain object + has `name` property → `plugin()` flow. Constructor or class instance → existing `orbit()` flow. Backward compatible.
- **D-07:** Direct object literal — no `definePlugin()` helper. Usage: `orbits: [PhotonOrbit, { name: 'ping', install(core) { ... } }]`
- **D-08:** Both collision types use `SystemException('CONTAINER_BINDING_COLLISION')` — consistent with `MiddlewareDriftException` pattern from Phase 28
- **D-09:** Error messages include conflict source info:
  - plugin() layer: `"Lite Satellite name 'ping' already registered"`
  - Container layer: `"Binding 'inline:ping:cache' already registered by plugin 'ping-v1'"`
- **D-10:** plugin() layer name collision uses same `CONTAINER_BINDING_COLLISION` error code (not a separate code), consistent with Container layer

### Claude's Discretion

- Implementation details for dev-mode detection (how to check if running in dev mode)
- Exact error message wording and formatting
- Test structure and organization

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DX-03 | Developer can define Lite Satellite as object literal in `gravito.config.ts` with single `install(core)` hook, without requiring full directory structure or ServiceProvider class | `plugin()` already accepts object literals; `boot()` integration + collision detection completes the requirement |
</phase_requirements>

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@gravito/core` (internal) | workspace | PlanetCore, Container, exceptions | Project's own framework |
| `bun:test` | Bun built-in | Test runner | Established in all existing core tests |

No new npm packages required. This phase is pure TypeScript modifications to existing files.

**Version verification:** No external packages to verify.

## Architecture Patterns

### Exception Class Pattern (from Phase 28)

All `SystemException` subclasses in `packages/core/src/exceptions/` follow this exact pattern:

```typescript
// Source: packages/core/src/exceptions/MiddlewareDriftException.ts
import { type ExceptionOptions } from './GravitoException'
import { SystemException } from './SystemException'

export class ContainerBindingCollisionException extends SystemException {
  constructor(message: string, options: Omit<ExceptionOptions, 'message'> = {}) {
    super(500, 'system.container_binding_collision', { ...options, message })
    this.name = 'ContainerBindingCollisionException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
```

Key structural requirements:
- HTTP status: 500 (all system exceptions use 500)
- Error code: snake_case string with `system.` prefix
- `this.name` assignment required for proper `instanceof` checks
- `Object.setPrototypeOf(this, new.target.prototype)` required for prototype chain correctness across transpilation

### Dev-Mode Guard Pattern (from Phase 28)

The canonical dev-mode detection in this codebase:

```typescript
// Source: packages/core/src/adapters/bun/BunNativeAdapter.ts line 50
if (process.env.NODE_ENV !== 'production') {
  throw new SomeSystemException('message')
}
```

This is the established pattern. The alternative `Application.isDevelopment()` method is only available when using the `Application` class wrapper, not in `PlanetCore` or `Container` directly. Use `process.env.NODE_ENV !== 'production'` in both locations.

### Collision Check in singletonInline()

```typescript
// To be added to packages/core/src/Container.ts
singletonInline<T>(namespace: string, key: string, factory: Factory<T>): void {
  const namespacedKey = `inline:${namespace}:${key}`
  if (this.has(namespacedKey)) {
    if (process.env.NODE_ENV !== 'production') {
      throw new ContainerBindingCollisionException(
        `Binding '${namespacedKey}' already registered by plugin '${namespace}'`
      )
    }
    // Production: warn but do not overwrite (silent skip)
    // Note: Container has no logger — use console.warn (biome-ignore required)
    // biome-ignore lint/suspicious/noConsole: Container has no Logger dependency
    console.warn(`[gravito] Binding '${namespacedKey}' collision detected — skipping duplicate registration.`)
    return
  }
  this.singleton(namespacedKey, factory)
}
```

**Important:** `Container` has NO `logger` dependency (by design — it's the root of the DI tree). In production, use `console.warn` with `biome-ignore` comment, same pattern as the existing `console.warn` in `make()` for request-scoped services outside context.

### Collision Check in plugin()

```typescript
// To be added to packages/core/src/PlanetCore.ts plugin() method
async plugin(config: GravitoOrbit): Promise<this> {
  if (!config.name) {
    throw new Error('plugin(): Lite Satellites require a "name" property ...')
  }

  // Collision check (D-03)
  const alreadyRegistered = this.installedOrbits.some(o => o.name === config.name)
  if (alreadyRegistered) {
    if (process.env.NODE_ENV !== 'production') {
      throw new ContainerBindingCollisionException(
        `Lite Satellite name '${config.name}' already registered`
      )
    }
    this.logger.warn(`[gravito] Lite Satellite '${config.name}' already registered — skipping duplicate installation.`)
    return this
  }

  this.logger.debug(`Installing Lite Satellite: ${config.name}`)
  this.installedOrbits.push({
    name: config.name,
    dependencies: config.dependencies || [],
  })
  await config.install(this)
  return this
}
```

### boot() Discrimination Heuristic (D-05, D-06)

```typescript
// Target: packages/core/src/PlanetCore.ts boot() method, lines 881-893
if (config.orbits) {
  for (const OrbitClassOrInstance of config.orbits) {
    // D-06: plain object with name → plugin() flow; constructor → existing orbit() flow
    if (typeof OrbitClassOrInstance !== 'function' && OrbitClassOrInstance.name) {
      await core.plugin(OrbitClassOrInstance)
    } else {
      let orbit: GravitoOrbit
      if (typeof OrbitClassOrInstance === 'function') {
        orbit = new (OrbitClassOrInstance as new () => GravitoOrbit)()
      } else {
        orbit = OrbitClassOrInstance
      }
      await orbit.install(core)
    }
  }
}
```

**Note on backward compatibility:** Plain objects WITHOUT `name` (e.g., anonymous orbit objects) still fall through to `await orbit.install(core)` — they do NOT get collision protection but also do NOT break. This is intentional per D-06.

### Recommended Project Structure (new files)

```
packages/core/src/exceptions/
└── ContainerBindingCollisionException.ts    # New — follows MiddlewareDriftException pattern

packages/core/src/exceptions/index.ts       # Modified — add export
packages/core/src/index.ts                  # Modified — verify ContainerBindingCollisionException is exported
packages/core/src/Container.ts              # Modified — singletonInline() collision check
packages/core/src/PlanetCore.ts             # Modified — plugin() collision + boot() discrimination
packages/core/tests/lite-satellite.test.ts  # Modified — expand from 3 to comprehensive coverage
```

### Anti-Patterns to Avoid

- **Adding Logger to Container:** Container is intentionally logger-free (root of DI, no circular deps). Use `console.warn` with biome-ignore for production path.
- **Separate error codes for each collision type:** D-10 mandates unified `system.container_binding_collision` for both layers.
- **Overwriting on collision:** D-02 says production silently SKIPS (warns only), not overwrites.
- **Routing ALL orbit objects through plugin():** Only plain objects with `name` → `plugin()`. Class instances without `name` fall through as before.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Exception class | Custom Error subclass | `SystemException` subclass pattern | Consistent with framework exception hierarchy, proper prototype chain, i18n support |
| Dev-mode detection | Custom env helper | `process.env.NODE_ENV !== 'production'` directly | Established pattern in codebase (BunNativeAdapter.ts line 50) |
| Collision storage | Separate collision registry | `installedOrbits` array + `container.has()` | Both already exist, zero new state needed |

**Key insight:** Everything needed already exists. This phase is assembly, not invention.

## Common Pitfalls

### Pitfall 1: Container Pollution in Production Path

**What goes wrong:** Developer writes `logger.warn()` in `singletonInline()` but `Container` has no `logger`.
**Why it happens:** `Container` is the root of the DI tree — adding a logger creates a circular dependency.
**How to avoid:** Use `console.warn` with `// biome-ignore lint/suspicious/noConsole: Container has no Logger dependency` — same approach as the existing warning in `make()` method (line ~231).
**Warning signs:** TypeScript error `Property 'logger' does not exist on type 'Container'`.

### Pitfall 2: boot() Breaks Plain Orbit Objects Without Name

**What goes wrong:** Discrimination routes ALL non-function items to `plugin()`, but some orbit objects may not have `name`.
**Why it happens:** `GravitoOrbit.name` is optional (`name?`).
**How to avoid:** The condition MUST be `typeof item !== 'function' && item.name` (both checks). Objects without `name` must continue through the old `orbit.install(core)` path.
**Warning signs:** Existing orbit integration tests fail.

### Pitfall 3: installedOrbits Mutation vs Immutability

**What goes wrong:** Direct push to `installedOrbits` mutates the array in place.
**Why it happens:** `installedOrbits` is declared as `public readonly` array — the array reference is immutable but contents can be pushed.
**How to avoid:** This is the EXISTING pattern (plugin() already uses `this.installedOrbits.push()`). The coding standard "no mutation" applies to data objects, not tracked registries. Continue using push() — it is consistent with current implementation.
**Warning signs:** None — this is intentional.

### Pitfall 4: Missing export chain for ContainerBindingCollisionException

**What goes wrong:** New exception class created but not exported from `packages/core/src/index.ts`.
**Why it happens:** Two-step export chain: file → `exceptions/index.ts` → `src/index.ts`.
**How to avoid:** Add `export * from './ContainerBindingCollisionException'` to `exceptions/index.ts`. Then verify `index.ts` exports `from './exceptions'` (it already does via the catch-all).
**Warning signs:** TypeScript consumers can't import the exception; tests must import directly from file path.

### Pitfall 5: Test Isolation — installedOrbits Persists Across Tests

**What goes wrong:** Tests reuse the same `PlanetCore` instance and a previous test's `installedOrbits` bleeds into the next test.
**Why it happens:** `installedOrbits` is an instance-level array that accumulates state.
**How to avoid:** Create a fresh `new PlanetCore()` in each test case. The existing 3 tests already do this correctly — maintain the pattern.
**Warning signs:** Collision tests pass in isolation but fail when the full suite runs.

## Code Examples

### Minimal ContainerBindingCollisionException

```typescript
// Source: Derived from packages/core/src/exceptions/MiddlewareDriftException.ts pattern
// File: packages/core/src/exceptions/ContainerBindingCollisionException.ts
import { type ExceptionOptions } from './GravitoException'
import { SystemException } from './SystemException'

/**
 * Thrown when a Lite Satellite name or container binding key is registered more than once.
 * In dev mode, this throws. In production, the framework warns and skips.
 * @public
 */
export class ContainerBindingCollisionException extends SystemException {
  constructor(message: string, options: Omit<ExceptionOptions, 'message'> = {}) {
    super(500, 'system.container_binding_collision', { ...options, message })
    this.name = 'ContainerBindingCollisionException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
```

### Test Cases to Implement

Beyond the 3 existing tests, these scenarios need coverage:

```typescript
// File: packages/core/tests/lite-satellite.test.ts (additions)

describe('Collision Detection', () => {
  test('plugin() throws CONTAINER_BINDING_COLLISION when same name registered twice (dev mode)', async () => {
    process.env.NODE_ENV = 'development'
    const core = new PlanetCore()
    await core.plugin({ name: 'ping', install() {} })
    await expect(core.plugin({ name: 'ping', install() {} }))
      .rejects.toThrow(ContainerBindingCollisionException)
  })

  test('plugin() warns but does not throw in production when name collides', async () => {
    const original = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const core = new PlanetCore()
    await core.plugin({ name: 'ping', install() {} })
    await expect(core.plugin({ name: 'ping', install() {} })).resolves.not.toThrow()
    process.env.NODE_ENV = original
  })

  test('singletonInline throws CONTAINER_BINDING_COLLISION on duplicate key (dev mode)', () => {
    process.env.NODE_ENV = 'development'
    const core = new PlanetCore()
    core.container.singletonInline('ping', 'cache', () => ({}))
    expect(() => core.container.singletonInline('ping', 'cache', () => ({}))).toThrow(
      ContainerBindingCollisionException
    )
  })
})

describe('boot() Integration', () => {
  test('boot() routes plain object with name through plugin() flow', async () => {
    let installed = false
    const core = await PlanetCore.boot({
      orbits: [{ name: 'ping', install() { installed = true } }]
    })
    expect(installed).toBe(true)
    expect(core.installedOrbits.some(o => o.name === 'ping')).toBe(true)
  })

  test('boot() collision detection works end-to-end via orbits array', async () => {
    process.env.NODE_ENV = 'development'
    const plugin = { name: 'ping', install() {} }
    await expect(PlanetCore.boot({ orbits: [plugin, plugin] }))
      .rejects.toThrow(ContainerBindingCollisionException)
  })
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full ServiceProvider class required | Object literal with `install(core)` hook | Phase 28 pre-implemented | DX-03 near-complete |
| `boot()` calls `orbit.install()` directly | `boot()` discriminates plain-object-with-name → `plugin()` | Phase 29 (this phase) | Enables auto-collision-check for boot-time registration |
| No collision protection | Two-layer guard: name + key | Phase 29 (this phase) | Prevents silent duplicate registrations |

**Not yet implemented:**
- `ContainerBindingCollisionException` class (does not exist — must be created)
- Collision check in `plugin()` (method exists but no duplicate name guard)
- Collision check in `singletonInline()` (method exists but no `has()` check)
- Discrimination logic in `boot()` (direct `orbit.install()` call, no routing)

## Open Questions

1. **Container production-path logger**
   - What we know: `Container` has no logger. `console.warn` with biome-ignore is the established pattern.
   - What's unclear: Should production collision skip entirely or still register the second binding?
   - Recommendation: Skip (don't overwrite) — preserves first-registered wins semantics. `logger.warn` in `PlanetCore.plugin()` is fine since `PlanetCore` has access to `this.logger`.

2. **NODE_ENV in test environment**
   - What we know: Bun test runner doesn't set `NODE_ENV` to `production` by default.
   - What's unclear: Current default value of `NODE_ENV` in `bun test`.
   - Recommendation: Tests that need dev-mode behavior should explicitly set `process.env.NODE_ENV = 'development'` and restore after. Tests for production path set to `'production'` and restore.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — pure TypeScript modifications to existing packages)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bun:test (Bun built-in) |
| Config file | packages/core/package.json `"test": "bun test"` |
| Quick run command | `cd packages/core && bun test tests/lite-satellite.test.ts` |
| Full suite command | `cd packages/core && bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DX-03-A | Object literal in boot() registers routes | unit | `bun test tests/lite-satellite.test.ts` | Partial (3 tests exist, boot() path missing) |
| DX-03-B | Inline bindings namespaced under `inline:<name>:` | unit | `bun test tests/lite-satellite.test.ts` | Partial (basic test exists) |
| DX-03-C | Collision throws `CONTAINER_BINDING_COLLISION` in dev | unit | `bun test tests/lite-satellite.test.ts` | Missing — Wave 0 gap |
| DX-03-D | `PlanetCore.plugin()` accepts object literal and integrates into boot() | integration | `bun test tests/lite-satellite.test.ts` | Missing — Wave 0 gap |

### Sampling Rate

- **Per task commit:** `cd packages/core && bun test tests/lite-satellite.test.ts`
- **Per wave merge:** `cd packages/core && bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] Expand `packages/core/tests/lite-satellite.test.ts` — covers DX-03-C, DX-03-D (collision + boot integration)
- [ ] Create `packages/core/src/exceptions/ContainerBindingCollisionException.ts` — required before collision tests can import it
- [ ] Add export in `packages/core/src/exceptions/index.ts`

## Sources

### Primary (HIGH confidence)

- Direct source inspection: `packages/core/src/PlanetCore.ts` §743-758, §868-896 — exact current state of `plugin()` and `boot()`
- Direct source inspection: `packages/core/src/Container.ts` §140-143 — `singletonInline()` implementation
- Direct source inspection: `packages/core/src/adapters/bun/BunNativeAdapter.ts` §50-55 — canonical dev-mode guard pattern
- Direct source inspection: `packages/core/src/exceptions/MiddlewareDriftException.ts` — canonical `SystemException` subclass pattern
- Direct source inspection: `packages/core/tests/lite-satellite.test.ts` — existing 3 test cases

### Secondary (MEDIUM confidence)

- CONTEXT.md decisions D-01 through D-10 — locked implementation decisions from user discussion

### Tertiary (LOW confidence)

None.

## Project Constraints (from CLAUDE.md)

- **TypeScript strict mode:** `noUnusedLocals` and `noUnusedParameters` enabled — all variables must be used
- **No `@ts-ignore`:** Forbidden unless annotated with explanation comment
- **No circular dependencies:** Pre-push hook checks — avoid by design
- **Code style:** 100-char width, 2-space indent, single quotes, no semicolons, ES5 trailing commas
- **Commit messages:** English, conventional format e.g. `feat: [core] Add ContainerBindingCollisionException`
- **Immutability:** Create new objects, never mutate (exception: `installedOrbits.push()` is existing tracked-registry pattern)
- **No console.log:** Only `console.warn` with biome-ignore allowed in logger-free contexts
- **Target coverage:** 75%+ per CLAUDE.md (core package tests)
- **biome lint compliance:** All files pass `bun run check` before commit

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, existing codebase fully inspected
- Architecture: HIGH — all integration points read from source, all patterns verified
- Pitfalls: HIGH — derived from actual code inspection, not assumptions
- Test gaps: HIGH — existing test file read, gaps identified by absence

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable internal framework, no external dependencies)
