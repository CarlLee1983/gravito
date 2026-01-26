# Phase 2: 存儲層性能優化

> **總預估時間**: 4-6 天

[← 返回總覽](../README.md)

---


> **總預估時間**: 4-6 天

### 2.0 StorageAdapter 接口擴展（前置項目）

> **依賴**: 無  
> **優先級**: 🔴 高（Phase 2.1、2.2 的前置條件）  
> **預估時間**: 1-2 天

**當前問題**: `StorageAdapter` 接口沒有流式讀取方法，無法實現 Phase 2.1 的優化

**當前接口** (`src/storage/adapter.ts`):
```typescript
export interface StorageAdapter {
  append(path: string, content: string): Promise<void>
  write(path: string, content: string): Promise<void>
  read(path: string): Promise<string>  // ❌ 只有同步讀取
  exists(path: string): Promise<boolean>
  delete(path: string): Promise<void>
  rename(oldPath: string, newPath: string): Promise<void>
  size(path: string): Promise<number>
  ensureDir(path: string): Promise<void>
}
```

**擴展方案**:

```typescript
// src/storage/adapter.ts
import type { Readable } from 'node:stream'

export interface StorageAdapter {
  // ... 現有方法保持不變

  /**
   * 創建文件讀取流（可選方法）
   * 如果適配器不支持流式讀取，返回 undefined
   */
  createReadStream?(path: string): Readable | undefined

  /**
   * 創建文件寫入流（可選方法）
   * 如果適配器不支持流式寫入，返回 undefined
   */
  createWriteStream?(path: string): NodeJS.WritableStream | undefined

  /**
   * 讀取文件的一部分（用於增量讀取）
   * @param path 文件路徑
   * @param start 起始位置（字節）
   * @param end 結束位置（字節）
   */
  readRange?(path: string, start: number, end: number): Promise<string>

  /**
   * 獲取文件最後修改時間
   */
  lastModified?(path: string): Promise<Date | undefined>
}

/**
 * 檢查適配器是否支持流式讀取
 */
export function supportsStreaming(adapter: StorageAdapter): boolean {
  return typeof adapter.createReadStream === 'function'
}
```

**FileSystemAdapter 實現**:

```typescript
// src/storage/FileSystemAdapter.ts
import { createReadStream, createWriteStream } from 'node:fs'
import type { Readable } from 'node:stream'

export class FileSystemAdapter implements StorageAdapter {
  // ... 現有方法

  createReadStream(path: string): Readable | undefined {
    if (!existsSync(path)) {
      return undefined
    }
    return createReadStream(path, { encoding: 'utf-8' })
  }

  createWriteStream(path: string): NodeJS.WritableStream | undefined {
    return createWriteStream(path, { encoding: 'utf-8' })
  }

  async readRange(path: string, start: number, end: number): Promise<string> {
    const fd = await open(path, 'r')
    try {
      const buffer = Buffer.alloc(end - start)
      await fd.read(buffer, 0, end - start, start)
      return buffer.toString('utf-8')
    } finally {
      await fd.close()
    }
  }

  async lastModified(path: string): Promise<Date | undefined> {
    try {
      const stats = await stat(path)
      return stats.mtime
    } catch {
      return undefined
    }
  }
}
```

**S3Adapter 實現**:

```typescript
// src/storage/S3Adapter.ts
export class S3Adapter implements StorageAdapter {
  // ... 現有方法

  createReadStream(path: string): Readable | undefined {
    // S3 支持 GetObject 返回流
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    })
    
    // 注意：這需要異步處理，可能需要不同的接口設計
    // 或者返回一個 PassThrough 流並異步填充
    return undefined // 暫時不支持
  }

  async readRange(path: string, start: number, end: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
      Range: `bytes=${start}-${end - 1}`,
    })
    const response = await this.client.send(command)
    return await response.Body?.transformToString() ?? ''
  }
}
```

**向後相容性**:
- 所有新增方法都是可選的（使用 `?` 標記）
- 使用 `supportsStreaming()` 輔助函數檢查支持情況
- 不支持流式讀取的適配器會回退到原有的 `read()` 方法

**測試**:

