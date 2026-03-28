---
phase: 19
slug: secondary-orbit-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (built-in) |
| **Config file** | `bunfig.toml` per package (or root) |
| **Quick run command** | `cd packages/<name> && bun test` |
| **Full suite command** | `bun run test` |
| **Type check command** | `bun run typecheck` |
| **Estimated runtime** | ~120 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/<name> && bun test`
- **After every plan wave:** Run `bun run typecheck` (root — catches cross-package import issues)
- **Before `/gsd:verify-work`:** `bun run test && grep -r "throw new Error" packages/*/src/ | wc -l` must equal 0
- **Max feedback latency:** 30 seconds (per-package test)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-00-01 | 00 | 0 | MIGR-01 | unit | `bun test packages/core/tests/exceptions/` | ❌ W0 | ⬜ pending |
| 19-01-xx | 01 | 1 | MIGR-01, MIGR-02 | contract | `cd packages/<batch1-pkg> && bun test` | ❌ W0 | ⬜ pending |
| 19-02-xx | 02 | 2 | MIGR-01, MIGR-02 | contract | `cd packages/<batch2-pkg> && bun test` | ❌ W0 | ⬜ pending |
| 19-03-xx | 03 | 3 | MIGR-01, MIGR-02 | contract | `cd packages/<batch3-pkg> && bun test` | ❌ W0 | ⬜ pending |
| 19-04-xx | 04 | 4 | MIGR-01, MIGR-02 | contract | `cd packages/<batch4-pkg> && bun test` | ❌ W0 | ⬜ pending |
| 19-05-xx | 05 | 5 | MIGR-01, MIGR-02 | contract | `cd packages/<batch5-pkg> && bun test` | ❌ W0 | ⬜ pending |
| 19-HK-01 | health | 3 | INTG-04 | contract | `cd packages/monitor && bun test` | ⬜ pending | ⬜ pending |
| 19-SD-01 | shutdown | 2 | INTG-03 | contract | `cd packages/stream && bun test --testPathPattern shutdown` | ⬜ pending | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/core/src/exceptions/AuthException.ts` — needed by Batch 1 (fortify, sentinel)
- [ ] `packages/core/src/exceptions/QueueException.ts` — needed by Batch 3 (flux, conduit)
- [ ] `packages/core/src/exceptions/StreamException.ts` — needed by Batch 2 (stream, beam)
- [ ] `packages/core/src/exceptions/StorageException.ts` — needed by Batch 4 (nebula-*)

---

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| MIGR-01 | No bare `throw new Error()` in any Orbit package | Automated grep | `grep -r "throw new Error" packages/*/src/ \| wc -l` (target: 0) |
| MIGR-02 | All existing tests pass after migration | Regression | `bun run test` (root) |
| MIGR-02 | Contract: each error satisfies .code, .status, instanceof | Contract test | `cd packages/<name> && bun test --testPathPattern contract` |
| INTG-04 | Health registry returns per-Orbit status | Contract test | `cd packages/monitor && bun test` |
| INTG-03 | stream/beam shutdown completes within deadline | Contract test | `cd packages/stream && bun test --testPathPattern shutdown` |

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
