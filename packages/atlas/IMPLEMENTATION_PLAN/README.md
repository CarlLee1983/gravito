# @gravito/atlas DX & Performance Optimization - Implementation Plan

## 📋 總覽

本文件提供 `packages/atlas/` 的開發者體驗（DX）與性能優化實施計劃。基於代碼分析與原始優化計劃，提供逐步執行指南。

**目標成果：**
- **DX 改進**：統一 API 命名、完整類型安全、更好的錯誤訊息
- **性能提升**：Model hydration ↑300-500%, Query compilation ↑50-100%, Memory usage ↓40-60%
- **代碼品質**：消除 32 個已知性能問題，類型覆蓋率提升至 95%+

---

## 📁 文件結構

本計劃已拆分為多個模組化文件，便於執行與追蹤：

### 前置準備
- **[01-analysis/](./01-analysis/)** - 代碼分析與驗證狀態
- **[02-phase-0-baseline/](./02-phase-0-baseline/)** - 基準線與回歸測試清單

### 核心優化階段
- **[03-phase-1-dx/](./03-phase-1-dx/)** - Critical DX Fixes (Week 1-2)
- **[04-phase-2-performance/](./04-phase-2-performance/)** - Critical Performance Optimizations (Week 3-5)
- **[05-phase-3-medium/](./05-phase-3-medium/)** - Medium Priority Optimizations (Week 6-7)
- **[06-phase-4-config/](./06-phase-4-config/)** - Configuration & Initialization (Week 8)
- **[07-phase-5-advanced/](./07-phase-5-advanced/)** - 進階性能優化 (Week 9-10)

### 支援文件
- **[08-testing/](./08-testing/)** - 測試策略與回歸清單
- **[09-risks/](./09-risks/)** - 風險評估與緩解措施
- **[10-upgrade-guide.md](./10-upgrade-guide.md)** - 升級指南

---

## 🚀 快速開始

### 執行順序

1. **Phase 0** - 建立基準線（1-2 天）
   - 建立效能基準線
   - 建立回歸測試清單

2. **Phase 1** - Critical DX（Week 1-2）
   - 統一 API 命名
   - 消除 `any` 類型
   - 改善錯誤訊息
   - 添加調試工具

3. **Phase 2** - Critical Performance（Week 3-5）
   - 優化 DirtyTracker
   - 優化 Model Proxy
   - 添加 Grammar LRU 快取
   - 優化 QueryBuilder.clone()
   - 優化 Eager Loading

4. **Phase 3** - Medium Priority（Week 6-7）
   - Connection 清理
   - Nested Transactions
   - 其他優化

5. **Phase 4** - Configuration（Week 8）
   - 環境變數支援
   - 智能預設值

6. **Phase 5** - 進階優化（Week 9-10）
   - Prepared Statement 支援
   - Attribute Casting 預編譯
   - 批次 Hydration 優化
   - DB Facade 優化
   - Relationships 重構

---

## 📊 時間估算

| Phase | 時間 | 狀態 |
|-------|------|------|
| Phase 0 | 1-2 天 | ⏳ 待開始 |
| Phase 1 | Week 1-2 | ⏳ 待開始 |
| Phase 2 | Week 3-5 | ⏳ 待開始 |
| Phase 3 | Week 6-7 | ⏳ 待開始 |
| Phase 4 | Week 8 | ⏳ 待開始 |
| Phase 5 | Week 9-10 | ✅ **已完成** (96%) |

**總計：10 週**（含緩衝時間，1 位開發者）

---

## ✅ 成功標準

| 指標 | 基準線 | 目標 | 驗證方式 |
|------|--------|------|----------|
| Model hydration 速度 | 100% | ↑300-500% | 性能基準測試 |
| DirtyTracker 操作 | 100% | ↑50x | 微基準測試 |
| Grammar 快取命中率 | N/A | >80% | `Grammar.getCacheStats()` |
| QueryBuilder clone | 100% | ↑100-200x | 性能基準測試 |
| 記憶體使用（大型資料集） | 100% | ↓40-60% | 記憶體分析器 |
| TypeScript `any` 數量 | ~50+ | <10 | `grep -r ": any" \| wc -l` |
| 錯誤訊息品質 | 基本 | 含建議 | 手動測試 |
| 類型覆蓋率 | ~70% | >95% | TypeScript strict mode |
| 測試覆蓋率 | ~75% | >80% | `bun test --coverage` |

---

## 📝 重要注意事項

### ⚠️ 架構調整

**Grammar 快取問題：** 計劃原本假設快取是靜態的，但實際上是實例級別。需要改為靜態快取以跨實例共享，詳見 [Phase 2.3](./04-phase-2-performance/2.3-grammar-cache.md)。

### 🔴 高風險項目

1. **Proxy 優化** - 可能有破壞性變更風險
2. **DirtyTracker Shallow Comparison** - 深層嵌套變更可能無法偵測
3. **Grammar 快取架構變更** - 可能影響多租戶場景

詳見 [風險評估](./09-risks/README.md)。

---

## 📚 相關文件

- [代碼分析結果](./01-analysis/code-analysis.md)
- [驗證狀態](./01-analysis/validation-status.md)
- [回歸測試清單](./08-testing/regression-checklist.md)
- [升級指南](./10-upgrade-guide.md)
- [風險評估](./09-risks/README.md)

---

## 📅 文件版本歷史

| 版本 | 日期 | 作者 | 變更 |
|------|------|------|------|
| 1.0 | 2026-01-17 | Claude | 初始完整實施計劃 |
| 1.1 | 2026-01-17 | Claude | 計劃審視更新，新增 Phase 5 |

---

**目標版本：** @gravito/atlas v2.0  
**預期性能提升：** 3-6x（含 Phase 5 優化）  
**預估工作量：** 10 週（含緩衝時間，1 位開發者）  
**破壞性變更：** 最小（主要是新增功能）
