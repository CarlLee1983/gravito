# Gravito CLI 使用範例指南

**完整版本**: Phase 2c Complete ✅
**最後更新**: 2026-03-10

---

## 目錄

1. [快速開始](#快速開始)
2. [互動模式](#互動模式)
3. [非互動模式 (CLI Flags)](#非互動模式-cli-flags)
4. [DDD 模組類型選擇](#ddd-模組類型選擇)
5. [所有可用 Flags](#所有可用-flags)
6. [常見場景](#常見場景)

---

## 快速開始

### 最簡單的方式：互動模式

```bash
npm create gravito-app my-project
# 或使用 Bun（推薦）
bun create gravito-app my-project
```

會提示您選擇：
- 📝 專案名稱
- 🏛️ 架構模式 (5 種選擇)
- 🥟 套件管理器 (bun/npm/yarn/pnpm)
- ✨ Spectrum Debug Dashboard

---

## 互動模式

### 完整互動流程

```bash
$ npm create gravito-app

🏗️ Gravito Enterprise Framework

專案名稱 (Project name)?
> payment-service

選擇架構模式 (Select architecture pattern):
> 🏛️ Domain-Driven Design (DDD)

選擇 DDD 模組範本 (Select DDD module template):
> 📜 Advanced (Event Sourcing)

選擇套件管理器 (Package manager):
> 🥟 Bun

是否安裝 Spectrum Debug Dashboard?
> ✅ Yes

✓ 正在建立專案結構...
✓ 專案結構已建立!
✓ 初始化 Git 倉庫...
✓ 使用 bun 安裝依賴...
✓ 依賴安裝完成!

✨ 專案建立成功

📋 下一步:
  1. cd payment-service
  2. bun run dev

閱讀 ARCHITECTURE.md 了解專案結構
```

### 選擇不同的架構

```bash
$ npm create gravito-app

🏗️ Gravito Enterprise Framework

專案名稱?
> my-api

選擇架構模式:
> 📦 Enterprise MVC

選擇套件管理器:
> npm

是否安裝 Spectrum Debug Dashboard?
> ❌ No
```

---

## 非互動模式 (CLI Flags)

### 基本語法

```bash
npm create gravito-app <project-name> [options]
```

### 所有可用選項

| Flag | 說明 | 範例 |
|------|------|------|
| `--architecture` | 架構模式 | `--architecture ddd` |
| `--ddd-type` | DDD 模組範本 (僅適用於 ddd) | `--ddd-type advanced` |
| `--pm` | 套件管理器 | `--pm bun` |
| `--skip-install` | 跳過依賴安裝 | `--skip-install` |
| `--skip-git` | 跳過 Git 初始化 | `--skip-git` |

---

## DDD 模組類型選擇

### 📦 Simple (Basic CRUD with Aggregates)

最適合學習和基本的 CRUD 操作。

```bash
# 互動方式
npm create gravito-app my-app
# 選擇: DDD → Simple

# CLI Flags 方式
npm create gravito-app my-app --architecture ddd --ddd-type simple

# 或使用簡寫 (使用 --pm 代替)
bun create gravito-app orders-api --arch ddd --ddd-type simple
```

**生成的模組包含**:
- 聚合根 (Aggregates)
- 實體和值物件 (Entities & Value Objects)
- 儲存庫介面 (Repository Interfaces)
- 應用服務 (Application Services)
- 資料傳輸物件 (DTOs)

**適用場景**:
- ✅ 學習 DDD 基礎
- ✅ 簡單的 CRUD 應用
- ✅ 單一聚合根的域模型
- ✅ 開始新項目

**範例命令**:
```bash
# 生成簡單的訂單 API
bun create gravito-app orders-service --architecture ddd --ddd-type simple

# 生成使用者管理服務
npm create gravito-app user-service --architecture ddd --ddd-type simple --pm npm
```

---

### 📜 Advanced (Event Sourcing)

完整的事件溯源模式，適合複雜的業務邏輯和完整的審計跟蹤。

```bash
# 互動方式
npm create gravito-app my-app
# 選擇: DDD → Advanced (Event Sourcing)

# CLI Flags 方式
npm create gravito-app my-app --architecture ddd --ddd-type advanced

# 使用 Bun (推薦)
bun create gravito-app payment-service --architecture ddd --ddd-type advanced
```

**生成的模組包含**:
- 事件溯源聚合根 (Event Sourcing Aggregates)
- 領域事件 (Domain Events)
- 事件儲存設置 (Event Store Setup)
- 事件應用器 (Event Appliers)
- Saga 模式支援

**適用場景**:
- ✅ 複雜的業務邏輯
- ✅ 完整的事件歷史記錄
- ✅ 事件重放能力
- ✅ 支付和金融系統
- ✅ 需要完整審計跟蹤

**範例命令**:
```bash
# 生成支付服務（含事件溯源）
bun create gravito-app payment-system --architecture ddd --ddd-type advanced

# 生成訂單管理服務（含 Saga 模式）
npm create gravito-app orders-system --architecture ddd --ddd-type advanced --pm npm

# 使用 Yarn
yarn create gravito-app inventory-service --architecture ddd --ddd-type advanced
```

---

### 🔍 CQRS Query Module

CQRS 模式的查詢端，優化讀取性能，支援事件投影。

```bash
# 互動方式
npm create gravito-app my-app
# 選擇: DDD → CQRS Query Module

# CLI Flags 方式
npm create gravito-app my-app --architecture ddd --ddd-type cqrs-query

# 使用 Bun
bun create gravito-app analytics-service --architecture ddd --ddd-type cqrs-query
```

**生成的模組包含**:
- 查詢優化的讀取模型 (Query-optimized Read Models)
- 事件投影器 (Event Projectors - Pure Functions)
- 查詢服務 (Query Services)
- 事件訂閱者 (Event Subscribers)
- 可選快取層 (Optional Caching Layer)

**適用場景**:
- ✅ 查詢性能優化
- ✅ CQRS 模式的查詢端
- ✅ 需要反正規化資料結構
- ✅ 結合 Advanced 模組使用
- ✅ 分析和報表系統

**範例命令**:
```bash
# 生成分析服務
bun create gravito-app analytics-service --architecture ddd --ddd-type cqrs-query

# 生成報表服務
npm create gravito-app reports-service --architecture ddd --ddd-type cqrs-query --pm npm

# 生成儀表板後端
pnpm create gravito-app dashboard-api --architecture ddd --ddd-type cqrs-query
```

---

## 所有可用 Flags

### `--architecture <type>`

指定架構模式，跳過互動選擇。

```bash
# 所有可用的架構類型
--architecture enterprise-mvc
--architecture clean
--architecture ddd
--architecture action-domain
--architecture standalone-engine
--architecture satellite

# 範例
bun create gravito-app my-app --architecture ddd
npm create gravito-app my-app --architecture enterprise-mvc
```

### `--ddd-type <type>`

**重要**: 只能與 `--architecture ddd` 一起使用。

```bash
# 所有可用的 DDD 模組類型
--ddd-type simple
--ddd-type advanced
--ddd-type cqrs-query

# 範例 - 正確用法
bun create gravito-app my-app --architecture ddd --ddd-type advanced

# 範例 - 錯誤用法 (會報錯)
bun create gravito-app my-app --architecture enterprise-mvc --ddd-type advanced
# ❌ 錯誤: --ddd-type 選項只適用於 --architecture ddd
```

### `--pm <manager>`

指定套件管理器，跳過互動選擇。

```bash
# 所有可用的套件管理器
--pm bun          # 推薦，最快
--pm npm          # Node.js 標準
--pm yarn         # Yarn Classic
--pm pnpm         # 高效磁碟使用

# 範例
bun create gravito-app my-app --pm bun
npm create gravito-app my-app --pm npm
```

### `--skip-install`

跳過依賴安裝。

```bash
# 建立專案但不安裝依賴
npm create gravito-app my-app --skip-install

# 後續手動安裝
cd my-app
bun install
```

### `--skip-git`

跳過 Git 初始化。

```bash
# 建立專案但不初始化 Git
npm create gravito-app my-app --skip-git

# 後續手動初始化
cd my-app
git init
git add .
git commit -m "Initial commit"
```

---

## 常見場景

### 場景 1：快速建立 DDD 項目進行學習

```bash
# 最簡單的方式 - 全部互動
bun create gravito-app learning-ddd

# 或直接指定選項
bun create gravito-app learning-ddd --architecture ddd --ddd-type simple --pm bun
```

**預期結果**:
- 建立基本的 DDD 項目結構
- 安裝所有依賴
- 初始化 Git 倉庫
- 提示下一步命令

---

### 場景 2：建立支付系統（含事件溯源）

```bash
# 互動方式
npm create gravito-app payment-system

# 直接指定所有選項
npm create gravito-app payment-system \
  --architecture ddd \
  --ddd-type advanced \
  --pm npm

# 使用 Bun（推薦）
bun create gravito-app payment-system \
  --architecture ddd \
  --ddd-type advanced \
  --pm bun
```

**特色**:
- ✅ 完整的事件溯源支援
- ✅ 適合複雜的支付邏輯
- ✅ 自動初始化 Git

---

### 場景 3：建立多個相關模組（命令端 + 查詢端）

```bash
# 首先建立命令端（Advanced）
bun create gravito-app payment-write-service \
  --architecture ddd \
  --ddd-type advanced

# 然後建立查詢端（CQRS Query）
bun create gravito-app payment-read-service \
  --architecture ddd \
  --ddd-type cqrs-query
```

**架構**:
```
payment-system/
├── payment-write-service/    # 命令端（Advanced + Event Sourcing）
│   └── 事件發布器 (Event Publisher)
│
└── payment-read-service/     # 查詢端（CQRS Query Module）
    └── 事件訂閱者 (Event Subscriber)
```

---

### 場景 4：快速試驗（跳過安裝和 Git）

```bash
# 建立項目結構，但跳過耗時的操作
bun create gravito-app temp-project \
  --architecture ddd \
  --ddd-type simple \
  --skip-install \
  --skip-git

# 稍後再決定是否安裝
cd temp-project
bun install  # 如果決定使用此項目
```

---

### 場景 5：使用 Enterprise MVC（非 DDD）

```bash
# 互動方式
npm create gravito-app my-app
# 選擇: Enterprise MVC

# 直接指定
npm create gravito-app my-app --architecture enterprise-mvc --pm npm
```

**注意**: `--ddd-type` 只適用於 `--architecture ddd`

---

## 故障排除

### 錯誤：「無效的 DDD 模組類型」

```bash
# ❌ 錯誤
bun create gravito-app my-app --ddd-type invalid-type

# ✅ 正確
bun create gravito-app my-app --ddd-type simple
```

**允許的值**: `simple`, `advanced`, `cqrs-query`

---

### 錯誤：「--ddd-type 選項只適用於 --architecture ddd」

```bash
# ❌ 錯誤
bun create gravito-app my-app --architecture enterprise-mvc --ddd-type advanced

# ✅ 正確
bun create gravito-app my-app --architecture ddd --ddd-type advanced
```

---

## 專案啟動後

建立完項目後，進行以下步驟：

```bash
# 進入項目目錄
cd my-project

# 啟動開發伺服器
bun run dev

# 運行測試
bun test

# 檢查程式碼風格
bun run lint

# 自動格式化
bun run format

# 編譯到生產版本
bun run build
```

---

## 進一步學習

- 📚 詳閱 `ARCHITECTURE.md` - 了解項目結構
- 📖 查看 `DDD_MODULE_TYPE_SELECTION.md` - 更多 CLI 細節
- 🏛️ 參考 `docs/ARCHITECTURE_DDD_DCI.md` - DDD + DCI 設計原則

---

## 快速參考表

| 需求 | 命令 |
|------|------|
| 快速開始學習 | `bun create gravito-app my-app` |
| 建立支付系統 | `bun create gravito-app payment --arch ddd --ddd-type advanced` |
| 建立分析服務 | `bun create gravito-app analytics --arch ddd --ddd-type cqrs-query` |
| 使用 npm | `npm create gravito-app my-app --pm npm` |
| 跳過安裝 | `bun create gravito-app my-app --skip-install` |
| Enterprise MVC | `bun create gravito-app my-app --architecture enterprise-mvc` |

---

**需要幫助？** 查看每個命令的幫助：
```bash
npm create gravito-app --help
```

Built with ❤️ using Gravito Framework + Claude Code
