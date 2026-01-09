---
title: 輔助函式 (Helpers)
description: 了解 Gravito 提供的字串、陣列、回應、環境與錯誤處理工具。
---

# 輔助函式 (Helpers)

> Gravito 提供一系列高效能的工具函式，協助您處理字串、陣列與物件路徑。

## 字串工具 (Str)

`Str` 提供了豐富的字串處理方法。

```typescript
import { Str } from '@gravito/core'

// 轉換為蛇形命名 (snake_case)
Str.snake('FooBar') // 'foo_bar'

// 轉換為串燒命名 (kebab-case)
Str.kebab('FooBar') // 'foo-bar'

// 轉換為大駝峰 (StudlyCase)
Str.studly('foo_bar') // 'FooBar'

// 轉換為小駝峰 (camelCase)
Str.camel('foo_bar') // 'fooBar'

// 限制長度
Str.limit('The quick brown fox', 10) // 'The quick...'

// 生成隨機字串
Str.random(16)

// 生成 UUID
Str.uuid()
```

## 陣列工具 (Arr)

`Arr` 提供了一套處理純陣列與物件陣列的方法。

```typescript
import { Arr } from '@gravito/core'

// 取得巢狀屬性
const user = { name: { first: 'Alice' } }
Arr.get(user, 'name.first') // 'Alice'

// 檢查路徑是否存在
Arr.has(user, 'name.last') // false

// 設定巢狀屬性
Arr.set(user, 'profile.age', 25)

// 提取特定欄位
const users = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
Arr.pluck(users, 'name', 'id') // { '1': 'A', '2': 'B' }

// 排除屬性
Arr.except({ a: 1, b: 2, c: 3 }, ['a', 'c']) // { b: 2 }
```

## 資料路徑工具 (dataGet / dataSet / dataHas)

底層的路徑解析工具，支援點記號 (`.`) 存取。

```typescript
import { dataGet, dataSet, dataHas } from '@gravito/core'

const data = { posts: [{ title: 'Hello' }] }
const title = dataGet(data, 'posts.0.title') // 'Hello'
const exists = dataHas(data, 'posts.0.title') // true
```

## Debug 工具

```ts
import { dump, dd } from '@gravito/core'

dump({ ok: true })
dd('stop here')
```

## 控制流程工具

```ts
import { tap, value } from '@gravito/core'

const result = tap({ id: 1 }, (data) => {
  // side effects
})

const name = value('gravito')
const computed = value(() => 123)
```

## 狀態與環境

```ts
import { env, config, app, logger, router } from '@gravito/core'

const mode = env('NODE_ENV', 'development')
const baseUrl = config<string>('app.baseUrl', 'http://localhost:3000')
logger().info('App started')
const r = router()
const core = app()
```

## 中斷請求 (abort)

```ts
import { abort, abortIf, abortUnless } from '@gravito/core'

abort(404, 'Not Found')
abortIf(!user, 401)
abortUnless(isAdmin, 403)
```

## 回應資料封裝

```ts
import { ok, fail, jsonSuccess, jsonFail } from '@gravito/core'

const data = ok({ id: 1 })
const error = fail('Invalid input', 'VALIDATION_ERROR')

return jsonSuccess(c, { id: 1 })
return jsonFail(c, 'Invalid input', 422)
```

## 表單錯誤與舊值

```ts
import { errors, old } from '@gravito/core'

const bag = errors(c)
const email = old(c, 'email', '')
```

## Laravel 對標提醒

Gravito 目前提供的 helpers 已涵蓋常見需求（字串、陣列、環境、回應、錯誤等）。
若你習慣使用 Laravel 的 `route()` / `url()` / `asset()`，可改用 Gravito 的路由與 URL 相關工具章節。

---

## 下一步
了解如何進行 [例外處理](./errors.md)。
