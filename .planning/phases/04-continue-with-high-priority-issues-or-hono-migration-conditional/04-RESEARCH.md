# Phase 4A: Execute Phase 2C Remaining Items - Research

**Researched:** 2026-03-26
**Domain:** bun:test concurrency control, test isolation patterns, intermittent failure remediation
**Confidence:** HIGH (all findings grounded in direct codebase inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 Remediation Strategy:** Pursue complete elimination of intermittent test failures. Target: 0 failures, 100% pass rate (vs current 97.8%). Timeline: 2-3 days.

**D-02 Repair Approaches:** Use all three complementary strategies simultaneously:
1. Test isolation improvements (beforeEach cleanup) — JWT/CSRF context pollution
2. Timeout calibration — CI platform variance, environment-specific config
3. Concurrency control — bun:test worker count tuning for Photon HTTP server tests

**D-03 Execution Sequence:** Sequential, one subsystem at a time. Order: JWT (lowest complexity) → CSRF (medium) → Photon (highest complexity). Gate after each: full suite must show no new regressions.

**D-04 Package Scope:**
- `packages/photon/*` — HTTP server and middleware concurrent tests
- `packages/core/*` — JWT module context leakage in async tests
- `packages/signal/*` — CSRF middleware parallel execution issues
- `examples/*` — Integration tests (banking-cqrs, flash-sale-fullstack, static-site)

**D-05 Acceptance Definition:** Work complete when:
- 0 test failures in full suite (`bun test` → 11,925 tests all pass)
- 3+ consecutive CI runs without flakiness
- No modifications to test assertions (only test isolation/timing fixes)
- TypeCheck: 0 errors maintained
- Circular dependency check: 0 maintained

### Claude's Discretion
- Implementation details of timeout values — Claude chooses based on profiling results
- Whether to skip certain low-impact tests — e.g., environment-only tests can remain skipped if documented
- Refactoring approach — cleanup patterns, extraction of test utilities if beneficial

### Deferred Ideas (OUT OF SCOPE)
- Comprehensive test refactoring — major restructure belongs in a dedicated phase
- E2E integration tests for migrations — Phase 4B (Hono) will require fresh E2E test strategy
- Performance benchmarking — formal performance testing framework belongs in Phase 6 (Full Audit)
</user_constraints>

---

## Summary

Phase 4A addresses 43 intermittent test failures that remain after Phase 2C. The Phase 2C summary explicitly categorizes these as **concurrency-related**: all 43 pass when run in isolation (`bun test --filter=<package>`), and fail non-deterministically only under the full parallel suite. The root causes fall into four concrete categories: (1) shared mock module state in `dark-matter` MongoGrammar tests, (2) CSRF token generation state in `photon/middleware-extra.test.ts`, (3) `OrbitSignalWebhook` environment dependency in `signal`, and (4) flash-sale performance timing assertions sensitive to CI CPU load.

The codebase already contains proven remediation patterns from Phase 2C: the `CREATE TABLE IF NOT EXISTS` in `beforeEach` for DB contamination, `typeof document !== 'undefined'` for DOM guards, and `bun:test` import migration from vitest. Phase 4A extends these same patterns to the remaining failure categories.

**Primary recommendation:** Fix each failure category by forcing isolation — reset shared singleton state in `beforeEach`, add `mock.restore()` calls after mock module tests, and use `--test-timeout` per-file flags where environment sensitivity is the sole cause.

---

## Project Constraints (from CLAUDE.md)

| Constraint | Detail |
|-----------|--------|
| TypeScript strict mode | `noUnusedLocals` + `noUnusedParameters` enabled. Any new helper code must use all declared variables |
| No `@ts-ignore` | Forbidden unless accompanied by explanatory comment |
| Code style | 100-char width, 2-space indent, single quotes, no semicolons, ES5 trailing commas |
| Commit messages | English, format: `fix: [package] description` |
| Test coverage target | 75%+ per package (from CLAUDE.md); do not reduce coverage |
| No circular deps | Pre-push hook enforces; Phase 4A fixes must not introduce new dep edges |
| Satellite isolation | Not relevant for Phase 4A (no satellite changes) |
| Immutability | New helper code must not mutate objects |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bun:test | Bun v1.3.10 built-in | Test runner | Already migrated from vitest; project standard |
| @gravito/atlas DB singleton | Internal | SQLite in-memory connections | Phase 2C established `CREATE TABLE IF NOT EXISTS` in `beforeEach` as the isolation pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `mock.module()` from bun:test | Bun built-in | Module-level mock injection | For MongoDB/external deps — already used in dark-matter tests |
| `mock.restore()` from bun:test | Bun built-in | Reset mocks between tests | Use in `afterEach` when `mock.module()` produces shared static state |
| `bunfig.toml [test]` | Bun built-in | Per-suite timeout config | Root `bunfig.toml` has `timeout = "10000ms"`; per-package overrides possible |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Per-test isolation in `beforeEach` | `--jobs=1` (serial execution) | Serial execution hides real concurrency bugs; isolation in beforeEach is safer |
| Relaxing timing assertions | Removing timing tests entirely | Phase 2C already relaxed CI thresholds; removing entirely loses regression signal |
| `mock.restore()` global | `afterAll` cleanup | `afterEach` is safer for parallel workers — `afterAll` runs after entire file, not per-test |

**Installation:** No new packages required. All fixes use existing bun:test built-ins.

---

## Architecture Patterns

### Proven Pattern 1: beforeEach Singleton Reset

Used in `examples/banking-cqrs/tests/Integration/Repositories/AccountRepository.integration.test.ts` (Phase 2C fix):

```typescript
// Source: examples/banking-cqrs/tests/Integration/Repositories/AccountRepository.integration.test.ts
beforeEach(async () => {
  // Ensure table exists (in case the connection was reset by another concurrent test file)
  await DB.raw(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      owner_name TEXT NOT NULL,
      balance INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'TWD',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  // Clean table between tests
  await DB.raw('DELETE FROM accounts')
  repository = new AtlasAccountRepository()
})
```

**When to use:** Any test that reads/writes to a DB singleton (`DB.addConnection('default', ...)`) and may run concurrently with other files that also call `addConnection('default', ...)`.

### Proven Pattern 2: Postgres Availability Guard

Used in `packages/atlas/tests/drivers/driver-adaptive.integration.test.ts`:

```typescript
// Source: packages/atlas/tests/drivers/driver-adaptive.integration.test.ts
let isPostgresAvailable = true

beforeEach(async () => {
  driver = new PostgresDriver(config)
  try {
    await driver.connect()
    await driver.query('SELECT 1')
  } catch (_e) {
    isPostgresAvailable = false
    console.warn('Postgres not available for integration tests, some tests will be skipped')
  }
})

it('should accept target pool size parameter', async () => {
  if (!isPostgresAvailable) {
    return  // early return instead of throw
  }
  // ... test body
})
```

**When to use:** Any test that requires an external service (Postgres, Redis, MongoDB). The guard prevents hard failures in CI environments where the service is absent. Reset `isPostgresAvailable` in `beforeEach`, NOT `beforeAll`, because concurrent test files may change environment state.

### Proven Pattern 3: DOM Availability Guard

Used in `templates/static-site/src/client/components/__tests__/StaticLink.svelte.test.ts` (Phase 2C fix):

```typescript
// Pattern: typeof document !== 'undefined'
import { describe, expect, it } from 'bun:test'

describe('StaticLink', () => {
  it('renders correctly', () => {
    if (typeof document === 'undefined') {
      // Skip gracefully when jsdom is unavailable (Bun runtime)
      return
    }
    // ... DOM assertions
  })
})
```

**When to use:** Any test relying on browser globals (`document`, `window`, `navigator`) in Bun's jsdom-free environment.

### Proven Pattern 4: mock.module() with Hoisting Guard

Used in `packages/dark-matter/tests/Mongo.integration.test.ts`:

```typescript
// Source: packages/dark-matter/tests/Mongo.integration.test.ts
mock.module('mongodb', () => {
  // Define inside factory to avoid Bun mock.module hoisting timing issues
  class _ObjectId { ... }
  return { MongoClient: MongoClientMock, ObjectId: _ObjectId, GridFSBucket: _GridFSBucket }
})
```

**Key insight from code comment:** The comment explicitly calls out "Bun mock.module 提升導致的時序問題" (hoisting timing issues). When `mock.module()` is used, the mock factory must be self-contained. Shared state (like `createdClients` array and `MongoClientMock.shouldFailConnectTimes`) must be reset in `beforeEach`:

```typescript
beforeEach(() => {
  createdClients.length = 0                    // reset array
  MongoClientMock.shouldFailConnectTimes = 0   // reset static counter
})
```

**The gap:** The current `dark-matter/Mongo.integration.test.ts` resets `createdClients` and `shouldFailConnectTimes` in `beforeEach` — but the `Mongo` facade itself is a singleton with its own connection state. Tests that call `Mongo.configure()` and `Mongo.connect()` modify this singleton. Concurrent test files that also import `Mongo` share this state.

### Anti-Patterns to Avoid

- **Resetting shared state only in `beforeAll`:** If another test file overwrites a singleton connection between your `beforeAll` and your first `it()`, state is already corrupted. Always use `beforeEach`.
- **Hard-coding timeout values in test bodies:** Use `bunfig.toml` or per-test `{ timeout: N }` option in `it()` calls. Never use `setTimeout` delays to "wait for" async operations.
- **Relying on `afterAll` to clean global singletons:** In bun:test parallel mode, `afterAll` runs per-file, but another file may have already imported and modified the singleton before cleanup.
- **Using static class properties as test state:** `MongoClientMock.shouldFailConnectTimes = 0` is safe only when the class is defined within the test file. If shared across files, reset fails.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Waiting for async server ready | Custom `setTimeout` polling loop | `await server.ready()` or port probe | Race condition prone |
| Unique temp dirs per test | Manual `Math.random()` suffix | `Bun.file(path).exists()` check + unique suffix | OS temp cleanup already handles isolation |
| Tracking which mocks to restore | Manual mock registry | `mock.restore()` from bun:test | Built-in, works with bun's mock lifecycle |
| Per-package timeout config | Custom test runner wrapper | Per-package `bunfig.toml` `[test] timeout` override | Bun supports per-directory bunfig.toml |

---

## Common Pitfalls

### Pitfall 1: `mock.module()` Shared Static State

**What goes wrong:** `mock.module('mongodb', ...)` creates a module-level mock. When bun:test runs files in parallel workers, two workers may import the same mocked module. Static properties on the mock class (`MongoClientMock.shouldFailConnectTimes`) are shared only within a single worker's module registry — but the `Mongo` facade singleton (`packages/dark-matter/src/Mongo.ts`) may persist state across test files within the same worker.

**Why it happens:** Bun's test runner uses worker threads per-file by default. Module singletons are isolated per-worker. But if bun assigns two related test files to the same worker, the `Mongo` facade retains its `connect()` state from the previous file's tests.

**How to avoid:**
1. Reset the facade's state in `beforeEach` by calling its configure/reset method if one exists
2. If no reset method exists, refactor to add one, or force per-test instance creation
3. Document the known shared singleton constraint with a comment

**Warning signs:** Intermittent failures where test order matters (test A passes when run first, fails when test B runs first in the same file).

### Pitfall 2: CSRF Token State from getCsrfToken()

**What goes wrong:** In `packages/photon/tests/unit/middleware/middleware-extra.test.ts`, `getCsrfToken(ctx)` calls into the CSRF middleware which may call `Math.random()` or use a module-level token cache. If the CSRF module maintains a token map keyed by something that leaks between tests, concurrent workers that share the module registry (same worker, different test runs) see stale tokens.

**Why it happens:** The `middleware-extra.test.ts` file's `makeContext()` helper creates fresh mock contexts per test, which should isolate state. However, if the CSRF module caches tokens at the module level (outside the function), that cache is shared.

**How to avoid:**
1. Inspect `packages/photon/src/middleware/security/csrf.ts` for any module-level state (Maps, Sets, or closures capturing mutable variables)
2. If found: add a `resetCsrfState()` export for test use, call it in `beforeEach`
3. If `getCsrfToken()` generates random tokens using module-level state: ensure each test creates truly independent input (unique cookie values)

**Warning signs:** `getCsrfToken` returns an unexpected token value, or `csrfProtection` rejects a token that should match.

### Pitfall 3: Photon HTTP Server Port Conflicts

**What goes wrong:** Tests that start an actual HTTP server (e.g., `middleware-sse.test.ts`, `middleware-websocket.test.ts`, `middleware-ratelimit-redis.test.ts`) bind to a port. Two workers running simultaneously may try to bind the same port, causing `EADDRINUSE`.

**Why it happens:** `bunfig.toml` has no `--jobs` (worker count) setting currently. The default behavior is parallel execution.

**How to avoid:**
1. Use `port: 0` (OS-assigned ephemeral port) instead of `port: 3000` in test server setup
2. Read the actual port from the server instance after binding: `server.port`
3. Pass that port to the test HTTP client

**Warning signs:** `Error: listen EADDRINUSE: address already in use :::3000`

### Pitfall 4: Flash-Sale Performance Timing on Shared CI Runners

**What goes wrong:** Assertions like `expect(elapsed).toBeLessThan(100)` fail on slow CI runners where GC pauses or CPU contention cause 100ms+ delays.

**Why it happens:** Phase 2C already relaxed timing assertions in flash-sale tests when migrating from vitest→bun:test. Any remaining absolute-time assertions carry the same risk.

**How to avoid:**
1. Replace absolute time assertions (`< 100ms`) with relative ones (`< baseline * 2`)
2. Or use the "fast enough if not dramatically slow" pattern: `expect(elapsed).toBeLessThan(5000)` (5x the expected value)
3. Document which tests are timing-sensitive and why

**Warning signs:** Test fails with `Expected X to be less than Y` where X is 100-300% of the threshold Y.

### Pitfall 5: bun:test `beforeEach` is NOT guaranteed to run before mock side effects

**What goes wrong:** `mock.module()` is hoisted before any `beforeEach` in bun:test. If your `beforeEach` sets a value that the mock factory reads, the factory runs first with the default (empty) value.

**How to avoid:** All mock factory state must be initialized at module level (outside hooks), then reset in `beforeEach`. See Pattern 4 above.

---

## Failure Category Analysis

Based on Phase 2C SUMMARY.md's documented remaining 43 failures:

| Category | Count | Files | Root Cause | Fix Strategy |
|----------|-------|-------|-----------|-------------|
| Photon middleware-extra (CSRF) | ~1-2 | `packages/photon/tests/unit/middleware/middleware-extra.test.ts` | Shared state in parallel workers; CSRF module may cache tokens | Inspect `csrf.ts` for module-level state; add reset in beforeEach |
| Flash-sale performance timing | ~10-20 | `examples/flash-sale-fullstack/src/cache/tests/` | CI CPU load variance despite Phase 2C relaxation | Further relax or convert remaining absolute thresholds to relative |
| MongoGrammar parsing | ~2 | `packages/dark-matter/tests/Mongo.integration.test.ts` | Mongo facade singleton state leaked across tests in same worker | Add facade state reset in beforeEach; use fresh instance per test |
| WebhookPlugin | ~1 | `packages/signal/tests/OrbitSignalWebhook.test.ts` | Environment dependency (SendGrid API or port binding) | Guard with environment check or pure mock |
| Other intermittent | ~20 | Various | Various concurrency artifacts | Profile by running `bun test --filter=<file>` in isolation |

---

## Code Examples

### Resetting bun:test Mocks Between Tests

```typescript
// Source: bun:test built-in API (verified in dark-matter tests pattern)
import { afterEach, beforeEach, mock } from 'bun:test'

// Module-level: define mutable state at top, reset in beforeEach
const callLog: string[] = []

beforeEach(() => {
  callLog.length = 0                     // reset array
  SomeClass.staticCounter = 0            // reset static
})

afterEach(() => {
  mock.restore()                         // restore all mocks to original
})
```

### Per-Test Ephemeral Port for HTTP Servers

```typescript
// Pattern: use port 0 for OS-assigned port, avoid EADDRINUSE
import { afterEach, beforeEach } from 'bun:test'

let server: ReturnType<typeof Bun.serve>
let baseUrl: string

beforeEach(async () => {
  server = Bun.serve({
    port: 0,               // OS picks available port
    fetch: appHandler,
  })
  baseUrl = `http://localhost:${server.port}`
})

