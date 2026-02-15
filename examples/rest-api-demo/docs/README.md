# 📚 REST API Demo 文檔中心

**快速找到你需要的文檔**

---

## 🎓 學習者指南

### 🟢 **初級：完全新手**

如果你是 **DDD 或 Clean Architecture 的新手**，從這裡開始：

📖 **[DDD_LEARNING_GUIDE.md](./DDD_LEARNING_GUIDE.md)** ⭐ 最全面

- 從零開始理解 DDD 概念
- Entity、Value Object、Aggregate、Repository 等完整講解
- 36+ 代碼示例（對比式 ✅ vs ❌）
- 4 週循序漸進計劃
- 完整的檢查清單
- **預計耗時**：4-5 週（每週 5-10 小時）

### 🟡 **中級：開發者**

已經理解基本概念，想要深入系統架構和實現細節：

🏗️ **[ARCHITECTURE.md](./ARCHITECTURE.md)**

- 四層架構詳細設計
- 關鍵設計模式（Repository、DI、Event-Driven）
- 分層快取策略
- 連接池管理
- 安全架構
- **預計耗時**：2-3 小時

📝 **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)**

- 逐步實現新功能的指南
- 最佳實踐和陷阱避免
- 完整的代碼示例
- 測試策略

### 🟠 **高級：優化師**

想要進行性能優化、故障排除或最佳實踐：

⚡ **[BEST_PRACTICES.md](./BEST_PRACTICES.md)**

- 代碼質量最佳實踐
- 性能優化技巧
- 安全考慮事項
- 可維護性建議

🔧 **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**

- 常見問題及解決方案
- 調試技巧
- 性能診斷
- 日誌分析

### 📖 **API 使用者**

只需了解如何使用 API 端點：

🔗 **[API_GUIDE.md](./API_GUIDE.md)**

- 所有端點的完整文檔
- 請求/響應格式
- 認證和授權
- 速率限制信息

---

## 📚 文檔地圖

### 按主題分類

| 主題 | 文檔 | 難度 | 用途 |
|------|------|------|------|
| **DDD 學習** | DDD_LEARNING_GUIDE | 初級 | 理解概念和設計原則 |
| **架構設計** | ARCHITECTURE | 中級 | 系統整體設計 |
| **架構圖表** ⭐ | ARCHITECTURE_DIAGRAMS | 中級 | 視覺化流程和架構 |
| **設計模式** ⭐ | DESIGN_PATTERNS | 中級 | 11 個設計模式實現 |
| **實現指南** | IMPLEMENTATION_GUIDE | 中級 | 實現新功能 |
| **最佳實踐** | BEST_PRACTICES | 高級 | 代碼質量和性能 |
| **故障排除** | TROUBLESHOOTING | 高級 | 問題診斷和修復 |
| **API 文檔** | API_GUIDE | 初級 | API 使用 |

### 按技術主題分類

#### 🎯 核心概念

- Entity、Value Object、Aggregate → [DDD_LEARNING_GUIDE](./DDD_LEARNING_GUIDE.md)
- Repository 模式 → [ARCHITECTURE](./ARCHITECTURE.md) + [DESIGN_PATTERNS](./DESIGN_PATTERNS.md)
- Dependency Injection → [ARCHITECTURE](./ARCHITECTURE.md) + [DESIGN_PATTERNS](./DESIGN_PATTERNS.md)

#### 🏗️ 架構模式

- Clean Architecture 四層 → [DDD_LEARNING_GUIDE](./DDD_LEARNING_GUIDE.md) + [ARCHITECTURE](./ARCHITECTURE.md)
- 事件驅動架構 → [ARCHITECTURE](./ARCHITECTURE.md) + [DESIGN_PATTERNS](./DESIGN_PATTERNS.md)
- Domain Events → [DDD_LEARNING_GUIDE](./DDD_LEARNING_GUIDE.md)

#### 🎨 設計模式

