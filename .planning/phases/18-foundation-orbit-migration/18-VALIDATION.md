---
phase: 18
slug: foundation-orbit-migration
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-28
updated: 2026-03-28
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | Per-package `bunfig.toml` or inline |
| **Quick run command** | `cd packages/<pkg> && bun test` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~30 seconds (per-package), ~120s full suite |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/<modified-package> && bun test`
- **After every plan wave:** Run `bun run test && bun run typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | INTG-01,02 | unit | `cd packages/core && bun test tests/contract/intermediate-exceptions.contract.test.ts` | ❌ W0 | pending |
| 18-02-01 | 02 | 2 | INTG-02 | contract | `cd packages/plasma && bun test tests/contract/plasma-errors.contract.test.ts` | ❌ W0 | pending |
| 18-02-02 | 02 | 2 | INTG-02,03 | contract | `cd packages/plasma && bun test tests/contract/plasma-shutdown.contract.test.ts` | ❌ W0 | pending |
| 18-03-01 | 03 | 2 | INTG-03 | contract | `cd packages/signal && bun test tests/contract/signal-errors.contract.test.ts` | ❌ W0 | pending |
| 18-03-02 | 03 | 2 | INTG-03 | contract | `cd packages/signal && bun test tests/contract/signal-shutdown.contract.test.ts` | ❌ W0 | pending |
| 18-04-01 | 04 | 3 | INTG-01 | contract | `cd packages/photon && bun test tests/contract/photon-cb.contract.test.ts` | ❌ W0 | pending |
| 18-05-01 | 05 | 3 | INTG-01 | contract | `cd packages/atlas && bun test tests/contract/atlas-errors.contract.test.ts` | ❌ W0 | pending |
| 18-05-02 | 05 | 3 | INTG-03 | contract | `cd packages/atlas && bun test tests/contract/atlas-shutdown.contract.test.ts` | ❌ W0 | pending |
| 18-05-03 | 05 | 3 | INTG-01 | contract | `cd packages/atlas && bun test tests/contract/atlas-resilience.contract.test.ts` | ❌ W0 | pending |
| 18-06-01 | 06 | 4 | INTG-03 | unit | `cd packages/core && bun test tests/shutdown-global-timeout.test.ts` | ❌ W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] Contract test stubs for core `DatabaseException`/`CacheException` instanceof assertions
- [ ] Contract test stubs for atlas `DatabaseException` `.code` and `.status` assertions
- [ ] Contract test stubs for plasma `CacheException` `.code` and `.status` assertions
- [ ] Resilience integration test stubs for atlas retry+CB and plasma CB-only
- [ ] Shutdown handler test stubs for atlas, plasma, signal deadline enforcement
- [ ] Global shutdown timeout test for PlanetCore (D-10)

*Existing test infrastructure (bun:test) covers framework needs — no new framework install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HTTP 503 for circuit-open | INTG-01 | Requires running photon server with open CB | Start photon, trip atlas CB, verify HTTP response code |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
