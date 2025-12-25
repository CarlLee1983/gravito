# Sitemap 系統指南：技術 SEO 的地圖繪製

在搜尋引擎優化的世界裡，**Sitemap (網址清單)** 是網站最重要的「導航地圖」。雖然 [Luminosity 引擎](./seo-engine) 負責讓各頁面更有吸引力（Meta 標籤），但 **Sitemap** 才是真正決定搜尋引擎爬蟲能否找到並抓取你網站中所有「隱藏寶藏」的關鍵。

Gravito 的 Sitemap 系統專為 **恆星級 (Enterprise SCALE)** 網站設計，能夠輕鬆處理數百萬個 URL，並支援分片、增量更新與雲端自動同步。

---

## 為什麼需要 Sitemap 系統？

1.  **解決 SPA 抓取困難**：單頁應用程式 (React/Vue) 的內容往往對爬蟲不夠友好，Sitemap 確保每一條動態路由都能被發現。
2.  **恆星級擴展性**：當你的 URL 超過 5 萬個時，Google 要求必須進行 **「Sitemap 分片 (Sharding)」**，本系統會自動為你處理 Index 文件與分路。
3.  **自動化轉址同步**：如果網址發生 301 變更，Sitemap 會自動同步，避免爬蟲抓到死連結。

---

## 目錄