- 創建型（Factory、Builder、Singleton） → [DESIGN_PATTERNS](./DESIGN_PATTERNS.md)
- 結構型（Adapter、Decorator、Proxy） → [DESIGN_PATTERNS](./DESIGN_PATTERNS.md)
- 行為型（Strategy、Observer、State、Command） → [DESIGN_PATTERNS](./DESIGN_PATTERNS.md)
- 特殊模式（Repository、DI、Specification） → [DESIGN_PATTERNS](./DESIGN_PATTERNS.md)

#### ⚡ 性能優化

- 分層快取 → [ARCHITECTURE](./ARCHITECTURE.md) + [BEST_PRACTICES](./BEST_PRACTICES.md)
- 連接池管理 → [ARCHITECTURE](./ARCHITECTURE.md)
- 查詢優化 → [ARCHITECTURE](./ARCHITECTURE.md)

#### 🔐 安全性

- 認證與授權 → [ARCHITECTURE](./ARCHITECTURE.md) + [BEST_PRACTICES](./BEST_PRACTICES.md)
- 輸入驗證 → [ARCHITECTURE](./ARCHITECTURE.md)
- 速率限制 → [API_GUIDE](./API_GUIDE.md)

#### 🧪 測試

- 測試策略 → [IMPLEMENTATION_GUIDE](./IMPLEMENTATION_GUIDE.md)
- 單元測試 → [BEST_PRACTICES](./BEST_PRACTICES.md)

---

## 🚀 常見場景快速導航

### 場景 1：我是新開發者，想要理解整個系統

```
推薦順序：
1️⃣  [DDD_LEARNING_GUIDE.md](./DDD_LEARNING_GUIDE.md) - 學習核心概念（第 1-2 週）
2️⃣  [ARCHITECTURE.md](./ARCHITECTURE.md) - 理解系統設計（第 3 天）
3️⃣  瀏覽源代碼，對應學到的概念（第 4-5 天）
```

### 場景 2：我想實現一個新功能

```
推薦順序：
1️⃣  [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - 快速參考
2️⃣  查看類似功能的源代碼（參考現有實現）
3️⃣  [BEST_PRACTICES.md](./BEST_PRACTICES.md) - 避免常見陷阱
4️⃣  編寫測試（參考現有測試）
```

### 場景 3：系統出現性能問題

```
推薦順序：
1️⃣  [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 診斷問題
2️⃣  [ARCHITECTURE.md](./ARCHITECTURE.md) - 理解設計決策
3️⃣  [BEST_PRACTICES.md](./BEST_PRACTICES.md) - 性能優化技巧
```

### 場景 4：我只是想使用 API

```
推薦：
👉 [API_GUIDE.md](./API_GUIDE.md) - 快速上手
```

### 場景 5：我在修復 Bug

```
推薦順序：
1️⃣  [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 查找常見問題
2️⃣  [ARCHITECTURE.md](./ARCHITECTURE.md) - 理解相關組件
3️⃣  查看相關源代碼
4️⃣  添加测试以重现和修复
```

---

## 📊 文檔統計

| 文檔 | 行數 | 代碼示例/圖表 | 預計閱讀時間 |
|------|------|-------------|------------|
| DDD_LEARNING_GUIDE | 1,200+ | 36+ 代碼 | 4-5 小時 |
| ARCHITECTURE | 500+ | 20+ 代碼 | 2-3 小時 |
| ARCHITECTURE_DIAGRAMS ⭐ | 600+ | 8 個 Mermaid 圖表 | 1-2 小時 |
| DESIGN_PATTERNS ⭐ | 1,000+ | 11 個完整實現 | 3-4 小時 |
| IMPLEMENTATION_GUIDE | 600+ | 25+ 代碼 | 2-3 小時 |
| BEST_PRACTICES | 400+ | 15+ 代碼 | 1-2 小時 |
| TROUBLESHOOTING | 300+ | 10+ 代碼 | 1-2 小時 |
| API_GUIDE | 400+ | 50+ 代碼 | 1-2 小時 |
| **總計** | **5,000+** | **67 代碼 + 8 圖表** | **16-23 小時** |

