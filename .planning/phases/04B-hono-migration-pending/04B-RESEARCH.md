# Phase 4B: Hono Migration Planning — Research

**Researched:** 2026-03-26
**Domain:** Framework Migration Planning — Hono dependency removal, backwards compatibility architecture, package sequencing
**Confidence:** HIGH (based on direct codebase inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 Migration Scope:** Comprehensive framework migration — all 64 core packages align with Hono patterns and architecture. This is not just swapping Hono for old HTTP engine; it's architectural reorganization.
- **D-02 Backwards Compatibility:** Strict backwards compatibility with gradual deprecation. New Hono APIs exposed alongside old APIs; old APIs delegated to new implementations; deprecation warnings added in v2.x; removal in v3.x. No breaking changes in Phase 4B planning.
- **D-03 Phasing Strategy:** Incremental migration by package (not all-at-once). Foundation first (photon/luminosity HTTP layer) → core modules (atlas, signal, stream) → utilities. Gate after each package: full integration test + no regressions.
- **D-04 Test Coverage:** Extend existing test suite with parallel new tests (full duplication). Keep all existing tests running; add new tests for Hono implementations side-by-side. No tests removed during migration.

### Claude's Discretion

- Package migration order within foundation layer
- Compatibility layer implementation details (facade, delegation, etc.)
- E2E test additions for critical user journeys
- Rollback strategy for individual phases

### Deferred Ideas (OUT OF SCOPE)

- E2E test framework expansion (Phase 5)
- Performance optimization and benchmarking (Phase 6)
- Breaking changes planning for v2.0 (post-Phase 4B discovery)
- Satellite migration — RBAC/Catalog/Commerce (Phase 5)
- Documentation rewrite (Phase 4B-N task additions, not separate phase)
</user_constraints>

---

## Summary

Phase 4B is a **planning exercise**, not execution. The goal is to produce an execution roadmap for removing Hono dependency from the framework. Critically, this research reveals that most of this work is **already partially done**: `@gravito/core` and `@gravito/photon` have undergone significant Hono removal work (commits 5843541c, 5ef114c6, 7b64c8b0 from memory log). The current state is a **halfway migration**, with native BunNativeAdapter fully functional and Hono only remaining as a compat shim layer.

The actual Hono removal scope is far smaller than "64 core packages." Only **3 production source files** outside of photon have active Hono imports, and photon's Hono references are isolated to **12 compat shim files** that are already marked `@deprecated v2.0 — Hono compatibility layer, will be removed`. The core engine (`BunNativeAdapter`, `RadixRouter`, `GravitoEngineAdapter`) is already Hono-free.

**Primary recommendation:** Phase 4B execution should focus on photon's 12 compat shim files and 3 external production files (beam, mass). This is a focused 2-3 week effort, not a 2-3 month one. The planner should scope accordingly.

---

## Current State Assessment (CRITICAL for Planning)

### What is Already Native (Hono-Free)

| Package | Status | Evidence |
|---------|--------|---------|
| `@gravito/core` | NATIVE — no Hono imports | `BunNativeAdapter`, `RadixRouter`, `GravitoEngineAdapter` use zero Hono |
| `@gravito/photon` (main) | NATIVE — `photon.ts`, all middleware | `photon.ts` wraps `BunNativeAdapter` directly |
| `@gravito/atlas` | NATIVE — pure DB/ORM | No Hono dependency in package.json or source |
| `@gravito/signal` | NATIVE — pure mail/event bus | No Hono dependency |
| `@gravito/stream` | NATIVE — pure queue system | No Hono dependency |
| `@gravito/luminosity` | NATIVE — pure SEO/routing | Only depends on `@gravito/core` |

### What Still Has Hono (Compat Shim Layer)

**Photon compat shim files (all marked `@deprecated v2.0`):**

| File | Hono Usage | Migration Path |
|------|-----------|----------------|
| `src/bun.ts` | `export * from 'hono/bun'` | Replace with native Bun equivalents or remove |
| `src/client.ts` | `export * from 'hono/client'` | Replace with native RPC client |
| `src/http-exception.ts` | `export * from 'hono/http-exception'` | Replace with `@gravito/core` HTTP exception |
| `src/jwt.ts` | `require('hono/jwt')` | Replace with native JWT implementation |
| `src/logger.ts` | `export * from 'hono/logger'` | Replace with native logger |
| `src/router/reg-exp-router.ts` | `export * from 'hono/router/reg-exp-router'` | Remove or wrap native |
| `src/router/trie-router.ts` | `export * from 'hono/router/trie-router'` | Remove or wrap native |
| `src/adapter/cloudflare.ts` | `export * from 'hono/cloudflare-workers'` | Keep or native impl |
| `src/adapter/deno.ts` | `export * from 'hono/deno'` | Keep or native impl |
| `src/adapter/vercel.ts` | `export * from 'hono/vercel'` | Keep or native impl |
| `src/middleware/websocket.ts` | `WSContext, defineWebSocketHelper from 'hono/ws'` | Use `websocket-native.ts` |
| `src/openapi.ts` | `OpenAPIHono from '@hono/zod-openapi'` | Use `@hono/zod-openapi` or custom |

**External packages with production Hono imports:**

| Package | File | Hono Usage | Complexity |
|---------|------|-----------|------------|
| `@gravito/beam` | `src/index.ts`, `src/helpers.ts` | `type Hono` for generic typing of RPC client | LOW — type-only |
| `@gravito/mass` | `src/coercion.ts` | `type Context as HonoContext` for `.native` cast | LOW — type-only |
| `@gravito/zenith` | `package.json` (dependency) | Hono `^4.12.2` in production deps | MEDIUM — check actual usage |

### Packages That Depend on Photon (Will Be Affected by Photon Changes)

The following 21 packages have `@gravito/photon` as a dependency and may be affected when photon's exports change:

`beam`, `constellation`, `cosmos`, `forge`, `fortify`, `impulse`, `ion`, `luminosity-adapter-photon`, `mass`, `monitor`, `nebula`, `prism`, `pulsar`, `resilience`, `sentinel`, `site`, `spectrum`, `stasis`, `zenith` + photon itself

**Key insight:** Most of these packages only import `Photon`, `GravitoContext`, `GravitoMiddleware`, or `GravitoHandler` — all of which are already native types in the current version. The compat shims (`/client`, `/bun`, `/jwt`) are only used by a subset.

---

## Standard Stack

### Core (Already In Place)

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| `BunNativeAdapter` | DONE — production-ready | `@gravito/core/src/adapters/bun/` | RadixRouter, BunContext, context pooling |
| `GravitoEngineAdapter` | DONE — alternative engine | `@gravito/core/src/adapters/` | Uses `Gravito` standalone engine (Hono-compatible API) |
| `HttpAdapter` interface | DONE — complete | `@gravito/core/src/adapters/types.ts` | Full lifecycle interface |
| Native middleware | DONE | `photon/src/middleware/*-native.ts` | `sse-native.ts`, `streaming-native.ts`, `websocket-native.ts` |
| Compat layer | PARTIAL — needs completion | `@gravito/core/src/compat.ts` | Type aliases for migration |

### Items Requiring Native Implementation

| Problem | Current Solution | Native Replacement Needed |
|---------|-----------------|--------------------------|
| JWT authentication middleware | `hono/jwt` re-export | Native JWT middleware using `jose` or Bun crypto |
| HTTP logging middleware | `hono/logger` re-export | Native request logger (can be simple) |
| HTTP exceptions | `hono/http-exception` re-export | `@gravito/core` HTTPException class |
| RPC client (`hc()`) | `hono/client` re-export | Most critical — beam depends on this for type-safe RPC |
| WebSocket | `hono/ws` types | `websocket-native.ts` already exists — just need type re-export |
| OpenAPI | `@hono/zod-openapi` | Keep dependency OR implement custom — high complexity |

### OpenAPI Special Case

`@hono/zod-openapi` provides `PhotonOpenAPI` / `OpenAPIHono` — this is the **highest complexity** compat shim to replace. Options:
1. Keep `@hono/zod-openapi` as a peer dependency (not removing Hono, but scoping it)
2. Implement a native OpenAPI generator using `@asteasolutions/zod-to-openapi` or similar
3. Deprecate `PhotonOpenAPI` and push users to use `@gravito/mass` with manual schema

**Recommendation:** Keep `@hono/zod-openapi` scoped to `@gravito/photon/openapi` path for now (Phase 4B-1). Replacement is Phase 4B-5 or later.

---

## Architecture Patterns

### Current Architecture (What Exists Today)

```
photon/src/
├── photon.ts              # NATIVE — wraps BunNativeAdapter
├── index.ts               # NATIVE — exports middleware + Photon class
├── native.ts              # NATIVE — re-exports GravitoEngineAdapter as NativePhoton
├── middleware-adapter.ts  # NATIVE — identity function (already done)
├── middleware/
│   ├── *-native.ts        # NATIVE — sse-native, streaming-native, websocket-native
│   ├── binary.ts          # NATIVE — no Hono
│   ├── circuit-breaker.ts # NATIVE — no Hono
│   ├── ratelimit*.ts      # NATIVE — no Hono
│   ├── security/          # NATIVE — all use GravitoContext
│   ├── websocket.ts       # COMPAT SHIM — re-exports from hono/ws + adapter
│   ├── streaming.ts       # NATIVE but re-exports streaming-native
│   └── sse.ts             # NATIVE but re-exports sse-native
├── adapter/
│   ├── PhotonAdapter.ts   # NATIVE — bridges Photon to HttpAdapter
│   ├── cloudflare.ts      # COMPAT SHIM — hono/cloudflare-workers
│   ├── deno.ts            # COMPAT SHIM — hono/deno
│   └── vercel.ts          # COMPAT SHIM — hono/vercel
├── bun.ts                 # COMPAT SHIM — hono/bun
├── client.ts              # COMPAT SHIM — hono/client (RPC)
├── jwt.ts                 # COMPAT SHIM — hono/jwt
├── logger.ts              # COMPAT SHIM — hono/logger
├── http-exception.ts      # COMPAT SHIM — hono/http-exception
├── openapi.ts             # COMPAT SHIM — @hono/zod-openapi
└── router/
    ├── reg-exp-router.ts  # COMPAT SHIM — hono/router/reg-exp-router
    └── trie-router.ts     # COMPAT SHIM — hono/router/trie-router
```

### Target Architecture (After Phase 4B Execution)

```
photon/src/
├── [all native files — unchanged]
├── middleware/
│   ├── websocket.ts       # UPDATED — remove hono/ws, use websocket-native types
│   └── [all others — no change needed]
├── adapter/
│   ├── cloudflare.ts      # CHOICE: keep Hono or native Bun CF Workers API
│   ├── deno.ts            # CHOICE: keep Hono or native Deno API
│   └── vercel.ts          # CHOICE: keep Hono or native Vercel API
├── bun.ts                 # UPDATED — native Bun serve helpers
├── client.ts              # UPDATED — native RPC client (hc equivalent)
├── jwt.ts                 # UPDATED — native JWT (jose/Bun crypto)
├── logger.ts              # UPDATED — native request logger
├── http-exception.ts      # UPDATED — re-export from @gravito/core
├── openapi.ts             # DEFERRED — keep @hono/zod-openapi for now
└── router/
    ├── reg-exp-router.ts  # DEPRECATE or bridge to native RadixRouter
    └── trie-router.ts     # DEPRECATE or bridge to native RadixRouter
```

### Compatibility Layer Pattern (D-02)

The pattern already in use in this codebase (confirmed by `@gravito/core/src/compat.ts`):

```typescript
// Pattern A: Type alias bridge (for type-only migrations)
// File: @gravito/core/src/compat.ts
export type {
  GravitoContext as Context,         // old: import { Context } from '@gravito/photon'
  GravitoMiddleware as MiddlewareHandler,
} from './http/types'

// Pattern B: Function delegation (for runtime migrations)
// File: src/jwt.ts (current) → becomes:
// Keep same function signature, replace implementation
export function jwt(options: JwtOptions): GravitoMiddleware {
  // Was: require('hono/jwt').jwt(options)
  // Becomes: native implementation using jose
  return async (ctx, next) => {
    // ... native JWT validation
  }
}

// Pattern C: Re-export bridge (for module re-exports)
// File: src/http-exception.ts (current) → becomes:
// Was: export * from 'hono/http-exception'
// Becomes: export { HTTPException } from '@gravito/core/exceptions'
export { HTTPException } from '@gravito/core'
```

### Anti-Patterns to Avoid

- **Mass replacement**: Don't replace all 12 compat shims in one commit — gate each by tests passing
- **Breaking consumer imports**: The `/client`, `/bun`, `/jwt` sub-path imports must continue to work (D-02)
- **Removing tests before adding native equivalents**: Keep all existing tests green throughout (D-04)
- **Skipping the RPC client problem**: `beam` depends on `hono/client`'s `hc()` for type inference — this is the most architecturally significant dependency to resolve

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signing/verification | Custom HMAC | `jose` (already in ecosystem) or Bun's `Bun.CryptoHasher` | Edge cases in algorithm support, clock skew |
| HTTP logging | Custom request logger | Extend existing native logger in `monolith` package | Reinventing what exists |
| HTTP exceptions | Custom error class | Extend what `@gravito/core` already has | Consistency across ecosystem |
| RegExp/Trie router | Build new router | `RadixRouter` in `@gravito/core/src/adapters/bun/` already works | RadixRouter is production-tested with 11K+ tests passing |
| RPC type inference | Build from scratch | Keep `hono/client` as type-only dependency | Hono's `hc()` type inference is deeply integrated into `beam` |

**Key insight:** The RPC client (`hono/client`) is the **hardest dependency to remove** because `beam`'s type-safe RPC is fundamentally built around Hono's type inference system. Phase 4B planning should explicitly acknowledge that `hono/client` may remain as a **type-only dependency** even in v2.0 — until a native RPC type system is designed.

---

## Common Pitfalls

### Pitfall 1: Conflating "Hono Migration" with "Hono Removal"
**What goes wrong:** Plans assume all Hono references must be removed. In reality, `@hono/zod-openapi`, `hono/client` type inference, and WebSocket helpers provide significant value and have no drop-in native replacements.
**Why it happens:** The phase goal says "comprehensive migration" but doesn't distinguish strategic keeps from necessary replacements.
**How to avoid:** Categorize each Hono dependency as: (A) Remove — has native replacement, (B) Replace with alternative library, (C) Isolate — keep but restrict to sub-path, (D) Defer.
**Warning signs:** Planning phases that include "remove hono/client" without identifying what beam will use instead.

### Pitfall 2: Breaking the Beam RPC Type System
**What goes wrong:** If `@gravito/photon/client` stops exporting Hono's `hc()`, the `@gravito/beam` package's `createBeam<T>` function breaks at the TypeScript type level.
**Why it happens:** `beam`'s generic `createBeam<T extends Hono<any, any, any>>` is fundamentally coupled to Hono's App type.
**How to avoid:** Plan `beam` migration as a separate sub-phase after a native RPC client type system is designed. Keep `hono/client` as a type-only dependency until then.
**Warning signs:** Any plan that says "remove hono from beam's source" without specifying what replaces the `Hono<any, any, any>` type constraint.

### Pitfall 3: Underestimating the OpenAPI Dependency
**What goes wrong:** `PhotonOpenAPI` extends `OpenAPIHono` directly. Replacing this requires either a full OpenAPI generator or keeping the dependency.
**Why it happens:** OpenAPI spec generation with typed routes is non-trivial.
**How to avoid:** Classify `@hono/zod-openapi` as a "scoped keep" — move it to a separate `@gravito/photon/openapi` sub-package that explicitly depends on Hono.
**Warning signs:** Any phase that attempts to remove `@hono/zod-openapi` without a replacement.

### Pitfall 4: Test Count Regression During Migration
**What goes wrong:** Photon currently has 215 passing tests. Compat shim tests verify old API shapes (e.g., `it('re-exports hono/bun helpers')`). Removing shims requires updating these tests simultaneously.
**Why it happens:** Existing test suite verifies Hono API parity, not just behavior.
**How to avoid:** Apply D-04 strictly — before removing any compat shim, add a new test verifying the native replacement provides the same behavior.
**Warning signs:** Photon test count dropping below 215 mid-migration without explicit accounting.

### Pitfall 5: Mass Package Hidden Hono Dependency
**What goes wrong:** `mass/src/coercion.ts` uses `HonoContext` type as a cast target for `ctx.native` access — this will silently fail if the native context type changes.
**Why it happens:** The escape hatch `ctx.native` bypasses the abstraction layer.
**How to avoid:** Replace the `HonoContext` type cast with `GravitoContext` (which `ctx.native` should return in the native adapter).
**Warning signs:** TypeScript errors in mass package after photon migration.

---

## Phase Sequencing Analysis

Based on dependency analysis, the optimal migration order is:

### Recommended Migration Order

**Phase 4B-1: Photon Compat Shims — Easy Replacements (1 week)**
Target: Replace compat shims that have clear, low-risk native equivalents.

| Shim | Replacement | Risk |
|------|-------------|------|
| `http-exception.ts` | Re-export from `@gravito/core` | LOW — type-only |
| `router/reg-exp-router.ts` | Deprecate + forward to RadixRouter | LOW |
| `router/trie-router.ts` | Deprecate + forward to RadixRouter | LOW |
| `logger.ts` | Native request logger (20 lines) | LOW |
| `middleware/websocket.ts` | Use `websocket-native.ts` types | LOW — already implemented |

**Phase 4B-2: Photon JWT Native (1 week)**
Target: Replace `jwt.ts` Hono shim with native JWT using `jose`.

| Task | Complexity |
|------|-----------|
| Implement `jwt()` middleware using `jose` | MEDIUM |
| Maintain same function signature + options API | MEDIUM |
| Keep tests passing (existing JWT tests pass with `bun test`) | MEDIUM |

**Phase 4B-3: Fix mass and beam Type Dependencies (0.5 week)**
Target: Remove `HonoContext` type usage from mass; assess beam's RPC situation.

| Package | Change | Risk |
|---------|--------|------|
| `mass/coercion.ts` | Replace `HonoContext` cast with `GravitoContext` | LOW — type only |
| `beam/index.ts`, `beam/helpers.ts` | Assess feasibility of removing `Hono` generic type | HIGH — may need to keep |

**Phase 4B-4: Platform Adapters Decision (0.5 week)**
Target: Decide whether Cloudflare/Deno/Vercel adapters keep Hono re-exports or get native replacements.

| Adapter | Recommendation |
|---------|---------------|
| `cloudflare.ts` | Keep Hono CF adapter — Hono's CF integration is best-in-class |
| `vercel.ts` | Keep Hono Vercel adapter — same rationale |
| `deno.ts` | Keep Hono Deno adapter — same rationale |

**Rationale:** For platform adapters, the value Hono provides (correct event format normalization) is hard to replace. Consider scoping these into an `@gravito/photon/adapters` sub-package that explicitly declares Hono as a peer dependency.

**Phase 4B-5: RPC Client Strategy (1 week)**
Target: Decide on `hono/client` and `beam`'s type system.

Options:
1. Keep `hono/client` as type-only dependency forever — beam continues working
2. Build native RPC type system — high effort, not in scope for Phase 4B

**Recommendation:** Keep `hono/client` as a type-only peerDependency in photon. Beam migrates to `@gravito/beam/client` that re-exports `hc` from `hono/client`. Mark as `@deprecated` with removal target v3.0.

**Phase 4B-6: OpenAPI Scoping (0.5 week)**
Target: Move `@hono/zod-openapi` from main dependency to `openapi` sub-path only.

- Ensure `@hono/zod-openapi` is only needed when importing `@gravito/photon/openapi`
- Update `package.json` to mark as optional peer dependency
- Add JSDoc note that OpenAPI path has explicit Hono dependency

---

## Package Dependency Graph (Migration Relevant)

```
Foundation (Hono-free TODAY):
  @gravito/core          ← no Hono
  @gravito/atlas         ← no Hono
  @gravito/signal        ← no Hono
  @gravito/stream        ← no Hono
  @gravito/luminosity    ← no Hono (only core)

Partial (has compat shims):
  @gravito/photon        ← Hono in 12 compat files only
                           Main class + middleware = NATIVE

Type-only Hono references:
  @gravito/beam          ← type Hono (for RPC generics)
  @gravito/mass          ← type HonoContext (for native cast)

Full Hono dependency:
  @gravito/zenith        ← Hono in package.json (check actual usage)

Downstream (affected by photon API changes):
  21 packages depend on @gravito/photon
  Most only use: Photon, GravitoContext, GravitoMiddleware (all NATIVE)
```

---

## Code Examples

### Existing Pattern — Compat Shim (to be replaced)

```typescript
// Current: packages/photon/src/http-exception.ts
// @deprecated v2.0 - Hono compatibility layer
export * from 'hono/http-exception'
```

### Target Pattern — Native Re-export (replacement)

```typescript
// Target: packages/photon/src/http-exception.ts
// Phase 4B-1 replacement
export { HTTPException, type HTTPExceptionOptions } from '@gravito/core/exceptions'
// Keep backwards compat export shape same as hono/http-exception
```

### Existing Pattern — JWT Compat Shim

```typescript
// Current: packages/photon/src/jwt.ts
import type * as HonoJwt from 'hono/jwt'
const honoJwt = require('hono/jwt') as typeof HonoJwt
export const jwt = ensure(honoJwt.jwt, 'jwt')
```

### Target Pattern — Native JWT

```typescript
// Target: packages/photon/src/jwt.ts (Phase 4B-2)
import type { GravitoMiddleware } from '@gravito/core'
import { SignJWT, jwtVerify } from 'jose'  // or Bun.CryptoHasher

export interface JwtOptions {
  secret: string | CryptoKey
  alg?: string
  cookie?: string
}

export function jwt(options: JwtOptions): GravitoMiddleware {
  return async (ctx, next) => {
    const auth = ctx.req.header('authorization')
    // ... native implementation
    await next()
  }
}
// Keep: sign(), verify(), decode() with same signatures
```

### Existing Pattern — Mass Hono Type Cast (to fix)

```typescript
// Current: packages/mass/src/coercion.ts
import type { Context as HonoContext } from 'hono'
// ...
const honoCtx = (ctx.native || ctx) as HonoContext  // line 304
```

### Target Pattern — Native Context Cast

```typescript
// Target: packages/mass/src/coercion.ts (Phase 4B-3)
import type { GravitoContext } from '@gravito/core'
// ...
const nativeCtx = ctx as GravitoContext  // ctx IS GravitoContext already
// Or access request data directly via ctx.req methods
```

### Compatibility Layer — Dual-Export Pattern

```typescript
// Strategy for consumer backwards compatibility
// packages/photon/src/index.ts

// OLD consumers: import { HTTPException } from '@gravito/photon'
// NEW consumers: import { HTTPException } from '@gravito/core'
// Both work during v1.x

export { HTTPException } from '@gravito/core'  // native source of truth
// No need to re-export from hono anymore
```

---

## Environment Availability

Step 2.6: Phase 4B is planning-only, not execution. No external tool dependencies beyond the existing monorepo toolchain.

| Tool | Available | Version | Notes |
|------|-----------|---------|-------|
| `bun` | Yes | 1.3.10 | Primary runtime |
| `node` | Yes | v22.17.1 | Available as fallback |
| TypeScript via `bun tsc` | Yes | 5.x | Typecheck available |
| `@hono/zod-openapi` | Yes (in photon deps) | ^1.2.0 | Will remain for openapi path |
| `jose` | Check | — | May need to add for native JWT |

---

## Validation Architecture

`nyquist_validation` not explicitly set to `false` in config.json — treat as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `bun:test` (bun native test runner) |
| Config file | No central config — per-package `bun test` |
| Quick run command | `bun test packages/photon --timeout=10000` |
| Full suite command | `bun test --timeout=10000` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| 4B-01 | Migration roadmap with phases identified | manual | — (planning output) | N/A |
| 4B-02 | Package migration order determined | manual | — (planning output) | N/A |
| 4B-03 | Backwards compatibility strategy locked | manual | — (planning output) | N/A |
| 4B-04 | Test strategy for old+new APIs defined | manual | — (planning output) | N/A |
| 4B-05 | Risk assessment completed | manual | — (planning output) | N/A |
| 4B-06 | Phase 4B-1 execution plan ready | unit | `bun test packages/photon` | Existing ✅ |

### Phase 4B-1 Execution Test Map (for planner)

| Behavior | Test File | Command |
|----------|-----------|---------|
| Existing photon API still works | `packages/photon/tests/exports.test.ts` | `bun test packages/photon/tests/exports.test.ts` |
| JWT still signs/verifies | `packages/photon/tests/exports.test.ts` (jwt section) | Same |
| Security middleware works | `packages/photon/tests/middleware-*.test.ts` | `bun test packages/photon` |
| Mass validation still works | `packages/mass/tests/` | `bun test packages/mass` |
| No TypeScript errors | — | `bun run typecheck` (83 packages) |

### Wave 0 Gaps

None for Phase 4B planning itself. For Phase 4B-1 execution, the following test file additions will be needed:

- [ ] `packages/photon/tests/hono/http-exception.hono.test.ts` — verifies native HTTPException matches hono/http-exception API
- [ ] `packages/photon/tests/compat/http-exception-compat.test.ts` — verifies old consumers still work

---

## Open Questions

1. **Beam RPC Type System**
   - What we know: `beam`'s `createBeam<T extends Hono<any, any, any>>` is tightly coupled to Hono's App type for inference
   - What's unclear: Whether a Gravito-native type system can replicate the `hc()` inference depth
   - Recommendation: Treat as deferred to v3.0 planning; keep `hono/client` as a type-only peerDependency in photon

2. **Zenith's Direct Hono Dependency**
   - What we know: `@gravito/zenith/package.json` has `"hono": "^4.12.2"` as a production dependency
   - What's unclear: Whether zenith's TypeScript source actually imports from Hono (grepping found no imports)
   - Recommendation: Verify if this is a leftover dependency from an earlier version; if so, remove it

3. **Platform Adapter Strategy**
   - What we know: Cloudflare/Deno/Vercel adapters in photon re-export Hono's platform adapters
   - What's unclear: Whether target deployments actually use these paths, or if they're legacy
   - Recommendation: Keep as optional `@deprecated` paths; not worth replacing until there's confirmed demand

4. **OpenAPI Path**
   - What we know: `PhotonOpenAPI extends OpenAPIHono` — deep inheritance from Hono
   - What's unclear: How many packages in the ecosystem actually use `@gravito/photon/openapi`
   - Recommendation: Keep `@hono/zod-openapi` as explicit dependency of the `/openapi` sub-path; gate its removal until a Zod-native OpenAPI generator is evaluated

---

## Project Constraints (from CLAUDE.md)

Directives that constrain planning:

1. **TypeScript strict mode** — `noUnusedLocals` + `noUnusedParameters` — all new native implementations must have zero unused variables
2. **No `@ts-ignore`** without explanatory comment — cannot use escape hatches during migration
3. **Satellite isolation** — Satellite packages not in scope for Phase 4B (per D-01: core packages only)
4. **No circular dependencies** — pre-push hook validates; adding new workspace dependencies between packages must be verified
5. **Code style** — 100 chars wide, 2-space indent, single quotes, no semicolons, ES5 trailing commas
6. **Commit messages in English** — `feat: [photon] Remove hono/http-exception compat shim`
7. **Immutability** — new implementations must not mutate objects
8. **Functions < 50 lines** — native JWT, logger, etc. implementations must be extracted into small functions
9. **Health score target** — must maintain ≥90/100 (Phase 4A baseline: 93/100, D-02 constraint: ≥90/100)
10. **ESM/CJS consistency** — if esmNaming is customized, `buildCJSStub` third param must match

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Photon was a thin Hono wrapper | Photon wraps `BunNativeAdapter` (zero Hono) | Commits 5843541c–7b64c8b0 (Phase 2-3 from MEMORY.md) | Main HTTP path is already Hono-free |
| All middleware used Hono Context | Middleware uses `GravitoContext` | Phase 2-3 | Security, rate-limit, binary etc. are all native |
| No native WebSocket | `websocket-native.ts` exists | Phase 2-3 | WebSocket only needs type shim cleanup |
| Hono was in `@gravito/core` | Core is zero-Hono | Phase 2-3 | Foundation layer is clean |

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `packages/photon/src/` full file scan
- `packages/photon/package.json` — verified Hono dependencies
- `packages/core/src/adapters/` — verified BunNativeAdapter, GravitoEngineAdapter
- `packages/core/src/http/types.ts` — verified GravitoContext interface
- `MEMORY.md` project memory — Phase 2-3 Hono removal commits documented

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — Phase 4A results, health score 93/100
- `.planning/DECISION_SUMMARY.md` — D-05/D-06 migration readiness criteria
- `.planning/codebase/ARCHITECTURE.md` — Galaxy Architecture layer documentation

### Tertiary (LOW confidence)
- WebSearch: Hono v4 migration guide — confirmed no breaking changes in v4.12.x branch
- WebSearch: Hono RPC `hc()` — confirmed deep type-inference coupling with Hono App type

---

## Metadata

**Confidence breakdown:**
- Current state analysis: HIGH — direct codebase inspection, file-by-file
- Phase sequencing: HIGH — based on verified dependency graph
- Compat shim migration paths: HIGH — all 12 shims identified with replacement strategies
- RPC client strategy: MEDIUM — architectural complexity noted, recommendation is conservative
- OpenAPI replacement: MEDIUM — complexity acknowledged, deferred recommendation made

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable codebase, 30-day window)
