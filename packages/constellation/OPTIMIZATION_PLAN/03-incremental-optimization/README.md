# Phase 3: 增量生成優化

> **依賴**: Phase 1（XML 構建優化）、Phase 5（變更追蹤優化）  
> **優先級**: 🔴 **核心優化項目**  
> **預估時間**: **5-7 天**（校正後，原估計 3-4 天）  
> **風險等級**: 🔴 高

[← 返回總覽](../README.md)

---

## 目標

實現真正的增量 sitemap 生成，只更新變更的部分，而不是重新生成整個 sitemap。

---

## 狀態：已完成 (2026-01-19)

### 已實施優化
- **SitemapParser**: 實現了輕量級的正則表達式解析器，支持解析 URL 集合與 Sitemap Index。
- **Shard Manifest**: `SitemapGenerator` 現在會產出 `sitemap-manifest.json`，記錄每個分片的 URL 範圍與數量。
- **真正增量更新**: `IncrementalGenerator` 現在會根據 Manifest 定位受影響的分片，僅讀取並重寫這些分片，大大減少了 I/O 與計算開銷。
- **自動回退**: 實現了基於 `changeRatio` (30%) 與 `affectedShardRatio` (50%) 的自動回退機制。

---

## 驗證清單

### 子任務 3.0: 分片規則與 Manifest
- [x] 分片規則固定且可重現（排序與分段一致）
- [x] Manifest 格式與存放位置確定
- [x] Manifest 與 sitemap index 同步更新

### 子任務 3.1: SitemapParser
- [x] XML 解析器實現
- [x] 支援解析 sitemap index
- [x] 支援解析 urlset
- [x] 錯誤處理完整

### 子任務 3.4-3.5: generateDiff() 和 shard 更新
- [x] 實現真正的增量更新
- [x] 只更新變更的 shard
- [x] 更新 sitemap index

### 整體驗證
- [x] 測試：小變更場景性能提升顯著
- [x] 測試：大變更場景觸發 Fallback
- [x] 所有現有測試通過
- [x] 向後相容性驗證通過
- [x] 文檔已更新

---

## 下一步

完成 Phase 3 後：
- 進行 Phase 4 存儲進一步評估。
- 考慮並發優化（Phase 7）。
