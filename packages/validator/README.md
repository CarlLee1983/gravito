# @gravito/validator

TypeBox-based validation for Gravito - High-performance schema validation with full TypeScript support.

## 特色

- **高效能驗證**: 基於 TypeBox，比 Zod 更快的執行速度
- **完整 TypeScript 支援**: 自動推導型別，無需手動定義
- **Hono 整合**: 完美整合 Hono 的驗證中間件
- **多種資料來源**: 支援 JSON、Query、Param、Form 驗證

## 安裝

```bash
bun add @gravito/validator
```

## 基本使用

### JSON 驗證

```typescript
import { Hono } from 'hono'
import { Schema, validate } from '@gravito/validator'

const app = new Hono()

app.post('/login',
  validate('json', Schema.Object({
    username: Schema.String(),
    password: Schema.String()
  })),
  (c) => {
    const { username } = c.req.valid('json')
    return c.json({ success: true, message: `Welcome ${username}` })
  }
)
```

### Query 參數驗證

```typescript
app.get('/search',
  validate('query', Schema.Object({
    q: Schema.String(),
    page: Schema.Optional(Schema.Number())
  })),
  (c) => {
    const { q, page } = c.req.valid('query')
    return c.json({ query: q, page: page ?? 1 })
  }
)
```

### Route 參數驗證

```typescript
app.get('/users/:id',
  validate('param', Schema.Object({
    id: Schema.String({ pattern: '^[0-9]+$' })
  })),
  (c) => {
    const { id } = c.req.valid('param')
    return c.json({ userId: id })
  }
)
```

## Schema 建構器

`Schema` 物件提供所有 TypeBox 的建構器：

```typescript
import { Schema } from '@gravito/validator'

// 基本型別
Schema.String()
Schema.Number()
Schema.Boolean()
Schema.Array(Schema.String())

// 物件
Schema.Object({
  name: Schema.String(),
  age: Schema.Number()
})

// 選填欄位
Schema.Optional(Schema.String())

// 預設值
Schema.String({ default: 'hello' })

// 驗證規則
Schema.String({ minLength: 2, maxLength: 100 })
Schema.Number({ minimum: 0, maximum: 100 })
Schema.String({ format: 'email' })
```

## 與 Hono Client 整合

使用 `app.route()` 方法串接路由模組，可以獲得完整的型別推導：

```typescript
// app.ts
import { Hono } from 'hono'
import { userRoute } from './routes/user'

const app = new Hono()
const routes = app.route('/api/users', userRoute)

export default app
export type AppRoutes = typeof routes
```

前端使用時可以獲得完整的型別提示：

```typescript
// client.ts
import { hc } from 'hono/client'
import type { AppRoutes } from './types'

export const createClient = (baseUrl: string) => {
  return hc<AppRoutes>(baseUrl)
}

// 使用時有完整的型別提示
const client = createClient('http://localhost:3000')
const result = await client.api.users.login.$post({
  json: { username: 'user', password: 'pass' }
})
```

## 效能優勢

TypeBox 相較於 Zod 的優勢：

- **編譯時驗證**: TypeBox 在編譯時生成驗證器，執行時效能更高
- **更小的 bundle**: 產生的程式碼更小
- **更好的型別推導**: 與 TypeScript 深度整合

## License

MIT

