# HTTP 框架（Photon）集成設計

## 1. 背景 (Background)

### 1.1 Photon 的角色

Photon 是 Gravito 的 HTTP 層實現，基於 **Hono** 框架。它提供：
- 路由、中介軟體系統
- 請求/回應處理
- WebSocket 支援
- OpenAPI 文檔生成
- JWT 認證工具

### 1.2 為什麼選擇 Hono？

```
HTTP 框架對比：

Express        (老牌，成熟但笨重)
├─ 庫大小：15MB
├─ 啟動時間：1.5s
└─ 性能：中等

Fastify        (新興，快速)
├─ 庫大小：8MB
├─ 啟動時間：0.8s
└─ 性能：很快

Hono           (超輕量，邊計算友好)
├─ 庫大小：150KB  ← Gravito 選擇
├─ 啟動時間：0.1s
└─ 性能：極快

Gravito 選擇 Hono 的原因：
✅ 超輕量級（適合 Serverless）
✅ Bun 原生支援
✅ 中介軟體生態豐富
✅ 性能優異
```

---

## 2. Photon 核心概念 (Core Concepts)

### 2.1 適配器模式（Adapter Pattern）

Gravito 使用適配器模式，允許未來切換 HTTP 引擎：

```typescript
// 1. 定義通用接口
interface HttpAdapter {
  use(middleware: GravitoMiddleware): void
  get(path: string, handler: GravitoHandler): void
  post(path: string, handler: GravitoHandler): void
  listen(port: number): Promise<void>
}

// 2. 實現 Photon 適配器
class PhotonAdapter implements HttpAdapter {
  private hono = new Hono()

  use(middleware: GravitoMiddleware) {
    this.hono.use(middleware)
  }

  get(path: string, handler: GravitoHandler) {
    this.hono.get(path, handler)
  }
}

// 3. 在 PlanetCore 中使用抽象接口（不依賴具體實現）
export class PlanetCore {
  constructor(private httpAdapter: HttpAdapter) {}

  registerRoute(method: 'GET' | 'POST', path: string, handler: GravitoHandler) {
    this.httpAdapter[method.toLowerCase()](path, handler)
  }
}

// 4. 應用層選擇具體適配器
const app = new PlanetCore(new PhotonAdapter())
```

**優點**：
- ✅ 解耦核心與 HTTP 引擎
- ✅ 支援多引擎共存
- ✅ 便於測試（可使用 mock 適配器）
- ✅ 未來易於切換

### 2.2 GravitoContext 統一接口

所有 HTTP 層操作透過統一的 `GravitoContext`：

```typescript
interface GravitoContext {
  // 請求
  req: GravitoRequest
  request: Request

  // 回應
  text(data: string): Response
  json(object: any): Response
  html(html: string): Response

  // 狀態碼
  status(code: number): GravitoContext

  // 中介軟體
  next: GravitoNext
  env: GravitoVariables

  // 路由參數
  param(name: string): string
  params(): Record<string, string>

  // 查詢參數
  query(name: string): string
  queryByFormat(name: string, format: string): any
}
```

---

## 3. 路由系統 (Routing System)

### 3.1 基礎路由

```typescript
// 簡單的 GET 路由
app.get('/api/products', async (ctx: GravitoContext) => {
  const products = await catalog.listProducts()
  return ctx.json(products)
})

// 帶路由參數的 GET
app.get('/api/products/:id', async (ctx: GravitoContext) => {
  const id = ctx.param('id')
  const product = await catalog.getProduct(id)
  return ctx.json(product)
})

// POST 路由
app.post('/api/products', async (ctx: GravitoContext) => {
  const data = await ctx.req.json()
  const product = await catalog.createProduct(data)
  return ctx.json(product)
})
```

### 3.2 路由分組與前綴

```typescript
// 使用前綴與分組組織路由
core.router.prefix('/api/v1').group((router) => {
  // 商品路由
  router.get('/catalog/products', listProducts)
  router.post('/catalog/products', createProduct)

  // 訂單路由
  router.get('/commerce/orders', listOrders)
  router.post('/commerce/orders', createOrder)
})

// 生成的路由：
// GET  /api/v1/catalog/products
// POST /api/v1/catalog/products
// GET  /api/v1/commerce/orders
// POST /api/v1/commerce/orders
```

### 3.3 路由參數驗證

```typescript
// 使用 Zod Schema 驗證
import { z } from 'zod'

const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  price: z.number().positive(),
  stock: z.number().int().min(0)
})

app.post('/api/products', async (ctx: GravitoContext) => {
  const data = await ctx.req.json()

  // 驗證
  const result = productSchema.safeParse(data)
  if (!result.success) {
    return ctx.status(400).json({
      error: 'Validation failed',
      details: result.error.issues
    })
  }

  const product = await catalog.createProduct(result.data)
  return ctx.json(product)
})
```