---

## 🎓 推薦學習路徑

### 路徑 A：完整學習（適合新開發者）

```
第 1 天：DDD_LEARNING_GUIDE（第 1-2 部分）
第 2 天：DDD_LEARNING_GUIDE（第 3-4 部分）
第 3 天：ARCHITECTURE.md
第 4 天：IMPLEMENTATION_GUIDE.md
第 5 天：實踐項目（創建新模塊）
```

**預計時間**：5 天（每天 2-3 小時）

### 路徑 B：快速上手（適合有經驗的開發者）

```
第 1 天：DDD_LEARNING_GUIDE（快速瀏覽）
第 2 天：ARCHITECTURE.md
第 3 天：開始編碼
```

**預計時間**：3 天（每天 2-3 小時）

### 路徑 C：僅使用 API（適合消費者）

```
直接查看：API_GUIDE.md
```

**預計時間**：30 分鐘

---

## 💡 使用技巧

### 1. 搜索功能

使用你的編輯器或瀏覽器的搜索（Cmd+F / Ctrl+F）快速找到相關內容：

- 搜索 `Repository Pattern` → 找到 Repository 設計
- 搜索 `❌` → 找到所有反面例子
- 搜索 `✅` → 找到所有最佳實踐

### 2. 代碼示例

所有代碼示例都能直接在 IDE 中運行或作為參考：

```
✅ 正確的做法
❌ 錯誤的做法
// 評論說明原因
```

### 3. 文檔導航

- 每份文檔都有 **目錄**（通常在開頭）
- 使用 Markdown 的 **目錄跳轉** 快速導航
- 文檔之間有 **交叉引用** 方便相關主題查閱

### 4. 實踐代碼

所有示例代碼都可以在 `src/` 目錄找到實際實現：

- 文檔中的 `src/domain/user/User.ts` 即指向實際文件
- 可以對應查看真實代碼的完整實現

---

## ❓ 常見問題

**Q: 我應該按什麼順序閱讀文檔？**

A: 根據你的背景選擇推薦的學習路徑。新手建議先讀 DDD_LEARNING_GUIDE。

**Q: 代碼示例能運行嗎？**

A: 文檔中的代碼示例都是簡化版本，便於理解。完整實現在 `src/` 目錄。

**Q: 這些文檔會更新嗎？**

A: 是的，當代碼或設計有重大變更時會更新文檔。

**Q: 如何提出改進建議？**

A: 歡迎提交 Issue 或 Pull Request！

---

## 📞 需要幫助？

- 📖 **概念問題** → 查看 [DDD_LEARNING_GUIDE](./DDD_LEARNING_GUIDE.md)
- 🏗️ **架構問題** → 查看 [ARCHITECTURE](./ARCHITECTURE.md)
- 🐛 **Bug 修復** → 查看 [TROUBLESHOOTING](./TROUBLESHOOTING.md)
- 📝 **實現問題** → 查看 [IMPLEMENTATION_GUIDE](./IMPLEMENTATION_GUIDE.md)
- 🚀 **性能問題** → 查看 [BEST_PRACTICES](./BEST_PRACTICES.md)

---

## 📍 文檔版本信息

| 文檔 | 最後更新 | 版本 |
|------|---------|------|
| DDD_LEARNING_GUIDE | 2026-02-14 | 1.0 |
| ARCHITECTURE | 2026-02-13 | 1.0 |
| ARCHITECTURE_DIAGRAMS | 2026-02-14 | 1.0 ⭐ |
| DESIGN_PATTERNS | 2026-02-14 | 1.0 ⭐ |
| IMPLEMENTATION_GUIDE | 2026-02-13 | 1.0 |
| BEST_PRACTICES | 2026-02-13 | 1.0 |
| TROUBLESHOOTING | 2026-02-13 | 1.0 |
| API_GUIDE | 2026-02-13 | 1.0 |

---

**祝你學習和開發愉快！** 🚀

有任何問題或建議，歡迎提交 Issue 或 Pull Request！
