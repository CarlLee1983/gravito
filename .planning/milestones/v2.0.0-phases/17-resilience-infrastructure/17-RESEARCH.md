# Phase 17: Resilience Infrastructure - Research

**Researched:** 2026-03-28
**Domain:** TypeScript resilience primitives — retry, circuit breaker consolidation, composition API
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**CB Consolidation Strategy**
- D-01: `@gravito/resilience` CircuitBreaker is the canonical implementation. Echo's duplicate (`echo/src/resilience/CircuitBreaker.ts`) is deleted; echo re-exports from `@gravito/resilience` if needed for backward compat.
- D-02: `core/events/CircuitBreaker.ts` is the event-system-specific CB. It stays in core but should delegate to or re-export `@gravito/resilience` CB to avoid divergence. If the APIs are identical, replace with a re-export.

**withRetry Error Classification**
- D-03: `withRetry` classifies errors via dual check: (1) `error instanceof InfrastructureException && error.retryable === true`, OR (2) explicit `retryOn: (error) => boolean` predicate in options.
- D-04: `withRetry` requires explicit `idempotent: true` in options. Calls without it are rejected at runtime to prevent accidental retry of non-idempotent operations.
- D-05: `withRetry` throws `RetryExhaustedException` (a `GravitoException` subclass extending `InfrastructureException`) after all attempts fail. The original last error is preserved as `.cause`.

**withResilience Composition API**
- D-06: `withResilience<T>(fn: () => Promise<T>, policy: ResiliencePolicy): Promise<T>` — single function with a policy object.
- D-07: `ResiliencePolicy` shape:
  ```typescript
  interface ResiliencePolicy {
    retry?: RetryOptions
    circuitBreaker?: string | CircuitBreakerOptions
    timeout?: number
  }
  ```
- D-08: Execution order is retry-inside-circuit-breaker: CB wraps the retry loop. If CB is open, `CircuitOpenException` thrown immediately (no retries attempted).

**cockatiel Integration**
- D-09: cockatiel is an internal implementation detail. Gravito wraps cockatiel behind its own interfaces. cockatiel types are NOT part of the public API.
- D-10: cockatiel's `Policy.handleAll()` and `Policy.wrap()` used internally for composition. Gravito's `withResilience` delegates to cockatiel's policy wrapping.

**Test Environment Behavior**
- D-11: In `NODE_ENV=test`, `withResilience` throws on circuit-open rather than returning fallback values.

### Claude's Discretion
- Exact cockatiel policy configuration defaults (backoff base, jitter strategy)
- Whether `RetryExhaustedException` and `CircuitOpenException` extend InfrastructureException or SystemException
- Internal module organization within `packages/resilience/src/`
- Whether to keep the existing `RetryScheduler` (Bull Queue-based async retry) alongside the new synchronous `withRetry`
- Timer/timeout implementation details

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RESL-01 | Universal `withRetry<T>()` utility supporting exponential backoff, jitter, Retryable/Terminal classification | cockatiel `retry(handleAll/handleWhen, { maxAttempts, backoff: ExponentialBackoff })` wraps this. Error classification via InfrastructureException.retryable + retryOn predicate. RetryExhaustedException extends InfrastructureException. |
| RESL-02 | Consolidate 3 duplicate CircuitBreaker implementations into single `@gravito/resilience` CB | All three CBs (resilience, echo, core/events) share identical state machine logic. `core/events/CircuitBreaker.ts` is a byte-for-byte copy of `resilience/src/circuit-breaker/CircuitBreaker.ts`. Echo's CB uses string-literal state type instead of enum — minor difference. Consolidation path: echo re-exports from `@gravito/resilience`; core/events replaces file with re-export. |
| RESL-03 | `withResilience()` composition API correctly applying retry-inside-circuit-breaker ordering, throwing CircuitOpenException when breaker is open | cockatiel `wrap(breakerPolicy, retryPolicy)` implements retry-inside-CB. BrokenCircuitError from cockatiel mapped to Gravito's CircuitOpenException. |
</phase_requirements>

---

## Summary

Phase 17 builds composable resilience primitives in the existing `@gravito/resilience` package. The work is primarily additive: add `withRetry` and `withResilience` functions, add new exception classes (`RetryExhaustedException`, `CircuitOpenException`), and eliminate two CB duplicates. cockatiel 3.2.1 provides the underlying policy engine but must not leak into the public API.

