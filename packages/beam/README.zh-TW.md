# @gravito/beam (Orbit Beam)

輕量級、類型安全的 HTTP 客戶端封裝，專為 Gravito 框架應用程式設計。提供類似 tRPC 的開發體驗，但使用標準的 Photon 應用程式類型，並具有**零執行時開銷**。

[English](./README.md) | 繁體中文

## 特性

- **零執行時開銷**：純類型封裝，直接委託給 Beam 客戶端，無額外抽象層
- **零配置類型安全**：自動從後端 `AppType` 或 `AppRoutes` 推導類型
- **IntelliSense 支援**：完整的路由、方法、請求體和響應資料自動完成
- **輕量級**：`@gravito/photon/client` 的薄封裝（< 1kb），最小相依性
- **AI 友善**：清晰的 JSDoc 註解和範例，適合程式碼生成

## 安裝

```bash
bun add @gravito/beam
```

## 快速開始

`@gravito/beam` 支援兩種類型模式：`AppType`（簡單）和 `AppRoutes`（推薦用於範本）。

### 模式 1：使用 AppType（簡單場景）

#### 1. 在後端（Server）

直接導出 Photon 應用程式實例的類型。

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

#### 2. 在前端（Client）

僅匯入類型（不從伺服器匯入執行時程式碼）並創建客戶端。

```typescript
// client/api.ts
import { createBeam } from '@gravito/beam'
import type { AppType } from '../server/app' // 僅匯入類型！

const client = createBeam<AppType>('http://localhost:3000')

// 使用方式
// 1. 完全類型化的 GET 請求
const res = await client.hello.$get()
const data = await res.json() // { message: string }

// 2. 完全類型化的 POST 請求（帶驗證）
const postRes = await client.post.$post({
  json: { title: 'Gravito Rocks' } // ✅ 類型檢查！
})

if (postRes.ok) {
  const data = await postRes.json()
  // data.title 自動推導為 string
}
```

### 模式 2：使用 AppRoutes（推薦，符合範本用法）

當使用 `app.route()` 組合路由時推薦使用此模式，這是 Gravito 範本中的標準模式。

#### 1. 在後端（Server）

使用 `app.route()` 組合路由並導出 `AppRoutes` 類型。

```typescript
// server/app.ts
import { Photon } from '@gravito/photon'
import { userRoute } from './routes/user'
import { apiRoute } from './routes/api'

export function createApp() {
  const app = new Photon()

  // 使用 app.route() 組合路由（類型推導所需）
  const routes = app
    .route('/api/users', userRoute)
    .route('/api', apiRoute)

  return { app, routes }
}

// 僅用於類型推導（無執行時相依性）
function _createTypeOnlyApp() {
  const app = new Photon()
  const routes = app
    .route('/api/users', userRoute)
    .route('/api', apiRoute)
  return routes
}

// 導出類型供客戶端使用
export type AppRoutes = ReturnType<typeof _createTypeOnlyApp>
```

```typescript
// server/types.ts（僅類型檔案，安全供前端匯入）
import type { AppRoutes } from './app'

export type { AppRoutes }
```

#### 2. 在前端（Client）

匯入 `AppRoutes` 類型並創建客戶端。

```typescript
// client/api.ts
import { createBeam } from '@gravito/beam'
import type { AppRoutes } from '../server/types' // 僅匯入類型！

const client = createBeam<AppRoutes>('http://localhost:3000')

// 使用巢狀路由
const loginRes = await client.api.users.login.$post({
  json: {
    username: 'user',
    password: 'pass'
  } // ✅ 類型檢查！
})

if (loginRes.ok) {
  const data = await loginRes.json()
  // 完整的巢狀路由響應類型安全
}
```

## 類型模式比較

| 模式 | 使用場景 | 類型定義 | 適用時機 |
|------|----------|---------|---------|
| **AppType** | 簡單應用 | `export type AppType = typeof app` | 直接路由定義、小型專案 |
| **AppRoutes** | 模組化應用 | `export type AppRoutes = ReturnType<typeof _createTypeOnlyApp>` | 使用 `app.route()`、基於範本的專案、大型程式碼庫 |

兩種模式提供相同的類型安全性和效能。根據專案結構選擇。

## 進階配置

### 超時

為請求設定超時以防止掛起：

