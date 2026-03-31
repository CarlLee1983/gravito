---
phase: 31
slug: dependency-graph-tooling
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | none — bun test discovers `**/*.test.ts` |
| **Quick run command** | `bun test packages/cli/tests/deps-graph.test.ts --timeout=15000` |
| **Full suite command** | `bun test packages/cli/tests/ --timeout=15000` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test packages/cli/tests/deps-graph.test.ts --timeout=15000`
- **After every plan wave:** Run `bun test packages/cli/tests/ --timeout=15000`
- **Before `/gsd-verify-work`:** Full suite must be green + `publint` clean on photon/cli/core
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | TOOL-01 | unit | `bun test packages/cli/tests/deps-graph.test.ts --timeout=15000` | ✅ (JSON format) | ⬜ pending |
| 31-01-02 | 01 | 1 | TOOL-01 | unit | `bun test packages/cli/tests/deps-graph.test.ts --timeout=15000` | ❌ W0 (DOT format) | ⬜ pending |
| 31-01-03 | 01 | 1 | TOOL-01 | unit | `bun test packages/cli/tests/deps-graph.test.ts --timeout=15000` | ❌ W0 (error path) | ⬜ pending |
| 31-01-04 | 01 | 1 | TOOL-01 | unit | `bun test packages/cli/tests/deps-graph.test.ts --timeout=15000` | ❌ W0 (entry discovery) | ⬜ pending |
| 31-02-01 | 02 | 1 | D-07/D-08 | smoke | `bun run publint packages/photon && bun run publint packages/cli && bun run publint packages/core` | ❌ (photon fails) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/cli/tests/deps-graph.test.ts` — add DOT format test, error-path test, entry-discovery test (migrate to `mkdtemp` pattern)
- [ ] Fix `@gravito/photon` exports map — `types` must be first key in all export condition objects

*Existing infrastructure covers JSON format case. Wave 0 must extend coverage for the three missing behaviors.*

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
