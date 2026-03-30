# Milestones

## v2.1.0 Core DX 改進 (Shipped: 2026-03-30)

**Phases completed:** 6 phases, 15 plans, 27 tasks

**Timeline:** 2 days (2026-03-29 → 2026-03-30), ~108 commits
**Scope:** 221 files changed, +11,527 / -1,797 LOC

**Delivered:** 提升 @gravito/core 開發者體驗 — 修正 API footgun、強化型別安全、收斂公開 API、同步文件與 CI lint 強化

**Key accomplishments:**

- Router stdout 清理 + ModelNotFoundException typed exception 取代 string sentinel 比對
- AuthException/AuthenticationException JSDoc 角色釐清（abstract base vs concrete 401）
- 6 star exports → 明確 named exports（46 symbols）；setApp 從公開 barrel 移除
- ApplicationConfig extends Pick<GravitoConfig> 消除欄位重複；boot() 正確傳遞 observabilityProvider
- ServiceMap interface + Container.make() overload — typed DI resolution 消除主路徑 any
- Biome noExplicitAny error + noConsole 規則；publint CI gate（57 packages）
- README EventManager/HookManager API 同步；orbit/register/use 決策指南；JSDoc 英文統一

**Tech debt (from audit):**

- index.browser.ts 未匯出 exceptions（likely intentional, undocumented）
- observabilityProvider 無法透過 Application class 路徑存取（需 PlanetCore.boot()）
- 7 個 lint violations 在 DOC-01/DOC-02 範圍外（useLiteralKeys ×4, noUselessCatch ×1, useImportType ×2）

**Archive:** [v2.1.0-ROADMAP.md](milestones/v2.1.0-ROADMAP.md) | [v2.1.0-REQUIREMENTS.md](milestones/v2.1.0-REQUIREMENTS.md) | [v2.1.0-MILESTONE-AUDIT.md](milestones/v2.1.0-MILESTONE-AUDIT.md)

---

## v2.0.0 Core & Orbit Resilience (Shipped: 2026-03-29)

**Phases completed:** 5 phases, 25 plans, 40 tasks
**Timeline:** 2 days (2026-03-28 → 2026-03-29), 157 commits
**Scope:** 523 files changed, +30,542 / -1,963 LOC

**Delivered:** 統一錯誤處理模型與韌性機制，讓 core 及全部 Orbit 包達到 production-ready 成熟度

**Key accomplishments:**

- GravitoException 三層錯誤階層（Infrastructure / Domain / System）+ Object.setPrototypeOf 跨 ESM/CJS instanceof 相容
- ErrorCodes 命名空間 + contract test scaffolding（assertGravitoException helper + 52 tests）
- withRetry + withResilience 組合 API（cockatiel 底層，指數退避 + jitter + 冪等性閘）
- CircuitBreaker 整合統一至 @gravito/resilience，echo 重複 CB 消除
- 四大 Orbit（atlas, plasma, photon, signal）全面遷移 + shutdown handler + 韌性原語
- 全部剩餘 ~40 Orbit 包批次遷移 — 300+ bare throws 替換為 namespaced GravitoException
- 健康檢查註冊完成，monitor 回報 per-Orbit healthy/degraded/unhealthy
- OrbitDegradationManager — CB open 時返回 typed DegradedResult<T>，test 環境直接拋出
- 38 packages major version bump + peerDependency 更新 + migration guide

**Tech debt (from audit):**

- atlas grammar layer ~122 bare throws 未遷移（query-builder 路徑，非 I/O）
- 19 packages dependencies 區塊 ^2.x.x 未更新（peerDeps 已正確）
- 4 packages 無 GravitoOrbit.install() 無法自行註冊 health check

**Archive:** [v2.0.0-ROADMAP.md](milestones/v2.0.0-ROADMAP.md) | [v2.0.0-REQUIREMENTS.md](milestones/v2.0.0-REQUIREMENTS.md) | [v2.0.0-MILESTONE-AUDIT.md](milestones/v2.0.0-MILESTONE-AUDIT.md)

---

## 1.4.0 Documentation Enhancement — JSDoc Coverage (Shipped: 2026-03-27)

**Phases completed:** 6 phases, 10 plans, 33 tasks

**Key accomplishments:**

- Full codebase health scan of 59-package monorepo: 96.9% tests passing, TypeScript clean, 0 circular deps, core/atlas healthy but photon/signal dist bundles need rebuild
- Patched Bun v1.3.10 bundler bug via post-build injection for photon and tsup migration for signal, restoring dist/index.js (20 exports) and dist/index.mjs+cjs (20 exports each)
- Time:
- Date Completed:
- Date Completed:
- One-liner:
- Date Completed:
- Time:
- Phase:
- Planning Date:
- Timeline:

---

## v1.3.10 Gravito-Core Framework Stabilization & Hono Migration (Shipped: 2026-03-26)

**Phases completed:** 12 phases, 28 plans, 58 tasks

**Key accomplishments:**

- Full codebase health scan of 59-package monorepo: 96.9% tests passing, TypeScript clean, 0 circular deps, core/atlas healthy but photon/signal dist bundles need rebuild
- Patched Bun v1.3.10 bundler bug via post-build injection for photon and tsup migration for signal, restoring dist/index.js (20 exports) and dist/index.mjs+cjs (20 exports each)
- Date Completed:
- Date Completed:
- One-liner:
- Date Completed:
- Phase:
- Planning Date:
- Baseline:
- Core Achievement:
- Plan:
- Findings:
- Zenith Hono dependency removed after confirming zero imports in source code (0/0 false positives)
- Planning Date:
- Status:
- Status:
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- Plan:
- Completed:
- Status:
- Task 1: Test Suite Baseline Verification
- Objective:
- Phase 5A Complete
- Execution Date:
- Phase:
- eval() usage:
- Execution Date:

---
