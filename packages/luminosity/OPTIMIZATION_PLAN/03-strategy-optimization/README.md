# Phase 3: 引擎策略優化

> **總預估時間**: 5-7 天

[← 返回總覽](../README.md)

---


> **總預估時間**: 5-7 天

### 3.1 優化 IncrementalStrategy 讀取性能（重新設計）

> **依賴**: Phase 2.1、2.2  
> **優先級**: 🔴 高  
> **預估時間**: 2-3 天

**⚠️ 重要修正**：原計劃的快取方案存在資料一致性風險，已完全重新設計。

**當前問題** (`src/engine/strategies/IncrementalStrategy.ts:75-88`):
```typescript
async getEntries(): Promise<SitemapEntry[]> {
  const snapshot = await this.loadSnapshot()
  const current = await this.compactor.compact(snapshot) // ❌ 每次都完整 compact
  return current
}
```

**問題分析**:
- 每次 `getEntries()` 都執行完整 compact
- 對於大型日誌文件，這可能很慢
- 沒有快取機制

**新的快取策略設計**:

原方案問題：
```typescript
// ❌ 原方案：異步 compact 返回舊快取會導致資料不一致
if (shouldCompact && this.cachedEntries) {
  this.compact().catch(console.error) // 異步執行
  return this.cachedEntries // 返回可能過時的資料
}
```

新方案：使用 **TTL 快取 + 寫入時失效**

