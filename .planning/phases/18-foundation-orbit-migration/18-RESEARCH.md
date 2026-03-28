# Phase 18: Foundation Orbit Migration - Research

**Researched:** 2026-03-28
**Domain:** Error model adoption + resilience wiring across atlas, plasma, photon, signal
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Migration order is plasma -> signal -> photon -> atlas (easy to hard)
- **D-02:** Each package verified independently (typecheck + test + contract test) before moving to next
- **D-03:** "re-inherit + preserve factory methods" — existing error classes change parent to GravitoException hierarchy; old names preserved as exports for backward compat
- **D-04:** Default resilience policies per package:
  | Package | Retry | Circuit Breaker | Timeout |
  |---------|-------|-----------------|---------|
  | atlas (DB) | 3x, idempotent:true | threshold 5, reset 30s | 5000ms |
  | plasma (Redis) | none | threshold 3, reset 15s | 2000ms |
  | signal (SMTP) | 3x, idempotent:true | none | 10000ms |
  | photon (HTTP) | none | threshold 10, reset 60s | none |
- **D-05:** Existing custom retry logic replaced by `@gravito/resilience` `withRetry`. No dual retry paths.
- **D-06:** atlas `transactionWithRetry` is NEVER wrapped with external `withRetry`
- **D-07:** Photon's `middleware/circuit-breaker.ts` keeps public middleware API unchanged; internal implementation replaced with `@gravito/resilience` `CircuitBreaker`
- **D-08:** Photon ErrorHandler returns HTTP 503 with `Retry-After` header when CircuitBreaker is open
- **D-09:** Shutdown order: photon (2s) → signal (5s) → plasma (3s) → atlas (5s)
- **D-10:** Global shutdown timeout of 10s; force-close on deadline exceeded
- **D-11:** Plasma's existing `core:shutdown` hook is enhanced with deadline enforcement

### Claude's Discretion

- Exact ErrorCodes namespace values for each package (following `db.*`, `redis.*`, `mail.*` convention)
- Internal module organization within each package's error files
- Whether to add `Error.captureStackTrace()` alongside `Object.setPrototypeOf`
- Shutdown handler implementation details (Promise.race vs AbortController)
- How to handle plasma's `BunRedisClient.retryWithBackoff()` removal
- Contract test structure for each package (follow Phase 16 scaffolding pattern)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INTG-01 | Circuit breaker integrated into atlas DB connection pool | CB wrapping connection-level ops in `OrbitAtlas`/`DB` using `@gravito/resilience` `CircuitBreaker`; intermediate `DatabaseException` class needed in `@gravito/core` |
| INTG-02 | Circuit breaker integrated into plasma Redis client | CB wrapping `BunRedisClient.connect()` and command ops; `RedisError` re-inherits from new `CacheException`; `retryWithBackoff()` removed and replaced with `withRetry` (no retry per D-04) |
| INTG-03 | atlas, plasma, stream, signal, beam register `core:shutdown` handlers with deadline | Phase 18 covers atlas, plasma, signal, photon; stream/beam deferred to Phase 19; deadline via `Promise.race([operation, timeout])` or AbortController |
</phase_requirements>

---

## Summary

Phase 18 migrates the four highest-blast-radius Orbit packages (plasma, signal, photon, atlas) to the unified error model from Phase 16 and wires the resilience primitives from Phase 17. All five building blocks are already in place: `GravitoException` hierarchy (core), `InfrastructureException` (core), `withRetry/CircuitBreaker/withResilience` (resilience package). The primary work is re-parenting existing error classes, creating two missing intermediate exception classes (`DatabaseException`, `CacheException`) in `@gravito/core`, wiring `withResilience` at the correct call-site granularity per package, and adding deadline-enforced shutdown handlers.

