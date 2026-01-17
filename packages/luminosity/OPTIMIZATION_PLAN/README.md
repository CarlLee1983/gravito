# @gravito/luminosity 優化執行計劃

> **版本**: 2.0.0  
> **日期**: 2026-01-17  
> **修訂**: 基於程式碼審查的完整修正版  
> **目標**: 提升 Luminosity SEO 引擎整體性能 30-50%，優化內存使用，改善大規模網站（100K+ URLs）的處理能力

---

## 📋 執行摘要

| 優化項目 | 當前狀態 | 目標狀態 | 預期提升 |
|---------|---------|---------|---------|
| StorageAdapter 擴展 | ❌ 無流式支援 | ✅ 流式讀取接口 | 基礎設施 |
| XML 構建性能 | ⚠️ 字串拼接 | ✅ 緩衝區/流式處理 | 待測試確認 |
| XML 安全性 | ❌ 無轉義 | ✅ 完整 XML 轉義 | 安全性修復 |
| Compactor 內存 | ⚠️ 全量加載 | ✅ 流式處理 | 減少 60-80% |
| JsonlLogger 讀取 | ⚠️ 一次性讀取 | ✅ 流式讀取 | 減少 70-90% |
| IncrementalStrategy | ⚠️ 每次完整 compact | ✅ TTL 快取 + 增量 | 50-70% |
| 並發寫入保護 | ❌ 無保護 | ✅ Mutex 保護 | 穩定性 |
| 日誌輪替 | ❌ 未實現 | ✅ 自動輪替 | 穩定性 |
| SeoRenderer 索引 | ⚠️ 全量遍歷 | ✅ 增量計算 | 30-50% |
| 路由掃描快取 | ❌ 無快取 | ✅ 智能快取 | 80-95% |
| 並行處理優化 | ⚠️ 基礎並行 | ✅ 批次 + 重試 | 20-40% |

**預期整體提升**: 吞吐量提升 30-50%，內存使用減少 50-70%

---

## 🗂️ 計劃結構

本計劃已按 Phase 拆分到以下資料夾，每個 Phase 都有獨立的 README：

### 核心優化階段

- **[00-baseline/](./00-baseline/README.md)** - 基準測試與分析（必須先完成）
- **[01-xml-optimization/](./01-xml-optimization/README.md)** - XML 構建器性能優化
- **[02-storage-optimization/](./02-storage-optimization/README.md)** - 存儲層性能優化
- **[03-strategy-optimization/](./03-strategy-optimization/README.md)** - 引擎策略優化
- **[04-renderer-optimization/](./04-renderer-optimization/README.md)** - 渲染器優化
- **[05-route-scanning/](./05-route-scanning/README.md)** - 路由掃描優化

### 次要優化階段

- **[06-memory-optimization/](./06-memory-optimization/README.md)** - 內存優化（低優先級）
- **[07-build-optimization/](./07-build-optimization/README.md)** - 構建與打包優化（低優先級）
- **[08-dx-optimization/](./08-dx-optimization/README.md)** - 開發者體驗（DX）優化
- **[09-additional-optimizations/](./09-additional-optimizations/README.md)** - 額外優化領域（補充項目）

### 附錄

- **[appendices/](./appendices/)** - 配置類型定義、文件清單等

---

## 🎯 實施優先級

