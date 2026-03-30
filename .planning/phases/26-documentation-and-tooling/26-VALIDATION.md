---
phase: 26
slug: documentation-and-tooling
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun test (built-in) + Biome lint |
| **Config file** | `biome.json` (lint), `turbo.json` (pipeline) |
| **Quick run command** | `cd packages/core && bun test` |
| **Full suite command** | `bun run typecheck && bun run check && bun test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/core && bun test`
- **After every plan wave:** Run `bun run typecheck && bun run check && bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | DOC-01 | lint | `bunx biome lint packages/core/src/types.ts` | ✅ | ⬜ pending |
| 26-01-02 | 01 | 1 | DOC-02 | lint | `bunx biome lint packages/core/src/` | ✅ | ⬜ pending |
| 26-02-01 | 02 | 1 | DOC-03 | build | `bunx publint packages/core` | ❌ W0 | ⬜ pending |
| 26-03-01 | 03 | 2 | DOC-04 | grep | `grep -c 'setRetryScheduler\|emit\|\.on(' packages/core/README.md` | ✅ | ⬜ pending |
| 26-03-02 | 03 | 2 | DOC-05 | grep | `grep 'setRetryScheduler' packages/core/README.md` | ✅ | ⬜ pending |
| 26-03-03 | 03 | 2 | DOC-06 | grep | `grep 'orbit.*register.*use' packages/core/README.md` | ✅ | ⬜ pending |
| 26-04-01 | 04 | 2 | DOC-07 | grep | `grep -Pn '/\*\*[\s\S]*?[\x{4e00}-\x{9fff}]' packages/core/src/*.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `publint` installed as devDependency — needed for DOC-03 validation
- [ ] `turbo.json` publint task added — needed for CI gate validation

*Existing Biome and test infrastructure covers DOC-01, DOC-02, DOC-04–DOC-07.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| orbit/register/use guide readability | DOC-06 | Subjective quality | Read decision guide section; verify examples are concrete and cover all 3 methods |

*All other behaviors have automated verification via lint rules, grep, or build commands.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