The most complex migration is atlas, because it has six-plus error classes in two separate files (`errors/index.ts` and `orm/model/errors.ts`), plus ORM-specific model errors, and its `transactionWithRetry` must not receive external retry wrapping. Photon is structurally the simplest because its public API is frozen — only the internal `CircuitBreaker` class swaps. Plasma has a pre-existing shutdown hook (enhancement only) and one error class to migrate, but the `retryWithBackoff()` removal must be handled carefully because `connect()` relies on it today.

**Primary recommendation:** Create `DatabaseException` and `CacheException` in `@gravito/core` first (Wave 0), then proceed plasma → signal → photon → atlas per D-01, with contract tests written before each migration (per D-02 pattern from Phase 16).

---

## Standard Stack

### Core (All Present — No New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@gravito/core` | workspace | `GravitoException`, `InfrastructureException` base classes | The hierarchy all packages extend |
| `@gravito/resilience` | workspace | `withResilience`, `CircuitBreaker`, `withRetry`, `ResiliencePolicy` | Phase 17 output; canonical resilience API |
| `cockatiel` | ^3.x (via resilience) | Underlying retry/CB engine inside `withResilience` | Internal only — never exposed in migrated packages |

### Per-Package Dependencies to Add

| Package | Add Dependency | Why |
|---------|----------------|-----|
| atlas | `@gravito/resilience` | Needs `withResilience` for connection-level ops |
| plasma | `@gravito/resilience` | Needs `CircuitBreaker` for Redis; removes own `retryWithBackoff` |
| signal | `@gravito/resilience` | Needs `withRetry` to replace `BaseTransport` retry loop |
| photon | already has photon/resilience bridge | Internal CB swap; may need direct `@gravito/resilience` dep |

**Installation (per package):**
```bash
# In packages/atlas, packages/plasma, packages/signal package.json:
# Add: "@gravito/resilience": "workspace:*"
```

---

## Architecture Patterns

### Pattern 1: Error Class Re-Inheritance (D-03)

**What:** Change `extends Error` / `extends DatabaseError` to extend the new hierarchy while keeping the old class name as the export identifier.
**When to use:** Every existing error class in the 4 packages.

```typescript
// Source: packages/core/src/exceptions/InfrastructureException.ts (verified)
// BEFORE:
export class DatabaseError extends Error {
  constructor(message: string, originalError?: unknown, ...) {
    super(message)
    this.name = 'DatabaseError'
    this.originalError = originalError
  }
}

// AFTER (re-inherit + preserve fields):
export class DatabaseError extends DatabaseException {
  public readonly originalError: unknown
  public readonly query?: string
  public readonly bindings?: unknown[]

  constructor(message: string, originalError?: unknown, query?: string, bindings?: unknown[]) {
    super(503, DatabaseErrorCodes.QUERY_FAILED, {
      message,
      cause: originalError,
      retryable: false,
    })
    this.name = 'DatabaseError'
    this.originalError = originalError
    this.query = query
    this.bindings = bindings
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
```

### Pattern 2: New Intermediate Exception Classes in core

**What:** `DatabaseException` and `CacheException` do not exist yet in `packages/core/src/exceptions/`. They must be created before any per-package work starts.

```typescript
// packages/core/src/exceptions/DatabaseException.ts (NEW — to be created)
import { InfrastructureException, type InfrastructureExceptionOptions } from './InfrastructureException'

export abstract class DatabaseException extends InfrastructureException {
  constructor(status: number, code: string, options: InfrastructureExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'DatabaseException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// packages/core/src/exceptions/CacheException.ts (NEW — to be created)
export abstract class CacheException extends InfrastructureException {
  constructor(status: number, code: string, options: InfrastructureExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'CacheException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
```

Both must be added to `packages/core/src/exceptions/index.ts` and committed before any per-package work.

### Pattern 3: withResilience Wiring (Connection-Level Only)

**What:** Wrap connection-acquire / connection-level operations in `withResilience`, never transaction-level operations.

