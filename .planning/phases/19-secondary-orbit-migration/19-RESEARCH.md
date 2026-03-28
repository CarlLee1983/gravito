# Phase 19: Secondary Orbit Migration - Research

**Researched:** 2026-03-28
**Domain:** TypeScript error hierarchy migration, health check registration, graceful shutdown wiring across ~36 Orbit packages
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Batching Strategy**
- D-01: Hybrid complexity + domain batching. 5 batches total:
  | Batch | Packages | Rationale |
  |-------|----------|-----------|
  | Batch 1 (HIGH) | fortify, astral, flux, quasar, ripple, beam, stream | Have custom error classes to re-parent; validates migration pattern |
  | Batch 2 (Storage) | constellation, nebula, nebula-s3, stasis, freeze, dark-matter, pulsar, forge | Share StorageException intermediate layer |
  | Batch 3 (Comms) | echo, flare, radiance, quark, graphql, impulse, impulse-bridge, monolith | Communication/network packages |
  | Batch 4 (DevOps) | horizon, monitor, zenith, launchpad, cli, luminosity, prism | Scheduling/monitoring/tooling |
  | Batch 5 (LOW) | chromatic, ion, enterprise, ether, spectrum, cosmos, sentinel | Minimal changes — add ErrorCodes only or trivial re-parent |
- D-02: stream is placed at end of Batch 1 (most complex, handled individually after other HIGH packages validate the pattern).
- D-03: Each package verified independently after migration (typecheck + test + contract test) — same as Phase 18 D-02.

**Error Class Design**
- D-04: New intermediate exception layers added to `@gravito/core/src/exceptions/`:
  ```
  GravitoException
  +-- InfrastructureException (exists)
  |   +-- DatabaseException (exists, atlas)
  |   +-- CacheException (exists, plasma)
  |   +-- StorageException (NEW, constellation/nebula/nebula-s3/freeze)
  |   +-- QueueException (planned in P16, quasar/flux)
  |   +-- StreamException (NEW, stream)
  |   +-- MailException (exists, signal)
  +-- DomainException (exists)
  |   +-- AuthException (planned in P16, fortify/sentinel)
  |   +-- ValidationException (exists)
  +-- SystemException (exists)
      +-- ConfigurationException (exists)
  ```
- D-05: HIGH packages (7): re-parent existing error classes to corresponding intermediate layer, preserve all factory methods and existing fields.
- D-06: MEDIUM packages (23): use nearest intermediate layer directly. Add per-package `ErrorCodes` const object. Do NOT create a dedicated exception class per package.
- D-07: LOW packages (6): use `SystemException` or `GravitoException` directly. Add `ErrorCodes` const only if the package has any `throw` statements.

**Health Check Registration (INTG-04)**
- D-08: Only I/O packages register health checks with `@gravito/monitor` HealthRegistry. Non-I/O utility packages are exempt.
- D-09: Required health checks (~15 packages):
  - Must: stream, beam, dark-matter, quasar, flux, constellation, nebula-s3, radiance, stasis, echo
  - Optional: forge, launchpad, luminosity
  - Exempt: chromatic, spectrum, enterprise, ether, ion, impulse, freeze, and other pure-utility packages
- D-10: Health check registration pattern — each Orbit registers during `onReady`:
  ```typescript
  orbit.onReady(() => {
    monitor.health.register('<orbit-name>', async () => ({
      status: this.isConnected() ? 'healthy' : 'unhealthy',
      details: { /* backend-specific info */ }
    }))
  })
  ```

**Stream Package Strategy**
- D-11: stream is migrated incrementally, NOT rebuilt. Preserve existing `ErrorCategorizer` and `ErrorRecoveryManager` domain logic.
- D-12: Migration steps for stream:
  1. `StreamError` re-parents to `StreamException extends InfrastructureException`
  2. `ErrorCategorizer` results map to `retryable: boolean` field on StreamException
  3. `ErrorRecoveryManager` internals refactored to use `@gravito/resilience` withRetry / CircuitBreaker
  4. 81 bare `throw new Error()` replaced with `StreamException` + ErrorCodes (`stream.kafka.*`, `stream.rabbitmq.*`, `stream.sqs.*`)
  5. stream + beam register `core:shutdown` handlers with deadline enforcement (INTG-03)
