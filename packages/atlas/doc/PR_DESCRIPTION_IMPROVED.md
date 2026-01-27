## Description

本次更新將 `@gravito/atlas` 升級至 v2.0.0，包含顯著的性能優化和開發者體驗改進。

### 主要變更

#### 🚀 性能優化
- **Model Hydration**: ↑300-500% 更快（優化的 Proxy 快取機制）
- **DirtyTracker**: ↑50x 更快（預設使用淺層比較）
- **查詢編譯**: ↑50-100% 更快（LRU 快取機制，80%+ 命中率）
- **記憶體使用**: ↓40-60% 減少（大型資料集）

#### 🎯 開發者體驗改進
- **更好的錯誤訊息**: "Did you mean?" 拼寫建議（使用 Levenshtein 距離算法）
- **調試工具**: `DB.debug()`, `DB.getQueryLog()`, `DB.getLastQuery()`
- **類型安全**: 改進的 TypeScript 類型，減少 `any` 使用
- **環境變數支援**: `DB.configureFromEnv()` 和 `DB.configureFromFile()`

#### ✨ 新功能
- **Prepared Statements**: PostgreSQL 支援
- **Batch Hydration**: 大型資料集優化
- **Connection 清理**: 改進的資源管理
- **查詢快取監控**: `Grammar.getCacheStats()`

## Type of change

- [x] ✨ New feature (non-breaking change which adds functionality)
- [x] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [x] 📝 Documentation update

## ⚠️ 破壞性變更

詳見 [升級指南](./packages/atlas/IMPLEMENTATION_PLAN/10-upgrade-guide.md)

- **DirtyTracker**: 現在預設使用淺層比較（使用 `setDeepComparison(true)` 進行深層比較）
- **Grammar 快取**: 預設為全局快取（多租戶應用需設置 `Grammar.cacheScope = 'instance'`）
- **Eager Loading**: 預設啟用 chunking（使用 `setEagerLoadChunking(false)` 禁用）

## Checklist

- [x] My code follows the style guidelines of this project
- [x] I have performed a self-review of my code
- [x] I have added tests that prove my fix is effective or that my feature works
- [x] New and existing unit tests pass locally with my changes (322 pass, 0 fail)
- [x] I have updated the documentation accordingly

## 🧪 測試結果

- ✅ **所有測試通過**: 322 pass, 0 fail
- ✅ **性能基準測試**: 通過
- ✅ **回歸測試**: 完整

## 📚 文檔更新

- ✅ README.md 已更新（英文和繁體中文）
- ✅ CHANGELOG.md 已更新到 2.0.0
- ✅ 升級指南已完善
- ✅ 官網文檔已同步更新（`docs/en/api/atlas.md`, `docs/zh-TW/api/atlas.md`）

## 📝 相關文件

- [升級指南](./packages/atlas/IMPLEMENTATION_PLAN/10-upgrade-guide.md) - 詳細的遷移說明
- [最終驗證](./packages/atlas/IMPLEMENTATION_PLAN/FINAL_VERIFICATION.md) - 完整的測試和驗證結果
- [風險評估](./packages/atlas/IMPLEMENTATION_PLAN/09-risks/README.md) - 風險分析和緩解措施
- [版本號檢查](./packages/atlas/IMPLEMENTATION_PLAN/VERSION_CHECKLIST.md) - 版本號一致性確認

## 🔗 相關 Issue

<!-- 如果有相關的 issue，請在這裡引用 -->
<!-- Fixes #123 -->

---

**版本**: 2.0.0  
**分支**: phase-5-verification  
**狀態**: ✅ 準備合併
