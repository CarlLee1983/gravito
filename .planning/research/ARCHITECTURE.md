# Architecture Research

**Domain:** TypeScript framework DX improvements — @gravito/core public API surface
**Researched:** 2026-03-29
**Confidence:** HIGH (direct codebase analysis, 875-line barrel file read in full)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                    @gravito/core  (public API surface)               │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  index.ts (main barrel)            index.browser.ts          │    │
│  │  ~875 lines                        ~115 lines                │    │
│  │                                                              │    │
│  │  Named exports: ~80% complete                                │    │
│  │  Star exports remaining (DX pain points):                    │    │
│  │    export * from './exceptions'   → 17 exception classes     │    │
│  │    export * from './helpers/data'                            │    │
│  │    export * from './helpers/errors'                          │    │
│  │    export * from './helpers/response'                        │    │
│  │    export * from './testing'      → HttpTester, TestResponse │    │
│  │    export * from './adapters/bun/index' → 7 Bun-specific     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Sub-path exports (clean, no changes needed):                        │
│    @gravito/core/engine   @gravito/core/ffi   @gravito/core/compat   │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                    Downstream consumers (352 import sites)           │
│                                                                      │
│  packages/fortify    → AuthException (FortifyError extends it)       │
│  packages/sentinel   → AuthException + AuthenticationException       │
│  packages/cosmos     → error types                                   │
│  50+ Orbit packages  → GravitoException, Container, PlanetCore, etc  │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | DX Issue |
|-----------|---------------|----------|
| `src/index.ts` | Main public barrel (875 lines) | 6 star exports hide what is available |
| `src/index.browser.ts` | Browser-safe entry (115 lines) | Also contains `setApp` (should be internal-only) |
| `src/exceptions/index.ts` | Re-exports 17 exception classes via `export *` | Included in main barrel as `export * from './exceptions'` |
| `src/exceptions/AuthException.ts` | Abstract base for auth-domain errors | Parallel to `AuthenticationException` — two confusingly similar names |
| `src/exceptions/AuthenticationException.ts` | Concrete "unauthenticated" exception | Concrete class with identical surface to what `AuthException` subtypes do |
| `src/helpers.ts` | Aggregates helpers + re-exports `data`, `errors`, `response` | Contains `setApp` which is `@internal` but exported publicly |
| `src/PlanetCore.ts` | Defines `GravitoConfig` type | Separate from `ApplicationConfig` in `Application.ts` despite overlapping fields |
| `src/Application.ts` | Defines `ApplicationConfig` | `logger`, `config`, `env` overlap with `GravitoConfig` |
| `src/testing/` | `HttpTester`, `TestResponse` | Pulled into main barrel via `export * from './testing'` |
| `src/adapters/bun/index.ts` | 7 Bun-specific classes | Pulled into main barrel via `export * from './adapters/bun/index'` |
| `src/Container.ts` | DI container | `Container.make()` returns `any` — inference gap |

## Recommended Project Structure

The existing structure is sound. No file moves needed. All DX improvements are
API surface changes (what gets exported and how) and type-level changes.

```
packages/core/src/
├── index.ts                    # MODIFY: convert 6 star exports to named exports
├── index.browser.ts            # MODIFY: remove setApp from exports
│
├── exceptions/
│   ├── index.ts                # MODIFY: convert export * to named exports
│   ├── AuthException.ts        # KEEP: abstract base used by fortify + sentinel
│   ├── AuthenticationException.ts  # KEEP or DEPRECATE: see consolidation below
│   └── [14 other exceptions]   # KEEP unchanged
│
├── helpers.ts                  # MODIFY: move setApp behind @internal guard
│   └── (setApp kept in file but not re-exported from index.ts)
│
├── PlanetCore.ts               # MODIFY: GravitoConfig type unification
│   └── GravitoConfig (expand to include ApplicationConfig fields)
│
├── Application.ts              # MODIFY: ApplicationConfig extends or re-uses GravitoConfig
│
├── Container.ts                # MODIFY: improve make() generic inference
│
├── testing/
│   └── index.ts                # NEW EXPORT: explicit named re-export list
│
└── adapters/bun/
    └── index.ts                # NEW EXPORT: explicit named re-export list
```

