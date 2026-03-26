# Phase 4B: Hono Migration Roadmap

**Document Date:** 2026-03-26
**Phase Duration:** 2-3 weeks execution (6 sub-phases: 4B-1 through 4B-6)
**Based on:** Research findings from 04B-RESEARCH.md, strategic decisions D-01 through D-04
**Status:** COMPLETE — All 6 sub-phases (4B-1 through 4B-6) executed successfully (2026-03-26)

---

## 1. Executive Summary

### Current State

Gravito-Core has already undergone significant Hono dependency removal work (commits 5843541c, 5ef114c6, 7b64c8b0). The core packages `@gravito/core`, `@gravito/atlas`, `@gravito/signal`, `@gravito/stream`, and `@gravito/luminosity` are already **Hono-free** with native implementations:

- **BunNativeAdapter:** Production-ready HTTP engine with RadixRouter
- **GravitoEngineAdapter:** Alternative native engine (Hono-compatible API)
- **Native middleware:** sse-native.ts, streaming-native.ts, websocket-native.ts
- **Health baseline:** 93/100, 99.7% test pass rate, 0 TypeScript errors

### Remaining Scope

The actual Hono removal work is focused and bounded:

| Category | Count | Files/Packages | Complexity |
|----------|-------|-----------------|-----------|
| **Photon compat shim files** | 12 | bun.ts, client.ts, http-exception.ts, jwt.ts, logger.ts, router/*.ts, adapter/*.ts, middleware/websocket.ts, openapi.ts | LOW-MEDIUM |
| **External package Hono refs** | 3 | beam (type-only), mass (type-only), zenith (package.json) | LOW |
| **Affected downstream packages** | 21 | All depend on @gravito/photon; most use only native types | LOW RISK |

### Timeline & Effort

- **Not** 2-3 months (per original D-01 estimate)
- **Actual scope:** 2-3 weeks execution across 6 sequential phases
- **Reason:** Research revealed core engine already native; only compat shims remain

### Success Criteria

✓ All 12 compat shims addressed (removed/replaced/scoped)
✓ 3 external package Hono refs resolved
✓ Health score maintained ≥90/100 throughout migration
✓ Zero breaking changes to public API
✓ All existing tests pass after migration complete
✓ hono removed from photon's main production dependencies (may remain as peer dep for /openapi path)

---

## 2. Current Hono Dependency Map

### Photon Compat Shim Layer (12 files)

All marked `@deprecated v2.0 — Hono compatibility layer, will be removed`.

| File | Current Import | Purpose | Migration Action | Risk | Phase |
|------|--------|---------|------------------|------|-------|
| `src/bun.ts` | `export * from 'hono/bun'` | Hono Bun runtime re-export | Replace with native Bun serve helpers or remove | LOW | 4B-6 |
| `src/client.ts` | `export * from 'hono/client'` | RPC client (hc() type inference) | Keep as type-only peerDependency in @gravito/photon | MEDIUM | 4B-5 |
| `src/http-exception.ts` | `export * from 'hono/http-exception'` | HTTP exception types | Re-export from @gravito/core HTTPException | LOW | 4B-1 |
| `src/jwt.ts` | `require('hono/jwt')` | JWT middleware | Replace with native JWT using jose or Bun crypto | MEDIUM | 4B-2 |
| `src/logger.ts` | `export * from 'hono/logger'` | Request logging middleware | Native request logger (~20 lines) | LOW | 4B-1 |
| `src/router/reg-exp-router.ts` | `export * from 'hono/router/reg-exp-router'` | RegExp-based router | Deprecate, forward to RadixRouter | LOW | 4B-1 |
| `src/router/trie-router.ts` | `export * from 'hono/router/trie-router'` | Trie-based router | Deprecate, forward to RadixRouter | LOW | 4B-1 |
| `src/adapter/cloudflare.ts` | `export * from 'hono/cloudflare-workers'` | Cloudflare Workers runtime | Keep as @deprecated optional path | MEDIUM | 4B-4 |
| `src/adapter/deno.ts` | `export * from 'hono/deno'` | Deno runtime | Keep as @deprecated optional path | MEDIUM | 4B-4 |
| `src/adapter/vercel.ts` | `export * from 'hono/vercel'` | Vercel Edge Functions runtime | Keep as @deprecated optional path | MEDIUM | 4B-4 |
| `src/middleware/websocket.ts` | WSContext, defineWebSocketHelper from `hono/ws` | WebSocket helper types | Use websocket-native.ts types only | LOW | 4B-1 |
| `src/openapi.ts` | OpenAPIHono from `@hono/zod-openapi` | OpenAPI schema generation | Keep @hono/zod-openapi scoped to /openapi path | MEDIUM | 4B-6 |

**Summary:** 6 easy replacements (http-exception, logger, reg-exp-router, trie-router, websocket, bun) + 2 strategic keeps (cloudflare, deno, vercel adapters) + 3 complex decisions (jwt native impl, RPC type system, openapi scoping)

### External Packages with Hono References (3 packages)

| Package | File | Hono Usage | Complexity | Phase |
|---------|------|-----------|-----------|-------|
| `@gravito/beam` | `src/index.ts`, `src/helpers.ts` | `type Hono` for generic RPC client typing | LOW — type-only import | 4B-3 |
| `@gravito/mass` | `src/coercion.ts` | `type Context as HonoContext` for `.native` cast | LOW — type-only import | 4B-3 |
| `@gravito/zenith` | `package.json` | Hono `^4.12.2` in production deps | MEDIUM — verify actual usage | 4B-3 |

---

## 3. Migration Phases (6 phases)

### Phase 4B-1: Easy Compat Shim Replacements (1 week)

**Scope:** Replace 6 low-risk compat shims with clear native equivalents.

**Files Modified:**
- `src/http-exception.ts` → Re-export from @gravito/core HTTPException
- `src/logger.ts` → Native request logger (immutable, no Hono)
- `src/router/reg-exp-router.ts` → Deprecate, forward to RadixRouter
- `src/router/trie-router.ts` → Deprecate, forward to RadixRouter
- `src/middleware/websocket.ts` → Remove hono/ws import, use websocket-native.ts types

**Implementation Details:**

```typescript
// src/http-exception.ts (4B-1)
// Replace: export * from 'hono/http-exception'
export { HTTPException, type HTTPExceptionOptions } from '@gravito/core/exceptions'

// src/logger.ts (4B-1)
// Replace: export * from 'hono/logger'
import type { GravitoMiddleware } from '@gravito/core'
export function logger(): GravitoMiddleware {
  return async (ctx, next) => {
    const start = Date.now()
    await next()
    const duration = Date.now() - start
    console.log(`[${ctx.req.method}] ${ctx.req.path} ${ctx.res.status} ${duration}ms`)
  }
}

// src/router/reg-exp-router.ts (4B-1)
// Replace with deprecation notice
export { RadixRouter as RegExpRouter } from '@gravito/core/adapters/bun'
```

**Test Strategy:**
- Keep all existing router tests green
- Add new tests: `packages/photon/tests/native/http-exception.test.ts`
- Add new tests: `packages/photon/tests/native/logger.test.ts`
- Verify backwards compat: old import paths still work

**Verification Gate:**
- `bun test packages/photon --timeout=10000` — all tests pass
- `bun run typecheck` — 0 errors across all 83 packages
- `bun test packages/` | grep -E "pass|fail" — pass rate ≥99%

**Commits:** 4 commits (one per major change group)
- `feat: [photon] Replace hono/http-exception with native HTTPException`
- `feat: [photon] Implement native logger middleware`
- `feat: [photon] Deprecate hono routers, forward to RadixRouter`
- `feat: [photon] Remove hono/ws, use websocket-native types`

---

### Phase 4B-2: JWT Native Implementation (Week 1-2)

**Scope:** Replace `hono/jwt` with native JWT middleware using `jose` library.

**Requirement:** Maintain 100% API compatibility with `hono/jwt`:
- `jwt(options)` — middleware factory
- `sign(payload, secret, algo)` — sign function
- `verify(token, secret)` — verify function
- `decode(token)` — decode function

**Implementation Details:**

```typescript
// src/jwt.ts (4B-2)
import type { GravitoMiddleware } from '@gravito/core'
import { SignJWT, jwtVerify, decodeProtectedHeader } from 'jose'

export interface JwtOptions {
  secret: string | CryptoKey
  alg?: string
  cookie?: string
}

export function jwt(options: JwtOptions): GravitoMiddleware {
  return async (ctx, next) => {
    const token = extractToken(ctx, options)
    if (token) {
      try {
        const verified = await jwtVerify(token, new TextEncoder().encode(options.secret as string))
        ctx.set('jwtPayload', verified.payload)
      } catch (err) {
        return ctx.text('Unauthorized', 401)
      }
    }
    await next()
  }
}

export async function sign(payload: any, secret: string, alg = 'HS256') {
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(secret))
  return jwt
}

// verify and decode functions...
```

**Test Strategy:**
- Keep existing JWT tests: `packages/photon/tests/exports.test.ts` (jwt section)
- Add native JWT tests: `packages/photon/tests/native/jwt.test.ts`
- Verify: sign/verify round trip, token expiration, algorithm support

**Dependencies to Add:**
- `jose@^5.0.0` (if not already present)

**Verification Gate:**
- `bun test packages/photon/tests/native/jwt.test.ts` — all pass
- `bun test packages/photon --timeout=10000` — ≥215 tests pass
- `bun run typecheck` — 0 errors

**Commits:** 1-2 commits
- `feat: [photon] Implement native JWT middleware with jose`
- Optional: `test: [photon] Add native JWT test coverage`

---

### Phase 4B-3: External Package Type Cleanup (0.5 week)

**Scope:** Fix type-only Hono references in mass, beam, and zenith packages.

**Tasks:**

1. **mass/src/coercion.ts** — Replace HonoContext type cast
   ```typescript
   // Current (line 304):
   import type { Context as HonoContext } from 'hono'
   const honoCtx = (ctx.native || ctx) as HonoContext

   // Target:
   import type { GravitoContext } from '@gravito/core'
   const nativeCtx = ctx as GravitoContext
   // Or access request data directly via ctx.req methods
   ```

2. **beam/src/index.ts, beam/src/helpers.ts** — Assess RPC type system
   - Current usage: `type Hono` for generic typing of RPC client
   - Decision: Keep `hono/client` as type-only peerDependency in @gravito/photon
   - Beam will continue to use hono/client types through photon re-export
   - Add JSDoc deprecation notice: removal target v3.0

3. **zenith/package.json** — Verify Hono dependency usage
   - Grep zenith source for actual Hono imports
   - If unused: remove dependency
   - If used: document the usage and plan for native replacement

**Test Strategy:**
- `bun test packages/mass` — all tests pass
- `bun test packages/beam` — all tests pass
- `bun test packages/zenith` — all tests pass (if applicable)
- `bun run typecheck` — 0 errors across all packages

**Verification Gate:**
- No new TypeScript errors introduced
- All downstream packages still importable
- mass/beam tests pass with 100% success

**Commits:** 1-2 commits
- `fix: [mass] Replace HonoContext with GravitoContext type`
- Optional: `chore: [zenith] Remove unused hono dependency`

---

### Phase 4B-4: Platform Adapter Decision (0.5 week)

**Scope:** Decide on Cloudflare/Deno/Vercel adapters — keep as @deprecated optional paths or replace.

**Decision (per 04B-RESEARCH.md):** Keep as @deprecated optional sub-paths

**Rationale:** For platform adapters, the value Hono provides (correct event format normalization for CF Workers, Deno, Vercel) is difficult to replicate. The engineering cost of native replacements is high; demand is currently low.

**Implementation:**

```typescript
// src/adapter/cloudflare.ts (4B-4)
/**
 * @deprecated v2.0 — Hono Cloudflare Workers adapter (optional path)
 * Removal target: v3.0
 * Use: import { CloudflareAdapter } from '@gravito/photon/adapters/cloudflare'
 */
