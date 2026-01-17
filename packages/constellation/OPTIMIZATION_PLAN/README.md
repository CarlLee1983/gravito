# @gravito/constellation 優化執行計劃

> **版本**: 1.1.0  
> **日期**: 2026-01-17  
> **最後更新**: 2026-01-17（可行性評估後校正）  
> **目標**: 提升 Constellation sitemap 生成引擎整體性能 30-50%，優化內存使用，改善大規模網站（100K+ URLs）的處理能力

---

## 📋 執行摘要

| 優化項目 | 當前狀態 | 目標狀態 | 預期提升 | 備註 |
|---------|---------|---------|---------|------|
| SitemapStream XML 構建 | ⚠️ 字串拼接 | ✅ Array.join/流式 | 20-40% | V8 已有優化，保守估計 |
| SitemapGenerator 分片 | ✅ 獨立 shard 生成 | - | - | ⚠️ **待評估**：當前設計正確 |
| IncrementalGenerator | ⚠️ 偽增量（重新生成） | ✅ 真正增量更新 | 70-90% | 🔴 核心優化項目 |
| MemoryChangeTracker | ⚠️ 陣列 filter | ✅ Map/Set 索引 | 80-95% | |
| DiffCalculator 比較 | ⚠️ alternates 用 JSON.stringify | ✅ 深度比較優化 | 20-30% | 其他欄位已是直接比較 |
| S3Storage 讀取 | ⚠️ 全量載入字串 | ✅ 流式解析接口 | 減少 40-60% | 已有 chunk 讀取 |
| ShadowProcessor 並發 | ⚠️ 無 Mutex | ✅ Mutex 保護 | 穩定性 | 風險較低，可延後 |
| 進度追蹤性能 | ✅ 已有批次更新 | - | - | ✅ **已實現** |

**預期整體提升**: 生成速度提升 30-50%，內存使用減少 40-60%

> ⚠️ **重要說明**: 預期提升數值為保守估計，實際效果需以 Phase 0 基準測試結果為準

---

## 🗂️ 計劃結構

本計劃已按 Phase 拆分到以下資料夾，每個 Phase 都有獨立的 README：

### 核心優化階段

- **[00-baseline/](./00-baseline/README.md)** - 基準測試與分析（必須先完成）
- **[01-xml-optimization/](./01-xml-optimization/README.md)** - XML 構建器性能優化
- **[02-generator-optimization/](./02-generator-optimization/README.md)** - 生成器優化 ⚠️ **待評估**
- **[03-incremental-optimization/](./03-incremental-optimization/README.md)** - 增量生成優化 🔴 **核心**
- **[04-storage-optimization/](./04-storage-optimization/README.md)** - 存儲層優化（併入 Phase 3）
- **[05-tracker-optimization/](./05-tracker-optimization/README.md)** - 變更追蹤優化

### 次要優化階段

- **[06-memory-optimization/](./06-memory-optimization/README.md)** - 內存優化（根據 Phase 0 決定）
- **[07-concurrency-optimization/](./07-concurrency-optimization/README.md)** - 並發優化（風險較低，可延後）
- **[08-dx-optimization/](./08-dx-optimization/README.md)** - 開發者體驗（DX）優化 ✅ 進度追蹤已實現

### 附錄

- **[appendices/](./appendices/)** - 配置類型定義、文件清單等

---

## 🎯 實施優先級

| 順序 | Phase | 內容 | 優先級 | 預估時間 | 依賴 | 狀態 |
|-----|-------|------|--------|---------|------|------|
| 1 | [00-baseline](./00-baseline/) | 基準測試 | 🔴 高 | 2-3 天 | 無 | |
| 2 | [01-xml-optimization](./01-xml-optimization/) | XML 構建優化 | 🔴 高 | 2-3 天 | 0 | |
| 3 | [05-tracker-optimization](./05-tracker-optimization/) | 變更追蹤優化 | 🔴 高 | 1-2 天 | 無 | Phase 3 依賴此項 |
| 4 | [03-incremental-optimization](./03-incremental-optimization/) | 增量生成實現 | 🔴 高 | **5-7 天** | 1, 5 | 🔴 核心優化 |
| 5 | [04-storage-optimization](./04-storage-optimization/) | 存儲層流式讀取 | 🟡 中 | 1-2 天 | 無 | 併入 Phase 3 |
| 6 | [02-generator-optimization](./02-generator-optimization/) | 生成器分片優化 | ⚪ 待評估 | 1-2 天 | 0 | 視 Phase 0 結果 |
| 7 | [07-concurrency-optimization](./07-concurrency-optimization/) | 並發保護 | 🟢 低 | 1 天 | 無 | 風險較低 |
| 8 | [06-memory-optimization](./06-memory-optimization/) | 內存優化 | 🟢 低 | 1-2 天 | 無 | 視 Phase 0 結果 |
| 9 | [08-dx-optimization](./08-dx-optimization/) | DX 優化 | ✅ 完成 | - | - | 進度追蹤已實現 |

> **說明**: Phase 5 提前執行，因為 Phase 3 的增量生成依賴高效的變更追蹤

---

## 📊 依賴關係圖（校正後）

