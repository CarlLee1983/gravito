---
phase: 27-bun-native-foundation
plan: "03"
subsystem: infra
tags: [bun, runtime, detection, boot, export]

requires:
  - 27-01 (NativeOrbitDetector, NativeFeatures, formatCapabilityReport)
  - 27-02 (resetPasswordAdapter in runtime/index.ts)

provides:
  - PlanetCore.boot() logs [gravito] native: capability report before orbit installation
  - NativeOrbitDetector publicly exported from @gravito/core
  - NativeFeatures type publicly exported from @gravito/core
  - formatCapabilityReport publicly exported from @gravito/core
  - resetPasswordAdapter publicly exported from @gravito/core
  - Integration test confirming boot-time capability log (boot-capability-report.test.ts)

affects:
  - All downstream packages importing @gravito/core (can now use NativeOrbitDetector)

tech-stack:
  added: []
  patterns:
    - "Boot-time capability logging: detectBunCapabilities() called in PlanetCore.boot() before orbit loop"
    - "TDD: failing tests first (RED), then minimal green implementation"

key-files:
  created:
    - packages/core/tests/runtime/boot-capability-report.test.ts
  modified:
    - packages/core/src/PlanetCore.ts
    - packages/core/src/runtime/index.ts
    - packages/core/src/index.ts

key-decisions:
  - "Capability report logged BEFORE orbits loop — orbits read warm cache, no double probing"
  - "NativeOrbitDetector exported directly from runtime/NativeOrbitDetector (not via runtime barrel re-export in index.ts) for clarity"
  - "resetPasswordAdapter added to existing runtime export block in index.ts (not a new section)"

patterns-established:
  - "PlanetCore.boot() lifecycle: PlanetCore instance → capability report → orbits loop"

requirements-completed: [PERF-03, BUN-03]

duration: ~5min
completed: "2026-03-30"
---

# Phase 27 Plan 03: Wire Boot Capability Report and Export New Symbols Summary

**PlanetCore.boot() now logs [gravito] native: capability report before orbit installation; NativeOrbitDetector, NativeFeatures, formatCapabilityReport, and resetPasswordAdapter all publicly exported from @gravito/core**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-30T08:49:00Z
- **Completed:** 2026-03-30T08:52:25Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- NativeOrbitDetector.detectBunCapabilities() called in PlanetCore.boot() after core construction, before orbits loop
- formatCapabilityReport(features) logged via core.logger.info() — captures real Bun API status on every boot
- 5 integration tests in boot-capability-report.test.ts: [gravito] native: presence, argon2id / CryptoHasher / Glob content, ordering before orbits
- NativeOrbitDetector, NativeFeatures, formatCapabilityReport, resetPasswordAdapter all re-exported from packages/core/src/index.ts
- Phase 27 fully complete: BUN-01 (argon2id), BUN-02 (sha512/blake2b), BUN-03 (capability detection), PERF-03 (boot report) satisfied

## Task Commits

1. **Task 1: Wire capability report into PlanetCore.boot() and create integration test** - `3c6878e4` (feat)
2. **Task 2: Export new public symbols from @gravito/core and verify full suite** - `50bb8a4d` (feat)

## Files Created/Modified

- `packages/core/src/PlanetCore.ts` - Added NativeOrbitDetector import + detectBunCapabilities()/formatCapabilityReport() call in boot()
- `packages/core/tests/runtime/boot-capability-report.test.ts` - 5 integration tests for boot-time capability log
- `packages/core/src/runtime/index.ts` - Added NativeFeatures, NativeOrbitDetector, formatCapabilityReport exports
- `packages/core/src/index.ts` - Added NativeFeatures, NativeOrbitDetector, formatCapabilityReport, resetPasswordAdapter to public API

## Decisions Made

- Capability report is logged BEFORE the orbits loop so orbits can rely on a warm NativeFeatures cache
- Direct re-export from `./runtime/NativeOrbitDetector` in index.ts bypasses runtime barrel to avoid double-path confusion
- resetPasswordAdapter added inline in the existing runtime export block (no separate section)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

Files exist:
- packages/core/src/PlanetCore.ts: FOUND (contains NativeOrbitDetector import and call)
- packages/core/tests/runtime/boot-capability-report.test.ts: FOUND (5 tests)
- packages/core/src/runtime/index.ts: FOUND (contains NativeOrbitDetector exports)
- packages/core/src/index.ts: FOUND (contains NativeOrbitDetector, NativeFeatures, formatCapabilityReport, resetPasswordAdapter)

Commits verified:
- 3c6878e4: feat(27-03): wire NativeOrbitDetector capability report into PlanetCore.boot()
- 50bb8a4d: feat(27-03): export NativeOrbitDetector, NativeFeatures, formatCapabilityReport, resetPasswordAdapter from @gravito/core

Acceptance criteria:
- packages/core/src/PlanetCore.ts contains `import.*NativeOrbitDetector.*formatCapabilityReport` ✓
- packages/core/src/PlanetCore.ts contains `NativeOrbitDetector.detectBunCapabilities()` ✓
- packages/core/src/PlanetCore.ts contains `formatCapabilityReport(features)` ✓
- NativeOrbitDetector import and call appear BEFORE `if (config.orbits)` block ✓
- packages/core/tests/runtime/boot-capability-report.test.ts: 5/5 pass ✓
- packages/core/src/index.ts contains `export.*NativeOrbitDetector` ✓
- packages/core/src/index.ts contains `export type.*NativeFeatures` ✓
- packages/core/src/index.ts contains `export.*formatCapabilityReport` ✓
- packages/core/src/index.ts contains `export.*resetPasswordAdapter` ✓
- packages/core/src/runtime/index.ts contains `export.*NativeOrbitDetector` ✓
- `bun run typecheck` exits 0 (core package) ✓
- `bun test boot-capability-report.test.ts` exits 0 ✓

## Next Phase Readiness

- Phase 27 (bun-native-foundation) is complete: all 3 plans done
- BUN-01, BUN-02, BUN-03, PERF-03 requirements all satisfied
- NativeOrbitDetector is now part of @gravito/core public API — ready for Phase 28 (fast-path) and other downstream phases

---
*Phase: 27-bun-native-foundation*
*Completed: 2026-03-30*