```typescript
// Source: packages/resilience/src/resilience/withResilience.ts (verified)
// Atlas example — connection-level only:
import { withResilience } from '@gravito/resilience'

const dbPolicy = {
  retry: { idempotent: true as const, maxAttempts: 3, baseDelayMs: 200 },
  circuitBreaker: { name: 'atlas-db', failureThreshold: 5, resetTimeout: 30_000 },
  timeout: 5000,
}

async function acquireConnection() {
  return withResilience(() => pool.acquire(), dbPolicy)
}

// NEVER do this (D-06):
// await withResilience(() => db.transactionWithRetry(...), dbPolicy)
```

### Pattern 4: Plasma — CB Only (No Retry)

```typescript
// D-04: plasma gets CB only, no retry
const redisPolicy: ResiliencePolicy = {
  circuitBreaker: { name: 'plasma-redis', failureThreshold: 3, resetTimeout: 15_000 },
  timeout: 2000,
  // NO retry field — plasma uses fast-fail
}
```

### Pattern 5: Photon CB Middleware — Internal Swap

**What:** Public API of `circuitBreaker()` middleware factory stays identical. Only the internal `CircuitBreaker` class reference changes from the local photon implementation to `@gravito/resilience` `CircuitBreaker`.

```typescript
// packages/photon/src/middleware/circuit-breaker.ts (after migration)
import { CircuitBreaker, type CircuitBreakerOptions } from '@gravito/resilience'
// Remove: local class CircuitBreaker { ... }
// Keep: export function circuitBreaker(config: CircuitBreakerConfig): GravitoMiddleware { ... }
// Keep: export const circuitBreakerPresets = { ... }
```

Important: the photon `CircuitBreakerConfig` uses `failureThreshold`/`resetTimeoutMs` (different naming from resilience `CircuitBreakerOptions` which uses `failureThreshold`/`resetTimeout`). The middleware adapter must translate between these.

### Pattern 6: Deadline-Enforced Shutdown Handler

**What:** All 4 packages register `core:shutdown` with `Promise.race` for deadline enforcement.

```typescript
// Template (from OrbitPlasma existing pattern — verified):
core.hooks.doAction('core:shutdown', async () => {
  const deadline = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error('[OrbitX] Shutdown deadline exceeded')), DEADLINE_MS)
  )
  try {
    await Promise.race([this.doShutdown(), deadline])
  } catch (err) {
    core.logger.warn('[OrbitX] Forced shutdown after deadline:', err)
  }
})
```

Shutdown deadlines per D-09:
- photon: 2000ms
- signal: 5000ms
- plasma: 3000ms (enhance existing hook — D-11)
- atlas: 5000ms

### Pattern 7: Contract Test Structure (follow Phase 16 scaffolding)

```typescript
// packages/atlas/tests/contract/atlas-errors.contract.test.ts (new)
import { assertGravitoException } from '../../../core/tests/contract/helpers'
// OR copy assertGravitoException locally if cross-package import is undesirable

describe('atlas error contract', () => {
  it('DatabaseError satisfies GravitoException contract', () => {
    const err = new DatabaseError('connection refused', new Error('ECONNREFUSED'))
    assertGravitoException(err, {
      expectedCode: 'db.query_failed',  // or the specific code
      expectedStatus: 503,
      expectedInstanceOf: [InfrastructureException, DatabaseException],
      expectRetryable: false,
    })
  })
  it('ConnectionError has retryable:true', () => {
    const err = new ConnectionError('host unreachable')
    expect((err as InfrastructureException).retryable).toBe(true)
  })
})
```

### Recommended File Structure

