# 🧩 插件開發指南

> 如何為 Gravito Galaxy 架構開發 Satellites (衛星) 與 Orbits (軌道)

Gravito 是一個微核心框架，其威力來自於生態系。本指南將協助您開發自己的擴充功能。

---

## 🪐 術語對照

| 術語 | 概念 | 用途 | 範例 |
|------|------|------|------|
| **PlanetCore** | 微核心 | 生命週期、Hooks、設定 | `gravito-core` |
| **Orbit** | 基礎設施模組 | 資料庫、驗證、儲存 | `@gravito/orbit-db` |
| **Satellite** | 業務邏輯插件 | 使用 Orbit 的功能 | `user-plugin`, `blog-plugin` |

---

## 🛰️ 開發 Satellites (衛星)

Satellite 主要透過 `HookManager` 與核心互動。

### 基本結構

Satellite 通常是一個接收 `core` 實例的函式：

```typescript
// my-satellite.ts
import { PlanetCore } from 'gravito-core'

export default function mySatellite(core: PlanetCore) {
  // 1. 讀取設定 (選配)
  const apiKey = core.config.get('MY_API_KEY')

  // 2. 註冊 Hooks
  core.hooks.addAction('app:ready', () => {
    core.logger.info('🛰️ Satellite 已上線')
  })

  // 3. 註冊路由
  core.app.get('/satellite/hello', (c) => {
    return c.json({ message: '來自衛星的訊號' })
  })
}
```

### 與 Orbits 互動

Satellites 通常需要存取資料庫或驗證。這些功能由 Orbits 提供，並注入到 Request Context 中：

```typescript
// user-satellite.ts
import { PlanetCore } from 'gravito-core'

export default function userSatellite(core: PlanetCore) {
  core.app.post('/users', async (c) => {
    // 從 Context 獲取 Orbit 服務
    const db = c.get('db')     // 由 @gravito/orbit-db 提供
    const auth = c.get('auth') // 由 @gravito/orbit-auth 提供

    // 使用服務
    await auth.verify(c.req.header('Authorization'))
    const newUser = await db.insert('users', { ... })

    return c.json(newUser)
  })
}
```

---

## 🌌 開發 Orbits (軌道)

Orbit 是更底層的擴充，負責提供基礎設施服務。在 v0.3+ 中，Orbits 應實作 `GravitoOrbit` 介面以支援 IoC。

### 設計原則

- **封裝 (Encapsulation)**: 隱藏複雜的實作細節 (如 `drizzle-orm` 初始化)
- **注入 (Injection)**: 將服務注入到 Hono Context (`c.set('service', ...)`)
- **擴充性 (Hooks)**: 在關鍵操作 (如 `verify`, `upload`) 前後觸發 Hooks

### GravitoOrbit 介面

```typescript
// GravitoOrbit 介面
interface GravitoOrbit {
  // 在啟動階段呼叫
  onBoot(core: PlanetCore): Promise<void>
  
  // 選配：在每個請求時呼叫
  onRequest?(ctx: Context, next: Next): Promise<void>
}
```

### 基於類別的 Orbit 範例

```typescript
// orbit-custom.ts
import { PlanetCore, GravitoOrbit } from 'gravito-core'
import type { Context, Next } from 'hono'

export interface CustomOrbitConfig {
  apiKey: string
  timeout?: number
}

export class OrbitCustom implements GravitoOrbit {
  private config: CustomOrbitConfig
  private service: CustomService

  constructor(config?: CustomOrbitConfig) {
    this.config = config ?? { apiKey: '' }
  }

  async onBoot(core: PlanetCore): Promise<void> {
    // 如果未提供，從 core 解析設定
    if (!this.config.apiKey) {
      this.config = core.config.get('custom')
    }

    // 初始化服務
    this.service = new CustomService(this.config)
    
    // 觸發 hook
    await core.hooks.doAction('custom:init', this.service)
    
    core.logger.info('🛰️ OrbitCustom 已初始化')
  }

  async onRequest(ctx: Context, next: Next): Promise<void> {
    // 將服務注入到 context
    ctx.set('custom', this.service)
    await next()
  }
}

// 匯出函式 API 以保持向後相容
export function orbitCustom(core: PlanetCore, config: CustomOrbitConfig) {
  const orbit = new OrbitCustom(config)
  // 手動啟動 (用於舊版用法)
  orbit.onBoot(core)
  core.app.use('*', orbit.onRequest.bind(orbit))
}
```

### 生命週期 Hooks

| 階段 | 方法 | 用途 |
|------|------|------|
| **啟動時** | `onBoot()` | 初始化連線、載入設定 |
| **請求時** | `onRequest()` | 注入 Context、驗證 Token |

### 使用 IoC

```typescript
// gravito.config.ts
import { defineConfig } from 'gravito-core'
import { OrbitCustom } from './orbit-custom'

export default defineConfig({
  config: {
    custom: {
      apiKey: process.env.CUSTOM_API_KEY,
      timeout: 5000
    }
  },
  orbits: [OrbitCustom] // 會自動解析設定
})
```

---

## 🎯 最佳實踐

### 命名慣例

| 類型 | 慣例 | 範例 |
|------|------|------|
| **Hook 名稱** | 使用 `:` 分隔 | `auth:login`, `db:connect` |
| **Context key** | 小駝峰 | `db`, `auth`, `storage` |
| **Orbit 類別** | `Orbit` 前綴 | `OrbitDB`, `OrbitAuth` |

### 型別安全

總是提供 TypeScript 定義。擴充 Hono 的 `Variables` 介面以獲得自動補全：

```typescript
// types.ts
import { CustomService } from './custom-service'

declare module 'hono' {
  interface ContextVariableMap {
    custom: CustomService
  }
}
```

### 測試

```typescript
// orbit-custom.test.ts
import { describe, it, expect } from 'bun:test'
import { PlanetCore } from 'gravito-core'
import { OrbitCustom } from './orbit-custom'

describe('OrbitCustom', () => {
  it('應該使用設定初始化', async () => {
    const core = new PlanetCore({
      config: {
        custom: { apiKey: 'test-key' }
      },
      orbits: [OrbitCustom]
    })

    await core.boot()

    // 驗證服務可用
    expect(core.config.get('custom').apiKey).toBe('test-key')
  })
})
```

---

## 📦 發布 Orbit

1. **儲存庫結構：**
   ```
   orbit-custom/
   ├── src/
   │   ├── index.ts      # 匯出 OrbitCustom 類別
   │   └── types.ts      # TypeScript 宣告
   ├── package.json
   ├── tsconfig.json
   └── README.md
   ```

2. **package.json：**
   ```json
   {
     "name": "@gravito/orbit-custom",
     "version": "0.1.0",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "peerDependencies": {
       "gravito-core": "^0.3.0",
       "hono": "^4.0.0"
     }
   }
   ```

3. **記錄您的 Hooks：**
   - 列出您的 Orbit 觸發的所有 hooks
   - 解釋參數和預期的回傳值

---

*完整的框架架構，請參閱 [GRAVITO_AI_GUIDE.md](../../../GRAVITO_AI_GUIDE.md)。*
