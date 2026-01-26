# @gravito/mass ⚖️

> 基於 TypeBox 的高效能 Schema 驗證工具，專為 Gravito Galaxy 架構設計。

`@gravito/mass` 為您的 Gravito 應用程式提供數據完整性的「重量」。基於 **TypeBox** 構建，它提供了極快的執行期驗證速度與完整的 TypeScript 類型推導，並與 **Photon** HTTP 引擎無縫整合。

## 🌟 核心特性

- **🚀 效能優先**：利用 TypeBox 的編譯期驗證器生成技術，實現近乎零負擔的執行期效能。
- **🛡️ 完整類型安全**：自動進行 TypeScript 類型推導 —— 無需分別維護 Interface 與 Schema。
- **🔌 Photon 深度整合**：提供原生中間件，支援驗證 JSON、Query、URL 參數及表單數據。
- **🛠️ Schema 實用工具**：提供如 `partial()` 等進階輔助函式，輕鬆建立 PATCH 接口所需的 Schema。
- **🪝 靈活的 Hook 機制**：可攔截驗證結果，自定義錯誤回應格式或紀錄日誌。
- **📦 Galaxy 架構相容**：遵循 Gravito 的模組化哲學，保持依賴精簡且高效。

## 📦 安裝

```bash
bun add @gravito/mass
```

## 🚀 快速上手

### 基礎 JSON 驗證

使用 `Schema` 定義數據結構，並透過 `validate` 中間件應用於路由。

```typescript
import { Photon } from '@gravito/photon'
import { Schema, validate } from '@gravito/mass'

const app = new Photon()

const CreateUserSchema = Schema.Object({
  username: Schema.String({ minLength: 3 }),
  email: Schema.String({ format: 'email' }),
  age: Schema.Number({ minimum: 18 })
})

app.post('/users', 
  validate('json', CreateUserSchema), 
  (c) => {
    // 數據已自動推導類型為 { username: string; email: string; age: number }
    const user = c.req.valid('json')
    return c.json({ success: true, data: user })
  }
)
```

### 驗證不同數據源

Mass 可以驗證 HTTP 請求中不同位置的數據：

```typescript
// 驗證 Query 參數
app.get('/search', 
  validate('query', Schema.Object({ q: Schema.String() })),
  (c) => {
    const { q } = c.req.valid('query')
    return c.text(`正在搜尋：${q}`)
  }
)

// 驗證 URL 參數
app.get('/users/:id',
  validate('param', Schema.Object({ id: Schema.Number() })),
  (c) => {
    const { id } = c.req.valid('param')
    return c.json({ userId: id })
  }
)
```

## ⏳ 進階模式

### 部分更新 (PATCH)

使用 `partial()` 工具將 Schema 中的所有屬性轉為可選，非常適合用於更新接口。

```typescript
import { partial } from '@gravito/mass'

const UpdateUserSchema = partial(CreateUserSchema)

app.patch('/users/:id', 
  validate('json', UpdateUserSchema), 
  (c) => {
    const updates = c.req.valid('json')
    return c.json({ updated: updates })
  }
)
```

### 自定義錯誤處理

透過驗證 Hook 覆蓋預設的 400 回應，提供符合您需求的錯誤格式。

```typescript
app.post('/strict-endpoint',
  validate('json', schema, (result, c) => {
    if (!result.success) {
      return c.json({
        code: 'VAL_ERR',
        errors: result.errors.map(e => ({ field: e.path, msg: e.message }))
      }, 422)
    }
  }),
  (c) => c.text('成功')
)
```

## 🧩 API 參考

### `validate(source, schema, hook?)`
強制執行 Schema 驗證的主要中間件。
- `source`: `'json' | 'query' | 'param' | 'form'`
- `schema`: TypeBox Schema 實例。
- `hook`: `(result, context) => Response | undefined`

### `Schema`
定義數據結構的核心工具，重新導出了所有 TypeBox 的建構子。
- `Schema.String()`
- `Schema.Number()`
- `Schema.Boolean()`
- `Schema.Object({ ... })`
- `Schema.Array(...)`
- `Schema.Optional(...)`

### `partial(schema)`
遞迴地將物件 Schema 中的所有屬性設為可選。

## 🤝 參與貢獻

我們歡迎任何形式的貢獻！詳細資訊請參閱 [貢獻指南](../../CONTRIBUTING.md)。

## 📄 開源授權

MIT © Carl Lee