```
packages/core/src/exceptions/
├── DatabaseException.ts   # NEW — abstract, extends InfrastructureException
├── CacheException.ts      # NEW — abstract, extends InfrastructureException
└── index.ts               # Updated: export both new classes

packages/atlas/src/errors/
├── index.ts               # DatabaseError, ConstraintViolationError etc. → extend DatabaseException
└── codes.ts               # DatabaseErrorCodes already exists ✓ (no changes needed)

packages/atlas/src/orm/model/
└── errors.ts              # ColumnNotFoundError, TypeMismatchError, etc. → extend appropriate hierarchy

packages/plasma/src/
└── errors.ts              # RedisError → extends CacheException

packages/signal/src/
└── errors.ts              # MailTransportError → extends InfrastructureException (no CacheException needed)

packages/photon/src/middleware/
└── circuit-breaker.ts     # Internal CircuitBreaker class removed; @gravito/resilience CircuitBreaker used
```

### Anti-Patterns to Avoid

- **Double retry on transactions:** Never wrap `atlas.transactionWithRetry()` with `withRetry` or `withResilience{retry:...}` — deadlock retry already happens internally (D-06 / STATE.md key decision).
- **Exposing cockatiel types:** `BrokenCircuitError`, `IsolatedCircuitError`, `ExponentialBackoff` must not appear in any migrated package's public types (CONTEXT.md specifics).
- **Dual retry paths:** Do not leave `BunRedisClient.retryWithBackoff()` alongside the new resilience wiring — remove it completely (D-05).
- **Skipping Object.setPrototypeOf:** Every migrated error constructor must call `Object.setPrototypeOf(this, new.target.prototype)` — the atlas errors currently lack this, causing ESM/CJS instanceof failures.
- **Wrapping connect() redundantly:** `BunRedisClient.connect()` currently calls `retryWithBackoff()` — when replacing with `withResilience`, do not also leave `maxRetries: 1` in `buildClientOptions()` active (would create a second retry path).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retry with exponential backoff | Custom loop (like current `BunRedisClient.retryWithBackoff`) | `withResilience` from `@gravito/resilience` | Already handles jitter, maxDelay, idempotency guard |
| Circuit breaker state machine | Custom CB class (like current photon `CircuitBreaker`) | `CircuitBreaker` from `@gravito/resilience` | Sliding window, metrics hooks, named registry built in |
| Deadline enforcement | `setTimeout` + unhandled rejection | `Promise.race([op, timeoutPromise])` | Simple, clear; no AbortController needed for shutdown |
| instanceof guards across ESM/CJS | Manual duck-typing | `Object.setPrototypeOf` in constructors | Already established pattern from Phase 16 |

**Key insight:** The entire Phase 17 output exists specifically so Phase 18 does NOT hand-roll resilience. The only permitted custom code is the thin translation layer in photon's middleware (mapping `CircuitBreakerConfig` field names to `CircuitBreakerOptions`).

---

## Common Pitfalls

### Pitfall 1: photon CircuitBreakerConfig Field Name Mismatch

**What goes wrong:** photon's existing `CircuitBreakerConfig` uses `resetTimeoutMs` (milliseconds in name), but `@gravito/resilience` `CircuitBreakerOptions` uses `resetTimeout`. A direct type substitution will fail TypeScript.
**Why it happens:** The two implementations evolved independently with different naming conventions.
**How to avoid:** Keep photon's `CircuitBreakerConfig` interface unchanged (it is public API per D-07). Inside the `circuitBreaker()` factory, map `config.resetTimeoutMs` → `resetTimeout` when constructing the resilience `CircuitBreaker`.
**Warning signs:** `TS2345: Argument of type 'CircuitBreakerConfig' is not assignable to parameter of type 'CircuitBreakerOptions'`

### Pitfall 2: atlas ORM Model Errors Live in a Separate File

**What goes wrong:** `packages/atlas/src/orm/model/errors.ts` contains a second set of errors (`ColumnNotFoundError`, `TypeMismatchError`, `NullableConstraintError`, `ModelNotFoundError`, `StaleModelError`) not visible in `packages/atlas/src/errors/index.ts`. A planner who only checks `errors/index.ts` will miss these.
**Why it happens:** ORM model errors are domain-specific and were placed close to the model code.
**How to avoid:** Both error files must be migrated. `ModelNotFoundError` in ORM errors is distinct from `ModelNotFoundException` in core — do not confuse them.

