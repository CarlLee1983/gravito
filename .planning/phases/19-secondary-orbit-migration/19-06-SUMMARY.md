---
phase: 19-secondary-orbit-migration
plan: "06"
subsystem: infra
tags: [error-handling, exceptions, GravitoException, InfrastructureException, SystemException, echo, flare, radiance, quark, graphql, impulse, impulse-bridge, monolith]

requires:
  - phase: 19-01
    provides: "Core error hierarchy (GravitoException, InfrastructureException, SystemException)"
  - phase: 19-02
    provides: "Batch 1 migration pattern established (atlas, signal, photon, stream)"
  - phase: 19-04
    provides: "Batch 2 migration pattern (fortify, nebula, plasma, stasis)"
provides:
  - "8 communication packages migrated to GravitoException hierarchy"
  - "echo: EchoError extends InfrastructureException, 7 bare throws replaced"
  - "flare: FlareError extends InfrastructureException, 21 bare throws replaced"
  - "radiance: RadianceError extends InfrastructureException, 4 bare throws replaced"
  - "quark: QuarkError extends InfrastructureException, 6 bare throws replaced"
  - "graphql: GraphqlError extends SystemException, 15 bare throws replaced"
  - "impulse: ImpulseError extends InfrastructureException, 4 bare throws replaced"
  - "impulse-bridge: ImpulseBridgeErrorCodes only (0 throws)"
  - "monolith: MonolithError extends InfrastructureException, 5 bare throws replaced"
affects: ["19-07", "19-08", "19-09"]

tech-stack:
  added: []
  patterns:
    - "Error class extends InfrastructureException for I/O packages (echo, flare, radiance, quark, impulse, monolith)"
    - "Error class extends SystemException for framework-level packages (graphql)"
    - "Packages with 0 throws get ErrorCodes-only file for documentation consistency"
    - "All error classes export from package index.ts"
    - "Contract tests verify instanceof hierarchy and namespace conventions"

key-files:
  created:
    - packages/echo/src/errors/EchoError.ts
    - packages/echo/src/errors/codes.ts
    - packages/echo/tests/contract/echo-errors.contract.test.ts
    - packages/flare/src/errors/FlareError.ts
    - packages/flare/src/errors/codes.ts
    - packages/flare/tests/contract/flare-errors.contract.test.ts
    - packages/radiance/src/errors/RadianceError.ts
    - packages/radiance/src/errors/codes.ts
    - packages/quark/src/errors/QuarkError.ts
    - packages/quark/src/errors/codes.ts
    - packages/graphql/src/errors/GraphqlError.ts
    - packages/graphql/src/errors/codes.ts
    - packages/graphql/tests/contract/graphql-errors.contract.test.ts
    - packages/impulse/src/errors/ImpulseError.ts
    - packages/impulse/src/errors/codes.ts
    - packages/impulse-bridge/src/errors/codes.ts
    - packages/monolith/src/errors/MonolithError.ts
    - packages/monolith/src/errors/codes.ts
  modified:
    - packages/echo/src/OrbitEcho.ts
    - packages/echo/src/index.ts
    - packages/echo/src/receive/WebhookReceiver.ts
    - packages/echo/src/rotation/KeyRotationManager.ts
    - packages/echo/src/send/WebhookDispatcher.ts
    - packages/flare/src/OrbitFlare.ts
    - packages/flare/src/index.ts
    - packages/flare/src/channels/BroadcastChannel.ts
    - packages/flare/src/channels/DatabaseChannel.ts
    - packages/flare/src/channels/MailChannel.ts
    - packages/flare/src/channels/SlackChannel.ts
    - packages/flare/src/channels/SmsChannel.ts
    - packages/flare/src/middleware/RateLimitMiddleware.ts
    - packages/flare/src/templates/NotificationTemplate.ts
    - packages/flare/src/utils/serializationGuard.ts
    - packages/radiance/src/OrbitRadiance.ts
    - packages/radiance/src/drivers/AblyDriver.ts
    - packages/radiance/src/drivers/PusherDriver.ts
    - packages/radiance/src/drivers/RedisDriver.ts
    - packages/radiance/src/index.ts
    - packages/quark/src/TcpConnection.ts
    - packages/quark/src/TcpServer.ts
    - packages/quark/src/index.ts
    - packages/quark/src/protocols/FrameProtocol.ts
    - packages/graphql/src/index.ts
    - packages/graphql/src/filters/relation-filters.ts
    - packages/graphql/src/mutations/atlas-mutations.ts
    - packages/graphql/src/pagination/cursor.ts
    - packages/graphql/src/scalars/email.ts
    - packages/graphql/src/scalars/json.ts
    - packages/graphql/src/scalars/url.ts
    - packages/graphql/src/scalars/uuid.ts
    - packages/impulse/src/index.ts
    - packages/impulse/src/core/SchemaCache.ts
    - packages/impulse/src/core/SchemaCompilationCache.ts
    - packages/impulse/src/validation/ZodValidator.ts
    - packages/impulse/src/validation/ValibotValidator.ts
    - packages/impulse-bridge/src/index.ts
    - packages/monolith/src/index.ts
    - packages/monolith/src/Controller.ts
    - packages/monolith/src/ContentManager.ts
    - packages/monolith/src/driver/GitHubDriver.ts

