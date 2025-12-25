---
title: 路由掃描器
description: 跨框架自動路由發現，用於 Sitemap 生成。
---

# 路由掃描器 (跨框架支援)

Luminosity 內建強大的 **RouteScanner** 系統，可以自動發現來自各種框架的路由。這意味著即使您不使用 Gravito，也能使用 Luminosity 進行 Sitemap 生成！

---

## 支援的框架

| 框架 | 掃描器 | 路由發現方式 |
|------|--------|-------------|
| **Gravito** | `GravitoScanner` | `core.router.routes` |
| **Hono** | `HonoScanner` | `app.routes` |
| **Express** | `ExpressScanner` | `app._router.stack` |
| **Next.js** | `NextScanner` | 檔案系統 (`app/`, `pages/`) |
| **Nuxt** | `NuxtScanner` | 檔案系統 (`pages/`) |

---

## 安裝

```bash
bun add @gravito/luminosity
```

---

## 快速開始

`SitemapBuilder` 類別負責協調路由掃描和 Sitemap 條目生成：

```typescript
import { SitemapBuilder, GravitoScanner } from '@gravito/luminosity'

const builder = new SitemapBuilder({
  scanner: new GravitoScanner(core),
  hostname: 'https://example.com'
})

const entries = await builder.build()
```

---

## 搭配 Gravito 使用

```typescript
import { PlanetCore } from 'gravito-core'
import { SitemapBuilder, GravitoScanner } from '@gravito/luminosity'

const core = await PlanetCore.boot({ ... })

const builder = new SitemapBuilder({
  scanner: new GravitoScanner(core),
  hostname: 'https://example.com',
  dynamicResolvers: [
    {
      pattern: '/blog/:slug',
      resolve: async () => {
        const posts = await Post.all()
        return posts.map(p => ({ slug: p.slug }))
      }
    }
  ]
})

const entries = await builder.build()
```

---

## 搭配 Hono 使用

```typescript
import { Hono } from 'hono'
import { SitemapBuilder, HonoScanner } from '@gravito/luminosity'

const app = new Hono()
app.get('/hello', (c) => c.text('Hello'))
app.get('/blog/:slug', (c) => c.text('Blog'))
app.get('/products/:category/:id', (c) => c.text('Product'))

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

const entries = await builder.build()
```

---

## 搭配 Express 使用

```typescript
import express from 'express'
import { SitemapBuilder, ExpressScanner } from '@gravito/luminosity'

const app = express()
app.get('/hello', (req, res) => res.send('Hello'))
app.get('/blog/:slug', (req, res) => res.send('Blog'))
app.get('/api/users', (req, res) => res.json([]))

const builder = new SitemapBuilder({
  scanner: new ExpressScanner(app, {
    excludePatterns: ['/api/*']  // 排除 API 路由
  }),
  hostname: 'https://example.com'
})

const entries = await builder.build()
```

---

## 搭配 Next.js 使用

對於 Next.js，`NextScanner` 會掃描您的檔案系統，從 App Router 和 Pages Router 發現路由。

### App Router（推薦）

```typescript
// app/sitemap.ts
import { SitemapBuilder, NextScanner } from '@gravito/luminosity'

export default async function sitemap() {
  const builder = new SitemapBuilder({
    scanner: new NextScanner({ 
      appDir: './app',
      excludePatterns: ['/(admin)/*', '/api/*']
    }),
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

### Pages Router

```typescript
// pages/sitemap.xml.ts
import { SitemapBuilder, NextScanner } from '@gravito/luminosity'

export default async function sitemap() {
  const builder = new SitemapBuilder({
    scanner: new NextScanner({ 
      pagesDir: './pages',
      excludePatterns: ['/api/*', '/_app', '/_document']
    }),
    hostname: 'https://example.com'
  })

  return builder.build()
}
```

---

## 搭配 Nuxt 使用

```typescript
// server/routes/sitemap.xml.ts
import { SitemapBuilder, NuxtScanner } from '@gravito/luminosity'

