# 附錄 A: 完整配置類型定義（更新版）

[← 返回總覽](../README.md)

---


```typescript
// src/types.ts (完整更新版)
export type SeoMode = 'dynamic' | 'cached' | 'incremental'
export type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

export interface SeoConfig {
  /** 操作模式 */
  mode: SeoMode

  /** 基礎 URL（例如 'https://example.com'）- 無尾斜線 */
  baseUrl: string

  /** 資料解析器 */
  resolvers: SeoResolver[]

  /** Robots.txt 配置 */
  robots?: {
    rules: {
      userAgent: string
      allow?: string[]
      disallow?: string[]
      crawlDelay?: number
    }[]
    sitemapUrls?: string[]
    host?: string
  }

  /** 快取設定（用於 'cached' 模式） */
  cache?: {
    ttl: number
    maxSize?: number
  }

  /** 增量設定（用於 'incremental' 模式） */
  incremental?: {
    logDir: string
    compactInterval?: number
    maxLogSize?: number
    storage?: StorageAdapter
    /** 快取 TTL（毫秒），預設 5000 */
    cacheTtl?: number
    /** 是否壓縮快照（預設 true） */
    compressSnapshot?: boolean
  }

  /** Dynamic 策略選項 */
  dynamic?: {
    /** 批次大小（預設 5） */
    batchSize?: number
    /** 單個 resolver 超時時間（毫秒，預設 30000） */
    resolverTimeout?: number
    /** 重試次數（預設 2） */
    retryCount?: number
    /** 重試延遲（毫秒，預設 1000） */
    retryDelay?: number
  }

  /** 輸出設定 */
  output?: {
    path?: string
    filename?: string
    maxEntriesPerSitemap?: number
  }

  /** 品牌設定 */
  branding?: {
    enabled?: boolean
    watermark?: string
  }

  /** 開發模式設定 */
  dev?: {
    enabled?: boolean
    verbose?: boolean
    logLevel?: 'debug' | 'info' | 'warn' | 'error'
    performance?: boolean
  }
}
```

---

