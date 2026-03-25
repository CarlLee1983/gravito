# Phase 4A Discussion Log

**Date:** 2026-03-26
**Mode:** Standard Discussion
**Outcome:** Context captured for Phase 4A planning

---

## Discussion Summary

### Question 1: Remediation Strategy
**Gray Area:** How to address 43 remaining intermittent test failures from Phase 2C?

**Options Presented:**
1. Complete elimination of intermittent failures (target: 0 failures, 100% pass rate) — SELECTED
2. Reduce to acceptable threshold (< 20 failures, CI passes)
3. Current state lock, proceed to Phase 4B (Hono migration)

**User Selection:** Complete elimination
**Rationale:** Establish stable foundation before Hono Phase 4B migration

---

### Question 2: Repair Approaches
**Gray Area:** Which technical strategies to use for eliminating intermittent failures?

**Options Presented (multi-select):**
1. Test isolation improvements (beforeEach cleanup for JWT/CSRF context pollution) — SELECTED
2. Timeout calibration (adjust test timeout curves for CI variance) — SELECTED
3. Concurrency control (bun:test concurrent mode tuning) — SELECTED

**User Selection:** All three approaches (comprehensive)
**Rationale:** Address root causes comprehensively (isolation, timing, concurrency)

---

### Question 3: Execution Sequence
**Gray Area:** In what order to fix the three subsystems (JWT, CSRF, Photon)?

**Options Presented:**
1. Sequential (one subsystem at a time, lowest-to-highest complexity) — SELECTED
2. Exploratory (fix low-hanging fruit as found)
3. Parallel (each subsystem worked independently)

**User Selection:** Sequential execution
**Rationale:** Lower-risk fixes first; learnings inform higher-complexity fixes

---

## Decisions Captured

✓ **D-01:** Complete elimination of intermittent test failures (0 failures target)
✓ **D-02:** Use all three repair strategies (isolation + timeout + concurrency)
✓ **D-03:** Sequential execution (JWT → CSRF → Photon)
✓ **D-04:** Package scope defined (photon, core, signal, examples)
✓ **D-05:** Acceptance criteria clear (3+ consecutive CI runs without flakiness)

---

## Alternatives Considered (Not Selected)

- **Reduce-to-threshold approach** — User opted for complete elimination instead
- **Hono migration focus (Phase 4B)** — User chose to stabilize tests first
- **Parallel repairs** — User chose sequential for lower risk

---

## Notes for Planning

- Phase 2C established test patterns (beforeEach cleanup, timeout relaxation, environment guards) — reuse these
- Known limitations from Phase 2C (Orbit routing isolation, StaticLink env) — document and carry forward
- Health score remains ≥90/100 throughout repairs (no regression)
- No changes to test assertions; only isolation/timing/concurrency fixes

---

*Audit trail for Phase 4A context gathering*
*Decisions captured in 04-CONTEXT.md*