1. [快速開始](#快速開始)
2. [基礎使用：動態與靜態](#基礎使用)
3. [企業級功能：S3 與雲端儲存](#企業級功能)
4. [原子化影子生成 (Shadow Swap)](#影子處理shadow-processing)
5. [增量生成 (Incremental Build)](#增量生成)
6. [301 轉址自動處理](#301-轉址處理)
7. [最佳實踐](#最佳實踐)


---

## 快速開始

### 安裝

```bash
bun add @gravito/constellation
```

### 最簡單範例

```typescript
import { OrbitSitemap, routeScanner } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  outDir: './dist',
  providers: [
    routeScanner(core.router)
  ]
})

await sitemap.generate()
```

完成！你的 sitemap 已生成在 `./dist/sitemap.xml`。

---

## Node.js 執行環境示範

如果你想驗證 sitemap 在純 Node runtime 的表現，可以使用 Express adapter 範例：

- `examples/luminosity-node`

注意：部分功能僅在使用 Gravito core 時提供。

---

## 基礎使用

### 1. 動態 Sitemap（運行時生成）

從應用程式直接提供 sitemap：

```typescript
import { OrbitSitemap, routeScanner } from '@gravito/constellation'

OrbitSitemap.dynamic({
  baseUrl: 'https://example.com',
  providers: [
    // 自動掃描路由
    routeScanner(core.router, {
      exclude: ['/api/*', '/admin/*'],
      defaultChangefreq: 'daily'
    }),
    
    // 從資料庫自訂 provider
    {
      async getEntries() {
        const posts = await db.query('SELECT slug, updated_at FROM posts')
        return posts.map(post => ({
          url: `/blog/${post.slug}`,
          lastmod: post.updated_at,
          changefreq: 'weekly',
          priority: 0.8
        }))
      }
    }
  ],
  cacheSeconds: 3600 // 快取 1 小時
}).install(core)
```

**存取方式**：在瀏覽器訪問 `https://example.com/sitemap.xml`。

### 2. 靜態生成（編譯時生成）

在建置過程中生成 sitemap 檔案：

```typescript
import { OrbitSitemap, routeScanner } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  outDir: './dist',
  filename: 'sitemap.xml',
  providers: [
    routeScanner(core.router),
    {
      async getEntries() {
        // 你的自訂 entries
      }
    }
  ]
})

await sitemap.generate()
```

### 3. 自訂 Providers

Providers 可以回傳：
- **陣列**：`Promise<SitemapEntry[]>` 或 `SitemapEntry[]`
- **AsyncIterable**：用於串流處理大量資料

```typescript
// 陣列 provider（適合小資料集）
{
  async getEntries() {
    return [
      { url: '/page1', lastmod: new Date() },
      { url: '/page2', lastmod: new Date() }
    ]
  }
}

// AsyncIterable provider（適合大量資料）
{
  async *getEntries() {
    const pageSize = 1000
    let offset = 0
    
    while (true) {
      const rows = await db.query(
        'SELECT id, slug, updated_at FROM products LIMIT ? OFFSET ?',
        [pageSize, offset]
      )
      
      if (rows.length === 0) break
      
      for (const row of rows) {
        yield {
          url: `/products/${row.slug}`,
          lastmod: row.updated_at
        }
      }
      
      offset += pageSize
    }
  }
}
```

### 4. Sitemap 擴展功能

#### 圖片

```typescript
{
  url: '/gallery',
  images: [
    {
      loc: 'https://example.com/image1.jpg',
      title: '圖片標題',
      caption: '圖片說明',
      license: 'https://example.com/license'
    }
  ]
}
```

#### 影片

```typescript
{
  url: '/video-page',
  videos: [{
    thumbnail_loc: 'https://example.com/thumb.jpg',
    title: '影片標題',
    description: '影片說明',
    content_loc: 'https://example.com/video.mp4',
    duration: 600,
    view_count: 1000
  }]
}
```

#### 新聞

```typescript
{
  url: '/news/article',
  news: {
    publication: {
      name: '每日新聞',
      language: 'zh-TW'
    },
    publication_date: '2024-01-01',
    title: '文章標題',
    keywords: ['新聞', '文章']
  }
}
```

#### 多語系替代網址

```typescript
{
  url: '/about',
  alternates: [
    { lang: 'en', url: '/en/about' },
    { lang: 'zh-TW', url: '/zh-TW/about' },
    { lang: 'ja', url: '/ja/about' }
  ]
}
```

---

## 企業級功能

### 雲端儲存（S3 / GCP）

將 sitemap 直接儲存在雲端儲存以提升擴展性：

#### AWS S3

```bash
# 安裝 AWS SDK（peer dependency）
bun add @aws-sdk/client-s3
```

```typescript
import { OrbitSitemap, S3SitemapStorage } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  storage: new S3SitemapStorage({
    bucket: 'my-sitemap-bucket',
    region: 'us-east-1',
    prefix: 'sitemaps', // 可選：資料夾前綴
    baseUrl: 'https://my-sitemap-bucket.s3.amazonaws.com',
    shadow: {
      enabled: true,
      mode: 'atomic' // 或 'versioned'
    }
  }),
  providers: [...]
})

await sitemap.generate()
```

**環境變數**：
```bash
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

#### Google Cloud Storage

```bash
# 安裝 GCP SDK（peer dependency）
bun add @google-cloud/storage
```

```typescript
import { OrbitSitemap, GCPSitemapStorage } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  storage: new GCPSitemapStorage({
    bucket: 'my-sitemap-bucket',
    prefix: 'sitemaps',
    baseUrl: 'https://storage.googleapis.com/my-sitemap-bucket',
    shadow: {
      enabled: true,
      mode: 'versioned'
    }
  }),
  providers: [...]
})

await sitemap.generate()
```

**認證**：使用預設 GCP 認證或設定 `GOOGLE_APPLICATION_CREDENTIALS`。

### 影子處理（Shadow Processing）

影子處理確保安全部署，先將 sitemap 生成到臨時位置再切換：

#### 原子模式（Atomic Mode）

生成到臨時位置，然後原子性切換：

```typescript
const sitemap = OrbitSitemap.static({
  // ...
  shadow: {
    enabled: true,
    mode: 'atomic'
  }
})
```

**運作方式**：
1. 生成到 `sitemap.xml.shadow.{id}`
2. 完成後，原子性移動到 `sitemap.xml`
3. 刪除影子檔案

#### 版本化模式（Versioned Mode）

保留舊版本，準備好時再切換：

```typescript
const sitemap = OrbitSitemap.static({
  // ...
  shadow: {
    enabled: true,
    mode: 'versioned'
  }
})
```

**運作方式**：
1. 生成到 `sitemap.xml.shadow.{id}`
2. 複製到 `sitemap.xml.v{version}`
3. 複製到 `sitemap.xml`
4. 刪除影子檔案

**切換版本**：
```typescript
await storage.switchVersion('sitemap.xml', 'version-id')
```

### 背景生成與進度追蹤

非同步生成 sitemap，不阻塞主流程：

```typescript
import { OrbitSitemap, MemoryProgressStorage } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  outDir: './dist',
  providers: [...],
  progressStorage: new MemoryProgressStorage() // 或 RedisProgressStorage
})

// 觸發背景生成
const jobId = await sitemap.generateAsync({
  onProgress: (progress) => {
    console.log(`進度: ${progress.percentage}% (${progress.processed}/${progress.total})`)
  },
  onComplete: () => {
    console.log('[Complete] 生成完成！')
  },
  onError: (error) => {
    console.error('❌ 生成失敗:', error)
  }
})

console.log(`任務 ID: ${jobId}`)
```

#### 透過 API 查詢進度

安裝 API endpoints：

```typescript
sitemap.installApiEndpoints(core, '/admin/sitemap')
```

> **安全注意事項**：這些 API endpoints 預設沒有認證保護。在生產環境中，你必須自行實作認證與授權機制來保護這些端點，避免未授權的使用者觸發 sitemap 生成或查詢敏感資訊。

**保護端點的實作方式**：

##### 方式一：使用 Sentinel（推薦）

使用 `@gravito/sentinel` 提供的認證與授權機制：

```typescript
import { auth, can } from '@gravito/sentinel'

// 定義授權能力（在 Gate 中）
core.get('gate').define('manage-sitemap', (user) => {
  // 只有管理員可以管理 sitemap
  return user.role === 'admin'
})

// 在安裝 endpoints 前，先註冊保護路由
core.router.use('/admin/sitemap/*', auth(), can('manage-sitemap'))

// 然後安裝 endpoints
sitemap.installApiEndpoints(core, '/admin/sitemap')
```

##### 方式二：使用 API Token

使用簡單的 API Token 驗證：

```typescript
import type { GravitoContext, Next } from 'gravito-core'

const apiTokenAuth = async (c: GravitoContext, next: Next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const validToken = process.env.SITEMAP_API_TOKEN
  
  if (!token || token !== validToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  await next()
}

// 在安裝 endpoints 前，先註冊保護 middleware
core.router.use('/admin/sitemap/*', apiTokenAuth)

// 然後安裝 endpoints
sitemap.installApiEndpoints(core, '/admin/sitemap')
```

**環境變數設定**：
```bash
SITEMAP_API_TOKEN=your-secret-token-here
```

**使用方式**：
```bash
curl -X POST http://localhost:3000/admin/sitemap/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token-here" \
  -d '{"incremental": false}'
```

##### 方式三：使用 IP 白名單

限制只有特定 IP 可以存取：

```typescript
import type { GravitoContext, Next } from 'gravito-core'
import { ipRangeCheck } from 'ip-range-check' // 需要安裝套件

const adminOnly = async (c: GravitoContext, next: Next) => {
  // 取得客戶端 IP（考慮代理伺服器）
  const forwardedFor = c.req.header('x-forwarded-for')
  const realIp = c.req.header('x-real-ip')
  const clientIP = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'
  
  // 允許的 IP 範圍
  const allowedIPs = [
    '127.0.0.1',
    '::1',
    '10.0.0.0/8',      // 內部網路
    '192.168.0.0/16',  // 內部網路
  ]
  
  const isAllowed = allowedIPs.some(ip => {
    if (ip.includes('/')) {
      // CIDR 範圍檢查
      return ipRangeCheck(clientIP, ip)
    }
    return clientIP === ip
  })
  
  if (!isAllowed) {
    return c.json({ error: 'Forbidden: IP not allowed' }, 403)
  }
  
  await next()
}

core.router.use('/admin/sitemap/*', adminOnly)
sitemap.installApiEndpoints(core, '/admin/sitemap')
```

##### 方式四：組合多種保護機制

結合多種保護方式以提升安全性：

```typescript
import { auth } from '@gravito/sentinel'
import type { GravitoContext, Next } from 'gravito-core'

// 1. 檢查認證
const requireAuth = auth()

// 2. 檢查 API Token（作為第二層保護）
const requireApiToken = async (c: GravitoContext, next: Next) => {
  const token = c.req.header('X-API-Token')
  if (token !== process.env.SITEMAP_API_TOKEN) {
    return c.json({ error: 'Invalid API token' }, 401)
  }
  await next()
}

// 3. 組合使用
core.router.use('/admin/sitemap/*', requireAuth, requireApiToken)
sitemap.installApiEndpoints(core, '/admin/sitemap')
```

**可用端點**：
- `POST /admin/sitemap/generate` - 觸發生成
- `GET /admin/sitemap/status/:jobId` - 查詢進度
- `GET /admin/sitemap/history` - 查詢歷史記錄

**範例請求**（使用 API Token 認證）：
```bash
# 觸發生成
curl -X POST http://localhost:3000/admin/sitemap/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token-here" \
  -d '{"incremental": false}'

# 查詢進度
curl http://localhost:3000/admin/sitemap/status/{jobId} \
  -H "Authorization: Bearer your-secret-token-here"

# 查詢歷史記錄
curl http://localhost:3000/admin/sitemap/history?limit=10 \
  -H "Authorization: Bearer your-secret-token-here"
```

> **提示**：在開發環境中，你可以暫時不使用認證保護，但在部署到生產環境前，務必實作適當的安全機制。

#### 使用 Redis 進行進度儲存

```typescript
import { RedisProgressStorage } from '@gravito/constellation'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

const sitemap = OrbitSitemap.static({
  // ...
  progressStorage: new RedisProgressStorage({
    client: redis,
    keyPrefix: 'sitemap:progress:',
    ttl: 86400 // 24 小時
  })
})
```

### 大規模分片（Sharding）

自動將大型 sitemap 分割成多個檔案：

```typescript
const sitemap = OrbitSitemap.static({
  // ...
  maxEntriesPerFile: 50000 // 預設：50000（Google 的限制）
})
```

**結果**：
- `sitemap.xml`（索引檔案）
- `sitemap-1.xml`（前 5 萬個 URL）
- `sitemap-2.xml`（接下來 5 萬個 URL）
- ...

---

## 增量生成

只更新變更的 URL，而不是重新生成整個 sitemap：

### 設定

```typescript
import { OrbitSitemap, MemoryChangeTracker } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  outDir: './dist',
  providers: [...],
  incremental: {
    enabled: true,
    changeTracker: new MemoryChangeTracker({
      maxChanges: 100000
    }),
    autoTrack: true // 自動追蹤變更
  }
})
```

### 完整生成（首次）

```typescript
await sitemap.generate()
```

這會生成完整的 sitemap 並追蹤所有 URL。

### 增量更新

```typescript
// 只更新特定日期之後的變更
await sitemap.generateIncremental(new Date('2024-01-01'))
```

### 手動變更追蹤

```typescript
// 追蹤 URL 新增
await sitemap.trackChange({
  type: 'add',
  url: '/new-page',
  entry: {
    url: '/new-page',
    lastmod: new Date(),
    changefreq: 'weekly'
  },
  timestamp: new Date()
})

// 追蹤 URL 更新
await sitemap.trackChange({
  type: 'update',
  url: '/existing-page',
  entry: {
    url: '/existing-page',
    lastmod: new Date(),
    changefreq: 'daily'
  },
  timestamp: new Date()
})

// 追蹤 URL 刪除
await sitemap.trackChange({
  type: 'remove',
  url: '/deleted-page',
  timestamp: new Date()
})
```

### 使用 Redis 進行變更追蹤

```typescript
import { RedisChangeTracker } from '@gravito/constellation'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

const sitemap = OrbitSitemap.static({
  // ...
  incremental: {
    enabled: true,
    changeTracker: new RedisChangeTracker({
      client: redis,
      keyPrefix: 'sitemap:changes:',
      ttl: 604800 // 7 天
    })
  }
})
```

---

## 301 轉址處理

自動處理 sitemap 中的 URL 轉址：

### 設定

```typescript
import { 
  OrbitSitemap, 
  MemoryRedirectManager,
  RedirectDetector 
} from '@gravito/constellation'

const redirectManager = new MemoryRedirectManager()

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  outDir: './dist',
  providers: [...],
  redirect: {
    enabled: true,
    manager: redirectManager,
    strategy: 'remove_old_add_new', // 見下方策略說明
    followChains: true, // 追蹤轉址鏈（A → B → C）
    maxChainLength: 5 // 最大鏈長度
  }
})
```

### 轉址策略

#### 1. 移除舊 URL，加入新 URL（預設）

移除舊 URL，加入新 URL：

```typescript
redirect: {
  strategy: 'remove_old_add_new'
}
```

**結果**：只有新 URL 出現在 sitemap 中。

#### 2. 保留關聯

保留舊 URL 並使用 canonical link：

```typescript
redirect: {
  strategy: 'keep_relation'
}
```

**結果**：舊 URL 保留，並有 `<xhtml:link rel="canonical">` 指向新 URL。

#### 3. 僅更新 URL

直接更新 URL：

```typescript
redirect: {
  strategy: 'update_url'
}
```

**結果**：URL 被更新，其他 metadata 保留。

#### 4. 雙重標記

同時保留舊 URL 和新 URL：

```typescript
redirect: {
  strategy: 'dual_mark'
}
```

**結果**：兩個 URL 都出現，舊 URL 標記轉址資訊。

### 自動偵測

透過 HTTP 請求自動偵測轉址：

```typescript
const detector = new RedirectDetector({
  baseUrl: 'https://example.com',
  autoDetect: {
    enabled: true,
    timeout: 5000,
    maxConcurrent: 10,
    cache: true,
    cacheTtl: 3600
  }
})

