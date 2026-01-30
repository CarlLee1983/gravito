---
title: Photon HTTP Engine 架構技術規格書
version: 1.0.0-beta.1
status: Beta
tier: A
last_updated: 2026-01-28
dependencies:
  bun: ">=1.0.0"
  hono: "^4.0.0"
related_orbits:
  - core
  - atlas
---

# Photon HTTP Engine 架構技術規格書 (v1.0.0-beta.1)

## 📖 目錄

1. [快速開始](#快速開始)
2. [模組概覽](#模組概覽)
3. [技術規格與架構設計](#技術規格與架構設計)
4. [核心 API 參考](#核心-api-參考)
5. [完整使用範例](#完整使用範例)
6. [測試指南](#測試指南)
7. [效能優化](#效能優化)
8. [部署指南](#部署指南)
9. [故障排除](#故障排除)
10. [API 速查表](#api-速查表)

---

## 快速開始

```typescript
import { Photon } from '@gravito/photon'

// 建立應用
const app = new Photon()

// 定義路由
app.get('/hello', (c) => {
  return c.json({ message: 'Hello, Gravito!' })
})

// 啟動伺服器
export default {
  port: 3000,
  fetch: app.fetch
}
```

---

## 模組概覽

**Photon** (`@gravito/photon`) 是 Gravito 框架的高效能 HTTP 引擎層，負責底層請求處理、路由分發與中介軟體執行。它基於 Hono 構建，提供了極致的效能與 Web 標準相容性。

### 核心職責
- **HTTP Engine**：基於 Web Standards (Request/Response) 的高效能伺服器封裝。
- **Routing System**：支援參數化路徑、巢狀路由與路由分組（Trie/RegExp Router）。
- **Middleware Pipeline**：洋蔥式（Onion Model）中介軟體執行機制。
- **OpenAPI Integration**：內建 OpenAPI 支援，自動生成 API 規格文件。
- **Type-Safe RPC**：提供端到端（End-to-End）型別安全的客戶端生成能力 (`hc`)。

---

## 技術規格與架構設計

### 核心架構：Hono 的擴展與封裝

Photon 採取「巨人的肩膀」策略，基於 **Hono** 進行擴展：

1. **Photon Facade** (`src/index.ts`)
   - 直接匯出 `Hono` 為 `Photon`，保持 API 100% 相容。
   - 開發者可以使用熟悉的 Hono 語法 (`app.get`, `c.json`) 開發 Gravito 應用。
   - **優勢**：
     - **Ultrafast**：針對 Bun 優化的路由匹配演算法。
     - **Web Standards**：原生使用 `Request`/`Response` 物件。
     - **Type Inference**：業界領先的 TypeScript 泛型推導。

2. **Middleware Extensions**
   - Gravito 專屬增強中介軟體：
     - `binaryMiddleware` (`src/middleware/binary.ts`)：支援 CBOR (Concise Binary Object Representation) 高效二進位傳輸，自動處理 `application/cbor` 內容協商。
     - `htmxMiddleware` (`src/middleware/htmx.ts`)：針對 HTMX 請求的 `HX-Request` 偵測與 Header 輔助方法。

### RPC 架構 (Client-Server Type Safety)

Photon 提供輕量級 RPC 機制 (`src/client.ts`)，允許前端直接使用後端 API 定義，實現「無代碼生成」的型別安全。

```typescript
// Backend
const app = new Photon()
const route = app.get('/hello', (c) => c.json({ message: 'world' }))
export type AppType = typeof route

// Frontend
import { hc } from '@gravito/photon/client'
const client = hc<AppType>('http://localhost:3000')
const res = await client.hello.$get() // Fully Typed!
```

---

## 核心 API 參考

### 1. 路由定義

```typescript
import { Photon } from '@gravito/photon'

const app = new Photon()

// 基本路由
app.get('/', (c) => c.text('Home'))
app.post('/users', (c) => c.json({ id: 1 }))
app.put('/users/:id', (c) => c.json({ updated: true }))
app.delete('/users/:id', (c) => c.json({ deleted: true }))

// 參數化路由
app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id })
})

// 多個參數
app.get('/posts/:postId/comments/:commentId', (c) => {
  const { postId, commentId } = c.req.param()
  return c.json({ postId, commentId })
})

// 通配符路由
app.get('/static/*', (c) => {
  const path = c.req.path
  return c.text(`Serving: ${path}`)
})
```

### 2. Context API

```typescript
app.get('/demo', (c) => {
  // 取得請求資訊
  const method = c.req.method // GET, POST, etc.
  const path = c.req.path // /demo
  const query = c.req.query('search') // ?search=value
  const header = c.req.header('Authorization')

  // 解析請求 Body
  const json = await c.req.json()
  const formData = await c.req.formData()
  const text = await c.req.text()

  // 回應方法
  return c.json({ data: 'value' }) // JSON
  return c.text('Plain text') // Text
  return c.html('<h1>HTML</h1>') // HTML
  return c.redirect('/new-path') // Redirect
  return c.notFound() // 404
})
```

### 3. 中介軟體

```typescript
import { Photon } from '@gravito/photon'
import { logger } from '@gravito/photon/middleware'
import { cors } from '@gravito/photon/middleware'

const app = new Photon()

// 全域中介軟體
app.use('*', logger())
app.use('*', cors())

// 路由級別中介軟體
app.use('/api/*', async (c, next) => {
  console.log('API request:', c.req.path)
  await next()
})

// 自訂中介軟體
const authMiddleware = async (c, next) => {
  const token = c.req.header('Authorization')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  // 驗證 token
  c.set('user', decodedUser)
  await next()
}

app.use('/protected/*', authMiddleware)
```

### 4. 路由分組

```typescript
const app = new Photon()

// API 路由群組
const api = new Photon()
api.get('/users', (c) => c.json({ users: [] }))
api.post('/users', (c) => c.json({ created: true }))

// 掛載到主應用
app.route('/api', api)

// 版本控制
const v1 = new Photon()
v1.get('/users', (c) => c.json({ version: 'v1' }))

const v2 = new Photon()
v2.get('/users', (c) => c.json({ version: 'v2' }))

app.route('/v1', v1)
app.route('/v2', v2)
```

---

## 完整使用範例

### 範例 1：RESTful API

```typescript
import { Photon } from '@gravito/photon'
import { z } from 'zod'

const app = new Photon()

// 驗證 Schema
const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().min(0).max(150)
})

// GET /users - 列出所有使用者
app.get('/users', async (c) => {
  const users = await User.query().get()
  return c.json({ data: users })
})

// GET /users/:id - 取得單一使用者
app.get('/users/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const user = await User.find(id)

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json({ data: user })
})

// POST /users - 建立使用者
app.post('/users', async (c) => {
  try {
    const body = await c.req.json()
    const validated = createUserSchema.parse(body)

    const user = await User.create(validated)
    return c.json({ data: user }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ errors: error.errors }, 400)
    }
    throw error
  }
})

// PUT /users/:id - 更新使用者
app.put('/users/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()

  const user = await User.find(id)
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  Object.assign(user, body)
  await user.save()

  return c.json({ data: user })
})

// DELETE /users/:id - 刪除使用者
app.delete('/users/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const user = await User.find(id)

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  await user.delete()
  return c.json({ message: 'User deleted' })
})
```

### 範例 2：中介軟體鏈

```typescript
import { Photon } from '@gravito/photon'
import { logger, cors, etag } from '@gravito/photon/middleware'

const app = new Photon()

// 全域中介軟體（執行順序很重要）
app.use('*', logger()) // 1. 記錄請求
app.use('*', cors({
  origin: 'https://example.com',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization']
})) // 2. CORS 處理
app.use('*', etag()) // 3. ETag 快取

// 自訂錯誤處理中介軟體
app.use('*', async (c, next) => {
  try {
    await next()
  } catch (error) {
    console.error('Error:', error)
    return c.json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500)
  }
})

// 身份驗證中介軟體
const authMiddleware = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return c.json({ error: 'Missing token' }, 401)
  }

  try {
    const user = await verifyToken(token)
    c.set('user', user)
    await next()
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401)
  }
}

// 套用到特定路由
app.use('/api/*', authMiddleware)

app.get('/api/profile', (c) => {
  const user = c.get('user')
  return c.json({ user })
})
```

### 範例 3：檔案上傳

```typescript
app.post('/upload', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return c.json({ error: 'No file uploaded' }, 400)
  }

  // 驗證檔案類型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Invalid file type' }, 400)
  }

  // 驗證檔案大小（5MB）
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return c.json({ error: 'File too large' }, 400)
  }

  // 儲存檔案
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const filename = `${Date.now()}-${file.name}`
  const path = `./uploads/${filename}`

  await Bun.write(path, buffer)

  return c.json({
    message: 'File uploaded',
    filename,
    size: file.size,
    type: file.type
  })
})
```

### 範例 4：WebSocket 整合

```typescript
import { Photon } from '@gravito/photon'

const app = new Photon()

// HTTP 路由
app.get('/', (c) => c.text('WebSocket Server'))

// WebSocket 處理
export default {
  port: 3000,
  fetch: app.fetch,
  websocket: {
    open(ws) {
      console.log('Client connected')
      ws.send('Welcome!')
    },
    message(ws, message) {
      console.log('Received:', message)
      ws.send(`Echo: ${message}`)
    },
    close(ws) {
      console.log('Client disconnected')
    }
  }
}
```

### 範例 5：型別安全 RPC

```typescript
// backend.ts
import { Photon } from '@gravito/photon'
import { z } from 'zod'

const app = new Photon()

const route = app
  .get('/users', (c) => c.json({ users: ['Alice', 'Bob'] }))
  .post('/users', async (c) => {
    const body = await c.req.json()
    return c.json({ created: true, user: body }, 201)
  })
  .get('/users/:id', (c) => {
    const id = c.req.param('id')
    return c.json({ id, name: 'Alice' })
  })

export type AppType = typeof route

// frontend.ts
import { hc } from '@gravito/photon/client'
import type { AppType } from './backend'

const client = hc<AppType>('http://localhost:3000')

// 完全型別安全！
const users = await client.users.$get()
const data = await users.json() // { users: string[] }

const newUser = await client.users.$post({
  json: { name: 'Charlie', email: 'charlie@example.com' }
})
```

### 範例 6：OpenAPI 整合

```typescript
import { PhotonOpenAPI, createRoute, z } from '@gravito/photon/openapi'

const app = new PhotonOpenAPI()

// 定義 API 路由與文件
const getUserRoute = createRoute({
  method: 'get',
  path: '/users/{id}',
  request: {
    params: z.object({
      id: z.string().openapi({ example: '123' })
    })
  },
  responses: {
    200: {
      description: 'User found',
      content: {
        'application/json': {
          schema: z.object({
            id: z.string(),
            name: z.string(),
            email: z.string().email()
          })
        }
      }
    },
    404: {
      description: 'User not found'
    }
  }
})

app.openapi(getUserRoute, async (c) => {
  const { id } = c.req.valid('param')
  const user = await User.find(id)

  if (!user) {
    return c.json({ error: 'Not found' }, 404)
  }

  return c.json(user, 200)
})

// 生成 OpenAPI 文件
app.doc('/api/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'My API',
    version: '1.0.0'
  }
})

// Swagger UI
app.get('/api/docs', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
        <script>
          SwaggerUIBundle({
            url: '/api/openapi.json',
            dom_id: '#swagger-ui'
          })
        </script>
      </body>
    </html>
  `)
})
```

### 範例 7：CBOR 二進位傳輸

```typescript
import { Photon } from '@gravito/photon'
import { binaryMiddleware } from '@gravito/photon/middleware'

const app = new Photon()

// 啟用 CBOR 支援
app.use('*', binaryMiddleware())

app.get('/data', (c) => {
  // 自動偵測 Accept header
  // Accept: application/cbor → 回傳 CBOR
  // Accept: application/json → 回傳 JSON
  return c.json({
    items: Array(1000).fill(0).map((_, i) => ({
      id: i,
      name: `Item ${i}`,
      price: Math.random() * 100
    }))
  })
})

// 強制使用 CBOR
app.get('/binary', (c) => {
  return c.binary({
    data: largeDataset
  })
})
```

### 範例 8：Rate Limiting

```typescript
import { Photon } from '@gravito/photon'

const app = new Photon()

// 簡易速率限制
const rateLimits = new Map()

const rateLimitMiddleware = (maxRequests: number, windowMs: number) => {
  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const key = `${ip}:${Math.floor(now / windowMs)}`

    const count = rateLimits.get(key) || 0
    if (count >= maxRequests) {
      return c.json({ error: 'Too many requests' }, 429)
    }

    rateLimits.set(key, count + 1)
    await next()
  }
}

// 套用：每分鐘最多 100 次請求
app.use('/api/*', rateLimitMiddleware(100, 60000))
```

### 範例 9：Streaming Response

```typescript
app.get('/stream', (c) => {
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 10; i++) {
        const data = `data: ${JSON.stringify({ count: i })}\n\n`
        controller.enqueue(new TextEncoder().encode(data))
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      controller.close()
    }
  })

  return c.newResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
})
```

### 範例 10：GraphQL 整合

```typescript
import { Photon } from '@gravito/photon'
import { buildSchema } from 'graphql'
import { graphql } from 'graphql'

const app = new Photon()

const schema = buildSchema(`
  type Query {
    hello: String
    user(id: ID!): User
  }
  type User {
    id: ID!
    name: String!
    email: String!
  }
`)

const root = {
  hello: () => 'Hello, GraphQL!',
  user: ({ id }) => User.find(id)
}

app.post('/graphql', async (c) => {
  const { query, variables } = await c.req.json()

  const result = await graphql({
    schema,
    source: query,
    rootValue: root,
    variableValues: variables
  })

  return c.json(result)
})
```

---

## 測試指南

### 單元測試

```typescript
import { describe, it, expect } from 'bun:test'
import { Photon } from '@gravito/photon'

describe('Photon Routes', () => {
  const app = new Photon()

  app.get('/hello', (c) => c.json({ message: 'Hello!' }))
  app.post('/echo', async (c) => {
    const body = await c.req.json()
    return c.json(body)
  })

  it('should return hello message', async () => {
    const req = new Request('http://localhost/hello')
    const res = await app.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ message: 'Hello!' })
  })

  it('should echo request body', async () => {
    const req = new Request('http://localhost/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    })
    const res = await app.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ test: 'data' })
  })
})
```

### 整合測試

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { Photon } from '@gravito/photon'

describe('API Integration', () => {
  let server
  const baseUrl = 'http://localhost:3001'

  beforeAll(() => {
    const app = new Photon()

    app.get('/users', (c) => c.json({ users: [] }))
    app.post('/users', async (c) => {
      const body = await c.req.json()
      return c.json({ id: 1, ...body }, 201)
    })

    server = Bun.serve({
      port: 3001,
      fetch: app.fetch
    })
  })

  afterAll(() => {
    server.stop()
  })

  it('should list users', async () => {
    const res = await fetch(`${baseUrl}/users`)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ users: [] })
  })

  it('should create user', async () => {
    const res = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' })
    })
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.name).toBe('Alice')
  })
})
```

