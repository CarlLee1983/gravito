# Phase 4B-3: External Package Type Cleanup - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning
**Mode:** Type-only Hono reference cleanup in external packages (mass, beam, zenith)

---

## Phase Boundary

**Goal:** Eliminate type-only Hono references from @gravito/mass, @gravito/beam, and @gravito/zenith packages to complete Phase 4B Hono migration prep.

**Scope:** Three external packages with type-only Hono imports:
1. **@gravito/mass** — Replace `HonoContext` type import with `GravitoContext`
2. **@gravito/beam** — Keep `hono/client` as type-only peerDependency (strategic decision)
3. **@gravito/zenith** — Verify actual Hono usage in source code and decide: remove or document

**Scope does NOT include:**
- Internal photon compat shims (those are Phases 4B-1, 4B-2, 4B-4, 4B-6)
- RPC client type system redesign (that's Phase 4B-5 decision point)
- New functionality or API changes
- Performance optimization

**Success Criteria:**
- ✓ mass: HonoContext replaced with GravitoContext, tests pass
- ✓ beam: hono/client decision documented (keep as type-only or explore removal)
- ✓ zenith: Hono usage verified and documented
- ✓ Zero TypeScript errors after changes
- ✓ All three packages' test suites pass
- ✓ Health baseline (93/100) maintained

**Timeline:** 0.5 week (2-3 days execution after planning)

---

## Implementation Decisions (from MIGRATION_ROADMAP.md)

### D-01: @gravito/mass Type Replacement

**Decision:** Replace type-only `HonoContext` import with `GravitoContext` in mass/src/coercion.ts

**Current Code (line 304):**
```typescript
import type { Context as HonoContext } from 'hono'
const honoCtx = (ctx.native || ctx) as HonoContext
```

**Target:**
```typescript
import type { GravitoContext } from '@gravito/core'
const nativeCtx = ctx as GravitoContext
// Or access request data directly via ctx.req methods
```

**Rationale:** The coercion logic only needs Gravito's context abstraction, not Hono-specific types. GravitoContext provides all necessary request/response operations.

**Status:** LOCKED — Ready for implementation

---

### D-02: @gravito/beam RPC Type System Decision

**Decision:** Keep `hono/client` as type-only peerDependency in @gravito/photon

**Current Usage:** beam/src/index.ts and helpers.ts use `type Hono` for generic RPC client typing

**Target:**
```typescript
export { hc } from 'hono/client'
```

**Rationale:** Beam's `createBeam<T extends Hono<any, any, any>>` is tightly coupled to Hono's App type for type inference. A native RPC type system would require significant architectural work (target: Phase 4B-5 or v3.0 planning).

**Implementation Details:**
- Keep hono/client as optional peerDependency in @gravito/photon/package.json
- Add deprecation JSDoc: "@deprecated v3.0 — Will be replaced with native RPC type system"
- Beam continues to use Hono's type inference without production dependency

**Status:** LOCKED — Strategic decision from MIGRATION_ROADMAP

---

### D-03: @gravito/zenith Hono Dependency Verification

**Decision:** Audit zenith source code to determine if Hono is actually used

**Current State:** zenith/package.json lists `hono@^4.12.2` in production dependencies

**Tasks:**
1. Grep zenith source for actual Hono imports (hono/, @hono/)
2. Check if dependency is used or leftover from initialization
3. If unused: remove dependency
4. If used: document the usage and plan for native replacement in Phase 4B-5 or later

**Status:** DECISION PENDING — Phase 4B-3 planning should clarify this

---

## Canonical References

**Files to read before research/planning:**
- `.planning/PROJECT.md` — Project principles and constraints
- `.planning/REQUIREMENTS.md` — Project requirements
- `.planning/STATE.md` — Current project state (Phase 5 complete, health 93/100)
- `.planning/phases/04B-hono-migration-pending/04B-RESEARCH.md` — Research findings
- `.planning/phases/04B-hono-migration-pending/MIGRATION_ROADMAP.md` — Phase 4B strategy
- `.planning/phases/04B-2-jwt-native-implementation/04B-2-01-SUMMARY.md` — Prior phase reference

**Code references:**
- `packages/mass/src/coercion.ts` (line 304) — HonoContext usage
- `packages/beam/src/index.ts` and `src/helpers.ts` — hono/client usage
- `packages/zenith/package.json` and `packages/zenith/src/**` — Verify Hono usage
- `packages/photon/src/client.ts` — Current hono/client re-export

---

## Prior Decisions (from Phase 4B context)

### From MIGRATION_ROADMAP.md

**D-01 (Phase 4B Overall):** Replace 12 Hono compat shims in photon with native implementations across 6 sub-phases

**D-02 (Phase 4B Overall):** Core packages (@gravito/core, @gravito/atlas, @gravito/signal, @gravito/stream) are already Hono-free — no changes needed

**D-03 (Platform Adapters):** Keep Cloudflare/Deno/Vercel adapters as @deprecated optional sub-paths rather than replace

**D-04 (RPC Strategy):** Keep hono/client as type-only for now; native RPC system is v3.0+ scope

**D-05 (OpenAPI):** Scope @hono/zod-openapi to /openapi sub-path only; mark @deprecated

---

## Gray Areas for Discussion

None identified at this time. The MIGRATION_ROADMAP has locked down:
- ✓ mass/coercion.ts approach (replace HonoContext with GravitoContext)
- ✓ beam/hono-client strategy (keep as type-only peerDep)
- ✓ zenith approach (verify usage, remove if unused)

**Remaining to clarify during planning:**
- Exact test strategy for mass/beam/zenith after changes
- Whether to update JSDoc comments in beam for deprecation messaging
- Rollback strategy if any tests fail after type replacement

---

## Downstream Awareness

**For gsd-phase-researcher:**
- Understand Hono type system and its integration in mass/beam/zenith
- Research GravitoContext API surface and how it compares to HonoContext
- Investigate potential type inference impacts in beam's RPC system

**For gsd-planner:**
- Plan mass change as isolated task (one file change)
- Plan beam assessment as separate task (analyze usage, document decision)
- Plan zenith audit as third task (grep/verify, decide remove or document)
- Each task should be independent (no cascading changes)

---

## Deferred Ideas

None at this time. Phase 4B-3 scope is tightly scoped to three packages.

**Future considerations (Phase 4B-5+):**
- Native RPC type system for beam (v3.0 target)
- Native OpenAPI generator (v3.0 target)
- Comprehensive Hono removal documentation

---

**Phase:** 04B-3-external-package-type-cleanup
**Context gathered:** 2026-03-26 via /gsd:discuss-phase
**Decisions:** D-01 (mass), D-02 (beam), D-03 (zenith) from MIGRATION_ROADMAP.md
**Status:** Ready for Phase 4B-3 planning
