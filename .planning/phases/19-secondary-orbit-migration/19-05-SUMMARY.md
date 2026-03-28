---
phase: 19-secondary-orbit-migration
plan: "05"
subsystem: infra
tags: [error-handling, GravitoException, StorageException, InfrastructureException, constellation, nebula, nebula-s3, stasis, freeze, dark-matter, pulsar, forge]

# Dependency graph
requires:
  - phase: 16-core-error-model-foundation
    provides: GravitoException hierarchy (StorageException, InfrastructureException)
  - phase: 19-secondary-orbit-migration
    provides: 19-01 through 19-04 batch 1 migration patterns
provides:
  - ConstellationError extends StorageException with ConstellationErrorCodes
  - NebulaError extends StorageException with NebulaErrorCodes
  - NebulaS3Error extends StorageException with NebulaS3ErrorCodes
  - StasisError extends StorageException with StasisErrorCodes
  - FreezeError extends StorageException with FreezeErrorCodes
  - DarkMatterError extends InfrastructureException with DarkMatterErrorCodes
  - PulsarError extends InfrastructureException with PulsarErrorCodes
  - ForgeError extends InfrastructureException with ForgeErrorCodes
  - Contract tests for constellation, nebula, nebula-s3, stasis, dark-matter, forge
affects: [19-08, 19-09, downstream consumers of storage/infra packages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - MEDIUM migration pattern (D-06): thin concrete error class + ErrorCodes const + Object.setPrototypeOf
    - StorageException subclassing for storage-domain packages (constellation, nebula, nebula-s3, stasis, freeze)
    - InfrastructureException subclassing for infrastructure packages (dark-matter, pulsar, forge)
    - Dot-separated error code namespacing (package_name.error_code)

key-files:
  created:
    - packages/constellation/src/errors/ConstellationError.ts
    - packages/constellation/src/errors/codes.ts
    - packages/constellation/tests/contract/constellation-errors.contract.test.ts
    - packages/nebula/src/errors/NebulaError.ts
    - packages/nebula/src/errors/codes.ts
    - packages/nebula/tests/contract/nebula-errors.contract.test.ts
    - packages/nebula-s3/src/errors/NebulaS3Error.ts
    - packages/nebula-s3/src/errors/codes.ts
    - packages/nebula-s3/tests/contract/nebula-s3-errors.contract.test.ts
    - packages/stasis/src/errors/StasisError.ts
    - packages/stasis/src/errors/codes.ts
    - packages/stasis/tests/contract/stasis-errors.contract.test.ts
    - packages/freeze/src/errors/FreezeError.ts
    - packages/freeze/src/errors/codes.ts
    - packages/dark-matter/src/errors/DarkMatterError.ts
    - packages/dark-matter/src/errors/codes.ts
    - packages/dark-matter/tests/contract/dark-matter-errors.contract.test.ts
    - packages/pulsar/src/errors/PulsarError.ts
    - packages/pulsar/src/errors/codes.ts
    - packages/forge/src/errors/ForgeError.ts
    - packages/forge/src/errors/codes.ts
    - packages/forge/tests/contract/forge-errors.contract.test.ts
  modified:
    - packages/constellation/src/index.ts
    - packages/nebula/src/index.ts
    - packages/nebula-s3/src/index.ts
    - packages/stasis/src/index.ts
    - packages/freeze/src/index.ts
    - packages/dark-matter/src/index.ts
    - packages/pulsar/src/index.ts
    - packages/forge/src/index.ts
    - packages/constellation/src/storage/{DiskSitemapStorage,GCPSitemapStorage,S3SitemapStorage}.ts
    - packages/constellation/src/{Compression,OrbitSitemap,redirect/RedirectDetector}.ts
    - packages/nebula/src/{StorageRepository,stores/LocalStore,stores/MemoryStore}.ts
    - packages/nebula-s3/src/S3Store.ts
    - packages/stasis/src/{types,CacheRepository,stores/RedisStore}.ts
    - packages/freeze/src/types.ts
    - packages/dark-matter/src/{MongoClient,MongoManager,MongoGridFS}.ts
    - packages/pulsar/src/stores/{FileSessionStore,SqliteSessionStore}.ts
    - packages/forge/src/{ForgeService,pipelines/BasePipeline,utils/DiskSpaceGuard,adapters/ImageMagickAdapter,adapters/FFmpegAdapter,adapters/FFmpegWasmAdapter,jobs/ProcessFileJob}.ts

key-decisions:
  - "StorageException for storage-domain packages (constellation, nebula, nebula-s3, stasis, freeze); InfrastructureException for infrastructure packages (dark-matter, pulsar, forge)"
  - "Freeze and pulsar exempt from contract tests (1 and 3 throws respectively — minimal footprint)"
  - "Core dist rebuilt before nebula-s3 contract test after StorageException export was missing from dist/index.js (built before the export was added)"
  - "Pre-existing @gravito/resilience failures in stasis (3) and forge (10) confirmed out-of-scope — same failures exist on baseline"

patterns-established:
  - "MEDIUM migration pattern: ErrorCodes const with dot-namespace + thin concrete class extends base + Object.setPrototypeOf(this, new.target.prototype) for ESM/CJS instanceof"
  - "Contract test verifies full instanceof chain: ConcreteError → StorageException → InfrastructureException → GravitoException → Error"
  - "JSDoc example throws inside /** */ blocks are NOT actual throws — skip them during migration"

requirements-completed: [MIGR-01, MIGR-02]

# Metrics
duration: 15min
completed: 2026-03-29
---

# Phase 19 Plan 05: Batch 2 Storage Domain Migration Summary

**77 bare throws replaced across 8 packages — constellation/nebula/nebula-s3/stasis/freeze use StorageException, dark-matter/pulsar/forge use InfrastructureException, with typed ErrorCodes and contract tests**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-29T00:45:00Z
- **Completed:** 2026-03-29T01:10:00Z
- **Tasks:** 2
- **Files modified:** 56 (22 created, 34 modified)

## Accomplishments

- Replaced all 77 bare `throw new Error()` calls across 8 storage/infrastructure packages with typed error classes using namespaced codes
- Created 6 contract test suites (constellation 11 tests, nebula, nebula-s3 9 tests, stasis, dark-matter 8 tests, forge 7 tests)
- Established consistent MEDIUM migration pattern used across all 8 packages
- Rebuilt `@gravito/core` dist to include newly-exported `StorageException` class

## Task Commits

Each task was committed atomically:

1. **Task 1: Storage packages (constellation, nebula, nebula-s3, stasis, freeze)** - `e6b18d98` (feat)
2. **Task 2: Infrastructure packages (dark-matter, pulsar, forge)** - `108a07a2` (feat)

## Files Created/Modified

**Error infrastructure (created):**
- `packages/{constellation,nebula,nebula-s3,stasis,freeze}/src/errors/codes.ts` - Package-namespaced error code constants
- `packages/{constellation,nebula,nebula-s3,stasis,freeze}/src/errors/*Error.ts` - Concrete classes extending StorageException
- `packages/{dark-matter,pulsar,forge}/src/errors/codes.ts` - Package-namespaced error code constants
- `packages/{dark-matter,pulsar,forge}/src/errors/*Error.ts` - Concrete classes extending InfrastructureException
- `packages/{constellation,nebula,nebula-s3,stasis,dark-matter,forge}/tests/contract/*-errors.contract.test.ts` - Contract tests

**Source migrations (modified):**
- 34 source files across 8 packages — bare `new Error()` replaced with typed error calls

## Decisions Made

- StorageException chosen for storage-domain packages; InfrastructureException for infrastructure — aligns with the hierarchy design (StorageException already extends InfrastructureException)
- Freeze (1 throw) and pulsar (3 throws) exempt from contract tests per plan — minimal footprint doesn't justify test overhead
- Core dist rebuilt mid-execution when nebula-s3 contract test discovered StorageException missing from compiled output

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rebuilt @gravito/core dist to expose StorageException**
- **Found during:** Task 1 (nebula-s3 contract test)
- **Issue:** `SyntaxError: Export named 'StorageException' not found in module '/packages/core/dist/index.js'` — dist was built on 2026-03-27 before StorageException was added to exports
- **Fix:** `cd packages/core && bun run build` — rebuilt dist, confirmed StorageException present in output
- **Files modified:** packages/core/dist/* (not committed — dist is gitignored)
- **Verification:** `grep "StorageException" packages/core/dist/index.js` confirmed export present; all contract tests passed
- **Committed in:** Part of Task 1 commit `e6b18d98` (fix applied inline)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Core dist rebuild was necessary for contract tests to pass. No scope creep.

## Issues Encountered

- **Pre-existing stasis failures (3):** `Cannot find module '@gravito/resilience'` from plasma/BunRedisClient.ts — confirmed pre-existing via git stash. Out of scope.
- **Pre-existing forge failures (10):** Same `@gravito/resilience` issue from atlas/ConnectionManager.ts — confirmed pre-existing via git stash. Out of scope.
- **JSDoc example throws:** constellation and nebula contain `throw new Error(...)` examples inside `/** */` JSDoc comment blocks — correctly identified as documentation, not actual throws. Not replaced.

## User Setup Required

None - no external service configuration required.

## Self-Check: PASSED

- SUMMARY.md: FOUND
- Task 1 commit e6b18d98: FOUND
- Task 2 commit 108a07a2: FOUND

## Next Phase Readiness

- All 8 storage/infrastructure packages now have typed error classes with namespaced codes
- Contract test patterns established for this wave
- Ready for Phase 19-06+ (communication domain migration)
- Pre-existing `@gravito/resilience` failures in stasis and forge remain — not caused by this plan

---
*Phase: 19-secondary-orbit-migration*
*Completed: 2026-03-29*
