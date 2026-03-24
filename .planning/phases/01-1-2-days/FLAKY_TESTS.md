# Flaky & Skipped Tests Baseline

**Generated:** 2026-03-24
**Test Run:** 11,925 tests across 978 files (293.95s)

## Summary

| Category | Count |
|----------|-------|
| Total Tests | 11,925 |
| Pass | 11,556 |
| Skip | 207 |
| Fail | 162 |
| Errors | 18 |

## Known Skipped Tests (207)

207 tests are skipped across the test suite. Key categories:

### Orbit Middleware Isolation (packages/core)

File: `packages/core/tests/orbit-middleware-isolation.test.ts`

Two critical tests are skipped (from CONCERNS.md):
- `it.skip('should successfully mount and route to an Orbit')`
- `it.skip('should isolate middleware between different Orbits')`

**Risk:** Middleware isolation might be broken without detection.

### Conditional Integration Tests (describe.skipIf)

The following suites skip based on environment conditions:
- `packages/core/tests/reliability/integration/dlq-*.integration.test.ts` (6 suites)
- `packages/core/tests/events/observability/tracing-integration.test.ts`
- `packages/flux/tests/postgresql-storage.test.ts`

**Condition:** Skip if external services (Redis, Kafka, Postgres) unavailable.

## Failing Tests (162) — Grouped by Package

### Banking E2E (examples/banking-cqrs-api) — 6 failures

- `Banking CQRS API - E2E Tests > should complete deposit journey` [5001ms]
- `Banking CQRS API - E2E Tests > should complete withdraw and history journey` [5000ms]
- `Banking CQRS API - E2E Tests > should complete transfer journey` [5001ms]
- `Banking CQRS API - E2E Tests > should reject invalid account creation` [5001ms]
- `Banking CQRS API - E2E Tests > should reject negative deposit` [5001ms]
- `Banking CQRS API - E2E Tests > should reject withdrawal with insufficient balance` [5000ms]

**Note:** All failures are timeouts (5000ms). Likely requires running service.

### scaffold Package — 15 failures (ModuleGenerator)

- `ModuleGenerator > generate() > should generate advanced module with event sourcing`
- `ModuleGenerator > Domain/Application/Presentation/Infrastructure layer generation > *` (12 tests)
- `StubGenerator > generates files from stubs`
- `StubGenerator > generates multiple files and supports helpers`
- `BaseGenerator > generates structure and common files`

### monolith Package — Logging (17 failures)

- `JsonlLogger > *` (9 tests) - File system adapter issues
- `Compactor > *` (10 tests) - Log compaction failures
- `LogRotator > *` (2 tests) - File compression issues

### launchpad Package — SEO (14 failures)

- `RemixScanner > *` (5 tests)
- `AstroScanner > *` (4 tests)
- `SvelteKitScanner > *` (4 tests)
- `Scanner adapters > *` (2 tests)
- `Strategies > IncrementalStrategy > *` (6 tests)
- `ConfigLoader > *` (7 tests)
- `Compactor, JsonlLogger Repair` tests

### core Package — Performance (4 failures)

- `P1.3 Phase 2.3 - Load Testing` — timeout failures
- `P1.3 Phase 2 - Event-Driven Cache Performance` — timeout/assertion failures
- `L1CacheManager > deletePattern` — assertion failure

### Atlas Integration (13 failures)

- `AtlasAccountRepository - Integration > *` (6 tests) — DB connection required
- `AtlasTransactionRepository - Integration > *` (7 tests) — DB connection required

### Other Notable Failures

- `jwt module > *` (5 tests) — JWT signing/verification
- `Galaxy Showcase Integration > *` (6 tests) — Service container resolution
- `FileSessionStore > *` (4 tests) — File system issues
- `LocalStore > *` (14 tests) — File storage operations
- `csrf helpers > *` (2 tests) — CSRF token handling
- `StaticLink > *` (9 tests) — React component rendering
- `MongoGrammar > *` (1 test) — MongoDB grammar

## Status Assessment

- **Banking E2E timeouts**: Require running server — expected skip in non-E2E environment
- **Atlas Integration**: Require DB connection — expected skip
- **scaffold/ModuleGenerator**: File system permission or path issues
- **monolith logging**: File system adapter implementation issue
- **launchpad SEO**: Route scanner implementation issues
- **jwt module**: Likely missing dependency or config

*Baseline recorded: 2026-03-24*