```typescript
const client = createBeam<AppType>('https://api.example.com', {
  timeout: 5000 // 5 秒
})

// 如果請求超過 5 秒則拋出 BeamTimeoutError
const res = await client.users.$get()
```

### 重試與指數退避

自動重試失敗的請求，使用指數退避：

```typescript
const client = createBeam<AppType>('https://api.example.com', {
  retry: {
    count: 3,           // 最多重試 3 次
    delay: 1000,        // 初始延遲：1 秒
    backoff: 2,         // 指數退避因子
    statusCodes: [408, 429, 500, 502, 503, 504] // 在這些狀態碼時重試
  }
})
```

**重試時間**：
- 第 1 次重試：1000ms 延遲
- 第 2 次重試：2000ms 延遲（1000 * 2^1）
- 第 3 次重試：4000ms 延遲（1000 * 2^2）

### 攔截器

#### 請求攔截器

在請求發送前修改：

```typescript
const client = createBeam<AppType>('https://api.example.com', {
  onRequest: async (config) => {
    // 添加自定義 headers
    config.headers = {
      ...config.headers,
      'X-Request-ID': generateRequestId(),
      'X-Client-Version': '1.0.0'
    }
    return config
  }
})
```

#### 響應攔截器

在接收響應後處理：

```typescript
const client = createBeam<AppType>('https://api.example.com', {
  onResponse: async (response) => {
    // 記錄所有響應
    console.log(`[${response.status}] ${response.url}`)

    // 如需讀取響應，請複製
    const cloned = response.clone()
    const data = await cloned.json()
    console.log('響應資料：', data)

    return response
  }
})
```

#### 錯誤攔截器

全域處理錯誤：

```typescript
const client = createBeam<AppType>('https://api.example.com', {
  onError: async (error) => {
    // 發送錯誤到監控服務
    if (error.status && error.status >= 500) {
      await reportToSentry(error)
    }

    // 記錄到控制台
    console.error('請求失敗：', {
      message: error.message,
      status: error.status,
      code: error.code
    })
  }
})
```

### 動態 Headers

使用函式為每個請求動態生成 headers：

```typescript
const client = createBeam<AppType>('https://api.example.com', {
  headers: () => {
    const token = localStorage.getItem('authToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
})
```

或使用非同步函式：

```typescript
const client = createBeam<AppType>('https://api.example.com', {
  headers: async () => {
    const token = await getTokenFromSecureStorage()
    return { Authorization: `Bearer ${token}` }
  }
})
```

### 組合選項

可以組合多個選項：

```typescript
const client = createBeam<AppType>('https://api.example.com', {
  timeout: 10000,
  retry: {
    count: 2,
    delay: 500
  },
  headers: async () => ({
    Authorization: `Bearer ${await getToken()}`
  }),
  onRequest: async (config) => {
    console.log('發送請求：', config.method)
    return config
  },
  onResponse: async (response) => {
    console.log('接收響應：', response.status)
    return response
  },
  onError: async (error) => {
    await logError(error)
  }
})
```

## 輔助函式

### `createAuthenticatedBeam`

創建帶自動 Bearer token 認證的客戶端：

```typescript
import { createAuthenticatedBeam } from '@gravito/beam'

// 靜態 token
const client = createAuthenticatedBeam<AppType>(
  'https://api.example.com',
  () => 'my-static-token'
)

// 動態 token（每次請求刷新）
const client = createAuthenticatedBeam<AppType>(
  'https://api.example.com',
  () => localStorage.getItem('authToken') || ''
)

// 非同步 token
const client = createAuthenticatedBeam<AppType>(
  'https://api.example.com',
  async () => {
    const token = await refreshToken()
    return token
  },
  { timeout: 5000 } // 額外選項
)
```

### `unwrapResponse`

自動解析響應並在錯誤時拋出：

```typescript
import { unwrapResponse } from '@gravito/beam'

const res = await client.users.$get()
const data = await unwrapResponse<User[]>(res)
// 如果 response.ok 為 false，則拋出 BeamError
```

### `safeResponse`

解析響應而不拋出錯誤（Rust/Go 風格）：

```typescript
import { safeResponse } from '@gravito/beam'

const res = await client.users.$get()
const { data, error } = await safeResponse<User[]>(res)

if (error) {
  console.error('請求失敗：', error.message, error.status)
  return
}

console.log('使用者：', data)
```

## 錯誤處理

### 錯誤類型