export default defineEventHandler(async () => {
  const builder = new SitemapBuilder({
    scanner: new NuxtScanner({ 
      pagesDir: './pages',
      excludePatterns: ['/admin/*']
    }),
    hostname: 'https://example.com',
    dynamicResolvers: [
      {
        pattern: '/blog/:slug',
        resolve: async () => {
          const articles = await queryContent('blog').find()
          return articles.map(a => ({ slug: a._path }))
        }
      }
    ]
  })

  const entries = await builder.build()
  
  // 轉換為 XML
  const xml = generateSitemapXml(entries)
  
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' }
  })
})
```

---

## 動態路由解析器

對於帶有參數的路由（如 `/blog/:slug`），您必須提供解析器來生成具體的 URL：

```typescript
const builder = new SitemapBuilder({
  scanner: new GravitoScanner(core),
  hostname: 'https://example.com',
  dynamicResolvers: [
    {
      // 要匹配的模式（支援 :param 和 [param] 語法）
      pattern: '/products/:category/:id',
      
      // resolve 函數回傳參數組合
      resolve: async () => {
        const products = await Product.all()
        return products.map(p => ({
          category: p.category.slug,
          id: p.id
        }))
      },
      
      // 可選：覆寫預設的 sitemap 元資料
      meta: {
        priority: 0.8,
        changefreq: 'weekly'
      }
    }
  ]
})
```

### 多個解析器

您可以為不同的路由模式定義多個解析器：

```typescript
dynamicResolvers: [
  {
    pattern: '/blog/:slug',
    resolve: async () => (await Post.all()).map(p => ({ slug: p.slug }))
  },
  {
    pattern: '/products/:id',
    resolve: async () => (await Product.all()).map(p => ({ id: p.id })),
    meta: { priority: 0.9 }
  },
  {
    pattern: '/users/:username',
    resolve: async () => (await User.where('public', true).all()).map(u => ({ username: u.username })),
    meta: { priority: 0.5, changefreq: 'monthly' }
  }
]
```

---

## SitemapBuilder 選項

```typescript
interface SitemapBuilderOptions {
  // 必要：使用的掃描器
  scanner: RouteScanner
  
  // 必要：網站的基礎 URL
  hostname: string
  
  // 可選：動態路由的解析器
  dynamicResolvers?: DynamicRouteResolver[]
  
  // 可選：要排除的模式（字串 glob 或 RegExp）
  excludePatterns?: (string | RegExp)[]
  
  // 可選：只包含匹配這些模式的路由
  includePatterns?: (string | RegExp)[]
  
  // 可選：預設的 sitemap 元資料
  defaultPriority?: number      // 預設：0.5
  defaultChangefreq?: ChangeFreq // 預設：undefined
}
```

---

## 建立自訂掃描器

您可以透過實作 `RouteScanner` 介面，為任何框架建立掃描器：

```typescript
import type { RouteScanner, ScannedRoute } from '@gravito/luminosity'

class FastifyScanner implements RouteScanner {
  readonly framework = 'fastify'

  constructor(private app: FastifyInstance) {}

  async scan(): Promise<ScannedRoute[]> {
    const routes: ScannedRoute[] = []
    
    // 存取 Fastify 的內部路由儲存
    this.app.routes.forEach(route => {
      routes.push({
        path: route.path,
        method: route.method as ScannedRoute['method'],
        isDynamic: route.path.includes(':'),
        params: this.extractParams(route.path)
      })
    })
    
    return routes
  }
  
  private extractParams(path: string): string[] {
    const matches = path.match(/:([^/]+)/g) || []
    return matches.map(m => m.slice(1))
  }
}
```

### ScannedRoute 介面

```typescript
interface ScannedRoute {
  // 路由路徑（如 '/blog/:slug'）
  path: string
  
  // HTTP 方法
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL'
  
  // 路由是否有動態段落
  isDynamic: boolean
  
  // 參數名稱（如 ['slug']）
  params?: string[]
  
  // 可選的元資料
  meta?: {
    priority?: number
    changefreq?: ChangeFreq
    exclude?: boolean  // 在 sitemap 中跳過此路由
  }
}
```

---

## 為什麼選擇 RouteScanner？

### 相較於手動定義 URL

| 方式 | 優點 | 缺點 |
|------|------|------|
| **手動** | 完全控制 | 繁瑣、易錯、容易不同步 |
| **RouteScanner** | 自動同步、零維護 | 動態路由需要解析器 |

### 相較於 next-sitemap / nuxt-sitemap

| 功能 | next-sitemap | nuxt-sitemap | Luminosity |
|------|-------------|--------------|------------|
| 自動靜態路由 | ✅ | ✅ | ✅ |
| 動態路由 API | 自訂 | 內建 | **統一** |
| 跨框架 | ❌ | ❌ | ✅ |
| 增量更新 | ❌ | ❌ | ✅ |
| 企業級規模 | ❌ | ❌ | ✅ |

---

## 下一步

- [Luminosity SEO 引擎](/zh/docs/guide/seo-engine) - Meta 標籤與分析工具
- [Sitemap 基礎](/zh/docs/guide/sitemap-guide) - 快速開始與設定
- [Sitemap 進階](/zh/docs/guide/sitemap-advanced) - 雲端儲存、增量生成
