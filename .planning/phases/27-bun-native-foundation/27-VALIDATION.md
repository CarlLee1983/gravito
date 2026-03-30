---
phase: 27
slug: bun-native-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | `bunfig.toml` |
| **Quick run command** | `bun test packages/core/tests` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test packages/core/tests`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | BUN-03 | unit | `bun test packages/core/tests/runtime/native-orbit-detector.test.ts` | ❌ W0 | ⬜ pending |
| 27-01-02 | 01 | 1 | BUN-02 | unit | `bun test packages/core/tests/ffi/native-hasher.test.ts` | ✅ | ⬜ pending |
| 27-02-01 | 02 | 2 | BUN-01 | integration | `bun test packages/core/tests/runtime/password-adapter.test.ts` | ❌ W0 | ⬜ pending |
| 27-02-02 | 02 | 2 | BUN-02 | integration | `bun test packages/core/tests/ffi/crypto-hasher-bun.test.ts` | ❌ W0 | ⬜ pending |
| 27-03-01 | 03 | 3 | PERF-03 | integration | `bun test packages/core/tests/runtime/boot-capability-report.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/core/tests/runtime/native-orbit-detector.test.ts` — stubs for BUN-03 NativeOrbitDetector
- [ ] `packages/core/tests/runtime/password-adapter.test.ts` — integration stubs for BUN-01 argon2id path
- [ ] `packages/core/tests/ffi/crypto-hasher-bun.test.ts` — stubs for BUN-02 SHA-512/BLAKE2b
- [ ] `packages/core/tests/runtime/boot-capability-report.test.ts` — stubs for PERF-03 boot report

*Existing `native-hasher.test.ts` covers basic SHA-256 path.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Boot log output format | PERF-03 | Visual inspection of log format | Run `bun examples/basic-app.ts`, verify `[gravito] native:` line appears in stdout |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
