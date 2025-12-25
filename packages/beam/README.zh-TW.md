# @gravito/beam

> Gravito 的型別安全 HTTP 用戶端封裝，基於 Photon 類型，零執行期開銷。

## 特色

- **零執行期開銷**：純型別包裝，直接委派給 Beam client
- **自動型別推導**：從後端 `AppType` 或 `AppRoutes` 推導 API 類型
- **輕量依賴**：薄型封裝 `@gravito/photon/client`

## 安裝

```bash
bun add @gravito/beam
```

## 快速開始

### 後端輸出型別

```typescript
import { Photon } from '@gravito/photon'

const app = new Photon()
  .get('/hello', (c) => c.json({ message: 'Hello World' }))

export type AppType = typeof app
export default app
```

### 前端建立用戶端

```typescript
import { createBeam } from '@gravito/beam'
import type { AppType } from '../server/app'

const client = createBeam<AppType>('http://localhost:3000')

const res = await client.hello.$get()
const data = await res.json()
```
