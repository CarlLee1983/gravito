---
title: Luminosity
description: Gravito SEO 與 Sitemap 整合的 API 參考。
---

# Luminosity

`@gravito/luminosity-adapter-photon` (簡稱為 `OrbitLuminosity`) 提供了 Gravito 核心與 SEO 引擎之間的無縫整合。

## 安裝

```bash
bun add @gravito/luminosity @gravito/luminosity-adapter-photon
```

## 基礎用法

SEO 動力模組會註冊一個中間件，自動處理 `/sitemap.xml` 與 `/robots.txt`。

```typescript
import { gravitoSeo } from '@gravito/luminosity-adapter-photon'
import { seoConfig } from './config/seo'

// 在 bootstrap 或 index 中使用
app.use('*', gravitoSeo(seoConfig))
```

## `SeoConfig` 介面

| 屬性 | 類型 | 描述 |
|----------|------|-------------|
| `mode` | `'dynamic' \| 'cached' \| 'incremental'` | 使用的 SEO 策略。 |
| `baseUrl` | `string` | 所有絕對連結的基準 URL。 |
| `resolvers` | `SeoResolver[]` | 動態網址生成器。 |
| `robots` | `RobotsConfig` | robots.txt 的規則。 |
| `analytics` | `AnalyticsConfig` | GA、Pixel 等追蹤設定。 |

## 動態解析器 (Dynamic Resolvers)

解析器是 Luminosity 最強大的部分。它們允許您從任何來源（資料庫、檔案系統等）獲取網址。

```typescript
const postsResolver = {
  name: 'posts',
  fetch: async () => {
    const posts = await db.posts.findMany()
    return posts.map(p => ({
      url: `/post/${p.slug}`,
      lastmod: p.updatedAt,
      priority: 0.8
    }))
  }
}
```

## 分析工具建構器 (Analytics Builder)

引擎會生成專業、非阻塞的腳本標籤，支援：
- **Google Analytics** (`gtag`)
- **Meta Pixel** (`pixel`)
- **百度統計** (`baidu`)

這些內容會透過您在控制器中使用的 `SeoMetadata` 工具自動注入。
