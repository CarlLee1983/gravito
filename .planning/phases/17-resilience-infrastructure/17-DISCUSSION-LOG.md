# Phase 17: Resilience Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 17-resilience-infrastructure
**Areas discussed:** CB Consolidation, Error Classification, Composition API, cockatiel Integration
**Mode:** --auto (all decisions auto-selected)

---

## CB Consolidation Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Consolidate into @gravito/resilience | resilience CB canonical, echo deleted, core re-exports | ✓ |
| Keep separate CBs | Each package maintains its own CB | |
| Move all to core | Centralize in core package | |

**User's choice:** [auto] Consolidate into @gravito/resilience (recommended default)
**Notes:** resilience is the natural home for reliability primitives. Echo duplicate deleted, core/events CB evaluated for re-export.

---

## withRetry Error Classification

| Option | Description | Selected |
|--------|-------------|----------|
| Dual check (retryable + predicate) | InfrastructureException.retryable OR explicit retryOn predicate | ✓ |
| retryable field only | Only retry if error has retryable: true | |
| Predicate only | Caller always provides classification function | |

**User's choice:** [auto] Dual check (recommended default)
**Notes:** Structural typing via retryable field plus escape hatch for non-GravitoException errors during migration.

---

## withResilience Composition API

| Option | Description | Selected |
|--------|-------------|----------|
| Single ResiliencePolicy object | fn + policy with optional retry/CB/timeout fields | ✓ |
| Builder pattern | fluent .retry().circuitBreaker().timeout().execute() | |
| Separate wrappers | withRetry(withCircuitBreaker(withTimeout(fn))) | |

**User's choice:** [auto] Single ResiliencePolicy object (recommended default)
**Notes:** Simple API, correct ordering (retry-inside-CB) hidden from caller.

---

## cockatiel Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Internal implementation detail | Wrap behind Gravito interfaces, don't expose types | ✓ |
| Thin wrapper | Re-export cockatiel types with Gravito aliases | |
| Direct exposure | Let consumers use cockatiel directly | |

**User's choice:** [auto] Internal implementation detail (recommended default)
**Notes:** Preserves abstraction, allows future swap without breaking public API.

---

## Claude's Discretion

- Exact cockatiel policy configuration defaults
- Exception class hierarchy placement for RetryExhaustedException/CircuitOpenException
- Internal module organization
- RetryScheduler coexistence with new withRetry
- Timer/timeout implementation details

## Deferred Ideas

None — discussion stayed within phase scope.
