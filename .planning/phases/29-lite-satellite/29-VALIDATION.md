---
phase: 29
slug: lite-satellite
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (Bun built-in) |
| **Config file** | packages/core/package.json `"test": "bun test"` |
| **Quick run command** | `cd packages/core && bun test tests/lite-satellite.test.ts` |
| **Full suite command** | `cd packages/core && bun test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/core && bun test tests/lite-satellite.test.ts`
- **After every plan wave:** Run `cd packages/core && bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | DX-03 | unit | `cd packages/core && bun test tests/lite-satellite.test.ts` | ❌ W0 | ⬜ pending |
| 29-01-02 | 01 | 1 | DX-03 | unit | `cd packages/core && bun test tests/lite-satellite.test.ts` | ❌ W0 | ⬜ pending |
| 29-02-01 | 02 | 1 | DX-03 | unit | `cd packages/core && bun test tests/lite-satellite.test.ts` | ✅ partial | ⬜ pending |
| 29-02-02 | 02 | 1 | DX-03 | integration | `cd packages/core && bun test tests/lite-satellite.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/core/src/exceptions/ContainerBindingCollisionException.ts` — new exception class (required before collision tests)
- [ ] `packages/core/src/exceptions/index.ts` — add export for new exception
- [ ] Expand `packages/core/tests/lite-satellite.test.ts` — collision detection + boot() integration tests

*Existing infrastructure covers test runner and framework.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