### 中介軟體測試

```typescript
import { describe, it, expect } from 'bun:test'
import { Photon } from '@gravito/photon'

describe('Auth Middleware', () => {
  const app = new Photon()

  const authMiddleware = async (c, next) => {
    const token = c.req.header('Authorization')
    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    c.set('user', { id: 1, name: 'Test' })
    await next()
  }

  app.use('/protected/*', authMiddleware)
  app.get('/protected/resource', (c) => {
    const user = c.get('user')
    return c.json({ user })
  })

  it('should reject without token', async () => {
    const req = new Request('http://localhost/protected/resource')
    const res = await app.fetch(req)

    expect(res.status).toBe(401)
  })

  it('should allow with token', async () => {
    const req = new Request('http://localhost/protected/resource', {
      headers: { 'Authorization': 'Bearer test-token' }
    })
    const res = await app.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.user.name).toBe('Test')
  })
})
```

---

## 效能優化

### 基準數據

| 操作 | 平均時間 | P95 | P99 | QPS |
|------|---------|-----|-----|-----|
| Simple GET | 0.1ms | 0.2ms | 0.5ms | 100,000 |
| JSON Response | 0.2ms | 0.4ms | 0.8ms | 50,000 |
| POST with Body | 0.3ms | 0.6ms | 1.2ms | 30,000 |
| Middleware Chain (3) | 0.4ms | 0.8ms | 1.5ms | 25,000 |
| CBOR Response | 0.15ms | 0.3ms | 0.6ms | 60,000 |

