---
title: Constellation
---

# Constellation 🛰️

強大且高效能的 SEO 與 Sitemap 編排模組，專為 **Gravito 應用程式**量身打造。支援企業級索引規模、智慧重新導向管理以及原子化部署。

**Constellation** 提供彈性的方式來管理網站的搜尋引擎能見度，支援動態即時生成（Dynamic）以及建構時生成（Static），並可整合雲端儲存空間。

---

## 🌟 核心特性

### 🚀 高效能與可擴展性
- **串流生成 (Streaming)**：使用 `SitemapStream` 進行記憶體效率極高的 XML 建立。
- **自動分片 (Auto-Sharding)**：自動將大型 Sitemap 分割成多個檔案（預設單檔 50,000 條 URL）並生成 Sitemap Index 索引檔。
- **非同步迭代器 (Async Iterators)**：支援透過 Async Generators 直接從資料庫串流讀取數據。
- **分散式鎖定 (Distributed Locking)**：利用 Redis 鎖防止在分散式環境（如 Kubernetes）中發生「快取擊穿」(Cache Stampede)。

### 🏢 企業級 SEO 編排
- **增量生成 (Incremental Generation)**：僅更新有變動的 URL，而非重新生成整個 Sitemap。
- **影子處理 (Shadow Processing)**：支援「藍綠部署」概念的原子化更新，透過暫存區進行驗證與切換。
- **301/302 重新導向處理**：智慧偵測並移除或替換重新導向的 URL，確保搜尋引擎只抓取標準鏈結 (Canonical Links)。
- **雲端儲存整合**：內建支援 AWS S3 與 Google Cloud Storage (GCS)。

### 🛠️ 進階功能
- **豐富的擴充協定**：支援圖片 (Images)、影片 (Videos)、新聞 (News) 以及 i18n 多語系交替連結 (hreflang)。
- **背景任務 (Background Jobs)**：非阻塞式生成流程，並具備持久化的進度追蹤功能。
- **管理 API**：內建端點可用於遠端觸發生成任務與監控狀態。
- **自動路徑掃描**：自動從 Gravito 的路由系統中提取 URL。

---

## 📦 安裝

```bash
bun add @gravito/constellation
```

---

## 🚀 快速上手

### 1. 動態模式 (Dynamic Mode - 執行階段)
適合中小型網站或資料變動頻繁的情境。

```typescript
import { OrbitSitemap, routeScanner } from '@gravito/constellation'

const sitemap = OrbitSitemap.dynamic({
  baseUrl: 'https://example.com',
  providers: [
    // 自動掃描 Gravito 路由
    routeScanner(core.router, {
      exclude: ['/api/*', '/admin/*'],
      defaultChangefreq: 'daily'
    }),
    
    // 自定義資料庫提供者
    {
      async getEntries() {
        const posts = await db.posts.findMany()
        return posts.map(post => ({
          url: `/blog/${post.slug}`,
          lastmod: post.updatedAt
        }))
      }
    }
  ],
  cacheSeconds: 3600 // HTTP 快取標頭
})

sitemap.install(core)
```

### 2. 靜態模式 (Static Mode - 建構階段)
推薦用於大型網站或需要透過 CDN 發佈的情境。

```typescript
import { OrbitSitemap, DiskSitemapStorage } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  outDir: './dist/sitemaps',
  storage: new DiskSitemapStorage('./dist/sitemaps'),
  shadow: { enabled: true, mode: 'atomic' }, // 安全部署
  providers: [...]
})

await sitemap.generate()
```

---

## 🏗️ 架構與模組

Constellation 由多個專業子模組組成：

| 元件 | 職責 |
|---|---|
| **SitemapGenerator** | 負責建立 XML 檔案與索引的核心引擎。 |
| **IncrementalGenerator** | 處理基於異動追蹤的局部更新。 |
| **RedirectHandler** | 根據重新導向規則處理 URL 列表。 |
| **ShadowProcessor** | 管理檔案的原子化暫存與版本控制。 |
| **RouteScanner** | 整合 Gravito 路由實現自動發現。 |
| **SitemapStorage** | 抽象化儲存層（本地磁碟、S3、GCS 或記憶體）。 |

---

## 💎 進階用法

### 雲端儲存 (AWS S3)
```typescript
import { S3SitemapStorage } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  storage: new S3SitemapStorage({
    bucket: 'my-bucket',
    region: 'us-west-2'
  }),
  // ...
})
```

### 背景任務進度追蹤
```typescript
import { MemoryProgressStorage } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  progressStorage: new MemoryProgressStorage(),
  // ...
})

// 觸發背景任務
const jobId = await sitemap.generateAsync()
```

### 管理端 API 端點
安裝管理路由以便遠端控管 Sitemap：
```typescript
sitemap.installApiEndpoints(core, '/admin/seo/sitemap')
// POST /admin/seo/sitemap/generate - 觸發生成
// GET  /admin/seo/sitemap/status/:jobId - 查詢進度
```

---

## 📄 授權
MIT © Carl Lee