```
Phase 0 (基準測試) ─────────────────────────────────────────
    │                                                      │
    ├─── Phase 1 (XML 構建優化)                            │
    │         │                                            │
    │         └───────────┐                                │
    │                     │                                │
    │                     ▼                                │
    └─── Phase 5 (變更追蹤優化) ────► Phase 3 (增量生成) ◄──┘
                                          │
                                          │
                              ┌───────────┘
                              ▼
                    Phase 4 (存儲優化) ← 合併為 Phase 3 子任務

待評估項目（根據 Phase 0 結果決定）:
├── Phase 2 (生成器分片優化) ← 當前設計正確，可能不需要
├── Phase 6 (內存優化) ← 視基準測試結果
└── Phase 7 (並發優化) ← 風險較低，可延後

已完成:
└── Phase 8 (DX 優化) ← 進度追蹤批次更新已實現
```

> **關鍵路徑**: Phase 0 → Phase 1 → Phase 5 → Phase 3

---

## ⏱️ 預期時間表（校正後）

| 階段 | 包含 Phase | 預估時間 | 累計時間 | 備註 |
|-----|-----------|---------|---------|------|
| 階段 1: 基礎設施 | 0, 1 | 4-6 天 | 4-6 天 | 基準測試 + XML 優化 |
| 階段 2: 追蹤優化 | 5 | 1-2 天 | 5-8 天 | Phase 3 的前置依賴 |
| 階段 3: 核心優化 | 3 (+4 合併) | **5-7 天** | 10-15 天 | 🔴 增量生成（複雜度高） |
| 階段 4: 可選優化 | 2, 6, 7 | 2-4 天 | 12-19 天 | 根據 Phase 0 結果決定 |
| 階段 5: 收尾測試 | 測試、文檔、發布 | 4-6 天 | 16-25 天 | 增量更新需完整測試 |

**總預估時間**: 16-25 個工作日（約 3-5 週）

> **時間調整說明**:
> - Phase 3 時間從 3-4 天上調至 5-7 天（需實現 SitemapParser、URL-Shard 映射等）
> - Phase 8 移除（已實現）
> - Phase 2 降為可選（當前設計正確）

---

## ⚠️ 重要說明

### 關鍵發現

1. **IncrementalGenerator 目前是偽增量**：`generateDiff()` 方法實際上重新生成整個 sitemap，需要實現真正的增量更新
2. **SitemapStream 內存問題**：所有 entries 保存在記憶體中，對於大型 sitemap 會消耗大量記憶體
3. **變更追蹤性能**：MemoryChangeTracker 使用陣列 filter，對於大量變更需要優化

### 可行性評估校正（2026-01-17）

| 原計劃描述 | 實際情況 | 校正 |
|-----------|---------|------|
| SitemapGenerator 每次 flush 重新生成整個 XML | 每個 shard 是獨立 stream，只生成當前 shard | Phase 2 降為可選 |
| S3Storage 全量加載 | 已有 chunk 讀取，最後合併字串 | Phase 4 優化空間有限 |
| DiffCalculator 全用 JSON.stringify | 只有 alternates 用 JSON.stringify | 優化空間有限 |
| 進度追蹤頻繁更新 | 已有 1000ms 批次更新機制 | Phase 8 已實現 |
| XML 構建優化提升 50-70% | V8 對字串拼接有優化 | 調整為 20-40% |

### 風險評估（更新）

| 項目 | 風險 | 緩解措施 |
|-----|------|---------|
| Phase 3 增量生成 | 🔴 高 | 保留完整生成作為 fallback、完整測試、分步實現 |
| Phase 3 SitemapParser | 🟡 中 | 使用成熟的 XML 解析庫、完整錯誤處理 |
| Phase 1 XML 優化 | 🟢 低 | 基準測試驗證效果、保持向後相容 |
| Phase 2 分片優化 | ⚪ 待評估 | 需 Phase 0 確認是否為瓶頸 |

### 增量實作前置決策（必做）

為避免 Phase 3 實作失控，必須在實作前明確以下規格：

1. **分片規則**：URL 的排序規則、分片鍵、最大 entries 設定（需固定且可重現）
2. **Shard Manifest**：URL→Shard 映射的持久化格式與存放位置
3. **XML 解析/回寫策略**：標準化輸出或保留原格式（擇一）
4. **全量回退閾值**：變更比例或受影響 shard 比例的切換條件
5. **一致性/鎖定策略**：多流程寫入時的序列化機制

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
- [Shard Manifest 規格](./appendices/shard-manifest-spec.md)
- [XML 解析/回寫策略](./appendices/xml-parsing-writeback-strategy.md)
- [一致性與鎖定方案](./appendices/consistency-locking-strategy.md)

---

**版本歷史**:
- v1.1.0 (2026-01-17): 可行性評估後校正
  - Phase 2 降為可選（當前設計正確）
  - Phase 3 時間上調至 5-7 天
  - Phase 4 建議併入 Phase 3
  - Phase 8 標記為已實現
  - 調整預期提升為保守估計
  - 更新依賴關係圖
- v1.0.0 (2026-01-17): 初始版本