```typescript
// src/engine/strategies/IncrementalStrategy.ts
import { join } from 'node:path'
import type { SitemapEntry } from '../../interfaces'
import type { StorageAdapter } from '../../storage/adapter'
import { Compactor } from '../../storage/Compactor'
import { FileSystemAdapter } from '../../storage/FileSystemAdapter'
import { JsonlLogger } from '../../storage/JsonlLogger'
import { SnapshotManager } from '../../storage/SnapshotManager'
import type { SeoConfig } from '../../types'
import type { SeoStrategy } from '../interfaces'
import { DynamicStrategy } from './DynamicStrategy'

interface CacheEntry {
  entries: SitemapEntry[]
  validUntil: number
  logSizeAtCache: number
}

export class IncrementalStrategy implements SeoStrategy {
  private logger: JsonlLogger
  private compactor: Compactor
  private snapshotManager: SnapshotManager
  private dynamic: DynamicStrategy
  private snapshotPath: string
  private adapter: StorageAdapter

  private compactTimer: ReturnType<typeof setInterval> | null = null
  private compactInterval: number | undefined

  // 快取相關
  private cache: CacheEntry | null = null
  private readonly cacheTtl: number // 快取有效時間（毫秒）
  private isCompacting: boolean = false // 防止並發 compact

  constructor(config: SeoConfig) {
    if (!config.incremental) {
      throw new Error('Config missing "incremental" settings for IncrementalStrategy')
    }

    const logDir = config.incremental.logDir
    this.adapter = config.incremental.storage || new FileSystemAdapter()
    this.cacheTtl = config.incremental.cacheTtl ?? 5000 // 預設 5 秒

    this.adapter.ensureDir(logDir).catch(() => {})

    this.logger = new JsonlLogger(join(logDir, 'sitemap.ops.jsonl'), this.adapter)
    this.snapshotPath = join(logDir, 'sitemap.snapshot.json')
    this.snapshotManager = new SnapshotManager(this.adapter, {
      compress: config.incremental.compressSnapshot ?? true,
    })
    this.compactor = new Compactor(this.logger)
    this.dynamic = new DynamicStrategy(config)
    this.compactInterval = config.incremental.compactInterval
  }

  async init(): Promise<void> {
    const snapshotStats = await this.snapshotManager.getStats(this.snapshotPath)
    
    if (!snapshotStats.exists) {
      console.log('[GravitoSeo] No snapshot found. Initializing from resolvers...')
      const entries = await this.dynamic.getEntries()
      await this.snapshotManager.save(this.snapshotPath, entries)
    }

    this.startAutoCompact()
  }

  async shutdown(): Promise<void> {
    this.stopAutoCompact()
  }

  /**
   * 獲取所有條目
   * 使用 TTL 快取減少重複 compact
   */
  async getEntries(): Promise<SitemapEntry[]> {
    const now = Date.now()
    const currentLogSize = await this.logger.getSize()

    // 檢查快取是否有效
    if (this.cache) {
      const cacheValid = 
        now < this.cache.validUntil && // TTL 未過期
        currentLogSize === this.cache.logSizeAtCache // 日誌未變化

      if (cacheValid) {
        return this.cache.entries
      }
    }

    // 快取無效，重新計算
    const snapshot = await this.loadSnapshot()
    const current = await this.compactor.compact(snapshot)

    // 更新快取
    this.cache = {
      entries: current,
      validUntil: now + this.cacheTtl,
      logSizeAtCache: currentLogSize,
    }

    return current
  }

  /**
   * 添加條目
   * 會立即失效快取
   */
  async add(entry: SitemapEntry): Promise<void> {
    // 立即失效快取
    this.invalidateCache()

    await this.logger.append({
      op: 'add',
      timestamp: Date.now(),
      entry,
    })
  }

  /**
   * 移除條目
   * 會立即失效快取
   */
  async remove(url: string): Promise<void> {
    // 立即失效快取
    this.invalidateCache()

    await this.logger.append({
      op: 'remove',
      timestamp: Date.now(),
      url,
    })
  }

  /**
   * 強制壓縮：合併日誌到快照並清除日誌
   */
  async compact(): Promise<void> {
    // 防止並發 compact
    if (this.isCompacting) {
      console.warn('[GravitoSeo] Compact already in progress, skipping')
      return
    }

    this.isCompacting = true
    try {
      const snapshot = await this.loadSnapshot()
      const result = await this.compactor.compactWithStats(snapshot)

      await this.snapshotManager.save(this.snapshotPath, result.entries)
      await this.logger.delete()

      // 更新快取為新的壓縮結果
      this.cache = {
        entries: result.entries,
        validUntil: Date.now() + this.cacheTtl,
        logSizeAtCache: 0, // 日誌已清空
      }

      console.log(`[GravitoSeo] Compacted ${result.entries.length} entries in ${result.stats.duration.toFixed(2)}ms`)
    } finally {
      this.isCompacting = false
    }
  }

  /**
   * 失效快取
   */
  private invalidateCache(): void {
    this.cache = null
  }

  private async loadSnapshot(): Promise<SitemapEntry[]> {
    return this.snapshotManager.load(this.snapshotPath)
  }

  private startAutoCompact() {
    if (this.compactInterval && this.compactInterval > 0 && !this.compactTimer) {
      console.log(`[GravitoSeo] Starting auto-compaction (interval: ${this.compactInterval}ms)`)
      this.compactTimer = setInterval(() => {
        this.compact().catch((err) => {
          console.error('[GravitoSeo] Auto-compaction failed:', err)
        })
      }, this.compactInterval)
    }
  }

  private stopAutoCompact() {
    if (this.compactTimer) {
      clearInterval(this.compactTimer)
      this.compactTimer = null
      console.log('[GravitoSeo] Stopped auto-compaction')
    }
  }
}
```

**配置擴展**:

```typescript
// src/types.ts
export interface SeoConfig {
  // ...
  incremental?: {
    logDir: string
    compactInterval?: number
    maxLogSize?: number
    storage?: any
    compressSnapshot?: boolean
    /** 快取 TTL（毫秒），預設 5000 */
    cacheTtl?: number
  }
}
```

**快取策略說明**:

| 場景 | 行為 |
|-----|------|
| 首次讀取 | 執行完整 compact，建立快取 |
| TTL 內再次讀取 | 返回快取 |
| TTL 過期後讀取 | 重新 compact |
| 有新的 add/remove | 立即失效快取 |
| compact 執行後 | 更新快取為新結果 |

**預期提升**:
- 讀取速度提升 50-70%（對於頻繁讀取場景）
- 減少不必要的 compact 操作
- 保證資料一致性

