---
title: Gravito 核心概念
---

# Gravito 核心概念

> **"The High-Performance Framework for Artisans."**
> 為工匠打造的高效能框架

<div class="not-prose my-5 flex flex-wrap items-center gap-2">
  <a href="https://www.npmjs.com/package/gravito-core" target="_blank" rel="noreferrer">
    <img alt="npm 版本" src="https://img.shields.io/npm/v/gravito-core.svg" class="h-5" loading="lazy" />
  </a>
  <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noreferrer">
    <img alt="授權：MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" class="h-5" loading="lazy" />
  </a>
  <a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.0+-blue.svg" class="h-5" loading="lazy" />
  </a>
  <a href="https://bun.sh/" target="_blank" rel="noreferrer">
    <img alt="Bun" src="https://img.shields.io/badge/Bun-1.0+-black.svg" class="h-5" loading="lazy" />
  </a>
</div>

歡迎來到 Gravito Core。本指南將介紹框架的基本概念與架構。

<div class="my-8 not-prose rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
  <picture>
    <source media="(min-width: 1280px)" srcset="/static/image/hero-2560.webp">
    <source media="(min-width: 768px)" srcset="/static/image/hero-1280.webp">
    <img src="/static/image/hero-768.webp" alt="Gravito Core Architecture" class="w-full h-auto object-cover">
  </picture>
</div>

---

## 設計原則

Gravito 把以下四個核心價值，刻在框架的骨子裡：

- **高效能**：快速啟動、有效率的請求處理。
- **低耗（低開銷）**：降低執行期負擔，減少隱性成本。
- **輕量**：按需引入，維持小而可控的運行足跡。
- **AI 友善**：嚴格型別與一致慣例，讓生成的程式碼更可靠。

---

## 產品定位

### 關鍵差異

| 對比 | Gravito 優勢 |
|------|--------------|
| **Laravel** | 基於 Bun + Hono，毫秒級啟動速度，保有優雅開發體驗 |
| **Next.js** | 二進位優先 (Binary-First) 策略，單一執行檔部署，不必在正式環境配送 `node_modules` |
| **Express/Koa** | 強制 MVC 分層結構，避免後端邏輯散亂 |

---

## 技術棧 (Tech Stack)

<div class="not-prose my-10 font-sans grid gap-4 text-left">
  <div class="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900 p-6 text-center shadow-lg">
    <div class="absolute left-0 top-0 h-1 w-full bg-blue-500"></div>
    <h3 class="mb-2 text-xl font-bold text-gray-100">TypeScript (Strict)</h3>
    <p class="text-sm text-gray-400">AI 友善的型別提示與嚴格模式</p>
  </div>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <div class="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div class="absolute left-0 top-0 h-1 w-full bg-purple-500"></div>
      <h4 class="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">Inertia.js</h4>
      <p class="mb-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Frontend Bridge</p>
      <p class="text-sm text-gray-500 dark:text-gray-400">後端 MVC 架構，SPA 體驗</p>
    </div>
    <div class="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div class="absolute left-0 top-0 h-1 w-full bg-yellow-400"></div>
      <h4 class="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">Vite</h4>
      <p class="mb-2 text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">Build Tool</p>
      <p class="text-sm text-gray-500 dark:text-gray-400">React/Vue 極速熱更新 (HMR)</p>
    </div>
  </div>
  <div class="rounded-xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-center text-white shadow-lg">
    <h3 class="mb-1 text-xl font-bold">Hono</h3>
    <p class="mb-1 text-sm text-orange-50">高效能的 JavaScript Web 框架</p>
    <p class="text-xs text-orange-100/80">(Router + Request Parser)</p>
  </div>
  <div class="rounded-xl border border-gray-800 bg-black p-6 text-center shadow-lg">
    <h3 class="mb-1 text-xl font-bold text-white">Bun</h3>
    <p class="text-sm text-gray-400">超高速 JavaScript Runtime + Bundler</p>
  </div>
</div>

---

## 銀河架構 (Galaxy Architecture)

Gravito 遵循一套受天文力學啟發的獨特設計模式：

### 1. PlanetCore (微核心)

引力中心。一個極簡、高效的基礎，負責：

- 生命週期管理 (Liftoff)
- Hook 系統 (Filters & Actions)
- 錯誤處理
- Config 與 Logger 管理

它**完全不知道**資料庫、驗證或業務邏輯的存在。

