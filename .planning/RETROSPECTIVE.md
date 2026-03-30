# Retrospective

Living retrospective document. Updated at each milestone completion.

---

## Milestone: v2.0.0 — Core & Orbit Resilience

**Shipped:** 2026-03-29
**Phases:** 5 | **Plans:** 25 | **Commits:** 157
**Timeline:** 2 days (2026-03-28 to 2026-03-29)

### What Was Built

- GravitoException 三層錯誤階層 + ErrorCodes 命名空間覆蓋所有 Orbit 包
- withRetry + withResilience 組合 API（cockatiel 底層）
- CircuitBreaker 整合統一至 @gravito/resilience
- 四大 Orbit + ~40 剩餘包全面遷移，300+ bare throws 替換
- OrbitDegradationManager — typed DegradedResult<T> fallback
- 健康檢查註冊、shutdown handler、38 packages major bump + migration guide

### What Worked

- **Contract tests 先行** — 在遷移前建立 assertGravitoException helper，確保遷移過程零迴歸
- **批次遷移策略** — 先 4 大 Orbit 驗證模式，再分 5 批處理剩餘 ~40 包，高效且風險可控
- **cockatiel 選型** — 零依賴、ESM+CJS、Bun 相容，一次決策避免後續選型困擾
- **Phase 依賴鏈設計** — P16→P17→P18→P19→P20 嚴格順序，每階段建立在前一階段基礎上
- **速度** — 2 天完成 5 phases / 25 plans / 523 files，得益於清晰的需求定義和自動化

### What Was Inefficient

- **SUMMARY 一行摘要抽取** — gsd-tools 自動抽取品質不穩定，產出 "One-liner:" 空值，需手動清理
- **Phase 17 ROADMAP 標記不一致** — 17-03 在 ROADMAP 中標記 `[ ]` 但 SUMMARY 存在，造成混淆
- **dependencies vs peerDependencies 雙軌** — version bump 腳本只處理 peerDeps，遺漏 dependencies 區塊的 19 個包

### Patterns Established

- **Object.setPrototypeOf** — 所有 GravitoException 子類必須在構造函數中呼叫，確保跨 ESM/CJS instanceof
- **ErrorCodes as const** — 每個 Orbit 包定義 `XxxErrorCodes = { ... } as const`，dot-separated namespace
- **Contract test pattern** — `assertGravitoException(error, { code, status, instanceof })` 統一斷言
- **Standalone shutdown function** — 無 GravitoOrbit 的包使用 `registerXxxShutdown()` 獨立函數

### Key Lessons

1. **版本 bump 腳本需覆蓋 dependencies + peerDependencies** — 只處理一側會留下隱性 semver 衝突
2. **Grammar layer 的 bare throws 不應視為阻擋項** — query-builder 路徑是開發者錯誤，非 I/O 韌性範疇
3. **4 packages 無 GravitoOrbit.install()** — 設計限制，非 bug；未來考慮 static registration pattern

### Cost Observations

- Model mix: ~70% sonnet, ~20% haiku (workers), ~10% opus (planning)
- Sessions: ~6 sessions across 2 days
- Notable: 批次遷移（P19）佔最多 token，但並行 worker agents 有效降低延遲

---

## Milestone: v2.1.0 — Core DX 改進

**Shipped:** 2026-03-30
**Phases:** 6 | **Plans:** 15 | **Commits:** ~108
**Timeline:** 2 days (2026-03-29 to 2026-03-30)

### What Was Built

- Router stdout 清理 + ModelNotFoundException typed exception 取代 string sentinel
- AuthException/AuthenticationException JSDoc 角色釐清
- 6 star exports → 明確 named exports（46 symbols）；setApp 從公開 barrel 移除
- ApplicationConfig extends Pick<GravitoConfig>；boot() 正確傳遞 observabilityProvider
- ServiceMap interface + Container.make() overload — typed DI 消除主路徑 any
- Biome noExplicitAny error + noConsole；publint CI gate（57 packages）
- README API 同步、orbit/register/use 決策指南、JSDoc 英文統一

