# Gravito-Core Framework

## What This Is

Gravito 是一個模組化、高效能的 TypeScript 框架，基於 Galaxy Architecture 建構。包含 PlanetCore 微核心、50+ Orbit 基礎設施包、15 個 Satellite 業務領域外掛。目標是為 Bun runtime 上的 TypeScript 應用提供 production-ready 的全棧解決方案。

## Core Value

**穩定可靠的核心基礎設施** — core 及所有 Orbit 包必須具備 production-ready 的錯誤處理、韌性機制和一致的 API 行為，讓下游 Satellite 和應用能安心依賴。

## Current Milestone: v2.2.0 Framework Evolution — 效能旁路與開發敏捷性

**Goal:** 基於 BI 選型對比（ElysiaJS / Bun 原生）的洞察，強化 Gravito 在極致效能、開發體驗、模組輕量化與 Bun-Native 整合四大維度。

**Target features:**
- Fast-Path 旁路機制：PhotonOrbit 高頻路由跳過 DI/Lifecycle，直連 Bun.serve Handler
- Native Orbit Detection：Sentinel 等 Orbit 自動切換至 Bun.password / Bun.crypto
- Static Contract Generation：從 Satellite 介面定義自動生成 OpenAPI 規格
- Lite Satellite / Inline Plugin：gravito.config.ts 中定義輕量匿名衛星
- 依賴樹視覺化：模組耦合關係圖形化輸出
- Bun-Native 抽象層：core 內建 Bun 原生 API 適配（fs, crypto, test）

## Requirements

### Validated

- ✓ **Framework Health Stabilization** (v1.3.10) — Health score 78→93, test failures 162→41, Hono fully removed
- ✓ **JSDoc Coverage** (v1.4.0) — Core 100%, Signal 100%, quality 98.8/100
- ✓ **Hono Dependency Removal** (v1.5.0) — JWT native, type system unified, 3000+ tests passing
- ✓ **Satellite Verification** (v1.5.1) — RBAC/Catalog/Commerce all 100% pass, integration verified
- ✓ **統一錯誤模型** (v2.0.0) — GravitoException 三層階層 + ErrorCodes + contract tests
- ✓ **Graceful Degradation** (v2.0.0) — OrbitDegradationManager + DegradedResult<T> typed fallback
- ✓ **Retry + Circuit Breaker** (v2.0.0) — withRetry + withResilience + cockatiel CB
- ✓ **全量 Orbit 包改造** (v2.0.0) — 38 packages 遷移至 GravitoException
- ✓ **API Footgun 修正** (v2.1.0) — Router console.log, ModelNotFoundException, boot() observabilityProvider, @deprecated services
- ✓ **Exception 層級釐清** (v2.1.0) — AuthException/AuthenticationException JSDoc 角色定義
- ✓ **模組組織清理** (v2.1.0) — star export 收斂, setApp 移除, index.browser.ts 同步
- ✓ **型別安全強化** (v2.1.0) — ApplicationConfig Pick<>, Container.make() ServiceMap overload
- ✓ **文件與工具** (v2.1.0) — noExplicitAny error, noConsole, publint CI gate, README sync, decision guide, JSDoc English

### Active

(Defining in v2.2.0 milestone — see REQUIREMENTS.md)

### Out of Scope

- 性能優化 — 留給後續 milestone（v1.5.2 optimization roadmap 已規劃）
- Obsidian 文檔庫 — 文檔工作暫緩，優先處理核心穩定性
- Satellite 業務邏輯改造 — 本次僅改造 Orbit 層，Satellite 層後續跟進
- UI/前端改造 — 不涉及前端包
- Container 完整 generic 重構 — 影響 50+ 包所有 constructor，留給 v2.2
- GravitoVariables 型別改善 — 14 包 module augmentation 風險太高

## Context

**Brownfield 環境：** gravito-core 已運作多年，66 個核心包 + 15 個衛星模組。

**當前狀態（v2.1.0 shipped）：**
- Framework health: 100/100
- Test pass rate: 99.7%+, 3000+ tests
- TypeScript strict mode, 0 errors
- 統一錯誤模型全面部署 — GravitoException 三層階層覆蓋所有 Orbit 包
- @gravito/resilience 提供 withRetry + withResilience + CircuitBreaker 組合 API
- @gravito/core 公開 API 全部為 named exports，zero star re-export
- Container.make() 支援 ServiceMap declaration merging — typed DI
- Biome noExplicitAny (error) + noConsole 強制執行
- publint CI gate 驗證 57 packages exports map
- 38 packages 已 major version bump（core 3.0.0, photon 2.0.0 等）

**Known tech debt：**
- atlas grammar layer ~122 bare throws 未遷移（query-builder 路徑，非 I/O）
- 19 packages dependencies 區塊版本號未更新（peerDeps 已正確）
- 4 packages 無 GravitoOrbit.install() 無法自行註冊 health check
- index.browser.ts 未匯出 exceptions（likely intentional, undocumented）
- 7 個 lint violations 在 core 外（useLiteralKeys ×4, noUselessCatch ×1, useImportType ×2）