```typescript
const core = await PlanetCore.boot({
  orbits: [OrbitDB, OrbitAuth, OrbitInertia], // 按需掛載外掛
})

export default core.liftoff() // 啟動伺服器
```

### 2. Orbits (基礎設施模組)

圍繞核心運行的標準擴充模組：

- `@gravito/orbit-db`: 資料庫整合 (Drizzle ORM)
- `@gravito/orbit-auth`: 身分驗證 (JWT/Session)
- `@gravito/orbit-storage`: 檔案儲存
- `@gravito/orbit-cache`: 快取機制
- `@gravito/orbit-inertia`: Inertia.js 整合

### 3. Satellites (業務邏輯衛星)

這是**你的**程式碼所在之處。小巧、專注的模組 (例如 `Users`, `Products`, `Payment`)，掛載於 Orbits 之上。

---

## 核心引擎特性

### A. 微核心設計 (Micro-Kernel)

- **零依賴核心**: 僅處理 I/O 和外掛編排
- **啟動時解析 (Boot-time Resolution)**: 路由與依賴在啟動時解析，讓執行期維持精簡與可預期

### B. 智慧 Context (Smart Context)

#### `ctx.view(template, props)` - 內容協商 (Content Negotiation)

**內容協商**: 自動偵測請求來源

| 請求類型 | 回應內容 | 使用場景 |
|---------|----------|----------|
| **Inertia Request** | JSON | React/Vue 前端接管路由 |
| **HTML Request** | Server-Side Rendered HTML (App Shell) | 爬蟲、首次頁面載入 |

```typescript
export class HomeController {
  index(ctx: Context) {
    return ctx.view('Home', {
      title: 'Welcome to Gravito',
      features: ['Fast', 'Light', 'Clean']
    })
  }
}
```

### C. 外掛系統 (Plugin System)

- **可選用 (Opt-in)**: 預設沒有 DB 或 Auth，只加你需要的
- **基於介面**: 透過 Hono Middleware 機制封裝

#### `GravitoOrbit`（外掛介面）

Gravito 透過 Orbits 擴充核心能力。Orbit 實作 `GravitoOrbit` 介面，並在 `install()` 階段註冊 hooks 與 middleware。

```typescript
export interface GravitoOrbit {
  install(core: PlanetCore): void | Promise<void>
}
```

### D. Middleware / Pipeline Pattern

Gravito 路由支援完整的 Middleware 串接模式，讓你能在請求處理前後執行驗證、日誌、快取等邏輯。

#### 基本用法

```typescript
import type { MiddlewareHandler } from 'hono'

// 定義 Middleware
const authMiddleware: MiddlewareHandler = async (ctx, next) => {
  const token = ctx.req.header('Authorization')
  if (!token) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }
  // 驗證通過，繼續執行下一個 handler
  await next()
}

const loggerMiddleware: MiddlewareHandler = async (ctx, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  console.log(`${ctx.req.method} ${ctx.req.path} - ${duration}ms`)
}
```

#### 套用至路由群組

`middleware()` 可接受單一 handler、多個 handlers，或陣列：

```typescript
// 方式 1: 多個參數
core.router
  .middleware(loggerMiddleware, authMiddleware)
  .prefix('/api')
  .group((r) => {
    r.get('/users', [UserController, 'index'])
  })

// 方式 2: 陣列形式（適合動態組合）
const commonMiddleware = [loggerMiddleware, corsMiddleware]
core.router
  .middleware(commonMiddleware, authMiddleware)
  .prefix('/api/v2')
  .group((r) => {
    r.get('/users', [UserController, 'index'])
  })

// 方式 3: 巢狀群組
core.router.prefix('/admin').group((admin) => {
  admin.middleware(authMiddleware).group((secured) => {
    secured.get('/dashboard', [AdminController, 'dashboard'])
  })
})
```

#### Pipeline 執行順序

請求會依序通過所有 Middleware，最後到達 Controller：

```
Request → Logger → Auth → Controller → Auth (after) → Logger (after) → Response
```

每個 Middleware 可以：
- **攔截請求**: 在 `await next()` 前返回 Response
- **修改 Context**: 設定 `ctx.set('user', userData)`
- **後處理**: 在 `await next()` 後執行清理邏輯

#### CSRF 保護

Gravito 可直接使用 Hono 內建的 CSRF middleware，保護表單與 API 免受跨站請求偽造攻擊：

