---
gsd_state_version: 1.0
milestone: v2.2.0
milestone_name: Framework Evolution
status: unknown
stopped_at: Completed 27-02-PLAN.md (NativeHasher sha512/blake2b + resetPasswordAdapter + integration tests)
last_updated: "2026-03-30T08:48:19.652Z"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 3
  completed_plans: 2
---

# STATE: Gravito-Core

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** 穩定可靠的核心基礎設施
**Current focus:** Phase 27 — bun-native-foundation

---

## Current Position

Phase: 27 (bun-native-foundation) — EXECUTING
Plan: 3 of 3

## Accumulated Context

### Key Decisions

| Decision | Rationale | Made |
|----------|-----------|------|
| v2.2.0 minor version | 所有改進為 additive（非 breaking），保持向下相容 | 2026-03-30 |
| 4 大改進維度 | 基於 BI 選型對比 ElysiaJS / Bun 原生的洞察 | 2026-03-30 |
| Leaf-node-first phase order | NativeOrbitDetector 建立後，後續階段才能安全呼叫 Bun API | 2026-03-30 |
| Fast-path security test in Phase 28 | CVE-2025-29927 類型漏洞 — 保護測試必須與旁路機制同一 phase | 2026-03-30 |
| DX-01 before DX-02 | Schema registry metadata (DX-01) 是 OpenAPI generation (DX-02) 的先決條件 | 2026-03-30 |
| TOOL-01 last (Phase 31) | 獨立功能，待所有 Phase 27-30 新 symbols 穩定後再確認 exports | 2026-03-30 |
| All Bun API via adapter-bun.ts only | 直接呼叫 Bun.xxx 在 adapter 外會造成 Node CI ReferenceError | 2026-03-30 |
| globalThis narrowing for NativeOrbitDetector | No bare Bun.xxx — all access via (globalThis as { Bun?: BunGlobal }).Bun | 2026-03-30 |
| Object.freeze() on NativeFeatures | Deep immutability guarantee for cached capability snapshot | 2026-03-30 |
| blake2b falls back to SHA-256 with warning | node:crypto BLAKE2b not universally available; SHA-256 is correct fallback | 2026-03-30 |

### Critical Constraints (from research)

- Fast-path auth bypass: integration test asserting 401 on protected fast-path route WITHOUT credentials is **non-negotiable** and must land in Phase 28
- `serveConfig()` snapshot: `Bun.serve routes:{}` is read once at startup — calling `use()` after snapshot must emit `FAST_PATH_MIDDLEWARE_DRIFT` in dev mode
- Bun API guard: all `Bun.xxx` calls must go through `getDefaultRuntimeAdapter()` or `getRuntimeKind() === 'bun'` guard inside `adapter-bun.ts`
- OpenAPI single source of truth: derive `AstralResource` body/response schemas from the same Zod object via `zodToJsonSchema` — never maintain separately

### Research Flags

- **Phase 30 needs research spike:** validate `ts-json-schema-generator` programmatic API (`createGenerator({ path: 'packages/*/src/contracts/**/*.ts' })`) against a real Satellite contract file in Turbo monorepo before full implementation. Fallback: `@asteasolutions/zod-to-openapi`.
- **Phase 31 pre-work:** run `cat package.json | grep madge` before planning — verify madge installation status.
- **Phase 29 audit:** check whether `PlanetCore.boot()` already handles plain `GravitoOrbit` objects — may reduce Phase 29 scope.

### Blockers

None.

### Architectural Notes

- v2.0.0 GravitoException 體系不受影響
- v2.1.0 typed DI 為 Fast-Path 和 Lite Satellite 提供基礎
- 靈感來源：ElysiaJS 類型系統 + Bun 原生 API
- New component footprint: ~210 LOC across 4 new files (FastPathRegistry, InlineOrbit, NativeOrbitDetector, SatelliteContractExtractor) + 6 modified files

---

## Session Continuity

Last session: 2026-03-30T08:48:19.650Z
Stopped at: Completed 27-02-PLAN.md (NativeHasher sha512/blake2b + resetPasswordAdapter + integration tests)
Resume file: None
Next action: Execute 27-02-PLAN.md
