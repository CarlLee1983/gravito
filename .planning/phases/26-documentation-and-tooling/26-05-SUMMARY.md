---
phase: 26-documentation-and-tooling
plan: 05
subsystem: testing
tags: [biome, typescript, noExplicitAny, type-safety, events, observability]

# Dependency graph
requires:
  - phase: 26-documentation-and-tooling
    provides: biome.json noExplicitAny override for packages/core/src/**
provides:
  - Zero noExplicitAny violations in packages/core/src/events/ (8 files, 37 violations fixed)
  - Type-safe event queue infrastructure with proper unknown/structural typing
  - OTelEventMetrics uses direct meter.createCounter() calls (no defensive casts)
affects:
  - 26-06 (next plan in phase 26)
  - packages/core (core package quality)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use ReturnType<typeof setInterval> for timer types instead of any"
    - "Use structural inline interfaces for dynamic/optional deps (bullmq Queue, metrics registry)"
    - "Cast through unknown instead of any: obj as unknown as InterfaceType"
    - "Call OTel Meter methods directly — Meter type guarantees method existence"

key-files:
  created: []
  modified:
    - packages/core/src/events/MessageQueueBridge.ts
    - packages/core/src/events/PriorityEscalationManager.ts
    - packages/core/src/events/RetryScheduler.ts
    - packages/core/src/events/WorkerPool.ts
    - packages/core/src/events/queue-core.ts
    - packages/core/src/events/observability/OTelEventMetrics.ts
    - packages/core/src/events/observability/ObservableHookManager.ts
    - packages/core/src/events/observability/EventMetrics.ts

key-decisions:
  - "Priority cast uses union type 'critical'|'high'|'normal'|'low' not string — preserves type safety"
  - "OTelEventMetrics removes defensive (meter as any).createCounter check — Meter type already guarantees this"
  - "EventMetrics registry typed as unknown with structural cast to named local variable (reg)"
  - "ObservableHookManager span typed as Span|undefined from @opentelemetry/api"
  - "MessageQueueBridge options param typed as EventOptions (not Record<string,unknown>)"

patterns-established:
  - "Pattern: cast unknown peer-dep objects via structural interface (RetryScheduler queue pattern)"
  - "Pattern: import Span from @opentelemetry/api for local span variables"

requirements-completed: [DOC-01]

# Metrics
duration: 18min
completed: 2026-03-30
---

# Phase 26 Plan 05: noExplicitAny Gap Closure — events/ Directory Summary

**Eliminated all 37 noExplicitAny violations across 8 files in packages/core/src/events/ using unknown + structural casts, fixing priority union types, timer ReturnType patterns, and OTel Meter direct calls**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-30T08:46:08Z
- **Completed:** 2026-03-30T08:04:00Z
- **Tasks:** 2 completed
- **Files modified:** 8

## Accomplishments

- Eliminated all 37 noExplicitAny violations in packages/core/src/events/ (8 files)
- Task 1 (5 core event files, 13 violations): typed priority as union, queue objects via structural interfaces, timers as ReturnType<typeof setInterval>
- Task 2 (3 observability files, 24 violations): OTelEventMetrics now calls meter.createCounter() directly, ObservableHookManager span typed as Span|undefined, EventMetrics registry typed as unknown with structural cast

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix noExplicitAny in events/ core files (5 files, 13 violations)** - `6ddb4fa7` (feat)
2. **Task 2: Fix noExplicitAny in events/observability/ files (3 files, 24 violations)** - `1ebc5a4e` (feat)

## Files Created/Modified

- `packages/core/src/events/MessageQueueBridge.ts` - options param typed as EventOptions; circuit breaker cast via unknown intermediate
- `packages/core/src/events/PriorityEscalationManager.ts` - priority casts use union type instead of any
- `packages/core/src/events/RetryScheduler.ts` - bullmq queue typed as structural interface; count property fully typed
- `packages/core/src/events/WorkerPool.ts` - timer types as ReturnType<typeof setInterval>; process.browser via unknown
- `packages/core/src/events/queue-core.ts` - recordEvent call uses union type cast
- `packages/core/src/events/observability/OTelEventMetrics.ts` - removed all defensive (meter as any) patterns; direct meter.createCounter() calls
- `packages/core/src/events/observability/ObservableHookManager.ts` - metrics? typed as unknown; span typed as Span|undefined with import from @opentelemetry/api
- `packages/core/src/events/observability/EventMetrics.ts` - registry typed as unknown; structural cast to MetricsRegistryLike interface

## Decisions Made

- Priority values cast as `'critical' | 'high' | 'normal' | 'low'` union (not `string`) to preserve downstream type safety
- OTelEventMetrics: removed all 10 defensive `(meter as any).createCounter` guards — `Meter` from `@opentelemetry/api` already types these methods, guards were unnecessary
- EventMetrics: structural cast approach (`reg = registry as { histogram, gauge, counter }`) instead of any — keeps runtime flexibility for @gravito/monitor injection
- MessageQueueBridge: options typed as EventOptions (not Record<string,unknown>) since it maps directly to EventTask.options

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Initial PriorityEscalationManager fix used `as string` instead of union type**
- **Found during:** Task 1 (type verification step)
- **Issue:** `as string` caused downstream TS2322 errors — return type is `'critical'|'high'|'normal'|'low'`
- **Fix:** Changed all priority casts to explicit union type
- **Files modified:** packages/core/src/events/PriorityEscalationManager.ts
- **Verification:** bun run typecheck exits 0 (excluding pre-existing nebula-s3 failure)
- **Committed in:** 6ddb4fa7

**2. [Rule 1 - Bug] RetryScheduler bracket notation triggered useLiteralKeys biome rule**
- **Found during:** Task 1 biome lint verification
- **Issue:** `queueObj.count?.['waiting']` triggered lint/complexity/useLiteralKeys
- **Fix:** Used structural interface with named properties instead of Record<string, number>
- **Files modified:** packages/core/src/events/RetryScheduler.ts
- **Verification:** biome lint passes with no errors
- **Committed in:** 6ddb4fa7

---

**Total deviations:** 2 auto-fixed (both Rule 1 - bug)
**Impact on plan:** Both auto-fixes were discovered during verification steps. No scope creep.

## Issues Encountered

- Pre-existing @gravito/nebula-s3 typecheck failure (missing StorageException/InfrastructureExceptionOptions exports from @gravito/core) — unrelated to this plan, pre-existing issue documented in deferred-items
- Core package tests have 7 pre-existing failures (intentional error-throwing test scenarios) — not caused by this plan's changes

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 37 noExplicitAny violations in packages/core/src/events/ eliminated
- biome lint packages/core/src/events/ --diagnostic-level=error reports 0 violations
- bun run typecheck passes with zero new errors introduced by this plan
- Ready for Plan 06 (next in phase 26)

---
*Phase: 26-documentation-and-tooling*
*Completed: 2026-03-30*
