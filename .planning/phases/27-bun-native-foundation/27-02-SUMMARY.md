---
phase: 27-bun-native-foundation
plan: "02"
subsystem: infra
tags: [bun, runtime, hash, crypto, argon2id, password, integration-test]

requires:
  - 27-01 (NativeOrbitDetector, HashAccelerator sha512/blake2b, BunCryptoHasher)

provides:
  - NativeHasher.sha512() static method via BunCryptoHasher on Bun runtime
  - NativeHasher.blake2b() static method via BunCryptoHasher on Bun runtime
  - resetPasswordAdapter() exported function for test isolation
  - Integration test confirming argon2id native path (core password adapter)
  - Integration test confirming HashManager.make() argon2id via Bun.password (BUN-01)

affects:
  - 27-03-PLAN (BunGlobAdapter — can now rely on confirmed BUN-01/BUN-02 native paths)

tech-stack:
  added: []
  patterns:
    - "TDD: failing tests first, then minimal green implementation"
    - "resetPasswordAdapter() pattern for singleton test isolation"
    - "Integration tests asserting full-stack argon2id: HashManager -> getPasswordAdapter -> Bun.password"

key-files:
  created:
    - packages/core/tests/ffi/native-hasher-sha512-blake2b.test.ts
    - packages/core/tests/runtime/password-adapter.test.ts
    - packages/sentinel/tests/hash-manager-argon2id-native.integration.test.ts
  modified:
    - packages/core/src/ffi/NativeHasher.ts
    - packages/core/src/runtime/index.ts
    - packages/core/src/runtime.ts

key-decisions:
  - "Static sha512/blake2b delegate to getAccelerator() — isBunAvailable() guard already covers new methods"
  - "resetPasswordAdapter() sets passwordAdapter = null — same pattern as resetRuntimeAdapter()"
  - "Sentinel integration test uses HashManager directly (no mock) to confirm real Bun.password stack"

requirements-completed: [BUN-01, BUN-02]

duration: ~3min
completed: "2026-03-30"
---

# Phase 27 Plan 02: NativeHasher sha512/blake2b + resetPasswordAdapter + Integration Tests Summary

**NativeHasher.sha512()/blake2b() static methods, resetPasswordAdapter() singleton reset, and integration tests confirming argon2id native path on Bun runtime (BUN-01/BUN-02)**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-30T08:44:57Z
- **Completed:** 2026-03-30T08:47:24Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- NativeHasher.sha512() static method added — delegates to BunCryptoHasher.sha512() via getAccelerator(), covered by isBunAvailable() guard
- NativeHasher.blake2b() static method added — delegates to BunCryptoHasher.blake2b() via getAccelerator(), covered by isBunAvailable() guard
- resetPasswordAdapter() added to runtime/index.ts and re-exported in runtime.ts barrel
- 9 SHA-512/BLAKE2b tests: known value verification, 128-char output, 64-char blake2b, Uint8Array input, Bun runtime status
- 4 password adapter tests: argon2id prefix, bcrypt prefix, verify correctness, singleton reset
- 3 sentinel HashManager integration tests: BUN-01 confirmed (argon2id via Bun.password, check true/false)
- All 45 tests pass across 4 test files; core typecheck 0 errors

## Task Commits

1. **Task 1: NativeHasher.sha512() and blake2b() static methods with TDD tests** - `3b5cc05f` (feat)
2. **Task 2: resetPasswordAdapter() and argon2id integration test** - `77803a87` (feat)
3. **Task 3: sentinel HashManager argon2id native integration test (BUN-01)** - `b3f68830` (test)

## Files Created/Modified

- `packages/core/src/ffi/NativeHasher.ts` - Added static sha512() and blake2b() methods
- `packages/core/src/runtime/index.ts` - Added resetPasswordAdapter() export
- `packages/core/src/runtime.ts` - Re-exported resetPasswordAdapter() in barrel
- `packages/core/tests/ffi/native-hasher-sha512-blake2b.test.ts` - 9 tests for sha512/blake2b
- `packages/core/tests/runtime/password-adapter.test.ts` - 4 integration tests for password adapter
- `packages/sentinel/tests/hash-manager-argon2id-native.integration.test.ts` - 3 integration tests (BUN-01)

## Decisions Made

- Static sha512/blake2b delegate through getAccelerator() — no new guard needed, isBunAvailable() already protects
- resetPasswordAdapter() follows the identical pattern of resetRuntimeAdapter() already present
- Sentinel integration test instantiates HashManager directly without mocks to confirm the real Bun.password stack

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

Files exist:
- packages/core/src/ffi/NativeHasher.ts: FOUND (contains static sha512/blake2b)
- packages/core/src/runtime/index.ts: FOUND (contains resetPasswordAdapter)
- packages/core/tests/ffi/native-hasher-sha512-blake2b.test.ts: FOUND
- packages/core/tests/runtime/password-adapter.test.ts: FOUND
- packages/sentinel/tests/hash-manager-argon2id-native.integration.test.ts: FOUND

Commits verified:
- 3b5cc05f: feat(27-02): NativeHasher sha512/blake2b
- 77803a87: feat(27-02): resetPasswordAdapter
- b3f68830: test(27-02): sentinel integration test

---
*Phase: 27-bun-native-foundation*
*Completed: 2026-03-30*