Beam 提供結構化錯誤類型：

```typescript
import {
  BeamError,           // 基礎錯誤
  BeamNetworkError,    // 網路/連線錯誤
  BeamTimeoutError,    // 超時錯誤
  BeamHttpError        // HTTP 狀態錯誤（4xx, 5xx）
} from '@gravito/beam'

try {
  const res = await client.users.$get()
  const data = await unwrapResponse<User[]>(res)
} catch (error) {
  if (error instanceof BeamTimeoutError) {
    console.error('請求超時')
  } else if (error instanceof BeamNetworkError) {
    console.error('網路錯誤：', error.message)
  } else if (error instanceof BeamHttpError) {
    console.error(`HTTP ${error.status}：`, error.message)
  } else if (error instanceof BeamError) {
    console.error('Beam 錯誤：', error.code, error.message)
  }
}
```

### 錯誤屬性

所有 Beam 錯誤包含：
- `message`：錯誤描述
- `status`：HTTP 狀態碼（如適用）
- `code`：錯誤代碼（例如 'TIMEOUT'、'NETWORK_ERROR'、'HTTP_404'）
- `cause`：原始錯誤（如有）

```typescript
try {
  const res = await client.users.$get()
  const data = await unwrapResponse<User[]>(res)
} catch (error) {
  if (error instanceof BeamError) {
    console.error({
      message: error.message,
      status: error.status,
      code: error.code,
      cause: error.cause
    })
  }
}
```

### 最佳實踐

1. **對簡單情況使用 `unwrapResponse`**：
   ```typescript
   const data = await unwrapResponse<User>(res)
   // 讓錯誤冒泡到錯誤邊界
   ```

2. **對明確錯誤處理使用 `safeResponse`**：
   ```typescript
   const { data, error } = await safeResponse<User>(res)
   if (error) {
     // 在本地處理錯誤
     return
   }
   ```

3. **使用全域錯誤攔截器進行監控**：
   ```typescript
   const client = createBeam<AppType>('...', {
     onError: async (error) => {
       await reportToSentry(error)
     }
   })
   ```

## React 整合

查看 [examples/README.md](./examples/README.md) 取得完整整合指南：

- **React Query (TanStack Query)**：包含查詢、變更和快取管理的完整範例
- **SWR**：包含查詢、變更、分頁和無限滾動的完整範例

快速範例：

```typescript
import { useQuery } from '@tanstack/react-query'
import { createBeam, unwrapResponse } from '@gravito/beam'
import type { AppRoutes } from './server/types'

const client = createBeam<AppRoutes>('http://localhost:3000')

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const res = await client.api.users[':id'].$get({ param: { id: userId } })
      return unwrapResponse<User>(res)
    }
  })
}
```

## 與其他方案比較

| 功能 | Beam | tRPC | Axios | Ky |
|------|------|------|-------|-----|
| **類型安全** | ✅ 完整（來自 Photon 類型） | ✅ 完整 | ❌ 手動 | ❌ 手動 |
| **執行時開銷** | ✅ 零 | ⚠️ 執行時驗證 | ⚠️ 大型打包 | ✅ 小 |
| **打包大小** | ✅ < 1kb | ⚠️ ~20kb | ❌ ~50kb | ✅ ~10kb |
| **設定複雜度** | ✅ 零配置 | ⚠️ 需要設定 | ✅ 簡單 | ✅ 簡單 |
| **框架整合** | ✅ 僅 Gravito/Photon | ✅ 框架無關 | ✅ 框架無關 | ✅ 框架無關 |
| **重試邏輯** | ✅ 內建 | ❌ 手動 | ❌ 手動 | ✅ 內建 |
| **超時** | ✅ 內建 | ❌ 手動 | ✅ 內建 | ✅ 內建 |
| **攔截器** | ✅ 內建 | ✅ 中間件 | ✅ 內建 | ✅ Hooks |

### 為何選擇 Beam？

1. **零執行時開銷**：純類型封裝，無執行時驗證
2. **零配置**：類型自動從 Photon 應用程式推導
3. **最小打包**：< 1kb，比替代方案小
4. **框架優化**：專為 Gravito/Photon 打造

### 何時使用替代方案？

- **tRPC**：如需框架無關的 RPC 與執行時驗證
- **Axios**：如需廣泛的瀏覽器相容性（IE11）
- **Ky**：如需現代 fetch 封裝但無類型安全