---

## 4. 中介軟體系統 (Middleware System)

### 4.1 中介軟體基礎

```typescript
// 日誌中介軟體
const loggingMiddleware = async (ctx: GravitoContext, next: GravitoNext) => {
  const start = Date.now()

  console.log(`[REQUEST] ${ctx.req.method} ${ctx.req.pathname}`)

  await next()  // 執行後續中介軟體和路由處理器

  const duration = Date.now() - start
  console.log(`[RESPONSE] ${ctx.req.method} ${ctx.req.pathname} - ${duration}ms`)
}

// 註冊中介軟體
app.use(loggingMiddleware)
```

### 4.2 認證中介軟體

```typescript
// JWT 驗證中介軟體
const authMiddleware = async (ctx: GravitoContext, next: GravitoNext) => {
  const token = ctx.req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return ctx.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const payload = verifyJWT(token)
    ctx.set('user', payload)  // 將用戶信息存入上下文
    await next()
  } catch (error) {
    return ctx.status(401).json({ error: 'Invalid token' })
  }
}

app.use(authMiddleware)
```

### 4.3 錯誤處理中介軟體

```typescript
// 全局錯誤處理
const errorMiddleware = async (ctx: GravitoContext, next: GravitoNext) => {
  try {
    await next()
  } catch (error: any) {
    console.error('Unhandled error:', error)

    // 應用層錯誤
    if (error instanceof ApplicationError) {
      return ctx.status(error.statusCode).json({
        error: error.message
      })
    }

    // 資料庫錯誤
    if (error instanceof DatabaseError) {
      return ctx.status(500).json({
        error: 'Database operation failed'
      })
    }

    // 未知錯誤
    return ctx.status(500).json({
      error: 'Internal server error'
    })
  }
}

app.use(errorMiddleware)
```

### 4.4 速率限制中介軟體

```typescript
// Photon 提供的速率限制
import { ratelimit } from '@gravito/photon/middleware/ratelimit'

const rateLimitMiddleware = ratelimit({
  windowMs: 15 * 60 * 1000,  // 15 分鐘
  max: 100,                   // 最多 100 個請求
  keyGenerator: (ctx) => ctx.req.header('x-forwarded-for') || 'unknown'
})

app.use('/api/*', rateLimitMiddleware)
```

---

## 5. OpenAPI 文檔生成 (OpenAPI Documentation)

### 5.1 自動生成 API 文檔

```typescript
import { openapi } from '@gravito/photon'

// 使用 Zod Schema 定義端點
const listProductsSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional()
})

const responseSchema = z.array(z.object({
  id: z.string(),
  name: z.string(),
  price: z.number()
}))

app.openapi(
  openapi.createRoute({
    method: 'get',
    path: '/api/v1/products',
    summary: '列舉所有商品',
    description: '分頁列舉商品列表',
    request: {
      query: listProductsSchema
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: responseSchema
          }
        }
      }
    }
  }),
  listProducts
)
```

### 5.2 生成 Swagger UI

```typescript
// 自動生成 /api/docs 端點
import { swaggerUI } from '@gravito/photon'

const app = createApp()
app.use(swaggerUI('/api/docs'))

// 訪問 http://localhost:3000/api/docs 查看 Swagger UI
```

---

## 6. WebSocket 支援 (WebSocket Support)

### 6.1 WebSocket 連接

```typescript
// 處理 WebSocket 連接
app.get('/ws', (ctx: GravitoContext) => {
  if (!ctx.upgrade) {
    return ctx.text('Upgrade header not found', 400)
  }

  const socket = ctx.upgrade()

  socket.addEventListener('open', () => {
    console.log('WebSocket connected')
    socket.send('Welcome to Gravito WebSocket')
  })

  socket.addEventListener('message', (event) => {
    console.log('Received:', event.data)
    socket.send(`Echo: ${event.data}`)
  })

  socket.addEventListener('close', () => {
    console.log('WebSocket disconnected')
  })

  return undefined
})
```

### 6.2 實時消息推送

```typescript
// 連接管理
const activeConnections = new Map<string, WebSocket>()

app.post('/api/broadcast', (ctx: GravitoContext) => {
  const data = await ctx.req.json()

  // 發送給所有連接的客戶端
  for (const [userId, socket] of activeConnections) {
    socket.send(JSON.stringify({
      type: 'broadcast',
      data: data
    }))
  }

  return ctx.json({ success: true })
})
```

---

## 7. 與衛星集成 (Satellite Integration)

### 7.1 衛星路由註冊

