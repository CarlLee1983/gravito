---
phase: 27-bun-native-foundation
verified: 2026-03-30T18:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 6/10
  gaps_closed:
    - "PlanetCore.boot() imports NativeOrbitDetector and calls detectBunCapabilities() + formatCapabilityReport() before orbits loop"
    - "NativeOrbitDetector, NativeFeatures, formatCapabilityReport exported from packages/core/src/index.ts"
    - "resetPasswordAdapter exported from packages/core/src/index.ts"
    - "boot-capability-report.test.ts exists with 5 integration tests — all pass"
  gaps_remaining: []
  regressions: []
---

# Phase 27: Bun-Native Foundation Verification Report

**Phase Goal:** 所有 Orbit 可在開機時查詢 Bun 原生能力，Sentinel 和 Crypto 路徑已確認直接使用 Bun 原生 API，框架開機時輸出能力摘要
**Verified:** 2026-03-30T18:00:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (cherry-pick of Plan 03 implementation commits)

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Framework logs a Bun-native capability report at boot | ✓ VERIFIED | PlanetCore.ts line 30 imports NativeOrbitDetector; lines 811-812 call detectBunCapabilities() and logger.info(formatCapabilityReport(features)) before orbits loop |
| 2 | Sentinel HashManager uses argon2id (not bcryptjs) — confirmed by integration test | ✓ VERIFIED | packages/sentinel/tests/hash-manager-argon2id-native.integration.test.ts passes 3/3; hashes match /^\$argon2id\$/ |
| 3 | RuntimeCryptoAdapter calls Bun.CryptoHasher for SHA-512/BLAKE2b — confirmed by test | ✓ VERIFIED | native-hasher-sha512-blake2b.test.ts passes 9 tests; NativeHasher.sha512() uses Bun.CryptoHasher('sha512') |
| 4 | NativeOrbitDetector.detectBunCapabilities() returns typed NativeFeatures — no direct Bun.xxx calls outside adapter-bun.ts | ✓ VERIFIED | NativeOrbitDetector.ts uses globalThis type narrowing exclusively; returns frozen NativeFeatures object |
| 4b | NativeOrbitDetector and NativeFeatures importable from '@gravito/core' | ✓ VERIFIED | packages/core/src/index.ts lines 797-798: exports NativeFeatures type, NativeOrbitDetector, formatCapabilityReport |
| 4c | resetPasswordAdapter importable from '@gravito/core' | ✓ VERIFIED | packages/core/src/index.ts line 785: resetPasswordAdapter present in runtime export block |
| 5 | Boot-time capability report logged BEFORE orbits loop | ✓ VERIFIED | PlanetCore.ts lines 811-813 (capability report) precede lines 814-826 (orbits loop); boot-capability-report.test.ts test 5 confirms ordering — 5 pass, 0 fail |

**Score:** 7/7 ROADMAP truths verified

---

## Must-Haves by Plan

### Plan 27-01 Must-Haves

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | NativeOrbitDetector.detectBunCapabilities() returns typed NativeFeatures with boolean flags | ✓ VERIFIED | File exists, all 9 unit tests pass |
| 2 | NativeFeatures object is frozen and cached | ✓ VERIFIED | Object.freeze() present, static cached field present |
| 3 | No direct Bun.xxx calls in NativeOrbitDetector.ts | ✓ VERIFIED | Only globalThis type narrowing; no bare Bun. references |
| 4 | HashAccelerator interface includes sha512 and blake2b | ✓ VERIFIED | types.ts lines 138-148 |
| 5 | HashFallback implements sha512 via node:crypto and blake2b via sha256 fallback | ✓ VERIFIED | hash-fallback.ts lines 50-68 |
| 6 | HashFallback sha512 and blake2b covered by behavioral tests | ✓ VERIFIED | hash-fallback.test.ts passes 4 tests |