## Constraints

- **TypeScript Strict**：維持 noUnusedLocals/Parameters，零 as any
- **測試覆蓋**：80%+ 測試覆蓋率
- **Satellite 隔離**：不直接修改 Satellite，Satellite 透過事件機制自然受益
- **Runtime**：Bun 為主要目標 runtime
- **Error Model**：所有新 Orbit 代碼必須使用 GravitoException 階層（v2.0.0 established）
- **Lint Enforcement**：noExplicitAny error + noConsole for packages/core/src/

## Key Decisions

| 決策 | 理由 | 結果 |
|------|------|------|
| v2.0.0 major version | 錯誤模型重新設計需要 breaking changes | ✓ Good — 明確標示不相容 |
| 全量 Orbit 包改造 | 局部改造會導致不一致，全量確保品質統一 | ✓ Good — 38 packages 統一 |
| 錯誤處理為最高優先 | Production 穩定性是下游所有功能的基礎 | ✓ Good — 基礎穩固 |
| cockatiel 為唯一新依賴 | Zero deps, ESM+CJS, MIT, Bun-compatible | ✓ Good — 穩定可靠 |
| v2.1.0 minor version | DX 改進不需 breaking changes，保持向下相容 | ✓ Good — 零迴歸 |
| 聚焦 @gravito/core 包 | core 是所有下游包的基礎，DX 改善影響最大 | ✓ Good — 18/18 requirements met |
| star export → named export | 明確 API surface 可審計、可控制 | ✓ Good — 46 symbols explicit |
| ServiceMap type→interface | 啟用 declaration merging，下游可擴展 | ✓ Good — typed DI 無 any |
| publint CI gate | 防止 exports map 漂移，57 packages 驗證 | ✓ Good — 預防性品質守衛 |
| atlas grammar bare throws 列為 tech debt | query-builder 路徑非 I/O，不影響韌性 | ⚠️ Revisit — 後續 milestone |

---

<details>
<summary>Milestone: v2.1.0 Core DX 改進 (COMPLETE)</summary>

**Status:** ✅ **COMPLETE** — 2026-03-30
**Duration:** 2 days (2026-03-29 → 2026-03-30)
**Phases:** 6 (Phase 21-26), 15 plans, ~108 commits
**Scope:** 221 files changed, +11,527 / -1,797 LOC

### Achievements

- Router stdout 清理 + ModelNotFoundException typed exception
- AuthException/AuthenticationException JSDoc 角色釐清
- 6 star exports → named exports；setApp 移除
- ApplicationConfig extends Pick<GravitoConfig>；boot() observabilityProvider 傳遞
- ServiceMap interface + Container.make() overload — typed DI
- Biome noExplicitAny error + noConsole + publint CI gate
- README API 同步、orbit/register/use 決策指南、JSDoc 英文統一

### Archive

- [v2.1.0-ROADMAP.md](milestones/v2.1.0-ROADMAP.md)
- [v2.1.0-REQUIREMENTS.md](milestones/v2.1.0-REQUIREMENTS.md)
- [v2.1.0-MILESTONE-AUDIT.md](milestones/v2.1.0-MILESTONE-AUDIT.md)

</details>

<details>
<summary>Milestone: v2.0.0 Core & Orbit Resilience (COMPLETE)</summary>

**Status:** ✅ **COMPLETE** — 2026-03-29
**Duration:** 2 days (2026-03-28 → 2026-03-29)
**Phases:** 5 (Phase 16-20), 25 plans, 157 commits
**Scope:** 523 files changed, +30,542 / -1,963 LOC

### Achievements

- GravitoException 三層錯誤階層 + ErrorCodes 命名空間 + contract tests
- withRetry + withResilience 組合 API（cockatiel 底層）
- 四大 Orbit + ~40 剩餘 Orbit 全面遷移
- OrbitDegradationManager — typed DegradedResult<T> fallback
- 38 packages major version bump + migration guide

### Archive

- [v2.0.0-ROADMAP.md](milestones/v2.0.0-ROADMAP.md)
- [v2.0.0-REQUIREMENTS.md](milestones/v2.0.0-REQUIREMENTS.md)
- [v2.0.0-MILESTONE-AUDIT.md](milestones/v2.0.0-MILESTONE-AUDIT.md)

</details>

<details>
<summary>Earlier Milestones (v1.3.10 — v1.5.1)</summary>

- **v1.3.10** — Framework Stabilization & Hono Migration (2026-03-26)
- **v1.4.0** — JSDoc Coverage Enhancement (2026-03-27)
- **v1.5.0** — Hono Dependency Removal (2026-03-27)
- **v1.5.1** — Satellite Verification (2026-03-27)

</details>

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 after v2.2.0 milestone started*