- D-13: stream's error classification domain knowledge (which Kafka/RabbitMQ errors are retryable vs fatal) is preserved — this is valuable domain logic that must NOT be lost during migration.

### Claude's Discretion
- Exact ErrorCodes namespace values for each package (following established `<domain>.<error>` convention)
- Internal module organization within each package's error files
- Whether to batch commits per-package or per-batch
- Order of packages within each batch
- Contract test structure per package (follow Phase 16/18 scaffolding pattern)
- How to handle packages with both I/O and utility code (e.g., luminosity has SEO + S3)
- Specific health check `details` fields per Orbit
- Whether `ErrorRecoveryManager` in stream should be fully replaced or kept as a thin wrapper

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MIGR-01 | ~50 Orbit packages fully adopt new error model (batch migration) | Confirmed: 36 packages covered in 5 batches; 372 total bare `throw new Error()` statements catalogued |
| MIGR-02 | All existing tests adapted for new error types (contract tests first) | Confirmed: assertGravitoException helper exists in `packages/core/tests/contract/helpers.ts`; plasma/atlas/signal contract tests are templates |
| INTG-04 | All Orbit packages register health checks with `@gravito/monitor` | Confirmed: `HealthRegistry.register(name, fn)` API verified; container key `'health'` maps to HealthRegistry instance |
| INTG-03 | stream and beam register `core:shutdown` handlers with deadline enforcement | Confirmed: atlas pattern (`Promise.race` + 5s deadline) is the template; beam and stream are the two remaining packages |
</phase_requirements>

---

## Summary

Phase 19 migrates approximately 36 remaining Orbit packages to the GravitoException hierarchy established in Phase 16, registers health checks for I/O packages with `@gravito/monitor`, and completes the `core:shutdown` handler wiring for stream and beam. The ground work is fully complete: GravitoException hierarchy exists, CacheException/DatabaseException/MailException are proven templates, the `assertGravitoException` contract test helper is reusable, and Phase 18's plasma/atlas/signal migrations demonstrate the exact pattern.

The scale is the primary challenge: 372 total bare `throw new Error()` statements across 36 packages (vs. ~90 in Phase 18). The 5-batch strategy contains blast radius — Batch 1 validates the HIGH-complexity migration pattern (re-parenting existing custom error classes) before the remaining 28 packages proceed with the simpler MEDIUM/LOW pattern (no new error class, just ErrorCodes + nearest intermediate layer).

Three new intermediate exception classes must be created in `@gravito/core/src/exceptions/` before their respective batches begin: `AuthException` (Batch 1, for fortify/sentinel), `QueueException` (Batch 1, for quasar/flux — planned in Phase 16 but not yet created), and `StorageException` (Batch 2, for constellation/nebula/nebula-s3/freeze). `StreamException` is also needed for stream (end of Batch 1).

**Primary recommendation:** Create the 4 missing intermediate exception classes in core first (Wave 0), then execute each batch as an independent wave with per-package verification (typecheck + bun test + contract test). Do not merge a batch until all packages in it pass independently.

---

## Standard Stack

### Core (existing, no installation needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@gravito/core` | workspace | GravitoException hierarchy, intermediate layers | All error classes extend from here |
| `@gravito/monitor` | workspace | HealthRegistry for health check registration | `core.container.make('health')` returns HealthRegistry |
| `@gravito/resilience` | workspace | withRetry, CircuitBreaker for stream/ErrorRecoveryManager | Phase 17 output, already in ecosystem |
| `bun:test` | Bun built-in | Test runner for contract tests | Used across all existing contract tests |

### No new external dependencies required

All migration work uses existing in-repo infrastructure. No new npm packages needed.

---

## Architecture Patterns

### New Intermediate Exception Pattern (Wave 0 prerequisite)

Four classes need to be added to `packages/core/src/exceptions/` before any batch migration begins. Template derived from `CacheException`:

```typescript
// Source: packages/core/src/exceptions/CacheException.ts (verified template)
// Pattern for: AuthException, QueueException, StorageException, StreamException
import { InfrastructureException, type InfrastructureExceptionOptions } from './InfrastructureException'

export abstract class StorageException extends InfrastructureException {
  constructor(status: number, code: string, options: InfrastructureExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'StorageException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
```

For `AuthException`, parent is `DomainException` (not InfrastructureException):

