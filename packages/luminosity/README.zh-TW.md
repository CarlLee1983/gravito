# @gravito/luminosity

Gravito SmartMap Engine™ 的智慧核心。Luminosity 提供了一套完整的 SEO 工具組，包括高效能的 Sitemap 生成、可程式化的 `robots.txt` 管理、動態 Meta 標籤構建，以及進階的 SEO 分析整合。

## 🌟 核心特性

- **三模式架構 (Tri-Mode Architecture)**：
  - **Dynamic (動態)**：適用於中小型網站的即時生成。
  - **Cached (快取)**：具備 Mutex 鎖機制的執行緒安全快取，適用於高流量環境。
  - **Incremental (增量)**：採用資料庫等級的 WAL (預寫日誌) 與 LSM-Tree (日誌結構合併樹) 引擎，專為百萬級頁面的大型網站設計。
- **RouteScanner (路徑掃描)**：自動化路徑探索，支援以下框架：
  - **Gravito**, **Hono**, **Express**, **Fastify**, **Next.js**, **Nuxt**, **Remix**, **SvelteKit**, 與 **Astro**。
- **高效能 Sitemap**：
  - 串流式 XML 構建器，支援 **Gzip 壓縮**。
  - 自動處理 **Sitemap Index (索引)** 與分頁（符合 Google 50,000 條 URL 限制）。
  - 支援 **Rich Media**（圖片與影片 Sitemap）。
  - 內建 **i18n (hreflang)** 支援，提供 `createAlternates` 輔助工具。
- **可程式化 Robots.txt**：流暢的 API 介面，輕鬆構建爬蟲指令。
- **動態 SEO Meta 標籤**：
  - 支援 **OpenGraph**, **Twitter Cards**, 與 **JSON-LD** 構建器。
  - 提供 **SeoRenderer** 方便與各大前端框架整合。
- **SEO 數據分析**：一鍵整合 **Google Analytics (gtag)**, **Meta Pixel**, 與 **Baidu Tongji (百度統計)**。
- **雲端原生支援**：統一的 `StorageAdapter` 介面，內建支援 **本地檔案系統 (Local FS)** 與 **AWS S3**。
- **診斷工具**：**MetaInspector** 可抓取並解析任何公開 URL 的 SEO 標籤。

## 📦 安裝

```bash
bun add @gravito/luminosity
```

## 🚀 快速開始

### 基礎 Sitemap 生成

```typescript
import { Luminosity } from '@gravito/luminosity';

const engine = new Luminosity({
  hostname: 'https://example.com',
  path: './public',
  gzip: true
});

await engine.generate([
  { url: '/', lastmod: new Date(), changefreq: 'daily', priority: 1.0 },
  { url: '/about', priority: 0.8 }
]);
```

### 可程式化 Robots.txt

```typescript
const robots = engine.robots()
  .userAgent('*')
  .allow('/')
  .disallow('/admin')
  .sitemap('https://example.com/sitemap-index.xml')
  .build();
```

## 🛠️ 進階配置

### SEO 引擎 (伺服器端)

`SeoEngine` 是所有 SEO 功能的調度器，負責管理所選策略的生命週期。

```typescript
import { SeoEngine } from '@gravito/luminosity';

const config = {
  mode: 'incremental',
  baseUrl: 'https://example.com',
  incremental: {
    logDir: './storage/seo',
    compactInterval: 3600000 // 1 小時
  }
};

const seo = new SeoEngine(config);
await seo.init();

// 中間件使用範例 (Express/Hono)
const content = await seo.render('/sitemap.xml');
```

### 路徑掃描 (Route Scanning)

自動從您的框架中探索路徑：

```typescript
import { SitemapBuilder, NextScanner } from '@gravito/luminosity';

const builder = new SitemapBuilder({
  scanner: new NextScanner({ appDir: './app' }),
  hostname: 'https://example.com'
});

const entries = await builder.build();
```

### SEO 中繼資料與分析

動態生成 Meta 標籤與追蹤腳本：

```typescript
import { MetaTagBuilder, AnalyticsBuilder } from '@gravito/luminosity';

// Meta 標籤
const meta = new MetaTagBuilder()
  .title('我的超棒網頁')
  .description('這是網頁描述')
  .openGraph({ type: 'website', image: '/og.png' })
  .build();

// 數據分析
const analytics = new AnalyticsBuilder({ gtag: 'G-XXXXXXXXXX' }).build();
```

## ☁️ 儲存適配器 (Storage Adapters)

Luminosity 與框架無關且支援雲端，可輕鬆切換儲存後端：

### S3 儲存 (Serverless 環境)

```typescript
import { S3Adapter } from '@gravito/luminosity';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const storage = new S3Adapter({
  bucket: 'my-bucket',
  client: new S3Client({ region: 'us-east-1' }),
  commands: { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand }
});
```

## 🔍 CLI 工具 (`lux`)

Luminosity 內建強大的 CLI 工具，助您管理 SEO 基礎設施：

- `lux generate`：手動觸發 Sitemap 生成。
- `lux repair`：修復損壞的 LSM 日誌。
- `lux inspect <url>`：預覽 URL 在搜尋引擎與社群媒體上的呈現效果。

## 📄 授權

MIT © Carl Lee