// 偵測 URL 的轉址
const redirects = await detector.detectBatch([
  '/old-page-1',
  '/old-page-2'
])

// 註冊偵測到的轉址
for (const [from, rule] of redirects) {
  if (rule) {
    await redirectManager.register(rule)
  }
}
```

### 資料庫偵測

從資料庫載入轉址：

```typescript
const detector = new RedirectDetector({
  baseUrl: 'https://example.com',
  database: {
    enabled: true,
    table: 'redirects',
    columns: {
      from: 'old_url',
      to: 'new_url',
      type: 'redirect_type'
    },
    connection: dbConnection
  }
})
```

### 設定檔偵測

從 JSON 檔案載入轉址：

```typescript
const detector = new RedirectDetector({
  baseUrl: 'https://example.com',
  config: {
    enabled: true,
    path: './redirects.json',
    watch: true // 監聽檔案變更
  }
})
```

**redirects.json**：
```json
[
  {
    "from": "/old-page",
    "to": "/new-page",
    "type": 301
  }
]
```

### 手動註冊

```typescript
// 單一轉址
await redirectManager.register({
  from: '/old-page',
  to: '/new-page',
  type: 301
})

// 批次註冊
await redirectManager.registerBatch([
  { from: '/old-1', to: '/new-1', type: 301 },
  { from: '/old-2', to: '/new-2', type: 302 }
])
```

### 使用 Redis 進行轉址管理

```typescript
import { RedisRedirectManager } from '@gravito/constellation'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

