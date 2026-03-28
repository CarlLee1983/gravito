---
phase: 16
slug: core-error-model-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built into Bun) |
| **Config file** | packages/core/package.json `scripts.test` |
| **Quick run command** | `cd packages/core && bun test tests/exceptions*.test.ts --timeout=10000` |
| **Full suite command** | `cd packages/core && bun test --timeout=10000` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/core && bun test tests/exceptions*.test.ts --timeout=10000`
- **After every plan wave:** Run `cd packages/core && bun test --timeout=10000`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | ERRM-01 | unit | `cd packages/core && bun test tests/contract/ --timeout=5000` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | ERRM-01 | unit | `cd packages/core && bun test tests/exceptions*.test.ts --timeout=5000` | ✅ needs expansion | ⬜ pending |
| 16-02-01 | 02 | 1 | ERRM-02 | unit | `cd packages/core && bun test tests/contract/ --timeout=5000` | ❌ W0 | ⬜ pending |
| 16-03-01 | 03 | 2 | ERRM-03 | unit | `cd packages/core && bun test tests/contract/ --timeout=5000` | ❌ W0 | ⬜ pending |
| 16-04-01 | 04 | 2 | SC-4 | unit | `cd packages/core && bun test tests/exceptions-gravito.test.ts --timeout=5000` | ✅ needs expansion | ⬜ pending |
| 16-05-01 | 05 | 3 | SC-5 | unit | `bun test --filter="contract" --timeout=10000` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/core/tests/contract/helpers.ts` — contract assertion helpers (assertInstanceof, assertCode, assertCause)
- [ ] `packages/core/tests/contract/core-exceptions.contract.test.ts` — ERRM-01/02/03 contract tests

*Additional Orbit package contract test directories will be created in Phase 18-19*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
