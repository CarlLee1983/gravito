# @gravito/constellation 優化執行計劃

> **版本**: 1.0.0  
> **日期**: 2026-01-17  
> **目標**: 提升 Constellation sitemap 生成引擎整體性能 40-60%，優化內存使用，改善大規模網站（100K+ URLs）的處理能力

---

## 📋 執行摘要

| 優化項目 | 當前狀態 | 目標狀態 | 預期提升 |
|---------|---------|---------|---------|
| SitemapStream XML 構建 | ⚠️ 字串拼接 | ✅ 流式/緩衝區處理 | 50-70% |
| SitemapGenerator 分片 | ⚠️ 全量重新生成 | ✅ 增量分片 | 60-80% |
| IncrementalGenerator | ⚠️ 偽增量（重新生成） | ✅ 真正增量更新 | 70-90% |
| MemoryChangeTracker | ⚠️ 陣列 filter | ✅ Map/Set 索引 | 80-95% |
| DiffCalculator 比較 | ⚠️ JSON.stringify | ✅ 深度比較優化 | 50-70% |
| S3Storage 讀取 | ⚠️ 全量加載 | ✅ 流式讀取 | 減少 60-80% |
| ShadowProcessor 並發 | ❌ 無保護 | ✅ Mutex 保護 | 穩定性 |
| 進度追蹤性能 | ⚠️ 頻繁更新 | ✅ 批次更新 | 30-50% |

**預期整體提升**: 生成速度提升 40-60%，內存使用減少 50-70%

---

## 🗂️ 計劃結構

本計劃已按 Phase 拆分到以下資料夾，每個 Phase 都有獨立的 README：

### 核心優化階段

- **[00-baseline/](./00-baseline/README.md)** - 基準測試與分析（必須先完成）
- **[01-xml-optimization/](./01-xml-optimization/README.md)** - XML 構建器性能優化
- **[02-generator-optimization/](./02-generator-optimization/README.md)** - 生成器優化
- **[03-incremental-optimization/](./03-incremental-optimization/README.md)** - 增量生成優化
- **[04-storage-optimization/](./04-storage-optimization/README.md)** - 存儲層優化
- **[05-tracker-optimization/](./05-tracker-optimization/README.md)** - 變更追蹤優化

### 次要優化階段

- **[06-memory-optimization/](./06-memory-optimization/README.md)** - 內存優化（低優先級）
- **[07-concurrency-optimization/](./07-concurrency-optimization/README.md)** - 並發優化
- **[08-dx-optimization/](./08-dx-optimization/README.md)** - 開發者體驗（DX）優化

### 附錄

- **[appendices/](./appendices/)** - 配置類型定義、文件清單等

---

## 🎯 實施優先級

| 順序 | Phase | 內容 | 優先級 | 預估時間 | 依賴 |
|-----|-------|------|--------|---------|------|
| 1 | [00-baseline](./00-baseline/) | 基準測試 | 🔴 高 | 2-3 天 | 無 |
| 2 | [01-xml-optimization](./01-xml-optimization/) | XML 構建優化 | 🔴 高 | 2-3 天 | 0 |
| 3 | [02-generator-optimization](./02-generator-optimization/) | 生成器分片優化 | 🔴 高 | 2-3 天 | 1 |
| 4 | [03-incremental-optimization](./03-incremental-optimization/) | 增量生成實現 | 🔴 高 | 3-4 天 | 2 |
| 5 | [05-tracker-optimization](./05-tracker-optimization/) | 變更追蹤優化 | 🟡 中 | 1-2 天 | 無 |
| 6 | [04-storage-optimization](./04-storage-optimization/) | 存儲層流式讀取 | 🟡 中 | 1-2 天 | 無 |
| 7 | [07-concurrency-optimization](./07-concurrency-optimization/) | 並發保護 | 🟡 中 | 1 天 | 無 |
| 8 | [06-memory-optimization](./06-memory-optimization/) | 內存優化 | 🟢 低 | 1-2 天 | 無 |
| 9 | [08-dx-optimization](./08-dx-optimization/) | DX 優化 | 🟢 低 | 1-2 天 | 無 |

---

## 📊 依賴關係圖

```
Phase 0 (基準測試)
    │
    ├─── Phase 1 (XML 構建優化)
    │         │
    │         └─── Phase 2 (生成器分片優化)
    │                   │
    │                   └─── Phase 3 (增量生成實現)
    │
    └─── Phase 5 (變更追蹤優化)
              │
              └─── Phase 3 (增量生成實現)

獨立項目（可並行）:
├── Phase 4 (存儲層優化)
├── Phase 6 (內存優化)
├── Phase 7 (並發優化)
└── Phase 8 (DX 優化)
```

---

## ⏱️ 預期時間表

| 階段 | 包含 Phase | 預估時間 | 累計時間 |
|-----|-----------|---------|---------|
| 階段 1: 基礎設施 | 0, 1 | 4-6 天 | 4-6 天 |
| 階段 2: 核心優化 | 2, 3 | 5-7 天 | 9-13 天 |
| 階段 3: 存儲與追蹤 | 4, 5 | 2-4 天 | 11-17 天 |
| 階段 4: 穩定性優化 | 6, 7 | 2-3 天 | 13-20 天 |
| 階段 5: DX 完善 | 8 | 1-2 天 | 14-22 天 |
| 階段 6: 收尾測試 | 測試、文檔、發布 | 3-5 天 | 17-27 天 |

**總預估時間**: 17-27 個工作日（約 4-6 週）

---

## ⚠️ 重要說明

### 關鍵發現

1. **IncrementalGenerator 目前是偽增量**：`generateDiff()` 方法實際上重新生成整個 sitemap，需要實現真正的增量更新
2. **SitemapStream 內存問題**：所有 entries 保存在記憶體中，對於大型 sitemap 會消耗大量記憶體
3. **變更追蹤性能**：MemoryChangeTracker 使用陣列 filter，對於大量變更需要優化

### 風險評估

| 項目 | 風險 | 緩解措施 |
|-----|------|---------|
| Phase 3 增量生成 | 高 | 保留完整生成作為 fallback、完整測試 |
| Phase 2 分片優化 | 中 | 基準測試驗證、向後相容 |
| Phase 4 存儲優化 | 低 | 保留舊實現作為 fallback |

---

## ✅ 驗證清單

完成每個 Phase 後，驗證以下項目：

- [ ] 所有現有測試通過
- [ ] 新增功能測試通過
- [ ] 性能基準測試顯示預期提升（如適用）
- [ ] 內存使用符合預期（如適用）
- [ ] 文檔已更新
- [ ] 向後相容性驗證通過
- [ ] 代碼審查完成

---

## 📚 相關資源

- [配置類型定義](./appendices/config-types.md)
- [新增檔案清單](./appendices/file-list.md)

---

**版本歷史**:
- v1.0.0 (2026-01-17): 初始版本