export * from 'hono/cloudflare-workers'

// Same pattern for deno.ts and vercel.ts
```

**Package.json Update:**
```json
{
  "exports": {
    "./adapters/cloudflare": {
      "import": "./dist/adapter/cloudflare.mjs",
      "require": "./dist/adapter/cloudflare.cjs",
      "types": "./dist/adapter/cloudflare.d.ts"
    },
    "./adapters/deno": { ... },
    "./adapters/vercel": { ... }
  }
}
```

**Test Strategy:**
- No test regressions required (adapters are optional paths)
- Verify: adapters still importable via sub-path imports
- Warning: Adding deprecation JSDoc doesn't change runtime behavior

**Verification Gate:**
- `import { CloudflareAdapter } from '@gravito/photon/adapters/cloudflare'` works
- No TypeScript errors
- Health score remains ≥90/100

**Commits:** 1 commit
- `docs: [photon] Mark platform adapters as @deprecated, scope to sub-paths`

---

### Phase 4B-5: RPC Client Strategy (Week 2-3)

**Scope:** Decide on `hono/client` RPC type system — keep as type-only or build native.

**Decision (per 04B-RESEARCH.md):** Keep `hono/client` as type-only peerDependency in @gravito/photon

**Rationale:** Beam's `createBeam<T extends Hono<any, any, any>>` is tightly coupled to Hono's App type for type inference. A native RPC type system would require significant architectural work (Phase 4B-6 or later, potentially v3.0 planning).

**Implementation:**

```typescript
// src/client.ts (4B-5)
/**
 * RPC client for type-safe remote procedure calls.
 * Uses Hono's hc() type inference system.
 * @deprecated v3.0 — Will be replaced with native RPC type system
 */
