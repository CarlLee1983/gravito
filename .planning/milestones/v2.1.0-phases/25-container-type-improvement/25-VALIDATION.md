---
phase: 25
slug: container-type-improvement
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-30
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test 1.3.10 |
| **Config file** | packages/core/bunfig.toml |
| **Quick run command** | `cd packages/core && bun test tests/service-map.test.ts` |
| **Full suite command** | `cd packages/core && bun run typecheck && bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/core && bun test tests/service-map.test.ts`
- **After every plan wave:** Run `cd packages/core && bun run typecheck && bun test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 1 | TYPE-02 | unit | `cd packages/core && bun test tests/service-map.test.ts` | ✅ (partial — needs new cases) | ⬜ pending |
| 25-01-02 | 01 | 1 | TYPE-02 | typecheck | `cd packages/core && bun run typecheck` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. `service-map.test.ts` exists and runs (2 pass, 0 fail baseline). The phase adds test cases to an existing file, not a new file.

*No Wave 0 setup needed.*

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