```typescript
// Catalog 衛星註冊自己的路由
export class CatalogServiceProvider extends ServiceProvider {
  override boot(): void {
    const core = this.core!
    const adminCtrl = core.container.make('catalog.controller.admin')

    // 在衛星中註冊路由
    core.router.prefix('/api/v1/catalog').group((router) => {
      router.get('/products', (ctx) => adminCtrl.listProducts(ctx))
      router.post('/products', (ctx) => adminCtrl.createProduct(ctx))
      router.patch('/products/:id', (ctx) => adminCtrl.updateProduct(ctx))
    })
  }
}
```

### 7.2 跨衛星的中介軟體

```typescript
// Membership 衛星提供認證中介軟體
const authMiddleware = async (ctx: GravitoContext, next: GravitoNext) => {
  const token = ctx.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return ctx.status(401).json({ error: 'Unauthorized' })
  }

  const user = await verifyToken(token)
  ctx.set('user', user)
  await next()
}

// 在 boot() 中註冊
override boot(): void {
  const core = this.core!
  core.router.use(authMiddleware)  // 全局應用
}
```

---

## 8. 性能最佳實踐 (Performance Best Practices)

### 8.1 路由性能優化

```typescript
// ❌ 低效：每次請求都重新計算
app.get('/api/products', async (ctx) => {
  const products = await DB.query('SELECT * FROM products')
  return ctx.json(products)
})

// ✅ 高效：使用緩存
const productCache = new Map()
const CACHE_TTL = 5 * 60 * 1000  // 5 分鐘

app.get('/api/products', async (ctx) => {
  const cached = productCache.get('all')
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return ctx.json(cached.data)
  }

  const products = await DB.query('SELECT * FROM products')
  productCache.set('all', { data: products, time: Date.now() })
  return ctx.json(products)
})
```

### 8.2 流式回應

```typescript
// 大型文件下載使用流式回應
app.get('/api/export/products', async (ctx: GravitoContext) => {
  const fileName = 'products.csv'
  ctx.header('Content-Disposition', `attachment; filename="${fileName}"`)

  // 使用流而非一次性讀取
  const stream = fs.createReadStream('products.csv')
  return ctx.body(stream)
})
```

### 8.3 請求體大小限制

```typescript
// 限制上傳文件大小
const bodyLimitMiddleware = async (ctx: GravitoContext, next: GravitoNext) => {
  const contentLength = parseInt(ctx.req.header('content-length') || '0')
  const maxSize = 10 * 1024 * 1024  // 10MB

  if (contentLength > maxSize) {
    return ctx.status(413).json({
      error: 'Payload too large'
    })
  }

  await next()
}

app.use(bodyLimitMiddleware)
```

---

## 9. 常見模式 (Common Patterns)

### 9.1 RESTful API 標準

```typescript
// CRUD 操作標準模式
app.get('/api/products', listProducts)           // 列表
app.post('/api/products', createProduct)         // 建立
app.get('/api/products/:id', getProduct)         // 詳情
app.put('/api/products/:id', updateProduct)      // 更新
app.patch('/api/products/:id', patchProduct)     // 部分更新
app.delete('/api/products/:id', deleteProduct)   // 刪除
```

### 9.2 分頁

```typescript
app.get('/api/products', async (ctx: GravitoContext) => {
  const page = parseInt(ctx.query('page') || '1')
  const limit = parseInt(ctx.query('limit') || '20')
  const offset = (page - 1) * limit

  const [products, total] = await Promise.all([
    DB.table('products').limit(limit).offset(offset).get(),
    DB.table('products').count().first()
  ])

  return ctx.json({
    data: products,
    pagination: {
      page,
      limit,
      total: total.count,
      pages: Math.ceil(total.count / limit)
    }
  })
})
```

### 9.3 搜索與過濾

```typescript
app.get('/api/products', async (ctx: GravitoContext) => {
  let query = DB.table('products')

  // 搜索
  if (ctx.query('search')) {
    query = query.where('name', 'like', `%${ctx.query('search')}%`)
  }

  // 過濾
  if (ctx.query('category')) {
    query = query.where('category_id', ctx.query('category'))
  }

  if (ctx.query('minPrice')) {
    query = query.where('price', '>=', ctx.query('minPrice'))
  }

  if (ctx.query('maxPrice')) {
    query = query.where('price', '<=', ctx.query('maxPrice'))
  }

  // 排序
  const sort = ctx.query('sort') || 'created_at'
  const order = ctx.query('order') === 'asc' ? 'asc' : 'desc'
  query = query.orderBy(sort, order)

  return ctx.json(await query.get())
})
```

---

## 10. 相關文檔與資源

- **[packages/photon/](../../packages/photon/)** - Photon 源代碼
- **[packages/photon/src/middleware/](../../packages/photon/src/middleware/)** - 中介軟體示例
- **[Hono 官方文檔](https://hono.dev)** - 完整參考
- **[OpenAPI 規範](https://swagger.io/specification/)** - API 文檔標準

---

**撰寫日期**：2026-02-08
**版本**：1.0
