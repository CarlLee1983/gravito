---
title: "框架整合"
order: 3
---

# 框架整合指南

Luminosity 設計為框架無關 (Framework Agnostic)。無論您使用哪種 Node.js 框架，都可以輕鬆整合 Luminosity 來管理 Sitemap。

## Express 整合

在 Express 中，您可以將 Luminosity 作為一個 Middleware 或獨立的 Controller 來使用。

### 安裝

```bash
npm install express @gravito/luminosity
```

### 基本用法

```typescript
import express from 'express'
import { SeoEngine, SeoRenderer } from '@gravito/luminosity'

const app = express()
const port = 3000

// 1. 初始化引擎
const seo = new SeoEngine({
  mode: 'incremental',
  baseUrl: 'https://example.com',
  resolvers: [], // 必須提供，即使是空陣列
  incremental: {
      logDir: './.luminosity'
  }
})

// 必須呼叫 init()
await seo.init()

// 2. 攔截 URL 變更 (Middleware 範例)
app.use((req, res, next) => {
    // 當有 POST/PUT/DELETE 請求成功時，記錄到 Luminosity
    res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300 && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
             // 這裡您可以根據 req.path 推導出受影響的頁面 URL
             // seo.getStrategy().add({ url: ..., lastmod: new Date() })
        }
    })
    next()
})

// 3. 服務 Sitemap
app.get('/sitemap.xml', async (req, res) => {
    const entries = await seo.getStrategy().getEntries()
    // 注意：SeoRenderer 需要 resolvers 和 mode 設定
    const renderer = new SeoRenderer({ 
        baseUrl: 'https://example.com',
        mode: 'incremental',
        resolvers: []
    })
    const xml = renderer.render(entries, 'https://example.com/sitemap.xml')
    
    res.header('Content-Type', 'application/xml')
    res.send(xml)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
```

## Photon 整合

如果您使用 Photon (如 Gravito 內部)，整合會更簡單且效能更好。

```typescript
import { Photon } from '@gravito/photon'
import { SeoEngine, SeoRenderer } from '@gravito/luminosity'

const app = new Photon()

const seo = new SeoEngine({
    mode: 'cached', // 對於 Serverless 環境推薦 cached 模式
    baseUrl: 'https://my-photon-app.com',
    resolvers: [] // 必須提供
})

await seo.init()

app.get('/sitemap.xml', async (c) => {
    const entries = await seo.getStrategy().getEntries()
    const renderer = new SeoRenderer({ 
        baseUrl: 'https://my-photon-app.com',
        mode: 'cached',
        resolvers: []
    })
    
    const xml = renderer.render(entries, c.req.url)
    
    return c.body(xml, 200, {
        'Content-Type': 'application/xml'
    })
})

export default app
```

## 下一步

- 了解 [配置選項](/zh/docs/configuration)
- 探索 [CLI 工具](/zh/docs/cli)

---

## 路由掃描器 (自動路由發現)

Luminosity 現在內建強大的 **RouteScanner** 系統，可以自動發現來自各種框架的路由，無需手動定義靜態路由的 resolver。

### 支援的框架

| 框架 | 掃描器 | 路由發現方式 |
|------|--------|-------------|
| **Gravito** | `GravitoScanner` | `core.router.routes` |
| **Hono** | `HonoScanner` | `app.routes` |
| **Express** | `ExpressScanner` | `app._router.stack` |
| **Next.js** | `NextScanner` | 檔案系統 (`app/`, `pages/`) |
| **Nuxt** | `NuxtScanner` | 檔案系統 (`pages/`) |

### 搭配 Hono 使用

```typescript
import { Hono } from 'hono'
import { SitemapBuilder, HonoScanner } from '@gravito/luminosity'

const app = new Hono()
app.get('/hello', (c) => c.text('Hello'))
app.get('/blog/:slug', (c) => c.text('Blog'))

const builder = new SitemapBuilder({
  scanner: new HonoScanner(app),
  hostname: 'https://example.com',
  dynamicResolvers: [
    {
      pattern: '/blog/:slug',
      resolve: async () => {
        const posts = await getPosts()
        return posts.map(p => ({ slug: p.slug }))
      }
    }
  ]
})

// 生成 sitemap 條目
const entries = await builder.build()
```

### 搭配 Next.js 使用

對於 Next.js App Router，建立一個 `sitemap.ts` 檔案：

```typescript
// app/sitemap.ts
import { SitemapBuilder, NextScanner } from '@gravito/luminosity'

export default async function sitemap() {
  const builder = new SitemapBuilder({
    scanner: new NextScanner({ appDir: './app' }),
    hostname: 'https://example.com',
    dynamicResolvers: [
      {
        pattern: '/blog/:slug',
        resolve: async () => {
          const posts = await getPosts()
          return posts.map(p => ({ slug: p.slug }))
        }
      }
    ]
  })

  return builder.build()
}
```

### 搭配 Nuxt 使用

```typescript
// server/routes/sitemap.xml.ts
import { SitemapBuilder, NuxtScanner } from '@gravito/luminosity'

export default defineEventHandler(async () => {
  const builder = new SitemapBuilder({
    scanner: new NuxtScanner({ pagesDir: './pages' }),
    hostname: 'https://example.com'
  })

  const entries = await builder.build()
  
  // 轉換為 XML 並回傳
  return new Response(renderSitemapXml(entries), {
    headers: { 'Content-Type': 'application/xml' }
  })
})
```

### 建立自訂掃描器

您可以透過實作 `RouteScanner` 介面，為任何框架建立掃描器：

```typescript
import type { RouteScanner, ScannedRoute } from '@gravito/luminosity'

class MyFrameworkScanner implements RouteScanner {
  readonly framework = 'my-framework'

  async scan(): Promise<ScannedRoute[]> {
    // 您的路由發現邏輯
    return [
      { path: '/', method: 'GET', isDynamic: false },
      { path: '/blog/:slug', method: 'GET', isDynamic: true, params: ['slug'] }
    ]
  }
}
```