### Pitfall 3: plasma retryWithBackoff Removal Creates Connect Regression

**What goes wrong:** `BunRedisClient.connect()` currently calls `this.retryWithBackoff(async () => { await this.client.connect() })`. If `retryWithBackoff` is deleted without replacement, connection failures are no longer retried — but per D-04, plasma gets CB only (no retry). This means connection-level failures will CB-open after 3 failures, which is the intended behavior. Confirm this is acceptable before removing.
**Why it happens:** The original code assumed retry was needed; the new design says CB-only fast-fail is sufficient for Redis.
**How to avoid:** In `connect()`, wrap the inner `this.client.connect()` with `withResilience(fn, redisPolicy)` (CB + timeout only, no retry) instead of `retryWithBackoff`. Also remove `maxRetries: 1` from `buildClientOptions()` to avoid leaving a secondary retry path inside Bun's Redis client.

### Pitfall 4: DatabaseException / CacheException Must Be Created Before Package Work

**What goes wrong:** If `DatabaseError extends DatabaseException` is written before `DatabaseException` exists in `@gravito/core`, typecheck fails with "Module '@gravito/core' has no exported member 'DatabaseException'". This blocks all subsequent migration steps.
**Why it happens:** These classes were referenced in CONTEXT.md as targets but do not yet exist in core (verified: no files found in packages/core/src/exceptions/).
**How to avoid:** Wave 0 of the plan MUST create `DatabaseException.ts`, `CacheException.ts`, export them from `core/src/exceptions/index.ts`, and run `bun run typecheck` before any other wave starts.

### Pitfall 5: signal MailTransportError Has Error.captureStackTrace

**What goes wrong:** `MailTransportError` currently calls `Error.captureStackTrace(this, MailTransportError)`. When re-inheriting, if `Error.captureStackTrace` is called BEFORE `super()` or after `Object.setPrototypeOf`, the stack frame may be captured with the wrong reference.
**Why it happens:** V8-specific API interaction with prototype chain manipulation.
**How to avoid:** Place `Object.setPrototypeOf(this, new.target.prototype)` immediately after `super()`. Then call `Error.captureStackTrace` after the prototype is fixed.

### Pitfall 6: OrbitAtlas Currently Has No Shutdown Hook

**What goes wrong:** `OrbitAtlas.install()` currently only calls `DB.configure(config)` and logs — there is no shutdown hook. Adding one requires understanding how `DB` manages connection pools (via `ConnectionManager`).
**Why it happens:** The current `OrbitAtlas` is minimal (23 lines). The connection pool tear-down logic must be added.
**How to avoid:** Check `DB.ts` / `ConnectionManager` for an existing `disconnect()` or `closeAll()` method before writing the shutdown handler. If it doesn't exist, add it as part of the atlas migration.

---

## Code Examples

Verified from actual codebase files:

### Existing OrbitPlasma Shutdown Pattern (Template for All)
```typescript
// Source: packages/plasma/src/OrbitPlasma.ts line 159 (verified)
// Current (no deadline):
core.hooks.doAction('core:shutdown', async () => {
  await this.disconnect()
})

// After enhancement (with deadline per D-11):
core.hooks.doAction('core:shutdown', async () => {
  const DEADLINE_MS = 3000
  const deadline = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error('[OrbitPlasma] Shutdown deadline exceeded (3s)')), DEADLINE_MS)
  )
  try {
    await Promise.race([this.disconnect(), deadline])
  } catch (err) {
    core.logger.warn('[OrbitPlasma] Forced shutdown:', err)
  }
})
```