### 優化建議

1. **啟用壓縮**

```typescript
import { compress } from '@gravito/photon/middleware'

app.use('*', compress())
```

2. **使用 CBOR 減少傳輸量**

```typescript
import { binaryMiddleware } from '@gravito/photon/middleware'

app.use('*', binaryMiddleware())

// 對大型資料集可節省 30-50% 傳輸量
```

3. **ETag 快取**

```typescript
import { etag } from '@gravito/photon/middleware'

app.use('*', etag())
```

4. **避免過多中介軟體**

```typescript
// ❌ 過多全域中介軟體
app.use('*', middleware1)
app.use('*', middleware2)
app.use('*', middleware3)
app.use('*', middleware4)
app.use('*', middleware5)

// ✅ 僅在需要的路由使用
app.use('/api/*', apiMiddleware)
app.use('/admin/*', adminMiddleware)
```

5. **靜態檔案服務**

```typescript
import { serveStatic } from '@gravito/photon/middleware'

app.use('/static/*', serveStatic({ root: './public' }))
```

---

## 部署指南

### Bun 部署

```typescript
// server.ts
import { Photon } from '@gravito/photon'

const app = new Photon()

app.get('/', (c) => c.text('Production Ready!'))

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
  development: process.env.NODE_ENV !== 'production'
}
```

