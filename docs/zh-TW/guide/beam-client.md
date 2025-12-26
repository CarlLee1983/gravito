---
title: Beam 客戶端
description: 針對 Photon 應用的型別安全 HTTP 客戶端封裝。
---

# Beam 客戶端

Beam 是針對 Gravito Photon 應用的輕量型別安全 HTTP 客戶端封裝，提供近似 tRPC 的開發體驗，同時維持標準 HTTP 呼叫流程。

## 適用情境

當你希望前端有完整型別提示，又不想導入額外執行期依賴時，建議使用 Beam。

## 安裝

```bash
bun add @gravito/beam
```

## 快速開始

### 1. 於伺服器端匯出應用型別

```ts
// src/server/app.ts
import { Photon } from '@gravito/photon'

const app = new Photon()
  .get('/hello', (c) => c.json({ message: 'Hello' }))

export type AppType = typeof app
export default app
```

### 2. 於前端建立型別安全的 client

```ts
// src/client/api.ts
import { createBeam } from '@gravito/beam'
import type { AppType } from '../server/app'

const api = createBeam<AppType>('https://example.com')

const res = await api.hello.$get()
const data = await res.json()
```

## 特色

- 零執行期負擔（僅型別推導）
- 路由與資料結構完整提示
- 與 Photon 路由完全相容

## 下一步

- 了解路由設計：[路由](./routing.md)
- 設定驗證流程：[請求驗證](./requests.md)