### withResilience ResiliencePolicy Shape (Verified API)
```typescript
// Source: packages/resilience/src/resilience/ResiliencePolicy.ts (verified)
export interface ResiliencePolicy {
  retry?: RetryOptions          // requires idempotent: true
  circuitBreaker?: string | InlineCBOptions  // string = named CB from registry
  timeout?: number              // ms, outermost wrapper
}

// atlas policy (D-04):
const atlasPolicy: ResiliencePolicy = {
  retry: { idempotent: true, maxAttempts: 3, baseDelayMs: 200 },
  circuitBreaker: { name: 'atlas-db', failureThreshold: 5, resetTimeout: 30_000 },
  timeout: 5000,
}

// plasma policy (D-04):
const plasmaPolicy: ResiliencePolicy = {
  circuitBreaker: { name: 'plasma-redis', failureThreshold: 3, resetTimeout: 15_000 },
  timeout: 2000,
  // no retry: fast-fail only
}
```

### assertGravitoException Helper (Available for Reuse)
```typescript
// Source: packages/core/tests/contract/helpers.ts (verified)
// Import or copy this helper into each package's contract test:
import { assertGravitoException } from '../../../core/tests/contract/helpers'
// Used as:
assertGravitoException(err, {
  expectedCode: 'db.connection_failed',
  expectedStatus: 503,
  expectedInstanceOf: [InfrastructureException, DatabaseException],
  expectRetryable: true,
  expectCause: true,
})
```

### DatabaseErrorCodes (Already Exists — No Changes)
```typescript
// Source: packages/atlas/src/errors/codes.ts (verified — already correct namespace)
export const DatabaseErrorCodes = {
  CONNECTION_FAILED: 'db.connection_failed',
  CONNECTION_TIMEOUT: 'db.connection_timeout',
  POOL_EXHAUSTED: 'db.pool_exhausted',
  QUERY_FAILED: 'db.query_failed',
  TABLE_NOT_FOUND: 'db.table_not_found',
  UNIQUE_CONSTRAINT: 'db.unique_constraint',
  FOREIGN_KEY_CONSTRAINT: 'db.foreign_key_constraint',
  NOT_NULL_CONSTRAINT: 'db.not_null_constraint',
  TRANSACTION_FAILED: 'db.transaction_failed',
  DEADLOCK: 'db.deadlock',
} as const
```

### ConnectionError Should Be retryable:true
```typescript
// Current: extends DatabaseError (no retryable field)
// After migration: connection errors are retryable (transient network issues)
export class ConnectionError extends DatabaseError {
  constructor(message: string, originalError?: unknown) {
    super(message, originalError)
    this.name = 'ConnectionError'
    // DatabaseError's super call will pass retryable — but ConnectionError
    // needs retryable:true explicitly via its own super() to DatabaseException:
    // Actually: ConnectionError → DatabaseError → DatabaseException
    // So ConnectionError.constructor must call DatabaseException with retryable:true
  }
}
// Simpler: ConnectionError directly extends DatabaseException with retryable:true
```

---

## Open Questions

1. **Does `DB` / `ConnectionManager` have a `disconnect()` / `closeAll()` method?**
   - What we know: `OrbitAtlas.install()` calls `DB.configure(config)` only; no shutdown hook exists
   - What's unclear: Whether `DB` or `ConnectionManager` exposes a public teardown API
   - Recommendation: Planner must check `packages/atlas/src/connection/ConnectionManager.ts` before writing the shutdown task; if no teardown method exists, add one in the same wave

2. **Should `MailTransportError` ORM code use `mail.transport.*` or `mail.*` namespace?**
   - What we know: Phase 16 established dot-separated namespaces; CONTEXT.md says `mail.*` convention
   - What's unclear: Whether sub-namespace granularity (e.g., `mail.smtp.*`, `mail.ses.*`) is needed
   - Recommendation: Use flat `mail.*` for this phase per CONTEXT.md discretion; sub-namespaces are Phase 19 work

