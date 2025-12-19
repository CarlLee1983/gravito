# 🛰️ SmartMap SEO 引擎

傳統的單頁應用程式 (SPA) 對搜尋引擎而言往往是「隱形」的，因為它們過度依賴客戶端渲染。Gravito 的 **SmartMap SEO 引擎** 透過後端統一管理 Meta 標籤、Sitemap 與分析工具，完美解決了這個痛點。

---

## 🚀 三種「重力」模式 (The Three Modes)

SEO 引擎可以根據您的應用規模與流量，配置為三種不同的運行模式。

| 模式 | 適用場景 | 運作原理 |
|------|----------|--------------|
| **`dynamic`** | 中小型網站 | 每次請求時即時生成 Sitemap，保證數據絕對最新。 |
| **`cached`** | 高流量網站 | 將 Sitemap 存儲在記憶體中，並在定義的 TTL（生存時間）後自動刷新。 |
| **`incremental`**| 百萬級網址 | 採用 **LSM-tree** 日誌追加架構。更新會先寫入磁碟日誌並在背景進行壓縮。零記憶體壓力，適合擴展至無限規模。 |

---

## 🛠️ 分步教學：保姆級配置

### 1. 定義您的核心配置
SEO 引擎的核心在於 `resolvers`（解析器）。我們支援三種「保姆級」的路徑發現方式：

#### A. 靜態路徑 (Static List)
適用於固定頁面，如首頁、聯絡我們或服務條款。

#### B. 動態路徑 (Dynamic Data)
適用於博客文章、商品列表或用戶個人檔案（從資料庫獲取）。

#### C. 自動掃描 (Route Scanning) 🚀
Gravito 可以自動掃描您的路由定義，找出所有靜態的 `GET` 路由，實現「設後不理」的極致體驗。

```typescript
// src/config/seo.ts
import { routeScanner } from '@gravito/orbit-sitemap' 
import { router } from '../routes'

export const seoConfig: SeoConfig = {
  mode: 'dynamic',
  baseUrl: 'https://your-app.com',
  resolvers: [
    // 1. 自動掃描 - 掃描所有已定義的路由
    {
      name: 'router-scanner',
      fetch: () => routeScanner(router, { 
        exclude: ['/api/*', '/admin/*', '/dashboard/*'] 
      }).getEntries()
    },
    // 2. 動態資料 - 從資料庫獲取內容
    {
      name: 'blog-posts',
      fetch: async () => {
        const posts = await db.posts.all()
        return posts.map(p => ({ 
          url: `/blog/${p.slug}`, 
          lastmod: p.updatedAt,
          changefreq: 'weekly',
          priority: 0.8
        }))
      }
    },
    // 3. 靜態列表 - 手動定義的重要網址
    {
      name: 'promotions',
      fetch: () => [
        { url: '/black-friday', priority: 1.0 },
        { url: '/summer-sale', priority: 0.9 }
      ]
    }
  ],
  analytics: {
    gtag: 'G-XXXXXXXXXX',
  }
}
```

### 2. 連接軌道 (Connect Orbit)
在應用的入口點註冊 SEO 中間件。它會自動處理 `/sitemap.xml` 與 `/robots.txt`。

```typescript
// src/index.ts
import { gravitoSeo } from '@gravito/seo-adapter-hono'
import { seoConfig } from './config/seo'

app.use('*', gravitoSeo(seoConfig))
```

### 3. 在控制器中動態管理 Meta
您可以針對特定的路由，在控制器中覆寫 Meta 標籤。

```typescript
// src/controllers/PostController.ts
import { SeoMetadata } from '@gravito/seo-core'

export class PostController {
  show(c: Context) {
    const post = // ... 獲取資料
    
    const seo = new SeoMetadata({
      meta: { title: post.title, description: post.summary },
      og: { title: post.title, type: 'article', image: post.cover }
    })

    return c.get('inertia').render('Post', { 
      post, 
      seoHtml: seo.toString() // 傳遞給前端佈局
    })
  }
}
```

---

## 📊 分析工具與追蹤
Gravito 的 SEO 引擎會自動處理 GA4、Meta Pixel 與百度統計腳本的注入。只需在配置中定義 ID，並呼叫 `seo.toString()`：

- `gtag`: Google Analytics 4
- `pixel`: Meta (Facebook) Pixel
- `baidu`: 百度統計 ID

## 🛠️ 企業級性能架構
對於超過 50,000 個網址的大型網站，Gravito 會自動生成 **Sitemap Index (索引文件)** 並將 Sitemap 拆分為多個分頁檔案，完全遵循 Google 的最佳實踐。

> **最後一站**：準備好上線了嗎？前往 [部署指南](/zh/docs/guide/deployment) 學習如何完成最後一哩路。
