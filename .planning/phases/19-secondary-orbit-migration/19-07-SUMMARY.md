---
phase: 19-secondary-orbit-migration
plan: "07"
subsystem: devops
tags: [exceptions, typescript, error-handling, SystemException, InfrastructureException, devops]

# Dependency graph
requires:
  - phase: 19-01
    provides: "SystemException and InfrastructureException abstract classes in @gravito/core"
provides:
  - "HorizonError extends SystemException in @gravito/horizon"
  - "MonitorError extends SystemException in @gravito/monitor"
  - "ZenithError extends SystemException in @gravito/zenith"
  - "LaunchpadError extends SystemException in @gravito/launchpad"
  - "CliError extends SystemException in @gravito/cli"
  - "LuminosityError extends InfrastructureException with dual ErrorCode groups (storage.* + config.*)"
  - "PrismError extends SystemException in @gravito/prism"
  - "89 total bare throw new Error() replaced across all 7 packages"
affects:
  - "Phase 19 batch completion: 7 DevOps packages fully migrated"
  - "19-08 and 19-09 can proceed with remaining packages"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MEDIUM D-06 error migration pattern: XxxError extends SystemException"
    - "Dual ErrorCode namespace for luminosity: storage.* (retryable) vs config.* (not retryable)"
    - "zenith/package.json: added @gravito/core as direct dependency for ZenithError"

key-files:
  created:
    - packages/horizon/src/errors/HorizonError.ts
    - packages/horizon/src/errors/codes.ts
    - packages/horizon/tests/contract/horizon-errors.contract.test.ts
    - packages/monitor/src/errors/MonitorError.ts
    - packages/monitor/src/errors/codes.ts
    - packages/zenith/src/errors/ZenithError.ts
    - packages/zenith/src/errors/codes.ts
    - packages/launchpad/src/errors/LaunchpadError.ts
    - packages/launchpad/src/errors/codes.ts
    - packages/launchpad/tests/contract/launchpad-errors.contract.test.ts
    - packages/cli/src/errors/CliError.ts
    - packages/cli/src/errors/codes.ts
    - packages/cli/tests/contract/cli-errors.contract.test.ts
    - packages/luminosity/src/errors/LuminosityError.ts
    - packages/luminosity/src/errors/codes.ts
    - packages/luminosity/tests/contract/luminosity-errors.contract.test.ts
    - packages/prism/src/errors/PrismError.ts
    - packages/prism/src/errors/codes.ts
    - packages/prism/tests/contract/prism-errors.contract.test.ts
  modified:
    - packages/horizon/src/CronParser.ts
    - packages/horizon/src/SchedulerManager.ts
    - packages/horizon/src/SimpleCronParser.ts
    - packages/horizon/src/TaskSchedule.ts
    - packages/horizon/src/locks/LockManager.ts
    - packages/horizon/src/utils/validation.ts
    - packages/monitor/src/adapters/ObservabilityAdapter.ts
    - packages/zenith/package.json
    - packages/zenith/src/client/contexts/AuthContext.tsx
    - packages/zenith/src/client/contexts/NotificationContext.tsx
    - packages/zenith/src/server/services/AlertService.ts
    - packages/zenith/src/server/services/QueueMetricsCollector.ts
    - packages/launchpad/src/Application/DeploymentArchiver.ts
    - packages/launchpad/src/Application/PayloadInjector.ts
    - packages/launchpad/src/Domain/Rocket.ts
    - packages/launchpad/src/Infrastructure/Docker/DockerAdapter.ts
    - packages/launchpad/src/Infrastructure/Git/ShellGitAdapter.ts
    - packages/cli/src/commands/MakeCommand.ts
    - packages/cli/src/commands/add.ts
    - packages/cli/src/commands/database.ts
    - packages/cli/src/commands/doctor.ts
    - packages/cli/src/commands/routeCache.ts
    - packages/cli/src/commands/routeList.ts
    - packages/cli/src/utils/VersionChecker.ts
    - packages/cli/src/utils/VersionRegistry.ts
    - packages/cli/src/index.ts
    - packages/luminosity/src/submit/RateLimiter.ts
    - packages/luminosity/src/submit/GoogleSubmitter.ts
    - packages/luminosity/src/config/ConfigLoader.ts
    - packages/luminosity/src/meta/Inspector.ts
    - packages/luminosity/src/storage/S3Adapter.ts
    - packages/luminosity/src/storage/LogRotator.ts
    - packages/luminosity/src/storage/FileSystemAdapter.ts
    - packages/luminosity/src/engine/strategies/IncrementalStrategy.ts
    - packages/luminosity/src/engine/SeoEngine.ts
    - packages/prism/src/core/TemplateCompiler.ts
    - packages/prism/src/image/ImageService.ts
    - packages/prism/src/ssg/DynamicRouteResolver.ts
    - packages/prism/src/engine/TemplateEngine.ts
    - packages/prism/src/helpers/image.ts
    - packages/prism/src/helpers/sanitize.ts
    - packages/prism/src/helpers/markdown.ts

key-decisions:
  - "luminosity uses InfrastructureException (not SystemException) — S3/network paths dominate, retryable flag needed"
  - "luminosity has dual ErrorCode groups per Research open question 3: storage.* (retryable) and config.*/seo.* (not retryable)"
  - "zenith package.json: added @gravito/core as direct dependency to enable ZenithError imports"
  - "React context throw guards (useAuth, useNotifications) use ZenithError.CONTEXT_MISSING — 500 status, not retryable"
  - "Pre-existing typecheck failures in horizon/launchpad/cli/zenith from missing @gravito/resilience in transitive deps — not caused by our changes"