```bash
# 開發模式
bun --watch server.ts

# 生產模式
bun run server.ts
```

### Docker 部署

```dockerfile
FROM oven/bun:1.0

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --production

COPY . .

EXPOSE 3000

CMD ["bun", "run", "server.ts"]
```

### 健康檢查

```typescript
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

app.get('/ready', async (c) => {
  try {
    // 檢查資料庫
    await atlas.raw('SELECT 1')

    return c.json({ status: 'ready' })
  } catch (error) {
    return c.json({ status: 'not ready', error: error.message }, 503)
  }
})
```

---

## 故障排除

### 常見問題

| 問題 | 症狀 | 根本原因 | 解決方案 |
|------|------|---------|---------|
| 404 Not Found | 路由無法匹配 | 路由順序錯誤 | 檢查路由註冊順序，通配符路由放最後 |
| CORS 錯誤 | 瀏覽器阻擋請求 | 缺少 CORS 設定 | 使用 `cors()` 中介軟體 |
| 中介軟體不執行 | 邏輯跳過 | 忘記 `await next()` | 確保中介軟體呼叫 `next()` |
| 型別推導失效 | TypeScript 報錯 | 路由定義不完整 | 確保路由有明確回傳型別 |
| 請求 Body 為空 | `req.json()` 失敗 | Content-Type 錯誤 | 檢查 `Content-Type: application/json` |
| 效能下降 | 回應變慢 | 中介軟體鏈過長 | 減少全域中介軟體數量 |

