# @gravito/beam (Orbit Beam)

Gravito 框架的輕量級、型別安全 HTTP 用戶端封裝。它提供了類似 tRPC 的開發體驗，但直接使用標準的 Photon 應用類型，實現**零執行期開銷**。

## 特色

- **零執行期開銷**：純型別包裝，直接委派給 Beam 用戶端，無額外抽象層
- **免配置型別安全**：自動從後端 `AppType` 或 `AppRoutes` 推導型別
- **完善的 IntelliSense**：對路由、方法、請求體與響應數據提供完整補全
- **輕量化**：基於 `@gravito/photon/client` 的薄型封裝 (< 1kb)，極少依賴
- **AI 友善**：清晰的 JSDoc 註解與範例，確保可靠的程式碼生成

## 安裝

```bash
bun add @gravito/beam
```

## 快速開始

`@gravito/beam` 支援兩種型別模式：`AppType`（簡單場景）與 `AppRoutes`（推薦，適用於模板專案）。

### 模式 1：使用 AppType (簡單場景)

#### 1. 在後端 (Server)

直接導出 Photon 應用實例的型別。

```typescript
// server/app.ts
import { Photon } from '@gravito/photon'
import { validate } from '@gravito/mass'
import { Schema } from '@gravito/mass'

const app = new Photon()
  .get('/hello', (c) => c.json({ message: 'Hello World' }))
  .post(
    '/post',
    validate('json', Schema.Object({ title: Schema.String() })),
    (c) => {
      return c.json({ id: 1, title: c.req.valid('json').title })
    }
  )

export type AppType = typeof app
export default app
```

#### 2. 在前端 (Client)

僅導入型別（不導入伺服器端執行期程式碼）並建立用戶端。

```typescript
// client/api.ts
import { createBeam } from '@gravito/beam'
import type { AppType } from '../server/app' // 僅導入型別！

const client = createBeam<AppType>('http://localhost:3000')

// 使用方法
// 1. 完整型別的 GET 請求
const res = await client.hello.$get()
const data = await res.json() // { message: string }

// 2. 完整型別且包含校驗的 POST 請求
const postRes = await client.post.$post({
  json: { title: 'Gravito Rocks' } // ✅ 型別檢查！
})

if (postRes.ok) {
  const data = await postRes.json()
  // data.title 會被自動推導為 string
}
```

### 模式 2：使用 AppRoutes (推薦，符合模板用法)

當使用 `app.route()` 來組合路由時（Gravito 模板的標準模式），推薦使用此模式。

#### 1. 在後端 (Server)

使用 `app.route()` 組合路由並導出 `AppRoutes` 型別。

```typescript
// server/app.ts
import { Photon } from '@gravito/photon'
import { userRoute } from './routes/user'
import { apiRoute } from './routes/api'

export function createApp() {
  const app = new Photon()
  
  // 使用 app.route() 組合路由（型別推導必需）
  const routes = app
    .route('/api/users', userRoute)
    .route('/api', apiRoute)
  
  return { app, routes }
}

// 僅用於型別推導（無執行期依賴）
function _createTypeOnlyApp() {
  const app = new Photon()
  const routes = app
    .route('/api/users', userRoute)
    .route('/api', apiRoute)
  return routes
}

// 導出供用戶端使用的型別
export type AppRoutes = ReturnType<typeof _createTypeOnlyApp>
```

#### 2. 在前端 (Client)

導入 `AppRoutes` 型別並建立用戶端。

```typescript
// client/api.ts
import { createBeam } from '@gravito/beam'
import type { AppRoutes } from '../server/types' // 僅導入型別！

const client = createBeam<AppRoutes>('http://localhost:3000')

// 在嵌套路由中使用
const loginRes = await client.api.users.login.$post({
  json: {
    username: 'user',
    password: 'pass'
  } // ✅ 型別檢查！
})

if (loginRes.ok) {
  const data = await loginRes.json()
  // 對嵌套路由響應提供完整的型別安全
}
```

## API 參考

### `createBeam<T>(baseUrl, options?)`

建立一個型別安全的 API 用戶端，直接委派給 Beam 用戶端，零執行期開銷。

**參數：**
- **T**：代表 Photon 應用程式的泛型參數。可以是：
  - `AppType`：`typeof app` - 直接來自 Photon 實例的型別
  - `AppRoutes`：`ReturnType<typeof _createTypeOnlyApp>` - 來自 `app.route()` 鏈的型別
- **baseUrl**：API 伺服器的根 URL (例如：`'http://localhost:3000'`)
- **options**：可選的 `BeamOptions` (擴展自 `RequestInit`)，用於配置 headers、credentials 等。

**傳回值：** 一個完整型別的 Beam 用戶端實例，支援所有路由的 IntelliSense。

**效能：** 零執行期開銷 - 這是一個純型別封裝，直接調用底層的 Beam 用戶端。