### Structure Rationale

- **No file moves:** 352 import sites across packages depend on existing paths. Moves risk regressions.
- **Export-only changes:** Converting `export *` to named exports in `index.ts` is backwards-compatible (existing named imports continue to work).
- **Type unification in-place:** `GravitoConfig` and `ApplicationConfig` can be unified without changing file locations — just make one extend or re-use the other.
- **setApp isolation:** Move to unexported internal use only; PlanetCore calls it internally. No consumer should call it directly.

## Architectural Patterns

### Pattern 1: Star-to-Named Export Conversion

**What:** Replace `export * from './module'` with explicit named export lists.
**When to use:** Any barrel file in public API where the module has a stable, finite set of public symbols.
**Trade-offs:** More verbose, but gives consumers precise IDE autocompletion, tree-shaking, and prevents accidental `@internal` symbol leakage.

**Example — exceptions/index.ts (current):**
```typescript
// CURRENT (star — opaque)
export * from './AuthenticationException'
export * from './AuthException'
// ... 15 more
```

**Example — exceptions/index.ts (target):**
```typescript
// TARGET (named — explicit)
export { AuthenticationException } from './AuthenticationException'
export { AuthException } from './AuthException'
export type { ExceptionOptions } from './GravitoException'
export {
  GravitoException,
  ErrorCodes,
  type ErrorCode,
} from './GravitoException'
// ... 14 more, each explicit
```

**Impact on index.ts:** The main barrel's `export * from './exceptions'` line
can remain a star export after `exceptions/index.ts` is cleaned up, OR it can
be converted to a named block for maximum clarity. Named block preferred because
it makes IDE "Go to Definition" deterministic.

### Pattern 2: Config Type Unification via Extension

**What:** `GravitoConfig` becomes the canonical config type. `ApplicationConfig`
is made to extend it (or re-use its shared fields via intersection/Pick).
**When to use:** Two config types with overlapping fields serving different
abstraction layers of the same system.
**Trade-offs:** Unification removes footgun of `logger`/`config` duplication;
slight risk of unexpected field inheritance if one config has stricter semantics.

**Example:**
```typescript
// PlanetCore.ts — GravitoConfig is the foundation
export type GravitoConfig = {
  logger?: Logger
  config?: Record<string, unknown>
  orbits?: (new () => GravitoOrbit)[] | GravitoOrbit[]
  adapter?: HttpAdapter
  container?: Container
  observability?: ObservabilityConfig
  observabilityProvider?: ObservabilityProvider
}

// Application.ts — ApplicationConfig re-uses shared fields
export interface ApplicationConfig extends Pick<GravitoConfig, 'logger' | 'config'> {
  basePath: string
  configPath?: string
  providersPath?: string
  env?: 'development' | 'production' | 'testing'
  providers?: ServiceProvider[]
  autoDiscoverProviders?: boolean
}
```

This is backwards-compatible — all existing `ApplicationConfig` fields survive.

### Pattern 3: @internal Symbol Hiding

**What:** Symbols marked `@internal` in JSDoc should not appear in the public
barrel's named export list. They remain in source files (for intra-package use)
but are not re-exported from `index.ts`.
**When to use:** Any utility that is framework-internal bootstrapping glue
(`setApp`, `resetRuntimeAdapter`).
**Trade-offs:** Breaking change if any consumer was calling `setApp` directly
(unlikely — its sole caller is `PlanetCore.boot()`). Mitigated with deprecation
notice in patch release before removal.

**Implementation:**
```typescript
// helpers.ts — setApp stays in the file (PlanetCore.ts imports it directly)
/** @internal — do not use outside @gravito/core */
export function setApp(core: PlanetCore | null): void { ... }

// index.ts — REMOVE setApp from the exported list
export {
  Arr, abort, abortIf, abortUnless, app, blank, config,
  DumpDieError, dd, dump, env, filled, hasApp, logger, router,
  Str, /* setApp REMOVED */ tap, throwIf, throwUnless, value,
} from './helpers'
```