**測試**:

```typescript
// tests/engine/strategies/incremental-cache.test.ts
describe('IncrementalStrategy Cache', () => {
  test('should return cached entries within TTL', async () => {
    const strategy = new IncrementalStrategy({
      mode: 'incremental',
      baseUrl: 'https://example.com',
      resolvers: [],
      incremental: {
        logDir: '/tmp/test-cache',
        cacheTtl: 1000, // 1 秒
      },
    })
    await strategy.init()

    // 第一次讀取
    const start1 = performance.now()
    await strategy.getEntries()
    const time1 = performance.now() - start1

    // 第二次讀取（應該使用快取）
    const start2 = performance.now()
    await strategy.getEntries()
    const time2 = performance.now() - start2

    console.log(`First read: ${time1.toFixed(2)}ms`)
    console.log(`Second read (cached): ${time2.toFixed(2)}ms`)

    expect(time2).toBeLessThan(time1 * 0.1) // 應該快 10 倍以上
  })

  test('should invalidate cache on add', async () => {
    const strategy = new IncrementalStrategy(config)
    await strategy.init()

    await strategy.getEntries() // 建立快取
    await strategy.add({ url: '/new-page' }) // 失效快取

    // 驗證快取已失效（內部狀態）
    // 需要重新 compact
  })

  test('should invalidate cache on remove', async () => {
    const strategy = new IncrementalStrategy(config)
    await strategy.init()

    await strategy.getEntries()
    await strategy.remove('/some-page')

    // 下次讀取應該重新 compact
  })
})
```

**驗證清單**:
- [ ] TTL 快取實現
- [ ] 寫入時失效快取
- [ ] 並發 compact 保護
- [ ] 配置選項支持
- [ ] 資料一致性測試
- [ ] 性能測試

---

### 3.2 優化 DynamicStrategy 並行處理

> **依賴**: 無  
> **優先級**: 🟡 中  
> **預估時間**: 1 天

**當前問題** (`src/engine/strategies/DynamicStrategy.ts:18-36`):
```typescript
const promises = resolvers.map(async (resolver) => {
  // ...
})

const results = await Promise.all(promises) // ❌ 所有 resolver 同時執行
return results.flat()
```

**問題分析**:
- 所有 resolver 同時執行，可能導致：
  - 數據庫連接池耗盡
  - 內存峰值過高
  - 並發請求過多

**完整優化實現**:

