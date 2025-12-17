# Gravito 核心概念

> **「為工匠打造的高效能框架」**
> "The High-Performance Framework for Artisans."

[![npm version](https://img.shields.io/npm/v/gravito-core.svg)](https://www.npmjs.com/package/gravito-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

歡迎來到 Gravito Core！🚀 本指南涵蓋框架的基本概念與架構。

---

## 🎯 核心定位

### 關鍵差異化

| 比較對象 | Gravito 優勢 |
|---------|-------------|
| **Laravel** | 基於 Bun + Hono，毫秒級啟動時間 |
| **Next.js** | Binary-First 策略，單一執行檔，告別 `node_modules` 地獄 |
| **Express/Koa** | 強制 MVC 分層，拒絕後端邏輯破碎化 |

---

## 📚 技術堆疊

```
┌─────────────────────────────────────────────────────────────┐
│                      TypeScript (Strict)                     │
│                    為 AI 提供型別提示                         │
├─────────────────────────────────────────────────────────────┤
│  Inertia.js              │            Vite                  │
│  (Frontend Bridge)       │       (Build Tool)               │
│  後端 MVC，前端 SPA       │    React/Vue 熱更新              │
├──────────────────────────┴──────────────────────────────────┤
│                         Hono                                 │
│              世界最快的 JS Web 標準庫                         │
│            (Router + Request Parser)                         │
├─────────────────────────────────────────────────────────────┤
│                          Bun                                 │
│            極速 JS 執行環境 + 打包工具                        │
└─────────────────────────────────────────────────────────────┘
```

| 層級 | 技術 | 角色 |
|------|------|------|
| **Runtime** | Bun | 極速 JS 執行環境 + 打包工具 |
| **HTTP Core** | Hono | 世界最快的 JS Web 標準庫 |
| **Frontend Bridge** | Inertia.js | 後端 MVC 寫法，前端 SPA 體驗 |
| **Build Tool** | Vite | React/Vue 熱更新與編譯 |
| **Language** | TypeScript | 全嚴格模式，AI 友善型別提示 |

---

## 🌌 星系架構 (Galaxy Architecture)

Gravito 遵循獨特的設計模式，靈感來自天體力學：

### 1. PlanetCore (微核心)

萬有引力的中心。極簡、高效能的基底，負責處理：

- 生命週期管理 (Liftoff)
- Hook 系統 (Filters & Actions)
- 錯誤處理
- 設定 (Config) 與日誌 (Logger) 管理

它**不知道**任何關於資料庫、驗證或業務邏輯的資訊。

```typescript
const core = new PlanetCore({
  orbits: [OrbitDB, OrbitAuth, OrbitInertia], // 選配插件
})

await core.boot()   // 啟動時編譯 (Boot-time Resolution)
await core.ignite() // 啟動 HTTP 服務
```

### 2. Orbits (基礎設施模組)

圍繞核心運行的標準擴充模組：

- `@gravito/orbit-db`: 資料庫整合 (Drizzle ORM)
- `@gravito/orbit-auth`: 身份驗證 (JWT)
- `@gravito/orbit-storage`: 檔案儲存
- `@gravito/orbit-cache`: 快取機制
- `@gravito/orbit-inertia`: Inertia.js 整合

### 3. Satellites (業務邏輯插件)

這是**您的**程式碼所在之處。小型、專注於單一功能的模組 (例如 `Users`, `Products`, `Payment`)，掛載於 Orbits 之上。

---

## ⚡ 核心引擎功能

### A. 微核心設計 (Micro-Kernel Design)

- **核心零依賴**: 只負責 I/O 與插件調度
- **啟動時編譯 (Boot-time Resolution)**: 路由與依賴於啟動時編譯，確保執行時為唯讀且極速

### B. 智能上下文 (Smart Context)

#### `ctx.view(template, props)` - 核心黑科技

**協商機制 (Content Negotiation)**: 自動判斷請求來源

| 請求類型 | 回應內容 | 用途 |
|---------|---------|------|
| **Inertia 請求** | JSON | React/Vue 前端接管 |
| **HTML 請求** | Server-Side Render HTML (App Shell) | 爬蟲、首頁載入 |

```typescript
export class HomeController {
  index(ctx: Context) {
    return ctx.view('Home', { 
      title: '歡迎來到 Gravito',
      features: ['快速', '輕量', '清晰']
    })
  }
}
```

#### `ctx.meta(tags)` - SEO 整合

統一的 SEO 設定介面，自動注入 HTML `<head>` 或傳遞給 Inertia `<Head>` 組件。

```typescript
ctx.meta({
  title: 'Gravito Framework',
  description: '為工匠打造的高效能框架',
  og: {
    image: '/images/og-cover.png',
    type: 'website'
  }
})
```

### C. 插件系統 (Plugin System)

- **選配式 (Opt-in)**: 預設不含 DB、Auth，按需引入
- **介面導向 (Interface-based)**: 透過 Hono Middleware 機制封裝

#### 插件生命週期 Hooks

| 階段 | Hook | 用途 |
|------|------|------|
| 啟動時 | `onBoot()` | 初始化連線、載入設定 |
| 請求時 | `onRequest()` | 注入 Context、驗證 |

```typescript
export class OrbitDB implements GravitoOrbit {
  async onBoot(core: PlanetCore) {
    // 建立資料庫連線
  }
  
  async onRequest(ctx: Context, next: Next) {
    // 注入 ctx.db
  }
}
```

---

## 🛠️ 安裝

```bash
bun add gravito-core
```

## 🚀 快速開始

### 1. 初始化核心

```typescript
import { PlanetCore } from 'gravito-core'

const core = new PlanetCore({
  config: {
    PORT: 4000,
    DEBUG: true
  }
})
```

### 2. 註冊 Hooks

使用 **Filters** 修改資料：

```typescript
core.hooks.addFilter('modify_content', async (content: string) => {
  return content.toUpperCase()
})

const result = await core.hooks.applyFilters('modify_content', 'hello galaxy')
// result: "HELLO GALAXY"
```

使用 **Actions** 觸發副作用：

```typescript
core.hooks.addAction('user_registered', async (userId: string) => {
  core.logger.info(`發送歡迎信給 ${userId}`)
})

await core.hooks.doAction('user_registered', 'user_123')
```

### 3. 掛載 Orbit

Orbits 就是標準的 Hono 應用程式，可插入核心。

```typescript
import { Hono } from 'hono'

const blogOrbit = new Hono()
blogOrbit.get('/posts', (c) => c.json({ posts: [] }))

core.mountOrbit('/api/blog', blogOrbit)
```

### 4. 啟動程序 (IoC)

Gravito v0.3+ 引入 **IoC (控制反轉)** 簡化插件整合：

```typescript
// gravito.config.ts
import { defineConfig } from 'gravito-core'
import { OrbitAuth } from '@gravito/orbit-auth'
import { OrbitDB } from '@gravito/orbit-db'

export default defineConfig({
  config: {
    auth: { secret: process.env.JWT_SECRET },
    db: { db: drizzle(...) }
  },
  orbits: [OrbitAuth, OrbitDB]
})

// index.ts
import { PlanetCore } from 'gravito-core'
import config from './gravito.config'

PlanetCore.boot(config).then(core => core.liftoff())
```

### 5. 升空！🚀

```typescript
export default core.liftoff() // 自動使用 config/env 中的 PORT
```

---

## 📖 API 參考

### `PlanetCore`

| 方法/屬性 | 說明 |
|----------|------|
| `constructor(options?)` | 使用選配的 Logger 和 Config 初始化 |
| `mountOrbit(path, app)` | 將 Hono app 掛載到子路徑 |
| `liftoff(port?)` | 回傳 `Bun.serve` 的設定物件 |
| `app` | 存取內部 Hono 實例 |
| `hooks` | 存取 HookManager |
| `logger` | 存取 Logger 實例 |
| `config` | 存取 ConfigManager |

### `HookManager`

| 方法 | 說明 |
|------|------|
| `addFilter(hook, callback)` | 註冊一個過濾器 |
| `applyFilters(hook, initialValue, ...args)` | 依序執行過濾器 |
| `addAction(hook, callback)` | 註冊一個動作 |
| `doAction(hook, ...args)` | 執行動作 |

### `ConfigManager`

| 方法 | 說明 |
|------|------|
| `get(key, default?)` | 取得設定值 |
| `set(key, value)` | 設定值 |
| `has(key)` | 檢查設定鍵是否存在 |

---

## 🤝 貢獻

歡迎貢獻、問題回報和功能請求！
請查看 [issues 頁面](https://github.com/CarlLee1983/gravito-core/issues)。

## 📝 授權

MIT © [Carl Lee](https://github.com/CarlLee1983)
