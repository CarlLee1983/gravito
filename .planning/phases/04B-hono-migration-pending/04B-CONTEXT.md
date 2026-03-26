# Phase 4B: Hono Migration Planning - Context

**Gathered:** 2026-03-26
**Status:** Ready for research and planning
**Mode:** Comprehensive framework migration with strict backwards compatibility

---

<domain>
## Phase Boundary

**Goal:** Create execution roadmap for comprehensive Hono migration across all 64 core packages while maintaining strict backwards compatibility and API stability.

**Scope:** Phase 4B is PLANNING ONLY — chart the multi-phase migration strategy, decide package migration order, define compatibility layer, and identify risks. Actual migration execution happens in Phase 4B-1, 4B-2, etc.

**Success Criteria:**
- ✓ Migration roadmap created (4-6 phases identified with sequencing)
- ✓ Package migration order determined (foundation first, then layers)
- ✓ Backwards compatibility strategy locked (dual-API approach detailed)
- ✓ Test strategy for migration defined (old + new tests in parallel)
- ✓ Risk assessment completed (migration blocking issues identified)
- ✓ Phase 4B-1 execution plan ready (first package migration plan)

**Timeline:** Phase 4B planning: ~1 week. Actual migration execution (phases 4B-1 through 4B-6): 2-3 months.

</domain>

<decisions>
## Implementation Decisions

### Migration Scope (D-01)
**Decision:** Comprehensive framework migration — all 64 core packages align with Hono patterns and architecture
- **Rationale:** Move beyond HTTP-layer replacement to foundational framework restructure
- **Implication:** This is not just swapping Hono for old HTTP engine; it's architectural reorganization
- **Scope includes:** Core packages (photon, luminosity, atlas, signal, stream, etc.), frameworks, utilities, middleware

### Backwards Compatibility (D-02)
**Decision:** Strict backwards compatibility with gradual deprecation
- **Timeline:** 2-3 major versions (v1.x → v3.x) for full transition
- **Pattern:** New Hono APIs exposed alongside old APIs; old APIs delegated to new implementations; deprecation warnings added in v2.x; removal in v3.x
- **Constraint:** No breaking changes in Phase 4B planning; all breaking decisions deferred to explicit v2.0 release planning
- **Implication:** Requires compatibility layer / adapter pattern throughout migration

### Phasing Strategy (D-03)
**Decision:** Incremental migration by package (not all-at-once)
- **Phases:** Estimated 4-6 phases over 2-3 months
- **Order:** Foundation first (photon/luminosity HTTP layer) → then core modules (atlas, signal, stream) → then utilities
- **Gate:** After each package, full integration test + no regressions in dependent packages
- **Rationale:** Lower risk per phase, easier diagnosis, testable in isolation

### Test Coverage (D-04)
**Decision:** Extend existing test suite with parallel new tests (full duplication)
- **Approach:** Keep all existing tests running; add new tests for Hono implementations side-by-side
- **Scope:** Every package migration includes both old-API tests (verify backwards compat) and new-Hono tests (verify new implementation)
- **Timeline:** No tests removed during migration; only additions
- **Criterion:** Phase 4B-N success = All old tests pass + All new tests pass + Integration tests pass

### Claude's Discretion
- **Package migration order within foundation layer** — researcher/planner decides optimal sequence (e.g., photon first if HTTP is bottleneck, or luminosity first if routing is priority)
- **Compatibility layer implementation details** — How to expose old APIs as wrappers around new implementations (facade pattern, delegation, etc.)
- **E2E test additions** — Which critical user journeys to add E2E tests for during migration
- **Rollback strategy for individual phases** — If phase 4B-1 migration fails, how to safely revert without affecting other packages

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before research or planning.**

### Project Foundation
- `./CLAUDE.md` — Project guidelines (TypeScript strict, Bun v1.3.10, immutability rules)
- `.planning/PROJECT.md` — Project overview and architecture
- `.planning/REQUIREMENTS.md` — Project requirements and constraints
- `.planning/STATE.md` — Current project state (Phase 4A complete, 93/100 health score)

