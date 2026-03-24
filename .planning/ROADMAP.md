# Roadmap: Gravito-Core 健全性驗證

**Project:** Gravito-Core 健全性驗證 (Phase 1: 快速掃描)
**Core Value:** 確保 gravito-core 框架的核心穩定性
**Created:** 2026-03-24
**Status:** Active

## Overview

驗證 gravito-core 60 個包的健全性。快速掃描建立基線，為後續決策（Hono Phase 4-5、修復優先級）奠定基礎。

```
[Phase 1: 快速掃描] → [Phase 2: 結果評估] → [Decision Point]
                                            ├─→ Fix Critical
                                            ├─→ Hono Phase 4-5
                                            └─→ Full Audit
```

---

## Phase 1: 快速掃描驗證 (1-2 days)

驗證 60 個包的基本健全性，識別阻擋性問題。

### Goals

- ✓ 執行完整測試套件，0 failures
- ✓ TypeScript 類型檢查通過
- ✓ 驗證核心模組可用
- ✓ 生成驗證報告

### Deliverables

- `HEALTH_CHECK_REPORT.md` — 驗證結果詳細報告
- `ISSUES_PRIORITIZED.md` — 問題清單（Critical、High、Medium）
- `NEXT_STEPS.md` — 建議的後續行動

### Success Criteria

- [ ] 所有 60 個包 `bun test` 通過
- [ ] `bun run typecheck` 0 errors（或明確記錄已知抑制）
- [ ] 無新循環依賴
- [ ] 4 個關鍵模組可初始化
- [ ] 2 個 E2E 路徑可執行
- [ ] 報告已生成並評估

### Requirements Covered

TEST-01, TEST-02, TEST-03, TYPE-01, TYPE-02, TYPE-03, DEPS-01, DEPS-02, DEPS-03, CORE-01, CORE-02, CORE-03, CORE-04, E2E-01, E2E-02, REPORT-01, REPORT-02, REPORT-03

### Milestones

1. **掃描準備** (30 min)
   - 建立驗證腳本
   - 準備測試環境

2. **執行掃描** (1-2 hours)
   - 執行 `bun test` — 記錄結果
   - 執行 `bun run typecheck` — 記錄錯誤/抑制
   - 驗證依賴圖
   - 測試關鍵模組

3. **E2E 驗證** (1 hour)
   - 驗證框架初始化流程
   - 驗證基本 HTTP + DB 流程

4. **報告生成** (1-2 hours)
   - 收集所有結果
   - 分析問題
   - 優先級排序
   - 寫出建議

### Owner

待分配（通常為 executor agent）

### Blockers

無已知阻擋項。所有依賴（codebase map、工具）已就位。

### Notes

- 快速掃描不包括完整性能、文檔或安全審計
- 現有 Hono Phase 2-3 工作已完成，不在此驗證範圍
- 衛星模組（RBAC、Catalog、Commerce）在後續階段驗證

---

## Phase 2: 結果評估 & 決策 (1 day)

根據 Phase 1 報告，評估結果並決策後續行動。

### Goals

- 理解驗證結果的影響
- 優先排序發現的問題
- 明確後續路徑

### Decision Points

**如果所有檢查通過 ✅:**
- ✓ 框架穩定
- → Proceed with Hono Phase 4-5 遷移規劃
- → 衛星驗證（RBAC、Catalog、Commerce）

**如果有 Critical 問題 🔴:**
- ✗ 需要修復才能進行遷移
- → Phase 3: Fix Critical Issues
- → 修復後重新驗證

**如果有 High 問題 🟡:**
- ⚠️ 理想情況下應修復
- → 與 Hono 遷移平行執行修復
- → 或優先修復後再遷移（視業務優先級）

### Deliverables

- `DECISION_SUMMARY.md` — 決策與推理
- 更新的 `PROJECT.md` — 反映驗證結果
- 後續行動計畫

### Success Criteria

- [ ] 評估完成
- [ ] 決策已記錄
- [ ] 下一個 Phase 明確

---

## Future Phases (Post-Decision)

根據 Phase 2 結果，可能的路徑：

### Phase 3: Fix Critical Issues (If Needed)

修復 Critical 優先級的問題。

### Phase 4: Hono Migration Phase 4-5

執行 Hono 依賴移除的後續階段（如果基線通過）。

### Phase 5: Satellite Verification (Optional)

完整驗證衛星模組（RBAC、Catalog、Commerce）。

### Phase 6: Full Audit (Optional)

完整的性能、文檔、安全審計（如果資源允許）。

---

## Timeline

| Phase | Duration | Start | Status |
|-------|----------|-------|--------|
| 1. 快速掃描 | 1-2 days | 2026-03-24 | Pending |
| 2. 結果評估 | 1 day | TBD | Pending |
| 3+. 後續 | TBD | TBD | Pending |

---

## Key Metrics

驗證工作的成功指標：

| 指標 | 目標 | 基線 |
|------|------|------|
| 測試通過率 | 100% | TBD |
| 類型檢查錯誤 | 0 | TBD |
| 循環依賴 | 0 新增 | TBD |
| E2E 路徑可用 | 100% (2/2) | TBD |

---

## Dependencies & Assumptions

**已完成：**
- ✓ 代碼庫映射（CODEBASE MAP）
- ✓ 項目上下文（PROJECT.md）
- ✓ 需求定義（REQUIREMENTS.md）

**假設：**
- Bun、npm、Git 已安裝並可用
- 當前環境可執行測試和編譯
- 無環境變數或密鑰問題

**風險：**
- 如果發現大量問題，Phase 1 可能超時
- 環境問題可能阻擋執行

---

**Last updated:** 2026-03-24 after project initialization
**Next review:** After Phase 1 completion
