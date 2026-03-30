---
phase: 24
slug: config-type-unification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (Bun native) |
| **Config file** | packages/core/package.json `"test": "bun test --timeout=10000"` |
| **Quick run command** | `cd packages/core && bun run typecheck` |
| **Full suite command** | `cd packages/core && bun run test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/core && bun run typecheck`
- **After every plan wave:** Run `cd packages/core && bun run test`
- **Before `/gsd-verify-work`:** Full suite must be green + `bun run typecheck` (workspace root)
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | TYPE-01 | typecheck | `cd packages/core && bun run typecheck` | N/A | ⬜ pending |
| 24-01-02 | 01 | 1 | TYPE-01 | unit | `cd packages/core && bun test tests/application.test.ts` | ✅ | ⬜ pending |
| 24-01-03 | 01 | 1 | FIX-03 | unit | `cd packages/core && bun test tests/ioc.test.ts` | ✅ | ⬜ pending |
| 24-01-04 | 01 | 1 | SC-3 | typecheck | `bun run typecheck` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
