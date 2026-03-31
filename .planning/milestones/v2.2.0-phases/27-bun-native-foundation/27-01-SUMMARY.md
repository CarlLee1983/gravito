---
phase: 27-bun-native-foundation
plan: "01"
subsystem: infra
tags: [bun, runtime, detection, hash, crypto, ffi]

requires: []

provides:
  - NativeOrbitDetector class with detectBunCapabilities() returning frozen NativeFeatures snapshot
  - NativeFeatures interface (runtime, bunVersion, password, cryptoHasher, glob)
  - formatCapabilityReport() helper producing [gravito] native: log strings
  - HashAccelerator interface extended with sha512() and blake2b() methods
  - HashFallback sha512 (node:crypto) and blake2b (SHA-256 fallback with warning)
  - BunCryptoHasher sha512 and blake2b via Bun.CryptoHasher native API

affects:
  - 27-02-PLAN (BunHasher native implementation uses NativeFeatures + extended HashAccelerator)
  - 27-03-PLAN (BunGlobAdapter may use NativeOrbitDetector.glob flag)

tech-stack:
  added: []
  patterns:
    - "globalThis type narrowing for Bun API access — never bare Bun.xxx imports"
    - "Frozen cached singletons via Object.freeze() + static cached field"
    - "TDD: failing tests first, then minimal green implementation"

key-files:
  created:
    - packages/core/src/runtime/NativeOrbitDetector.ts
    - packages/core/tests/runtime/native-orbit-detector.test.ts
    - packages/core/tests/ffi/hash-fallback.test.ts
  modified:
    - packages/core/src/ffi/types.ts
    - packages/core/src/ffi/hash-fallback.ts
    - packages/core/src/ffi/NativeHasher.ts

key-decisions:
  - "globalThis type narrowing pattern for Bun — no bare Bun.xxx in NativeOrbitDetector"
  - "Object.freeze() on returned NativeFeatures for immutability guarantees"
  - "blake2b fallback uses SHA-256 with console.warn — matches node:crypto limitation"

patterns-established:
  - "NativeOrbitDetector pattern: probe via (globalThis as unknown as { Bun?: BunGlobal }).Bun"
  - "probeCryptoHasher helper: wrap constructor + digest in try/catch returning boolean"

requirements-completed: [BUN-03, BUN-02]

duration: 20min
completed: "2026-03-30"
---

# Phase 27 Plan 01: Bun Native Foundation Summary

**NativeOrbitDetector with frozen NativeFeatures capability snapshot and HashAccelerator extended with SHA-512/BLAKE2b via node:crypto fallback**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-30T08:22:00Z
- **Completed:** 2026-03-30T08:42:09Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- NativeOrbitDetector probes Bun APIs safely via globalThis narrowing, returns frozen + cached NativeFeatures
- formatCapabilityReport() generates `[gravito] native:` prefixed log strings with checkmarks/crosses
- HashAccelerator interface extended with sha512 and blake2b methods
- HashFallback implements sha512 (node:crypto) and blake2b (SHA-256 fallback with one-time warning)
- BunCryptoHasher updated to implement sha512 and blake2b via native Bun.CryptoHasher
- 13 tests total: 9 NativeOrbitDetector unit tests + 4 HashFallback behavioral tests

## Task Commits

1. **Task 1: NativeOrbitDetector with NativeFeatures type and unit tests** - `4ac447c2` (feat)
2. **Task 2: HashAccelerator sha512/blake2b extension and HashFallback implementation** - `3c404b89` (feat)

## Files Created/Modified

- `packages/core/src/runtime/NativeOrbitDetector.ts` - NativeOrbitDetector class, NativeFeatures interface, formatCapabilityReport helper
- `packages/core/tests/runtime/native-orbit-detector.test.ts` - 9 unit tests covering shape, Bun detection, caching, reset, report format
- `packages/core/src/ffi/types.ts` - HashAccelerator extended with sha512() and blake2b() methods
- `packages/core/src/ffi/hash-fallback.ts` - HashFallback implements sha512 (node:crypto) and blake2b (SHA-256 fallback)
- `packages/core/src/ffi/NativeHasher.ts` - BunCryptoHasher implements sha512 and blake2b via Bun.CryptoHasher
- `packages/core/tests/ffi/hash-fallback.test.ts` - 4 behavioral tests covering sha512 length/value, blake2b length, and warning

## Decisions Made

- globalThis type narrowing for Bun access — no bare `Bun.xxx` calls in NativeOrbitDetector.ts
- Object.freeze() on both outer NativeFeatures and nested objects for deep immutability
- blake2b falls back to SHA-256 with a one-time console.warn (matches node:crypto limitations)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] BunCryptoHasher missing sha512/blake2b methods after HashAccelerator extension**
- **Found during:** Task 2 (typecheck after extending HashAccelerator interface)
- **Issue:** BunCryptoHasher implements HashAccelerator but was missing the new sha512/blake2b methods — TypeScript error TS2420
- **Fix:** Added sha512() and blake2b() implementations to BunCryptoHasher using `new Bun.CryptoHasher('sha512')` and `new Bun.CryptoHasher('blake2b256')`
- **Files modified:** packages/core/src/ffi/NativeHasher.ts
- **Verification:** `bun tsc -p tsconfig.json --noEmit --skipLibCheck` passes with 0 errors
- **Committed in:** 3c404b89 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: missing interface implementation)
**Impact on plan:** Required fix for correctness. No scope creep.

## Issues Encountered

- `@gravito/nebula-s3` typecheck has pre-existing errors (missing `StorageException` export from `@gravito/core`). This is unrelated to this plan's changes and was not introduced by our modifications. Logged to deferred-items.

## Next Phase Readiness

- NativeOrbitDetector is ready for use by Plan 02 (BunHasher native implementation)
- NativeFeatures.cryptoHasher flags will guide Plan 02 native/fallback routing
- HashAccelerator sha512/blake2b interface contract established — Plan 02 can wire BunCryptoHasher through NativeHasher

---
*Phase: 27-bun-native-foundation*
*Completed: 2026-03-30*
