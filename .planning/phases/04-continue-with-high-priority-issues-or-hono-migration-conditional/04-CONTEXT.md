# Phase 4A: Execute Phase 2C Remaining Items - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning
**Mode:** Phase 4A Execution (User-selected)

---

<domain>
## Phase Boundary

**Goal:** Eliminate remaining 43 intermittent test failures from Phase 2C execution, achieving 100% stable test suite (0 failures, 100% pass rate).

**Scope:** Sequential remediation of test infrastructure issues in JWT, CSRF, and Photon modules through isolation fixes, timeout optimization, and concurrency control.

**Success Criteria:**
- All 43 intermittent failures resolved
- Test pass rate: 100% (currently 97.8%)
- No regressions introduced
- Health score: ≥90/100 maintained
- All fixes are durable (pass 3+ consecutive CI runs)

</domain>

<decisions>
## Implementation Decisions

### Remediation Strategy (D-01)
**Decision:** Pursue complete elimination of intermittent test failures
- **Target state:** 0 failures, 100% pass rate (vs current 97.8%)
- **Timeline:** Estimated 2-3 days for comprehensive fixes
- **Rationale:** Health score is 90/100 with known instability risk; eliminating intermittents strengthens foundation for Hono Phase 4B migration

### Repair Approaches (D-02)
**Decision:** Use all three complementary repair strategies simultaneously
1. **Test Isolation Improvements (beforeEach cleanup)**
   - JWT/CSRF context pollution — unsecure beforeAll patterns
   - Pattern: Clear temp state in beforeEach, not just beforeAll
   - Reference: Phase 2C pattern in banking-cqrs, flash-sale-fullstack examples

2. **Timeout Calibration**
   - CI platform variance — some tests timeout on shared runners
   - Approach: Configure adaptive timeouts based on environment
   - Note: Reject "tight timing is anti-pattern" from Phase 2C; allow environment-specific config

3. **Concurrency Control**
   - bun:test concurrent mode tuning — reduce worker count or disable for sensitive tests
   - Approach: Use bun:test configuration to throttle Photon HTTP server tests
   - Goal: Eliminate race conditions under load

### Execution Sequence (D-03)
**Decision:** Sequential, one subsystem at a time (not parallel fixes)
- **Order:** JWT (lowest complexity) → CSRF (medium) → Photon (highest complexity)
- **Rationale:** Lower-risk fixes first; learnings from JWT/CSRF improvements inform Photon strategy
- **Gate:** After each subsystem, verify no new regressions in full test suite

### Package Scope (D-04)
**Decision:** Fix failures in these packages (from Phase 2C findings)
- `packages/photon/*` — HTTP server and middleware concurrent tests
- `packages/core/*` — JWT module context leakage in async tests
- `packages/signal/*` — CSRF middleware parallel execution issues
- `examples/*` — Integration tests (banking-cqrs, flash-sale-fullstack, static-site)

### Acceptance Definition (D-05)
**Decision:** Work complete when:
- ✓ 0 test failures in full suite (`bun test` → 11,925 tests all pass)
- ✓ 3+ consecutive CI runs without flakiness
- ✓ No modifications to test assertions (only test isolation/timing fixes)
- ✓ TypeCheck: 0 errors maintained
- ✓ Circular dependency check: 0 maintained

### Claude's Discretion
- **Implementation details of timeout values** — Claude chooses based on profiling results
- **Whether to skip certain low-impact tests** — e.g., environment-only tests can remain skipped if documented
- **Refactoring approach** — cleanup patterns, extraction of test utilities if beneficial

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2C Execution Results
- `.planning/phases/02-1-day/02-03-SUMMARY.md` — Phase 2C completion details, health score methodology
- `.planning/phases/02-1-day/02-03-PLAN.md` — Original test fix strategy and task breakdown

### Test Infrastructure Patterns
- `.planning/phases/02-1-day/02-02-INVESTIGATIONS.md` — Root cause analysis for all failure categories
- `packages/atlas/tests/drivers/driver-adaptive.integration.test.ts` — Postgres availability guard pattern
- `examples/banking-cqrs/tests/Integration/` — beforeEach cleanup pattern (DB test isolation)

### Project Framework Docs
- `./CLAUDE.md` — Project-specific guidelines (TypeScript strict, Bun v1.3.10 environment)
- `.planning/ROADMAP.md` — Phase context and Phase 4B next steps

### Bun Testing References
- Bun.test API documentation (via Context7 if needed) — concurrent configuration, timeout setup

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Database isolation pattern** — `packages/atlas/tests/drivers/driver-adaptive.integration.test.ts` shows Postgres availability check and CREATE TABLE IF NOT EXISTS pattern
- **Test cleanup utilities** — `examples/banking-cqrs/tests/Integration/` demonstrates beforeEach state reset patterns
- **Timeout configuration** — Existing project has `bun.toml` with configurable test settings

### Established Patterns
- **Bun:test migration** — Phase 2C already migrated vitest → bun:test for isolation improvements
- **Environment guards** — DOM availability checks (`typeof document !== 'undefined'`) prevent Bun jsdom-free env failures
- **Concurrency trade-offs** — Static tests (compilation, type checks) use parallelism; stateful tests (DB, HTTP) need sequencing

### Integration Points
- Test suite integration: `bun test` (entry point)
- CI environment: GitHub Actions (shared runners, variable latency)
- Framework testing: Bun v1.3.10 (current project standard)

</code_context>

<specifics>
## Specific Ideas

### Known Failure Patterns (from Phase 2C)
1. **JWT context pollution** — `packages/core/tests/auth-context.test.ts` and similar fail intermittently when parallel tests modify global auth state
2. **CSRF middleware isolation** — `packages/signal/tests/csrf.test.ts` times out under concurrent load; may need sequential test groups
3. **Photon HTTP concurrency** — Server startup race conditions in `packages/photon/tests/middleware/` under parallel test runners

### Success Indicators from Phase 2C
- Banking integration tests use `CREATE TABLE IF NOT EXISTS` in beforeEach → apply to all DB tests
- Flash-sale performance tests relaxed CI timing assertions → keep this pattern for environment-aware timing
- StaticLink tests skip gracefully when jsdom unavailable → extend to other DOM-dependent tests

### Documentation to Maintain
- Preserve Phase 2C's notes on "known limitations" (Orbit routing isolation, StaticLink env constraints)
- Update ROADMAP.md with Phase 4A completion to signal readiness for Phase 4B (Hono migration)

</specifics>

<deferred>
## Deferred Ideas

- **Comprehensive test refactoring** — Major restructure of test suite architecture belongs in dedicated phase, not 4A (4A is focused remediation)
- **E2E integration tests for migrations** — Phase 4B (Hono) will require fresh E2E test strategy; defer until Phase 4B planning
- **Performance benchmarking** — Formal performance testing framework (separate from flakiness fixes) belongs in Phase 6 (Full Audit)

</deferred>

---

*Phase: 04-continue-with-high-priority-issues-or-hono-migration-conditional*
*Context gathered: 2026-03-26 via /gsd:discuss-phase 4*