export { hc } from 'hono/client'

// beam/src/index.ts
/**
 * @deprecated v3.0 — Beam's RPC type system will migrate to native implementation
 * For now, continue using Hono's type inference:
 * const beam = createBeam<typeof app>(...)
 */
export function createBeam<T extends any>(router: T, options?: CreateBeamOptions) {
  // ... implementation
}
```

**Update @gravito/photon/package.json:**

```json
{
  "peerDependencies": {
    "hono": "^4.12.0"
  },
  "peerDependenciesMeta": {
    "hono": {
      "optional": true
    }
  }
}
```

**Test Strategy:**
- Keep existing beam tests green
- Add tests: `packages/beam/tests/native/rpc-type-system.test.ts`
- Verify: createBeam<T> still works with type inference

**Verification Gate:**
- `bun test packages/beam` — all tests pass
- `bun run typecheck` — 0 errors
- RPC type inference works end-to-end

**Commits:** 1 commit
- `docs: [photon] Mark hono/client as type-only dependency, target v3.0 for replacement`

---

### Phase 4B-6: OpenAPI Scoping and Final Cleanup (Week 3)

**Scope:** Scope @hono/zod-openapi to `/openapi` sub-path only; remove bun.ts; final health check.

**Implementation:**

1. **Update `src/openapi.ts`:**
   ```typescript
   /**
    * OpenAPI schema generation using Hono + Zod
    * @deprecated v2.0 — OpenAPI path has explicit Hono dependency
    * Usage: import { PhotonOpenAPI } from '@gravito/photon/openapi'
    * Removal target: v3.0 (will implement native OpenAPI generator)
    */
   export { OpenAPIHono as PhotonOpenAPI } from '@hono/zod-openapi'
   ```

2. **Update package.json exports:**
   ```json
   {
     "exports": {
       "./openapi": {
         "import": "./dist/openapi.mjs",
         "require": "./dist/openapi.cjs",
         "types": "./dist/openapi.d.ts"
       }
     }
   }
   ```

3. **Remove bun.ts or replace with native:**
   ```typescript
   // src/bun.ts (4B-6) — Option A: Remove entirely
   // Option B: Replace with native Bun serve helpers
   export function serve(handler: GravitoHandler, options?: ServeOptions) {
     return Bun.serve({
       fetch: handler,
       ...options,
     })
   }
   ```

4. **Final cleanup:**
   - Remove hono from `photon/package.json` main dependencies (keep as peer dep only)
   - Update `photon/README.md` with migration notice
   - Verify all sub-path exports work: `/jwt`, `/client`, `/openapi`, `/adapters/*`

**Test Strategy:**
- `bun test packages/photon --timeout=10000` — all tests pass
- `bun test packages/` | grep -E "pass|fail" — pass rate ≥99%
- `bun run typecheck` — 0 errors
- Verify: `import { PhotonOpenAPI } from '@gravito/photon/openapi'` works
- Verify: sub-path imports don't leak into main exports

**Verification Gate:**
- Health score ≥90/100 (target 93/100 baseline)
- 0 TypeScript errors
- All 21 downstream packages still import from photon without issues
- Test pass rate ≥99.7% (Phase 4A baseline)

**Commits:** 2-3 commits
- `feat: [photon] Scope @hono/zod-openapi to /openapi sub-path`
- `feat: [photon] Replace hono/bun with native Bun serve helpers`
- `chore: [photon] Remove hono from main dependencies, mark as peer dep`

---

## 4. Wave Structure for Parallel Execution

This structure allows phases to be executed with some parallelism while respecting dependencies.

```
Wave 1: Phase 4B-1 (2-3 days)
  └─ Easy compat shims (http-exception, logger, routers, websocket)
     Gate: photon tests pass, typecheck 0 errors

       ↓

Wave 2: Phase 4B-2 (3-4 days) + Phase 4B-3 (1-2 days) [PARALLEL]
  ├─ Phase 4B-2: JWT native implementation
  │  └─ Depends on: 4B-1 photon types stable
  │     Gate: JWT tests pass, typecheck 0 errors
  │
  └─ Phase 4B-3: External package type cleanup (mass, beam, zenith)
     └─ Depends on: 4B-1 photon types stable
        Gate: mass/beam/zenith tests pass, typecheck 0 errors

       ↓

Wave 3: Phase 4B-4 (1-2 days) + Phase 4B-5 (1-2 days) [PARALLEL]
  ├─ Phase 4B-4: Platform adapter decisions
  │  └─ Depends on: 4B-2, 4B-3 complete
  │     Gate: No regressions, health ≥90/100
  │
  └─ Phase 4B-5: RPC client strategy
     └─ Depends on: 4B-3 beam assessment complete
        Gate: beam tests pass, RPC types inferred correctly

       ↓

Wave 4: Phase 4B-6 (2-3 days)
  └─ OpenAPI scoping + final cleanup
     └─ Depends on: 4B-1, 4B-2, 4B-3, 4B-4, 4B-5 complete
        Gate: Health score ≥90/100, typecheck 0 errors, 99.7% test pass rate
```

**Total estimated duration:** 2-3 weeks (10-15 working days)
- Sequential minimum: 1 + 4 + 2 + 3 = 10 days
- Realistic (accounting for debugging): 2-3 weeks

---

## 5. Backwards Compatibility Strategy

Per D-02: Strict backwards compatibility with gradual deprecation over 3 major versions.

### Pattern A: Type Alias Bridge (for type-only migrations)

**Use case:** mass/beam Hono type imports

```typescript
// OLD: import type { Context as HonoContext } from 'hono'
// NEW: import type { GravitoContext } from '@gravito/core'

// Compatibility shim (if needed):
export type Context = GravitoContext  // Old name still works
```

**Timeline:**
- v1.x: Both names available
- v2.x: Add `@deprecated` JSDoc on old name
- v3.x: Remove old type alias

### Pattern B: Function Delegation (for runtime migrations)

**Use case:** jwt, logger middleware replacements

```typescript
// OLD implementation:
// export * from 'hono/jwt'

// NEW implementation (v1.x):
export function jwt(options: JwtOptions): GravitoMiddleware {
  // native implementation
}

// Keep same function signature, so old code still works:
// import { jwt } from '@gravito/photon'  ← still works
```

**Timeline:**
- v1.x: New native implementation, same function signature
- v2.x: Add `@deprecated` JSDoc + removal notice
- v3.x: Remove entirely, require `npm install jose` separately

### Pattern C: Re-export Bridge (for module re-exports)

**Use case:** http-exception, router replacements

```typescript
// OLD: export * from 'hono/http-exception'
// NEW: export { HTTPException } from '@gravito/core'

// Result: Old import paths continue to work
import { HTTPException } from '@gravito/photon'  // ← works in v1.x, v2.x, removal in v3.x
```

**Timeline:**
- v1.x: Re-export from new source (same API shape)
- v2.x: Add deprecation notice in package README
- v3.x: Remove re-export

### Pattern D: Sub-path Scoping (for optional features)

**Use case:** openapi, platform adapters

```typescript
// packages/photon/package.json
{
  "exports": {
    "./openapi": "./dist/openapi.mjs",
    "./adapters/cloudflare": "./dist/adapter/cloudflare.mjs"
  }
}

// Usage:
import { PhotonOpenAPI } from '@gravito/photon/openapi'     // ← explicit Hono dependency
import { CloudflareAdapter } from '@gravito/photon/adapters/cloudflare'  // ← deprecated
```

**Timeline:**
- v1.x: Sub-path available (may import Hono)
- v2.x: Mark as `@deprecated` in JSDoc
- v3.x: Remove sub-path entirely (users must install hono separately or use alternative)

### Verification: Breaking Changes Policy (D-02)

**✗ NOT ALLOWED during Phase 4B-1 through 4B-6:**
- Removing old export paths
- Changing function signatures
- Removing backwards-compatible type aliases
- Breaking changes require explicit v2.0 planning (separate phase)

**✓ ALLOWED during Phase 4B:**
- Adding new implementations alongside old ones
- Adding `@deprecated` JSDoc (no runtime impact in v1.x)
- Changing internal implementation (as long as API shape unchanged)

---

## 6. Test Strategy

Per D-04: Keep all existing tests green; add new tests for native implementations in parallel.

### Test Parallel Structure

```
packages/photon/tests/
├── exports.test.ts                        # Existing (keep 100% passing)
├── middleware-*.test.ts                   # Existing (keep 100% passing)
├── middleware-extra.test.ts               # Existing (keep 100% passing)
├── router.test.ts                         # Existing (keep 100% passing)
├── rpc.test.ts                            # Existing (keep 100% passing)
│
├── native/                                # NEW: Native implementations
│   ├── http-exception.test.ts            # Verify native HTTPException matches hono/http-exception API
│   ├── logger.test.ts                    # Verify native logger works
│   ├── jwt.test.ts                       # Verify native JWT sign/verify/decode
│   └── routers.test.ts                   # Verify RadixRouter forwards from old router paths
│
└── compat/                                # NEW: Backwards compatibility
    ├── http-exception-compat.test.ts     # Verify old import paths still work in v1.x
    ├── jwt-compat.test.ts                # Verify JWT API shape unchanged
    └── router-compat.test.ts             # Verify old router imports delegate correctly
```

### Test Gates per Phase

**Phase 4B-1 Gate:**
```bash
bun test packages/photon --timeout=10000
# Expected: ≥215 tests pass, 0 fail
# (baseline: currently 215 pass)
```

**Phase 4B-2 Gate:**
```bash
bun test packages/photon --timeout=10000
bun test packages/photon/tests/native/jwt.test.ts
# Expected: ≥220 tests pass (215 + new JWT tests)
```

**Phase 4B-3 Gate:**
```bash
bun test packages/mass
bun test packages/beam
bun test packages/zenith (if applicable)
# Expected: 100% pass for all three packages
```

**Phase 4B-6 Gate (final):**
```bash
bun test --timeout=10000  # Full suite
# Expected: ≥11,666 pass (99.7% of 11,706 total)
# Health score: ≥90/100 (target 93/100 baseline)
```

### Coverage Targets

| Package | Current Coverage | Target | Phase |
|---------|-----------------|--------|-------|
| @gravito/photon | 75%+ | 80%+ | 4B-1 through 4B-6 |
| @gravito/mass | 70%+ | 75%+ | 4B-3 |
| @gravito/beam | 65%+ | 70%+ | 4B-3, 4B-5 |

---

## 7. Risk Assessment

Documented risks with probability, impact, and mitigation.

### Risk 1: Beam RPC Type System Breakage

**Probability:** MEDIUM (only if Hono import removed without replacement)
**Impact:** HIGH (RPC type inference breaks downstream)
**Severity:** HIGH

**Description:** Beam's `createBeam<T extends Hono<any, any, any>>` is fundamentally coupled to Hono's App type. If `hono/client` is removed without providing a compatible type system, beam's type inference breaks.

**Mitigation:**
- ✓ Phase 4B-5 explicitly keeps `hono/client` as type-only peerDependency
- ✓ Beam continues to work without code changes
- ✓ Deprecation notice targets v3.0 (deferred native RPC type system)
- ✓ Tests verify: `createBeam<T>` still infers types correctly

**Gate:** Phase 4B-5 verification confirms beam tests pass with 100% success.

---

### Risk 2: OpenAPI Replacement Complexity

**Probability:** LOW (decision already made to keep @hono/zod-openapi)
**Impact:** HIGH (no time to build native generator)
**Severity:** MEDIUM

**Description:** @hono/zod-openapi provides tight OpenAPI spec generation with Zod schema validation. Replacing it with a native solution would require significant engineering (Phase 4B-6 effort estimate: 1-2 weeks for replacement, not scoping).

**Mitigation:**
- ✓ Phase 4B-6 keeps @hono/zod-openapi as explicit dependency
- ✓ Scoped to `@gravito/photon/openapi` sub-path (not in main exports)
- ✓ Deprecation targets v3.0 (leave replacement for future planning)
- ✓ Decision: "keep as peer dependency with explicit scope"

**Gate:** Phase 4B-6 verification confirms OpenAPI path still works.

---

### Risk 3: Test Count Regression During Migration

**Probability:** LOW (strict no-removal policy in D-04)
**Impact:** MEDIUM (hard to diagnose root cause)
**Severity:** MEDIUM

**Description:** Photon currently has 215 passing tests. Compat shim tests verify old API shapes (e.g., "re-exports hono/bun helpers"). Removing shims without updating tests causes failures.

**Mitigation:**
- ✓ D-04 strict policy: All existing tests must remain green
- ✓ Before removing any shim: add new test verifying native replacement
- ✓ Test file additions: `packages/photon/tests/native/` directory (one file per phase)
- ✓ Gate after each phase: `bun test packages/photon` must show ≥ baseline pass count

**Verification:** Test count increases or stays same during migration (never decreases).

---

### Risk 4: Mass Hidden Hono Dependency

**Probability:** LOW (type-only usage identified)
**Impact:** MEDIUM (silent failure if type changes)
**Severity:** LOW

**Description:** `mass/src/coercion.ts` uses `HonoContext` type as a cast target for `ctx.native` access. If GravitoContext's shape changes, this cast may silently fail.

**Mitigation:**
- ✓ Phase 4B-3 replaces `HonoContext` with `GravitoContext`
- ✓ Both are immutable type definitions (no behavior change)
- ✓ Tests verify: mass validation still works post-migration
- ✓ Gate: `bun test packages/mass` passes

**Verification:** Phase 4B-3 gate confirms no regressions.

---

### Risk 5: Health Score Regression Below 90/100

**Probability:** LOW (incremental approach, gates after each phase)
**Impact:** HIGH (signals stability issue)
**Severity:** MEDIUM

**Description:** Phase 4A baseline: 93/100 health. If migration introduces bugs or test flakiness, health score may drop below 90/100.

**Mitigation:**
- ✓ Gate after each phase: verify health score ≥90/100
- ✓ If health drops below 90: STOP migration, investigate root cause
- ✓ Target: maintain 93/100 baseline throughout migration
- ✓ If fallback needed: revert individual phase and retry

**Verification:**
```bash
bun test --timeout=10000  # Full suite after each phase
# Calculate: health = (pass_count / total_count) * 100
# Gate: health ≥ 90/100
```

---

### Risk 6: Package Dependency Breakage in Downstream 21 Packages

**Probability:** VERY LOW (most use only native types)
**Impact:** MEDIUM (cascading build failures)
**Severity:** MEDIUM

**Description:** 21 packages depend on @gravito/photon (beam, constellation, cosmos, forge, fortify, impulse, ion, luminosity-adapter-photon, mass, monitor, nebula, prism, pulsar, resilience, sentinel, site, spectrum, stasis, zenith). If photon's API shape changes, these may break.

**Mitigation:**
- ✓ All backwards compatibility patterns ensure API shape unchanged
- ✓ Sub-path exports isolated (new paths don't affect main imports)
- ✓ Tests verify: 21 downstream packages still build/test correctly
- ✓ Gate: `bun run typecheck` passes (validates all 83 packages)

**Verification:** Phase 4B-6 typecheck confirms 0 errors across all packages.

---

## 8. Success Criteria

Migration complete when **ALL** of the following are met:

| Criterion | Verification | Phase | Status |
|-----------|--------------|-------|--------|
| All 12 compat shims addressed (removed/replaced/scoped) | Grep codebase for remaining Hono imports in photon/src/ | 4B-6 | ✅ DONE |
| 3 external package Hono refs resolved (mass, beam, zenith) | Type checks pass, tests pass | 4B-3 | ✅ DONE |
| Health score maintained ≥90/100 throughout | `bun test --timeout=10000 \| health calc` | After each phase | ✅ 100/100 photon |
| Zero breaking changes to public API | No removed exports, only additions/deprecations | 4B-1 through 4B-6 | ✅ DONE |
| All existing tests pass after migration complete | `bun test --timeout=10000` ≥99.7% pass | 4B-6 | ✅ 294/294 photon |
| hono removed from photon's main dependencies | `grep "hono" packages/photon/package.json` returns only peer dep | 4B-6 | ✅ DONE |
| TypeScript typecheck 0 errors across 83 packages | `bun run typecheck` completes with 0 errors | After each phase | ✅ 83/83 pass |
| All sub-path exports work correctly | `import from '@gravito/photon/openapi'` works | 4B-6 | ✅ DONE |
| Deprecation notices documented in JSDoc | Review all deprecated exports | 4B-1 through 4B-6 | ✅ DONE |
| MIGRATION_ROADMAP.md complete and final | This document fully filled | 4B-1 (pre-execution) | ✅ DONE |

---

## 9. Open Questions & Deferred Decisions

### Q1: Beam RPC Native Type System

**Current state:** Beam's `createBeam<T extends Hono<any, any, any>>` uses Hono's App type for type inference.

**Decision:** Keep hono/client as type-only dependency through v1.x and v2.x. Defer native RPC type system design to Phase 4B-6 or v3.0 planning.

**Action:** No action during Phase 4B-1 through 4B-6. Addressed in Phase 4B-5 (keep decision).

---

### Q2: Zenith's Direct Hono Dependency

**Current state:** `@gravito/zenith/package.json` has `"hono": "^4.12.2"` in production deps, but source files may not import it.

**Decision:** Phase 4B-3 must verify if zenith actually uses Hono. If unused, remove dependency. If used, document usage and plan for replacement.

**Action:** Grep zenith source during Phase 4B-3. Either remove dependency or add to migration plan for Phase 4B-4+.

---

### Q3: Platform Adapter Future (Cloudflare/Deno/Vercel)

**Current state:** Cloudflare, Deno, Vercel adapters re-export Hono's platform-specific adapters.

**Decision:** Keep as optional @deprecated sub-paths during v1.x and v2.x. Evaluate for removal/native replacement in v3.0 planning (if actual usage confirmed).

**Action:** No changes to adapters in Phase 4B-4, only JSDoc @deprecated notices.

---

### Q4: OpenAPI Replacement Library

**Current state:** `@hono/zod-openapi` provides tight Hono-native OpenAPI spec generation.

**Decision:** Keep @hono/zod-openapi scoped to `/openapi` sub-path through v1.x and v2.x. Evaluate native replacements (e.g., @asteasolutions/zod-to-openapi) in v3.0 planning or Phase 5 (separate effort).

**Action:** Phase 4B-6 scopes to `/openapi` path; no replacement attempted.

---

## Metadata

**Document Version:** 1.0
**Created:** 2026-03-26
**Approved by:** Phase 4B Planning Exercise
**Based on:** 04B-RESEARCH.md, 04B-CONTEXT.md, DECISION_SUMMARY.md
**Valid until:** 2026-04-26 (execution period)

**Key References:**
- Phase 4B Research: `.planning/phases/04B-hono-migration-pending/04B-RESEARCH.md`
- Phase 4B Context: `.planning/phases/04B-hono-migration-pending/04B-CONTEXT.md`
- Decision Summary: `.planning/DECISION_SUMMARY.md` (D-01 through D-04)
- Project Health: `.planning/STATE.md` (current: 93/100, 99.7% test pass)

---

**Next Step:** Execute Phase 4B-1 (Easy Compat Shim Replacements) using this roadmap as reference.