key-decisions:
  - "graphql uses SystemException (not InfrastructureException) because GraphQL errors are system/framework-level, not I/O"
  - "impulse-bridge gets codes-only file since it has 0 bare throws, per D-07 decision"
  - "flare JSDoc comment examples contain throw new Error() but are not actual throws — left as-is"

requirements-completed: [MIGR-01, MIGR-02]

duration: 45min
completed: 2026-03-28
---

# Phase 19 Plan 06: Communication Domain Migration Summary

**8 communication packages (echo, flare, radiance, quark, graphql, impulse, impulse-bridge, monolith) migrated — 62 bare throws replaced with namespaced GravitoException subclasses**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-03-28T16:15:00Z
- **Completed:** 2026-03-28T17:01:54Z
- **Tasks:** 2
- **Files modified:** 42 (18 created, 24 modified)

## Accomplishments

- Migrated all 8 Batch 3 communication packages to GravitoException hierarchy
- Replaced 62 bare `throw new Error()` calls with typed, namespaced error classes
- Created contract tests for echo, flare, and graphql (highest throw counts)
- All packages export error classes and codes from their index.ts
- All existing tests continue to pass (856 tests across 8 packages)

## Task Commits

1. **Task 1: Migrate echo, flare, radiance, quark** - `96309da7` (feat)
2. **Task 2: Migrate graphql, impulse, impulse-bridge, monolith** - `fbc78c43` (feat)

## Files Created/Modified

**Error classes created (per package):**
- `packages/echo/src/errors/EchoError.ts` + `codes.ts` — extends InfrastructureException
- `packages/flare/src/errors/FlareError.ts` + `codes.ts` — extends InfrastructureException
- `packages/radiance/src/errors/RadianceError.ts` + `codes.ts` — extends InfrastructureException
- `packages/quark/src/errors/QuarkError.ts` + `codes.ts` — extends InfrastructureException
- `packages/graphql/src/errors/GraphqlError.ts` + `codes.ts` — extends SystemException
- `packages/impulse/src/errors/ImpulseError.ts` + `codes.ts` — extends InfrastructureException
- `packages/impulse-bridge/src/errors/codes.ts` — codes only (0 throws)
- `packages/monolith/src/errors/MonolithError.ts` + `codes.ts` — extends InfrastructureException

**Contract tests created:**
- `packages/echo/tests/contract/echo-errors.contract.test.ts`
- `packages/flare/tests/contract/flare-errors.contract.test.ts`
- `packages/graphql/tests/contract/graphql-errors.contract.test.ts`

## Decisions Made

- graphql uses `SystemException` instead of `InfrastructureException` because GraphQL validation/parsing errors are framework-level rather than network I/O failures
- impulse-bridge received codes-only file (no error class) since it has 0 bare throws, consistent with D-07 decision
- Two JSDoc comment examples in flare (`types/middleware.ts` and `utils/LazyNotification.ts`) contain `throw new Error()` in example code blocks — these are documentation examples, not actual throws, and were left as-is

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None.

## Next Phase Readiness

- Batch 3 complete — all communication packages have typed error hierarchy
- Ready for Batch 4 (wave 3 continues with remaining packages)
- Contract tests verify instanceof chain and namespace conventions

---
*Phase: 19-secondary-orbit-migration*
*Completed: 2026-03-28*
