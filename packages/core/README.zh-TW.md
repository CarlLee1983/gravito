# @gravito/core

> Galaxy 架構的微核心。輕量、可擴展，基於 Photon 與 Bun 構建。

[![npm version](https://img.shields.io/npm/v/@gravito/core.svg)](https://www.npmjs.com/package/@gravito/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

**@gravito/core** 是使用 **Galaxy 架構** 構建模組化後端應用的基礎。它提供了一個強大的 Hook 系統（Filters 與 Actions）和 Orbit 掛載機制，讓您能夠構建低耦合、高擴展性的系統。

## ✨ 特性

- 🪐 **PlanetCore** - 基於 Photon 的中央核心，管理應用程式生命週期。
- 🏢 **Application Container** - 企業級容器，支援 Provider 自動發現與慣例優於配置（Convention-over-Configuration）模式。
- 📦 **IoC Container** - 輕量級依賴注入容器，支援綁定（Binding）與單例（Singleton）。
- 🧩 **Service Providers** - 模組化的服務註冊與啟動生命週期。
- 🪝 **Hook System** - WordPress 風格的異步 **Filters** 與 **Actions**，提供強大的擴展能力。
- 📡 **Event System** - 中央 EventManager，支援跨模組通訊與事件驅動架構。
- 🛰️ **Orbit Mounting** - 輕鬆將外部 Photon 應用程式（Orbits）掛載到特定路徑。
- 📝 **Logger System** - PSR-3 風格的日誌介面，內建標準輸出實作。
- ⚙️ **Config Manager** - 統一的配置管理，支援環境變數、運行時注入與基於檔案的配置載入。
- 🛡️ **Security Middleware** - 內建保護功能（自 v1.7.0 起標記為棄用，已遷移至 `@gravito/photon`）。
- 🔌 **Runtime Adapters** - 底層運行時（Bun, Node.js）與 HTTP 引擎的抽象層。
- 🛡️ **Error Handling** - 內建標準化 JSON 錯誤回應、404 處理與進程級別錯誤管理。
- 🧠 **Request Context** - 透過 `AsyncLocalStorage` 全域存取請求資料（requestId, userId 等）。
- 🛠️ **CLI Commands** - 使用 CommandKernel 構建 Artisan 風格的命令行工具。
- 🏥 **Health Probes** - 雲原生 Liveness 與 Readiness 探針支援。
- ⚡ **Native Accelerators** - 基於 FFI 的高效能 CBOR 與雜湊計算（雜湊加速）。
- 🚀 **Modern** - 專為 **Bun** 運行時設計，原生支援 TypeScript。
- 🪶 **Lightweight** - 除了 `@gravito/photon` 外零外部依賴。

## 📦 安裝

```bash
bun add @gravito/core
```

## 🚀 快速上手

### 1. 初始化應用程式

對於企業級應用，使用 `Application` 類別，它提供自動發現與開發慣例：

```typescript
import { Application } from '@gravito/core';

const app = new Application({
  basePath: import.meta.dir,
  env: process.env.NODE_ENV as 'development' | 'production',
});

await app.boot();

export default app.core.liftoff();
```

或者直接使用輕量級的 `PlanetCore`：

```typescript
import { PlanetCore } from '@gravito/core';

const core = new PlanetCore({
  config: {
    PORT: 4000,
    DEBUG: true
  }
});
```

### 2. 請求上下文 (AsyncLocalStorage)

在應用程式的任何地方存取請求範圍內的資料，無需透過參數逐層傳遞：

```typescript
import { RequestContext } from '@gravito/core';

// 在深層 Service 中
const userId = RequestContext.get()?.userId;
const requestId = RequestContext.get()?.requestId;
```

### 3. 依賴注入

使用 IoC 容器管理應用程式服務：

```typescript
import { ServiceProvider, Container } from '@gravito/core';

class CacheServiceProvider extends ServiceProvider {
  register(container: Container) {
    // 綁定單例服務
    container.singleton('cache', (c) => {
      return new RedisCache(process.env.REDIS_URL);
    });
  }

  async boot(core: PlanetCore) {
    // 執行啟動邏輯
    core.logger.info('Cache provider booted');
  }
}

// 註冊 Provider
core.register(new CacheServiceProvider());

// 啟動應用程式（執行 register() 與 boot()）
await core.bootstrap();

// 解析服務
const cache = core.container.make('cache');
```

### 4. 註冊 Hooks

使用 **Filters** 修改資料：

```typescript
core.hooks.addFilter('modify_content', async (content: string) => {
  return content.toUpperCase();
});

const result = await core.hooks.applyFilters('modify_content', 'hello galaxy');
// 回傳: "HELLO GALAXY"
```

使用 **Actions** 觸發副作用：

```typescript
core.hooks.addAction('user_registered', async (userId: string) => {
  core.logger.info(`Sending welcome email to ${userId}`);
});

await core.hooks.doAction('user_registered', 'user_123');
```

### 5. 可靠性與分佈式重試

內建透過 Bull Queue 實作的分佈式重試支援：

```typescript
import { RetryScheduler } from '@gravito/core';

const scheduler = new RetryScheduler({
  initialDelayMs: 1000,
  multiplier: 2,
  maxRetries: 5
});

core.hooks.setRetryScheduler(scheduler);
```

### 6. 掛載 Orbit

Orbits 是標準的 Photon 應用程式，可以插入核心中。

```typescript
import { Photon } from '@gravito/photon';

const blogOrbit = new Photon();
blogOrbit.get('/posts', (c) => c.json({ posts: [] }));

// 將 orbit 掛載到 /api/blog
core.mountOrbit('/api/blog', blogOrbit);
```

### 7. Liftoff! 🚀

```typescript
// 為 Bun.serve 導出
export default core.liftoff(); // 自動使用來自配置或環境變數的 PORT
```

### 8. 進程級別錯誤處理（推薦）

請求級別的錯誤由 `PlanetCore` 自動處理，但背景工作與啟動代碼仍可能在請求生命週期外失敗。

```ts
// 註冊 `unhandledRejection` / `uncaughtException`
const unregister = core.registerGlobalErrorHandlers()

// 選配：回報至 Sentry / 自定義回報器
core.hooks.addAction('processError:report', async (ctx) => {
  // ctx.kind: 'unhandledRejection' | 'uncaughtException'
  // ctx.error: unknown
})
```

## 📊 可觀測性與指標

### 路由模式（Route Pattern）支援

為了防止因動態路徑（如 `/users/123`, `/users/456`）導致 Prometheus 指標基數（cardinality）爆炸，Gravito 會自動偵測 `routePattern`：

- **Path**: `/users/123`
- **Pattern**: `/users/:id`

`routePattern` 可在請求物件中取得，並由監控系統自動使用。

## 🩺 健康檢查（Health Probes）

內建雲原生健康檢查支援：

```typescript
import { HealthProvider } from '@gravito/core';

app.register(new HealthProvider());

// 檢查: http://localhost:3000/health/liveness
// 檢查: http://localhost:3000/health/readiness
```

## 🛠️ 命令行工具（CLI Commands）

輕鬆構建 Artisan 風格的 CLI 工具：

```typescript
import { CommandKernel } from '@gravito/core';

const kernel = new CommandKernel(container);
kernel.register('greet', async (args) => {
  console.log('Hello', args[0]);
});

await kernel.handle(process.argv.slice(2));
```

## ⚡ 原生加速器（Native Accelerators）

Gravito Core 利用 FFI (Foreign Function Interface) 使用高效能的 C 語言實作來處理關鍵任務：

- **CBOR**: 高效的二進位序列化。
- **雜湊（Hashing）**: 使用 Bun 原生指令集加速的 SHA-256 與 HMAC 計算。

## 🛡️ 安全中介軟體遷移

自 v1.7.0 起，所有 HTTP 安全相關的中介軟體已遷移至 `@gravito/photon` 以獲得更好的引擎適配。`@gravito/core` 中的現有匯出已被標記為 `@deprecated`，並將於 v2.0.0 中移除。

**遷移方式：**
```typescript
// 之前
import { cors } from '@gravito/core';

// 之後
import { cors } from '@gravito/photon/middleware/security';
```

## 📖 API 參考

### `Application` (企業級容器)

- **`constructor(options: ApplicationConfig)`**: 建立應用程式實例。
- **`boot()`**: 統籌啟動順序（配置載入、Provider 發現）。
- **`make<T>(key)`**: 從共享容器中解析服務。
- **`getConfig(key, default?)`**: 取得配置資訊。
- **`path(...segments)`**: 相對於基礎路徑的路徑輔助函數。

### `PlanetCore` (微核心)

- **`constructor(options?)`**: 初始化核心，可選配 Logger 與 Config。
- **`register(provider: ServiceProvider)`**: 註冊服務提供者。
- **`bootstrap()`**: 啟動所有已註冊的提供者。
- **`mountOrbit(path: string, app: Photon)`**: 將 Photon 應用掛載到子路徑。
- **`liftoff(port?: number)`**: 回傳用於 `Bun.serve` 的配置物件。
- **`container`**: 存取 IoC 容器。
- **`app`**: 存取內部 Photon 實例。
- **`hooks`**: 存取 HookManager。
- **`events`**: 存取 EventManager。
- **`logger`**: 存取 Logger 實例。
- **`config`**: 存取 ConfigManager。

### `Container`

- **`bind(key, factory)`**: 註冊瞬時綁定（每次解析皆建立新實例）。
- **`singleton(key, factory)`**: 註冊共享綁定（單例）。
- **`make<T>(key)`**: 解析服務實例。
- **`instance(key, instance)`**: 註冊現有的物件實例。
- **`has(key)`**: 檢查服務是否已綁定。

容器內建 **循環依賴偵測（Circular Dependency Detection）**，幫助您在開發階段及時發現架構設計問題。

### `HookManager`

- **`addFilter(hook, callback)`**: 註冊過濾器。
- **`applyFilters(hook, initialValue, ...args)`**: 依序執行過濾器。
- **`addAction(hook, callback)`**: 註冊動作。
- **`doAction(hook, ...args)`**: 執行動作。

### `EventManager`

- **`emit(event, ...args)`**: 觸發事件。
- **`on(event, callback)`**: 監聽事件。
- **`off(event, callback)`**: 移除監聽器。

### `ConfigManager`

- **`get(key, default?)`**: 取得配置值。
- **`set(key, value)`**: 設定配置值。
- **`has(key)`**: 檢查配置鍵是否存在。

## 🤝 貢獻

歡迎提交貢獻、問題與功能請求！
請隨時查看 [Issues 頁面](https://github.com/gravito-framework/gravito/issues)。

## 📝 授權

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
