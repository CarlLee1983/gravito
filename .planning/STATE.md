---
gsd_state_version: 1.0
milestone: v2.2.0
milestone_name: Framework Evolution
status: complete
stopped_at: Milestone archived
last_updated: "2026-03-31T14:00:00+08:00"
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 10
  completed_plans: 10
---

# STATE: Gravito-Core

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-31)

**Core value:** 穩定可靠的核心基礎設施
**Current focus:** v2.2.0 archived — ready for next milestone

---

## Current Position

Phase: Complete
Plan: Complete

## Accumulated Context

Cleared after v2.2.0 milestone completion. Key decisions archived in PROJECT.md.

### Persistent Constraints

- Bun API guard: all `Bun.xxx` calls must go through `getDefaultRuntimeAdapter()` or `getRuntimeKind() === 'bun'` guard inside `adapter-bun.ts`
- OpenAPI single source of truth: derive schemas from the same Zod object via `zodToJsonSchema` — never maintain separately

### Blockers

None.

---

## Session Continuity

Last session: 2026-03-31
Stopped at: v2.2.0 milestone archived
Resume file: .planning/PROJECT.md
Next action: /gsd:new-milestone