### Framework Context
- `packages/photon/` — Current HTTP engine (Hono-based)
- `packages/luminosity/` — Routing and page rendering
- `WHITEPAPER_ZH_TW.md` — Galaxy Architecture design principles

### Phase Precedent
- `.planning/phases/02-1-day/02-03-SUMMARY.md` — Phase 2C test fixes (shows module isolation patterns)
- `.planning/phases/04-continue-with-high-priority-issues-or-hono-migration-conditional/04-03-SUMMARY.md` — Phase 4A completion (current health score, test stability)

### Hono Resources
- Hono documentation (via Context7) — Routing, middleware, context patterns
- Existing photon implementation — Already uses Hono; migration builds on this pattern

</canonical_refs>

<specifics>
## Specific Ideas

### Phase Migration Sequence (Proposed)
Based on D-03 (incremental), likely order:
1. **Phase 4B-1:** Photon (HTTP engine) — Foundation; other packages depend on this
2. **Phase 4B-2:** Luminosity (routing/rendering) — Depends on photon; enables downstream
3. **Phase 4B-3:** Signal (event bus) — Independent, can run in parallel with luminosity
4. **Phase 4B-4:** Atlas (database ORM) — Independent, can run in parallel
5. **Phase 4B-5:** Stream & utilities — Depends on above; final integration
6. **Phase 4B-6:** Satellites (RBAC, Catalog, Commerce) — If in scope; currently optional

Note: Exact order may shift based on dependency analysis. Researcher should map this.

### Backwards Compatibility Layer Pattern
Old API surface must remain stable during migration. Pattern:
```
Old API (user-facing) → Compatibility Layer (thin wrapper) → New Hono Implementation
```
- Old: `import { controller } from '@gravito/photon'` (still works)
- New: `import { honoController } from '@gravito/photon/hono'` (new pattern)
- Layer: Photon exports old API, internally delegates to new `honoController`

### Test Duplication Strategy
For each migrated package:
```
packages/*/tests/
├── existing/                    # Keep all existing unit tests
│   ├── feature-a.test.ts       # Verifies old API still works
│   ├── feature-b.test.ts
│   └── integration/
│
├── hono/                        # NEW: Tests for Hono implementation
│   ├── feature-a.hono.test.ts  # Verifies new Hono API works
│   ├── feature-b.hono.test.ts
│   └── integration/
│
└── compat/                      # NEW: Tests for compatibility layer
    ├── old-to-new.test.ts      # Verifies old API delegates correctly
    └── edge-cases.test.ts
```

### Health Score Target Post-Migration
- Phase 4A baseline: 93/100 (99.7% tests passing)
- Phase 4B target: ≥90/100 maintained (migration shouldn't reduce health)
- Success criterion: No new test failures introduced by migration

</specifics>

<deferred>
## Deferred Ideas

- **E2E test framework expansion** — Adding browser-based E2E tests for satellite modules belongs in Phase 5 (Satellite Verification), not Phase 4B
- **Performance optimization** — Even if Hono enables faster routing, performance benchmarking and optimization is Phase 6 (Full Audit)
- **Breaking changes planning** — v2.0 planning (what to break, deprecation timeline) is Phase 4B post-research discovery; not decided upfront
- **Satellite migration** — RBAC/Catalog/Commerce migration to Hono belongs in Phase 5, not Phase 4B (4B is core framework only)
- **Documentation rewrite** — API documentation updates are Phase 4B-N task additions, not separate phase

</deferred>

---

*Phase: 04B-hono-migration-pending*
*Context gathered: 2026-03-26 via /gsd:discuss-phase 4b*
*Decisions: D-01 (Scope) | D-02 (Compat) | D-03 (Phasing) | D-04 (Testing)*
