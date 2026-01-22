# @gravito/prism 優化改良總覽

> **版本**: 3.1.0 (計劃版本)
> **目標日期**: 20 個工作天
> **向下相容**: 嚴格維持

---

## 📋 文檔索引

本總覽提供優化計劃的完整索引。每個階段的詳細規格請參考對應的文檔。

### 階段文檔

| 文檔 | 說明 | 預估工時 |
|------|------|---------|
| [Phase 1: 效能優化](./PHASE1_PERFORMANCE.md) | 模板快取、正則優化、組件解析改進 | 2-3 天 |
| [Phase 2: 圖片功能增強](./PHASE2_IMAGE_ENHANCEMENT.md) | AVIF/WebP/Picture、LQIP、CDN 整合 | 3-4 天 |
| [Phase 3: 程式碼品質](./PHASE3_CODE_QUALITY.md) | LSP 修復、類型安全、測試覆蓋 | 1-2 天 |
| [Phase 4: SSG 增強](./PHASE4_SSG_ENHANCEMENT.md) | 增量建置、動態路由、可配置並發 | 2-3 天 |
| [Phase 5: 架構重構](./PHASE5_ARCHITECTURE_REFACTOR.md) | 模組化、AST 解析考慮 | 5-7 天 |

### 參考文檔

| 文檔 | 說明 |
|------|------|
| [驗收標準](./ACCEPTANCE_CRITERIA.md) | 每個階段的驗收檢查清單 |
| [向下相容性指南](./BACKWARD_COMPATIBILITY.md) | API 變更規則與測試方法 |

---

## 🎯 總體目標

### 性能指標

| 指標 | 現狀 | 目標 | 測量方法 |
|------|------|------|---------|
| 重複渲染效能 | Baseline | +30% | `tests/performance.test.ts` |
| 測試覆蓋率 | 75-99% | >85% | `bun test --coverage` |
| LSP 警告 | 4 個 | 0 個 | `bun run typecheck` |
| 模板快取命中率 | 無 | >90% | 新增監控日誌 |

### 功能指標

| 指標 | 現狀 | 目標 |
|------|------|------|
| 圖片格式 | 僅 srcset | AVIF/WebP/Picture |
| SSG 功能 | 基本 | 增量 + 動態路由 |
| CDN 支援 | 無 | 可插拔 loader |
| 開發者體驗 | 中 | 高 (錯誤訊息、調試支援） |

---

## 🔄 執行原則

### 向下相容性

所有 API 變更必須遵守以下規則：

1. **現有 API 不得變更**：所有公開方法、介面必須保持相容
2. **新功能透過可選參數**：使用可選屬性擴展功能
3. **預設行為保持不變**：新功能必須 opt-in
4. **Deprecation 策略**：若需要移除 API，必須至少保留 2 個 minor 版本

參考：[向下相容性指南](./BACKWARD_COMPATIBILITY.md)

### 測試先行

每個 Phase 完成前必須：

1. ✅ 所有現有測試通過（33 個測試）
2. ✅ 新增測試通過
3. ✅ 測試覆蓋率達標
4. ✅ LSP 診斷無錯誤、無警告
5. ✅ `bun run typecheck` 通過

參考：[驗收標準](./ACCEPTANCE_CRITERIA.md)

---

## 📊 執行進度追蹤

### Phase 追蹤表

使用以下追蹤每個 Phase 的進度：

| Phase | 狀態 | 開始日期 | 完成日期 | 備註 |
|-------|------|---------|---------|------|
| Phase 1: 效能優化 | ⏳ Pending | - | - |
| Phase 2: 圖片功能增強 | ⏳ Pending | - | - |
| Phase 3: 程式碼品質 | ⏳ Pending | - | - |
| Phase 4: SSG 增強 | ⏳ Pending | - | - |
| Phase 5: 架構重構 | ⏳ Pending | - | - |

### 報告日誌

每個 Phase 完成後，請更新：

- 實際工時 vs 預估工時
- 遇到的問題與解決方案
- 驗收結果
- 效能改善數據

---

## 🚀 快速開始

### 第一次執行此計劃？

1. 閱讀本總覽
2. 從 **[Phase 1](./PHASE1_PERFORMANCE.md)** 開始
3. 完成每個任務後勾選驗收清單
4. 遇到問題時參考對應文檔

### 已有部分實作？

請檢查每個 Phase 文檔中的 **「現狀檢查」** 區塊，確認：
- 哪些改進已經實作
- 哪些 API 已經變更
- 如何調整執行計劃

---

## 📚 附加資源

### 研究資料

本次優化計劃基於以下研究：

1. **模板引擎最佳實踐**
   - Laravel Blade 快取策略 (XXH128 hash)
   - EJS LRU 記憶體快取
   - Handlebars 預編譯技術
   - AST vs Regex 解析比較

2. **圖片優化最佳實踐**
   - Next.js Image 組件架構
   - AVIF/WebP 格式協商
   - LQIP 與 Core Web Vitals
   - CDN 整合模式 (Vercel, Cloudinary, imgix)

3. **效能基準測試**
   - Template Engine Benchmarks (crafter999, itsarnaud)
   - Core Web Vitals 指標
   - CLS 預防技術

### 相關框架參考

| 框架 | 參考項目 |
|------|---------|
| Laravel Blade | 快取失效、模板編譯 |
| Next.js | 圖片優化、SSG 增量建置 |
| Handlebars | AST 解析、預編譯 |
| EJS | LRU 快取、簡單語法 |

---

## 📝 變更日誌

| 版本 | 日期 | 變更 | 作者 |
|------|------|------|------|
| 3.1.0 | 2026-01-22 | 初始優化計劃 | Sisyphus |

---

**下一文檔**: [Phase 1: 效能優化](./PHASE1_PERFORMANCE.md) →
