# Phase 0: 基準測試與分析

> **依賴**: 無  
> **優先級**: 🔴 高（必須先完成）  
> **預估時間**: 2-3 天

[← 返回總覽](../README.md)

---

## 目標

建立可量化的性能基準，用於驗證優化效果，並**確認真正的性能瓶頸**

---

## 任務

1. 建立 XML 構建性能基準測試
2. 建立完整流程端到端基準測試（10K, 50K, 100K, 500K URLs）
3. 建立內存使用監控腳本
4. **新增**：分析各階段耗時佔比，確認真正瓶頸
5. 測試增量生成性能（小變更 vs 大變更）

---

## 基準指標

- XML 構建吞吐量（entries/sec）
- 完整 sitemap 生成時間（ms）
- 內存峰值使用（MB）
- 分片生成性能（shards/sec）
- 增量生成性能（變更數 vs 時間）
- **新增**：各階段耗時佔比（%）

---

## 測試矩陣與環境記錄（新增）

**測試矩陣**（每項都要跑一次）：

- **URL 規模**：1K / 10K / 50K / 100K / 500K
- **變更比例**：0% / 1% / 5% / 10% / 30% / 50%
- **模式**：單檔 sitemap / 多 shard（預設 50K/檔）
- **儲存後端**：本地檔案 / S3（如可用）
- **執行條件**：冷啟動（首次）/ 熱啟動（快取後）

**環境記錄**：

- CPU / 記憶體 / Node 或 Bun 版本
- 儲存位置（本地磁碟或 S3 region）
- providers 來源與排序規則（如有）
- baseUrl / pretty / 任何影響輸出格式的設定

> 目的：讓後續 Phase 1/3 的瓶頸判定可重現且可比較

---

## 預期產出

- `bench/xml-stream.bench.ts` - XML 構建性能測試
- `bench/full-generation.bench.ts` - 端到端性能測試
- `bench/incremental.bench.ts` - 增量生成性能測試
- `bench/memory-profiler.ts` - 內存分析工具
- `bench/BASELINE.md` - 基準測試結果文檔

---

## 決策輸出（新增）

Phase 0 結果必須產出下列決策，供 Phase 3 使用：

1. **changeRatio 閾值**：觸發完整重建的變更比例
2. **affectedShardRatio 閾值**：受影響 shard 比例上限
3. **建議值**：依測試結果填寫（不可空白）

建議在 `bench/BASELINE.md` 中加入表格：

| 指標 | 建議值 | 依據 |
|-----|--------|------|
| changeRatio | TBD | 以增量/全量交叉點決定 |
| affectedShardRatio | TBD | 以 shard 重寫成本決定 |

---

## 驗證清單

- [ ] 基準測試可重複執行
- [ ] 結果記錄於 `bench/BASELINE.md`
- [ ] 確認各階段耗時佔比
- [ ] **關鍵決策**: 根據結果決定優化優先級

---

## 下一步

完成基準測試後，根據結果決定優化優先級，然後繼續進行：
- [Phase 1: XML 構建優化](../01-xml-optimization/README.md)
