# Phase 24: Config Type Unification - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate field duplication between `ApplicationConfig` and `GravitoConfig` by making `ApplicationConfig` extend shared fields via `Pick<GravitoConfig, 'logger' | 'config'>`. Ensure boot() does not silently drop config fields. Scope is strictly limited to TYPE-01 (logger + config unification) and verifying FIX-03 (observabilityProvider forwarding, already completed in Phase 21).

</domain>

<decisions>
## Implementation Decisions

### Field Scope
- **D-01:** Strictly follow TYPE-01 — only unify `logger` and `config` fields. Do not expand to adapter, container, observabilityProvider, or any other GravitoConfig fields. Future phases can extend if needed.

### Breaking Change Handling
- **D-02:** Direct modification without compatibility shim. The actual types are identical (`logger?: Logger`, `config?: Record<string, unknown>`), so the change is source-compatible. If `bun run typecheck` passes, the change is safe.

### JSDoc Handling
- **D-03:** Add proper JSDoc to `logger` and `config` fields in `GravitoConfig` (PlanetCore.ts) as the single documentation source. Currently these fields have no JSDoc in GravitoConfig. After the change, both ApplicationConfig and PlanetCore users will see the JSDoc via IDE hover.

### Claude's Discretion
- Exact JSDoc wording for the two fields in GravitoConfig
- Whether to keep ApplicationConfig as `interface` (using intersection) or change to `type` (if needed for extends Pick<> syntax)
- Test structure: new test file vs adding to existing PlanetCore/Application test files

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source Code (modification targets)
- `packages/core/src/Application.ts` — Lines 68-111: `ApplicationConfig` interface (remove duplicated logger/config, add extends Pick<>)
- `packages/core/src/PlanetCore.ts` — Lines 85-157: `GravitoConfig` type (add JSDoc to logger/config fields)
- `packages/core/src/PlanetCore.ts` — Lines 788-795: `boot()` static method (verify field forwarding completeness)

### Test Files
- `packages/core/tests/` — Existing PlanetCore and Application test files for adding verification tests

### Requirements
- `.planning/REQUIREMENTS.md` — TYPE-01 definition, FIX-03 (already complete)

### Success Criteria (from ROADMAP.md)
- SC-1: `ApplicationConfig` is defined as `extends Pick<GravitoConfig, 'logger' | 'config'>` — field definitions exist in exactly one place
- SC-2: Passing `observabilityProvider` in GravitoConfig to `PlanetCore.boot()` results in it being available — confirmed by passing test
- SC-3: `bun run typecheck` at workspace root passes with zero errors

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GravitoConfig` type (PlanetCore.ts:85) — already has all 7 fields with proper types
- `ApplicationConfig` interface (Application.ts:68) — has 8 fields, 2 overlap with GravitoConfig
- Phase 21 already fixed boot() observabilityProvider forwarding (line 794)

### Established Patterns
- Config types use optional fields with `?` suffix
- PlanetCore uses `type` keyword for GravitoConfig, Application uses `interface` for ApplicationConfig
- Named exports in index.ts — both types are explicitly exported (Phase 23 conversion)

### Integration Points
- `ApplicationConfig` is used in Application constructor and potentially by downstream Application users
- `GravitoConfig` is used by PlanetCore.boot() and PlanetCore constructor
- Both types are exported from `packages/core/src/index.ts`

### Current Overlap Analysis
| Field | GravitoConfig | ApplicationConfig | Identical? |
|-------|---------------|-------------------|------------|
| logger | `logger?: Logger` | `logger?: Logger` | Yes |
| config | `config?: Record<string, unknown>` | `config?: Record<string, unknown>` | Yes |

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond TYPE-01 success criteria. Straightforward type refactoring.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 24-config-type-unification*
*Context gathered: 2026-03-30*
