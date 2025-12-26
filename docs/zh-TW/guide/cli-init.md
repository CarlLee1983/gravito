---
title: 架構模式 (Architectural Patterns)
description: 學習如何使用 Gravito CLI 建立不同架構風格的專案模板。
---

# 架構模式 (Architectural Patterns)


## 快速開始

```bash
# 互動模式
npx gravito init my-app

# 使用選項
npx gravito init my-app --architecture ddd --pm bun
```

## 選項

| 選項 | 說明 | 預設值 |
|------|------|--------|
| `--architecture`, `-a` | 架構模式 | (互動選擇) |
| `--pm` | 套件管理器 (bun, npm, pnpm, yarn) | bun |
| `--skip-install` | 跳過依賴安裝 | false |
| `--skip-git` | 跳過 git 初始化 | false |

## 架構模式

### Luminosity (Static / Light)

這是最輕量化的架構，專為靜態網站、個人部落格或純前端導向的應用程式設計。它完全跳過了伺服器端的 Controller 層級，專注於極速的靜態生成 (SSG)。

```bash
gravito init my-site --architecture luminosity
```

**目錄結構：**
```
src/
├── client/                 # 前端核心
│   ├── components/        # 共享元件 (React/Vue)
│   └── pages/             # 實質頁面內容
├── routes/                 # 路由定義
│   └── index.ts           # URL 映射器
├── bootstrap.ts            # 輕量級點火器
├── freeze.config.ts        # SSG 靜態生存設定
└── build-static.ts         # 靜態建置腳本
```

**適用於：**
- 靜態文件站、部落格
- 行銷活動頁面
- 不需要複雜後端邏輯的 SPA

---

### Enterprise MVC

受 Laravel 啟發的 MVC 結構，適合熟悉 Laravel 慣例的團隊。

```bash
gravito init my-app --architecture enterprise-mvc
```

**目錄結構：**
```
src/
├── Http/
│   ├── Kernel.ts           # Middleware 管理
│   ├── Controllers/        # 請求處理器
│   └── Middleware/         # 請求攔截器
├── Services/               # 業務邏輯
├── Repositories/           # 資料存取
├── Models/                 # 資料實體
├── Providers/              # 服務提供者
├── Exceptions/             # 錯誤處理
├── bootstrap.ts            # 入口點
└── routes.ts               # 路由定義
```

**適用於：**
- 從 Laravel/Express 遷移的團隊
- 傳統 Web 應用程式
- 需要快速開發的專案

---

### Clean Architecture

Robert C. Martin 的整潔架構，具有嚴格的依賴規則。

```bash
gravito init my-app --architecture clean
```

**目錄結構：**
```
src/
├── Domain/                 # 企業業務規則（無外部依賴）
│   ├── Entities/          # 具有身份的業務物件
│   ├── ValueObjects/      # 不可變的值類型
│   ├── Interfaces/        # Repository 介面
│   └── Exceptions/        # 領域層錯誤
├── Application/           # 應用程式業務規則
│   ├── UseCases/          # 業務操作
│   ├── DTOs/              # 資料傳輸物件
│   └── Interfaces/        # 服務介面
├── Infrastructure/        # 框架與驅動程式
│   ├── Persistence/       # 資料庫實作
│   ├── ExternalServices/  # 第三方整合
│   └── Providers/         # 服務提供者
├── Interface/             # 介面適配器
│   ├── Http/Controllers/  # HTTP 處理器
│   ├── Http/Routes/       # 路由定義
│   └── Presenters/        # 回應格式化
└── bootstrap.ts           # 入口點
```

**依賴規則：**
> 內層對外層一無所知。

- **Domain**：純 TypeScript，無框架依賴
- **Application**：僅依賴 Domain
- **Infrastructure**：實作 Domain 介面
- **Interface**：呼叫 Application Use Cases

**適用於：**
- 長期維護的企業應用程式
- 強調可測試性的團隊
- 需要嚴格關注點分離的專案

---

### Domain-Driven Design (DDD)

具有限界上下文和 CQRS 模式的模組化架構。

```bash
gravito init my-app --architecture ddd
```

**目錄結構：**
```
src/
├── Bootstrap/              # 應用程式啟動
│   ├── app.ts             # 核心初始化
│   ├── providers.ts       # Provider 註冊
│   ├── events.ts          # 事件分發器
│   └── routes.ts          # 路由註冊
├── Shared/                 # 跨模組共用元件
│   ├── Domain/
│   │   ├── Primitives/    # Entity, ValueObject, AggregateRoot
│   │   ├── Events/        # 領域事件基類
│   │   └── ValueObjects/  # 共用值物件 (Id, Email, Money)
│   ├── Infrastructure/    # 共用基礎設施 (EventBus)
│   └── Exceptions/        # 全域例外處理
├── Modules/                # 限界上下文
│   ├── Ordering/          # 訂單管理模組
│   │   ├── Domain/        # 聚合、事件、Repository
│   │   ├── Application/   # Commands, Queries, DTOs
│   │   └── Infrastructure/# 持久化、Providers
│   └── Catalog/           # 商品目錄模組
└── main.ts                 # 伺服器入口點
```

**核心概念：**
- **限界上下文** 作為獨立模組
- **聚合** 作為一致性邊界
- **領域事件** 用於跨模組通訊
- **CQRS**（命令查詢職責分離）

**適用於：**
- 複雜的領域邏輯
- 微服務準備
- 實踐 DDD 的團隊

## 生成的檔案

所有架構都包含：

| 檔案 | 說明 |
|------|------|
| `package.json` | 依賴和腳本 |
| `tsconfig.json` | TypeScript 設定 |
| `.env.example` | 環境變數範本 |
| `.gitignore` | Git 忽略規則 |
| `ARCHITECTURE.md` | 架構說明文件 |
| `README.md` | 專案 README |

## 建立後的下一步

```bash
cd my-app

# 啟動開發伺服器
bun run dev

# 類型檢查
bun run typecheck

# 執行測試
bun test
```

## 另請參閱

- [專案結構](/zh-TW/docs/guide/project-structure)
- [服務提供者](/zh-TW/docs/guide/core-concepts#service-providers)
- [路由](/zh-TW/docs/guide/routing)
