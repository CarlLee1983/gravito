---
phase: 21
slug: api-footgun-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (built-in) |
| **Config file** | `packages/core/package.json` test script |
| **Quick run command** | `cd packages/core && bun test --testPathPattern <relevant-file>` |
| **Full suite command** | `cd packages/core && bun test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/core && bun test --testPathPattern <relevant-file>`
- **After every plan wave:** Run `cd packages/core && bun test`
- **Before `/gsd-verify-work`:** Full suite must be green + `bun run typecheck`
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | FIX-05 | integration | `cd packages/core && bun test --testPathPattern orbit-middleware-isolation` | ✅ | ⬜ pending |
| 21-02-01 | 02 | 2 | FIX-01 | unit | `cd packages/core && bun test --testPathPattern router` | ❌ W0 | ⬜ pending |
| 21-02-02 | 02 | 2 | FIX-02 | unit | `cd packages/core && bun test --testPathPattern router` | ❌ W0 | ⬜ pending |
| 21-03-01 | 03 | 2 | FIX-03 | unit | `cd packages/core && bun test --testPathPattern planet-core` | ❌ W0 | ⬜ pending |
| 21-03-02 | 03 | 2 | FIX-04 | type | `bun run typecheck` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed; new tests go inside existing files per D-01.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `core.services` shows strikethrough in IDE | FIX-04 | IDE rendering cannot be tested programmatically | Open PlanetCore.ts in VS Code, hover `services` property, verify strikethrough and deprecation message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
