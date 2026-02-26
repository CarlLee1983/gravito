---
title: 專案結構
description: 深入了解 Gravito 系統的目錄配置與銀河架構 (Galaxy Architecture) 配置。
---

# 📁 專案結構

Gravito 遵循可預測且清爽的目錄結構。在 v1.6+ 中，我們將架構演進為支援 **銀河架構 (Galaxy Architecture)**，讓您的應用能從單一網站平滑擴展到複雜的多衛星系統。

---

## 🛰️ 銀河宿主佈局 (v1.6+ 標準)

預設情況下，一個新的 Gravito 專案就是一個 **銀河宿主 (Galaxy Host)**。它負責協調多個 **領域衛星 (Satellites)** 並提供全局的基礎設施 (**Orbits**)。

```text
my-galaxy/
├── src/
│   ├── satellites/      # 領域特定模組 (領域衛星)
│   │   ├── catalog/     # 例如：商品目錄領域
│   │   │   ├── manifest.json
│   │   │   ├── Controllers/
│   │   │   └── Models/
│   │   └── auth/        # 例如：身份驗證領域
│   ├── orbits/          # 宿主層級的自定義軌道模組
│   ├── config/          # 全局配置
│   ├── bootstrap.ts     # 銀河宿主初始化器 (Xenon)
│   └── index.ts         # 進入點
├── static/              # 靜態資源 (Favicon, manifest)
├── tests/               # 全局整合測試
├── gravito.config.ts    # 專案根目錄元數據
├── package.json
└── tsconfig.json
```

---

## 🧩 衛星內部結構 (整潔架構)

`src/satellites/` 下的每個衛星都是一個獨立的業務單元。我們建議在衛星內部使用 **整潔架構 (Clean Architecture)** 模式：

```text
satellites/catalog/
├── manifest.json        # 宣告式衛星清單
├── Application/         # UseCases 與業務邏輯
├── Domain/              # 實體 (Entities)、值對象、聚合
├── Infrastructure/      # 存儲庫 (Repositories) 與外部適配器
└── Interface/           # 控制器 (Controllers) 與 HTTP 中間件
```

---

## 🏗️ 核心組件說明

### `src/satellites/`
這是您的業務價值所在。每個資料夾代表一個 **領域衛星**。衛星之間是解耦的；它們不會直接互相 import，而是透過事件匯流排 (Event Bus) 或共享核心進行通訊。

### `manifest.json`
每個衛星必須包含一個 `manifest.json`。這個檔案告訴 **Xenon 宿主** 如何載入該衛星，定義其路由、依賴關係以及註冊的 Hook。

### `src/bootstrap.ts`
您銀河系的「指揮中心」。此檔案負責初始化 `PlanetCore`、註冊全域軌道模組（如 Resilience 或 Cache），並使用 **XenonHost** 來發現並啟動衛星。

### `gravito.config.ts`
整個生態系統的高階配置。在這裡您可以定義專案名稱、端口、環境變數以及全域功能開關。

---

## 🌌 銀河架構設計哲學

Gravito 採用「宿主 + 衛星」的設計模式：

1.  **PlanetCore (微核心)**：刻意保持極小化，僅處理應用程式生命週期與 IoC 容器。
2.  **Orbits (可插拔模組)**：在宿主層級添加的基礎設施功能（例如用於資料庫的 `@gravito/atlas`，用於安全的 `@gravito/resilience`）。
3.  **Xenon (並行運行時)**：並行執行衛星的引擎，提供極高的資源密度與隔離性。

---

## 🔄 啟動生命週期

當您執行 `bun dev` 或啟動伺服器時：

1.  **宿主點火 (Host Ignition)**：`PlanetCore` 啟動並載入核心配置。
2.  **軌道安裝 (Orbit Installation)**：基礎設施模組 (Orbits) 將其服務註冊到容器中。
3.  **衛星發現 (Satellite Discovery)**：**Xenon 宿主** 掃描衛星目錄中的 `manifest.json` 檔案。
4.  **並行啟動 (Parallel Boot)**：衛星並行初始化。掛載路由、註冊服務提供者。
5.  **升空 (Liftoff)**：HTTP 樞紐 (Photon) 開始接收流量並將其導向正確的衛星。

---

## 🔗 接下來
- 📜 [MDD：清單驅動開發](../architecture/config-contract.md)
- 📡 [Xenon 並行運行時](../architecture/xenon-architecture-deep-dive.md)
- 🚦 [基礎路由導覽](../basics/routing.md)
