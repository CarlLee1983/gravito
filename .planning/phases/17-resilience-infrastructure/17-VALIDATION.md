---
phase: 17
slug: resilience-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | `packages/resilience/bunfig.toml` or package-level config |
| **Quick run command** | `cd packages/resilience && bun test` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~30 seconds (resilience), ~120 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/resilience && bun test`
- **After every plan wave:** Run `bun run typecheck && bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | RESL-01 | unit | `cd packages/resilience && bun test` | ❌ W0 | ⬜ pending |
| 17-01-02 | 01 | 1 | RESL-01 | unit | `cd packages/resilience && bun test` | ❌ W0 | ⬜ pending |
| 17-02-01 | 02 | 1 | RESL-02 | unit+integration | `cd packages/resilience && bun test` | ✅ existing | ⬜ pending |
| 17-03-01 | 03 | 2 | RESL-03 | unit | `cd packages/resilience && bun test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/resilience/tests/withRetry.test.ts` — stubs for RESL-01
- [ ] `packages/resilience/tests/withResilience.test.ts` — stubs for RESL-03
- [ ] `cockatiel` dependency installed in `packages/resilience/package.json`

*Existing CB tests (`packages/resilience/tests/core-modules/CircuitBreaker.test.ts`) cover RESL-02 baseline.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| NODE_ENV=test throws on degraded | RESL-03 | Environment-dependent behavior | Set NODE_ENV=test, trigger CB open, verify throw instead of fallback |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