```typescript
// src/engine/strategies/DynamicStrategy.ts
import type { SeoResolver, SitemapEntry } from '../../interfaces'
import type { SeoConfig } from '../../types'
import type { SeoStrategy } from '../interfaces'

export interface DynamicStrategyOptions {
  /** 批次大小（預設 5） */
  batchSize?: number
  /** 單個 resolver 超時時間（毫秒，預設 30000） */
  resolverTimeout?: number
  /** 重試次數（預設 2） */
  retryCount?: number
  /** 重試延遲（毫秒，預設 1000） */
  retryDelay?: number
}

export class DynamicStrategy implements SeoStrategy {
  private options: Required<DynamicStrategyOptions>

  constructor(private config: SeoConfig) {
    this.options = {
      batchSize: config.dynamic?.batchSize ?? 5,
      resolverTimeout: config.dynamic?.resolverTimeout ?? 30000,
      retryCount: config.dynamic?.retryCount ?? 2,
      retryDelay: config.dynamic?.retryDelay ?? 1000,
    }
  }

  async init(): Promise<void> {
    // No initialization needed for dynamic mode
  }

  async getEntries(): Promise<SitemapEntry[]> {
    const resolvers = this.config.resolvers as SeoResolver[]
    if (!resolvers || resolvers.length === 0) {
      return []
    }

    const { batchSize } = this.options
    const allResults: SitemapEntry[] = []
    const errors: { resolver: string; error: Error }[] = []

    // 批次執行
    for (let i = 0; i < resolvers.length; i += batchSize) {
      const batch = resolvers.slice(i, i + batchSize)
      
      const batchResults = await Promise.allSettled(
        batch.map(resolver => this.fetchResolverWithRetry(resolver))
      )

      // 處理結果
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j]
        const resolver = batch[j]!

        if (result.status === 'fulfilled') {
          allResults.push(...result.value)
        } else {
          errors.push({
            resolver: resolver.name,
            error: result.reason,
          })
        }
      }
    }

    // 報告錯誤
    if (errors.length > 0) {
      console.warn(`[GravitoSeo] ${errors.length} resolver(s) failed:`)
      for (const { resolver, error } of errors) {
        console.warn(`  - ${resolver}: ${error.message}`)
      }
    }

    return allResults
  }

  /**
   * 帶重試的 resolver 執行
   */
  private async fetchResolverWithRetry(resolver: SeoResolver): Promise<SitemapEntry[]> {
    const { retryCount, retryDelay } = this.options
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const entries = await this.fetchResolverWithTimeout(resolver)
        
        // 應用 resolver 級別的預設值
        return entries.map((entry: SitemapEntry) => ({
          ...entry,
          priority: entry.priority ?? resolver.priority,
          changefreq: entry.changefreq ?? resolver.changefreq,
        }))
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt < retryCount) {
          console.warn(
            `[GravitoSeo] Resolver '${resolver.name}' failed (attempt ${attempt + 1}/${retryCount + 1}), retrying in ${retryDelay}ms...`
          )
          await this.sleep(retryDelay * (attempt + 1)) // 指數退避
        }
      }
    }

    throw lastError ?? new Error('Unknown error')
  }

  /**
   * 帶超時的 resolver 執行
   */
  private async fetchResolverWithTimeout(resolver: SeoResolver): Promise<SitemapEntry[]> {
    const { resolverTimeout } = this.options

    return Promise.race([
      resolver.fetch(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Resolver '${resolver.name}' timed out after ${resolverTimeout}ms`))
        }, resolverTimeout)
      }),
    ])
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async add(_entry: SitemapEntry): Promise<void> {
    console.warn(
      '[GravitoSeo] DynamicStrategy does not support manual add(). Update your data source instead.'
    )
  }

  async remove(_url: string): Promise<void> {
    console.warn(
      '[GravitoSeo] DynamicStrategy does not support manual remove(). Update your data source instead.'
    )
  }
}
```

**配置擴展**:

```typescript
// src/types.ts
export interface SeoConfig {
  // ...
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
}
```

**預期提升**:
- 減少內存峰值 30-50%
- 避免數據庫連接池耗盡
- 提升穩定性
- 自動重試失敗的 resolver

**測試**:

```typescript
// tests/engine/strategies/dynamic-batch.test.ts
describe('DynamicStrategy Batch Processing', () => {
  test('should process resolvers in batches', async () => {
    let concurrentCount = 0
    let maxConcurrent = 0

    const createResolver = (name: string, delay: number): SeoResolver => ({
      name,
      fetch: async () => {
        concurrentCount++
        maxConcurrent = Math.max(maxConcurrent, concurrentCount)
        await new Promise(r => setTimeout(r, delay))
        concurrentCount--
        return [{ url: `/${name}` }]
      },
    })

    const config: SeoConfig = {
      mode: 'dynamic',
      baseUrl: 'https://example.com',
      resolvers: Array.from({ length: 10 }, (_, i) => 
        createResolver(`resolver-${i}`, 100)
      ),
      dynamic: { batchSize: 3 },
    }

    const strategy = new DynamicStrategy(config)
    await strategy.getEntries()

    expect(maxConcurrent).toBeLessThanOrEqual(3)
  })

  test('should retry failed resolvers', async () => {
    let attempts = 0

    const config: SeoConfig = {
      mode: 'dynamic',
      baseUrl: 'https://example.com',
      resolvers: [{
        name: 'flaky',
        fetch: async () => {
          attempts++
          if (attempts < 3) throw new Error('Temporary failure')
          return [{ url: '/success' }]
        },
      }],
      dynamic: { retryCount: 2, retryDelay: 10 },
    }

    const strategy = new DynamicStrategy(config)
    const entries = await strategy.getEntries()

    expect(attempts).toBe(3)
    expect(entries.length).toBe(1)
  })

  test('should timeout slow resolvers', async () => {
    const config: SeoConfig = {
      mode: 'dynamic',
      baseUrl: 'https://example.com',
      resolvers: [{
        name: 'slow',
        fetch: async () => {
          await new Promise(r => setTimeout(r, 5000))
          return []
        },
      }],
      dynamic: { resolverTimeout: 100, retryCount: 0 },
    }

    const strategy = new DynamicStrategy(config)
    const entries = await strategy.getEntries()

    expect(entries.length).toBe(0) // 失敗後返回空
  })
})
```

**驗證清單**:
- [ ] 批次處理實現
- [ ] 超時保護
- [ ] 重試機制（指數退避）
- [ ] 配置選項支持
- [ ] 錯誤報告

---

### 3.3 並發寫入保護（新增）

> **依賴**: 無  
> **優先級**: 🔴 高（穩定性）  
> **預估時間**: 0.5 天

**當前問題**: `IncrementalStrategy` 的 `add()` 和 `remove()` 沒有並發保護，多個同時寫入可能導致日誌損壞。

**實現方案**:

```typescript
// src/storage/WriteMutex.ts
export class WriteMutex {
  private locked = false
  private queue: (() => void)[] = []

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true
      return
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve)
    })
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!
      next()
    } else {
      this.locked = false
    }
  }

  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await fn()
    } finally {
      this.release()
    }
  }
}
```

**更新 IncrementalStrategy**:

```typescript
// src/engine/strategies/IncrementalStrategy.ts
import { WriteMutex } from '../../storage/WriteMutex'

