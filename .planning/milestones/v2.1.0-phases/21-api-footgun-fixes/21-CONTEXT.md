# Phase 21: API Footgun Fixes - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix 5 known API footguns in @gravito/core: Router console.log leakage, ModelNotFoundException string sentinel, boot() observabilityProvider forwarding, deprecated services annotation, and skipped orbit-middleware-isolation tests. All fixes are backward-compatible and scoped to @gravito/core package only.

</domain>

<decisions>
## Implementation Decisions

### Testing Strategy
- **D-01:** Tests for each fix should be added to existing test files, not new dedicated files. FIX-01/02 go into Router tests, FIX-03 into PlanetCore tests, FIX-04 into existing type/deprecation tests, FIX-05 restores the already-existing skipped tests.
- **D-02:** FIX-01 (console.log removal) should be verified via `spyOn(console, 'log')` — spy after route registration and assert it was not called. Simple and precise.
- **D-03:** FIX-05 (skipped tests) — the two `it.skip` tests in `orbit-middleware-isolation.test.ts` may require changes to mountOrbit path stripping or middleware dispatch logic in Router/PlanetCore. Scope of implementation changes is at Claude's discretion based on analysis, but existing tests must not break.

### Claude's Discretion
- FIX-02 implementation approach: whether to throw ModelNotFoundException directly at Router.ts:436 (eliminating the two-stage throw/catch) or keep the catch structure with a different signal mechanism. Claude should choose the cleanest approach.
- FIX-05 fix scope: Claude should analyze the root cause of the two skipped tests and determine the minimal fix needed, escalating to a future phase if the change would be too invasive.
- FIX-03/Phase ownership: REQUIREMENTS.md maps FIX-03 to Phase 24 but Phase 21 success criteria #3 includes observabilityProvider forwarding. Claude should resolve this during planning — likely a simple one-line fix in boot() that can be done in Phase 21 regardless of the Phase 24 config unification work.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source Code (fix targets)
- `packages/core/src/Router.ts` — Lines 610 (console.log), 436 (ModelNotFound throw), 473-476 (string comparison catch)
- `packages/core/src/PlanetCore.ts` — Lines 156 (observabilityProvider type), 202-203 (services @deprecated), 788-794 (boot() constructor spread missing observabilityProvider)
- `packages/core/src/exceptions/ModelNotFoundException.ts` — Existing exception class already imported by Router

### Test Files
- `packages/core/tests/orbit-middleware-isolation.test.ts` — Lines 33, 74 (two `it.skip` tests to restore)

### Requirements
- `.planning/REQUIREMENTS.md` — FIX-01 through FIX-05 definitions with line references

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ModelNotFoundException` class already exists and is imported in Router.ts — FIX-02 can use it directly
- `@deprecated` JSDoc already present on `services` property (line 202) — FIX-04 may already be partially done, needs IDE verification
- `ObservabilityProvider` type already defined in PlanetCore config interface (line 156)

### Established Patterns
- Exception hierarchy uses GravitoException base class with typed error codes
- PlanetCore.boot() uses spread pattern to forward config fields selectively (lines 789-794)
- Test files use `describe`/`it` blocks with Bun test runner

### Integration Points
- Router.ts console.log removal affects all route registration — must verify no downstream code depends on this output
- ModelNotFoundException change affects catch blocks in route model binding — downstream Satellite code may catch by string comparison (need grep verification)
- boot() observabilityProvider fix connects to @gravito/monitor integration path

</code_context>

<specifics>
## Specific Ideas

No specific requirements — fixes are well-defined by the requirements document with exact line references.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-api-footgun-fixes*
*Context gathered: 2026-03-29*
