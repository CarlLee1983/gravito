---
title: 專案結構
description: 深入瞭解 Gravito 應用程式的目錄佈局與架構設計。
---

# 專案結構

Gravito 遵循一種可預測且整潔的目錄結構。對於熟悉 MVC (如 Laravel) 的開發者來說會感到非常親切，同時它也針對效能與模組化進行了極致優化。

## 目錄佈局 (Enterprise MVC)

Gravito 預設生成的專案採用 **Enterprise MVC** 佈局，這最適合大多數的 Web 應用程序：

```text
my-gravito-app/
├── config/              # 框架與模組設定檔
│   ├── app.ts           # 核心應用程式設定
│   ├── database.ts      # 資料庫連接設定
│   └── auth.ts          # 認證與授權設定
├── src/
│   ├── Http/            # HTTP 傳輸層
│   │   ├── Controllers/ # 控制器 (處理請求邏輯)
│   │   ├── Middleware/  # 中介層 (過濾請求)
│   │   └── Kernel.ts    # HTTP 核心 (註冊全域中介層)
│   ├── Models/          # 資料模型 (Atlas ORM)
│   ├── Services/        # 商業邏輯層 (Business Logic)
│   ├── Providers/       # 服務提供者 (Service Providers)
│   ├── Exceptions/      # 例外處理規則
│   ├── routes.ts        # 路由定義
│   └── bootstrap.ts     # 應用程式引導程式
├── database/            # 資料庫相關資源
│   ├── migrations/      # 資料表遷移檔
│   ├── factories/       # 資料工廠 (測試數據生成)
│   └── seeders/         # 資料種子
├── public/              # 靜態資源 (圖片、 robots.txt)
├── tests/               # 測試案例 (Unit & Feature)
├── gravito.config.ts    # 專案根設定
├── package.json
└── tsconfig.json
```

---

## 核心目錄說明

### `config/`
包含所有應用程式的設定點。Gravito 鼓勵將不同功能的設定拆分到獨立的檔案中，以保持整潔。

### `src/Http/`
這是應用程式處理 Web 請求的入口。`Controllers` 負責接收輸入並返回回應，而 `Middleware` 提供了一個方便的機制來過濾進入應用的 HTTP 請求（例如驗證）。

### `src/Models/`
這裡存放您的 Atlas (ORM) 模型。每個模型通常代表資料庫中的一個資料表。

### `src/Providers/`
服務提供者是 Gravito 應用的「點火點」。它們負責將服務綁定到 **IoC 容器**，以及註冊中介層、事件監聽器等。

### `src/bootstrap.ts`
這是應用的引導檔案，負責初始化 `PlanetCore` 並加載所需的動力模組 (Orbits)。

---

## 核心哲學：星系架構 (Galaxy Architecture)

Gravito 採用「微核心 + 動力軌道」的設計模式：

1.  **PlanetCore (微核心)**: 核心極端精簡，僅負責生命週期、IoC 容器與 Hook 系統。
2.  **Orbits (動力軌道)**: 功能透過模組化方式擴充。例如：
    *   想要資料庫？加入 `@gravito/atlas`。
    *   需要驗證？加入 `@gravito/sentinel`。
    *   任務排程？加入 `@gravito/horizon`。

這種設計確保了「按需付費」的效能表現，您的應用只會運行真正需要的程式碼。

---

## 生命週期 (Lifecycle)

當您執行 `gravito dev` 或啟動伺服器時：

1.  **載入設定**: 系統讀取 `config/` 與 `gravito.config.ts`。
2.  **註冊提供者**: 執行所有 Service Providers 的 `register()` 方法，將服務注入容器。
3.  **引導提供者**: 執行所有 Service Providers 的 `boot()` 方法，此時所有服務皆已就緒。
4.  **路由匹配**: HTTP 請求進入 `Http/Kernel`，經過中介層後到達指定的 Controller。

## 多樣化的架構選擇

Gravito 的強大之處在於它不強迫您使用單一的開發範式。雖然上述的 MVC 結構是預設推薦的，但您隨時可以根據專案複雜度切換：

- **Clean Architecture**: 嚴格的依賴規則，將業務邏輯與框架完全解耦。
- **Domain-Driven Design (DDD)**: 適合超大型、複雜領域邏輯的模組化開發。

> **下一步**：如果您需要不同的架構，請查看 [架構模式與腳手架](./cli-init.md) 了解更多。