export class IncrementalStrategy implements SeoStrategy {
  private writeMutex = new WriteMutex()

  async add(entry: SitemapEntry): Promise<void> {
    await this.writeMutex.withLock(async () => {
      this.invalidateCache()
      await this.logger.append({
        op: 'add',
        timestamp: Date.now(),
        entry,
      })
    })
  }

  async remove(url: string): Promise<void> {
    await this.writeMutex.withLock(async () => {
      this.invalidateCache()
      await this.logger.append({
        op: 'remove',
        timestamp: Date.now(),
        url,
      })
    })
  }

  /**
   * 批量添加（更高效）
   */
  async addMany(entries: SitemapEntry[]): Promise<void> {
    await this.writeMutex.withLock(async () => {
      this.invalidateCache()
      for (const entry of entries) {
        await this.logger.append({
          op: 'add',
          timestamp: Date.now(),
          entry,
        })
      }
    })
  }

  /**
   * 批量移除（更高效）
   */
  async removeMany(urls: string[]): Promise<void> {
    await this.writeMutex.withLock(async () => {
      this.invalidateCache()
      for (const url of urls) {
        await this.logger.append({
          op: 'remove',
          timestamp: Date.now(),
          url,
        })
      }
    })
  }
}
```

**測試**:

```typescript
// tests/engine/strategies/incremental-concurrent.test.ts
describe('IncrementalStrategy Concurrent Writes', () => {
  test('should handle concurrent adds safely', async () => {
    const strategy = new IncrementalStrategy(config)
    await strategy.init()

    // 並發添加 100 個條目
    const promises = Array.from({ length: 100 }, (_, i) =>
      strategy.add({ url: `/page-${i}` })
    )

    await Promise.all(promises)

    const entries = await strategy.getEntries()
    expect(entries.length).toBe(100)
  })

  test('should handle mixed concurrent operations', async () => {
    const strategy = new IncrementalStrategy(config)
    await strategy.init()

    // 添加一些條目
    await Promise.all([
      strategy.add({ url: '/a' }),
      strategy.add({ url: '/b' }),
      strategy.add({ url: '/c' }),
    ])

    // 並發添加和刪除
    await Promise.all([
      strategy.add({ url: '/d' }),
      strategy.remove('/a'),
      strategy.add({ url: '/e' }),
      strategy.remove('/b'),
    ])

    const entries = await strategy.getEntries()
    const urls = entries.map(e => e.url)

    expect(urls).toContain('/c')
    expect(urls).toContain('/d')
    expect(urls).toContain('/e')
    expect(urls).not.toContain('/a')
    expect(urls).not.toContain('/b')
  })
})
```

**驗證清單**:
- [ ] WriteMutex 實現
- [ ] add/remove 使用 mutex 保護
- [ ] addMany/removeMany 批量操作
- [ ] 並發測試通過

---

### 3.4 日誌輪替實現（新增）

> **依賴**: 無  
> **優先級**: 🟡 中  
> **預估時間**: 1 天

**當前問題**: `SeoConfig.incremental.maxLogSize` 已定義但未實現，日誌文件可能無限增長。

**實現方案**:

```typescript
// src/storage/JsonlLogger.ts（擴展）
export class JsonlLogger {
  private maxLogSize: number // 最大日誌大小（bytes）
  private rotationEnabled: boolean

