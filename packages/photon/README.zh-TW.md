# @gravito/photon

> 驅動 Gravito Galaxy 架構的高效能 HTTP 引擎。

[![npm version](https://img.shields.io/npm/v/@gravito/photon.svg)](https://www.npmjs.com/package/@gravito/photon)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

**@gravito/photon** 是 Gravito 框架的核心 HTTP 引擎。它提供了 `@gravito/core` 和所有 Orbit 模組所使用的基礎路由、中介軟體和請求/回應處理功能。

## ✨ 特色

- 🚀 **極速效能**：專為 Bun 運行時打造，實現最大吞吐量
- 🎯 **型別安全路由**：完整的 TypeScript 支援，智慧型別推論
- 🔌 **中介軟體系統**：可組合的中介軟體，用於認證、驗證等功能
- 📡 **RPC 支援**：為 `@gravito/beam` 提供型別安全的客戶端-伺服器通訊
- 🪶 **輕量級**：最小開銷，優化的打包大小
- 🔧 **開發體驗**：直覺的 API，優秀的 IntelliSense 支援

## 📦 安裝

```bash
bun add @gravito/photon
```

> **注意**：此套件會自動作為 `@gravito/core` 的依賴項安裝。除非您正在建構自訂適配器，否則通常不需要單獨安裝。

## 🚀 快速開始

### 基本使用

```typescript
import { Photon } from '@gravito/photon'

const app = new Photon()

app.get('/', (c) => c.text('Hello from Photon!'))

app.get('/json', (c) => c.json({ message: 'Hello World' }))

app.post('/users', async (c) => {
  const body = await c.req.json()
  return c.json({ id: 1, ...body }, 201)
})

export default app
```

### 搭配 Gravito Core 使用（推薦）

```typescript
import { PlanetCore, defineConfig, GravitoAdapter } from '@gravito/core'

const config = defineConfig({
  config: {
    PORT: 3000,
    APP_NAME: 'My App'
  },
  adapter: new GravitoAdapter()
})

const core = await PlanetCore.boot(config)

// 存取底層的 Photon 實例
core.app.get('/api/health', (c) => c.json({ status: 'ok' }))

export default core.liftoff()
```

## 📚 匯出

| 匯出路徑 | 說明 |
|--------|-------------|
| `@gravito/photon` | 主要 Photon 類別和核心工具 |
| `@gravito/photon/client` | 型別安全 RPC 客戶端（由 `@gravito/beam` 使用） |
| `@gravito/photon/jwt` | JWT 認證工具 |
| `@gravito/photon/bun` | Bun 專用適配器（例如 `serveStatic`） |
| `@gravito/photon/logger` | 日誌中介軟體 |
| `@gravito/photon/http-exception` | HTTP 例外處理 |

## 🔧 API 參考

### `Photon`

用於建構 HTTP 應用程式的主要類別。

```typescript
import { Photon } from '@gravito/photon'

const app = new Photon()

// 路由
app.get('/path', handler)
app.post('/path', handler)
app.put('/path', handler)
app.delete('/path', handler)
app.patch('/path', handler)

// 中介軟體
app.use(middleware)
app.use('/prefix/*', middleware)

// 路由組合
app.route('/api', apiRoutes)
```

### Context (`c`)

傳遞給所有處理器的請求上下文物件。

```typescript
app.get('/users/:id', async (c) => {
  // 請求
  const id = c.req.param('id')
  const query = c.req.query('filter')
  const body = await c.req.json()
  const header = c.req.header('Authorization')

  // 回應
  return c.json({ data })        // JSON 回應
  return c.text('Hello')         // 文字回應
  return c.html('<h1>Hi</h1>')   // HTML 回應
  return c.redirect('/other')    // 重新導向

  // 上下文變數
  c.set('user', user)
  const user = c.get('user')
})
```

### JWT 工具

```typescript
import { sign, verify, decode, jwt } from '@gravito/photon/jwt'

// 中介軟體
app.use('/protected/*', jwt({ secret: 'your-secret' }))

// 手動操作
const token = await sign({ sub: 'user123' }, 'secret')
const payload = await verify(token, 'secret')
const decoded = decode(token)
```

## 🏗️ 架構

```
┌─────────────────────────────────────────────────────┐
│                   @gravito/core                       │
│       (PlanetCore, Orbits, Hooks, Container)        │
└───────────────────────┬─────────────────────────────┘
                        │ 驅動
                        ▼
┌─────────────────────────────────────────────────────┐
│               @gravito/photon                        │
│     (Photon HTTP 引擎, 路由, 中介軟體)              │
└─────────────────────────────────────────────────────┘
                        │
    ┌───────────────────┼───────────────────┐
    ▼                   ▼                   ▼
@gravito/beam    @gravito/ion    @gravito/sentinel
   (RPC)          (Inertia)         (認證)
```

## 🤝 貢獻

歡迎貢獻！請先閱讀主要的 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

## 📝 授權

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
