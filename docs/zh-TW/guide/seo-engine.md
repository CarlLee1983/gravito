# Luminosity SEO 引擎

傳統的單頁應用程式 (SPA) 對搜尋引擎而言往往是「隱形」的，因為它們過度依賴客戶端渲染。Gravito 提供了兩套互補的系統來解決這個問題：

1.  **Luminosity 引擎** (本頁面)：負責各頁面的「門面」，管理 Meta 標籤、OpenGraph 與 JSON-LD。
2.  **Sitemap 系統**：負責繪製網站「地圖」，向機器宣告所有可用網址。請參閱 [Sitemap 系統指南](./sitemap-guide)。

---

## 三種「照明」模式 (The Three Illumination Modes)

Luminosity SEO 引擎可以根據您的應用規模與流量，設定為三種不同的「照明強度」模式，確保搜尋引擎能清晰地「看見」您的內容。

| 模式 | 適用場景 | 運作原理 |
|------|----------|--------------|
| **`dynamic`** | 中小型網站 | **瞬時模式**：每次請求時即時生成，保證資料絕對最新。 |
| **`cached`** | 高流量網站 | **發光模式**：將資料緩存在記憶體中，提供極速的存取回應。 |
| **`incremental`**| 百萬級網址 | **恆星模式**：專為海量資料設計，具備最強穿透力。 |

---

## 分步驟教學：全流程設定

### 1. 定義您的核心設定
SEO 引擎的核心在於 `resolvers`（解析器）。我們支援三種「全自動」的路徑發現方式：

#### A. 靜態路徑 (Static List)
適用於固定頁面，如首頁、聯絡我們或服務條款。

#### B. 動態路徑 (Dynamic Data)
適用於部落格文章、商品列表或使用者個人檔案（從資料庫獲取）。

#### C. 自動掃描 (Route Scanning)
Gravito 可以自動掃描您的路由定義，找出所有靜態的 `GET` 路由，實現「設後不理」的極致體驗。

```typescript
// src/config/seo.ts
import { routeScanner } from '@gravito/constellation'
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

### 2. 連接軌道 (Connect Gravito)
在應用的入口點註冊 SEO 中間件。它會自動處理 `/sitemap.xml` 與 `/robots.txt`。

```typescript
// src/index.ts
import { gravitoSeo } from '@gravito/luminosity-adapter-hono'
import { seoConfig } from './config/seo'

app.use('*', gravitoSeo(seoConfig))
```

### Node.js 執行環境示範 (Express)
如果你想驗證 Luminosity 在純 Node runtime 的表現，可以使用 Express adapter 範例：

- `examples/luminosity-node`

注意：部分功能僅在使用 Gravito core 時提供。

### 3. 在控制器中動態管理 Meta
您可以針對特定的路由，在控制器中覆寫 Meta 標籤。

```typescript
// src/controllers/PostController.ts
import { SeoMetadata } from '@gravito/luminosity'