  constructor(
    private logPath: string,
    adapter?: StorageAdapter,
    options?: { maxLogSize?: number }
  ) {
    this.adapter = adapter || new FileSystemAdapter()
    this.maxLogSize = options?.maxLogSize ?? 0 // 0 表示不限制
    this.rotationEnabled = this.maxLogSize > 0
  }

  async append(entry: LogEntry): Promise<void> {
    const line = `${JSON.stringify(entry)}\n`
    
    // 檢查是否需要輪替
    if (this.rotationEnabled) {
      const currentSize = await this.getSize()
      if (currentSize + line.length > this.maxLogSize) {
        await this.rotate()
      }
    }

    await this.adapter.append(this.logPath, line)
  }

  /**
   * 輪替日誌文件
   * 重命名當前日誌為 .1，觸發 compact
   */
  private async rotate(): Promise<void> {
    const rotatedPath = `${this.logPath}.1`
    
    // 如果已有輪替文件，刪除它
    if (await this.adapter.exists(rotatedPath)) {
      await this.adapter.delete(rotatedPath)
    }
    
    // 重命名當前日誌
    if (await this.adapter.exists(this.logPath)) {
      await this.adapter.rename(this.logPath, rotatedPath)
    }

    console.log(`[JsonlLogger] Rotated log file: ${this.logPath}`)
    
    // 觸發回調（如果有）
    if (this.onRotate) {
      await this.onRotate(rotatedPath)
    }
  }

  /** 輪替回調 */
  onRotate?: (rotatedPath: string) => Promise<void>
}
```

**更新 IncrementalStrategy**:

```typescript
// src/engine/strategies/IncrementalStrategy.ts
export class IncrementalStrategy implements SeoStrategy {
  constructor(config: SeoConfig) {
    // ...
    this.logger = new JsonlLogger(
      join(logDir, 'sitemap.ops.jsonl'),
      this.adapter,
      { maxLogSize: config.incremental?.maxLogSize }
    )

    // 當日誌輪替時，觸發 compact
    this.logger.onRotate = async (rotatedPath) => {
      console.log('[GravitoSeo] Log rotated, triggering compact...')
      await this.compact()
      // 刪除舊的輪替文件
      await this.adapter.delete(rotatedPath)
    }
  }
}
```

**配置範例**:

```typescript
const config: SeoConfig = {
  mode: 'incremental',
  baseUrl: 'https://example.com',
  resolvers: [],
  incremental: {
    logDir: './storage/seo',
    maxLogSize: 10 * 1024 * 1024, // 10MB
    compactInterval: 3600000, // 1 hour
  },
}
```

**驗證清單**:
- [ ] 日誌大小檢查
- [ ] 自動輪替實現
- [ ] 輪替後觸發 compact
- [ ] 配置選項支持
- [ ] 邊緣情況處理（並發寫入時輪替）

---

### 3.5 Resolver 重試機制（已合併到 3.2）

此項目已合併到 Phase 3.2 的 `fetchResolverWithRetry` 實現中。

---