### Plan 27-02 Must-Haves

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | NativeHasher.sha512() returns 128-char hex on Bun runtime via Bun.CryptoHasher | ✓ VERIFIED | NativeHasher.ts line 154; test passes |
| 2 | NativeHasher.blake2b() returns 64-char hex via CryptoHasher('blake2b256') | ✓ VERIFIED | NativeHasher.ts line 165; test passes |
| 3 | getPasswordAdapter() on Bun produces argon2id hashes starting with $argon2id$ | ✓ VERIFIED | password-adapter.test.ts passes |
| 4 | resetPasswordAdapter() exported and clears cached singleton | ✓ VERIFIED | runtime/index.ts line 178; runtime.ts line 61 re-exports it |
| 5 | HashManager.make() in sentinel produces $argon2id$-prefixed hash | ✓ VERIFIED | hash-manager-argon2id-native.integration.test.ts passes 3/3 |

### Plan 27-03 Must-Haves

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PlanetCore.boot() logs capability report containing '[gravito] native:' | ✓ VERIFIED | PlanetCore.ts lines 811-812; boot-capability-report.test.ts test 1 passes |
| 2 | NativeOrbitDetector and NativeFeatures importable from '@gravito/core' | ✓ VERIFIED | index.ts lines 797-798 |
| 3 | resetPasswordAdapter importable from '@gravito/core' | ✓ VERIFIED | index.ts line 785 |
| 4 | Boot capability report shows checkmark/fallback text for APIs | ✓ VERIFIED | formatCapabilityReport() outputs '✓' or '✗ (fallback: ...)'; tests 2-4 verify Bun.password argon2id, Bun.CryptoHasher, Bun.Glob content |

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/runtime/NativeOrbitDetector.ts` | NativeOrbitDetector + NativeFeatures + formatCapabilityReport | ✓ VERIFIED | 187 lines, all exports present |
| `packages/core/src/ffi/types.ts` | Extended HashAccelerator with sha512/blake2b | ✓ VERIFIED | Lines 138-148 |
| `packages/core/src/ffi/hash-fallback.ts` | HashFallback sha512/blake2b implementations | ✓ VERIFIED | Lines 50-68 |
| `packages/core/tests/runtime/native-orbit-detector.test.ts` | 9+ unit tests | ✓ VERIFIED | 9 tests pass |
| `packages/core/tests/ffi/hash-fallback.test.ts` | 4+ behavioral tests | ✓ VERIFIED | 4 tests pass |
| `packages/core/src/ffi/NativeHasher.ts` | NativeHasher with sha512/blake2b static methods | ✓ VERIFIED | Lines 154-167 |
| `packages/core/src/runtime/index.ts` | resetPasswordAdapter export | ✓ VERIFIED | Line 178 |
| `packages/core/tests/ffi/native-hasher-sha512-blake2b.test.ts` | 9 tests | ✓ VERIFIED | 9 tests pass |
| `packages/core/tests/runtime/password-adapter.test.ts` | 4 integration tests | ✓ VERIFIED | 4 tests pass |
| `packages/sentinel/tests/hash-manager-argon2id-native.integration.test.ts` | 3 BUN-01 integration tests | ✓ VERIFIED | 3 tests pass |
| `packages/core/src/PlanetCore.ts` | Boot-time capability report call | ✓ VERIFIED | Lines 30 (import) and 811-812 (call in boot()) |
| `packages/core/src/index.ts` | Public exports for NativeOrbitDetector, NativeFeatures, formatCapabilityReport, resetPasswordAdapter | ✓ VERIFIED | Lines 785, 797-798 |
| `packages/core/tests/runtime/boot-capability-report.test.ts` | 5 integration tests for boot log | ✓ VERIFIED | 5 pass, 0 fail (67ms) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `NativeOrbitDetector.ts` | `runtime/detection.ts` | import getRuntimeKind | ✓ WIRED | Line 11: `import { getRuntimeKind } from './detection'` |
| `NativeHasher.ts` | `Bun.CryptoHasher` | BunCryptoHasher class | ✓ WIRED | Lines 55, 63 use `Bun.CryptoHasher('sha512')` and `('blake2b256')` |
| `runtime/index.ts` | `Bun.password` | getPasswordAdapter singleton | ✓ WIRED | Line 131; `B.password.hash` used |
| `sentinel/HashManager.ts` | `@gravito/core` | getPasswordAdapter import | ✓ WIRED | Confirmed by passing integration tests |
| `PlanetCore.ts` | `NativeOrbitDetector.ts` | import + detectBunCapabilities call | ✓ WIRED | Line 30 import; lines 811-812 call in static boot() |
| `packages/core/src/index.ts` | `NativeOrbitDetector.ts` | re-export | ✓ WIRED | Lines 797-798: NativeFeatures type + NativeOrbitDetector + formatCapabilityReport |
| `packages/core/src/index.ts` | `resetPasswordAdapter` | re-export via ./runtime | ✓ WIRED | Line 785: resetPasswordAdapter in runtime export block |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| NativeOrbitDetector unit tests | `bun test native-orbit-detector.test.ts` | 9 pass, 0 fail | ✓ PASS |
| HashFallback behavioral tests | `bun test hash-fallback.test.ts` | 4 pass, 0 fail | ✓ PASS |
| NativeHasher sha512/blake2b tests | `bun test native-hasher-sha512-blake2b.test.ts` | 9 pass, 0 fail | ✓ PASS |
| Password adapter integration tests | `bun test password-adapter.test.ts` | 4 pass, 0 fail | ✓ PASS |
| HashManager BUN-01 integration test | `bun test hash-manager-argon2id-native.integration.test.ts` | 3 pass, 0 fail | ✓ PASS |
| Boot capability report integration test | `bun test boot-capability-report.test.ts` | 5 pass, 0 fail | ✓ PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BUN-01 | 27-02 | Sentinel HashManager uses Bun.password natively for hash/verify | ✓ SATISFIED | Integration test passes, $argon2id$ prefix confirmed |
| BUN-02 | 27-01, 27-02 | RuntimeCryptoAdapter uses Bun.CryptoHasher for SHA-256/512/BLAKE2b | ✓ SATISFIED | NativeHasher.ts uses Bun.CryptoHasher for all algorithms; tests pass |
| BUN-03 | 27-01, 27-03 | NativeOrbitDetector allows Orbits to query Bun capabilities | ✓ SATISFIED | NativeOrbitDetector exported from @gravito/core; any Orbit can import and query NativeFeatures |
| PERF-03 | 27-03 | Framework logs Bun-native capability report at boot | ✓ SATISFIED | PlanetCore.boot() calls detectBunCapabilities() and logs formatCapabilityReport() before orbits; 5 tests confirm behavior |

---

## Anti-Patterns Found

None.

---

## Human Verification Required

None — all checks are deterministic code-level verifications.

---

## Gaps Summary (Re-verification)

All 4 gaps from the initial verification are resolved:

1. **PlanetCore.boot() capability report** — `PlanetCore.ts` line 30 imports `NativeOrbitDetector` and `formatCapabilityReport`; lines 811-812 call them inside `static async boot()` before the orbits loop. CLOSED.

2. **NativeOrbitDetector public API** — `packages/core/src/index.ts` lines 797-798 export `NativeFeatures` (type), `NativeOrbitDetector`, and `formatCapabilityReport`. CLOSED.

3. **resetPasswordAdapter public API** — `packages/core/src/index.ts` line 785 includes `resetPasswordAdapter` in the runtime export block. CLOSED.

4. **Boot capability report test** — `packages/core/tests/runtime/boot-capability-report.test.ts` exists with 5 integration tests; all 5 pass in 67ms. CLOSED.

Phase 27 goal is fully achieved. All Plans 01, 02, and 03 are implemented, tested, and wired.

---

_Initial verification: 2026-03-30T17:00:00Z_
_Re-verified: 2026-03-30T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