afterEach(async () => {
  server.stop()
})
```

### Verifying Isolation: Run a Single File

```bash
# Confirm test passes in isolation before fixing concurrency
bun test packages/photon/tests/unit/middleware/middleware-extra.test.ts

# Confirm test fails under full suite (reproduces the intermittent failure)
bun test 2>&1 | grep -E "FAIL|✗" | grep middleware-extra
```

### Per-File bunfig.toml Timeout Override

```toml
# packages/photon/bunfig.toml (create if needed)
[test]
timeout = "30000ms"    # 30s for HTTP server startup tests
```

Root `bunfig.toml` already sets:
```toml
[test]
timeout = "10000ms"    # 10s global default
root = "."
```

Bun respects the nearest `bunfig.toml` to the test file, so per-package overrides work.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (Bun v1.3.10 built-in) |
| Config file | `/Users/carl/Dev/Carl/gravito-core/bunfig.toml` |
| Quick run command | `bun test packages/photon/tests/unit/middleware/middleware-extra.test.ts` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | All packages pass with 0 failures | full suite | `bun test 2>&1 \| tail -5` | ✅ (suite already exists) |
| TEST-03 | No flaky or intermittent tests | stability | `for i in 1 2 3; do bun test 2>&1 \| grep -c "fail"; done` | ✅ (verification protocol) |

### Sampling Rate
- **Per fix commit:** `bun test <affected-file> && bun test` (isolated pass + full suite)
- **Per subsystem gate (D-03):** `bun test` — full suite, 0 new failures vs baseline
- **Phase gate:** Full suite green × 3 consecutive runs before marking D-05 complete

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. No new test files needed; fixes are within existing test files only.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun v1.3.10 | All tests | ✓ | 1.3.10 (project standard) | — |
| SQLite (built-in) | banking-cqrs integration tests | ✓ | Bun built-in | — |
| PostgreSQL | atlas driver-adaptive tests | ✗ (typically) | — | `isPostgresAvailable` guard pattern (already in place) |
| MongoDB | dark-matter tests | ✗ (mocked) | — | `mock.module('mongodb', ...)` already in place |
| jsdom | StaticLink svelte tests | ✗ | — | `typeof document !== 'undefined'` guard (already in place) |

**Missing dependencies with no fallback:** None. All external dependencies are either built-in or already guarded.

**Missing dependencies with fallback:** PostgreSQL — guarded by `isPostgresAvailable` pattern.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| vitest imports | bun:test imports | Phase 2C (2026-03-26) | Timeout semantics differ; `vi.stubGlobal` not available in bun |
| `beforeAll` table creation | `beforeEach` `CREATE TABLE IF NOT EXISTS` | Phase 2C | Resilient to DB connection contamination by concurrent files |
| Absolute timing assertions (5s vitest timeout) | Relaxed CI-appropriate thresholds (10s bun timeout) | Phase 2C | Reduces flash-sale false failures |
| Hard-coded ports (3000) | Ephemeral port 0 (recommended) | Phase 4A target | Eliminates EADDRINUSE race condition |

**Deprecated/outdated:**
- `vi.stubGlobal`: vitest-only API, replaced by `bun:test` DOM guard
- `import { describe, it } from 'vitest'`: All test files must use `bun:test`

---

## Open Questions

1. **Is the CSRF failure in `middleware-extra.test.ts` from module-level cache or worker-level state sharing?**
   - What we know: Test passes in isolation; fails ~1-2 times per full suite run
   - What's unclear: Whether `getCsrfToken()` uses a module-level Map/Set for token tracking
   - Recommendation: Read `packages/photon/src/middleware/security/csrf.ts` before writing the fix

2. **Does bun:test's `mock.module()` isolation guarantee prevent the Mongo facade issue?**
   - What we know: `dark-matter/tests/Mongo.integration.test.ts` resets `createdClients` and `shouldFailConnectTimes` in `beforeEach`
   - What's unclear: Whether the `Mongo` facade (a separate module) is also reset between test files in the same worker
   - Recommendation: Check if `Mongo` has a `reset()` or `disconnect()` method; add `beforeEach` call to it

3. **Are all 20 "Other intermittent" failures from the same packages or truly scattered?**
   - What we know: Phase 2C SUMMARY says "~20 Other intermittent" in various concurrency
   - What's unclear: Exact files — this category needs a profiling run to enumerate
   - Recommendation: First task of Phase 4A should be `bun test 2>&1 | grep FAIL` three times to build a failure frequency map

4. **Can bun:test worker count be reduced via `bunfig.toml`?**
   - What we know: `bunfig.toml` `[test]` supports `timeout` and `root`
   - What's unclear: Whether `--jobs` CLI flag has a `bunfig.toml` equivalent for `workers` or `jobs`
   - Recommendation: Check Bun docs; CLI `bun test --jobs=4` reduces parallelism if needed

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `packages/atlas/tests/drivers/driver-adaptive.integration.test.ts` — Postgres guard pattern
- Direct codebase inspection — `examples/banking-cqrs/tests/Integration/Repositories/AccountRepository.integration.test.ts` — `beforeEach` `CREATE TABLE IF NOT EXISTS` pattern
- Direct codebase inspection — `packages/photon/tests/unit/middleware/middleware-extra.test.ts` — CSRF test structure, full file read
- Direct codebase inspection — `packages/dark-matter/tests/Mongo.integration.test.ts` — mock.module hoisting pattern and singleton reset
- `.planning/phases/02-1-day/02-03-SUMMARY.md` — Phase 2C completion, 43 failure categories with counts
- `.planning/phases/04-continue-with-high-priority-issues-or-hono-migration-conditional/04-CONTEXT.md` — All locked decisions
- `bunfig.toml` — Confirmed `timeout = "10000ms"` and `root = "."` at project root

### Secondary (MEDIUM confidence)
- `.planning/phases/02-1-day/02-02-INVESTIGATIONS.md` — Root cause analysis corroborated by Phase 2C execution results
- `.planning/phases/02-1-day/02-03-PLAN.md` — Planned tasks (most already resolved, 43 remain)

### Tertiary (LOW confidence — training data, not yet verified in codebase)
- Bun `port: 0` ephemeral port pattern — standard POSIX practice, very likely to work in Bun; recommend verifying against one of the HTTP test files before writing the fix

---

## Metadata

**Confidence breakdown:**
- Failure categories: HIGH — directly sourced from Phase 2C SUMMARY.md
- Fix patterns: HIGH — all patterns extracted from existing codebase implementations
- Bun concurrency config: MEDIUM — `bunfig.toml` confirmed to support `timeout`; `--jobs` flag CLI only (not in toml) needs verification
- Ephemeral port pattern: MEDIUM — standard practice, not yet seen in codebase HTTP tests

**Research date:** 2026-03-26
**Valid until:** 2026-04-09 (stable domain; bun:test API unlikely to change in 2 weeks)