`index.browser.ts` also exports `setApp` — remove it from that barrel too.

### Pattern 4: Exception Class Consolidation (JSDoc-Only)

**What:** `AuthException` (abstract) and `AuthenticationException` (concrete)
serve different roles but their similar names cause confusion.

Current reality:
- `AuthException` = abstract base class, used by `fortify` and `sentinel` via extension
- `AuthenticationException` = concrete "401 unauthenticated" class, used by `sentinel` directly

Consolidation strategy — **rename, not remove** (backwards-compatible):
- Keep `AuthException` as-is (downstream packages extend it — cannot remove without breaking)
- Keep `AuthenticationException` as-is (sentinel imports it directly)
- Add JSDoc to each class explicitly documenting their role difference
- Add `@deprecated` alias pattern if desired (no new alias needed — the naming is the only issue)

No file deletion required. The consolidation is documentation plus JSDoc clarification.

### Pattern 5: Container.make() Type Inference Improvement

**What:** Replace `any` return type on `Container.make()` with generic inference.
**When to use:** DI containers where service keys map to known types.
**Trade-offs:** Full type inference requires a ServiceMap generic on Container,
which is a moderate API surface change. Lighter approach: overload signatures
for specific known keys.

**Example (lighter approach — no breaking change):**
```typescript
// Container.ts
export class Container {
  make<K extends keyof ServiceMap>(key: K): ServiceMap[K]
  make(key: string): unknown  // fallback for unknown keys
  make(key: string): unknown {
    // implementation
  }
}
```

**Example (heavier approach — generic Container):**
```typescript
export class Container<TServices extends Record<string, unknown> = Record<string, unknown>> {
  make<K extends keyof TServices>(key: K): TServices[K]
}
```
The heavier approach is the correct long-term pattern but requires updating
all `new Container()` call sites to provide a type parameter — a broader refactor
best done as a dedicated phase.

## Data Flow

### Export Resolution Flow (Current — Problematic)

```
Consumer: import { AuthException } from '@gravito/core'
    |
    v
index.ts: export * from './exceptions'
    |
    v
exceptions/index.ts: export * from './AuthException'
                     export * from './AuthenticationException'   <-- ambiguous hop
    |
    v
AuthException.ts: export abstract class AuthException
AuthenticationException.ts: export class AuthenticationException
```

Problem: IDE cannot distinguish the two without reading both files. "Go to
Definition" lands on `exceptions/index.ts` then requires a second hop.

### Export Resolution Flow (Target — Named)

```
Consumer: import { AuthException } from '@gravito/core'
    |
    v
index.ts: export { AuthException, AuthenticationException, ... } from './exceptions'
    |
    v
exceptions/index.ts: export { AuthException } from './AuthException'
                     export { AuthenticationException } from './AuthenticationException'
    |
    v
Direct file: IDE resolves in one hop. Clear separation visible.
```

### Config Unification Flow

```
CURRENT (two parallel types — confusion):
  PlanetCore.boot(config: GravitoConfig)      config.logger, config.config
  new Application(options: ApplicationConfig)  options.logger, options.config

TARGET (unified base — no duplication):
  PlanetCore.boot(config: GravitoConfig)      [unchanged]
  new Application(options: ApplicationConfig)  [extends GravitoConfig shared fields]
                          |
                          v
         ApplicationConfig = { basePath, ...Pick<GravitoConfig, 'logger' | 'config'> }
```

### setApp Internal Flow

```
CURRENT (public — footgun):
  index.ts exports setApp
  Consumer can call setApp(null) and break app()

TARGET (internal — safe):
  index.ts does NOT export setApp
  PlanetCore.ts imports setApp directly: import { setApp } from './helpers'
  setApp remains functional — only export visibility changes
```

## Integration Points

### Files Modified (not created)