```typescript
// tests/storage/adapter-streaming.test.ts
import { describe, test, expect } from 'bun:test'
import { FileSystemAdapter } from '../../src/storage/FileSystemAdapter'
import { supportsStreaming } from '../../src/storage/adapter'

describe('StorageAdapter Streaming', () => {
  test('FileSystemAdapter should support streaming', () => {
    const adapter = new FileSystemAdapter()
    expect(supportsStreaming(adapter)).toBe(true)
  })

  test('createReadStream should return readable stream', async () => {
    const adapter = new FileSystemAdapter()
    // 創建測試文件
    await adapter.write('/tmp/test-stream.txt', 'line1\nline2\nline3')
    
    const stream = adapter.createReadStream('/tmp/test-stream.txt')
    expect(stream).toBeDefined()
    
    const chunks: string[] = []
    for await (const chunk of stream!) {
      chunks.push(chunk)
    }
    
    expect(chunks.join('')).toBe('line1\nline2\nline3')
  })
})
```

**驗證清單**:
- [ ] `StorageAdapter` 接口擴展完成
- [ ] `FileSystemAdapter` 實現流式讀取
- [ ] `S3Adapter` 實現 `readRange`（流式可選）
- [ ] 測試覆蓋流式讀取功能
- [ ] 向後相容性驗證

---

### 2.1 優化 JsonlLogger 流式讀取

> **依賴**: Phase 2.0  
> **優先級**: 🔴 高  
> **預估時間**: 1-2 天

**當前問題** (`src/storage/JsonlLogger.ts:33-49`):
```typescript
async readAll(): Promise<LogEntry[]> {
  const content = await this.adapter.read(this.logPath) // ❌ 一次性讀取整個文件
  const lines = content.split('\n').filter(...)
  return lines.map(line => JSON.parse(line))
}
```

**問題分析**:
- 對於大型日誌文件（100MB+），一次性讀取會導致：
  - 高內存使用（文件大小 × 2-3 倍）
  - 長時間阻塞
  - 可能觸發 OOM

**優化方案: 流式讀取（支持回退）**

```typescript
// src/storage/JsonlLogger.ts
import { supportsStreaming } from './adapter'

export class JsonlLogger {
  private adapter: StorageAdapter
  private lastReadPosition: number = 0 // 用於增量讀取

  constructor(
    private logPath: string,
    adapter?: StorageAdapter
  ) {
    this.adapter = adapter || new FileSystemAdapter()
  }

  /**
   * 讀取所有日誌條目
   * 優先使用流式讀取，不支持時回退到全量讀取
   */
  async readAll(): Promise<LogEntry[]> {
    if (!(await this.adapter.exists(this.logPath))) {
      return []
    }

    // 檢查是否支持流式讀取
    if (supportsStreaming(this.adapter)) {
      return this.readAllStream()
    }

    // 回退到原有實現
    return this.readAllSync()
  }

  /**
   * 流式讀取實現
   */
  private async readAllStream(): Promise<LogEntry[]> {
    const stream = this.adapter.createReadStream!(this.logPath)
    if (!stream) {
      return this.readAllSync()
    }

    const entries: LogEntry[] = []
    let buffer = ''

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer | string) => {
        buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf-8')
        
        // 按行分割
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留不完整的最後一行

        for (const line of lines) {
          if (line.trim()) {
            try {
              entries.push(JSON.parse(line))
            } catch {
              // 跳過損壞的行，記錄警告
              console.warn(`[JsonlLogger] Skipping corrupted line: ${line.slice(0, 50)}...`)
            }
          }
        }
      })

      stream.on('end', () => {
        // 處理最後一行
        if (buffer.trim()) {
          try {
            entries.push(JSON.parse(buffer))
          } catch {
            console.warn(`[JsonlLogger] Skipping corrupted last line`)
          }
        }
        resolve(entries)
      })

      stream.on('error', (err) => {
        console.error(`[JsonlLogger] Stream error:`, err)
        reject(err)
      })
    })
  }

  /**
   * 同步讀取實現（回退方案）
   */
  private async readAllSync(): Promise<LogEntry[]> {
    const content = await this.adapter.read(this.logPath)
    const lines = content.split('\n').filter((line) => line.trim().length > 0)

    return lines
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter((x) => x !== null) as LogEntry[]
  }

  /**
   * 返回 AsyncIterable，用於真正的流式處理
   * 適用於不需要一次性載入所有條目的場景
   */
  async *readStream(): AsyncIterable<LogEntry> {
    if (!(await this.adapter.exists(this.logPath))) {
      return
    }

    if (!supportsStreaming(this.adapter)) {
      // 不支持流式時，使用全量讀取
      const entries = await this.readAllSync()
      for (const entry of entries) {
        yield entry
      }
      return
    }

    const stream = this.adapter.createReadStream!(this.logPath)
    if (!stream) {
      return
    }

    let buffer = ''

    for await (const chunk of stream) {
      buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf-8')
      
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim()) {
          try {
            yield JSON.parse(line)
          } catch {
            // Skip corrupted lines
          }
        }
      }
    }

    // 處理最後一行
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer)
      } catch {
        // Skip
      }
    }
  }

  /**
   * 只讀取指定時間戳之後的日誌（增量讀取）
   * @param sinceTimestamp 起始時間戳
   */
  async readSince(sinceTimestamp: number): Promise<LogEntry[]> {
    const entries: LogEntry[] = []
    
    for await (const entry of this.readStream()) {
      if (entry.timestamp > sinceTimestamp) {
        entries.push(entry)
      }
    }
    
    return entries
  }
}
```

