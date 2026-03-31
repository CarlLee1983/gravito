---
phase: 30
slug: static-openapi-generation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in Bun test runner) |
| **Config file** | none — bun test discovers `tests/` automatically |
| **Quick run command** | `bun test packages/cli/tests/openapi-generate.test.ts packages/core/tests/router-schema.test.ts --timeout=10000` |
| **Full suite command** | `bun test packages/cli/tests/ packages/core/tests/ --timeout=15000` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test packages/cli/tests/openapi-generate.test.ts packages/core/tests/router-schema.test.ts --timeout=10000`
- **After every plan wave:** Run `bun test packages/cli/tests/ packages/core/tests/ --timeout=15000`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 0 | DX-02 | unit | `bun test packages/cli/tests/openapi-generate.test.ts` | ✅ (expand) | ⬜ pending |
| 30-01-02 | 01 | 0 | DX-01 | unit | `bun test packages/core/tests/router-schema.test.ts` | ✅ (expand) | ⬜ pending |
| 30-01-03 | 01 | 1 | DX-02 | integration | `bun test packages/cli/tests/openapi-generate.test.ts` | ✅ | ⬜ pending |
| 30-01-04 | 01 | 1 | DX-02 | integration | `bun test packages/cli/tests/openapi-generate.test.ts` | ❌ W0 | ⬜ pending |
| 30-01-05 | 01 | 1 | DX-02 | integration | `bun test packages/cli/tests/openapi-generate.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/cli/tests/openapi-generate.test.ts` — add tests: (a) routes without schemas still in output, (b) number/boolean field type assertions, (c) schema extraction failure exits non-zero
- [ ] `packages/core/tests/router-schema.test.ts` — add tests: body/params/query/response preserved independently, unnamed route schema access

*Existing test files exist — only new test cases need to be added, not new files.*

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
