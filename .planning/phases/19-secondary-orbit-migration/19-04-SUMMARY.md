---
phase: 19-secondary-orbit-migration
plan: "04"
subsystem: infra
tags: [stream, error-handling, StreamException, kafka, rabbitmq, redis, shutdown]

# Dependency graph
requires:
  - phase: 19-01
    provides: "StreamException abstract class in @gravito/core; contract test helpers"
provides:
  - "StreamError concrete class extending StreamException in @gravito/stream"
  - "StreamErrorCodes const with 70+ dot-namespaced error codes for all stream drivers"
  - "isRetryableCategory() helper mapping ErrorCategorizer categories to retryable boolean"
  - "All 81 bare throw new Error() replaced with StreamError + StreamErrorCodes"
  - "OrbitStream shutdown handler with 5s deadline wired via core:shutdown hook"
  - "Contract tests for StreamError retryable/non-retryable cases"
affects:
  - "19-05 and beyond: stream package is fully migrated (Batch 1 complete)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "StreamError re-parented to StreamException following InfrastructureException retryable pattern"
    - "Dot-namespaced StreamErrorCodes (stream.kafka.*, stream.redis.*, stream.sqs.*, etc.)"
    - "isRetryableCategory() bridges ErrorCategorizer.categorize() output to StreamError.retryable"
    - "Shutdown handler pattern: Promise.race([stopWorker(), deadline]) with 5s deadline"

key-files:
  created:
    - packages/stream/src/errors.ts
    - packages/stream/tests/contract/stream-errors.contract.test.ts
  modified:
    - packages/stream/src/OrbitStream.ts
    - packages/stream/src/QueueManager.ts
    - packages/stream/src/Scheduler.ts
    - packages/stream/src/StreamEventBackend.ts
    - packages/stream/src/Worker.ts
    - packages/stream/src/consumer/ConcurrencyGate.ts
    - packages/stream/src/consumer/PollingStrategy.ts
    - packages/stream/src/consumer/ReactiveStrategy.ts
    - packages/stream/src/consumer/StreamingConsumer.ts
    - packages/stream/src/drivers/BinaryJobFrame.ts
    - packages/stream/src/drivers/BullMQDriver.ts
    - packages/stream/src/drivers/DatabaseDriver.ts
    - packages/stream/src/drivers/GrpcDriver.ts
    - packages/stream/src/drivers/KafkaDriver.ts
    - packages/stream/src/drivers/MemoryDriver.ts
    - packages/stream/src/drivers/RabbitMQDriver.ts
    - packages/stream/src/drivers/RedisDriver.ts
    - packages/stream/src/drivers/SQSDriver.ts
    - packages/stream/src/drivers/kafka/BackpressureController.ts
    - packages/stream/src/drivers/kafka/ConsumerLifecycleManager.ts
    - packages/stream/src/drivers/kafka/ErrorCategorizer.ts
    - packages/stream/src/drivers/kafka/KafkaDriver.ts
    - packages/stream/src/drivers/kafka/RingBuffer.ts
    - packages/stream/src/locks/DistributedLock.ts
    - packages/stream/src/persistence/BunBufferedPersistence.ts
    - packages/stream/src/serializers/CborNativeSerializer.ts
    - packages/stream/src/serializers/ClassNameSerializer.ts
    - packages/stream/src/serializers/JsonSerializer.ts
    - packages/stream/src/serializers/JsonlSerializer.ts
    - packages/stream/src/serializers/MessagePackSerializer.ts
    - packages/stream/src/workers/BinaryWorkerProtocol.ts
    - packages/stream/src/workers/bun-job-executor.ts
    - packages/stream/src/workers/job-executor.ts
    - packages/stream/tests/OrbitStream.test.ts

key-decisions:
  - "Option A (minimal) chosen for ErrorRecoveryManager: kept as-is, no bare throw replacements needed inside (ErrorRecoveryManager had no bare throws)"
  - "isRetryableCategory() placed in errors.ts and re-exported from ErrorCategorizer.ts to co-locate with domain logic"
  - "Shutdown handler uses this.stopWorker() (not queueManager.disconnect()) since QueueManager has no disconnect method"
  - "doAction mock added to OrbitStream.test.ts mocks (auto-fix Rule 1 — existing tests broke when shutdown handler added)"

patterns-established:
  - "Stream error status mapping: 503 for transient/retryable, 409 for conflicts, 500 for permanent failures"
  - "isRetryableCategory bridges Kafka ErrorCategorizer domain to InfrastructureException.retryable"

requirements-completed: [MIGR-01, MIGR-02, INTG-03]

# Metrics
duration: 40min
completed: 2026-03-28
---

# Phase 19 Plan 04: Stream Package Migration Summary

**StreamError extends StreamException with 81 bare throw replacements, ErrorCategorizer retryable mapping, and OrbitStream shutdown handler wired with 5s deadline**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-03-28T16:10:00Z
- **Completed:** 2026-03-28T16:35:38Z
- **Tasks:** 2
- **Files modified:** 35

## Accomplishments