**預期提升**: 
- 內存使用減少 70-90%（對於大型文件）
- 處理速度提升 20-40%（減少 GC 壓力）

**測試**:

```typescript
// tests/storage/jsonl-logger-streaming.test.ts
import { describe, test, expect } from 'bun:test'
import { JsonlLogger } from '../../src/storage/JsonlLogger'
import { join } from 'node:path'
import { rm, writeFile } from 'node:fs/promises'

describe('JsonlLogger Streaming', () => {
  const testPath = join(process.cwd(), 'test-logs.jsonl')

  afterEach(async () => {
    await rm(testPath, { force: true })
  })

  test('should read large file with streaming', async () => {
    // 生成大文件
    const lines: string[] = []
    for (let i = 0; i < 100000; i++) {
      lines.push(JSON.stringify({ op: 'add', timestamp: Date.now(), entry: { url: `/page-${i}` } }))
    }
    await writeFile(testPath, lines.join('\n'))

    const logger = new JsonlLogger(testPath)
    
    const memBefore = process.memoryUsage().heapUsed
    const entries = await logger.readAll()
    const memAfter = process.memoryUsage().heapUsed
    
    expect(entries.length).toBe(100000)
    
    // 內存使用應該合理
    const memUsedMB = (memAfter - memBefore) / 1024 / 1024
    console.log(`Memory used: ${memUsedMB.toFixed(2)} MB`)
  })

  test('should support async iteration', async () => {
    await writeFile(testPath, [
      JSON.stringify({ op: 'add', timestamp: 1, entry: { url: '/a' } }),
      JSON.stringify({ op: 'add', timestamp: 2, entry: { url: '/b' } }),
      JSON.stringify({ op: 'add', timestamp: 3, entry: { url: '/c' } }),
    ].join('\n'))

    const logger = new JsonlLogger(testPath)
    const entries: any[] = []
    
    for await (const entry of logger.readStream()) {
      entries.push(entry)
    }
    
    expect(entries.length).toBe(3)
  })
})
```

**驗證清單**:
- [ ] 流式讀取實現
- [ ] 回退機制正常工作
- [ ] `readStream()` AsyncIterable 實現
- [ ] `readSince()` 增量讀取實現
- [ ] 大文件（100MB+）測試通過
- [ ] 內存使用符合預期

---

### 2.2 優化 Compactor 內存使用

> **依賴**: Phase 2.1（需要 `readStream()` 方法）  
> **優先級**: 🔴 高  
> **預估時間**: 1-2 天

**當前問題** (`src/storage/Compactor.ts:14-34`):
```typescript
async compact(initialEntries: SitemapEntry[] = []): Promise<SitemapEntry[]> {
  const logs = await this.logger.readAll() // ❌ 一次性加載所有日誌
  const map = new Map<string, SitemapEntry>()
  // ...
  return Array.from(map.values()).sort(...) // ❌ 每次都排序
}
```

**問題分析**:
1. 一次性加載所有日誌到內存
2. 排序操作在每次 compact 時執行，O(n log n) 複雜度
3. 對於 100K+ 條目，排序可能耗時數百毫秒

**完整優化實現**:

```typescript
// src/storage/Compactor.ts
import type { SitemapEntry } from '../interfaces'
import type { JsonlLogger, LogEntry } from './JsonlLogger'

export interface CompactOptions {
  /** 是否排序結果（預設 true） */
  sort?: boolean
  /** 進度回調（用於大文件處理時顯示進度） */
  onProgress?: (processed: number, total: number) => void
}

export interface CompactResult {
  entries: SitemapEntry[]
  stats: {
    processedLogs: number
    addedCount: number
    removedCount: number
    duration: number
  }
}

export class Compactor {
  constructor(private logger: JsonlLogger) {}

  /**
   * 流式合併日誌到乾淨狀態
   * - 使用流式讀取減少內存使用
   * - 支持進度回調
   * - 可選排序
   */
  async compact(
    initialEntries: SitemapEntry[] = [],
    options: CompactOptions = {}
  ): Promise<SitemapEntry[]> {
    const { sort = true, onProgress } = options
    const startTime = performance.now()
    
    const map = new Map<string, SitemapEntry>()
    let processedLogs = 0
    let addedCount = 0
    let removedCount = 0

    // 1. 加載初始快照
    for (const entry of initialEntries) {
      map.set(entry.url, entry)
    }

    // 2. 流式讀取並重放日誌
    const logSize = await this.logger.getSize()
    const estimatedLogs = Math.ceil(logSize / 200) // 估算日誌條數（每條約 200 bytes）

    for await (const log of this.logger.readStream()) {
      processedLogs++

      if (log.op === 'add' && log.entry) {
        map.set(log.entry.url, log.entry)
        addedCount++
      } else if (log.op === 'remove' && log.url) {
        map.delete(log.url)
        removedCount++
      }

      // 進度回調（每 1000 條報告一次）
      if (onProgress && processedLogs % 1000 === 0) {
        onProgress(processedLogs, estimatedLogs)
      }
    }

    // 3. 轉換為數組
    const entries = Array.from(map.values())

    // 4. 可選排序
    if (sort && entries.length > 1) {
      entries.sort((a, b) => a.url.localeCompare(b.url))
    }

    const duration = performance.now() - startTime

    // 記錄統計（調試模式）
    if (process.env.LUMINOSITY_DEBUG) {
      console.debug(`[Compactor] Compacted in ${duration.toFixed(2)}ms`, {
        processedLogs,
        addedCount,
        removedCount,
        resultCount: entries.length,
      })
    }

    return entries
  }

  /**
   * 帶詳細結果的 compact
   */
  async compactWithStats(
    initialEntries: SitemapEntry[] = [],
    options: CompactOptions = {}
  ): Promise<CompactResult> {
    const { sort = true, onProgress } = options
    const startTime = performance.now()
    
    const map = new Map<string, SitemapEntry>()
    let processedLogs = 0
    let addedCount = 0
    let removedCount = 0

    for (const entry of initialEntries) {
      map.set(entry.url, entry)
    }

    for await (const log of this.logger.readStream()) {
      processedLogs++

      if (log.op === 'add' && log.entry) {
        map.set(log.entry.url, log.entry)
        addedCount++
      } else if (log.op === 'remove' && log.url) {
        map.delete(log.url)
        removedCount++
      }

      if (onProgress && processedLogs % 1000 === 0) {
        onProgress(processedLogs, processedLogs)
      }
    }

    const entries = Array.from(map.values())

    if (sort && entries.length > 1) {
      entries.sort((a, b) => a.url.localeCompare(b.url))
    }

    return {
      entries,
      stats: {
        processedLogs,
        addedCount,
        removedCount,
        duration: performance.now() - startTime,
      },
    }
  }

  /**
   * 修復損壞的日誌條目
   */
  async repairLogs(): Promise<number> {
    return this.logger.repairWAL()
  }
}
```

**進階優化: 增量 Compact（大型日誌場景）**

如果日誌文件 > 10MB，可以使用增量 compact：

```typescript
// 記錄最後處理位置
private lastCompactPosition: number = 0

async compactIncremental(snapshot: SitemapEntry[]): Promise<SitemapEntry[]> {
  const map = new Map<string, SitemapEntry>()
  
  // 載入現有快照
  for (const entry of snapshot) {
    map.set(entry.url, entry)
  }
  
  // 只讀取新增的日誌
  const newLogs = await this.logger.readSince(this.lastCompactPosition)
  
  for (const log of newLogs) {
    if (log.op === 'add' && log.entry) {
      map.set(log.entry.url, log.entry)
    } else if (log.op === 'remove' && log.url) {
      map.delete(log.url)
    }
    this.lastCompactPosition = Math.max(this.lastCompactPosition, log.timestamp)
  }
  
  return Array.from(map.values()).sort((a, b) => a.url.localeCompare(b.url))
}
```

**預期提升**:
- 內存使用減少 60-80%
- Compact 時間減少 30-50%（對於大型日誌）

**測試**:

```typescript
// tests/storage/compactor-streaming.test.ts
describe('Compactor Streaming', () => {
  test('should compact large log file with low memory', async () => {
    // 生成大型日誌文件
    const logPath = '/tmp/test-compact.jsonl'
    const logger = new JsonlLogger(logPath)
    
    // 寫入 100K 條目
    for (let i = 0; i < 100000; i++) {
      await logger.append({
        op: 'add',
        timestamp: Date.now(),
        entry: { url: `/page-${i}` },
      })
    }
    
    const compactor = new Compactor(logger)
    
    const memBefore = process.memoryUsage().heapUsed
    const result = await compactor.compactWithStats([])
    const memAfter = process.memoryUsage().heapUsed
    
    expect(result.entries.length).toBe(100000)
    expect(result.stats.processedLogs).toBe(100000)
    
    const memUsedMB = (memAfter - memBefore) / 1024 / 1024
    console.log(`Memory used: ${memUsedMB.toFixed(2)} MB`)
    console.log(`Duration: ${result.stats.duration.toFixed(2)}ms`)
  })

  test('should report progress', async () => {
    const progressCalls: number[] = []
    
    await compactor.compact([], {
      onProgress: (processed) => progressCalls.push(processed)
    })
    
    expect(progressCalls.length).toBeGreaterThan(0)
  })
})
```

**驗證清單**:
- [ ] 流式 compact 實現
- [ ] 進度回調功能
- [ ] `compactWithStats()` 統計功能
- [ ] 大文件測試（100K+ 條目）
- [ ] 內存使用驗證

---

### 2.3 優化快照讀寫性能

> **依賴**: 無  
> **優先級**: 🟡 中  
> **預估時間**: 1 天

**當前問題** (`src/engine/strategies/IncrementalStrategy.ts:120-134`):
```typescript
private async loadSnapshot(): Promise<SitemapEntry[]> {
  const data = await this.adapter.read(this.snapshotPath)
  return JSON.parse(data) // ❌ 同步解析大型 JSON
}

private async saveSnapshot(entries: SitemapEntry[]): Promise<void> {
  await this.adapter.write(this.snapshotPath, JSON.stringify(entries)) // ❌ 同步序列化
}
```

**問題分析**:
- `JSON.parse/stringify` 是同步操作，會阻塞事件循環
- 對於大型快照（10MB+），可能阻塞數百毫秒
- 沒有壓縮，文件大小較大

**完整優化實現**:

```typescript
// src/storage/SnapshotManager.ts
import { gzip, gunzip } from 'node:zlib'
import { promisify } from 'node:util'
import type { SitemapEntry } from '../interfaces'
import type { StorageAdapter } from './adapter'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

export interface SnapshotOptions {
  /** 是否壓縮快照（預設 true） */
  compress?: boolean
  /** 壓縮級別 1-9（預設 6） */
  compressionLevel?: number
}

export class SnapshotManager {
  private options: Required<SnapshotOptions>

  constructor(
    private adapter: StorageAdapter,
    options: SnapshotOptions = {}
  ) {
    this.options = {
      compress: options.compress ?? true,
      compressionLevel: options.compressionLevel ?? 6,
    }
  }

  /**
   * 載入快照
   */
  async load(path: string): Promise<SitemapEntry[]> {
    // 檢查壓縮版本
    const compressedPath = `${path}.gz`
    
    if (await this.adapter.exists(compressedPath)) {
      return this.loadCompressed(compressedPath)
    }
    
    if (await this.adapter.exists(path)) {
      return this.loadUncompressed(path)
    }
    
    return []
  }

  /**
   * 儲存快照
   */
  async save(path: string, entries: SitemapEntry[]): Promise<void> {
    if (this.options.compress) {
      await this.saveCompressed(`${path}.gz`, entries)
      // 刪除舊的未壓縮文件（如果存在）
      if (await this.adapter.exists(path)) {
        await this.adapter.delete(path)
      }
    } else {
      await this.saveUncompressed(path, entries)
    }
  }

  /**
   * 載入壓縮快照
   */
  private async loadCompressed(path: string): Promise<SitemapEntry[]> {
    try {
      const compressedData = await this.adapter.read(path)
      const buffer = Buffer.from(compressedData, 'base64')
      const decompressed = await gunzipAsync(buffer)
      return JSON.parse(decompressed.toString('utf-8'))
    } catch (error) {
      console.error(`[SnapshotManager] Failed to load compressed snapshot:`, error)
      return []
    }
  }

  /**
   * 載入未壓縮快照
   */
  private async loadUncompressed(path: string): Promise<SitemapEntry[]> {
    try {
      const data = await this.adapter.read(path)
      return JSON.parse(data)
    } catch (error) {
      console.error(`[SnapshotManager] Failed to load snapshot:`, error)
      return []
    }
  }

  /**
   * 儲存壓縮快照
   */
  private async saveCompressed(path: string, entries: SitemapEntry[]): Promise<void> {
    const json = JSON.stringify(entries)
    const compressed = await gzipAsync(Buffer.from(json, 'utf-8'), {
      level: this.options.compressionLevel,
    })
    await this.adapter.write(path, compressed.toString('base64'))
  }

  /**
   * 儲存未壓縮快照
   */
  private async saveUncompressed(path: string, entries: SitemapEntry[]): Promise<void> {
    await this.adapter.write(path, JSON.stringify(entries))
  }

  /**
   * 獲取快照統計
   */
  async getStats(path: string): Promise<{
    exists: boolean
    compressed: boolean
    size: number
    estimatedEntries?: number
  }> {
    const compressedPath = `${path}.gz`
    
    if (await this.adapter.exists(compressedPath)) {
      const size = await this.adapter.size(compressedPath)
      return { exists: true, compressed: true, size }
    }
    
    if (await this.adapter.exists(path)) {
      const size = await this.adapter.size(path)
      // 估算條目數（每條約 100 bytes）
      const estimatedEntries = Math.ceil(size / 100)
      return { exists: true, compressed: false, size, estimatedEntries }
    }
    
    return { exists: false, compressed: false, size: 0 }
  }
}
```

