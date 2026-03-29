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

## Cross-Milestone Trends

| Metric | v1.3.10 | v1.4.0 | v1.5.0 | v1.5.1 | v2.0.0 |
|--------|---------|--------|--------|--------|--------|
| Duration | 3 days | 4 hours | 1 day | 1 day | 2 days |
| Phases | 10 | 3 | 5 | 4 | 5 |
| Health Score | 78→93 | 93→100 | 100 | 100 | 100 |
| Test Pass Rate | 96.9→99.7% | 99.7% | 99.9% | 100% | 99.7%+ |
| Breaking Changes | 0 | 0 | 0 | 0 | Yes (major) |

**Velocity trend:** Accelerating. Each milestone scope is more ambitious yet execution time is stable or decreasing.
**Quality trend:** Health score reached 100 at v1.4.0 and maintained through v2.0.0 despite major breaking changes.

---
*Retrospective started: 2026-03-29*
