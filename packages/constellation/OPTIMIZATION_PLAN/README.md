# @gravito/constellation 優化執行計劃

> **版本**: 1.1.0  
> **日期**: 2026-01-19  
> **最後更新**: 2026-01-19  
> **目標**: 提升 Constellation sitemap 生成引擎整體性能 30-50%，優化內存使用，改善大規模網站（100K+ URLs）的處理能力

---

## 📋 執行摘要

| 優化項目 | 當前狀態 | 目標狀態 | 預期提升 | 備註 |
|---------|---------|---------|---------|------|
| SitemapStream XML 構建 | ✅ 已完成 | Array.join/標誌優化 | 20-40% | 內存消耗顯著降低 |
| SitemapGenerator 分片 | ✅ 已完成 | 獨立 shard / Manifest | - | 支援增量定位 |
| IncrementalGenerator | ✅ 已完成 | 真正增量更新 | 70-90% | 🔴 核心優化項目 |
| MemoryChangeTracker | ✅ 已完成 | Map 索引 | 80-95% | O(1) 查詢 |
| DiffCalculator 比較 | ⚠️ 待評估 | 深度比較優化 | 20-30% | 優先級較低 |
| S3Storage 讀取 | ✅ 已完成 | 流式解析接口 | 減少 40-60% | 已實現 readStream |
| ShadowProcessor 並發 | ✅ 已完成 | Mutex 保護 | 穩定性 | 避免影子區衝突 |
| 進度追蹤性能 | ✅ 已完成 | 批次更新 | - | 已實現 |

**實測提升**: 500k URLs 內存減少 **31%**，增量更新速度提升顯著（100k 下提升 26% 且隨規模增長）。

---

## 🎯 實施進度

| 順序 | Phase | 內容 | 優先級 | 狀態 |
|-----|-------|------|--------|------|
| 1 | [00-baseline](./00-baseline/) | 基準測試 | 🔴 高 | ✅ 已完成 |
| 2 | [01-xml-optimization](./01-xml-optimization/) | XML 構建優化 | 🔴 高 | ✅ 已完成 |
| 3 | [05-tracker-optimization](./05-tracker-optimization/) | 變更追蹤優化 | 🔴 高 | ✅ 已完成 |
| 4 | [03-incremental-optimization](./03-incremental-optimization/) | 增量生成實現 | 🔴 高 | ✅ 已完成 |
| 5 | [04-storage-optimization](./04-storage-optimization/) | 存儲層流式讀取 | 🟡 中 | ✅ 已完成 |
| 6 | [02-generator-optimization](./02-generator-optimization/) | 生成器分片優化 | ⚪ 待評估 | ⚪ 略過 (現有設計已足夠) |
| 7 | [07-concurrency-optimization](./07-concurrency-optimization/) | 並發保護 | 🟢 低 | ✅ 已完成 |
| 8 | [06-memory-optimization](./06-memory-optimization/) | 內存優化 | 🟢 低 | ✅ 已完成 (隨 Phase 1/4 落地) |
| 9 | [08-dx-optimization](./08-dx-optimization/) | DX 優化 | ✅ 完成 | ✅ 已完成 |

---

## ✅ 驗證狀態

- [x] 所有現有測試通過
- [x] 新增功能測試通過 (`SitemapParser`, `IncrementalGenerator`)
- [x] 性能基準測試顯示 31% 內存優化
- [x] 流式處理大幅降低 100K+ 規模下的壓力
- [x] 文檔已全面更新
- [x] 並發安全性已通過本地 Mutex 驗證

---

**版本歷史**:
- v1.1.0 (2026-01-19): 核心優化項目全部完成
  - 完成 Phase 4 流式讀取解析
  - 完成 Phase 7 並發鎖定保護
  - 更新基準測試最終結果
- v1.0.0 (2026-01-17): 初始版本