```typescript
import { csrf } from 'hono/csrf'

// 保護所有非安全方法（POST, PUT, DELETE, PATCH）
core.router
  .middleware(csrf())
  .prefix('/api')
  .group((r) => {
    r.post('/users', [UserController, 'store'])
    r.delete('/users/:id', [UserController, 'destroy'])
  })
```

Hono CSRF middleware 會驗證：

| 檢查項目 | 說明 |
|----------|------|
| `Origin` header | 確認請求來源與目標網域一致 |
| `Sec-Fetch-Site` header | 瀏覽器提供的跨站指標 |

> **Note**: 僅對「非安全方法」生效（`POST`, `PUT`, `DELETE`, `PATCH`）。`GET`, `HEAD`, `OPTIONS` 不受影響。

進階設定：

```typescript
import { csrf } from 'hono/csrf'

csrf({
  origin: ['https://example.com', 'https://api.example.com'], // 允許的來源
})
```

#### Request 驗證 (FormRequest)

使用 `@gravito/orbit-request` 實現 Laravel 風格的 FormRequest 驗證：

```bash
bun add @gravito/orbit-request
```

**定義 FormRequest：**

```typescript
// src/requests/StoreUserRequest.ts
import { FormRequest, z } from '@gravito/orbit-request'

export class StoreUserRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(2, '名稱至少 2 個字'),
    email: z.string().email('請輸入有效的 Email'),
  })
}
```

**直接在路由中使用：**

```typescript
import { StoreUserRequest } from './requests/StoreUserRequest'

// FormRequest 作為第二個參數，自動驗證
core.router.post('/users', StoreUserRequest, [UserController, 'store'])

// 或在群組中使用
core.router.prefix('/api').group((r) => {
  r.post('/users', StoreUserRequest, [UserController, 'store'])
})
```

**在 Controller 中取得驗證資料：**

```typescript
export class UserController {
  store(ctx: Context) {
    // 型別安全的驗證資料
    const data = ctx.get('validated') as { name: string; email: string }
    return ctx.json({ user: data })
  }
}
```

驗證失敗時，自動回傳 422 錯誤：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "請輸入有效的 Email" }
    ]
  }
}
```

---

## 安裝

```bash
bun add gravito-core
```

## 快速開始

### 1. 專案結構

Gravito 推崇扁平、潔淨的結構：

```
src/
  controllers/
  models/
  views/
  index.ts
```

### 2. 初始化 (IoC)

Gravito v0.3+ 引入了 **IoC (控制反轉)** 透過 `PlanetCore.boot()` 簡化整合：

```typescript
// index.ts
import { PlanetCore } from 'gravito-core'
import { OrbitInertia } from '@gravito/orbit-inertia'
import { OrbitView } from '@gravito/orbit-view'

// 初始化核心與 Orbits
const core = await PlanetCore.boot({
  orbits: [
      OrbitInertia,
      OrbitView
  ],
  config: {
      app: { name: 'My Gravito App' }
  }
});

// 註冊路由
core.router.group(root => {
  root.get('/', ctx => ctx.text('你好，銀河！'));
});

// 啟動
export default core.liftoff();
```

### 3. 真實範例 (Real World Example)

請查看 `examples/` 目錄下的 [Gravito 官方網站範例](https://github.com/CarlLee1983/gravito/tree/main/examples/official-site)，展示了：
- **Inertia.js + React** 前端整合
- **i18n** 國際化多語系
- **Tailwind CSS v4** 整合
- **Markdown 文件引擎**

---

## API 參考

### `PlanetCore`

| 方法/屬性 | 描述 |
|-----------|------|
| `boot(options)` | 靜態方法，使用 IoC 初始化系統 |
| `liftoff(port?)` | 回傳 `Bun.serve` 所需的 config 物件 |
| `router` | 存取 Gravito Router |
| `hooks` | 存取 HookManager |
| `logger` | 存取 Logger 實例 |

---

### `HookManager`

| 方法 | 描述 |
|------|------|
| `addFilter(hook, callback)` | 註冊 Filter |
| `applyFilters(hook, initialValue, ...args)` | 依序執行 Filter |
| `addAction(hook, callback)` | 註冊 Action |
| `doAction(hook, ...args)` | 執行 Action |

---

## 貢獻

歡迎提交 PR、回報問題與提出功能建議。
請參考 [Issues](https://github.com/CarlLee1983/gravito/issues)。

---

## 授權 (License)

MIT © [Carl Lee](https://github.com/CarlLee1983)
