---
phase: 32
slug: verification-audit-trail
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun test (Bun built-in test runner) |
| **Config file** | bunfig.toml (root) |
| **Quick run command** | `bun test packages/core/tests/router-schema.test.ts packages/cli/tests/openapi-generate.test.ts` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~5 seconds (quick) / ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `bun test packages/core/tests/router-schema.test.ts packages/cli/tests/openapi-generate.test.ts`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 1 | DX-01, DX-02 | doc + test evidence | `test -f .planning/phases/30-static-openapi-generation/30-VERIFICATION.md` | ❌ W0 | ⬜ pending |
| 32-01-02 | 01 | 1 | PERF-02 | doc refresh | `grep -q "status: passed" .planning/phases/28-fast-path-routing/28-VERIFICATION.md` | ✅ | ⬜ pending |
| 32-01-03 | 01 | 1 | DX-01, DX-02, DX-03, TOOL-01 | checkbox sync | `grep -c "\[x\]" .planning/REQUIREMENTS.md` | ✅ | ⬜ pending |
| 32-01-04 | 01 | 1 | ALL | audit gate | `/gsd:audit-milestone` produces passed | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files or frameworks needed — Phase 32 is a documentation/audit phase that verifies existing test evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audit milestone produces `passed` | ALL | Requires running /gsd:audit-milestone workflow | Run `/gsd:audit-milestone` and confirm status is `passed` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
