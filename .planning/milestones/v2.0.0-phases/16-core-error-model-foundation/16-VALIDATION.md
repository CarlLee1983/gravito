---
phase: 16
slug: core-error-model-foundation
status: draft
nyquist_compliant: true
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
| **Quick run command** | `bun test packages/core/tests/contract/ --timeout=10000` |
| **Full suite command** | `cd packages/core && bun test --timeout=10000` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test packages/core/tests/contract/ --timeout=10000`
- **After every plan wave:** Run `cd packages/core && bun test --timeout=10000`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 16-01-01 | 01 | 1 | ERRM-01 | typecheck | `bun run typecheck` | pending |
| 16-01-02 | 01 | 1 | ERRM-01 | typecheck + unit | `bun run typecheck && bun test --filter="packages/core" --timeout=30000` | pending |
| 16-02-01 | 02 | 1 | ERRM-02 | typecheck | `bun run typecheck` | pending |
| 16-02-02 | 02 | 1 | ERRM-02 | typecheck + unit | `bun run typecheck && bun test --filter="packages/quasar" --timeout=30000` | pending |
| 16-03-01 | 03 | 2 | ERRM-01, ERRM-03 | contract | `bun test packages/core/tests/contract/core-exceptions.contract.test.ts --timeout=30000` | pending |
| 16-03-02 | 03 | 2 | ERRM-02 | contract | `bun test packages/core/tests/contract/error-codes.contract.test.ts --timeout=30000` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Contract test files are created in Plan 03 (Wave 2). Plans 01 and 02 (Wave 1) use typecheck and existing test suites for verification -- no Wave 0 dependencies needed since they don't require contract tests to verify.

- Plan 03 Task 1 creates `packages/core/tests/contract/helpers.ts` and `core-exceptions.contract.test.ts`
- Plan 03 Task 2 creates `packages/core/tests/contract/error-codes.contract.test.ts`

*Additional Orbit package contract test directories will be created in Phase 18-19*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 dependencies resolved (contract tests created in Plan 03)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
