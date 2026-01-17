import type { RedirectRule } from '../types'

/**
 * Options for automatic redirect detection via HTTP probes.
 *
 * @public
 * @since 3.0.0
 */
export interface AutoDetectOptions {
  /** Whether automatic HTTP detection is enabled. */
  enabled: boolean
  /** HTTP request timeout in milliseconds. @default 5000 */
  timeout?: number
  /** Maximum number of concurrent HTTP probes. @default 10 */
  maxConcurrent?: number
  /** Whether to cache detection results in memory. @default false */
  cache?: boolean
  /** Cache time-to-live in seconds. @default 3600 */
  cacheTtl?: number
}

/**
 * Options for redirect detection from a database table.
 *
 * @public
 * @since 3.0.0
 */
export interface DatabaseDetectOptions {
  /** Whether database detection is enabled. */
  enabled: boolean
  /** The name of the table containing redirect rules. */
  table: string
  /** Column mapping for the redirect table. */
  columns: {
    from: string
    to: string
    type: string
  }
  /** Database connection instance (e.g., Knex, Atlas). */
  connection: any
}

/**
 * Options for redirect detection from a static configuration file.
 *
 * @public
 * @since 3.0.0
 */
export interface ConfigDetectOptions {
  /** Whether configuration file detection is enabled. */
  enabled: boolean
  /** Path to the JSON configuration file. */
  path: string
  /** Whether to watch the file for changes. @default false */
  watch?: boolean
}

/**
 * Options for configuring the `RedirectDetector`.
 *
 * @public
 * @since 3.0.0
 */
export interface RedirectDetectorOptions {
  /** The base URL of the site being scanned. */
  baseUrl: string
  /** Configuration for automatic HTTP probing. */
  autoDetect?: AutoDetectOptions
  /** Configuration for database-driven detection. */
  database?: DatabaseDetectOptions
  /** Configuration for file-driven detection. */
  config?: ConfigDetectOptions
}

/**
 * RedirectDetector identifies 301 and 302 redirects for URLs.
 *
 * It supports multiple detection strategies including database lookups,
 * static configuration files, and live HTTP probing. This ensures that
 * sitemaps always point to final destination URLs, improving SEO efficiency.
 *
 * @example
 * ```typescript
 * const detector = new RedirectDetector({
 *   baseUrl: 'https://example.com',
 *   autoDetect: { enabled: true }
 * });
 * const rule = await detector.detect('/old-path');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class RedirectDetector {
  private options: RedirectDetectorOptions
  private cache = new Map<string, { rule: RedirectRule | null; expires: number }>()

  constructor(options: RedirectDetectorOptions) {
    this.options = options
  }

  /**
   * 偵測單一 URL 的轉址
   */
  async detect(url: string): Promise<RedirectRule | null> {
    // 檢查快取
    if (this.options.autoDetect?.cache) {
      const cached = this.cache.get(url)
      if (cached && cached.expires > Date.now()) {
        return cached.rule
      }
    }

    let rule: RedirectRule | null = null

    // 1. 嘗試從資料庫讀取
    if (this.options.database?.enabled) {
      rule = await this.detectFromDatabase(url)
      if (rule) {
        this.cacheResult(url, rule)
        return rule
      }
    }

    // 2. 嘗試從設定檔讀取
    if (this.options.config?.enabled) {
      rule = await this.detectFromConfig(url)
      if (rule) {
        this.cacheResult(url, rule)
        return rule
      }
    }

    // 3. 自動偵測
    if (this.options.autoDetect?.enabled) {
      rule = await this.detectAuto(url)
      this.cacheResult(url, rule)
      return rule
    }

    return null
  }

  /**
   * 批次偵測轉址
   */
  async detectBatch(urls: string[]): Promise<Map<string, RedirectRule | null>> {
    const results = new Map<string, RedirectRule | null>()

    // 使用並發控制
    const maxConcurrent = this.options.autoDetect?.maxConcurrent || 10
    const batches: string[][] = []

    for (let i = 0; i < urls.length; i += maxConcurrent) {
      batches.push(urls.slice(i, i + maxConcurrent))
    }

    for (const batch of batches) {
      const promises = batch.map((url) =>
        this.detect(url).then((rule) => {
          results.set(url, rule)
        })
      )
      await Promise.all(promises)
    }

    return results
  }

  /**
   * 從資料庫偵測
   */
  private async detectFromDatabase(url: string): Promise<RedirectRule | null> {
    const { database } = this.options
    if (!database?.enabled) {
      return null
    }

    try {
      const { connection, table, columns } = database
      const query = `SELECT ${columns.from}, ${columns.to}, ${columns.type} FROM ${table} WHERE ${columns.from} = ? LIMIT 1`
      const results = await connection.query(query, [url])

      if (results.length === 0) {
        return null
      }

      const row = results[0]
      return {
        from: row[columns.from],
        to: row[columns.to],
        type: parseInt(row[columns.type], 10) as 301 | 302,
      }
    } catch {
      return null
    }
  }

  /**
   * 從設定檔偵測
   */
  private async detectFromConfig(url: string): Promise<RedirectRule | null> {
    const { config } = this.options
    if (!config?.enabled) {
      return null
    }

    try {
      const fs = await import('node:fs/promises')
      const data = await fs.readFile(config.path, 'utf-8')
      const redirects: RedirectRule[] = JSON.parse(data)

      const rule = redirects.find((r) => r.from === url)
      return rule || null
    } catch {
      return null
    }
  }

  /**
   * 自動偵測（透過 HTTP 請求）
   */
  private async detectAuto(url: string): Promise<RedirectRule | null> {
    const { autoDetect, baseUrl } = this.options
    if (!autoDetect?.enabled) {
      return null
    }

    try {
      const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`
      const timeout = autoDetect.timeout || 5000

      // 發送 HEAD 請求
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(fullUrl, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'manual', // 手動處理轉址
        })

        clearTimeout(timeoutId)

        if (response.status === 301 || response.status === 302) {
          const location = response.headers.get('Location')
          if (location) {
            return {
              from: url,
              to: location,
              type: response.status as 301 | 302,
            }
          }
        }
      } catch (error: any) {
        clearTimeout(timeoutId)
        if (error.name !== 'AbortError') {
          throw error
        }
      }
    } catch {
      // 忽略錯誤
    }

    return null
  }

  /**
   * 快取結果
   */
  private cacheResult(url: string, rule: RedirectRule | null): void {
    if (!this.options.autoDetect?.cache) {
      return
    }

    const ttl = (this.options.autoDetect.cacheTtl || 3600) * 1000
    this.cache.set(url, {
      rule,
      expires: Date.now() + ttl,
    })
  }
}
