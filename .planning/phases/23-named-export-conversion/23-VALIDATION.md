---
phase: 23
slug: named-export-conversion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | packages/core/bunfig.toml |
| **Quick run command** | `cd packages/core && bun test` |
| **Full suite command** | `bun run typecheck && cd packages/core && bun test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/core && bun test`
- **After every plan wave:** Run `bun run typecheck && cd packages/core && bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 0 | MOD-01 | snapshot | `tsc --declaration --emitDeclarationOnly` baseline capture | N/A | ⬜ pending |
| 23-02-01 | 02 | 1 | MOD-01 | diff | `diff` before/after d.ts output | N/A | ⬜ pending |
| 23-02-02 | 02 | 1 | MOD-02 | grep | `grep -c "setApp" packages/core/src/index.ts` returns 0 | ✅ | ⬜ pending |
| 23-02-03 | 02 | 1 | MOD-03 | grep | `grep "export \*" packages/core/src/index.browser.ts` — only events/runtime remain | ✅ | ⬜ pending |
| 23-03-01 | 03 | 2 | MOD-01 | typecheck | `bun run typecheck` exits 0 | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Capture baseline d.ts output via `tsc --declaration --emitDeclarationOnly --outDir /tmp/core-dts-before`
- [ ] Extract sorted symbol list from baseline for diff comparison

*Existing test infrastructure covers all runtime verification requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | — | — |

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