- Created `StreamError` class extending `StreamException` (InfrastructureException → GravitoException) with full retryable support
- Created `StreamErrorCodes` const with 70+ dot-namespaced error codes across all stream drivers (kafka, redis, rabbitmq, sqs, memory, grpc, database, bullmq, serializers, workers, binary)
- Replaced all 81 bare `throw new Error()` across 33 files with `StreamError + StreamErrorCodes` — zero remaining bare throws in stream/src
- Added `isRetryableCategory()` helper bridging `ErrorCategorizer.categorize()` output to `StreamError.retryable` boolean
- Wired `core:shutdown` handler in `OrbitStream.install()` with 5s deadline following exact atlas pattern
- Created `stream-errors.contract.test.ts` with 4 contract tests covering retryable, non-retryable, instanceof chain, and ESM boundary safety
- All 13 OrbitStream tests pass (was 5 before shutdown handler + mock fix)
- `ErrorCategorizer.ts` and `ErrorRecoveryManager.ts` fully preserved per D-11/D-13

## Task Commits

Each task was committed atomically:

1. **Task 1: Re-parent StreamError, create ErrorCodes, replace 81 bare throws** - `25514142` (feat)
2. **Task 2: Wire OrbitStream shutdown handler + contract test** - `01bd67a0` (feat)

**Plan metadata:** (created after this summary)

## Files Created/Modified

- `packages/stream/src/errors.ts` - New: StreamError class, StreamErrorCodes const, isRetryableCategory() helper
- `packages/stream/src/OrbitStream.ts` - Added shutdown handler with 5s deadline + StreamError for throws
- `packages/stream/src/QueueManager.ts` - Replaced 9 bare throws with StreamError
- `packages/stream/src/Scheduler.ts` - Replaced 5 bare throws with StreamError
- `packages/stream/src/StreamEventBackend.ts` - Replaced 1 bare throw (circuit breaker open)
- `packages/stream/src/Worker.ts` - Replaced 2 bare throws
- `packages/stream/src/consumer/*.ts` - Replaced 4 bare throws across 4 consumer files
- `packages/stream/src/drivers/*.ts` - Replaced 19 bare throws across 9 driver files
- `packages/stream/src/drivers/kafka/*.ts` - Replaced 5 bare throws across 5 kafka-specific files
- `packages/stream/src/serializers/*.ts` - Replaced 10 bare throws across 5 serializer files
- `packages/stream/src/workers/*.ts` - Replaced 13 bare throws across 3 worker files
- `packages/stream/src/persistence/BunBufferedPersistence.ts` - Replaced 1 bare throw
- `packages/stream/src/locks/DistributedLock.ts` - Replaced 2 bare throws
- `packages/stream/tests/contract/stream-errors.contract.test.ts` - New: 4 contract tests
- `packages/stream/tests/OrbitStream.test.ts` - Added `doAction` mock to 6 mock objects

## Decisions Made

- **Shutdown uses stopWorker():** QueueManager has no `disconnect()` method. `stopWorker()` correctly stops the consumer and is safe to call even without an active consumer.
- **isRetryableCategory co-location:** Added to `errors.ts` and re-exported from `ErrorCategorizer.ts` to keep it discoverable from the categorizer context while maintaining single source of truth.
- **Merged main before executing:** Worktree was missing Phase 19-01 work (StreamException). Merged main to get the prerequisites before starting.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed OrbitStream.test.ts mock missing doAction**
- **Found during:** Task 2 (Wire shutdown handler)
- **Issue:** Adding `core.hooks.doAction(...)` to `OrbitStream.install()` broke 8 existing tests because all mock objects in `OrbitStream.test.ts` had `hooks: { setBackend: mock(() => {}) }` without `doAction`
- **Fix:** Added `doAction: mock(() => {})` to all 6 `hooks` mock objects via sed replacement
- **Files modified:** `packages/stream/tests/OrbitStream.test.ts`
- **Verification:** All 13 OrbitStream tests pass
- **Committed in:** `01bd67a0` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 bug — test mock gap)
**Impact on plan:** Essential fix. The test mock gap was directly caused by Task 2's implementation. No scope creep.

## Issues Encountered

- **Worktree missing 19-01 prerequisites:** Worktree branch `worktree-agent-a515d593` had not merged main which contained 19-01 work (StreamException, InfrastructureException). Resolved by `git merge main` before starting.
- **Pre-existing SQSDriver test failures (23):** `@aws-sdk/client-sqs` not installed in test environment, causing 23 SQSDriver tests to fail. Verified as pre-existing (same failure before our changes). Not in scope.

## Next Phase Readiness

- Stream package is fully migrated: StreamError hierarchy established, all bare throws replaced, shutdown handler wired
- Batch 1 (stream) is complete — ready for Batch 2 packages in subsequent plans
- `isRetryableCategory` bridge is available if future plans need it

## Known Stubs

None — all errors are wired to real StreamErrorCodes with appropriate retryable flags.

---
*Phase: 19-secondary-orbit-migration*
*Completed: 2026-03-28*

## Self-Check: PASSED

- FOUND: packages/stream/src/errors.ts
- FOUND: packages/stream/tests/contract/stream-errors.contract.test.ts
- FOUND commit: 25514142 (Task 1)
- FOUND commit: 01bd67a0 (Task 2)