const redirectManager = new RedisRedirectManager({
  client: redis,
  keyPrefix: 'sitemap:redirects:',
  ttl: undefined // 永久
})
```

---

## 最佳實踐

### 1. 對大型資料集使用 AsyncIterable

```typescript
{
  async *getEntries() {
    // 從資料庫串流，而不是一次載入所有資料
    for await (const row of db.cursor('SELECT * FROM products')) {
      yield { url: `/products/${row.slug}` }
    }
  }
}
```

### 2. 設定適當的變更頻率

```typescript
{
  url: '/blog/post',
  changefreq: 'weekly', // 內容變更頻率
  priority: 0.8 // 相對重要性（0.0 - 1.0）
}
```

### 3. 對大型網站使用增量生成

```typescript
// 只更新變更的部分
await sitemap.generateIncremental(new Date('2024-01-01'))
```

### 4. 生產環境啟用影子處理

```typescript
shadow: {
  enabled: true,
  mode: 'atomic' // 安全部署
}
```

### 5. 監控生成進度

```typescript
await sitemap.generateAsync({
  onProgress: (progress) => {
    // 記錄或發送到監控服務
    logger.info(`Sitemap 生成進度: ${progress.percentage}%`)
  }
})
```

### 6. 主動處理轉址

```typescript
// 在生成前偵測並註冊轉址
const redirects = await detector.detectBatch(urls)
for (const [from, rule] of redirects) {
  if (rule) await redirectManager.register(rule)
}
```

### 7. 使用雲端儲存提升擴展性

```typescript
// 儲存在 S3/GCP 以便 CDN 分發
storage: new S3SitemapStorage({
  bucket: 'my-sitemap-bucket',
  region: 'us-east-1'
})
```

---

## 故障排除

### 問題：Sitemap 生成太慢

**解決方案**：
1. 使用 AsyncIterable providers 而不是載入所有資料
2. 啟用增量生成
3. 使用背景生成 `generateAsync()`
4. 按內容類型分割 providers

### 問題：大型資料集記憶體問題

**解決方案**：
1. 使用串流 providers（AsyncIterable）
2. 減少 `maxEntriesPerFile` 以創建更多分片
3. 使用雲端儲存而不是本地檔案系統
4. 啟用增量生成

### 問題：轉址無法運作

**解決方案**：
1. 檢查轉址管理器是否正確設定
2. 確認轉址規則在生成前已註冊
3. 檢查轉址策略是否符合需求
4. 如果存在轉址鏈，啟用 `followChains`

### 問題：進度追蹤未更新

**解決方案**：
1. 確保 `progressStorage` 已設定
2. 如果使用 `RedisProgressStorage`，檢查 Redis 連接
3. 查詢時確認 job ID 正確
4. 檢查 API endpoints 是否已安裝

### 問題：雲端儲存上傳失敗

**解決方案**：
1. 驗證認證資訊（AWS/GCP）
2. 檢查 bucket 權限
3. 確認區域設定正確
4. 檢查網路連線

---

## 完整範例

以下是完整的企業級設定範例：

```typescript
import { 
  OrbitSitemap,
  S3SitemapStorage,
  RedisChangeTracker,
  RedisRedirectManager,
  RedisProgressStorage,
  RedirectDetector,
  routeScanner
} from '@gravito/constellation'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

