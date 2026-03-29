# Phase 20: Integration Verification & Graceful Degradation - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify the full system (Orbits + Satellites) behaves correctly under the new error model, implement OrbitDegradationManager for typed fallback on circuit breaker open, bump versions for all modified packages, and write a migration guide documenting breaking changes with before/after examples.

This is the final phase of v2.0.0. No new error classes, no new resilience primitives — only integration verification, the degradation layer, version management, and documentation.

</domain>

<decisions>
## Implementation Decisions

### OrbitDegradationManager API Design
- **D-01:** OrbitDegradationManager lives in `@gravito/resilience` — natural extension of existing withResilience/CircuitOpenException. No new package.
- **D-02:** API uses `DegradedResult<T>` pattern:
  ```typescript
  interface DegradedResult<T> {
    value: T
    degraded: boolean
    source: 'live' | 'fallback'
  }
  ```
  Callers can distinguish normal from degraded results via `result.degraded`.
- **D-03:** Fallback registration via `mgr.registerFallback(orbitName, { fn, ttl })`. TTL controls how long a cached fallback is valid.
- **D-04:** `mgr.execute(orbitName, fn)` catches `CircuitOpenException` internally and returns registered fallback wrapped in `DegradedResult`. If no fallback registered, re-throws.
- **D-05:** In `NODE_ENV=test`, DegradationManager skips fallback logic entirely and throws `CircuitOpenException` directly. Consistent with Phase 17 decision (test env must throw, not silently degrade).

### Version Bump Strategy
- **D-06:** Only the 38 packages actually modified in Phase 16-19 get version bumps. Unmodified packages keep current versions.
- **D-07:** Each modified package gets major version +1 (e.g., signal 3.1.2 → 4.0.0, photon 1.1.4 → 2.0.0, atlas 2.6.0 → 3.0.0). Follows semver — independent version evolution per package.
- **D-08:** All peerDependencies referencing bumped packages must be updated to the new major range (e.g., `"@gravito/core": "^3.0.0"`). Internal workspace:* protocol stays unchanged.
- **D-09:** `bun run version:check` must pass after all bumps — confirms workspace version consistency.

### Satellite Integration Testing
- **D-10:** Contract tests written in gravito-core (no cross-repo dependency). Tests verify:
  1. Orbit API signatures consumed by Satellites are unchanged
  2. Error types are backward-compatible (instanceof still works)
  3. Event protocol contracts are preserved
- **D-11:** No need to clone gravito-dev-env or run actual Satellite test suites. Contract tests in this repo are sufficient for v2.0.0 release confidence.

### Migration Guide
- **D-12:** Location: `docs/migration/v2.0.0.md`
- **D-13:** Content structure: breaking changes list, before/after code examples per category (error handling, resilience, health checks), per-package version change summary.
- **D-14:** Audience: framework consumers (Satellite developers, application developers using Gravito Orbits directly).

### Claude's Discretion
- OrbitDegradationManager internal implementation details (how to intercept CircuitOpenException, cache invalidation strategy)
- Exact contract test structure and assertions for Satellite compatibility
- Migration guide formatting, depth of before/after examples, and whether to include a "quick start" section
- Version bump automation approach (script vs manual)
- Order of operations within the phase (tests first vs degradation first vs version first)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Resilience infrastructure (Phase 17 foundation)
- `packages/resilience/src/resilience/withResilience.ts` — Current withResilience implementation; line 29 explicitly defers fallback to Phase 20
- `packages/resilience/src/exceptions/CircuitOpenException.ts` — Exception that DegradationManager must catch
- `packages/resilience/src/resilience/ResiliencePolicy.ts` — Policy type that DegradationManager extends

### Health monitoring (Phase 19 foundation)
- `packages/monitor/src/health/HealthRegistry.ts` — Health check registry; DegradationManager may integrate with health status
- `packages/monitor/src/health/HealthController.ts` — HTTP endpoint for health reports

### Prior phase contexts
- `.planning/phases/16-core-error-model-foundation/16-CONTEXT.md` — Error hierarchy decisions
- `.planning/phases/17-resilience-infrastructure/17-CONTEXT.md` — Resilience primitive decisions (especially D-11 on fallback deferral)
- `.planning/phases/18-foundation-orbit-migration/18-CONTEXT.md` — Foundation Orbit migration patterns
- `.planning/phases/19-secondary-orbit-migration/19-CONTEXT.md` — Batch migration patterns, health check registration

### State and requirements
- `.planning/STATE.md` — Key decisions table, open questions (FortifyError httpStatus, DegradationManager fallback API shape — now resolved)
- `.planning/REQUIREMENTS.md` — INTG-05 (DegradationManager) and RELS-01 (version bumps) are this phase's requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/resilience/src/resilience/withResilience.ts` — OrbitDegradationManager wraps this; catches CircuitOpenException to provide fallback
- `packages/resilience/src/exceptions/CircuitOpenException.ts` — The exception type DegradationManager intercepts
- `packages/monitor/src/health/HealthRegistry.ts` — Health status can inform degradation decisions
- `packages/resilience/src/circuit-breaker/` — Existing CB infrastructure with named registry (cbRegistry Map)

### Established Patterns
- **Exception hierarchy:** All Orbit errors extend GravitoException with `.code`, `.status`, `.cause` (Phase 16)
- **Resilience composition:** `withResilience(fn, policy)` composes timeout + CB + retry in correct order (Phase 17)
- **Health registration:** `monitor.health.register(name, checkFn)` pattern used across all I/O Orbits (Phase 19)
- **Contract tests:** `assertGravitoException` helper exists for verifying error hierarchy contracts (Phase 16)

### Integration Points
- OrbitDegradationManager hooks into `@gravito/resilience` barrel exports
- Version bumps touch all 38 modified packages' `package.json` files
- Contract tests for Satellite compat go in a new test directory (e.g., `packages/resilience/tests/satellite-contracts/` or dedicated test location)
- Migration guide at `docs/migration/v2.0.0.md` — new file

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for implementation details.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 20-integration-verification-graceful-degradation*
*Context gathered: 2026-03-29*