### What Worked

- **Audit-driven 需求定義** — 從 v2.0.0 shipped 的 codebase 直接 audit 產出 18 requirements，零遺漏
- **Phase 依賴順序正確** — FIX-05 先於 FIX-01（測試先修），Phase 23 star export 前掃描 module augmentation（14 orbit 包），避免靜默破壞
- **d.ts baseline diffing** — Phase 23 在轉換前後比較 .d.ts 輸出，確認零符號遺失
- **Gap closure 模式** — Phase 26 主計畫完成後，追加 26-05/06/07 三個 gap closure plans 掃除剩餘 lint violations
- **bun run typecheck 作為驗收閘** — 每個 phase 都跑 workspace-level typecheck（352 import sites across 38+ packages）

### What Was Inefficient

- **SUMMARY one_liner 抽取仍不穩定** — gsd-tools 產出空 "One-liner:" 佔位符，手動清理 MILESTONES.md
- **Phase 26 plan 數量過多** — 7 個 plans 中有 3 個是 gap closure，若初始掃描更徹底可減少迭代
- **Nyquist compliance 低** — 只有 1/6 phase 完全合規，4 partial，1 missing；VALIDATION.md 維護成本未回收

### Patterns Established

- **publint CI gate** — 所有 57 packages 在 build 後驗證 exports map，防止漂移
- **ServiceMap interface for DI** — 使用 interface（非 type）啟用 declaration merging，下游包可擴展 typed resolution
- **Biome override scoping** — noExplicitAny/noConsole 限定 packages/core/src/ scope，不影響 test files 和其他包

### Key Lessons

1. **Star export 轉換需先掃描 module augmentation** — 14 個 orbit 包用 `declare module '@gravito/core'` 增強型別，貿然移除 star export 會靜默破壞 downstream
2. **Gap closure plans 應預期** — Lint enforcement 升級必然發現超出預期的 violations，預留 2-3 個 gap plans 是合理的
3. **Nyquist validation 投資報酬待評估** — 若不打算維護 VALIDATION.md 文件，不如省略以降低流程開銷

### Cost Observations

- Model mix: ~80% sonnet (execution), ~15% haiku (research/workers), ~5% opus (audit/planning)
- Sessions: ~4 sessions across 2 days
- Notable: Phase 26 佔最多 session 時間（7 plans），但均為低複雜度 lint fixes

---

## Cross-Milestone Trends

| Metric | v1.3.10 | v1.4.0 | v1.5.0 | v1.5.1 | v2.0.0 | v2.1.0 |
|--------|---------|--------|--------|--------|--------|--------|
| Duration | 3 days | 4 hours | 1 day | 1 day | 2 days | 2 days |
| Phases | 10 | 3 | 5 | 4 | 5 | 6 |
| Health Score | 78→93 | 93→100 | 100 | 100 | 100 | 100 |
| Test Pass Rate | 96.9→99.7% | 99.7% | 99.9% | 100% | 99.7%+ | 99.7%+ |
| Breaking Changes | 0 | 0 | 0 | 0 | Yes (major) | 0 |

**Velocity trend:** Stable. v2.1.0 (6 phases, 15 plans) completed in same 2-day window as v2.0.0 (5 phases, 25 plans), though v2.1.0 plans were smaller in scope.
**Quality trend:** Health score maintained at 100. v2.1.0 added lint enforcement (noExplicitAny error + noConsole) as quality ratchet — future regressions blocked at CI.
**Process trend:** Gap closure pattern emerging — Phase 26 needed 3 extra plans. Consider frontloading lint scans in initial phase planning.

---
*Retrospective started: 2026-03-29*
*Last updated: 2026-03-30 after v2.1.0*
