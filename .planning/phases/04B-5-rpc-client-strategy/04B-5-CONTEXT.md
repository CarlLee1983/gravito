---
phase: 04B-5-rpc-client-strategy
name: RPC Client Strategy
gathered: 2026-03-26
status: Ready for planning
mode: Type-only peerDependency documentation and deprecation
---

# Phase 04B-5: RPC Client Strategy - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning
**Mode:** Keep hono/client as optional type-only peerDependency with @deprecated v3.0 targeting

---

## Phase Boundary

**Goal:** Document and formalize RPC client type system decision for beam/hono-client dependency, marking for v3.0 migration to native RPC types.

**Scope:** Two files with RPC client exports:
1. **@gravito/photon/src/client.ts** — RPC client export (add @deprecated JSDoc)
2. **@gravito/photon/package.json** — Add hono as optional peerDependency

**Scope does NOT include:**
- Implement native RPC type system (Phase 4B-6 or v3.0 scope)
- Change beam's RPC runtime behavior
- Modify RPC API contracts
- Add new RPC features

**Success Criteria:**
- ✓ photon/src/client.ts has @deprecated v3.0 JSDoc on RPC client export
- ✓ package.json peerDependencies includes hono@^4.12.0 as optional
- ✓ All RPC imports work: `import { hc } from '@gravito/photon'`
- ✓ beam package continues to work with type-only Hono generics
- ✓ Zero TypeScript errors
- ✓ Health baseline maintained (93/100)

**Timeline:** 1-2 days (similar scope to Phase 04B-2/04B-3)

---

## Implementation Decisions (from MIGRATION_ROADMAP.md)

### D-05: RPC Type System Strategy (LOCKED)

**Decision:** Keep `hono/client` as type-only peerDependency in @gravito/photon

**Current State:**
- `hc` function currently exported from photon (used by RPC clients)
- beam's `createBeam<T extends Hono<any, any, any>>` depends on Hono's App type for generics
- No runtime dependency on hono/client — only type inference

**Target:**
```typescript
// src/client.ts (new or updated)
/**
 * RPC client for type-safe remote procedure calls.
 * Uses Hono's hc() type inference system.
 * @deprecated v3.0 — Will be replaced with native RPC type system
 *
 * In v3.0+, this will be replaced with a native Gravito RPC type system
 * that doesn't require Hono dependencies.
 */
export { hc } from 'hono/client'
```

**Rationale:**
- beam's generic constraints (`<T extends Hono<any, any, any>>`) require Hono's App type for type inference
- Native RPC type system would require significant architectural work
- Better to keep as optional type-only dependency and deprecate gradually
- Users can continue using this through v2.x with clear migration path to v3.0

**Status:** LOCKED — Strategic decision from MIGRATION_ROADMAP.md

---

### D-06: PeerDependency Configuration (LOCKED)

**Decision:** Add hono as optional peerDependency in @gravito/photon/package.json

**Current:**
```json
{
  "peerDependencies": {},
  "peerDependenciesMeta": {}
}
```

**Target:**
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

**Rationale:**
- Marks hono as optional (users don't *need* to install it)
- But RPC client functionality requires it
- Clear signal that this dependency will be replaced in v3.0
- Beam users must have hono available for type inference

**Status:** LOCKED — Required for optional peerDependency pattern

---

## Canonical References

**Files to read before research/planning:**
- `.planning/PROJECT.md` — Project principles
- `.planning/REQUIREMENTS.md` — Project requirements
- `.planning/STATE.md` — Current state (Phase 04B-4 complete, health 93/100)
- `.planning/phases/04B-hono-migration-pending/MIGRATION_ROADMAP.md` — Full RPC strategy (line 279+)
- `.planning/phases/04B-2-jwt-native-implementation/04B-2-01-SUMMARY.md` — Prior phase pattern reference
- `.planning/phases/04B-3-external-package-type-cleanup/04B-3-02-SUMMARY.md` — beam @deprecated pattern

**Code references:**
- `packages/photon/src/client.ts` (will be created/updated)
- `packages/photon/package.json` (will be updated)
- `packages/beam/src/index.ts` (references current RPC types)
- `packages/beam/src/helpers.ts` (references current RPC types)
- `packages/photon/tests/exports.test.ts` (verify RPC export)

---

## Prior Decisions (from Phase 04B-3)

**D-02 (Phase 04B-3):** Keep beam RPC type-only Hono usage, document as @deprecated v3.0 ✅ COMPLETE

This decision is foundational for Phase 04B-5. Beam's RPC system is already using Hono as type-only, so this phase formalizes the pattern at the photon/client level.

**D-04 (Phase 04B-4):** Keep platform adapters as @deprecated optional sub-paths ✅ COMPLETE

This establishes the pattern for @deprecated JSDoc + optional exports that Phase 04B-5 will follow.

**Baseline:** Health 93/100 | 99.7% test pass | 0 TypeScript errors

---

## Gray Areas for Discussion

None identified at this time.

**Why:** The MIGRATION_ROADMAP has locked down the decision (D-05, D-06). The implementation approach is straightforward: export RPC client with @deprecated JSDoc, update package.json peerDependencies. No user-facing behavior changes or design decisions pending.

---

## Downstream Awareness

**For gsd-phase-researcher:**
- Understand Hono's hc() type inference system and how beam uses it
- Verify hono@^4.12.0 compatibility with current codebase
- Research TypeScript peerDependencies patterns

**For gsd-planner:**
- Create 1-2 plans:
  - Plan 1: Create/update client.ts + update package.json exports (single file changes)
  - Plan 2: Verify RPC exports, add tests, validate health (tests + verification)
- Plans should be independent; can execute in parallel if needed

---

## Deferred Ideas

None at this time.

---

**Phase:** 04B-5-rpc-client-strategy
**Context gathered:** 2026-03-26 via direct phase setup
**Decisions:** D-05, D-06 from MIGRATION_ROADMAP.md
**Status:** Ready for Phase 04B-5 planning