**更新 IncrementalStrategy 使用 SnapshotManager**:

```typescript
// src/engine/strategies/IncrementalStrategy.ts
import { SnapshotManager } from '../../storage/SnapshotManager'

export class IncrementalStrategy implements SeoStrategy {
  private snapshotManager: SnapshotManager

  constructor(config: SeoConfig) {
    // ...
    this.snapshotManager = new SnapshotManager(this.adapter, {
      compress: config.incremental?.compressSnapshot ?? true,
    })
  }

  private async loadSnapshot(): Promise<SitemapEntry[]> {
    return this.snapshotManager.load(this.snapshotPath)
  }

  private async saveSnapshot(entries: SitemapEntry[]): Promise<void> {
    await this.snapshotManager.save(this.snapshotPath, entries)
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
    /** 是否壓縮快照（預設 true） */
    compressSnapshot?: boolean
  }
}
```

**預期提升**:
- 文件大小減少 60-80%（壓縮）
- 讀寫速度提升 20-40%（壓縮後文件更小）
- I/O 減少

**測試**:

```typescript
// tests/storage/snapshot-manager.test.ts
describe('SnapshotManager', () => {
  test('should compress and decompress correctly', async () => {
    const entries: SitemapEntry[] = Array.from({ length: 10000 }, (_, i) => ({
      url: `/page-${i}`,
      lastmod: new Date().toISOString(),
    }))

    const manager = new SnapshotManager(new FileSystemAdapter())
    
    await manager.save('/tmp/test-snapshot.json', entries)
    const loaded = await manager.load('/tmp/test-snapshot.json')
    
    expect(loaded.length).toBe(10000)
    expect(loaded[0].url).toBe('/page-0')
  })

  test('should reduce file size significantly', async () => {
    const entries: SitemapEntry[] = Array.from({ length: 10000 }, (_, i) => ({
      url: `/page-${i}`,
      lastmod: new Date().toISOString(),
    }))

    const adapter = new FileSystemAdapter()
    
    // 未壓縮
    await adapter.write('/tmp/uncompressed.json', JSON.stringify(entries))
    const uncompressedSize = await adapter.size('/tmp/uncompressed.json')
    
    // 壓縮
    const manager = new SnapshotManager(adapter, { compress: true })
    await manager.save('/tmp/compressed.json', entries)
    const compressedSize = await adapter.size('/tmp/compressed.json.gz')
    
    const ratio = compressedSize / uncompressedSize
    console.log(`Compression ratio: ${(ratio * 100).toFixed(1)}%`)
    
    expect(ratio).toBeLessThan(0.5) // 應該小於 50%
  })
})
```

**驗證清單**:
- [ ] `SnapshotManager` 實現
- [ ] 壓縮/解壓縮正確性
- [ ] 向後相容性（能讀取舊格式）
- [ ] 壓縮率測試（> 50% 減少）
- [ ] 配置選項支持

---

