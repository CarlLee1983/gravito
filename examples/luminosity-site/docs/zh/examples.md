---
title: 使用範例
order: 5
---

# 使用範例

探索將 Luminosity 整合至您應用程式中的常見模式與最佳實踐。

## 1. 基礎靜態 Sitemap

對於小型網站或靜態內容，您可以直接傳遞 URL 陣列。

```typescript
import { Luminosity } from '@gravito/luminosity'

const lux = new Luminosity({
  path: './public',
  hostname: 'https://mysite.com'
})

// 傳遞靜態陣列
await lux.generate([
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/about', changefreq: 'monthly', priority: 0.8 },
  { url: '/contact', changefreq: 'yearly', priority: 0.5 }
])
```

## 2. 資料庫串流 (極致效能)

對於大型資料集（例如電商產品、使用者檔案），請使用 **Async Iterators (非同步迭代器)**。這允許 Luminosity 以恆定的記憶體用量處理數百萬筆記錄。

```typescript
import { Luminosity } from '@gravito/luminosity'
import { db } from './my-database' // 您的資料庫客戶端

const lux = new Luminosity({
  path: './public',
  hostname: 'https://shop.com'
})

// Generator 函式逐行產出資料
async function* getEntries() {
  const stream = db.select('slug', 'updated_at').from('products').stream()
  
  for await (const product of stream) {
    yield {
      url: `/product/${product.slug}`,
      lastmod: product.updated_at,
      changefreq: 'weekly'
    }
  }
}

// Luminosity 直接消費這個串流
await lux.generate(getEntries())
```

## 3. 與 Hono 整合

Luminosity 與 Hono 等現代邊緣框架完美結合。

```typescript
import { Hono } from 'hono'
import { Luminosity } from '@gravito/luminosity'
import { serveStatic } from 'hono/bun'

const app = new Hono()
const lux = new Luminosity({ path: './dist' })

// 1. 啟動時產生
await lux.generate(async function* () {
   // ... yield entries ...
})

// 2. 提供靜態檔案服務
app.use('/sitemap*.xml', serveStatic({ root: './dist' }))
app.use('/robots.txt', serveStatic({ root: './dist' }))

export default app
```

## 4. 多語言支援 (i18n)

使用 alternate links 處理頁面的多語言版本。

```typescript
const entries = [
  { 
    url: '/en/home', 
    links: [
      { lang: 'en', url: 'https://site.com/en/home' },
      { lang: 'fr', url: 'https://site.com/fr/home' },
      { lang: 'zh', url: 'https://site.com/zh/home' }
    ]
  }
]
```
