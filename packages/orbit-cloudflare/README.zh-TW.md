# @gravito/orbit-cloudflare 🌩️

Gravito Core 的 Cloudflare Workers 整合模組。此模組提供了一種無縫的方式，讓您能在 Gravito 生態系統中使用 Cloudflare Workers 的獨特功能（如 KV, R2, D1 等）。

## 🌟 概覽

`OrbitCloudflare` 是一個「基礎設施軌道 (Infrastructure Orbit)」，負責銜接 Cloudflare Workers 執行環境與 Gravito 微內核。它會自動將 Cloudflare 的環境綁定 (Environment Bindings) 映射到 Gravito 的上下文 (Context) 中，讓您輕鬆構建邊緣原生 (Edge-native) 應用。

## 🚀 功能特性

- **自動綁定映射**：自動將所有 Cloudflare 環境綁定（KV, R2, D1, 秘密變數等）注入到 `ctx` 物件中。
- **統一上下文存取**：在任何地方都能透過 `ctx.get('BINDING_NAME')` 存取您的綁定資源。
- **型別安全綁定**：提供工具型別，將 Cloudflare 綁定整合進 Gravito 的型別系統中。
- **Cloudflare 原生處理器**：簡化的工廠函數，用於創建 Cloudflare Worker 入口點。

## 📦 安裝

```bash
bun add @gravito/orbit-cloudflare
```

## 🛠️ 使用方法

### 1. 註冊 Orbit

將 `OrbitCloudflare` 加入您的 Gravito 應用程式以啟用綁定注入。

```typescript
import { Gravito } from '@gravito/core'
import { OrbitCloudflare } from '@gravito/orbit-cloudflare'

const app = new Gravito()

// 註冊 orbit
app.orbit(OrbitCloudflare)
```

### 2. 定義型別安全綁定

擴充 `GravitoVariables` 介面，為您的 Cloudflare 綁定獲得完整的 IDE 支援。

```typescript
import { CloudflareBindings } from '@gravito/orbit-cloudflare'

declare module '@gravito/core' {
  interface GravitoVariables extends CloudflareBindings<{
    MY_KV: KVNamespace;
    S3_BUCKET: R2Bucket;
    DB: D1Database;
    SECRET_KEY: string;
  }> {}
}
```

### 3. 在路由中存取綁定

```typescript
app.get('/data', async (ctx) => {
  const kv = ctx.get('MY_KV')
  const data = await kv.get('user_1')
  return ctx.json({ data })
})
```

### 4. 匯出 Worker 處理器

使用 `handle` 工廠函數匯出 Cloudflare Workers 所需的預設物件。

```typescript
import { handle } from '@gravito/orbit-cloudflare'

export default handle(app)
```

## 📑 API 參考

### `OrbitCloudflare`
管理生命週期與中間件註冊的核心 Orbit 物件。

### `handle(app: Gravito, options?: CloudflareOptions)`
工廠函數，回傳一個相容於 Cloudflare 的 fetch 處理器。

### `type CloudflareBindings<T>`
輔助型別，用於將您的環境變數映射到 Gravito 的內部狀態。

---

## 🤝 授權條款

MIT © Carl Lee