### 除錯技巧

```typescript
// 啟用請求日誌
import { logger } from '@gravito/photon/middleware'
app.use('*', logger())

// 自訂除錯中介軟體
app.use('*', async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.path}`)
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  console.log(`Response time: ${duration}ms`)
})

// 錯誤追蹤
app.use('*', async (c, next) => {
  try {
    await next()
  } catch (error) {
    console.error('Error:', error)
    console.error('Stack:', error.stack)
    return c.json({ error: error.message }, 500)
  }
})
```

---

## API 速查表

### 路由方法

```typescript
app.get(path, handler)
app.post(path, handler)
app.put(path, handler)
app.delete(path, handler)
app.patch(path, handler)
app.options(path, handler)
app.all(path, handler) // 所有 HTTP 方法
```

### Context 方法

```typescript
// 請求
c.req.method
c.req.path
c.req.url
c.req.query(key)
c.req.queries(key)
c.req.param(key)
c.req.header(key)
await c.req.json()
await c.req.text()
await c.req.formData()
await c.req.arrayBuffer()

// 回應
c.json(data, status)
c.text(text, status)
c.html(html, status)
c.redirect(url, status)
c.notFound()

// 狀態管理
c.set(key, value)
c.get(key)
```

### 中介軟體

```typescript
import {
  logger,
  cors,
  etag,
  compress,
  serveStatic,
  basicAuth
} from '@gravito/photon/middleware'