3. **How does photon's ErrorHandler middleware currently handle exceptions?**
   - What we know: `CircuitOpenException` from resilience has `status: 503`; photon `ErrorHandler` must detect it
   - What's unclear: Whether there is already an `ErrorHandler` middleware or whether one must be created
   - Recommendation: Planner must check `packages/photon/src/middleware/` for existing error handler; if none, add it in photon wave

4. **atlas `PoolHealthChecker` — is CB wiring there or at `ConnectionManager.acquire()`?**
   - What we know: STATE.md marks this as an open question for Phase 18 planning
   - What's unclear: Which atlas layer is the correct interception point for CB
   - Recommendation: Wrap `ConnectionManager.acquire()` (or equivalent `getConnection()`) — this is the boundary between application code and the raw connection, above the pool internals

---

## Environment Availability

Step 2.6: SKIPPED — Phase 18 is code/config changes only; no new external dependencies beyond workspace packages that are already installed and verified.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bun:test (built into Bun) |
| Config file | none — uses bun test runner natively |
| Quick run command | `cd packages/PACKAGE && bun test` |
| Full suite command | `bun run test` (from monorepo root, runs all packages) |
| Typecheck command | `bun run typecheck` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTG-01 | `DatabaseError` is `instanceof DatabaseException` and `GravitoException`; `.code` is `db.*`; `.status` present | Contract/unit | `cd packages/atlas && bun test tests/contract/atlas-errors.contract.test.ts` | ❌ Wave 0 |
| INTG-01 | `ConnectionError` has `retryable:true` | Contract/unit | same file | ❌ Wave 0 |
| INTG-01 | atlas CB opens after 5 failures and stops hitting DB | Integration | `cd packages/atlas && bun test tests/contract/atlas-resilience.contract.test.ts` | ❌ Wave 0 |
| INTG-02 | `RedisError` is `instanceof CacheException`; `.code` is `redis.*` | Contract/unit | `cd packages/plasma && bun test tests/contract/plasma-errors.contract.test.ts` | ❌ Wave 0 |
| INTG-02 | plasma CB opens after 3 failures and stops Redis calls | Unit (mock) | same file | ❌ Wave 0 |
| INTG-03 | plasma shutdown completes within 3s deadline | Unit | `cd packages/plasma && bun test tests/contract/plasma-shutdown.contract.test.ts` | ❌ Wave 0 |
| INTG-03 | atlas shutdown completes within 5s deadline | Unit | `cd packages/atlas && bun test tests/contract/atlas-shutdown.contract.test.ts` | ❌ Wave 0 |
| INTG-03 | signal shutdown completes within 5s deadline | Unit | `cd packages/signal && bun test tests/contract/signal-shutdown.contract.test.ts` | ❌ Wave 0 |
| INTG-03 | photon shutdown completes within 2s deadline | Unit | `cd packages/photon && bun test tests/contract/photon-shutdown.contract.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per package migration commit:** `cd packages/PACKAGE && bun test && bun run typecheck` (specific package only)
- **Per wave completion:** `bun run typecheck` (monorepo root — catches cross-package regressions)
- **Phase gate:** `bun run test && bun run typecheck` full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/core/src/exceptions/DatabaseException.ts` — new file, prereq for all other waves
- [ ] `packages/core/src/exceptions/CacheException.ts` — new file, prereq for plasma migration
- [ ] `packages/core/src/exceptions/index.ts` — updated to export both new exception classes
- [ ] `packages/atlas/tests/contract/atlas-errors.contract.test.ts` — covers INTG-01 error contract
- [ ] `packages/atlas/tests/contract/atlas-resilience.contract.test.ts` — covers INTG-01 CB behavior
- [ ] `packages/atlas/tests/contract/atlas-shutdown.contract.test.ts` — covers INTG-03 atlas
- [ ] `packages/plasma/tests/contract/plasma-errors.contract.test.ts` — covers INTG-02 error contract
- [ ] `packages/plasma/tests/contract/plasma-shutdown.contract.test.ts` — covers INTG-03 plasma
- [ ] `packages/signal/tests/contract/signal-errors.contract.test.ts` — signal error contract
- [ ] `packages/signal/tests/contract/signal-shutdown.contract.test.ts` — covers INTG-03 signal
- [ ] `packages/photon/tests/contract/photon-cb.contract.test.ts` — CB middleware still returns 503
- [ ] `packages/photon/tests/contract/photon-shutdown.contract.test.ts` — covers INTG-03 photon
- [ ] Shared `assertGravitoException` helper — already exists at `packages/core/tests/contract/helpers.ts`; import or copy as needed