export class PostController {
  show(c: GravitoContext) {
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

## 千萬級 URL：恆星級效能架構 (Stellar Scale)

當您需要處理數千萬個網址時，Luminosity 不僅僅是生成一個檔案，而是建立了一套完整的 **「Sitemap 生命週期管理系統」**。這套架構確保了從網站啟動到日後的每一天，都能維持恆星級的效能。

### 階段 1：從零到一的冷啟動 (Initial Cold Start)
在首次啟動時，Luminosity 透過 **流式處理 (Streaming)** 避免內存崩潰。它不會一次將千萬筆資料加載到記憶體，而是像流水一樣，邊讀取資料庫邊將其寫入磁碟日誌。
- **逐批處理**：利用 `batchSize` 進行分批讀取。
- **磁碟固化**：每一批處理完畢後立即寫入磁碟，確保即使過程中斷也能從斷點恢復。

### 階段 2：日誌追加與固化存儲 (Log Persistence)
一旦初始資料建立完畢，Luminosity 就轉入 **增量模式**。
- **追加式更新 (LSM-log)**：任何新的頁面或變動都會被視為一條「追加日誌」，直接寫入增量日誌檔。
- **跳過掃描**：您不再需要為了增加一個網址而重新掃描整個資料庫，系統只關心那「少數的變動」。

### 階段 3：背景壓縮與分頁自動化 (Day-2 Compaction)
`incremental.compactInterval` 控制著背景維護任務的頻率（例如每 24 小時）。在這段期間，系統會執行以下 **原子操作 (Atomic Operations)**：

1.  **合併與去重 (Merge & Dedupe)**：將 `.jsonl` 日誌中的數萬條變更紀錄與主快照合併。若同一網址有多次變更（如 `add` -> `update` -> `remove`），只會保留最終狀態。
2.  **日誌輪替 (Log Rotation)**：確認資料固化後，清空舊的日誌檔，防止硬碟空間無限膨脹。
3.  **物理檔案發佈 (Physical Emission)**：重新計算所有網址的分頁佈局，並生成靜態的 `sitemap-index.xml` 與 `sitemap-N.xml` (Gzip)。這意味著您的 Web Server (Nginx/CDN) 可以直接提供靜態檔案，**完全消耗零 CPU 資源**。
4.  **影子寫入與原子交換 (Shadow Swap)**：為了防止在寫入大檔案時發生並發讀取衝突，所有檔案會先寫入 `.shadow` 暫存區。生成完畢後，系統執行作業系統層級的 **原子重命名 (Atomic Rename)**，瞬間替換舊檔。這確保了訪客永遠不會讀取到「寫入中」或「損毀」的半成品。

### 千萬級抓取範例

```typescript
// src/config/seo.ts
export const seoConfig: SeoConfig = {
  mode: 'incremental', // 啟用恆星級增量模式
  baseUrl: 'https://global-shop.com',
  resolvers: [
    {
      name: 'products-massive',
      fetch: async () => {
        const pageSize = 10000
        let page = 0
        const entries = []
        
        while (true) {
          // 透過分頁流式讀取資料庫，確保即使有數百萬筆資料也不會擠爆伺服器內存
          const products = await db.products.findMany({
            take: pageSize,
            skip: page * pageSize,
            select: { slug: true, updatedAt: true }
          })
          
          if (products.length === 0) break
          
          entries.push(...products.map(p => ({
            url: `/products/${p.slug}`,
            lastmod: p.updatedAt,
            changefreq: 'weekly',
            priority: 0.7
          })))
          
          page++
        }
        return entries
      }
    }
  ],
  incremental: {
    compactInterval: '24h', // 每 24 小時執行一次背景壓縮
    maxEntriesPerFile: 50000 // 自動分頁閾值
  }
}
```

---

## 運作細節：存儲與水合 (Storage & Hydration)

了解恆星級架構的底層行為，能讓您更安心地處理千萬級資料：

### 1. 物理檔案存放在哪處？
所有 Sitemap 的「狀態」都儲存在您設定的 `logDir` 中（預設建議為 `.gravito/seo`）。
- **`sitemap.snapshot.json`**：這是您的資料「快照」，也是系統的主資料庫。
- **`sitemap.ops.jsonl`**：這是「追加日誌」，記錄了自上次壓縮後的所有變動。
- **XML 分頁檔案**：由渲染器根據快照自動生成在公開目錄。

### 2. 第一次佈署需要等嗎？
**需要進行一次初始的「水合 (Hydration)」**，但過程是全自動的：
- 當您第一次啟動應用且磁碟上沒有快照時，Luminosity 會主動呼叫 `fetch` 解析器。
- **流式寫入**：這就是我們提到的「冷啟動」，它會一邊抓取一邊寫入磁碟日誌，完成後生成的快照將作為基準。
- **後續瞬發**：一旦快照建立，之後的每次伺服器重啟都只需 **幾毫秒** 就能載入現有狀態，完全不需要重新掃描資料庫。

### 3. 如何觸發更新？
您不需要手動刪除檔案。只要呼叫 `seo.add()` 或 `seo.remove()`，變動會立即進入 `.jsonl` 追加日誌，並由背景任務定期併入主快照。

---

## 極致簡單：從部署到維運的「無感」體驗

很多開發者聽到「千萬級」或「增量架構」會聯想到複雜的分散式系統。但在 Luminosity 中，這一切都被簡化到了極致：

1.  **佈署只需一秒**：您不需要安裝 Redis、Kafka 或任何外部索引資料庫。只需將 `mode` 切換為 `incremental`，引擎就會自動在本地進行日誌管理。
2.  **維運「設後不理」**：壓縮任務（Compaction）會由背景 Worker 自動執行，您不需要編寫 Cron Job，也不需要手動搬運檔案。
3.  **無痛遷移**：當您的網站從 1,000 個網址成長到 1,000 萬個時，您的代碼 **不需要做任何變更**。Luminosity 會隨著您的資料規模自動進化。

---

## ☁ 雲端與容器化部署 (Cloud & Container Native)

如果您使用 Docker/Kubernetes 進行佈署並啟動了 **Auto-scaling (自動擴展)**，由於容器的檔案系統是暫時性的 (Ephemeral)，我們建議採取以下策略：

### 1. 使用共享持久性磁碟 (Recommended)
將 `logDir` 指向一個共享的網路文件系統，例如 AWS EFS、Google Cloud Filestore 或 K8s 的 Persistent Volume (PV)。
- **優點**：所有容器實例共享同一個快照與日誌，保證資料一致性。
- **配置範例 (Docker Compose)**：
  ```yaml
  services:
    app:
      image: my-app:latest
      volumes:
        - efs-data:/app/.gravito/seo
  volumes:
    efs-data:
      driver: local # 在生產環境應使用雲端驅動
  ```

### 2. 靜態預生成 (Build-time Generation / SSG)
如果您的資料在佈署後變動頻率不高，可以結合 `@gravito/freeze` 在 CI/CD 階段完成第一次生成。
- **流程**：在 Docker Build 階段執行 `luminosity build`，並將生成的 XML 檔案封裝進鏡像中。
- **優點**：完全無狀態 (Stateless)，具備極致的擴展性能，且無需掛載磁碟。

### 3. 指定壓縮節點 (Leader Compaction)
在超大型集群中，建議指定 **一個特定的管理實例** 負責處理 `incremental` 的日誌壓縮任務（寫入權限），其餘平行的實例則以唯讀模式讀取快照檔案。

### 4. 物件儲存掛載 (S3/MinIO)
理論上，Luminosity 也支援透過 **FUSE** 或 **CSI Driver** (如 S3FS) 將 S3/GCS Bucket 掛載為本地文件夾使用。
- **適用**：極致的成本控制，或需要無限的儲存空間。
- **注意**：由於 S3 並非為高頻小檔寫入設計，若使用此方案，建議加大批量寫入的緩衝 (Batch Size) 以降低 I/O 延遲。

---

## 容錯機制 (Fault Tolerance)

在執行 `fetch` 過程中，Luminosity 採用 **並行隔離 (Parallel Isolation)** 策略：

1.  **獨立執行**：每個 Resolver 都是獨立運行的 Promise。
2.  **失敗隔離**：如果其中一個 Resolver（例如 `products`）因為資料庫連線超時而拋出錯誤，**它不會影響其他 Resolver 的執行**。
3.  **優雅降級**：失敗的 Resolver 會在控制台輸出錯誤日誌，並暫時回傳空陣列，確保 `sitemap.xml` 依然能被生成，不會導致整個 SEO 服務癱瘓。

```typescript
// 即使 news-api 掛掉，static-pages 依然會正常生成
resolvers: [
  { name: 'static-pages', fetch: () => [...] },
  { 
    name: 'news-api', 
    fetch: async () => {
      // 假設這裡拋出 Error...
      throw new Error('API Timeout') 
    }
  }
]
```

---

## 進階功能：圖像、多語系與機器人

Luminosity 支援完整的 SEO 協議，而不僅僅是基本的網址：

### 1. 圖像站點地圖 (Image Sitemaps)
如果您的網站是電商或媒體平台，圖片的搜尋排名至關重要。您可以在 `SitemapEntry` 中直接附帶圖片資訊：

```typescript
{
  url: '/products/galaxy-s24',
  images: [
    {
      url: 'https://cdn.example.com/s24-titanium.jpg',
      title: 'Galaxy S24 Titanium',
      caption: 'The new Titanium Gray',
      license: 'https://creativecommons.org/licenses/by/4.0/'
    }
  ]
}
```

### 2. 多語系支援 (i18n / hreflang)
針對跨國網站，Luminosity 支援 Google 的 `hreflang` 標準，防止不同語言版本的頁面被視為重複內容：

```typescript
{
  url: '/en/about',
  alternates: [
    { lang: 'zh-TW', url: '/zh-tw/about' },
    { lang: 'ja-JP', url: '/ja/about' }
  ]
}
```

### 3. Robots.txt 與品牌水印
您可以在配置中直接管理 `robots.txt` 規則，甚至自定義 XML 檔案底部的品牌水印（Enterprise 用戶可隱藏）：

```typescript
const config: SeoConfig = {
  // ...
  robots: {
    // 自動生成並插入 Sitemap Link
    rules: [
      { userAgent: '*', allow: ['/'], disallow: ['/admin', '/private'] },
      { userAgent: 'GPTBot', disallow: ['/'] } // 阻擋 AI 爬蟲
    ]
  },
  branding: {
    enabled: true, // 設為 false 可隱藏 "Generated by Luminosity"
    watermark: 'Managed by MyCorp SEO Team'
  }
}
```

---

## 全方位 Meta 標籤管理 (Unified Meta Management)

除了 Sitemap，Luminosity 還提供了強大的 `SeoMetadata` 工具，專門解決 SPA (單頁應用) 在社交分享預覽 (Link Preview) 空白的問題。

### 為什麼需要 Server-Side Meta？
雖然 Inertia 的 `<Head>` 元件能處理客戶端導航的標題變化，但 Facebook、Twitter (X)、Line 的爬蟲通常不會執行 JavaScript。因此，**OpenGraph 與 Twitter Card 必須在伺服器端直接注入 HTML**。

### 實作範例

#### 1. 控制器 (Controller) 設定
在您的控制器中建立 Metadata 並傳遞給 View：

```typescript
import { SeoMetadata } from '@gravito/luminosity'

export class ProductController {
  async show({ inertia, params }: HttpContext) {
    const product = await Product.find(params.id)
    
    // 定義 Meta 標籤
    const seo = new SeoMetadata({
      meta: {
        title: product.name,
        description: product.summary,
        canonical: `https://example.com/products/${product.slug}`
      },
      og: {
        type: 'product',
        title: product.name,
        image: product.coverImage,
        url: `https://example.com/products/${product.slug}`
      },
      twitter: {
        card: 'summary_large_image'
      }
    })

    // 將生成的 HTML 字串傳遞給 Root Template (第三個參數)
    return inertia.render('Product/Show', { product }, {
      metaTags: seo.toString()
    })
  }
}
```

#### 2. 模板 (Root Template) 插槽
確保您的根模板文件 (例如 `resources/views/app.edge`) 在 `<head>` 中預留了插槽：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Server-Side Meta Injection -->
  {{ metaTags || '' }}
  
  @vite(['src/main.tsx'])
</head>
<body>
  <div id="app" data-page="{ { page } }"></div>
</body>
</html>
```

