---
phase: 04B-6-openapi-cleanup
name: OpenAPI Scoping and Final Cleanup
gathered: 2026-03-26
status: Ready for discussion
mode: Final Hono migration cleanup — scope @hono/zod-openapi, handle bun.ts, finalize dependencies
---

# Phase 04B-6: OpenAPI Scoping and Final Cleanup - Context

**Gathered:** 2026-03-26
**Status:** Ready for discussion
**Mode:** Final cleanup phase for Hono migration (phases 4B-2 through 4B-6)

---

## Phase Boundary

**Goal:** Finalize Hono migration by scoping @hono/zod-openapi to `/openapi` sub-path, address remaining bun.ts export, and verify framework health.

**Scope:** Three focused tasks in photon package:
1. **OpenAPI sub-path** — Scope @hono/zod-openapi to `/openapi` export with @deprecated JSDoc
2. **bun.ts decision** — Either remove or replace with native Bun serve() helpers
3. **Dependency finalization** — Verify hono is removed from main dependencies (peerDependency only for /openapi)
4. **Health verification** — Full test suite, typecheck, and health baseline ≥93/100

**Scope does NOT include:**
- Implement native OpenAPI generator (v3.0 scope)
- Create new Bun runtime adapters
- Refactor Bun-specific code outside photon
- Add new features or capabilities

**Success Criteria:**
- ✓ `src/openapi.ts` exports from @hono/zod-openapi with @deprecated v2.0 JSDoc
- ✓ `package.json` exports includes `./openapi` sub-path entry
- ✓ bun.ts is either removed or replaced with native implementation
- ✓ hono removed from photon `dependencies` (kept as `peerDependency` for /openapi)
- ✓ All sub-path imports work: `/jwt`, `/client`, `/openapi`, `/adapters/*`
- ✓ All 21 downstream packages continue importing from photon without issues
- ✓ Test pass rate ≥99.7% (Phase 4A baseline)
- ✓ TypeScript: 0 errors (83/83 packages)
- ✓ Health baseline: ≥93/100 (target: 93/100)

**Timeline:** 1-2 days (final cleanup, minimal new code)

---

## Prior Phase Decisions (4B-2 through 4B-5)

### Carried Forward
- **D-01 (Phase 04B-2):** JWT middleware replaced with native jose implementation ✅
- **D-02 (Phase 04B-3):** Keep beam RPC types as type-only, mark @deprecated v3.0 ✅
- **D-03 (Phase 04B-3):** Remove unused hono from zenith ✅
- **D-04 (Phase 04B-4):** Platform adapters remain @deprecated optional sub-paths ✅
- **D-05 (Phase 04B-5):** Keep hono/client as type-only peerDependency ✅
- **D-06 (Phase 04B-5):** Add hono@^4.12.0 as optional peerDependency ✅

**Pattern:** All Hono dependencies are now either scoped to sub-paths with @deprecated JSDoc or removed from main dependencies. Phase 4B-6 completes this by finalizing OpenAPI scoping and removing bun.ts.

---

## Locked Decisions

### D-01 (Phase 04B-6): bun.ts Removal

**Decision:** Remove `src/bun.ts` entirely from photon.

**Rationale:**
- Cleanest Hono decoupling — bun.ts is a Hono re-export with minimal value
- Users can use `Bun.serve()` directly or @gravito/core native engines
- Eliminates maintenance burden for a rarely-used export
- Aligns with full Hono migration goal

**Action:**
- Delete `packages/photon/src/bun.ts`
- Remove `./bun` entry from package.json exports
- Document in migration notes: "Use Bun.serve() directly or @gravito/core BunNativeAdapter"

**Status:** LOCKED

---

### D-02 (Phase 04B-6): @hono/zod-openapi Scoping

**Decision:** Scope @hono/zod-openapi to `/openapi` sub-path only with @deprecated JSDoc.

**Rationale:**
- Per D-04 (Phase 4B-4), all Hono dependencies should be scoped to sub-paths
- @hono/zod-openapi only used for OpenAPI generation — optional use case
- Follows established pattern from `/adapters/*` (Phase 4B-4)

**Target Implementation:**
```typescript
// src/openapi.ts
/**
 * OpenAPI schema generation using Hono + Zod
 * @deprecated v2.0 — OpenAPI path has explicit Hono dependency
 * Usage: import { PhotonOpenAPI } from '@gravito/photon/openapi'
 * Removal target: v3.0 (will implement native OpenAPI generator)
 */
export { OpenAPIHono as PhotonOpenAPI } from '@hono/zod-openapi'
```

**package.json exports entry:**
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

**Status:** LOCKED — Follows D-04 pattern from Phase 4B-4

---

### D-03 (Phase 04B-6): Hono Dependency Removal

**Decision:** Remove hono entirely from photon's dependencies and peerDependencies.

**Rationale:**
- All Hono usage is now scoped to optional sub-paths (/openapi, /adapters, /client)
- Main photon bundle (@gravito/photon) no longer depends on hono after 4B-2 (JWT native)
- Strongest signal of Hono deprecation; aligns with migration goal of complete decoupling
- Users who need /openapi or /adapters must install hono separately (clear intentionality)
- Cleaner dependency tree for majority of users (core photon is Hono-free)

**Action:**
- Remove hono from `dependencies` in package.json
- Remove hono from `peerDependencies` in package.json
- Update photon README.md: "/openapi and /adapters sub-paths require hono@^4.12.0 peer dependency"
- Document in MIGRATION_ROADMAP for v3.0: "hono completely removed in v3.0"

**Note on /client:** Phase 4B-5 kept hono as peerDependency for `/client` type support. D-03 overrides this, requiring beam users to install hono separately if needed. This is acceptable because beam's hono dependency is type-only (no runtime impact).

**Status:** LOCKED

---

## Summary

All three gray areas are now locked with clear decisions:
- **D-01:** Remove bun.ts entirely
- **D-02:** Scope @hono/zod-openapi to /openapi with @deprecated JSDoc
- **D-03:** Remove hono entirely from dependencies (users install separately for sub-paths)

---

## Canonical References

Files to read before research/planning:

- `.planning/ROADMAP.md` — Full roadmap with phase 4B-6 details
- `.planning/PROJECT.md` — Project principles and stability requirements
- `.planning/phases/04B-hono-migration-pending/MIGRATION_ROADMAP.md` — Complete Hono migration strategy (line 279+ for Phase 4B-6 details)
- `.planning/phases/04B-5-rpc-client-strategy/04B-5-CONTEXT.md` — Phase 4B-5 decisions on peerDependencies (D-06)
- `.planning/phases/04B-4-platform-adapter-decision/04B-4-CONTEXT.md` — Phase 4B-4 sub-path pattern reference
- `packages/photon/package.json` — Current exports and dependencies
- `packages/photon/src/openapi.ts` — Current OpenAPI export (to be updated)
- `packages/photon/src/bun.ts` — Current Bun export (decision target)

---

## Next Steps

**Based on decisions in this discussion, downstream agents will:**

1. **gsd-planner:** Create 1-2 plans based on:
   - bun.ts approach (remove vs replace)
   - OpenAPI sub-path finalization
   - Final hono dependency configuration
   - Health verification tasks

2. **gsd-executor:** Execute plans to:
   - Update/remove bun.ts as decided
   - Scope @hono/zod-openapi to /openapi
   - Update package.json exports and dependencies
   - Run verification suite
   - Commit changes and update health baseline

---

**Status:** Ready for discussion on Gray Areas 1 and 3 (Gray Area 2 is locked per pattern)

**Created:** 2026-03-26
**Phase:** 04B-6-openapi-cleanup
