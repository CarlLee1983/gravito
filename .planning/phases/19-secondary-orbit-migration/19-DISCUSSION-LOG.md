# Phase 19: Secondary Orbit Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 19-secondary-orbit-migration
**Areas discussed:** Batching strategy, Error class design, Health check scope, Stream package strategy

---

## Batching Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| By complexity tier (A) | HIGH -> MEDIUM -> LOW, simple ordering | |
| By domain cluster (B) | Group by domain (storage, comms, auth, infra, devtools) | |
| By dependency order (C) | Start with upstream packages that others depend on | |
| Hybrid A+B (recommended) | Complexity tiers with domain sub-grouping within MEDIUM | :white_check_mark: |

**User's choice:** Hybrid A+B (accepted recommendation)
**Notes:** 5 batches: Batch 1 (7 HIGH), Batch 2 (8 Storage), Batch 3 (8 Comms), Batch 4 (7 DevOps), Batch 5 (7 LOW). stream at end of Batch 1.

---

## Error Class Design

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated XxxException per package | Every package gets its own exception class | |
| Shared intermediate layers (recommended) | New StorageException, QueueException, StreamException, AuthException; MEDIUM packages use nearest intermediate | :white_check_mark: |
| All use InfrastructureException directly | No new intermediate layers, just ErrorCodes differentiation | |

**User's choice:** Shared intermediate layers (accepted recommendation)
**Notes:** HIGH packages re-parent existing classes. MEDIUM packages use nearest intermediate + ErrorCodes. LOW packages use SystemException/GravitoException + ErrorCodes only.

---

## Health Check Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All Orbit packages | Every package registers a health check | |
| I/O packages only (recommended) | ~15 packages with external connections register; utility packages exempt | :white_check_mark: |
| Critical packages only | Only stream, beam, dark-matter, quasar, flux | |

**User's choice:** I/O packages only (accepted recommendation)
**Notes:** Must: 10 packages. Optional: 3. Exempt: all pure utility. Registration via orbit.onReady() lifecycle.

---

## Stream Package Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Rebuild from scratch | Discard ErrorCategorizer/ErrorRecoveryManager, build new | |
| Incremental migration (recommended) | Preserve domain logic, re-parent errors, refactor internals to use @gravito/resilience | :white_check_mark: |

**User's choice:** Incremental migration (accepted recommendation)
**Notes:** Preserve ErrorCategorizer domain knowledge (Kafka/RabbitMQ retryable vs fatal classification). Refactor ErrorRecoveryManager to use withRetry/CB internally. 81 bare throws -> StreamException + ErrorCodes.

---

## Claude's Discretion

- Exact ErrorCodes namespace values per package
- Internal module organization within each package
- Commit granularity (per-package vs per-batch)
- Contract test structure per package
- Specific health check details fields per Orbit

## Deferred Ideas

None -- discussion stayed within phase scope.