---

## Project Constraints (from CLAUDE.md)

| Constraint | Impact on Phase 18 |
|------------|-------------------|
| TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`) | All migrated error constructors must use every parameter; no unused imports |
| `@ts-ignore` forbidden without comment | Do not use during migration |
| Satellite isolation: no direct imports between Satellites | Not relevant — this phase touches Orbits only |
| Circular dependency check (pre-push hook) | Verify `@gravito/resilience` dep on `@gravito/core` doesn't create a cycle (it already imports `InfrastructureException` from core — established pattern) |
| Code style: 100 char, 2-space, single quotes, no semicolons, ES5 trailing commas | Apply to all new/modified files |
| Commit message: English (`feat: [atlas] migrate error hierarchy to DatabaseException`) | Use this format for all phase commits |
| Test coverage target: 75%+ per package | Contract tests count; existing tests must not regress |

---

## Sources

### Primary (HIGH confidence)

- `packages/core/src/exceptions/GravitoException.ts` — verified base class API
- `packages/core/src/exceptions/InfrastructureException.ts` — verified intermediate class with `retryable`
- `packages/resilience/src/resilience/withResilience.ts` — verified composition API and cockatiel mapping
- `packages/resilience/src/resilience/ResiliencePolicy.ts` — verified `ResiliencePolicy` interface
- `packages/resilience/src/circuit-breaker/CircuitBreaker.ts` — verified resilience CB options (`resetTimeout` not `resetTimeoutMs`)
- `packages/atlas/src/errors/index.ts` — verified current error hierarchy (extends bare `Error`)
- `packages/atlas/src/errors/codes.ts` — verified `DatabaseErrorCodes` already uses `db.*` namespace
- `packages/atlas/src/orm/model/errors.ts` — verified second set of model-specific errors
- `packages/plasma/src/errors.ts` — verified `RedisError extends Error` (single class)
- `packages/plasma/src/OrbitPlasma.ts` — verified existing shutdown hook pattern (no deadline)
- `packages/plasma/src/clients/BunRedisClient.ts` — verified `retryWithBackoff()` location
- `packages/signal/src/errors.ts` — verified `MailTransportError` with `Error.captureStackTrace`
- `packages/signal/src/transports/BaseTransport.ts` — verified existing retry loop to replace
- `packages/photon/src/middleware/circuit-breaker.ts` — verified local `CircuitBreaker` class; confirmed `resetTimeoutMs` naming difference
- `packages/core/tests/contract/helpers.ts` — verified `assertGravitoException` helper exists and is reusable
- Glob search — confirmed `DatabaseException.ts` and `CacheException.ts` do NOT exist in core yet

### Secondary (MEDIUM confidence)

- `packages/resilience/src/exceptions/CircuitOpenException.ts` — `status: 503` confirmed; photon ErrorHandler should match
- `.planning/STATE.md` key decisions — `transactionWithRetry` never-wrap decision is architectural record

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages and APIs verified by direct file reads
- Architecture patterns: HIGH — based on actual existing code, not training assumptions
- Pitfalls: HIGH — each pitfall identified from concrete code evidence (naming mismatch in photon CB, missing ORM error file, missing intermediate classes)
- Open questions: MEDIUM — ConnectionManager teardown API not read in full; photon ErrorHandler existence not confirmed

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable architecture; 30-day window)
