# gravito-core

> The Micro-kernel for Galaxy Architecture. Lightweight, extensible, and built on Hono & Bun.

[![npm version](https://img.shields.io/npm/v/gravito-core.svg)](https://www.npmjs.com/package/gravito-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

# Gravito 核心概念

歡迎來到 Gravito Core v0.3.0-alpha.0！🚀

Gravito 是一個創新的、受到星系啟發的後端架構，構建於 [Hono](https://hono.dev) 和 [Bun](https://bun.sh) 之上。其設計理念是提供一個微核心 (PlanetCore)，讓開發者能夠透過軌道 (Orbits) 和衛星 (Satellites) 來擴展功能。

## 🌌 星系架構 (Galaxy Architecture)

Gravito 遵循獨特的設計模式：

1.  **PlanetCore (微核心)**:
    *   這是萬有引力的中心。它是一個極簡的、高效能的基底，負責處理：
        *   生命週期管理 (Liftoff)
        *   Hook 系統 (Filters & Actions)
        *   基本錯誤處理
        *   設定 (Config) 與日誌 (Logger) 管理
    *   它**不知道**任何關於資料庫、驗證或業務邏輯的資訊。

2.  **Orbits (標準擴充模組)**:
    *   圍繞核心運行的官方擴充模組。
    *   提供基礎設施功能，例如：
        *   `@gravito/orbit-db`: 資料庫整合 (Drizzle ORM)
        *   `@gravito/orbit-auth`: 身份驗證 (JWT)
        *   `@gravito/orbit-storage`: 檔案儲存
        *   `@gravito/orbit-cache`: 快取機制
    *   應用程式可以自由選擇要掛載哪些軌道。

3.  **Satellites (業務邏輯插件)**:
    *   這是**您**的程式碼所在之處。
    *   Satellites 是小型的、專注於單一功能的模組 (例如 `Users`, `Products`, `Payment`)。
    *   它們掛載於 Orbits 之上，使用 Orbits 提供的功能。

## 🛠️ 安裝

```bash
bun add gravito-core
```

## 🚀 快速開始

建立一個新的應用程式 (例如 `app.ts`):

```typescript
import { PlanetCore, ConsoleLogger } from 'gravito-core';

// 1. 初始化核心
const core = new PlanetCore({
  logger: new ConsoleLogger(),
  config: {
    PORT: 3000
  }
});

// 2. 使用 Hooks 擴充 (範例)
core.hooks.addAction('app:ready', () => {
  core.logger.info('我的第一個 Gravito 應用程式已準備就緒！');
});

// 3. 定義路由 (直接使用 Hono 實例)
core.app.get('/', (c) => c.text('Hello Galaxy!'));

// 4. 升空！
core.liftoff();
```

## 🧩 核心功能

### 1. Hook 系統 (Hooks)

Gravito 的強大之處在於它的 Hook 系統，受到 WordPress 的啟發但針對 TypeScript 進行了現代化。

*   **Actions (`addAction`, `doAction`)**: 在特定時間點觸發的事件，沒有回傳值。
*   **Filters (`addFilter`, `applyFilters`)**: 允許修改數據的事件，必須回傳修改後的值。

```typescript
// 定義一個 Filter
core.hooks.addFilter('response_message', (msg) => {
  return `${msg} - 來自核心的問候`;
});

// 應用 Filter
const finalMessage = await core.hooks.applyFilters('response_message', 'Hello');
// 結果: "Hello - 來自核心的問候"
```

### 2. 設定管理 (ConfigManager)

自動載入 `.env` 檔案並支援執行時設定覆蓋。

```typescript
const dbHost = core.config.get('DB_HOST', 'localhost');
```

### 3. 日誌系統 (Logger)

內建基於 PSR-3 風格的日誌介面。

```typescript
core.logger.info('系統啟動中...', { memory: '512MB' });
core.logger.error('連線失敗', new Error('Timeout'));
```

## 📦 版本資訊

目前版本: `v0.3.0-alpha.0`
狀態: **Alpha** (API 可能會變動，請持續關注更新)

---

由 Carl Lee 用 ❤️ 打造 / [GitHub](https://github.com/carl-lee/gravito-core)

## 📖 API Reference

### `PlanetCore`

- **`constructor(options?)`**: Initialize the core with optional Logger and Config.
- **`mountOrbit(path: string, app: Hono)`**: Mount a Hono app to a sub-path.
- **`liftoff(port?: number)`**: Returns the configuration object for `Bun.serve`.
- **`app`**: Access the internal Hono instance.
- **`hooks`**: Access the HookManager.
- **`logger`**: Access the Logger instance.
- **`config`**: Access the ConfigManager.

### `HookManager`

- **`addFilter(hook, callback)`**: Register a filter.
- **`applyFilters(hook, initialValue, ...args)`**: Execute filters sequentially.
- **`addAction(hook, callback)`**: Register an action.
- **`doAction(hook, ...args)`**: Execute actions.

### `ConfigManager`

- **`get(key, default?)`**: Retrieve a config value.
- **`set(key, value)`**: Set a config value.
- **`has(key)`**: Check if a config key exists.

## 🤝 Contributing

Contributions, issues and feature requests are welcome!
Feel free to check the [issues page](https://github.com/CarlLee1983/gravito-core/issues).

## 📝 License

MIT © [Carl Lee](https://github.com/CarlLee1983)
