---
phase: 04B-4-platform-adapter-decision
name: Platform Adapter Decision
gathered: 2026-03-26
status: Ready for planning
mode: Platform adapter deprecation (type-only pattern)
---

# Phase 04B-4: Platform Adapter Decision - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning
**Mode:** Update exports and add deprecation notices to platform adapters

---

## Phase Boundary

**Goal:** Add @deprecated notices to optional Cloudflare/Deno/Vercel platform adapter sub-paths targeting v2.0 deprecation and v3.0 removal.

**Scope:** Three packages with optional adapter exports:
1. **@gravito/photon/adapters/cloudflare** — Hono Cloudflare Workers adapter
2. **@gravito/photon/adapters/deno** — Hono Deno adapter
3. **@gravito/photon/adapters/vercel** — Hono Vercel adapter

**Scope does NOT include:**
- Implement native platform adapters (that's Phase 4B-5+ scope)
- Change adapter behavior or APIs
- Modify photon core exports
- Add new platform support

**Success Criteria:**
- ✓ package.json exports include ./adapters/cloudflare, ./adapters/deno, ./adapters/vercel
- ✓ Each adapter has @deprecated v2.0 JSDoc with v3.0 removal target
- ✓ All sub-path imports work: `import { ... } from '@gravito/photon/adapters/cloudflare'`
- ✓ Zero TypeScript errors
- ✓ Health baseline maintained (93/100)

**Timeline:** 0.5 week (1-2 days execution)

---

## Implementation Decisions (from MIGRATION_ROADMAP.md)

### D-04: Platform Adapter Deprecation Strategy (LOCKED)

**Decision:** Keep Cloudflare/Deno/Vercel adapters as @deprecated optional sub-paths

**Current State:**
- Adapters currently re-export from hono/cloudflare-workers, hono/deno, hono/vercel
- These are optional paths, not core @gravito/photon exports
- Users import: `import { ... } from '@gravito/photon/adapters/cloudflare'`

**Target:**
```typescript
// src/adapter/cloudflare.ts (new file)
/**
 * @deprecated v2.0 — Hono Cloudflare Workers adapter (optional path)
 * Removal target: v3.0
 *
 * Use: import { CloudflareAdapter } from '@gravito/photon/adapters/cloudflare'
 *
 * In v3.0+, this will be replaced with a native Gravito platform adapter system.
 */
export * from 'hono/cloudflare-workers'

// Same pattern for deno.ts and vercel.ts
```

**Rationale:**
- Hono adapters handle event format normalization for each platform (CF Workers, Deno, Vercel) — difficult/expensive to replicate natively
- Engineering cost of native replacements is high; demand is currently low
- Better to deprecate gradually than maintain two systems
- Users can continue using these through v2.x with clear migration path

**Status:** LOCKED — Strategic decision from MIGRATION_ROADMAP.md

---

### D-05: Export Configuration (LOCKED)

**Decision:** Update package.json exports with explicit sub-path entries

**Current:**
```json
{
  "exports": {
    ".": { ... },
    "./jwt": { ... },
    // adapters not listed
  }
}
```

**Target:**
```json
{
  "exports": {
    ".": { ... },
    "./jwt": { ... },
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

**Rationale:** Explicit exports enable:
- TypeScript type resolution for sub-path imports
- Package.json conditions (import/require/types)
- Clear API surface for end users

**Status:** LOCKED — Required for sub-path pattern

---

## Canonical References

**Files to read before research/planning:**
- `.planning/PROJECT.md` — Project principles
- `.planning/REQUIREMENTS.md` — Project requirements
- `.planning/STATE.md` — Current state (Phase 5 complete, health 93/100)
- `.planning/phases/04B-hono-migration-pending/MIGRATION_ROADMAP.md` — Full migration strategy (line 252+)
- `.planning/phases/04B-2-jwt-native-implementation/04B-2-01-SUMMARY.md` — Prior phase reference

**Code references:**
- `packages/photon/src/adapter/` (will be created)
- `packages/photon/package.json` (will be updated)
- `packages/photon/tests/exports.test.ts` (verify sub-path imports)

---

## Prior Decisions (from Phase 4B-3)

**D-01 (Phase 04B-3):** Replace HonoContext with GravitoContext in mass/coercion.ts ✅ COMPLETE

**D-02 (Phase 04B-3):** Keep beam RPC type-only Hono usage, document as @deprecated v3.0 ✅ COMPLETE

**D-03 (Phase 04B-3):** Remove unused hono dependency from zenith ✅ COMPLETE

**Baseline:** Health 93/100 | 99.7% test pass | 0 TypeScript errors

---

## Gray Areas for Discussion

None identified at this time.

**Why:** The MIGRATION_ROADMAP has locked down the decision (D-04, D-05). The implementation approach is straightforward: create adapter files, update package.json exports, add @deprecated JSDoc. No user-facing behavior changes or design decisions pending.

---

## Downstream Awareness

**For gsd-phase-researcher:**
- Understand Hono platform adapter APIs (cloudflare-workers, deno, vercel)
- Check for breaking changes in Hono v4.12.2
- Research TypeScript export conditions for sub-path patterns

**For gsd-planner:**
- Create 1-2 plans:
  - Plan 1: Create adapter files + update exports (single file changes)
  - Plan 2: Verify exports, add tests, validate sub-path imports
- Each plan should be independent; can execute in parallel if needed

---

## Deferred Ideas

None at this time.

---

**Phase:** 04B-4-platform-adapter-decision
**Context gathered:** 2026-03-26 via direct phase setup
**Decisions:** D-04, D-05 from MIGRATION_ROADMAP.md
**Status:** Ready for Phase 04B-4 planning