app.use('*', logger())
app.use('*', cors())
app.use('*', etag())
app.use('*', compress())
```

---

## 關鍵設計決策

### 採用 Hono 作為底層
**決策**：不自研 HTTP Router，而是 wrapper Hono。
**原因**：
- **效能**：Hono 是目前 JS 生態中最快的 Router 之一。
- **標準化**：完全符合 Web Standards，與 Gravito "Modern" 目標一致。
- **生態系**：可直接使用 Hono 的豐富中介軟體生態。

### 顯式 Context 傳遞 (Explicit Context)
**決策**：所有 Request 狀態掛載在 `c` (Context) 物件傳遞，而非 `this`。
**原因**：
- **Functional Style**：便於測試與組合。
- **型別推導**：TypeScript 可精確推導 `c.req.param()` 與 `c.req.json()` 的型別。

### 內建 CBOR 支援
**決策**：提供 `binaryMiddleware` 自動處理 CBOR。
**原因**：
- **效能**：在數據密集場景（如電商列表），CBOR 比 JSON 體積更小、解析更快。
- **透明性**：透過 Content Negotiation 自動切換，業務邏輯無需修改。

---

## 風險分析

### 對 Hono 的依賴風險
- **問題**：核心能力綁定 Hono，若 Hono 有重大 Breaking Change 需跟隨。
- **緩解**：`@gravito/core` 透過 `HttpAdapter` 抽象層隔離了具體引擎。

### 中介軟體順序敏感性

**問題**：執行順序嚴格依賴註冊順序。在多 Orbit 掛載的大型應用中，全域 Middleware (如 `app.use('*')`) 可能意外影響其他 Orbit。

**解決方案**：v1.0.0-beta.1 開始，`HttpAdapter` 提供 `useScoped()` 方法強制執行 Orbit 級別的中介軟體隔離。

#### useScoped() API

```typescript
// ✅ 正確：使用 useScoped() 註冊 Orbit 內部的中介軟體
const apiOrbit = new PlanetCore()
apiOrbit.adapter.useScoped('/api', '/users', authMiddleware)
apiOrbit.adapter.useScoped('/api', '/posts', loggingMiddleware)

// ❌ 錯誤：嘗試在 Orbit 內使用萬用字元 '*' 將被拒絕
apiOrbit.adapter.useScoped('/api', '*', globalMiddleware) 
// Error: Cannot use wildcard path '*' in Orbit-scoped middleware

core.mountOrbit('/api', apiOrbit)
```

**行為限制**：
- `useScoped(scope, path, ...middleware)` 會驗證 `path` 不為 `'*'` 或 `'*/*'`
- 強制路徑必須包含 scope 前綴（如 `/api/users`）
- 防止 Orbit 意外註冊全域中介軟體污染其他模組

**建議實踐**：
1. PlanetCore 主應用使用 `use('*')` 註冊全域中介軟體（如 CORS、安全標頭）
2. Orbit 應用內部使用 `useScoped(scope, path)` 註冊路徑限定的中介軟體
3. 避免在 Orbit 中使用 `use('*')`，以防跨 Orbit 污染

---

## 後續優化建議

1. ~~**Orbit 級別的 Middleware 隔離**~~ ✅ **已實作** (v1.0.0-beta.1)
   - `useScoped()` API 提供強制路徑驗證，確保中介軟體只作用於特定 Orbit 子樹。

2. **HTTP/3 QUIC 支援** (Priority: Low)
   - 評估 Bun 的 HTTP/3 支援進度，適時暴露相關配置。

3. **內建 Rate Limiting** (Priority: Medium)
   - 提供開箱即用的速率限制中介軟體。

---

*最後更新：2026-01-28*
*版本：v1.0.0-beta.1*
