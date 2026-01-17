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

## 預期產出

- `bench/xml-stream.bench.ts` - XML 構建性能測試
- `bench/full-generation.bench.ts` - 端到端性能測試
- `bench/incremental.bench.ts` - 增量生成性能測試
- `bench/memory-profiler.ts` - 內存分析工具
- `bench/BASELINE.md` - 基準測試結果文檔

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
