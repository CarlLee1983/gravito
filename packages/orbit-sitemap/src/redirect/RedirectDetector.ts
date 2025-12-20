import type { RedirectRule } from '../types'

export interface AutoDetectOptions {
  enabled: boolean
  timeout?: number // 超時時間（毫秒），預設 5000
  maxConcurrent?: number // 最大並發數，預設 10
  cache?: boolean // 是否快取結果
  cacheTtl?: number // 快取 TTL（秒），預設 3600
}

export interface DatabaseDetectOptions {
  enabled: boolean
  table: string
  columns: {
    from: string
    to: string
    type: string
  }
  connection: any // 資料庫連接
}

export interface ConfigDetectOptions {
  enabled: boolean
  path: string
  watch?: boolean // 是否監聽檔案變更
}

export interface RedirectDetectorOptions {
  baseUrl: string
  autoDetect?: AutoDetectOptions
  database?: DatabaseDetectOptions
  config?: ConfigDetectOptions
}

/**
 * 轉址偵測器
 * 支援多種偵測方式：自動偵測、資料庫、設定檔
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
        type: parseInt(row[columns.type]) as 301 | 302,
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

