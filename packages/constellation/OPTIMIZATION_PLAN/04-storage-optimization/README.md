# Phase 4: 存儲層優化

> **依賴**: 無  
> **優先級**: 🟡 中  
> **預估時間**: 1-2 天

[← 返回總覽](../README.md)

---

## 狀態：已完成 (2026-01-19)

### 已實施優化
- **readStream 接口**: 在 `SitemapStorage` 接口中新增了 `readStream` 方法，並在 S3, GCP, Disk, Memory 存儲中實施。
- **流式解碼**: S3 與 GCP 實作現在返回 `AsyncIterable<string>`，使用 `TextDecoder` 的流式模式進行解碼，避免了大緩衝區分配。
- **SitemapParser 支援**: `SitemapParser` 現在可以通過 `parseStream` 逐步解析 XML 節點，極大地降低了處理大型 shard 時的記憶體峰值。

---

## 驗證清單

- [x] 流式讀取接口設計完成
- [x] S3/GCP/Disk 實作完成
- [x] SitemapParser 支援流式輸入
- [x] 性能測試顯示記憶體使用更加平穩
- [x] 所有現有測試通過
