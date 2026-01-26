# Phase 0: 基準線與回歸清單

**目的：** 在所有優化前先建立可信的效能與行為基準，避免「改善看似成立」但實際行為退化或數據不可比。

**Estimated Time:** 1-2 天（集中準備）

**狀態：** ✅ **已完成** (100%)

---

## 0.1 建立效能基準線

### 實作步驟

1. 建立 baseline benchmark 報告（固定資料量、固定測試環境）
2. 將 baseline 與之後優化版報告做差異比較（diff）
3. 記錄機器規格與 bun 版本，避免數據漂移

### 建議輸出

- ✅ `tests/performance/baseline-2026-01-17.md` - 已建立
- ✅ `tests/performance/baseline-2026-01-17.json` - 已建立

### 基準測試項目

- Model.hydrate() × 1000 records
- Model.save() × 100 records
- DirtyTracker operations × 10000
- Complex query compilation × 1000
- QueryBuilder.clone() × 1000
- paginate() × 100
- Eager load 100 users with posts
- Query compilation with cache

---

## 0.2 建立回歸測試清單

### 最小回歸清單建議

- ✅ CRUD 基礎行為（create/update/delete）
- ✅ eager loading + pagination 行為（含 nested 關聯）
- ✅ casting 行為與 dirty tracking 行為
- ✅ QueryBuilder 之 where/order/limit/offset 行為
- ✅ transaction (含 nested transaction)

### 成功標準

- ✅ baseline 測試可重現
- ✅ 核心行為回歸測試通過

---

## 下一步

完成 Phase 0 後，繼續進行 [Phase 1: Critical DX Fixes](../03-phase-1-dx/README.md)。