requirements-completed: [MIGR-01, MIGR-02]

# Metrics
duration: 25min
completed: 2026-03-28
---

# Phase 19 Plan 07: DevOps Batch 4 Migration Summary

**7 DevOps packages migrated to GravitoException hierarchy: 89 total bare throws replaced, luminosity has dual ErrorCode groups (storage vs config), contract tests added for all 5 high-throw packages**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-28T16:39:00Z
- **Completed:** 2026-03-28T17:04:00Z
- **Tasks:** 2
- **Files modified:** 61 (19 created, 42 modified)

## Accomplishments

### Task 1: horizon, monitor, zenith, launchpad (38 throws)
- Created `HorizonError extends SystemException` with 13 error codes (scheduling, validation, lock)
- Created `MonitorError extends SystemException` with 2 error codes (SDK init, health check)
- Created `ZenithError extends SystemException` with 4 error codes (alert, worker, context, config)
- Created `LaunchpadError extends SystemException` with 11 error codes (rocket lifecycle, docker, git)
- Added `@gravito/core` as direct dependency in `zenith/package.json`
- Replaced all 38 bare throws (17 horizon + 1 monitor + 4 zenith + 16 launchpad)
- Contract tests: horizon (4 tests) and launchpad (4 tests)
- Test results: horizon 77 pass, monitor 31 pass, zenith 9 pass, launchpad 49 pass

### Task 2: cli, luminosity, prism (51 throws)
- Created `CliError extends SystemException` with 18 error codes (command, config, entry file, database, make, http, route, install)
- Created `LuminosityError extends InfrastructureException` with 18 error codes in TWO namespaces:
  - `luminosity.storage.*` (7 codes) — retryable: true
  - `luminosity.config.*` (6 codes) — retryable: false
  - `luminosity.seo.*` (3 codes) — retryable: false
- Created `PrismError extends SystemException` with 11 error codes (template, image, route, helper)
- Replaced all 51 bare throws (19 cli + 21 luminosity + 11 prism)
- Contract tests for all 3 packages with dual-namespace validation for luminosity
- Test results: cli 74 pass, luminosity 319 pass, prism 227 pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate horizon, monitor, zenith, launchpad** - `5bcf240c` (feat)
2. **Task 2: Migrate cli, luminosity, prism** - `a69503e6` (feat)

## Throw Replacement Summary

| Package | Throws | Parent Class | Status |
|---------|--------|-------------|--------|
| horizon | 17 | SystemException | ✅ |
| monitor | 1 | SystemException | ✅ |
| zenith | 4 | SystemException | ✅ |
| launchpad | 16 | SystemException | ✅ |
| cli | 19 | SystemException | ✅ |
| luminosity | 21 | InfrastructureException | ✅ |
| prism | 11 | SystemException | ✅ |
| **Total** | **89** | | ✅ |

## Decisions Made

- **luminosity uses InfrastructureException:** Mixed I/O (S3) and utility (SEO/config) code — S3/network paths dominate throw count (12/21 are storage/network related). The `retryable` flag needed for storage failures.
- **Dual ErrorCode groups in luminosity:** Per Research open question #3 resolution. `luminosity.storage.*` codes get `retryable: true`; `luminosity.config.*` and `luminosity.seo.*` get `retryable: false`. This allows callers to inspect `.retryable` for circuit breaker decisions.
- **zenith needs @gravito/core direct dep:** zenith doesn't have `@gravito/core` in its package.json (only as transitive via atlas/photon). Added directly for clean ZenithError imports.
- **React hook guards use ZenithError:** The `useAuth()` and `useNotifications()` context guards are programming errors (missing Provider wrapper) — SystemException with 500 status is appropriate.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Dependency] Added @gravito/core to zenith/package.json**
- **Found during:** Task 1 (creating ZenithError.ts)
- **Issue:** zenith/package.json had no `@gravito/core` in its dependencies, only as transitive dep
- **Fix:** Added `"@gravito/core": "^2.0.0"` to dependencies
- **Files modified:** packages/zenith/package.json
- **Verification:** ZenithError.ts imports compile cleanly

---

**Total deviations:** 1 auto-fixed (missing dependency)
**Impact on plan:** Required for correct TypeScript compilation. No scope creep.

## Issues Encountered

- **Pre-existing typecheck failures:** horizon, launchpad, cli, zenith packages have `@gravito/resilience` not found in their transitive dependency chain (plasma, atlas). This is a pre-existing issue in the worktree unrelated to our changes. All 7 packages' tests pass.

## Known Stubs

None — all error codes are real codes with descriptive messages wired to actual throw sites.

---
*Phase: 19-secondary-orbit-migration*
*Completed: 2026-03-28*

## Self-Check: PASSED

- FOUND: packages/horizon/src/errors/HorizonError.ts
- FOUND: packages/monitor/src/errors/MonitorError.ts
- FOUND: packages/zenith/src/errors/ZenithError.ts
- FOUND: packages/launchpad/src/errors/LaunchpadError.ts
- FOUND: packages/cli/src/errors/CliError.ts
- FOUND: packages/luminosity/src/errors/LuminosityError.ts
- FOUND: packages/prism/src/errors/PrismError.ts
- FOUND: .planning/phases/19-secondary-orbit-migration/19-07-SUMMARY.md
- FOUND commit: 5bcf240c (Task 1: horizon, monitor, zenith, launchpad)
- FOUND commit: a69503e6 (Task 2: cli, luminosity, prism)
