---
gsd_state_version: 1.0
milestone: v2.1.0
milestone_name: Core DX 改進
status: complete
stopped_at: Milestone v2.1.0 archived
last_updated: "2026-03-30T15:15:00.000Z"
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 15
  completed_plans: 15
---

# STATE: Gravito-Core

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** 穩定可靠的核心基礎設施
**Current focus:** Planning next milestone

---

## Current Position

Milestone: v2.1.0 ✅ COMPLETE (shipped 2026-03-30)
Next: `/gsd:new-milestone` to start next milestone

## Accumulated Context

### Key Decisions

| Decision | Rationale | Made |
|----------|-----------|------|
| v2.1.0 minor version | DX 改進不需 breaking changes，保持向下相容 | 2026-03-29 |
| 聚焦 @gravito/core 包 | core 是所有下游包的基礎，DX 改善影響最大 | 2026-03-29 |
| star export → named export | 明確 API surface 可審計、可控制 | 2026-03-29 |
| ServiceMap type→interface | 啟用 declaration merging，下游可擴展 | 2026-03-30 |
| publint CI gate | 防止 exports map 漂移 | 2026-03-30 |

### Blockers

None.

### Architectural Notes

- v2.0.0 GravitoException 體系不受影響
- v2.1.0 所有修改限於 packages/core/ 範圍
- publint CI gate 覆蓋全部 57 packages

---

## Session Continuity

Last session: 2026-03-30
Stopped at: Milestone v2.1.0 archived
Resume file: None

### To start next milestone:

1. Run: `/gsd:new-milestone`