**CB consolidation is low-risk.** The resilience and core/events `CircuitBreaker.ts` files are near-identical — the same 464-line implementation exists in both locations. Echo's CB is simpler (225 lines, uses string-literal state instead of enum) but functionally equivalent. The core/events consumers (`HookManager`, `MessageQueueBridge`, `task-executor`) import from `./CircuitBreaker` (local), so consolidation requires only a re-export shim in that file with no consumer changes. Echo's `WebhookDispatcher` imports from `../resilience/CircuitBreaker` — that file can simply re-export from `@gravito/resilience`.

**withRetry must not wrap atlas transactionWithRetry.** That method already has internal deadlock retry logic; double-wrapping produces quadratic retries. This is a hard constraint to document in code via comments.

**Primary recommendation:** Implement in three sequential units: (1) add exception classes, (2) implement withRetry with cockatiel, (3) consolidate CB + implement withResilience. Keep `RetryScheduler` (Bull-Queue async retry) — it serves a different use case (durable retry across process restarts) from `withRetry` (synchronous in-process retry).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cockatiel | 3.2.1 | Retry, circuit breaker, timeout, wrap policies | Zero deps, ESM+CJS, MIT, Bun-compatible; pre-selected in STATE.md |
| `@gravito/core` | workspace | Exception hierarchy (GravitoException, InfrastructureException) | Already exists from Phase 16 |
| bun:test | bundled | Test framework | Monorepo standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @opentelemetry/api | ^1.9.0 | Metrics recording (optional peer dep) | Already wired into CircuitBreakerMetricsRecorder |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cockatiel | Hand-rolled retry | Don't hand-roll: jitter math, overflow safety, AbortSignal cancellation are all solved by cockatiel |
| cockatiel | p-retry | p-retry has no circuit breaker; would require two deps |