| File | Change Type | Backwards Compatible? |
|------|------------|----------------------|
| `packages/core/src/index.ts` | Convert 6 `export *` to named exports; remove `setApp` from helper export list | YES — named imports continue to work |
| `packages/core/src/index.browser.ts` | Remove `setApp` from helper export list; convert `export * from './events'` to named | YES |
| `packages/core/src/exceptions/index.ts` | Convert 17 `export *` to 17 named export lines | YES |
| `packages/core/src/PlanetCore.ts` | Expand `GravitoConfig` with `env` field for parity with `ApplicationConfig` | YES (additive) |
| `packages/core/src/Application.ts` | `ApplicationConfig` extends/picks from `GravitoConfig` | YES if field types match |
| `packages/core/src/Container.ts` | Overload `make()` for better inference | YES if overload is additive |
| `packages/core/src/exceptions/AuthException.ts` | JSDoc clarification only | YES (no runtime change) |
| `packages/core/src/exceptions/AuthenticationException.ts` | JSDoc clarification only | YES (no runtime change) |

### Files NOT Modified (downstream consumers)

| Package | Why Untouched |
|---------|--------------|
| `packages/fortify/src/errors/FortifyError.ts` | `import { AuthException }` continues to resolve correctly |
| `packages/sentinel/src/errors/SentinelError.ts` | `import { AuthException, ExceptionOptions }` continues to resolve correctly |
| `packages/sentinel/src/AuthManager.ts` | `import { AuthenticationException }` continues to resolve correctly |
| All 50+ Orbit packages | Named exports from `@gravito/core` are additive — no breakage |

### Internal Boundaries Affected

| Boundary | Current Communication | Post-DX |
|----------|-----------------------|---------|
| `index.ts` → `exceptions/` | Star export (opaque) | Named export block (explicit) |
| `index.ts` → `helpers` | Includes `setApp` (footgun) | `setApp` removed from public list |
| `index.ts` → `testing/` | Star export (leaks test internals) | Named: `HttpTester`, `TestResponse` |
| `index.ts` → `adapters/bun/` | Star export (leaks 7 classes) | Named: explicit list of public API |
| `Application.ts` <-> `PlanetCore.ts` | Two independent config types | `ApplicationConfig` references `GravitoConfig` fields |
| `PlanetCore.ts` → `helpers` | Internal import of `setApp` | Same — import path unchanged |

## Build Order

The DX improvements have no circular dependency risk. Recommended execution order:

```
Phase 1: exceptions/index.ts  (isolated, no downstream risk)
    |
Phase 2: helpers / setApp removal from index.ts + index.browser.ts
    |
Phase 3: testing/* and adapters/bun/* named exports in index.ts
    |
Phase 4: GravitoConfig / ApplicationConfig unification
    |
Phase 5: Container.make() inference improvement
    |
Phase 6: AuthException / AuthenticationException JSDoc clarification
    |
Phase 7: Full typecheck + test run (bun run typecheck && bun test)
```

**Rationale for ordering:**
- Phases 1-3 are pure export-surface changes. Zero runtime behavior change. Run `bun run typecheck` between each phase.
- Phase 4 modifies type definitions consumed by Application.ts — must come after phases 1-3 are stable to avoid compounding errors.
- Phase 5 changes Container generics — highest risk of cascade type errors across all 50+ packages that use `Container`. Do last before verification.
- Phase 6 is documentation-only and can be done at any point, but placed last to avoid disrupting structural changes.
- Phase 7 is the verification gate: `bun run typecheck && bun test`.

## Anti-Patterns

### Anti-Pattern 1: Removing AuthException to Eliminate Name Confusion

**What people do:** See two similar names and delete the abstract base, forcing
all subtypes to extend `DomainException` directly.
**Why it's wrong:** `FortifyError extends AuthException` and `SentinelError extends AuthException`
across two separate packages. Removing `AuthException` is a breaking change to
the public API of those packages. The `instanceof AuthException` check in
consumer code would also break.
**Do this instead:** Improve JSDoc on both classes to explain the role split.
`AuthException` = "abstract category base for auth-domain exceptions".
`AuthenticationException` = "concrete 401 Unauthenticated response exception".