---

## 命令列工具 (CLI)

除了以 API 模式運行，Luminosity 也是一個強大的 CLI 工具，適合用於 CI/CD 流程或手動維護。

### 安裝

```bash
npm install -g @gravito/luminosity-cli
# 或者直接使用 npx
npx luminosity --help
```

### 1. 手動生成 (Manual Generation)
如果您不希望在 Runtime 生成 Sitemap，可以在部署前執行此命令生成靜態檔案：

```bash
# 讀取預設 luminosity.config.ts 並生成到 dist/sitemap.xml
npx luminosity generate

# 指定配置與輸出路徑
npx luminosity generate --config ./seo.config.ts --out ./public/sitemap.xml
```

### 2. 強制壓縮 (Force Compaction)
在 `incremental` 模式下，您可以隨時手動觸發日誌壓縮，這在進行大規模資料匯入後非常有用：

```bash
npx luminosity compact
```

---

## 為什麽 Luminosity 是最強大的 SEO 引擎？

Luminosity 不僅僅是一個 Sitemap 生成器，它是 Gravito 為了極致開發體驗與商業成功而打造的全方位解決方案：

1.  **跨平台一致性**：無論您使用 React (Ion) 還是 Vue，Meta 標籤的管理都在後端統一處理，解決 SPA 的搜尋隱形問題。
2.  **智慧自動掃描**：內建 `routeScanner`，只需一行代碼就能自動同步所有的路由定義，實現真正的自動化。
3.  **零設置分析工具**：自動注入 GA、Facebook Pixel、百度等追蹤腳本，並支援 CSP 安全策略。
4.  **SSG 完美結合**：與 `@gravito/freeze` 深度整合，讓靜態站點也能擁有動態站點的強大 SEO。

> **最後一站**：準備好上線了嗎？前往 [部署指南](/zh/docs/guide/deployment) 學習如何完成最後一哩路。