// 設定轉址偵測和管理
const redirectManager = new RedisRedirectManager({
  client: redis,
  keyPrefix: 'sitemap:redirects:'
})

const detector = new RedirectDetector({
  baseUrl: 'https://example.com',
  autoDetect: {
    enabled: true,
    timeout: 5000,
    cache: true
  }
})

// 偵測並註冊轉址
const urls = ['/old-page-1', '/old-page-2']
const redirects = await detector.detectBatch(urls)
for (const [from, rule] of redirects) {
  if (rule) await redirectManager.register(rule)
}

// 建立包含所有企業級功能的 sitemap
const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  storage: new S3SitemapStorage({
    bucket: 'my-sitemap-bucket',
    region: 'us-east-1',
    shadow: {
      enabled: true,
      mode: 'atomic'
    }
  }),
  providers: [
    routeScanner(core.router, {
      exclude: ['/api/*', '/admin/*']
    }),
    {
      async *getEntries() {
        // 從資料庫串流產品
        for await (const product of db.products.cursor()) {
          yield {
            url: `/products/${product.slug}`,
            lastmod: product.updatedAt,
            changefreq: 'weekly',
            priority: 0.7
          }
        }
      }
    }
  ],
  incremental: {
    enabled: true,
    changeTracker: new RedisChangeTracker({
      client: redis,
      keyPrefix: 'sitemap:changes:'
    }),
    autoTrack: true
  },
  redirect: {
    enabled: true,
    manager: redirectManager,
    strategy: 'remove_old_add_new',
    followChains: true
  },
  progressStorage: new RedisProgressStorage({
    client: redis,
    keyPrefix: 'sitemap:progress:'
  }),
  shadow: {
    enabled: true,
    mode: 'atomic'
  }
})

// 安裝 API endpoints
sitemap.installApiEndpoints(core, '/admin/sitemap')

// 生成（首次 - 完整生成）
await sitemap.generate()

// 或增量生成
await sitemap.generateIncremental(new Date('2024-01-01'))

// 或背景生成
const jobId = await sitemap.generateAsync({
  onProgress: (progress) => {
    console.log(`${progress.percentage}%`)
  }
})
```

---

## 下一步

- 查看 [SEO 引擎指南](./seo-engine) 了解 meta tags 和 analytics
- 參閱 [部署指南](./deployment) 了解生產環境設定
- 檢視 [企業整合](./enterprise-integration) 了解進階模式

---

**需要幫助？** 在 [GitHub](https://github.com/gravito-framework/gravito/issues) 開啟 issue。