### Anti-Pattern 2: Using `export * as namespace` for All Sub-modules

**What people do:** Convert all `export *` to `export * as namespace` to avoid
name collisions.
**Why it's wrong:** The `engine` namespace export is intentional because
`@gravito/core/engine` is a documented sub-path used for direct Bun-only
performance work. Using namespaces for `exceptions` or `helpers` would break
all consumer code that does `import { GravitoException } from '@gravito/core'`.
**Do this instead:** Named exports at the barrel level. Namespaces only where
there is a deliberate "module boundary" sub-path export in `package.json`.

### Anti-Pattern 3: Merging GravitoConfig and ApplicationConfig into One Type

**What people do:** Merge both types into a single `GravitoConfig` because
they share fields.
**Why it's wrong:** `PlanetCore` and `Application` serve different use cases.
`Application` has `basePath`, `providersPath`, `autoDiscoverProviders` which
are enterprise filesystem concerns that `PlanetCore` deliberately does not have.
Collapsing them forces `PlanetCore` users to provide filesystem paths.
**Do this instead:** `ApplicationConfig extends Pick<GravitoConfig, ...>` — shared
fields are typed once in `GravitoConfig`, `ApplicationConfig` adds its own fields.

### Anti-Pattern 4: Converting the Events Star Export

**What people do:** Convert `export * from './events'` in browser entry to named
exports and discover that `events/` has 20+ symbols.
**Why it's wrong:** `events/` intentionally has a broad API (queue, circuit breaker,
worker pool, backpressure, etc.). This is a legitimate grouping, not a DX problem.
**Do this instead:** Leave `export * from './events'` as-is in both barrels.
The DX problem is in `exceptions/`, `helpers/`, `testing/`, `adapters/bun/` — not events.

### Anti-Pattern 5: Suppressing the setApp Type Error with @ts-ignore

**What people do:** When removing setApp from the public barrel causes a type error
in a test or usage file, silence it with `@ts-ignore`.
**Why it's wrong:** `@ts-ignore` is banned by the codebase's TypeScript strict rules.
**Do this instead:** Audit `grep -rn "setApp"` before removing. The only known
caller is `PlanetCore.ts` itself which imports directly from `./helpers`, not from
the public barrel. Confirm zero external callers before removing.

## Scaling Considerations

This is a public API refactor, not a runtime scale concern. Risk surface:

| Risk | Scope | Mitigation |
|------|-------|------------|
| Type errors after named export conversion | 352 import sites | Run `bun run typecheck` after each phase |
| `instanceof AuthException` breaks if class removed | fortify + sentinel | Do not remove — only clarify via JSDoc |
| `setApp` callers outside core | Consumer packages | `grep -rn "setApp"` audit before removal |
| `Container.make()` overload cascade errors | 50+ packages using Container | Last phase + full typecheck gate |
| `index.browser.ts` diverges from `index.ts` | Browser consumers | Mirror every change in both barrels |

## Sources

- Direct codebase analysis: `packages/core/src/index.ts` (875 lines, full read 2026-03-29)
- Direct codebase analysis: `packages/core/src/exceptions/index.ts`, `AuthException.ts`, `AuthenticationException.ts`
- Direct codebase analysis: `packages/fortify/src/errors/FortifyError.ts`, `packages/sentinel/src/errors/SentinelError.ts`
- Direct codebase analysis: `packages/core/src/PlanetCore.ts` (GravitoConfig type), `packages/core/src/Application.ts` (ApplicationConfig type)
- Direct codebase analysis: `packages/core/package.json` (exports map)
- Import count: 352 files importing from `@gravito/core` (confirmed via grep)
- Confidence: HIGH — all findings from live source, no training-data inference

---
*Architecture research for: @gravito/core DX improvements (v2.1.0)*
*Researched: 2026-03-29*