```typescript
// Source: packages/core/src/exceptions/DomainException.ts (verified)
import { type ExceptionOptions, DomainException } from './DomainException'

export abstract class AuthException extends DomainException {
  constructor(status: number, code: string, options: ExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'AuthException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
```

Each new class must also be exported from `packages/core/src/exceptions/index.ts`.

### HIGH Package Migration Pattern (Batch 1)

For packages with existing custom error classes (FortifyError, AstralError, FluxError, QuasarError, RippleError, BeamError), re-parent to the appropriate intermediate layer while preserving factory methods and adding `Object.setPrototypeOf`:

```typescript
// Derived from plasma/src/errors.ts (verified Phase 18 reference)
// Pattern for FortifyError -> AuthException re-parent
export class FortifyError extends AuthException {
  // BREAKING: httpStatus renamed to status (AuthException inherits from GravitoException which has .status)
  // SOLUTION: keep httpStatus as a @deprecated getter that proxies .status for backward compat
  public get httpStatus(): number { return this.status }

  constructor(
    code: ErrorCode,         // already has dot-separated namespace
    httpStatus: number = 422,
    public readonly details?: unknown
  ) {
    super(httpStatus, code, {})
    this.name = 'FortifyError'
    Object.setPrototypeOf(this, new.target.prototype)
  }

  static invalidCredentials() {
    return new FortifyError(ErrorCodes.AUTH_INVALID_CREDENTIALS, 401)
  }
  // ... all 30+ factory methods preserved
}
```

**Key FortifyError-specific constraint:** FortifyError has `httpStatus` field, GravitoException has `status`. Both refer to the same concept. Keep `httpStatus` as a deprecated getter proxying `this.status` — do NOT remove it (24+ tests and BaseController.ts reference it).

### MEDIUM Package Migration Pattern (Batches 2-4)

For packages with no existing custom error class or only bare `throw new Error()`, do NOT create a new class. Add `ErrorCodes` const and throw the nearest intermediate layer directly:

```typescript
// Pattern for MEDIUM packages (Storage example)
// File: packages/constellation/src/errors/codes.ts
export const ConstellationErrorCodes = {
  CONNECTION_FAILED: 'constellation.connection_failed',
  QUERY_FAILED: 'constellation.query_failed',
  PERMISSION_DENIED: 'constellation.permission_denied',
  // ...
} as const
export type ConstellationErrorCode = typeof ConstellationErrorCodes[keyof typeof ConstellationErrorCodes]

// In source file, replace:
//   throw new Error('connection failed')
// With:
//   throw new StorageException(503, ConstellationErrorCodes.CONNECTION_FAILED, {
//     message: 'connection failed',
//     cause: originalError,
//     retryable: true,
//   })
```

Note: `StorageException` is abstract, so MEDIUM packages CANNOT instantiate it directly. They need a thin concrete class OR use `InfrastructureException` directly. **Resolution:** Create a single thin concrete `StorageError extends StorageException` in the storage package itself (similar to how plasma creates `RedisError extends CacheException`). For truly minimal packages, use `InfrastructureException` directly (it IS abstract — cannot instantiate). See pitfall section for the abstract class instantiation trap.

### Health Check Registration Pattern (INTG-04)

MonitorOrbit registers `HealthRegistry` in the container under key `'health'`. Other orbits access it after install:

```typescript
// Source: packages/monitor/src/MonitorOrbit.ts lines 93-94 (verified)
// Access pattern in Orbit.install():
async install(core: PlanetCore): Promise<void> {
  // ... orbit setup ...

  // Register health check (only if monitor orbit is installed)
  const health = core.container.make<HealthRegistry>('health')
  if (health) {
    health.register('stream', async () => ({
      status: this.queueManager.isConnected() ? 'healthy' : 'unhealthy',
      details: {
        driver: this.options.default ?? 'memory',
        queueCount: this.queueManager.getQueueCount(),
      }
    }))
  }
}
```

**Critical:** `core.container.make('health')` may return null if MonitorOrbit is not installed. Always guard with `if (health)` — do not assume monitor is present.

### Shutdown Handler Pattern (INTG-03)

Canonical implementation from Phase 18 (OrbitAtlas):

