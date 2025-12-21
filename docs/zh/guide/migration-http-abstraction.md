# Gravito HTTP 抽象層 - 遷移指南

> 將程式碼從 Hono 類型遷移到 Gravito 抽象的逐步指南。

## 概述

Gravito 2.0 引入了 HTTP 抽象層，將您的程式碼與底層 HTTP 引擎解耦。這使得未來可以遷移到自訂的 Bun 原生實現，以獲得最佳效能。

## 快速參考

| 之前 (Hono) | 之後 (Gravito) |
|-------------|----------------|
| `import type { Context } from 'hono'` | `import type { GravitoContext } from 'gravito-core'` |
| `import type { Handler } from 'hono'` | `import type { GravitoHandler } from 'gravito-core'` |
| `import type { MiddlewareHandler } from 'hono'` | `import type { GravitoMiddleware } from 'gravito-core'` |
| `import type { Next } from 'hono'` | `import type { GravitoNext } from 'gravito-core'` |
| `c.req.param('id')` | `ctx.req.param('id')` (相同 API!) |
| `c.json({ data })` | `ctx.json({ data })` (相同 API!) |

## 遷移步驟

### 步驟 1: 更新導入

```typescript
// 之前
import type { Context, MiddlewareHandler } from 'hono'

// 之後
import type { GravitoContext, GravitoMiddleware } from 'gravito-core'
```

### 步驟 2: 更新控制器類型

```typescript
// 之前
import type { Context } from 'hono'

export class UserController {
  async index(c: Context) {
    return c.json({ users: await User.all() })
  }
}

// 之後
import type { GravitoContext } from 'gravito-core'

export class UserController {
  async index(ctx: GravitoContext) {
    return ctx.json({ users: await User.all() })
  }
}
```

### 步驟 3: 更新中介軟體類型

```typescript
// 之前
import type { MiddlewareHandler, Next } from 'hono'

const logger: MiddlewareHandler = async (c, next) => {
  console.log(`${c.req.method} ${c.req.path}`)
  await next()
}

// 之後
import type { GravitoMiddleware, GravitoNext } from 'gravito-core'

const logger: GravitoMiddleware = async (ctx, next) => {
  console.log(`${ctx.req.method} ${ctx.req.path}`)
  await next()
}
```

## 相容模式

為了漸進式遷移，可使用相容層：

```typescript
// 遷移期間，您可以使用 Hono 風格的別名：
import type { Context, MiddlewareHandler, Next } from 'gravito-core/compat'

// 您現有的程式碼無需修改即可使用！
export async function myMiddleware(c: Context, next: Next) {
  await next()
}
```

## 原生存取 (逃生艙口)

當您需要尚未抽象的 Hono 特定功能時：

```typescript
import type { GravitoContext } from 'gravito-core'
import type { Context as HonoContext } from 'hono'

async function advancedHandler(ctx: GravitoContext) {
  // 存取底層 Hono context
  const honoCtx = ctx.native as HonoContext
  
  // 使用 Hono 特定功能
  honoCtx.executionCtx.waitUntil(...)
  
  return ctx.json({ ok: true })
}
```

## API 相容性

`GravitoContext` API 設計為與 Hono 的 `Context` 相匹配：

| 方法 | 相容性 |
|------|--------|
| `ctx.req.param(name)` | ✅ 完全相同 |
| `ctx.req.query(name)` | ✅ 完全相同 |
| `ctx.req.header(name)` | ✅ 完全相同 |
| `ctx.req.json()` | ✅ 完全相同 |
| `ctx.req.text()` | ✅ 完全相同 |
| `ctx.req.formData()` | ✅ 完全相同 |
| `ctx.json(data, status?)` | ✅ 完全相同 |
| `ctx.text(text, status?)` | ✅ 完全相同 |
| `ctx.html(html, status?)` | ✅ 完全相同 |
| `ctx.redirect(url, status?)` | ✅ 完全相同 |
| `ctx.header(name, value)` | ✅ 完全相同 |
| `ctx.get(key)` | ✅ 完全相同 |
| `ctx.set(key, value)` | ✅ 完全相同 |

## 擴展變數

要在您的 Orbit 中添加自訂 context 變數：

```typescript
// 在您的 orbit 模組中
declare module 'gravito-core' {
  interface GravitoVariables {
    myService: MyService
  }
}

// 現在 TypeScript 知道 ctx.get('myService') 的類型了
```

## 遷移優勢

1. **面向未來**：您的程式碼將與任何 HTTP 適配器配合使用
2. **類型安全**：完整的 TypeScript 支援
3. **效能**：為 Bun 原生優化做好準備
4. **一致性**：整個框架統一的 API

## 常見問題

### Q: 我現有的程式碼會崩潰嗎？
A: 不會！遷移是可選的，完全向後相容。

### Q: Hono 支援何時會被棄用？
A: 沒有計劃棄用。您可以繼續使用 Hono 類型。

### Q: 如何使用 Hono 中介軟體？
A: Hono 中介軟體通過 `core.app.use()` 繼續正常工作。

---

如有問題，請在 [GitHub](https://github.com/gravito-framework/gravito) 上開啟 issue。