**Installation:**
```bash
bun add cockatiel
```
(Add to `packages/resilience/package.json` `dependencies`, not peerDependencies — it's an implementation detail.)

---

## Architecture Patterns

### Recommended Project Structure

```
packages/resilience/src/
├── circuit-breaker/
│   ├── CircuitBreaker.ts          # (existing — keep as canonical)
│   └── index.ts                   # (existing)
├── retry/
│   ├── RetryScheduler.ts          # (existing — keep for async/Bull use case)
│   ├── withRetry.ts               # NEW: synchronous in-process retry
│   └── RetryOptions.ts            # NEW: RetryOptions interface
├── resilience/
│   ├── withResilience.ts          # NEW: composition API
│   └── ResiliencePolicy.ts        # NEW: ResiliencePolicy interface
├── exceptions/
│   ├── RetryExhaustedException.ts # NEW
│   └── CircuitOpenException.ts    # NEW
└── index.ts                       # (updated — add new exports)

packages/core/src/events/
└── CircuitBreaker.ts              # REPLACE body with: export * from '@gravito/resilience'

packages/echo/src/resilience/
└── CircuitBreaker.ts              # REPLACE body with: export * from '@gravito/resilience'
```

### Pattern 1: withRetry Implementation

**What:** Thin Gravito wrapper around cockatiel `retry()`. Enforces `idempotent: true` guard, maps errors through dual classification, throws `RetryExhaustedException` on exhaustion.

**When to use:** Any I/O operation that may transiently fail (network calls, DB queries). NOT for `atlas.transactionWithRetry`.

```typescript
// Source: cockatiel README + Gravito conventions
import { retry, handleWhen, ExponentialBackoff } from 'cockatiel'
import { InfrastructureException } from '@gravito/core'
import { RetryExhaustedException } from '../exceptions/RetryExhaustedException'

export interface RetryOptions {
  idempotent: true           // Required — prevents accidental retry of non-idempotent ops
  maxAttempts?: number       // default: 3
  baseDelayMs?: number       // default: 200
  maxDelayMs?: number        // default: 30_000
  retryOn?: (error: unknown) => boolean  // Optional additional classifier
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  // D-04: idempotent: true is structurally required by the type
  // but we also guard at runtime for JS callers
  if (!(options as any).idempotent) {
    throw new Error('withRetry requires idempotent: true — see CONTEXT.md D-04')
  }

  const handler = handleWhen((err) => {
    if (err instanceof InfrastructureException && err.retryable) return true
    if (options.retryOn) return options.retryOn(err)
    return false
  })

  const policy = retry(handler, {
    maxAttempts: options.maxAttempts ?? 3,
    backoff: new ExponentialBackoff({
      initialDelay: options.baseDelayMs ?? 200,
      maxDelay: options.maxDelayMs ?? 30_000,
      // decorrelatedJitterGenerator is the default — best for distributed systems
    }),
  })

  let lastError: unknown
  policy.onGiveUp((reason) => { lastError = reason })

  try {
    return await policy.execute(fn)
  } catch (err) {
    throw new RetryExhaustedException({
      message: `Operation failed after ${options.maxAttempts ?? 3} attempts`,
      cause: lastError ?? err,
    })
  }
}
```

### Pattern 2: CB Consolidation — Re-Export Shim

**What:** Replace duplicate CB files with re-exports pointing to the canonical `@gravito/resilience` implementation.

**When to use:** core/events and echo re-export pattern.

```typescript
// packages/core/src/events/CircuitBreaker.ts — AFTER consolidation
// Source: D-02 (CONTEXT.md)
export {
  CircuitBreaker,
  CircuitBreakerState,
  type CircuitBreakerOptions,
  type CircuitBreakerMetrics,
  type CircuitBreakerMetricsRecorder,
} from '@gravito/resilience'
```

The echo re-export is identical in shape. The key difference: echo's CB used a string-literal union `'CLOSED' | 'OPEN' | 'HALF_OPEN'` for state instead of the resilience package's `CircuitBreakerState` enum. After consolidation, callers that did `cb.getState() === 'OPEN'` will still work because the enum values equal their string representations (`CircuitBreakerState.OPEN === 'OPEN'`). No consumer changes needed.

### Pattern 3: withResilience Composition

**What:** Combines timeout → CB → retry using cockatiel's `wrap()`. Policy order in `wrap(outermost, ..., innermost)`.

**When to use:** Any external I/O call requiring full resilience stack.

```typescript
// Source: cockatiel Policy.wrap docs
import { wrap, circuitBreaker, ConsecutiveBreaker, timeout, TimeoutStrategy } from 'cockatiel'

// Internal registry for named circuit breakers (shared across calls)
const cbRegistry = new Map<string, ReturnType<typeof circuitBreaker>>()

export async function withResilience<T>(
  fn: () => Promise<T>,
  policy: ResiliencePolicy
): Promise<T> {
  const isTest = process.env.NODE_ENV === 'test'

  // Build cockatiel policies from innermost to outermost
  const policies: any[] = []

  // 1. Timeout (outermost — cancels everything including CB check)
  if (policy.timeout) {
    policies.push(timeout(policy.timeout, TimeoutStrategy.Cooperative))
  }

  // 2. Circuit Breaker (middle — wraps retry)
  if (policy.circuitBreaker) {
    const cbOptions = typeof policy.circuitBreaker === 'string'
      ? { name: policy.circuitBreaker }
      : policy.circuitBreaker
    const cb = getOrCreateBreaker(cbOptions)
    policies.push(cb)
  }

  // 3. Retry (innermost — wraps fn directly)
  if (policy.retry) {
    policies.push(buildRetryPolicy(policy.retry))
  }

  if (policies.length === 0) {
    return fn()
  }

  const combined = policies.length === 1 ? policies[0] : wrap(...policies)

  try {
    return await combined.execute(fn)
  } catch (err) {
    // Map cockatiel BrokenCircuitError -> Gravito CircuitOpenException
    if (isBrokenCircuitError(err)) {
      throw new CircuitOpenException({ cause: err })
    }
    throw err
  }
}
```

### Pattern 4: Exception Hierarchy

```
GravitoException (abstract)
├── InfrastructureException (abstract, has retryable: boolean)  ← Phase 16
│   ├── RetryExhaustedException  ← NEW in Phase 17
│   └── CircuitOpenException     ← NEW in Phase 17
└── SystemException (abstract)
```

**Rationale for extending InfrastructureException (not SystemException):** Both exceptions represent I/O infrastructure failures — RetryExhausted means the I/O kept failing, CircuitOpen means the I/O protection triggered. SystemException is reserved for framework-internal unexpected states. InfrastructureException already carries `retryable: boolean` which is semantically correct (RetryExhausted = retryable: false; CircuitOpen = retryable: false by default).

```typescript
// packages/core/src/exceptions/... — No: these belong in @gravito/resilience
// packages/resilience/src/exceptions/RetryExhaustedException.ts
import { InfrastructureException } from '@gravito/core'

export class RetryExhaustedException extends InfrastructureException {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super(503, 'resilience.retry_exhausted', {
      message: options.message ?? 'Operation failed after all retry attempts',
      cause: options.cause,
      retryable: false,
    })
    this.name = 'RetryExhaustedException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// packages/resilience/src/exceptions/CircuitOpenException.ts
export class CircuitOpenException extends InfrastructureException {
  constructor(options: { cause?: unknown; breakerName?: string } = {}) {
    super(503, 'resilience.circuit_open', {
      message: options.breakerName
        ? `Circuit breaker is OPEN for ${options.breakerName}`
        : 'Circuit breaker is OPEN',
      cause: options.cause,
      retryable: false,
    })
    this.name = 'CircuitOpenException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
```

### Anti-Patterns to Avoid

- **Wrapping atlas.transactionWithRetry with withRetry:** atlas handles deadlock retry internally. Double-wrapping produces quadratic retries (`maxAttempts^2`). Add a code comment in `withRetry` flagging this.
- **Leaking cockatiel types into public API:** `RetryPolicy`, `CircuitBreakerPolicy`, `BrokenCircuitError`, etc. must not appear in exported types from `@gravito/resilience`. Map at the boundary.
- **Single global CircuitBreaker:** Named breakers via registry pattern. The `circuitBreaker?: string` field in `ResiliencePolicy` enables shared named breakers. One failing service should not open breakers for others.
- **Silent fallback in test environments:** `NODE_ENV=test` must throw, not return stale/fallback data. Tests that pass with degraded results give false confidence.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Exponential backoff with jitter | Custom delay calculator | cockatiel ExponentialBackoff (decorrelatedJitterGenerator) | Decorrelated jitter prevents thundering herd; overflow-safe; AbortSignal support |
| Retry policy composition | Custom loop + counter | cockatiel retry() | onGiveUp/onRetry events for observability; handles cancellation signals |
| CB state machine | Custom CLOSED/OPEN/HALF_OPEN logic | Existing `@gravito/resilience CircuitBreaker` | Already tested (CircuitBreaker.test.ts); metrics recorder wired |
| Policy wrapping order | Custom wrapper function | cockatiel wrap() | Handles context merging, signal propagation across policies |

**Key insight:** The existing `CircuitBreaker.ts` in `@gravito/resilience` is production-quality with full test coverage. The consolidation task is deletion + re-export, not rewrite.

---

## Common Pitfalls

### Pitfall 1: CircuitBreaker API Mismatch After Consolidation

**What goes wrong:** Echo's CB used `openTimeout` (field name) for the reset timeout; resilience CB uses `resetTimeout`. After consolidation, echo consumers pass `openTimeout` which silently becomes `undefined`, defaulting to 30s rather than their configured value.

**Why it happens:** The two CBs were written independently. Echo's `CircuitBreakerConfig` in `types.ts` (line 291) uses `openTimeout: number` while resilience uses `resetTimeout: number`.

**How to avoid:** Before deleting echo's CB, audit all `new CircuitBreaker(name, { openTimeout: ... })` call sites in echo. Either add an `openTimeout` alias to `CircuitBreakerOptions` or update call sites. Check: `packages/echo/src/send/WebhookDispatcher.ts`.

**Warning signs:** TypeScript `noUnusedLocals` won't catch this — it's a valid property that will just be ignored. Must grep for `openTimeout` explicitly.

### Pitfall 2: cockatiel onGiveUp Fires Before throw

**What goes wrong:** `policy.onGiveUp` fires before `policy.execute()` throws, but the captured `lastError` may be the cockatiel error event object (not the raw error). The `RetryExhaustedException.cause` ends up as an event object instead of the actual failure.

**Why it happens:** cockatiel's `onGiveUp` receives a `{ error: Error } | { value: unknown }` discriminated union, not the raw error.

**How to avoid:** In `withRetry`, use `policy.onGiveUp(({ error }) => { lastError = error })` for error events. Or track the last error independently inside the `fn` wrapper.

### Pitfall 3: core/events Circular Dependency After Re-Export

**What goes wrong:** `packages/core/src/events/CircuitBreaker.ts` re-exports from `@gravito/resilience`. But `@gravito/resilience` already has `@gravito/core` as a peerDependency. If the re-export causes `core` to import from `resilience` which imports from `core`, a circular dependency emerges.

**Why it happens:** `@gravito/resilience` already imports types from `@gravito/core` (InfrastructureException path after Phase 17 additions). If `@gravito/core` then re-exports from `@gravito/resilience`, the dependency graph inverts.

**How to avoid:** D-02 says core/events CB "should delegate to or re-export `@gravito/resilience` CB". Verify this first by checking if `@gravito/resilience` currently imports anything from `@gravito/core/events/`. Currently, resilience has `@gravito/core` as a peerDependency (not dependency) — adding `RetryExhaustedException` that extends `InfrastructureException` will require it as a dependency. Run `bun run scripts/generate-dependency-graph.ts` before finalizing.

**Alternative if circular dep is detected:** Keep `core/events/CircuitBreaker.ts` as a standalone file (it's identical to the resilience one anyway) and just stop adding new features to it. Full re-export consolidation is aspirational — mark as "optional" in the plan if the dep check fails.

### Pitfall 4: ESM Import of cockatiel in Bun

**What goes wrong:** cockatiel ships as ESM-only in v3.x. If `@gravito/resilience` build config uses `target: 'node'` instead of `target: 'bun'` for the ESM bundle, Bun-specific interop may fail at runtime.

**Why it happens:** See CLAUDE.md note on ESM/CJS target. `@gravito/resilience/build.ts` must use `target: 'bun'` (consistent with `@gravito/core` fix from 2026-03-03).

**How to avoid:** Check `packages/resilience/build.ts` target setting before adding cockatiel import. If `target: 'node'`, change to `target: 'bun'`.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### cockatiel retry with handleWhen
```typescript
// Source: cockatiel README (verified 2026-03-28)
import { retry, handleWhen, ExponentialBackoff } from 'cockatiel'

const policy = retry(
  handleWhen(err => err instanceof TransientError),
  {
    maxAttempts: 3,
    backoff: new ExponentialBackoff({ initialDelay: 200, maxDelay: 10_000 }),
  }
)

policy.onRetry(({ delay, attempt }) => {
  console.log(`Retry ${attempt} after ${delay}ms`)
})

const result = await policy.execute(() => callExternalService())
```

### cockatiel wrap (retry-inside-circuit-breaker)
```typescript
// Source: cockatiel README — wrap() applies outermost-first
// wrap(cb, retry) means: cb wraps retry wraps fn
import { wrap, circuitBreaker, ConsecutiveBreaker, retry, handleAll, ExponentialBackoff } from 'cockatiel'

const cbPolicy = circuitBreaker(handleAll, {
  halfOpenAfter: 30_000,
  breaker: new ConsecutiveBreaker(5),
})

const retryPolicy = retry(handleAll, {
  maxAttempts: 3,
  backoff: new ExponentialBackoff(),
})

// D-08: retry-inside-circuit-breaker = CB is outer, retry is inner
const combined = wrap(cbPolicy, retryPolicy)
await combined.execute(() => doWork())
```

### Object.setPrototypeOf in exception constructor
```typescript
// Source: packages/core/src/exceptions/GravitoException.ts (existing pattern)
// Required for correct instanceof across ESM/CJS boundaries
export class RetryExhaustedException extends InfrastructureException {
  constructor(options = {}) {
    super(503, 'resilience.retry_exhausted', { ...options, retryable: false })
    this.name = 'RetryExhaustedException'
    Object.setPrototypeOf(this, new.target.prototype)  // REQUIRED
  }
}
```

### Idempotent guard (runtime enforcement of D-04)
```typescript
// TypeScript type enforces this at compile time via required field:
export interface RetryOptions {
  idempotent: true   // Literal type — only `true` accepted
  maxAttempts?: number
  // ...
}

// Runtime guard catches JS callers without type checking:
if ((options as Record<string, unknown>).idempotent !== true) {
  throw new Error(
    'withRetry: options.idempotent must be true. ' +
    'Non-idempotent operations must not be retried automatically. ' +
    'See: atlas.transactionWithRetry for DB deadlock retry.'
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 3 independent CB implementations | Single canonical `@gravito/resilience` CB + re-exports | Phase 17 | Metrics, testing, and state hooks unified |
| No synchronous in-process retry utility | `withRetry` with cockatiel backoff | Phase 17 | Orbit packages can retry I/O without hand-rolling backoff |
| Manual policy composition at call site | `withResilience(fn, policy)` | Phase 17 | Single entry point enforces correct ordering (D-08) |

**Kept intact (not deprecated):**
- `RetryScheduler` (Bull Queue async retry): different concern — durable retry across process restarts. Coexists with `withRetry`.
- `CircuitBreakerStore` in stasis: persistent CB state store — independent of Phase 17.
- `resilience()` Photon middleware in `bridge/photon.ts`: will be updated in Phase 18, not Phase 17.

---

## Open Questions

1. **core/events CB re-export creates circular dependency?**
   - What we know: `@gravito/resilience` peerDeps `@gravito/core`. After Phase 17, resilience will also depend on core exceptions as a direct dep. If core then re-exports from resilience, the graph inverts.
   - What's unclear: Current dep graph for core → resilience direction not confirmed.
   - Recommendation: Run `bun run scripts/generate-dependency-graph.ts` as Wave 0 task before implementing D-02. If circular, keep `core/events/CircuitBreaker.ts` as standalone (identical copy is fine) and mark D-02 as "no-op — circular dep prevented".

2. **cockatiel `onGiveUp` event payload shape**
   - What we know: cockatiel fires `onGiveUp` when retries exhausted, but the event payload is a discriminated union `{ error: Error } | { value: unknown }`.
   - What's unclear: Whether it always fires before `execute()` throws, and exact payload type in v3.2.1.
   - Recommendation: In implementation, wrap `fn` in a try-catch to track `lastError` directly rather than relying on the event callback.

3. **RetryExhaustedException and CircuitOpenException — which package?**
   - What we know: CONTEXT.md says they're "GravitoException subclasses". GravitoException lives in `@gravito/core`. But the exceptions are specific to the resilience domain.
   - What's unclear: Should they live in `packages/core/src/exceptions/` (alongside GravitoException) or `packages/resilience/src/exceptions/` (alongside their consumers)?
   - Recommendation: Place in `packages/resilience/src/exceptions/` to avoid `@gravito/core` growing unboundedly. They import `InfrastructureException` from `@gravito/core` which is already a peerDependency of resilience.

---

## Environment Availability

Step 2.6: SKIPPED (no external runtime dependencies — cockatiel is a library install, not a service).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | none — bun resolves test files automatically |
| Quick run command | `cd packages/resilience && bun test tests/ --timeout=10000` |
| Full suite command | `bun run test` (monorepo root) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RESL-01 | `withRetry` retries up to maxAttempts with exponential backoff | unit | `cd packages/resilience && bun test tests/core-modules/withRetry.test.ts -x` | ❌ Wave 0 |
| RESL-01 | `withRetry` without `idempotent: true` throws at runtime | unit | `cd packages/resilience && bun test tests/core-modules/withRetry.test.ts -x` | ❌ Wave 0 |
| RESL-01 | `withRetry` throws `RetryExhaustedException` with `.cause` after exhaustion | unit | `cd packages/resilience && bun test tests/core-modules/withRetry.test.ts -x` | ❌ Wave 0 |
| RESL-01 | `withRetry` retries on `InfrastructureException.retryable === true` | unit | `cd packages/resilience && bun test tests/core-modules/withRetry.test.ts -x` | ❌ Wave 0 |
| RESL-01 | `withRetry` does NOT retry on `retryable === false` | unit | `cd packages/resilience && bun test tests/core-modules/withRetry.test.ts -x` | ❌ Wave 0 |
| RESL-01 | `withRetry` retries on custom `retryOn` predicate | unit | `cd packages/resilience && bun test tests/core-modules/withRetry.test.ts -x` | ❌ Wave 0 |
| RESL-02 | `echo/src/resilience/CircuitBreaker.ts` re-exports from `@gravito/resilience` | integration | `cd packages/echo && bun run typecheck` | ❌ Wave 0 (file change) |
| RESL-02 | `core/events/CircuitBreaker.ts` behaviour unchanged after re-export | unit | `cd packages/resilience && bun test tests/core-modules/CircuitBreaker.test.ts` | ✅ existing |
| RESL-02 | HookManager, MessageQueueBridge, task-executor compile after CB consolidation | integration | `cd packages/core && bun run typecheck` | ✅ existing infra |
| RESL-03 | `withResilience` with CB open throws `CircuitOpenException` immediately (no retries) | unit | `cd packages/resilience && bun test tests/core-modules/withResilience.test.ts -x` | ❌ Wave 0 |
| RESL-03 | `withResilience` with retry-inside-CB: retries happen inside the CB wrapping | unit | `cd packages/resilience && bun test tests/core-modules/withResilience.test.ts -x` | ❌ Wave 0 |
| RESL-03 | In `NODE_ENV=test`, `withResilience` throws rather than returning fallback | unit | `cd packages/resilience && bun test tests/core-modules/withResilience.test.ts -x` | ❌ Wave 0 |
| RESL-03 | `withResilience` with timeout cancels operation after ms | unit | `cd packages/resilience && bun test tests/core-modules/withResilience.test.ts -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd packages/resilience && bun test tests/ --timeout=10000`
- **Per wave merge:** `bun run typecheck && bun run test` (monorepo root)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/resilience/tests/core-modules/withRetry.test.ts` — covers RESL-01
- [ ] `packages/resilience/tests/core-modules/withResilience.test.ts` — covers RESL-03
- [ ] `packages/resilience/src/exceptions/RetryExhaustedException.ts` — required by tests
- [ ] `packages/resilience/src/exceptions/CircuitOpenException.ts` — required by tests

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 17 |
|-----------|-------------------|
| TypeScript strict mode: `noUnusedLocals` and `noUnusedParameters` | All new functions/types must be used at declaration site. Export everything from index.ts. |
| Forbidden: `@ts-ignore` without comment | Do not suppress cockatiel type errors silently |
| Satellite isolation: no direct imports between Satellites | Not applicable — resilience is an Orbit package |
| Avoid circular dependencies | Critical for core/events CB re-export (see Open Question 1) |
| Code style: 100 chars, 2-space indent, single quotes, no semicolons, ES5 trailing commas | Apply to all new files in `packages/resilience/src/` |
| Commit messages: English | `feat: [resilience] add withRetry and withResilience composition API` |
| 75%+ test coverage target | Wave 0 must create test files before implementation |
| Object.setPrototypeOf in all error constructors | Required in RetryExhaustedException and CircuitOpenException |
| ESM/CJS consistency: `buildCJSStub` extension must match `esmNaming` | Verify `packages/resilience/build.ts` before adding cockatiel |

---

## Sources

### Primary (HIGH confidence)
- Existing codebase — `packages/resilience/src/circuit-breaker/CircuitBreaker.ts` (464 lines, read directly)
- Existing codebase — `packages/core/src/events/CircuitBreaker.ts` (464 lines, identical to resilience CB)
- Existing codebase — `packages/echo/src/resilience/CircuitBreaker.ts` (255 lines, simpler variant)
- Existing codebase — `packages/core/src/exceptions/InfrastructureException.ts` (retryable field confirmed)
- Existing codebase — `packages/core/src/exceptions/GravitoException.ts` (Object.setPrototypeOf pattern)
- cockatiel README (raw.githubusercontent.com) — full API verified 2026-03-28
- `npm view cockatiel version` — confirmed 3.2.1 current

### Secondary (MEDIUM confidence)
- WebSearch (cockatiel npm/GitHub) — confirmed ESM+CJS, zero deps, MIT license, Bun compatible

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — cockatiel 3.2.1 confirmed via npm registry; existing exception hierarchy read directly from source
- Architecture: HIGH — CB implementations read directly; consolidation path verified (string literal vs enum state is the only API difference)
- Pitfalls: HIGH (Pitfall 1, 4) / MEDIUM (Pitfall 2, 3) — Pitfall 2 and 3 require confirmation during implementation

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (cockatiel API stable; internal code unlikely to change)
