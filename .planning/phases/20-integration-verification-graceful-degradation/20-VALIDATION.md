---
phase: 20
slug: integration-verification-graceful-degradation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (bun:test) v1.3.10 |
| **Config file** | `bunfig.toml` — root level, timeout = 10000ms |
| **Quick run command** | `bun test packages/resilience/tests/ --timeout=10000` |
| **Full suite command** | `bun test packages/ --timeout=10000` |
| **Estimated runtime** | ~120 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `bun test packages/resilience/tests/ --timeout=10000`
- **After every plan wave:** Run `bun test packages/ --timeout=10000`
- **Before `/gsd:verify-work`:** Full suite must be green + `bun run version:check`
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | INTG-05 | unit/tdd | `bun test packages/resilience/tests/degradation/OrbitDegradationManager.test.ts --timeout=10000` | ❌ W0 | ⬜ pending |
| 20-01-02 | 01 | 1 | INTG-05 | unit | `bun test packages/resilience/tests/ --timeout=10000` | ❌ W0 | ⬜ pending |
| 20-02-01 | 02 | 1 | D-10 | contract | `bun test packages/resilience/tests/satellite-contracts/error-instanceof.contract.test.ts` | ❌ W0 | ⬜ pending |
| 20-02-02 | 02 | 1 | D-10 | contract | `bun test packages/resilience/tests/satellite-contracts/orbit-api-signatures.contract.test.ts` | ❌ W0 | ⬜ pending |
| 20-03-01 | 03 | 2 | RELS-01 | smoke | `bun run version:check` | ✅ | ⬜ pending |
| 20-04-01 | 04 | 2 | RELS-01 | manual | review `docs/migration/v2.0.0.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/resilience/src/degradation/DegradedResult.ts` — interface definition
- [ ] `packages/resilience/src/degradation/OrbitDegradationManager.ts` — INTG-05 implementation
- [ ] `packages/resilience/tests/degradation/OrbitDegradationManager.test.ts` — covers INTG-05 (TDD in Plan 20-01)
- [ ] `packages/resilience/tests/satellite-contracts/error-instanceof.contract.test.ts` — covers D-10 error compat
- [ ] `packages/resilience/tests/satellite-contracts/orbit-api-signatures.contract.test.ts` — covers D-10 API compat
- [ ] `docs/migration/` directory — for RELS-01 documentation deliverable

*Existing infrastructure covers version:check (scripts/check-versions.ts).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration guide quality | RELS-01 | Content review cannot be automated | Read `docs/migration/v2.0.0.md`, verify before/after examples are accurate |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