| 順序 | Phase | 內容 | 優先級 | 預估時間 | 依賴 |
|-----|-------|------|--------|---------|------|
| 1 | [00-baseline](./00-baseline/) | 基準測試 | 🔴 高 | 2-3 天 | 無 |
| 2 | [01-xml-optimization](./01-xml-optimization/) | XML 轉義（安全性） | 🔴 高 | 0.5 天 | 無 |
| 3 | [08-dx-optimization](./08-dx-optimization/) | 配置驗證 | 🔴 高 | 1 天 | 無 |
| 4 | [08-dx-optimization](./08-dx-optimization/) | CLI 工具 | 🔴 高 | 1-2 天 | 無 |
| 5 | [02-storage-optimization](./02-storage-optimization/) | StorageAdapter 擴展 | 🔴 高 | 1-2 天 | 無 |
| 6 | [02-storage-optimization](./02-storage-optimization/) | JsonlLogger 流式讀取 | 🔴 高 | 1-2 天 | 2.0 |
| 7 | [02-storage-optimization](./02-storage-optimization/) | Compactor 優化 | 🔴 高 | 1-2 天 | 2.1 |
| 8 | [03-strategy-optimization](./03-strategy-optimization/) | IncrementalStrategy 快取 | 🔴 高 | 2-3 天 | 2.1, 2.2 |
| 9 | [03-strategy-optimization](./03-strategy-optimization/) | 並發寫入保護 | 🔴 高 | 0.5 天 | 無 |
| 10 | [01-xml-optimization](./01-xml-optimization/) | XML 構建優化（依測試結果） | 🟡 中 | 1-2 天 | 0 |
| 11 | [02-storage-optimization](./02-storage-optimization/) | 快照壓縮 | 🟡 中 | 1 天 | 無 |
| 12 | [03-strategy-optimization](./03-strategy-optimization/) | DynamicStrategy 批次 + 重試 | 🟡 中 | 1 天 | 無 |
| 13 | [03-strategy-optimization](./03-strategy-optimization/) | 日誌輪替 | 🟡 中 | 1 天 | 無 |
| 14 | [04-renderer-optimization](./04-renderer-optimization/) | SeoRenderer 優化 | 🟡 中 | 1 天 | 無 |
| 15 | [05-route-scanning](./05-route-scanning/) | 路由掃描快取 | 🟡 中 | 1-2 天 | 無 |
| 16 | [09-additional-optimizations](./09-additional-optimizations/) | SitemapBuilder 並行處理 | 🟡 中 | 0.5-1 天 | 無 |
| 17 | [09-additional-optimizations](./09-additional-optimizations/) | JsonlLogger 自動修復 | 🟡 中 | 0.5 天 | 無 |
| 18 | [09-additional-optimizations](./09-additional-optimizations/) | 定時器資源清理 | 🟡 中 | 0.5 天 | 無 |
| 19 | [09-additional-optimizations](./09-additional-optimizations/) | 內存洩漏檢查 | 🟡 中 | 1-2 天 | 無 |

---

## 📊 依賴關係圖

```
Phase 0 (基準測試)
    │
    ├─── Phase 1.1 (XML 優化) ← 依測試結果決定是否實施
    │
    └─── Phase 2.0 (StorageAdapter 擴展)
              │
              └─── Phase 2.1 (JsonlLogger 流式)
                        │
                        └─── Phase 2.2 (Compactor 優化)
                                  │
                                  └─── Phase 3.1 (IncrementalStrategy)

獨立項目（可並行）:
├── Phase 1.2 (XML 轉義) - 安全性，優先
├── Phase 3.3 (並發寫入保護)
├── Phase 3.4 (日誌輪替)
├── Phase 8.2 (配置驗證)
├── Phase 8.3 (CLI 工具)
└── Phase 8.x (其他 DX 優化)
```

---

## ⏱️ 預期時間表

| 階段 | 包含 Phase | 預估時間 | 累計時間 |
|-----|-----------|---------|---------|
| 階段 1: 基礎設施 | 0, 1.2, 8.2, 8.3 | 4-6 天 | 4-6 天 |
| 階段 2: 存儲優化 | 2.0, 2.1, 2.2 | 4-6 天 | 8-12 天 |
| 階段 3: 策略優化 | 3.1, 3.3, 3.4 | 3-5 天 | 11-17 天 |
| 階段 4: 性能微調 | 1.1, 2.3, 3.2, 4.1 | 3-5 天 | 14-22 天 |
| 階段 5: DX 完善 | 5.1, 8.1, 8.4, 8.5, 8.7 | 4-6 天 | 18-28 天 |
| 階段 6: 收尾測試 | 測試、文檔、發布 | 3-5 天 | 21-33 天 |

**總預估時間**: 21-33 個工作日（約 5-7 週）

---

## ⚠️ 重要變更說明（v2.0.0）

### 新增項目
1. **Phase 2.0**: StorageAdapter 接口擴展（流式讀取支援）- 必須先完成
2. **Phase 3.3**: 並發寫入保護
3. **Phase 3.4**: 日誌輪替實現
4. **Phase 3.5**: Resolver 重試機制

### 修正項目
1. **Phase 1.1**: XML 構建優化改為依基準測試結果決定
2. **Phase 3.1**: IncrementalStrategy 快取策略完全重新設計
3. **依賴關係**: 明確標註各 Phase 的依賴關係

### 優先級調整
- Phase 1.2（XML 轉義）提前至安全性修復
- Phase 8.2、8.3（DX 優化）提前實施
- Phase 2.0（StorageAdapter 擴展）為新的前置項目

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
- v2.1.0 (2026-01-17): 新增 Phase 9 - 額外優化領域（補充項目）
- v2.0.0 (2026-01-17): 基於程式碼審查的完整修正版
- v1.1.0 (2026-01-17): 新增 Phase 8 - 開發者體驗優化
- v1.0.0 (2026-01-17): 初始版本
