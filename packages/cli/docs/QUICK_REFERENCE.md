# Gravito CLI 快速參考卡

**Phase 2c Complete** ✅ | 2026-03-10

---

## ⚡ 超快速開始

```bash
# 最簡單的方式
bun create gravito-app my-app

# 使用 npm
npm create gravito-app my-app
```

---

## 🎯 DDD 模組類型快速選擇

### 我應該選擇哪一個？

```
簡單的 CRUD 應用 → Simple ✅
  └─ 待辦事項、部落格、簡單 API

複雜的業務邏輯 → Advanced ✅
  └─ 支付系統、訂單管理、交易平台

讀取為主的應用 → CQRS Query ✅
  └─ 分析儀表板、報表、聚合服務
```

---

## 📝 一行命令建立項目

### Simple (CRUD)
```bash
bun create gravito-app orders-api --architecture ddd --ddd-type simple
npm create gravito-app user-api --pm npm --architecture ddd --ddd-type simple
```

### Advanced (Event Sourcing)
```bash
bun create gravito-app payment-system --architecture ddd --ddd-type advanced
npm create gravito-app booking-system --pm npm --architecture ddd --ddd-type advanced
```

### CQRS Query (Read Optimized)
```bash
bun create gravito-app analytics-api --architecture ddd --ddd-type cqrs-query
npm create gravito-app reports-api --pm npm --architecture ddd --ddd-type cqrs-query
```

---

## 🚀 所有可用命令

### 架構選項
```bash
--architecture enterprise-mvc      # Laravel 風格 MVC
--architecture clean               # Uncle Bob Clean Arch
--architecture ddd                 # 域驅動設計 (DDD)
--architecture action-domain       # 單一 Action Controller
--architecture standalone-engine   # 高性能引擎
--architecture satellite           # 模塊化服務
```

### DDD 模組類型 (僅限 --architecture ddd)
```bash
--ddd-type simple          # 基本 CRUD 結構
--ddd-type advanced        # 事件溯源完整支援
--ddd-type cqrs-query      # CQRS 查詢端優化
```

### 套件管理器
```bash
--pm bun      # 最快 (推薦)
--pm npm      # Node.js 標準
--pm yarn     # Yarn Classic
--pm pnpm     # 高效磁碟
```

### 其他選項
```bash
--skip-install   # 不安裝依賴
--skip-git       # 不初始化 Git
```

---

## 💡 常見命令組合

### 場景 1：快速學習 DDD

```bash
bun create gravito-app learning-ddd
# 選擇: Simple, Bun, Yes
```

### 場景 2：支付系統（含事件溯源）

```bash
bun create gravito-app payment-system \
  --architecture ddd \
  --ddd-type advanced \
  --pm bun
```

### 場景 3：分析服務（讀取優化）

```bash
bun create gravito-app analytics \
  --architecture ddd \
  --ddd-type cqrs-query \
  --pm bun
```

### 場景 4：使用 npm 而非 Bun

```bash
npm create gravito-app my-app \
  --architecture ddd \
  --ddd-type simple \
  --pm npm
```

### 場景 5：快速試驗（跳過安裝）

```bash
bun create gravito-app temp \
  --architecture ddd \
  --ddd-type simple \
  --skip-install \
  --skip-git
```

---

## ❌ 常見錯誤

### ❌ 錯誤 1: 無效的 ddd-type

```bash
# ❌ 這會失敗
bun create gravito-app my-app --ddd-type event-sourcing

# ✅ 正確的值
--ddd-type simple
--ddd-type advanced
--ddd-type cqrs-query
```

### ❌ 錯誤 2: ddd-type 與非 ddd 架構混用

```bash
# ❌ 這會失敗
bun create gravito-app my-app \
  --architecture enterprise-mvc \
  --ddd-type advanced

# ✅ 正確用法
bun create gravito-app my-app \
  --architecture ddd \
  --ddd-type advanced
```

### ❌ 錯誤 3: 拼寫錯誤

```bash
# ❌ 這會失敗
bun create gravito-app my-app --pm bumb

# ✅ 正確的套件管理器
--pm bun
--pm npm
--pm yarn
--pm pnpm
```

---

## 📊 模組類型對比表

| 功能 | Simple | Advanced | CQRS Query |
|------|--------|----------|-----------|
| CRUD 操作 | ✅ | ✅ | ❌ |
| 事件歷史 | ❌ | ✅ | ✅ |
| 事件溯源 | ❌ | ✅ | ❌ |
| 讀模型優化 | ❌ | ❌ | ✅ |
| 複雜度 | 🟢 低 | 🔴 高 | 🟡 中 |
| 學習曲線 | 🟢 簡單 | 🔴 困難 | 🟡 中等 |
| 實現時間 | 快 (1-2天) | 慢 (3-5天) | 中 (2-3天) |

---

## 🎓 選擇決策樹

```
需要完整審計跟蹤？
├─ 是 → Advanced ✅
└─ 否
   ├─ 主要是讀取操作？
   │  ├─ 是 → CQRS Query ✅
   │  └─ 否 → Simple ✅
   └─ 還是 Simple ✅
```

---

## 📦 安裝後的下一步

```bash
# 進入項目
cd my-app

# 啟動開發伺服器
bun run dev

# 執行測試
bun test

# 檢查程式碼風格
bun run lint

# 自動格式化
bun run format

# 編譯生產版本
bun run build
```

---

## 📚 完整文檔位置

| 文檔 | 描述 |
|------|------|
| `CLI_USAGE_EXAMPLES.md` | 詳細的使用範例和場景 |
| `DDD_MODULE_DECISION_GUIDE.md` | 完整的決策指南 |
| `DDD_MODULE_TYPE_SELECTION.md` | CLI 實現細節 |

---

## 🔗 快速連結

```bash
# 查看幫助
npm create gravito-app --help

# 查看 CLI 詳細選項
bun create gravito-app --help
```

---

## ✨ Pro 技巧

### 1. 批量建立多個模組

```bash
# 建立微服務架構
bun create gravito-app payment-write --architecture ddd --ddd-type advanced
bun create gravito-app payment-read --architecture ddd --ddd-type cqrs-query
bun create gravito-app user-api --architecture ddd --ddd-type simple
```

### 2. 使用環境變數跳過提示

```bash
# 全部非互動建立
npm create gravito-app my-app \
  --architecture ddd \
  --ddd-type simple \
  --pm npm \
  --skip-install
```

### 3. 快速測試不同架構

```bash
# 測試 DDD
bun create gravito-app test-ddd --architecture ddd --skip-install --skip-git

# 測試 Clean
bun create gravito-app test-clean --architecture clean --skip-install --skip-git

# 比較和分析
```

---

## 🆘 常見問題

**Q: 可以稍後改變模組類型嗎？**
A: 可以，但有工作量。最好一開始就選擇對。

**Q: 小團隊應該選哪個？**
A: 1-2 人選 Simple，3+ 人可選 Advanced。

**Q: 能混合使用不同類型嗎？**
A: 可以！在微服務架構中非常常見。

**Q: 需要多長時間學習？**
A: Simple (1-2 天), Advanced (3-5 天), CQRS (2-3 天)

---

## 📞 需要幫助？

1. 閱讀 `DDD_MODULE_DECISION_GUIDE.md` 決定選擇
2. 查看 `CLI_USAGE_EXAMPLES.md` 了解詳細用法
3. 運行 `npm create gravito-app --help` 查看幫助

---

**記住**: 選擇適合當前需求的模組類型，不要過度工程化！

Built with ❤️ using Gravito Framework + Claude Code
