# @gravito/nebula v4.0 重構文件索引

本目錄包含 Nebula 模組 v4.0 重構的完整規劃文件。

---

## 📚 文件清單

### 1. [REFACTOR_SUMMARY.md](./REFACTOR_SUMMARY.md) ⭐ **建議先看**

**快速參考指南** - 精簡版執行摘要

- 📊 工作量估計（7 小時）
- 🏗️ 架構概覽
- 🚀 實作順序（8 個 Phase）
- ✅ 檢查清單
- ⚠️ 注意事項

**適合對象**: 實作者、專案管理

**閱讀時間**: 10-15 分鐘

---

### 2. [REFACTOR_PLAN_V4.md](./REFACTOR_PLAN_V4.md) 📖 **完整計劃**

**完整重構計劃** - 2500+ 行詳細規格

包含內容:

#### 第一部分：分析與設計
- 📋 執行摘要
- 🔍 背景與動機（現有問題分析）
- 🏗️ 架構設計（元件架構圖）

#### 第二部分：實作細節（含完整程式碼）
- **Phase 1**: 型別與介面定義
  - `src/store.ts` 完整程式碼
  - `src/types.ts` 完整程式碼
  
- **Phase 2**: StorageRepository 實作
  - 完整類別實作
  - Hooks 整合邏輯
  
- **Phase 3**: StorageManager 實作
  - 磁碟管理邏輯
  - 快取機制
  
- **Phase 4**: Store 實作重構
  - `LocalStore.ts` 完整程式碼（含安全驗證）
  - `MemoryStore.ts` 完整程式碼
  - `NullStore.ts` 完整程式碼
  
- **Phase 5**: OrbitNebula 重構
  - 完整重構程式碼
  - 向後相容處理
  
- **Phase 6**: 測試補全
  - `LocalStore.test.ts` 完整測試案例
  - `security.test.ts` 安全測試（路徑遍歷）
  - `StorageManager.test.ts` 整合測試

- **Phase 7**: 文件更新
  - README.md 完整內容
  - API 文件
  - 遷移指南

#### 第三部分：品質保證
- 🔄 Breaking Changes 清單
- 🧪 測試策略
- 📖 遷移指南
- ✅ 實作檢查清單

**適合對象**: 實作者、程式碼審查

**閱讀時間**: 1-2 小時

---

## 🎯 快速導航

### 我想要...

#### 了解整體計劃
👉 先看 [REFACTOR_SUMMARY.md](./REFACTOR_SUMMARY.md) - 架構概覽

#### 開始實作
👉 看 [REFACTOR_SUMMARY.md](./REFACTOR_SUMMARY.md) - 實作檢查清單  
👉 看 [REFACTOR_PLAN_V4.md](./REFACTOR_PLAN_V4.md) - Phase 詳細程式碼

#### 複製貼上程式碼
👉 看 [REFACTOR_PLAN_V4.md](./REFACTOR_PLAN_V4.md) - 各 Phase 完整程式碼

#### 了解變更影響
👉 看 [REFACTOR_SUMMARY.md](./REFACTOR_SUMMARY.md) - Breaking Changes  
👉 看 [REFACTOR_PLAN_V4.md](./REFACTOR_PLAN_V4.md) - 遷移指南

#### 撰寫測試
👉 看 [REFACTOR_PLAN_V4.md](./REFACTOR_PLAN_V4.md) - Phase 6 測試程式碼

---

## 📊 重構規模

| 項目 | 數量 |
|------|------|
| 新增檔案 | 7 個 |
| 重構檔案 | 1 個 |
| 新增測試 | 4 個 |
| 程式碼行數 | ~1500 行 |
| 測試行數 | ~800 行 |
| 預計工時 | 7 小時 |
| 目標版本 | v4.0.0 |

---

## 🔑 核心改進

### 架構
- ✅ Manager + Store Driver 模式（與 Stasis 一致）
- ✅ 多磁碟支援
- ✅ 消除程式碼重複

### 功能
- ✅ `exists()` - 檢查檔案
- ✅ `copy()` - 複製檔案
- ✅ `move()` - 移動檔案
- ✅ `getMetadata()` - 檔案資訊
- ✅ `disk()` - 切換磁碟

### 品質
- ✅ 型別安全提升
- ✅ 安全測試（路徑遍歷）
- ✅ 測試覆蓋率 ≥ 85%

---

## 🚀 開始實作

### 步驟 1: 閱讀摘要
```bash
cat REFACTOR_SUMMARY.md
```

### 步驟 2: 按 Phase 實作
參考 `REFACTOR_PLAN_V4.md` 中各 Phase 的完整程式碼

### 步驟 3: 執行測試
```bash
bun test
bun run test:coverage
```

### 步驟 4: 更新文件
參考 `REFACTOR_PLAN_V4.md` Phase 7

---

## ❓ 常見問題

### Q1: 需要一次性完成嗎？
不需要。可以按 Phase 漸進式實作，每個 Phase 都可獨立測試。

### Q2: 會破壞現有功能嗎？
不會。所有 v3.x API 完全向後相容，舊版配置仍可使用。

### Q3: `list()` 功能為何無法實作？
目前 RuntimeAdapter 不支援 `readDir()`，需等待 @gravito/core 擴展。

### Q4: 測試覆蓋率要求？
- LocalStore: ≥ 90%
- MemoryStore: ≥ 85%
- StorageRepository: ≥ 90%
- StorageManager: ≥ 85%

### Q5: 如何處理向後相容？
計劃中已包含完整的向後相容處理，舊版配置和型別名稱都保留並標記 `@deprecated`。

---

## 📞 需要協助？

- 技術問題：參考 [REFACTOR_PLAN_V4.md](./REFACTOR_PLAN_V4.md) 相關章節
- 實作順序：參考 [REFACTOR_SUMMARY.md](./REFACTOR_SUMMARY.md) 實作檢查清單
- 程式碼範例：[REFACTOR_PLAN_V4.md](./REFACTOR_PLAN_V4.md) 各 Phase 包含完整程式碼

---

**祝實作順利！** 🎉
