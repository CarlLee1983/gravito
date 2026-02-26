---
title: Scaffold 藍圖引擎
description: 深入了解 Gravito Scaffold，這是用於生成領域衛星 (Satellites) 與擴展銀河架構 (Galaxy Architecture) 的強大腳手架工具。
---

# 🏗️ Scaffold 藍圖引擎

`@gravito/scaffold` 是 Gravito 生態系統中的 **Blueprint Engine (藍圖引擎)**。它不僅負責初始化新的專案（銀河宿主），更核心的功能是自動化生成標準化的 **領域衛星 (Satellites)**，並確保它們符合企業級的開發規範。

在 v1.6 "Galaxy" 版本中，Scaffold 已經全面轉向 **清單驅動開發 (MDD)**，自動生成包含 `manifest.json` 在內的完整結構。

---

## ✨ 核心特色

- 🛰️ **衛星專化**：一鍵生成符合 Clean Architecture 或 DDD 規範的領域衛星。
- 📜 **MDD 整合**：自動生成並配置 `manifest.json`，實現零配置發現。
- 🏢 **企業級原語**：內建 `AggregateRoot`, `DomainEvent`, `UseCase` 等高階開發模板。
- 🛠️ **CLI 與 API 雙模**：支援從終端機快速操作，也支援程式化大規模生成。

---

## 🚀 CLI 使用方式

### 1. 初始化銀河宿主 (Galaxy Host)
建立一個新的 Gravito 容器環境：

```bash
bunx gravito create my-galaxy
```

### 2. 生成領域衛星 (Satellite)
在現有的宿主專案中添加新的業務領域：

```bash
# 生成一個名為 'catalog' 的衛星，採用 DDD 架構
bun gravito make:satellite catalog --type ddd
```

### 3. 生成領域組件
在衛星內部快速添加代碼單元：

```bash
# 為 'catalog' 衛星生成一個新的控制器
bun gravito make:controller ProductController --satellite catalog

# 生成一個 UseCase
bun gravito make:usecase CreateProduct --satellite catalog
```

---

## 📐 架構藍圖 (Blueprints)

Scaffold 支援多種標準化的架構模板，滿足不同複雜度的業務需求：

| 模板 | 說明 | 適用場景 |
| :--- | :--- | :--- |
| `minimal` | 僅包含基礎路由與一個清單檔案 | 小型工具、簡單 API |
| `clean` | 嚴格分層的整潔架構 (Domain/Application/Infra) | 中型業務、邏輯清晰的服務 |
| `ddd` | 基於限界上下文的領域驅動設計 | 複雜業務、大型企業級系統 |

---

## 📄 生成結果：衛星標準結構

當您執行 `make:satellite` 時，Scaffold 會為您建立以下標準結構：

```text
src/satellites/catalog/
├── manifest.json        # 衛星身份證，定義路由與依賴
├── Application/         # 業務邏輯 (UseCases)
├── Domain/              # 核心領域 (Entities, Aggregates)
├── Infrastructure/      # 外部對接 (Repositories, DB)
└── Interface/           # 外部介面 (Controllers, Middleware)
```

---

## 🛠️ 程式化 API

您也可以在腳本中使用 Scaffold 進行自動化操作：

```ts
import { SatelliteGenerator } from '@gravito/scaffold';

const generator = new SatelliteGenerator({
  name: 'orders',
  type: 'ddd',
  targetDir: './src/satellites/orders'
});

await generator.generate();
console.log('🛰️ Satellite "orders" has entered the galaxy!');
```

---

## 🔗 延伸閱讀

- 🌌 [銀河全景圖](../../GALAXY_ARCHITECTURE_MAP.md)
- 🛰️ [領域衛星規範](../../spec/SATELLITE_SPEC.md)
- 📡 [Xenon 並行運行時](../architecture/xenon-architecture-deep-dive.md)
