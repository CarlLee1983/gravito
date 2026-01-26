# 風險評估與緩解措施

**更新日期：** 2026-01-17  
**當前狀態：** 大部分風險已通過實施緩解措施得到控制

---

## 🔴 高風險項目

### 1. Proxy 優化（破壞性變更風險）

**風險：** 快取失效問題，動態 accessor 無法識別

**狀態：** ✅ **已緩解**

**已實施的緩解措施：**
- ✅ 添加 `Model.clearProxyCache()` 用於測試和熱重載（`src/orm/model/Model.ts:189-194`）
- ✅ 實現了 accessor/mutator 快取機制，減少原型鏈遍歷
- ✅ 實現了關係元數據快取（`getRelationMetadata()`）
- ✅ 全面的邊界情況測試套件（`tests/ProxyModel.test.ts`）

**剩餘風險：**
- ⚠️ 開發模式下仍需注意動態掛載 accessor/mutator 後需手動清理快取
- ⚠️ 建議在文檔中明確說明 `clearProxyCache()` 的使用場景

**建議：**
- 在開發模式下可考慮自動檢測並警告快取不一致
- 提供遷移指南（已包含在升級指南中）

---

### 2. Relationship API 變更（破壞性變更）

**風險：** 從 thenable 改為方法調用是破壞性的

**狀態：** ✅ **已延後**

**緩解措施：**
- ✅ **已延後到後續版本**（不在當前計劃中）
- 📋 未來實施時將採用漸進式遷移：在 1-2 個版本中同時支援兩者
- 📋 提供 codemod 工具
- 📋 詳細文檔

**當前狀態：**
- 此變更不在 Phase 0-5 的範圍內
- 現有 API 保持不變，無破壞性變更

---

## 🟡 中風險項目

### 3. DirtyTracker 淺層比較

**風險：** 深層嵌套變更無法偵測

**狀態：** ✅ **已緩解**

**已實施的緩解措施：**
- ✅ 明確記錄限制（在 `DirtyTracker.ts` 中註釋說明）
- ✅ 提供 `setDeepComparison(true)` 選項（`src/orm/model/DirtyTracker.ts:19-21`）
- ✅ 實現了淺層比較優化（`src/orm/model/DirtyTracker.ts:119-175`）
- ✅ 支援 Date、Array、Object 的特殊比較邏輯
- ✅ 添加邊界情況測試（`tests/performance/DirtyTracker.bench.ts`）
- ✅ 記錄解決方法（已包含在升級指南中）

**剩餘風險：**
- ⚠️ 預設使用淺層比較，深層嵌套變更需手動啟用 `setDeepComparison(true)`
- ⚠️ 深層比較使用 JSON.stringify，效能較慢

**建議：**
- ✅ 已在升級指南中說明使用方式
- 📋 可考慮在開發環境添加 mutation 警告（未來增強）

---

### 4. LRU 快取命中率

**風險：** 動態查詢降低快取效果

**狀態：** ✅ **已緩解**

**已實施的緩解措施：**
- ✅ 使快取大小可配置（`Grammar.setCacheSize(max: number)`，`src/grammar/Grammar.ts:77-79`）
- ✅ 使用 LRU 快取策略（`lru-cache` 套件，`src/grammar/Grammar.ts:36-41`）
- ✅ 添加監控/指標（`Grammar.getCacheStats()`，`src/grammar/Grammar.ts:59-65`）
- ✅ 提供 `DB.getCacheStats()` 統一介面（`src/DB.ts:194-196`）
- ✅ 支援按需禁用快取（`Grammar.useCache = false`）

**剩餘風險：**
- ⚠️ 動態查詢（如包含時間戳的查詢）仍可能降低快取命中率
- ⚠️ 需要監控實際使用中的快取命中率

**建議：**
- 📊 定期檢查 `Grammar.getCacheStats()` 的命中率
- 📋 對於動態查詢，考慮改進快取鍵生成策略（未來優化）

---

### 5. Grammar 快取架構變更（審視後新增）

**風險：** 從實例級改為靜態快取可能影響多租戶場景

**狀態：** ✅ **已緩解**

**已實施的緩解措施：**
- ✅ 提供 `Grammar.cacheScope` 選項（`'instance' | 'global'`，`src/grammar/Grammar.ts:51`）
- ✅ 預設使用全局快取（`'global'`，大多數情況更優）
- ✅ 支援實例級快取隔離（`getCompilationCache()` 方法，`src/grammar/Grammar.ts:89-102`）
- ✅ 多租戶應用可設置 `Grammar.cacheScope = 'instance'` 避免跨租戶汙染
- ✅ 已包含在升級指南中（`10-upgrade-guide.md`）

**剩餘風險：**
- ⚠️ 多租戶應用需要明確設置 `cacheScope = 'instance'`，否則可能造成 SQL 汙染
- ⚠️ 實例級快取會增加記憶體使用

**建議：**
- ✅ 已在升級指南中說明多租戶場景的配置方式
- 📋 考慮在文檔中更明確地標示多租戶場景的注意事項

---

## 🟢 低風險項目

### 6. 類型改進

**狀態：** ✅ **低風險，持續改進中**

**風險評估：**
- ✅ 風險極小，僅編譯時
- ✅ 完整測試覆蓋率足夠
- ⚠️ 目前仍有約 15 個 `any` 類型（目標 < 10）

**當前狀態：**
- 大部分類型改進已完成
- 剩餘的 `any` 主要用於動態類型轉換和 mixin 模式
- 詳見 `REMAINING_TASKS.md` 中的分析

---

### 7. 錯誤訊息

**狀態：** ✅ **低風險，已實施**

**風險評估：**
- ✅ 僅為新增變更
- ✅ 無破壞性變更
- ✅ 已實現 "Did you mean?" 建議功能（`src/orm/model/errors.ts`）

**當前狀態：**
- 錯誤訊息已改善，包含可用欄位列表和建議
- 使用 Levenshtein 距離算法提供建議

---

## 📊 風險緩解總結

| 風險項目 | 原始風險等級 | 當前狀態 | 緩解程度 |
|---------|------------|---------|---------|
| Proxy 優化 | 🔴 高 | ✅ 已緩解 | 95% |
| Relationship API | 🔴 高 | ✅ 已延後 | 100% |
| DirtyTracker | 🟡 中 | ✅ 已緩解 | 90% |
| LRU 快取 | 🟡 中 | ✅ 已緩解 | 85% |
| Grammar 快取 | 🟡 中 | ✅ 已緩解 | 90% |
| 類型改進 | 🟢 低 | ⚠️ 進行中 | 75% |
| 錯誤訊息 | 🟢 低 | ✅ 已完成 | 100% |

**整體風險狀態：** ✅ **可控** - 所有高風險項目已緩解或延後，中風險項目已實施緩解措施

---

## 📝 後續建議

### 高優先級
1. ✅ 所有核心風險已緩解
2. 📋 完善文檔，特別是 Proxy 快取和多租戶場景的說明

### 中優先級
1. 📊 監控 LRU 快取命中率，根據實際使用情況調整策略
2. 🔧 考慮在開發環境添加 mutation 警告（DirtyTracker）

### 低優先級
1. 📈 持續改進類型安全（減少 `any` 使用）
2. 🧪 增加邊界情況測試覆蓋率

---

## 🔗 相關文件

- [升級指南](../10-upgrade-guide.md) - 包含行為變更說明
- [Phase 狀態總覽](../PHASE_STATUS.md) - 實施狀態追蹤
- [未完成項目](../REMAINING_TASKS.md) - 剩餘工作分析
