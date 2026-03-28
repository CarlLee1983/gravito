---
phase: 18
slug: foundation-orbit-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | Per-package `bunfig.toml` or inline |
| **Quick run command** | `bun test --filter <package>` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~30 seconds (per-package), ~120s full suite |

---

## Sampling Rate

- **After every task commit:** Run `bun test --filter <modified-package>`
- **After every plan wave:** Run `bun run test && bun run typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | INTG-01 | unit | `cd packages/atlas && bun test` | ✅ | ⬜ pending |
| 18-01-02 | 01 | 1 | INTG-02 | unit | `cd packages/plasma && bun test` | ✅ | ⬜ pending |
| 18-02-01 | 02 | 1 | INTG-01 | integration | `cd packages/atlas && bun test --filter resilience` | ❌ W0 | ⬜ pending |
| 18-02-02 | 02 | 1 | INTG-02 | integration | `cd packages/plasma && bun test --filter resilience` | ❌ W0 | ⬜ pending |
| 18-03-01 | 03 | 2 | INTG-03 | integration | `cd packages/atlas && bun test --filter shutdown` | ❌ W0 | ⬜ pending |
| 18-03-02 | 03 | 2 | INTG-03 | integration | `cd packages/plasma && bun test --filter shutdown` | ❌ W0 | ⬜ pending |
| 18-03-03 | 03 | 2 | INTG-03 | integration | `cd packages/signal && bun test --filter shutdown` | ❌ W0 | ⬜ pending |
| 18-04-01 | 04 | 3 | INTG-01,02 | contract | `bun test --filter contract` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Contract test stubs for atlas `DatabaseException` `.code` and `.status` assertions
- [ ] Contract test stubs for plasma `CacheException` `.code` and `.status` assertions
- [ ] Resilience integration test stubs for atlas retry+CB and plasma CB-only
- [ ] Shutdown handler test stubs for atlas, plasma, signal deadline enforcement

*Existing test infrastructure (bun:test) covers framework needs — no new framework install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HTTP 503 for circuit-open | INTG-01 | Requires running photon server with open CB | Start photon, trip atlas CB, verify HTTP response code |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
