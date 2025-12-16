# 🧩# 插件開發指南 (Plugin Guide)
> 如何為 Gravito Galaxy 架構開發 Satellites (衛星) 與 Orbits (軌道)

Gravito 是一個微核心框架，其威力來自於生態系。本指南將協助您開發自己的擴充功能。

## 🪐 術語對照

在開始之前，請記住我們的星系隱喻：

| 術語 | 概念 | 用途 | 範例 |
|---|---|---|---|
| **PlanetCore** | 微核心 | 生命週期、Hooks、設定 | `gravito-core` |
| **Orbit** | 基礎設施模組 | 資料庫、驗證、儲存 | `@gravito/orbit-db` |
| **Satellite** | 業務邏輯插件 | 使用 Orbit 的具體功能 | `user-plugin`, `blog-plugin` |

---

## 🛰️ 開發 Satellites (衛星)

Satellite 是最常見的插件形式。它通常是一組 Hono 路由和 Hook 監聽器。

### 1. 基本結構

一個 Satellite 通常是一個函式，接收 `core` 實例。

```typescript
// my-satellite.ts
import { PlanetCore } from 'gravito-core';

export default function mySatellite(core: PlanetCore) {
  // 1. 註冊 Config (可選)
  const apiKey = core.config.get('MY_API_KEY');

  // 2. 註冊 Hooks
  core.hooks.addAction('app:ready', () => {
    core.logger.info('🛰️ Satellite 已上線');
  });

  // 3. 註冊路由
  core.app.get('/satellite/hello', (c) => {
    return c.json({ message: '來自衛星的訊號' });
  });
}
```

### 2. 與 Orbits 互動

Satellites 通常需要存取資料庫或驗證。這些功能由 Orbits 提供，並注入到 Request Context (`c`) 中。

```typescript
// user-satellite.ts
import { PlanetCore } from 'gravito-core';

export default function userSatellite(core: PlanetCore) {
  core.app.post('/users', async (c) => {
    // 從 Context 獲取 Orbit 服務
    const db = c.get('db'); // 由 @gravito/orbit-db 提供
    const auth = c.get('auth'); // 由 @gravito/orbit-auth 提供

    // 使用服務
    await auth.verify(c.req.header('Authorization'));
    const newUser = await db.insert('users', { ... });

    return c.json(newUser);
  });
}
```

---

## 🌌 開發 Orbits (軌道)

Orbit 是更底層的擴充，負責提供基礎設施服務。

### 1. 設計原則

*   **封裝 (Encapsulation)**: 隱藏複雜的實作細節 (如 `drizzle-orm` 初始化)。
*   **注入 (Injection)**: 將服務注入到 Hono Context (`c.set('service', ...)`)。
*   **擴充性 (Hooks)**: 在關鍵操作 (如 `verify`, `upload`) 前後觸發 Hooks。

### 2. 實作範例

```typescript
// my-orbit.ts
import { PlanetCore } from 'gravito-core';

export default function myOrbit(core: PlanetCore, options: any) {
  const service = {
    doSomething: () => console.log('Orbit doing work')
  };

  // 1. 注入到 Context
  core.app.use('*', async (c, next) => {
    c.set('myService', service);
    await next();
  });

  // 2. 觸發初始化 action
  core.hooks.doAction('my_orbit:init', service);

  return service;
}
```

---

## ✅ 最佳實踐

1.  **命名慣例**:
    *   Hook 名稱使用 `冒號` 分隔: `auth:login`, `db:connect`。
    *   Context key 使用小駝峰: `db`, `auth`, `storage`。
2.  **型別安全**:
    *   總是提供 TypeScript 定義檔案 (`.d.ts`)。
    *   擴充 Hono 的 `Variables` 介面以便獲得自動補全。

```typescript
declare module 'hono' {
  interface ContextVariableMap {
    myService: MyService;
  }
}
```