```typescript
// Source: packages/atlas/src/OrbitAtlas.ts (verified Phase 18 output)
core.hooks.doAction('core:shutdown', async () => {
  const DEADLINE_MS = 5000
  const deadline = new Promise<void>((_, reject) =>
    setTimeout(
      () => reject(new Error('[OrbitStream] Shutdown deadline exceeded (5s)')),
      DEADLINE_MS
    )
  )
  try {
    await Promise.race([this.shutdown(), deadline])
  } catch (err) {
    core.logger.warn('[OrbitStream] Forced shutdown:', err)
  }
})
```

Apply this pattern to `OrbitStream.install()` and `OrbitBeam.install()` (beam does not appear to have an Orbit class yet — the install location needs investigation; stream's OrbitStream.ts is the target).

### Contract Test Pattern

```typescript
// Source: packages/plasma/tests/contract/plasma-errors.contract.test.ts (verified)
import { assertGravitoException } from '../../../core/tests/contract/helpers'
import { StorageException, InfrastructureException } from '@gravito/core'

describe('ConstellationError contract', () => {
  it('satisfies GravitoException contract', () => {
    const cause = new Error('original')
    const err = new ConstellationError(
      'query failed',
      ConstellationErrorCodes.QUERY_FAILED,
      cause
    )
    assertGravitoException(err, {
      expectedCode: 'constellation.query_failed',
      expectedStatus: 503,
      expectedInstanceOf: [StorageException, InfrastructureException],
      expectRetryable: false,
      expectCause: true,
    })
  })
})
```

### Anti-Patterns to Avoid

- **Instantiating abstract classes directly:** `InfrastructureException`, `StorageException`, `StreamException`, `DatabaseException`, `CacheException` are all `abstract`. MEDIUM packages must either create a thin concrete class (preferred) or use `GravitoException` with a direct subclass. Never do `new StorageException(...)`.
- **Removing httpStatus from FortifyError:** 24 test assertions and BaseController.ts reference `.httpStatus`. Keep as deprecated getter proxying `.status`.
- **Rebuilding ErrorRecoveryManager from scratch:** The stream package's ErrorCategorizer and ErrorRecoveryManager contain battle-tested Kafka/RabbitMQ error classification domain logic. Preserve it — only wire the retryable mapping to `StreamException.retryable`.
- **Not guarding health registration:** Not all deployments use MonitorOrbit. Guard `core.container.make('health')` results.
- **Double-wrapping atlas.transactionWithRetry:** Stream drivers must NOT wrap atlas transaction methods with withRetry — atlas already handles deadlock retry internally.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Contract assertions | Custom per-package expect() chains | `assertGravitoException()` from `packages/core/tests/contract/helpers` | Single source of truth for all 7 assertion fields; already used by plasma/atlas/signal |
| Kafka/RabbitMQ error classification | New classification logic | Preserve `ErrorCategorizer.categorize()` in stream, map to `retryable: boolean` | Domain knowledge about ECONNREFUSED vs SyntaxError vs business_logic is correct and tested |
| Circuit breaker for stream | Custom OPEN/HALF_OPEN/CLOSED state machine | Keep `ErrorRecoveryManager` as thin wrapper OR migrate internals to `@gravito/resilience CircuitBreaker` | Both are acceptable per D-13 — ErrorRecoveryManager already has correct semantics |
| Health check timeout | Custom Promise.race in health fn | Let HealthRegistry handle timeouts | HealthRegistry.executeCheck() already races each check against `this.timeout` (default 5000ms) |
| Shutdown deadline | Custom setTimeout logic | Copy the atlas `Promise.race([operation, deadline])` pattern verbatim | Phase 18 contract tests verify this pattern works; don't reinvent |

**Key insight:** This phase is purely mechanical wiring at scale. Every pattern needed already exists and is tested. The risk is diverging from proven patterns across 36 packages — not missing novel solutions.

---

## Bare Throw Inventory (Phase 19 Scope)

Total: **372 bare `throw new Error()` statements** across 36 packages.

| Batch | Package | Bare Throws | Test Files | Migration Type |
|-------|---------|-------------|------------|----------------|
| 1 | fortify | 7 | 24 | HIGH — re-parent FortifyError → AuthException |
| 1 | astral | 1 | 10 | HIGH — re-parent AstralError hierarchy → SystemException |
| 1 | flux | 6 | 34 | HIGH — re-parent FluxError + FluxErrorCode enum → QueueException |
| 1 | quasar | 8 | 0 | HIGH — re-parent QuasarError → QueueException |
| 1 | ripple | 16 | 25 | HIGH — re-parent RippleError + RippleDriverError → InfrastructureException |
| 1 | beam | 3 | 12 | HIGH — re-parent BeamError hierarchy → InfrastructureException; add shutdown |
| 1 | stream | 81 | 76 | HIGH — re-parent StreamError → StreamException; preserve ErrorCategorizer; add shutdown |
| 2 | constellation | 18 | 9 | MEDIUM — StorageException + codes |
| 2 | nebula | 19 | 11 | MEDIUM — StorageException + codes |
| 2 | nebula-s3 | 5 | 2 | MEDIUM — StorageException + codes |
| 2 | stasis | 9 | 18 | MEDIUM — StorageException + codes |
| 2 | freeze | 1 | 1 | MEDIUM — StorageException + codes |
| 2 | dark-matter | 7 | 19 | MEDIUM — InfrastructureException + codes |
| 2 | pulsar | 3 | 3 | MEDIUM — InfrastructureException + codes |
| 2 | forge | 15 | 6 | MEDIUM — InfrastructureException + codes |
| 3 | echo | 7 | 21 | MEDIUM — InfrastructureException + codes |
| 3 | flare | 21 | 25 | MEDIUM — InfrastructureException + codes |
| 3 | radiance | 4 | 4 | MEDIUM — InfrastructureException + codes |
| 3 | quark | 6 | 2 | MEDIUM — InfrastructureException + codes |
| 3 | graphql | 15 | 29 | MEDIUM — SystemException + codes |
| 3 | impulse | 8 | 5 | MEDIUM — InfrastructureException + codes |
| 3 | impulse-bridge | 0 | 1 | MEDIUM — no bare throws; add ErrorCodes only |
| 3 | monolith | 5 | 8 | MEDIUM — InfrastructureException + codes |
| 4 | horizon | 17 | 8 | MEDIUM — SystemException + codes |
| 4 | monitor | 1 | 1 | MEDIUM — SystemException + codes |
| 4 | zenith | 4 | 3 | MEDIUM — SystemException + codes |
| 4 | launchpad | 16 | 15 | MEDIUM — SystemException + codes |
| 4 | cli | 19 | 6 | MEDIUM — SystemException + codes |
| 4 | luminosity | 21 | 30 | MEDIUM — mixed I/O+utility; InfrastructureException for S3 path |
| 4 | prism | 11 | 16 | MEDIUM — SystemException + codes |
| 5 | chromatic | 0 | 8 | LOW — no bare throws; exempt (no ErrorCodes needed) |
| 5 | ion | 0 | 1 | LOW — no bare throws; exempt |
| 5 | enterprise | 0 | 3 | LOW — no bare throws; exempt |
| 5 | ether | 0 | 4 | LOW — no bare throws; exempt |
| 5 | spectrum | 0 | 5 | LOW — no bare throws; exempt |
| 5 | cosmos | 9 | 15 | LOW — GravitoException + codes |
| 5 | sentinel | 9 | 22 | LOW — AuthException + codes (auth domain) |

---

## Common Pitfalls

### Pitfall 1: Abstract Class Instantiation for MEDIUM Packages

**What goes wrong:** A MEDIUM package has bare throws like `throw new Error('connection lost')`. Developer replaces with `throw new StorageException(503, codes.CONNECTION_FAILED, {...})` — but StorageException is abstract. TypeScript error: `Cannot create an instance of an abstract class`.

**Why it happens:** All intermediate exception layers (StorageException, InfrastructureException, QueueException, StreamException, DatabaseException, CacheException) are abstract. MEDIUM packages need a concrete class.

**How to avoid:** Each MEDIUM package that directly uses a new intermediate layer creates a single thin concrete class:
```typescript
// packages/constellation/src/errors/ConstellationError.ts
export class ConstellationError extends StorageException {
  constructor(message: string, code: ConstellationErrorCode, cause?: unknown) {
    super(503, code, { message, cause })
    this.name = 'ConstellationError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
```

### Pitfall 2: FortifyError httpStatus Field Breaking Tests

**What goes wrong:** FortifyError is migrated to extend AuthException (which inherits `.status` from GravitoException). The existing `httpStatus` constructor parameter is renamed or removed. 24 tests assert `error.httpStatus` and BaseController.ts reads `fortifyError.httpStatus`.

**Why it happens:** GravitoException uses `.status`, FortifyError historically used `.httpStatus`. The parameter names differ.

**How to avoid:** Preserve backward compat by keeping `httpStatus` as a deprecated getter that proxies `.status`. The constructor still accepts `httpStatus: number` parameter but passes it to `super(httpStatus, code, ...)`.

### Pitfall 3: Monitor Not Installed — Container.make Returns Null

**What goes wrong:** An Orbit's `install()` calls `core.container.make<HealthRegistry>('health')` without null-guard. If user didn't install MonitorOrbit, the container returns null/undefined, causing a runtime null-dereference.

**Why it happens:** MonitorOrbit is optional. `container.instance('health', ...)` is only called when MonitorOrbit is installed.

**How to avoid:** Always guard:
```typescript
const health = core.container.make<HealthRegistry>('health')
health?.register('orbit-name', async () => ({ ... }))
```

### Pitfall 4: stream ErrorRecoveryManager Contains Duplicate Circuit Breaker Logic

**What goes wrong:** Migrating stream's ErrorRecoveryManager naively — replacing it wholesale with `@gravito/resilience CircuitBreaker` — discards the `ErrorCategorizer` logic that maps Kafka/RabbitMQ error codes to `transient` vs `permanent` vs `serialization` categories.

**Why it happens:** ErrorRecoveryManager IS a circuit breaker (has OPEN/HALF_OPEN/CLOSED states), and `@gravito/resilience CircuitBreaker` also exists. The temptation is to replace one with the other.

**How to avoid:** D-11 locks: migrate incrementally, not rebuild. Option A: Keep ErrorRecoveryManager as-is, add `retryable` mapping to StreamException. Option B: Keep ErrorRecoveryManager as a thin wrapper that delegates its circuit logic to `@gravito/resilience CircuitBreaker` internally. Either is acceptable. The ErrorCategorizer classification rules MUST be preserved.

**Warning signs:** Any git diff that shows deletion of ErrorCategorizer.ts or mass deletion in ErrorRecoveryManager.ts lines 30–230.

### Pitfall 5: Missing `Object.setPrototypeOf` in Migrated Error Classes

**What goes wrong:** Error class is re-parented but `Object.setPrototypeOf(this, new.target.prototype)` is not added. Works in Node.js ESM but fails instanceof checks when imported across CJS/ESM boundaries (e.g., when `@gravito/fortify` is required from a CJS consumer).

**Why it happens:** TypeScript extends of `Error` has a known prototype chain issue in transpiled code. `Object.setPrototypeOf` is the fix, established in Phase 16.

**How to avoid:** Every constructor in every migrated error class must have `Object.setPrototypeOf(this, new.target.prototype)` as the last statement. Template: `packages/plasma/src/errors.ts` (RedisError constructor).

### Pitfall 6: quasar Has 0 Test Files — Contract Tests Must Be Added

**What goes wrong:** After migrating quasar, there are no tests to run for verification. The "verify independently" discipline (D-03) cannot be satisfied.

**Why it happens:** quasar has 0 existing test files. This was not caught in planning.

**How to avoid:** Batch 1 plan for quasar must include creating the contract test alongside the migration (not as a separate wave). Contract test creation IS part of the migration task.

---

## Missing Intermediate Exception Classes (Wave 0)

The following classes do NOT yet exist in `packages/core/src/exceptions/` and must be created before their dependent batches begin:

| Class | Parent | Batch Needed By | Purpose |
|-------|--------|-----------------|---------|
| `AuthException` | `DomainException` | Batch 1 | fortify, sentinel |
| `QueueException` | `InfrastructureException` | Batch 1 | quasar, flux |
| `StreamException` | `InfrastructureException` | Batch 1 (end) | stream |
| `StorageException` | `InfrastructureException` | Batch 2 | constellation, nebula, nebula-s3, freeze, stasis |

Each must be:
1. Abstract class
2. Call `Object.setPrototypeOf(this, new.target.prototype)` in constructor
3. Exported from `packages/core/src/exceptions/index.ts`
4. Added to `packages/core/tests/contract/intermediate-exceptions.contract.test.ts`

---

## Code Examples

### assertGravitoException Helper Signature

```typescript
// Source: packages/core/tests/contract/helpers.ts (verified)
export interface ContractAssertOptions {
  expectedCode: string
  expectedStatus: number
  expectedInstanceOf?: Function[]
  expectRetryable?: boolean
  expectCause?: boolean
}

export function assertGravitoException(err: unknown, opts: ContractAssertOptions): void
```

### HealthRegistry.register() API

```typescript
// Source: packages/monitor/src/health/HealthRegistry.ts (verified)
register(name: string, check: HealthCheckFn): this

// HealthCheckFn = () => Promise<HealthCheckResult> | HealthCheckResult
// HealthCheckResult = { status: 'healthy' | 'unhealthy' | 'degraded', message?: string, latency?: number, details?: Record<string, unknown> }
```

### core:shutdown Registration

```typescript
// Source: packages/atlas/src/OrbitAtlas.ts (verified Phase 18 output)
core.hooks.doAction('core:shutdown', async () => {
  const DEADLINE_MS = 5000
  const deadline = new Promise<void>((_, reject) =>
    setTimeout(
      () => reject(new Error('[OrbitBeam] Shutdown deadline exceeded (5s)')),
      DEADLINE_MS
    )
  )
  try {
    await Promise.race([this.disconnect(), deadline])
  } catch (err) {
    core.logger.warn('[OrbitBeam] Forced shutdown:', err)
  }
})
```

### FortifyError Migration Example

```typescript
// Current (packages/fortify/src/errors/FortifyError.ts):
export class FortifyError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly httpStatus: number = 422,
    public readonly details?: unknown
  ) { ... }
}

// After migration:
export class FortifyError extends AuthException {
  /** @deprecated Use .status instead */
  public get httpStatus(): number { return this.status }
  public readonly details?: unknown

  constructor(
    code: ErrorCode,
    httpStatus: number = 422,
    details?: unknown
  ) {
    super(httpStatus, code, {})
    this.name = 'FortifyError'
    this.details = details
    Object.setPrototypeOf(this, new.target.prototype)
  }

  static invalidCredentials() { return new FortifyError(ErrorCodes.AUTH_INVALID_CREDENTIALS, 401) }
  // ... all 30+ factory methods unchanged
}
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bun test (built-in) |
| Config file | `bunfig.toml` per package (or root) |
| Quick run command | `cd packages/<name> && bun test` |
| Full suite command | `bun run test` (root, runs all packages) |
| Type check command | `bun run typecheck` (root) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| MIGR-01 | No bare `throw new Error()` in any Orbit package | Automated grep | `grep -r "throw new Error" packages/*/src/ \| wc -l` (target: 0) |
| MIGR-02 | All existing tests pass after migration | Regression | `bun run test` (root) |
| MIGR-02 | Contract: each error satisfies .code, .status, instanceof | Contract test | `cd packages/<name> && bun test --testPathPattern contract` |
| INTG-04 | Health registry returns per-Orbit status | Contract test | `cd packages/monitor && bun test` |
| INTG-03 | stream/beam shutdown completes within deadline | Contract test | `cd packages/stream && bun test --testPathPattern shutdown` |

### Sampling Rate

- **Per-package completion:** `cd packages/<name> && bun run typecheck && bun test`
- **Per-batch completion:** `bun run typecheck` (root — catches cross-package import issues)
- **Phase gate:** `bun run test && grep -r "throw new Error" packages/*/src/ | wc -l` must equal 0 before verification

### Wave 0 Gaps (must create before batch execution begins)

- [ ] `packages/core/src/exceptions/AuthException.ts` — needed by Batch 1 (fortify, sentinel)
- [ ] `packages/core/src/exceptions/QueueException.ts` — needed by Batch 1 (quasar, flux)
- [ ] `packages/core/src/exceptions/StreamException.ts` — needed by Batch 1 end (stream)
- [ ] `packages/core/src/exceptions/StorageException.ts` — needed by Batch 2
- [ ] Update `packages/core/src/exceptions/index.ts` — export all 4 new classes
- [ ] Update `packages/core/tests/contract/intermediate-exceptions.contract.test.ts` — add 4 new class contract tests
- [ ] `packages/quasar/tests/` — quasar has 0 test files; contract test must be created with migration

---

## Environment Availability

Step 2.6: SKIPPED for external tool audit — this phase is purely code/type changes within the monorepo. All dependencies (bun, TypeScript) are already confirmed operational (Phase 18 passed).

---

## Open Questions

1. **Does beam have an Orbit class for shutdown wiring?**
   - What we know: `packages/beam/src/` contains `errors.ts`, `helpers.ts`, `index.ts`, `pool/`, `types.ts`, `utils.ts` — no `OrbitBeam.ts` visible
   - What's unclear: Is beam a standalone utility (no Orbit class) or does its pool need shutdown wiring at a different integration point?
   - Recommendation: During Batch 1 plan, inspect `packages/beam/src/index.ts` to determine if beam exports a GravitoOrbit implementation. If no Orbit class exists, the shutdown handler may be registered by the consumer's orbit rather than beam directly.

2. **QueueException: stream.kafka.* vs quasar.* namespace — are they both QueueException?**
   - What we know: D-04 shows `QueueException` covering quasar/flux, and `StreamException` covering stream
   - What's unclear: flux is a workflow engine (not a message queue), yet it's batched with quasar under QueueException
   - Recommendation: FluxError is workflow state machine errors (`WORKFLOW_NOT_FOUND`, `INVALID_STATE_TRANSITION`) — these are more DomainException than InfrastructureException. The planner should revisit whether flux should use DomainException directly rather than QueueException.

3. **luminosity has both SEO utilities and S3/storage operations — which intermediate layer?**
   - What we know: luminosity has 21 bare throws across mixed domains; CONTEXT.md marks it as "optional" health check
   - What's unclear: Some luminosity throws are network/S3 errors (InfrastructureException), others are config/validation (SystemException)
   - Recommendation: Use InfrastructureException for S3/network paths, SystemException for config/validation paths. Create two ErrorCodes groups: `luminosity.storage.*` and `luminosity.config.*`.

---

## Sources

### Primary (HIGH confidence — verified by direct code reading)

- `packages/core/src/exceptions/` — Full exception hierarchy; confirmed existing classes (CacheException, DatabaseException, InfrastructureException, DomainException, SystemException, GravitoException); confirmed missing classes (AuthException, QueueException, StorageException, StreamException)
- `packages/core/tests/contract/helpers.ts` — `assertGravitoException` helper; full signature verified
- `packages/plasma/src/errors.ts` — Phase 18 reference migration (RedisError → CacheException); verified backward compat pattern with factory methods
- `packages/signal/src/errors.ts` — Phase 18 reference migration (MailTransportError → InfrastructureException); verified legacyCode backward compat pattern
- `packages/atlas/src/OrbitAtlas.ts` — Phase 18 shutdown deadline pattern (Promise.race + 5s)
- `packages/monitor/src/MonitorOrbit.ts` — `core.container.instance('health', this.healthRegistry)` at lines 93-94; confirmed container key `'health'`
- `packages/monitor/src/health/HealthRegistry.ts` — `register(name, fn): this` API; HealthCheckResult type
- `packages/monitor/src/config.ts` — HealthCheckFn, HealthCheckResult types
- `packages/stream/src/drivers/kafka/ErrorCategorizer.ts` — transient/serialization/business_logic/permanent classification logic; MUST be preserved
- `packages/stream/src/drivers/kafka/ErrorRecoveryManager.ts` — full OPEN/HALF_OPEN/CLOSED state machine; DO NOT DELETE
- `packages/fortify/src/errors/FortifyError.ts` — 30+ factory methods; httpStatus field used in BaseController.ts (line 78) and 24 tests
- `packages/fortify/src/errors/codes.ts` — dot-separated ErrorCodes const pattern (canonical template for all packages)

### Secondary (MEDIUM confidence — grep-verified counts)

- Bare throw counts per package (verified by `grep -r "throw new Error" packages/*/src/`): total 372 across 36 packages
- Test file counts per package (verified by `find packages/*/tests -name "*.test.ts" | wc -l`)
- quasar has 0 test files (verified by find command returning 0)

---

## Metadata

**Confidence breakdown:**
- Missing intermediate classes (AuthException, QueueException, StreamException, StorageException): HIGH — confirmed by `ls packages/core/src/exceptions/`
- FortifyError httpStatus backward compat requirement: HIGH — verified in source + test assertions
- Health check container key `'health'`: HIGH — verified in MonitorOrbit.ts line 93
- Bare throw counts: HIGH — verified by grep
- stream ErrorCategorizer/ErrorRecoveryManager preservation: HIGH — D-11/D-13 locked + code verified
- flux classification (QueueException vs DomainException): MEDIUM — open question #2

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable codebase — no external library churn)