## 效能

### 零執行時開銷

當未使用進階選項時，Beam 具有**零執行時開銷**：

```typescript
// 這會直接呼叫底層的 Photon 客戶端
const client = createBeam<AppType>('https://api.example.com')
```

快速路徑繞過所有封裝邏輯：
```typescript
if (!options?.timeout && !options?.retry && ...) {
  return beamClient<T>(baseUrl, options) // 直接委託
}
```

### 打包大小比較

| 套件 | Minified | Gzipped |
|------|----------|---------|
| **@gravito/beam** | < 1kb | < 500 bytes |
| tRPC Client | ~20kb | ~7kb |
| Axios | ~50kb | ~15kb |
| Ky | ~10kb | ~4kb |

### 效能提示

1. **避免不必要的選項**：僅在需要時使用 timeout/retry/攔截器
2. **快取客戶端實例**：創建一個客戶端並重複使用
3. **使用連線池**：底層 fetch 使用 HTTP/2 多工

## 常見問題

### 問：我需要單獨安裝 @gravito/photon 嗎？

不需要，`@gravito/photon` 是 peer dependency，應該已經在你的 Gravito 專案中安裝。

### 問：我可以在非 Photon 後端使用 Beam 嗎？

不行，Beam 專為 Gravito/Photon 後端設計。對其他後端請使用 tRPC、Axios 或 Ky。

### 問：如何處理認證？

使用 `createAuthenticatedBeam` 進行自動 Bearer token 處理：

```typescript
const client = createAuthenticatedBeam<AppType>(
  baseUrl,
  () => localStorage.getItem('token') || ''
)
```

### 問：Beam 在 Next.js App Router 中運作嗎？

可以！Beam 在客戶端和伺服器元件中都能運作：

```typescript
// 客戶端元件
'use client'
import { createBeam } from '@gravito/beam'

// 伺服器元件（Next.js 13+）
import { createBeam } from '@gravito/beam'
const client = createBeam<AppType>(process.env.API_URL!)
```

### 問：如何除錯網路請求？

使用 `onRequest` 和 `onResponse` 攔截器：

```typescript
const client = createBeam<AppType>(baseUrl, {
  onRequest: async (config) => {
    console.log('→', config.method, config)
    return config
  },
  onResponse: async (response) => {
    console.log('←', response.status, await response.clone().text())
    return response
  }
})
```

### 問：我可以在 React Native 中使用 Beam 嗎？

可以，只要 React Native 的 fetch API 可用（或已 polyfill）。

### 問：如何處理檔案上傳？

使用 FormData 與 fetch API：

```typescript
const formData = new FormData()
formData.append('file', file)

const res = await client.upload.$post({
  body: formData
})
```

### 問：BeamError 和一般 Error 有什麼區別？

BeamError 提供結構化錯誤資訊：
- `status`：HTTP 狀態碼
- `code`：錯誤代碼（例如 'TIMEOUT'、'NETWORK_ERROR'）
- `cause`：用於除錯的原始錯誤

## API 參考

### `createBeam<T>(baseUrl, options?)`

創建類型安全的 API 客戶端，直接委託給 Beam 客戶端，零執行時開銷。

**參數**：
- **T**：代表 Photon 應用程式的泛型類型參數。可以是：
  - `AppType`：`typeof app` - 來自 Photon 實例的直接類型
  - `AppRoutes`：`ReturnType<typeof _createTypeOnlyApp>` - 來自 `app.route()` 鏈的類型
- **baseUrl**：API 伺服器的根 URL（例如 `'http://localhost:3000'`）
- **options**：可選的 `BeamOptions`（擴展 `RequestInit`），用於 headers、credentials 等

**回傳**：完全類型化的 Beam 客戶端實例，具有所有路由的 IntelliSense 支援。

**效能**：零執行時開銷 - 這是直接呼叫 Beam 客戶端的純類型封裝。

## 設計原則

此套件遵循 Gravito 的核心價值：

- **高效能**：零執行時開銷，直接委託給 Beam 客戶端
- **低開銷**：無抽象層或中間件，最小打包大小
- **輕量級**：單一函式，< 1kb，最小相依性（僅 `@gravito/photon/client`）
- **AI 友善**：清晰的 JSDoc 註解、完整的類型推導、直觀的 API

## 授權

MIT
