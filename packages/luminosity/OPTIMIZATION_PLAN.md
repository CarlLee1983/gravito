# @gravito/luminosity 優化執行計劃

> **版本**: 2.0.0  
> **日期**: 2026-01-17  
> **修訂**: 基於程式碼審查的完整修正版  
> **目標**: 提升 Luminosity SEO 引擎整體性能 30-50%，優化內存使用，改善大規模網站（100K+ URLs）的處理能力

---

## 執行摘要

| 優化項目 | 當前狀態 | 目標狀態 | 預期提升 |
|---------|---------|---------|---------|
| StorageAdapter 擴展 | ❌ 無流式支援 | ✅ 流式讀取接口 | 基礎設施 |
| XML 構建性能 | ⚠️ 字串拼接 | ✅ 緩衝區/流式處理 | 待測試確認 |
| XML 安全性 | ❌ 無轉義 | ✅ 完整 XML 轉義 | 安全性修復 |
| Compactor 內存 | ⚠️ 全量加載 | ✅ 流式處理 | 減少 60-80% |
| JsonlLogger 讀取 | ⚠️ 一次性讀取 | ✅ 流式讀取 | 減少 70-90% |
| IncrementalStrategy | ⚠️ 每次完整 compact | ✅ TTL 快取 + 增量 | 50-70% |
| 並發寫入保護 | ❌ 無保護 | ✅ Mutex 保護 | 穩定性 |
| 日誌輪替 | ❌ 未實現 | ✅ 自動輪替 | 穩定性 |
| SeoRenderer 索引 | ⚠️ 全量遍歷 | ✅ 增量計算 | 30-50% |
| 路由掃描快取 | ❌ 無快取 | ✅ 智能快取 | 80-95% |
| 並行處理優化 | ⚠️ 基礎並行 | ✅ 批次 + 重試 | 20-40% |

**預期整體提升**: 吞吐量提升 30-50%，內存使用減少 50-70%

---

## 重要變更說明（v2.0.0）

### 新增項目
1. **Phase 2.0**: StorageAdapter 接口擴展（流式讀取支援）- 必須先完成
2. **Phase 3.3**: 並發寫入保護
3. **Phase 3.4**: 日誌輪替實現
4. **Phase 3.5**: Resolver 重試機制

### 修正項目
1. **Phase 1.1**: XML 構建優化改為依基準測試結果決定
2. **Phase 3.1**: IncrementalStrategy 快取策略完全重新設計
3. **依賴關係**: 明確標註各 Phase 的依賴關係

### 優先級調整
- Phase 1.2（XML 轉義）提前至安全性修復
- Phase 8.2、8.3（DX 優化）提前實施
- Phase 2.0（StorageAdapter 擴展）為新的前置項目

---

## Phase 0: 基準測試與分析

> **依賴**: 無  
> **優先級**: 🔴 高（必須先完成）  
> **預估時間**: 2-3 天

### 0.1 建立性能基準

**目標**: 建立可量化的性能基準，用於驗證優化效果，並**確認真正的性能瓶頸**

**任務**:
1. 擴展現有 `bench/compactor.bench.ts` 基準測試
2. 新增 XML 構建性能基準測試
3. 新增完整流程端到端基準測試（10K, 100K, 1M URLs）
4. 建立內存使用監控腳本
5. **新增**：分析各階段耗時佔比，確認真正瓶頸

**基準指標**:
- XML 構建吞吐量（entries/sec）
- Compactor 處理時間（ms）
- 內存峰值使用（MB）
- 完整 sitemap 生成時間（ms）
- 並發請求處理能力（req/sec）
- **新增**：各階段耗時佔比（%）

**預期產出**:
- `bench/xml-builder.bench.ts` - XML 構建性能測試
- `bench/full-pipeline.bench.ts` - 端到端性能測試
- `bench/memory-profiler.ts` - 內存分析工具
- `bench/BASELINE.md` - 基準測試結果文檔

### 0.2 基準測試實現細節

**bench/xml-builder.bench.ts**:
```typescript
import { XmlStreamBuilder } from '../src/xml/XmlStreamBuilder'
import type { SitemapEntry } from '../src/interfaces'

// 生成測試數據
function generateEntries(count: number): SitemapEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    url: `/page-${i}`,
    lastmod: new Date().toISOString(),
    changefreq: 'weekly',
    priority: 0.8,
    // 部分條目包含 images/videos
    ...(i % 10 === 0 ? {
      images: [{ url: `https://example.com/img-${i}.jpg`, title: `Image ${i}` }],
    } : {}),
    ...(i % 50 === 0 ? {
      videos: [{
        thumbnail_loc: `https://example.com/thumb-${i}.jpg`,
        title: `Video ${i}`,
        description: `Description for video ${i}`,
      }],
    } : {}),
  }))
}

async function main() {
  const sizes = [1000, 10000, 100000]
  
  for (const size of sizes) {
    const entries = generateEntries(size)
    const builder = new XmlStreamBuilder({ baseUrl: 'https://example.com' })
    
    // 預熱
    builder.buildFull(entries.slice(0, 100))
    
    // 測量
    const iterations = 10
    const times: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      builder.buildFull(entries)
      times.push(performance.now() - start)
    }
    
    const avg = times.reduce((a, b) => a + b) / times.length
    const throughput = size / (avg / 1000)
    
    console.log(`[${size} entries]`)
    console.log(`  Average: ${avg.toFixed(2)}ms`)
    console.log(`  Throughput: ${throughput.toFixed(0)} entries/sec`)
    console.log(`  Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`)
    console.log()
  }
}

main()
```

**bench/full-pipeline.bench.ts**:
```typescript
import { SeoEngine } from '../src/engine/SeoEngine'
import { SeoRenderer } from '../src/engine/SeoRenderer'
import type { SeoConfig } from '../src/types'

async function benchmarkPipeline(urlCount: number) {
  console.log(`\n=== Benchmarking ${urlCount} URLs ===\n`)
  
  const timings: Record<string, number> = {}
  const memStart = process.memoryUsage().heapUsed
  
  // 1. 配置初始化
  let start = performance.now()
  const config: SeoConfig = {
    mode: 'dynamic',
    baseUrl: 'https://example.com',
    resolvers: [{
      name: 'test',
      fetch: async () => Array.from({ length: urlCount }, (_, i) => ({
        url: `/page-${i}`,
        lastmod: new Date().toISOString(),
      })),
    }],
  }
  timings['config'] = performance.now() - start
  
  // 2. Engine 初始化
  start = performance.now()
  const engine = new SeoEngine(config)
  await engine.init()
  timings['init'] = performance.now() - start
  
  // 3. 獲取 entries
  start = performance.now()
  const entries = await engine.getStrategy().getEntries()
  timings['getEntries'] = performance.now() - start
  
  // 4. 渲染 XML
  start = performance.now()
  const renderer = new SeoRenderer(config)
  const xml = renderer.render(entries, 'https://example.com/sitemap.xml')
  timings['render'] = performance.now() - start
  
  const memEnd = process.memoryUsage().heapUsed
  
  // 輸出結果
  const total = Object.values(timings).reduce((a, b) => a + b, 0)
  console.log('階段耗時:')
  for (const [stage, time] of Object.entries(timings)) {
    const percent = ((time / total) * 100).toFixed(1)
    console.log(`  ${stage}: ${time.toFixed(2)}ms (${percent}%)`)
  }
  console.log(`  總計: ${total.toFixed(2)}ms`)
  console.log(`  內存使用: ${((memEnd - memStart) / 1024 / 1024).toFixed(2)} MB`)
  console.log(`  XML 大小: ${(xml.length / 1024).toFixed(2)} KB`)
}

async function main() {
  await benchmarkPipeline(1000)
  await benchmarkPipeline(10000)
  await benchmarkPipeline(100000)
}

main()
```

**驗證清單**:
- [ ] 基準測試可重複執行
- [ ] 結果記錄於 `bench/BASELINE.md`
- [ ] 確認各階段耗時佔比
- [ ] **關鍵決策**: 根據結果決定 Phase 1.1 是否需要實施

---

## Phase 1: XML 構建器性能優化

> **依賴**: Phase 0（需要基準測試結果）  
> **優先級**: 🟡 中（依測試結果決定）  
> **預估時間**: 1-2 天

### 1.1 優化 XmlStreamBuilder 字串拼接

**⚠️ 重要說明**：現代 V8 引擎對字串 `+=` 操作已有很好的優化。此優化項目**應在 Phase 0 基準測試後決定是否實施**。

**當前程式碼** (`src/xml/XmlStreamBuilder.ts:32-128`):
```typescript
entry(item: SitemapEntry): string {
  let xml = `  <url>\n`
  xml += `    <loc>${loc}</loc>\n`
  // ... 大量字串拼接操作
  return xml
}
```

**決策條件**：
- 如果 XML 構建階段耗時佔比 < 10%，**不實施**此優化
- 如果 XML 構建階段耗時佔比 > 20%，實施優化方案

**優化方案 A: 使用模板字面量重構（推薦首選）**

比 Array.join() 更可能有效，因為模板字面量在編譯時優化：

```typescript
entry(item: SitemapEntry): string {
  const loc = item.url.startsWith('http')
    ? item.url
    : `${this.options.baseUrl}${item.url.startsWith('/') ? '' : '/'}${item.url}`

  const escapedLoc = this.escapeXml(loc)
  
  // 基礎部分
  const lastmodPart = item.lastmod 
    ? `    <lastmod>${item.lastmod instanceof Date ? item.lastmod.toISOString() : item.lastmod}</lastmod>\n`
    : ''
  
  const changefreqPart = item.changefreq
    ? `    <changefreq>${item.changefreq}</changefreq>\n`
    : ''
  
  const priorityPart = item.priority !== undefined
    ? `    <priority>${item.priority.toFixed(1)}</priority>\n`
    : ''

  // alternates
  const alternatesPart = item.alternates?.length
    ? item.alternates.map(alt => 
        `    <xhtml:link rel="alternate" hreflang="${this.escapeXml(alt.lang)}" href="${this.escapeXml(alt.url)}" />\n`
      ).join('')
    : ''

  // images
  const imagesPart = item.images?.length
    ? item.images.map(img => this.buildImageXml(img)).join('')
    : ''

  // videos
  const videosPart = item.videos?.length
    ? item.videos.map(vid => this.buildVideoXml(vid)).join('')
    : ''

  return `  <url>
    <loc>${escapedLoc}</loc>
${lastmodPart}${changefreqPart}${priorityPart}${alternatesPart}${imagesPart}${videosPart}  </url>\n`
}

private buildImageXml(img: SitemapImage): string {
  const titlePart = img.title ? `      <image:title>${this.escapeXml(img.title)}</image:title>\n` : ''
  const captionPart = img.caption ? `      <image:caption>${this.escapeXml(img.caption)}</image:caption>\n` : ''
  const licensePart = img.license ? `      <image:license>${this.escapeXml(img.license)}</image:license>\n` : ''
  const geoPart = img.geo_location ? `      <image:geo_location>${this.escapeXml(img.geo_location)}</image:geo_location>\n` : ''
  
  return `    <image:image>
      <image:loc>${this.escapeXml(img.url)}</image:loc>
${titlePart}${captionPart}${licensePart}${geoPart}    </image:image>\n`
}

private buildVideoXml(vid: SitemapVideo): string {
  // 類似實現...
}
```

**優化方案 B: 使用 Array.join()（備選）**

如果方案 A 效果不明顯，測試 Array.join()：

```typescript
entry(item: SitemapEntry): string {
  const parts: string[] = ['  <url>\n']
  
  const loc = this.buildLoc(item.url)
  parts.push(`    <loc>${this.escapeXml(loc)}</loc>\n`)
  
  if (item.lastmod) {
    const date = item.lastmod instanceof Date ? item.lastmod.toISOString() : item.lastmod
    parts.push(`    <lastmod>${date}</lastmod>\n`)
  }
  
  // ... 其他欄位
  
  parts.push('  </url>\n')
  return parts.join('')
}
```

**優化方案 C: 使用 Buffer（極端場景，1M+ URLs）**

僅在方案 A/B 都不足時考慮：

```typescript
class XmlBufferBuilder {
  private chunks: Buffer[] = []
  private totalSize = 0
  
  entry(item: SitemapEntry): void {
    const xml = this.buildEntryString(item)
    const buf = Buffer.from(xml, 'utf-8')
    this.chunks.push(buf)
    this.totalSize += buf.length
  }
  
  build(): Buffer {
    return Buffer.concat(this.chunks, this.totalSize)
  }
}
```

**實施步驟**:
1. **執行 Phase 0 基準測試**，確認 XML 構建是否為瓶頸
2. 如果需要優化，先實施方案 A（模板字面量）
3. 重新測試，比較效果
4. 如果效果不明顯，測試方案 B
5. 超大規模場景才考慮方案 C

**預期提升**: 取決於基準測試結果，可能 0-60%

---

### 1.2 添加 XML 轉義（安全性修復）

> **依賴**: 無  
> **優先級**: 🔴 高（安全性問題，應優先實施）  
> **預估時間**: 0.5 天

**當前問題**: 沒有 XML 轉義，存在 **XSS 和 XML 注入安全風險**

**必須修復的位置**:
- `src/xml/XmlStreamBuilder.ts` - `entry()` 方法中所有用戶輸入
- `src/xml/SitemapIndexBuilder.ts` - `entry()` 方法

**實現方案**:

```typescript
// src/xml/XmlStreamBuilder.ts

export class XmlStreamBuilder {
  // 靜態常量，避免每次調用創建
  private static readonly XML_ESCAPE_RE = /[&<>"']/g
  private static readonly XML_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }

  /**
   * 轉義 XML 特殊字符
   * @param str 原始字串
   * @returns 轉義後的字串
   */
  private escapeXml(str: string): string {
    if (!str) return ''
    return str.replace(
      XmlStreamBuilder.XML_ESCAPE_RE, 
      (m) => XmlStreamBuilder.XML_ESCAPE_MAP[m]!
    )
  }

  /**
   * 轉義 URL（額外處理 URL 編碼）
   * @param url 原始 URL
   * @returns 安全的 URL
   */
  private escapeUrl(url: string): string {
    if (!url) return ''
    try {
      // 先解碼再編碼，確保一致性
      const decoded = decodeURIComponent(url)
      // URL 編碼後再 XML 轉義
      return this.escapeXml(encodeURI(decoded))
    } catch {
      // 如果解碼失敗，直接轉義
      return this.escapeXml(url)
    }
  }

  entry(item: SitemapEntry): string {
    // ✅ 所有用戶輸入都需要轉義
    const loc = item.url.startsWith('http')
      ? item.url
      : `${this.options.baseUrl}${item.url.startsWith('/') ? '' : '/'}${item.url}`

    let xml = `  <url>\n`
    xml += `    <loc>${this.escapeUrl(loc)}</loc>\n`

    if (item.lastmod) {
      const date = item.lastmod instanceof Date ? item.lastmod.toISOString() : item.lastmod
      xml += `    <lastmod>${this.escapeXml(date)}</lastmod>\n`
    }

    // ... 其他欄位同樣需要轉義

    // alternates
    if (item.alternates && item.alternates.length > 0) {
      for (const alt of item.alternates) {
        xml += `    <xhtml:link rel="alternate" hreflang="${this.escapeXml(alt.lang)}" href="${this.escapeUrl(alt.url)}" />\n`
      }
    }

    // Images - 標題、描述等都需要轉義
    if (item.images && item.images.length > 0) {
      for (const img of item.images) {
        xml += `    <image:image>\n`
        xml += `      <image:loc>${this.escapeUrl(img.url)}</image:loc>\n`
        if (img.title) {
          xml += `      <image:title>${this.escapeXml(img.title)}</image:title>\n`
        }
        if (img.caption) {
          xml += `      <image:caption>${this.escapeXml(img.caption)}</image:caption>\n`
        }
        // ... 其他欄位
        xml += `    </image:image>\n`
      }
    }

    // Videos - 同樣需要轉義
    if (item.videos && item.videos.length > 0) {
      for (const vid of item.videos) {
        xml += `    <video:video>\n`
        xml += `      <video:thumbnail_loc>${this.escapeUrl(vid.thumbnail_loc)}</video:thumbnail_loc>\n`
        xml += `      <video:title>${this.escapeXml(vid.title)}</video:title>\n`
        xml += `      <video:description>${this.escapeXml(vid.description)}</video:description>\n`
        // ... 其他欄位
        xml += `    </video:video>\n`
      }
    }

    xml += `  </url>\n`
    return xml
  }
}
```

**測試案例**:

```typescript
// tests/xml/escape.test.ts
import { describe, test, expect } from 'bun:test'
import { XmlStreamBuilder } from '../../src/xml/XmlStreamBuilder'

describe('XML Escape', () => {
  const builder = new XmlStreamBuilder({ baseUrl: 'https://example.com' })

  test('should escape special characters in URL', () => {
    const entry = { url: '/search?q=test&foo=bar' }
    const xml = builder.entry(entry)
    expect(xml).toContain('&amp;')
    expect(xml).not.toContain('?q=test&foo')
  })

  test('should escape XSS in title', () => {
    const entry = {
      url: '/page',
      images: [{ url: 'https://img.com/a.jpg', title: '<script>alert("xss")</script>' }]
    }
    const xml = builder.entry(entry)
    expect(xml).toContain('&lt;script&gt;')
    expect(xml).not.toContain('<script>')
  })

  test('should handle quotes in content', () => {
    const entry = {
      url: '/page',
      videos: [{
        thumbnail_loc: 'https://img.com/thumb.jpg',
        title: 'Test "video" title',
        description: "It's a test"
      }]
    }
    const xml = builder.entry(entry)
    expect(xml).toContain('&quot;video&quot;')
    expect(xml).toContain('&apos;s')
  })
})
```

**驗證清單**:
- [ ] `XmlStreamBuilder.entry()` 所有用戶輸入已轉義
- [ ] `SitemapIndexBuilder.entry()` 所有用戶輸入已轉義
- [ ] 測試覆蓋 XSS、SQL 注入等攻擊向量
- [ ] 性能測試確認轉義開銷可接受（< 5%）

---

## Phase 2: 存儲層性能優化

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

## Phase 3: 引擎策略優化

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

## Phase 4: 渲染器優化

> **總預估時間**: 1-2 天

### 4.1 優化 SeoRenderer 索引生成

> **依賴**: 無  
> **優先級**: 🟡 中  
> **預估時間**: 1 天

**當前問題** (`src/engine/SeoRenderer.ts:55-104`):
```typescript
private renderIndex(currentUrl: string, totalPages: number, allEntries: SitemapEntry[]): string {
  // ...
  for (let i = 1; i <= totalPages; i++) {
    // 為每個分頁查找最新的 lastmod
    let lastMod: Date | string | undefined
    for (let j = start; j < Math.min(end, allEntries.length); j++) {
      const entry = allEntries[j]!
      // ... 遍歷查找最大 lastmod
    }
  }
}
```

**問題分析**:
- 雖然實際複雜度是 O(n)（每個條目只遍歷一次），但代碼結構不夠清晰
- 可以使用單次遍歷 + 預計算來優化

**完整優化實現**:

```typescript
// src/engine/SeoRenderer.ts
import type { SitemapEntry } from '../interfaces'
import type { SeoConfig } from '../types'
import { SitemapIndexBuilder } from '../xml/SitemapIndexBuilder'
import { XmlStreamBuilder } from '../xml/XmlStreamBuilder'

export class SeoRenderer {
  private static MAX_ENTRIES = 50000

  constructor(private config: SeoConfig) {}

  render(entries: SitemapEntry[], url: string, page?: number): string {
    const maxEntries = this.config.output?.maxEntriesPerSitemap || SeoRenderer.MAX_ENTRIES

    // Case 1: Small sitemap
    if (entries.length <= maxEntries) {
      return this.renderSitemap(entries)
    }

    const totalPages = Math.ceil(entries.length / maxEntries)

    // Case 2: Specific page requested
    if (page && page > 0) {
      if (page > totalPages) {
        return this.renderSitemap([])
      }
      const start = (page - 1) * maxEntries
      const end = start + maxEntries
      return this.renderSitemap(entries.slice(start, end))
    }

    // Case 3: Render index
    return this.renderIndex(url, totalPages, entries, maxEntries)
  }

  private renderSitemap(entries: SitemapEntry[]): string {
    const builder = new XmlStreamBuilder({
      baseUrl: this.config.baseUrl,
      branding: this.config.branding?.enabled,
    })
    return builder.buildFull(entries)
  }

  /**
   * 優化的索引渲染
   * 使用單次遍歷預計算每個分頁的最新 lastmod
   */
  private renderIndex(
    currentUrl: string,
    totalPages: number,
    allEntries: SitemapEntry[],
    maxEntries: number
  ): string {
    const builder = new SitemapIndexBuilder({
      branding: this.config.branding?.enabled,
    })

    // 單次遍歷預計算每頁的 lastmod
    const pageLastMods = this.computePageLastMods(allEntries, maxEntries, totalPages)

    // 構建索引條目
    const indexEntries = []
    const separator = currentUrl.includes('?') ? '&' : '?'

    for (let i = 0; i < totalPages; i++) {
      indexEntries.push({
        url: `${currentUrl}${separator}page=${i + 1}`,
        lastmod: pageLastMods[i],
      })
    }

    return builder.buildFull(indexEntries)
  }

  /**
   * 單次遍歷計算每頁的最新 lastmod
   */
  private computePageLastMods(
    entries: SitemapEntry[],
    maxEntries: number,
    totalPages: number
  ): (Date | string | undefined)[] {
    const pageLastMods: (Date | string | undefined)[] = new Array(totalPages).fill(undefined)
    const pageLastModDates: (Date | undefined)[] = new Array(totalPages).fill(undefined)

    // 單次遍歷
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!
      if (!entry.lastmod) continue

      const pageIndex = Math.floor(i / maxEntries)
      const entryDate = entry.lastmod instanceof Date 
        ? entry.lastmod 
        : new Date(entry.lastmod)

      // 更新該頁的最新日期
      if (!pageLastModDates[pageIndex] || entryDate > pageLastModDates[pageIndex]!) {
        pageLastModDates[pageIndex] = entryDate
        pageLastMods[pageIndex] = entry.lastmod
      }
    }

    return pageLastMods
  }

  /**
   * 獲取渲染統計（用於調試）
   */
  getStats(entries: SitemapEntry[]): {
    totalEntries: number
    totalPages: number
    needsIndex: boolean
    estimatedSize: number
  } {
    const maxEntries = this.config.output?.maxEntriesPerSitemap || SeoRenderer.MAX_ENTRIES
    const totalPages = Math.ceil(entries.length / maxEntries)
    const needsIndex = entries.length > maxEntries
    
    // 估算 XML 大小（每條目約 200 bytes）
    const estimatedSize = entries.length * 200

    return {
      totalEntries: entries.length,
      totalPages,
      needsIndex,
      estimatedSize,
    }
  }
}
```

**預期提升**:
- 代碼更清晰，維護性更好
- 對於大型 sitemap（100K+ 條目），性能略有提升

**測試**:

```typescript
// tests/engine/renderer-performance.test.ts
describe('SeoRenderer Performance', () => {
  test('should render large sitemap index efficiently', () => {
    const entries: SitemapEntry[] = Array.from({ length: 100000 }, (_, i) => ({
      url: `/page-${i}`,
      lastmod: new Date(Date.now() - i * 1000).toISOString(),
    }))

    const renderer = new SeoRenderer({
      mode: 'dynamic',
      baseUrl: 'https://example.com',
      resolvers: [],
    })

    const start = performance.now()
    const xml = renderer.render(entries, 'https://example.com/sitemap.xml')
    const duration = performance.now() - start

    console.log(`Rendered 100K entries index in ${duration.toFixed(2)}ms`)
    console.log(`XML size: ${(xml.length / 1024).toFixed(2)} KB`)

    expect(xml).toContain('sitemapindex')
    expect(duration).toBeLessThan(1000) // 應該在 1 秒內完成
  })
})
```

**驗證清單**:
- [ ] 單次遍歷優化
- [ ] `computePageLastMods` 實現
- [ ] `getStats` 調試方法
- [ ] 性能測試

---

## Phase 5: 路由掃描優化

> **總預估時間**: 2-3 天

### 5.1 添加路由掃描結果快取

> **依賴**: 無  
> **優先級**: 🟡 中  
> **預估時間**: 1-2 天

**當前問題** (`src/scanner/SitemapBuilder.ts:61-98`):
```typescript
async build(hostname?: string): Promise<SitemapEntry[]> {
  const routes = await this.scanner.scan() // ❌ 每次都重新掃描
  // ...
}
```

**問題分析**:
- 路由掃描可能涉及文件系統操作
- 對於大型項目，掃描可能耗時數百毫秒
- 路由結構在運行時通常不會改變

**完整優化實現**:

```typescript
// src/scanner/SitemapBuilder.ts
export interface SitemapBuilderCacheOptions {
  /** 快取 TTL（毫秒），預設 60000 */
  cacheTtl?: number
  /** 是否啟用快取（預設 true） */
  enableCache?: boolean
}

interface RouteCache {
  routes: ScannedRoute[]
  timestamp: number
}

export class SitemapBuilder {
  private routeCache: RouteCache | null = null
  private cacheOptions: Required<SitemapBuilderCacheOptions>

  constructor(
    options: SitemapBuilderOptions,
    cacheOptions: SitemapBuilderCacheOptions = {}
  ) {
    // ...
    this.cacheOptions = {
      cacheTtl: cacheOptions.cacheTtl ?? 60000,
      enableCache: cacheOptions.enableCache ?? true,
    }
  }

  async build(hostname?: string): Promise<SitemapEntry[]> {
    const routes = await this.getRoutes()
    // ... 分類和處理路由
  }

  private async getRoutes(): Promise<ScannedRoute[]> {
    const now = Date.now()

    // 檢查快取
    if (
      this.cacheOptions.enableCache &&
      this.routeCache &&
      now - this.routeCache.timestamp < this.cacheOptions.cacheTtl
    ) {
      return this.routeCache.routes
    }

    // 重新掃描
    const routes = await this.scanner.scan()

    if (this.cacheOptions.enableCache) {
      this.routeCache = { routes, timestamp: now }
    }

    return routes
  }

  invalidateCache(): void {
    this.routeCache = null
  }
}
```

**開發模式文件監聽（可選）**:

```typescript
// src/scanner/RouteWatcher.ts
import { watch } from 'chokidar'

export class RouteWatcher {
  private watcher: ReturnType<typeof watch> | null = null

  constructor(
    private builder: SitemapBuilder,
    private watchPaths: string[]
  ) {}

  start(): void {
    this.watcher = watch(this.watchPaths, { ignoreInitial: true })
    this.watcher.on('all', () => this.builder.invalidateCache())
  }

  stop(): void {
    this.watcher?.close()
  }
}
```

**預期提升**:
- 路由掃描時間減少 80-95%（快取命中時）
- 整體構建速度提升 20-40%

**驗證清單**:
- [ ] 路由快取實現
- [ ] TTL 過期處理
- [ ] `invalidateCache()` 方法
- [ ] 開發模式支持（可選）

---

### 5.2 優化動態路由解析器執行

> **依賴**: 無  
> **優先級**: 🟢 低  
> **預估時間**: 0.5 天

**已在 5.1 中整合**：動態路由已改為並行處理。

如需進一步優化，可添加批次處理：

```typescript
// 如果動態路由很多，使用批次處理
if (dynamicRoutes.length > 10) {
  const batchSize = 5
  for (let i = 0; i < dynamicRoutes.length; i += batchSize) {
    const batch = dynamicRoutes.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(route => this.processRoute(route, baseUrl))
    )
    entries.push(...batchResults.flat())
  }
}
```

---

## Phase 6: 內存優化（低優先級）

> **總預估時間**: 1-2 天（可選）  
> **優先級**: 🟢 低

### 6.1 優化大對象處理

**當前問題**:
- `SitemapEntry` 可能包含大量 images/videos 數據
- 在內存中保持大量條目可能導致高內存使用

**優化方案**（僅在需要時實施）:

**方案 A: 流式 XML 生成**
```typescript
// 用於 1M+ URLs 的場景
async *generateXmlStream(entries: AsyncIterable<SitemapEntry>): AsyncIterable<string> {
  yield this.xmlBuilder.start()
  
  for await (const entry of entries) {
    yield this.xmlBuilder.entry(entry)
  }
  
  yield this.xmlBuilder.end()
}
```

**方案 B: 分批處理**
```typescript
async generateLargeSitemap(
  entriesGenerator: () => AsyncIterable<SitemapEntry>,
  outputPath: string
): Promise<void> {
  const writeStream = createWriteStream(outputPath)
  
  writeStream.write(this.xmlBuilder.start())
  
  for await (const entry of entriesGenerator()) {
    writeStream.write(this.xmlBuilder.entry(entry))
  }
  
  writeStream.write(this.xmlBuilder.end())
  writeStream.end()
}
```

**實施條件**: 僅在處理 1M+ URLs 且出現 OOM 問題時實施

---

### 6.2 優化 Map/Set 使用

**當前狀態**: JavaScript 的 Map/Set 已經足夠高效，無需特別優化。

**備註**: 如果未來發現性能問題，可考慮：
- 使用 `Map.prototype.clear()` 而不是重新創建
- 批量操作時預估大小

---

## Phase 7: 構建與打包優化（低優先級）

> **總預估時間**: 0.5-1 天（可選）  
> **優先級**: 🟢 低

### 7.1 優化構建配置

**當前狀態**: 使用 Bun 構建，已經足夠高效

**可選優化**:
1. 檢查 `build.ts` 配置，確保 minification 啟用
2. 確認 tree-shaking 正常工作
3. 考慮 sourcemap 設定

**實施條件**: 僅在構建時間成為瓶頸時考慮

---

## 實施優先級總結（更新版）

| 順序 | Phase | 內容 | 優先級 | 預估時間 | 依賴 |
|-----|-------|------|--------|---------|------|
| 1 | Phase 0 | 基準測試 | 🔴 高 | 2-3 天 | 無 |
| 2 | Phase 1.2 | XML 轉義（安全性） | 🔴 高 | 0.5 天 | 無 |
| 3 | Phase 8.2 | 配置驗證 | 🔴 高 | 1 天 | 無 |
| 4 | Phase 8.3 | CLI 工具 | 🔴 高 | 1-2 天 | 無 |
| 5 | Phase 2.0 | StorageAdapter 擴展 | 🔴 高 | 1-2 天 | 無 |
| 6 | Phase 2.1 | JsonlLogger 流式讀取 | 🔴 高 | 1-2 天 | 2.0 |
| 7 | Phase 2.2 | Compactor 優化 | 🔴 高 | 1-2 天 | 2.1 |
| 8 | Phase 3.1 | IncrementalStrategy 快取 | 🔴 高 | 2-3 天 | 2.1, 2.2 |
| 9 | Phase 3.3 | 並發寫入保護 | 🔴 高 | 0.5 天 | 無 |
| 10 | Phase 1.1 | XML 構建優化（依測試結果） | 🟡 中 | 1-2 天 | 0 |
| 11 | Phase 2.3 | 快照壓縮 | 🟡 中 | 1 天 | 無 |
| 12 | Phase 3.2 | DynamicStrategy 批次 + 重試 | 🟡 中 | 1 天 | 無 |
| 13 | Phase 3.4 | 日誌輪替 | 🟡 中 | 1 天 | 無 |
| 14 | Phase 4.1 | SeoRenderer 優化 | 🟡 中 | 1 天 | 無 |
| 15 | Phase 5.1 | 路由掃描快取 | 🟡 中 | 1-2 天 | 無 |
| 16 | Phase 8.4 | 開發模式 | 🟡 中 | 1 天 | 無 |
| 17 | Phase 8.5 | 錯誤處理 | 🟡 中 | 1 天 | 無 |
| 18 | Phase 8.1 | 類型安全 | 🟡 中 | 1 天 | 無 |
| 19 | Phase 8.7 | 文檔改善 | 🟡 中 | 1-2 天 | 無 |
| 20 | Phase 5.2, 6, 7, 8.6 | 其他優化 | 🟢 低 | 2-3 天 | 無 |

---

## 依賴關係圖

```
Phase 0 (基準測試)
    │
    ├─── Phase 1.1 (XML 優化) ← 依測試結果決定是否實施
    │
    └─── Phase 2.0 (StorageAdapter 擴展)
              │
              └─── Phase 2.1 (JsonlLogger 流式)
                        │
                        └─── Phase 2.2 (Compactor 優化)
                                  │
                                  └─── Phase 3.1 (IncrementalStrategy)

獨立項目（可並行）:
├── Phase 1.2 (XML 轉義) - 安全性，優先
├── Phase 3.3 (並發寫入保護)
├── Phase 3.4 (日誌輪替)
├── Phase 8.2 (配置驗證)
├── Phase 8.3 (CLI 工具)
└── Phase 8.x (其他 DX 優化)
```

---

## 風險評估（更新版）

### 高風險項目
| 項目 | 風險 | 緩解措施 |
|-----|------|---------|
| Phase 2.0-2.2 | 修改核心存儲邏輯 | 保留舊實現作為 fallback、完整測試 |
| Phase 3.1 | 快取一致性問題 | TTL + 寫入失效、可配置禁用 |
| Phase 3.3 | 可能影響寫入性能 | 基準測試驗證、可選啟用 |

### 中風險項目
| 項目 | 風險 | 緩解措施 |
|-----|------|---------|
| Phase 1.1 | 可能無明顯效果 | 先基準測試確認瓶頸 |
| Phase 3.4 | 輪替時機可能影響性能 | 可配置觸發條件 |

### 低風險項目
- Phase 1.2, 4, 5, 8: 主要是功能增強，不改變核心邏輯

---

## 測試策略（更新版）

### 必須測試
1. **功能測試**: 每個 Phase 的功能正確性
2. **回歸測試**: 確保現有測試全部通過
3. **性能測試**: 使用 Phase 0 基準驗證提升效果
4. **並發測試**: Phase 3.3 需要特別的並發測試

### 測試矩陣

| Phase | 單元測試 | 整合測試 | 性能測試 | 並發測試 |
|-------|---------|---------|---------|---------|
| 2.0-2.2 | ✅ | ✅ | ✅ | - |
| 3.1 | ✅ | ✅ | ✅ | ✅ |
| 3.3 | ✅ | - | - | ✅ |
| 8.2-8.3 | ✅ | ✅ | - | - |
| 其他 | ✅ | - | 可選 | - |

---

## 向後相容性

### 必須保持
- 所有公開 API 保持不變
- 配置文件格式保持兼容
- 數據文件格式保持兼容（或提供遷移工具）

### 新增配置（向後兼容）

```typescript
// 所有新增配置都有預設值，舊配置可正常工作
export interface SeoConfig {
  incremental?: {
    // 現有選項...
    cacheTtl?: number           // 新增，預設 5000
    compressSnapshot?: boolean  // 新增，預設 true
  }
  dynamic?: {                   // 新增區塊
    batchSize?: number          // 預設 5
    resolverTimeout?: number    // 預設 30000
    retryCount?: number         // 預設 2
    retryDelay?: number         // 預設 1000
  }
}
```

---

## 驗證清單

完成每個 Phase 後，驗證以下項目：

- [ ] 所有現有測試通過
- [ ] 新增功能測試通過
- [ ] 性能基準測試顯示預期提升（如適用）
- [ ] 內存使用符合預期（如適用）
- [ ] 文檔已更新
- [ ] 向後相容性驗證通過
- [ ] 代碼審查完成

---

## 預期時間表（更新版）

| 階段 | 包含 Phase | 預估時間 | 累計時間 |
|-----|-----------|---------|---------|
| 階段 1: 基礎設施 | 0, 1.2, 8.2, 8.3 | 4-6 天 | 4-6 天 |
| 階段 2: 存儲優化 | 2.0, 2.1, 2.2 | 4-6 天 | 8-12 天 |
| 階段 3: 策略優化 | 3.1, 3.3, 3.4 | 3-5 天 | 11-17 天 |
| 階段 4: 性能微調 | 1.1, 2.3, 3.2, 4.1 | 3-5 天 | 14-22 天 |
| 階段 5: DX 完善 | 5.1, 8.1, 8.4, 8.5, 8.7 | 4-6 天 | 18-28 天 |
| 階段 6: 收尾測試 | 測試、文檔、發布 | 3-5 天 | 21-33 天 |

**總預估時間**: 21-33 個工作日（約 5-7 週）

> **注意**: 此時間表比原計劃增加約 50%，主要因為：
> 1. 新增 Phase 2.0 (StorageAdapter 擴展)
> 2. 新增 Phase 3.3, 3.4 (並發保護、日誌輪替)
> 3. 更充分的測試時間
> 4. 考慮到邊緣情況處理

---

## Phase 8: 開發者體驗（DX）優化

### 8.1 改善類型安全與 IDE 支持

**當前問題** (`src/types.ts:13`):
```typescript
resolvers: unknown[] // Changed to avoid circular dependency
```

**問題分析**:
- `resolvers` 使用 `unknown[]`，失去類型安全
- IDE 無法提供自動完成
- 編譯時無法發現配置錯誤

**優化方案 A: 使用泛型與條件類型**
```typescript
export interface SeoConfig {
  mode: SeoMode
  baseUrl: string
  resolvers: SeoResolver[] // ✅ 恢復類型定義
  // ...
}

// 在需要的地方使用類型斷言，但保持類型安全
```

**優化方案 B: 配置範例類型**
```typescript
/**
 * 配置範例類型，提供更好的 IDE 提示
 * @example
 * ```typescript
 * const config: SeoConfig = {
 *   mode: 'incremental',
 *   baseUrl: 'https://example.com',
 *   resolvers: [
 *     {
 *       name: 'posts',
 *       fetch: async () => { /* ... */ }
 *     }
 *   ]
 * }
 * ```
 */
export interface SeoConfig {
  // ...
}
```

**優化方案 C: 配置構建器模式**
```typescript
export class SeoConfigBuilder {
  private config: Partial<SeoConfig> = {}

  mode(mode: SeoMode): this {
    this.config.mode = mode
    return this
  }

  baseUrl(url: string): this {
    this.config.baseUrl = url
    return this
  }

  resolver(resolver: SeoResolver): this {
    if (!this.config.resolvers) {
      this.config.resolvers = []
    }
    this.config.resolvers.push(resolver)
    return this
  }

  build(): SeoConfig {
    // 驗證並返回
    return this.config as SeoConfig
  }
}
```

**實施步驟**:
1. 先實施方案 A（恢復類型定義）
2. 添加完整的 JSDoc 註解（方案 B）
3. 如果用戶反饋需要，考慮方案 C（構建器模式）

**預期提升**:
- IDE 自動完成準確度 100%
- 編譯時錯誤發現率提升 80%
- 開發效率提升 30-50%

**優先級**: 🔴 高

---

### 8.2 改善配置驗證與錯誤訊息

**當前問題** (`src/config/ConfigLoader.ts:54-75`):
```typescript
private validate(config: unknown): void {
  if (mode !== 'dynamic' && mode !== 'cached' && mode !== 'incremental') {
    throw new Error('Config missing "mode"') // ❌ 錯誤訊息不夠詳細
  }
  // ...
}
```

**問題分析**:
- 錯誤訊息太簡單，缺少上下文
- 沒有提供修復建議
- 沒有指出具體的配置路徑

**優化方案: 詳細錯誤訊息 + 修復建議**
```typescript
private validate(config: unknown): void {
  const errors: string[] = []
  const suggestions: string[] = []

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object')
    suggestions.push('Ensure your config file exports a default object')
    throw new ValidationError(errors, suggestions)
  }

  const raw = config as Record<string, unknown>

  // 檢查 mode
  const mode = raw.mode
  if (!mode) {
    errors.push('Missing required field: "mode"')
    suggestions.push('Add mode: "dynamic" | "cached" | "incremental"')
  } else if (mode !== 'dynamic' && mode !== 'cached' && mode !== 'incremental') {
    errors.push(`Invalid mode: "${mode}"`)
    suggestions.push('Use one of: "dynamic", "cached", "incremental"')
  }

  // 檢查 baseUrl
  const baseUrl = raw.baseUrl
  if (!baseUrl) {
    errors.push('Missing required field: "baseUrl"')
    suggestions.push('Add baseUrl: "https://example.com" (no trailing slash)')
  } else if (typeof baseUrl !== 'string') {
    errors.push(`baseUrl must be a string, got: ${typeof baseUrl}`)
  } else if (!baseUrl.match(/^https?:\/\//)) {
    errors.push(`baseUrl must start with http:// or https://`)
    suggestions.push(`Use: "https://${baseUrl}"`)
  }

  // 檢查 resolvers
  const resolvers = raw.resolvers
  if (!resolvers) {
    errors.push('Missing required field: "resolvers"')
    suggestions.push('Add resolvers: [{ name: "...", fetch: async () => [...] }]')
  } else if (!Array.isArray(resolvers)) {
    errors.push(`resolvers must be an array, got: ${typeof resolvers}`)
  } else if (resolvers.length === 0) {
    errors.push('resolvers array is empty')
    suggestions.push('Add at least one resolver to generate sitemap entries')
  }

  if (errors.length > 0) {
    throw new ValidationError(errors, suggestions, raw)
  }
}

class ValidationError extends Error {
  constructor(
    public errors: string[],
    public suggestions: string[],
    public config?: Record<string, unknown>
  ) {
    const message = [
      '❌ Configuration Validation Failed',
      '',
      'Errors:',
      ...errors.map(e => `  • ${e}`),
      '',
      'Suggestions:',
      ...suggestions.map(s => `  💡 ${s}`),
      '',
      'Example configuration:',
      '```typescript',
      'export default {',
      '  mode: "incremental",',
      '  baseUrl: "https://example.com",',
      '  resolvers: [',
      '    { name: "posts", fetch: async () => [...] }',
      '  ]',
      '}',
      '```',
    ].join('\n')
    super(message)
    this.name = 'ValidationError'
  }
}
```

**進一步優化: 配置檢查工具**
```typescript
// CLI 命令: lux validate
async function validateConfig() {
  const loader = new ConfigLoader()
  try {
    const config = await loader.load()
    console.log('✅ Configuration is valid!')
    console.log(`   Mode: ${config.mode}`)
    console.log(`   Base URL: ${config.baseUrl}`)
    console.log(`   Resolvers: ${config.resolvers.length}`)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error(error.message)
      process.exit(1)
    }
    throw error
  }
}
```

**預期提升**:
- 配置錯誤解決時間減少 60-80%
- 新手上手時間減少 40-60%
- 錯誤訊息清晰度提升 90%

**優先級**: 🔴 高

---

### 8.3 完善 CLI 工具功能

**當前問題** (`src/cli.ts:16-23`):
```typescript
case 'warm':
  console.log('🔥 Warming cache... (Not implemented yet)') // ❌ 未實現
  break
case 'generate':
  console.log('⚙️  Generating sitemap... (Not implemented yet)') // ❌ 未實現
  break
case 'init':
  console.log('📝 Creating luminosity.config.ts... (Not implemented yet)') // ❌ 未實現
  break
```

**優化方案 A: 實現 init 命令**
```typescript
async function initConfig() {
  const configPath = 'gravito.seo.config.ts'
  if (existsSync(configPath)) {
    console.error(`❌ ${configPath} already exists`)
    process.exit(1)
  }

  const template = `import type { SeoConfig } from '@gravito/luminosity'

const config: SeoConfig = {
  mode: 'incremental',
  baseUrl: 'https://example.com',
  resolvers: [
    {
      name: 'pages',
      fetch: async () => {
        // TODO: Implement your resolver
        return []
      },
    },
  ],
  incremental: {
    logDir: './storage/seo',
    compactInterval: 3600000, // 1 hour
  },
}

export default config
`

  writeFileSync(configPath, template)
  console.log(`✅ Created ${configPath}`)
  console.log('📝 Edit the file to configure your resolvers')
}
```

**優化方案 B: 實現 generate 命令**
```typescript
async function generateSitemap() {
  const loader = new ConfigLoader()
  const config = await loader.load()

  const engine = new SeoEngine(config)
  await engine.init()

  const entries = await engine.getStrategy().getEntries()
  const luminosity = new Luminosity({
    path: config.output?.path || './public',
    hostname: config.baseUrl,
    gzip: config.gzip,
  })

  await luminosity.generate(entries)
  console.log(`✅ Generated sitemap with ${entries.length} URLs`)
}
```

**優化方案 C: 實現 warm 命令**
```typescript
async function warmCache() {
  const loader = new ConfigLoader()
  const config = await loader.load()

  if (config.mode !== 'cached') {
    console.warn('⚠️  Cache warming only works in "cached" mode')
    process.exit(1)
  }

  const engine = new SeoEngine(config)
  await engine.init()

  console.log('🔥 Warming cache...')
  const entries = await engine.getStrategy().getEntries()
  console.log(`✅ Cache warmed with ${entries.length} entries`)
}
```

**優化方案 D: 添加調試模式**
```typescript
// lux --debug generate
// lux --verbose inspect <url>

const DEBUG = process.env.DEBUG === '1' || args.includes('--debug')
const VERBOSE = args.includes('--verbose')

if (DEBUG) {
  // 啟用詳細日誌
  process.env.LUMINOSITY_DEBUG = '1'
}
```

**實施步驟**:
1. 實施方案 A（init）- 最高優先級
2. 實施方案 B（generate）
3. 實施方案 C（warm）
4. 實施方案 D（調試模式）

**預期提升**:
- 新手上手時間減少 50-70%
- CLI 工具實用性提升 80%
- 開發效率提升 30-40%

**優先級**: 🔴 高

---

### 8.4 添加開發模式與調試工具

**當前問題**:
- 缺少開發模式（更詳細的日誌）
- 缺少性能分析工具
- 缺少配置調試工具

**優化方案 A: 開發模式**
```typescript
export interface SeoConfig {
  // ...
  /** Development mode - enables verbose logging and debugging */
  dev?: {
    enabled?: boolean
    verbose?: boolean
    logLevel?: 'debug' | 'info' | 'warn' | 'error'
    performance?: boolean // 記錄性能指標
  }
}

// 在 SeoEngine 中使用
if (config.dev?.enabled) {
  console.debug('[GravitoSeo] Mode:', config.mode)
  console.debug('[GravitoSeo] Resolvers:', config.resolvers.length)
  
  if (config.dev.performance) {
    const start = performance.now()
    const entries = await this.strategy.getEntries()
    const duration = performance.now() - start
    console.debug(`[GravitoSeo] getEntries took ${duration.toFixed(2)}ms`)
  }
}
```

**優化方案 B: 配置檢查工具**
```typescript
// lux check
async function checkConfig() {
  const loader = new ConfigLoader()
  const config = await loader.load()

  console.log('🔍 Checking configuration...\n')

  // 檢查 resolvers
  for (const resolver of config.resolvers) {
    try {
      const entries = await resolver.fetch()
      console.log(`✅ ${resolver.name}: ${entries.length} entries`)
    } catch (error) {
      console.error(`❌ ${resolver.name}: ${error.message}`)
    }
  }

  // 檢查存儲
  if (config.mode === 'incremental') {
    const logPath = join(config.incremental.logDir, 'sitemap.ops.jsonl')
    if (existsSync(logPath)) {
      const stats = await stat(logPath)
      console.log(`📁 Log file: ${(stats.size / 1024).toFixed(2)} KB`)
    }
  }
}
```

**優化方案 C: 性能分析工具**
```typescript
// lux profile generate
async function profileGeneration() {
  const loader = new ConfigLoader()
  const config = await loader.load()

  const timings: Record<string, number> = {}

  // 測量各個階段
  const startTotal = performance.now()
  
  const startInit = performance.now()
  const engine = new SeoEngine(config)
  await engine.init()
  timings.init = performance.now() - startInit

  const startFetch = performance.now()
  const entries = await engine.getStrategy().getEntries()
  timings.fetch = performance.now() - startFetch

  const startRender = performance.now()
  const xml = await engine.render('/sitemap.xml')
  timings.render = performance.now() - startRender

  timings.total = performance.now() - startTotal

  // 輸出報告
  console.log('📊 Performance Profile:')
  console.table(timings)
}
```

**實施步驟**:
1. 實施方案 A（開發模式）
2. 實施方案 B（配置檢查）
3. 實施方案 C（性能分析）

**預期提升**:
- 調試效率提升 50-70%
- 問題定位時間減少 60-80%
- 開發體驗提升 40-60%

**優先級**: 🟡 中

---

### 8.5 改善錯誤處理與日誌

**當前問題** (`src/engine/strategies/DynamicStrategy.ts:31`):
```typescript
console.error(`[GravitoSeo] Resolver '${resolver.name}' failed:`, e) // ❌ 簡單的 console.error
```

**問題分析**:
- 錯誤日誌格式不一致
- 缺少錯誤上下文
- 無法追蹤錯誤來源

**優化方案: 結構化日誌**
```typescript
interface LogContext {
  resolver?: string
  mode?: string
  operation?: string
  [key: string]: unknown
}

class Logger {
  private context: LogContext = {}

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context }
  }

  error(message: string, error?: Error, context?: LogContext) {
    const fullContext = { ...this.context, ...context }
    console.error(`[GravitoSeo] ${message}`, {
      error: error?.message,
      stack: error?.stack,
      ...fullContext,
    })
  }

  warn(message: string, context?: LogContext) {
    console.warn(`[GravitoSeo] ${message}`, { ...this.context, ...context })
  }

  debug(message: string, context?: LogContext) {
    if (process.env.LUMINOSITY_DEBUG) {
      console.debug(`[GravitoSeo] ${message}`, { ...this.context, ...context })
    }
  }
}

// 使用
const logger = new Logger()
logger.setContext({ mode: config.mode, resolver: resolver.name })
logger.error('Resolver failed', error, { entryCount: entries.length })
```

**進一步優化: 錯誤恢復策略**
```typescript
async getEntries(): Promise<SitemapEntry[]> {
  const results = await Promise.allSettled(
    resolvers.map(async (resolver) => {
      try {
        return await resolver.fetch()
      } catch (error) {
        logger.error(`Resolver '${resolver.name}' failed`, error)
        
        // 如果配置了 fallback，使用它
        if (resolver.fallback) {
          return await resolver.fallback()
        }
        
        // 否則返回空數組，不中斷整個流程
        return []
      }
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<SitemapEntry[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
}
```

**優先級**: 🟡 中

---

### 8.6 添加測試輔助工具

**當前問題**:
- 缺少測試輔助函數
- 缺少 Mock 工具
- 缺少測試配置生成器

**優化方案: 測試工具包**
```typescript
// src/testing/index.ts
export class TestHelpers {
  static createMockResolver(name: string, entries: SitemapEntry[]): SeoResolver {
    return {
      name,
      fetch: async () => entries,
    }
  }

  static createTestConfig(overrides?: Partial<SeoConfig>): SeoConfig {
    return {
      mode: 'dynamic',
      baseUrl: 'https://test.example.com',
      resolvers: [],
      ...overrides,
    }
  }

  static async withTempStorage<T>(
    fn: (path: string) => Promise<T>
  ): Promise<T> {
    const tempDir = await mkdtemp(join(tmpdir(), 'luminosity-test-'))
    try {
      return await fn(tempDir)
    } finally {
      await rm(tempDir, { recursive: true })
    }
  }
}

// 使用範例
test('should generate sitemap', async () => {
  await TestHelpers.withTempStorage(async (tempDir) => {
    const config = TestHelpers.createTestConfig({
      mode: 'incremental',
      incremental: { logDir: tempDir },
    })
    // ... 測試
  })
})
```

**優先級**: 🟢 低

---

### 8.7 改善文檔與範例

**當前問題**:
- 缺少內聯 JSDoc
- 缺少常見使用場景範例
- 缺少故障排除指南

**優化方案 A: 完整的 JSDoc**
```typescript
/**
 * SEO Engine for generating sitemaps and managing robots.txt
 * 
 * @example
 * ```typescript
 * const config: SeoConfig = {
 *   mode: 'incremental',
 *   baseUrl: 'https://example.com',
 *   resolvers: [
 *     {
 *       name: 'posts',
 *       fetch: async () => {
 *         const posts = await db.posts.findMany()
 *         return posts.map(p => ({
 *           url: `/posts/${p.slug}`,
 *           lastmod: p.updatedAt,
 *         }))
 *       },
 *     },
 *   ],
 * }
 * 
 * const engine = new SeoEngine(config)
 * await engine.init()
 * ```
 * 
 * @see {@link SeoConfig} for configuration options
 * @see {@link SeoStrategy} for strategy implementations
 */
export class SeoEngine {
  // ...
}
```

**優化方案 B: 常見場景範例**
```typescript
// examples/blog-site.ts
export const blogConfig: SeoConfig = {
  mode: 'incremental',
  baseUrl: 'https://blog.example.com',
  resolvers: [
    {
      name: 'blog-posts',
      fetch: async () => {
        // 範例：從數據庫獲取博客文章
      },
    },
  ],
}

// examples/ecommerce-site.ts
export const ecommerceConfig: SeoConfig = {
  // 範例：電商網站配置
}
```

**優先級**: 🟡 中

---

---

## 結論

本優化計劃針對 `@gravito/luminosity` 進行**性能優化**和**開發者體驗（DX）提升**，預期可以：

### 性能方面
1. **性能提升**: 整體吞吐量提升 30-50%
2. **內存優化**: 內存使用減少 50-70%
3. **可擴展性**: 支持更大規模的網站（1M+ URLs）
4. **穩定性**: 改善並發處理和錯誤處理

### 開發者體驗方面
1. **類型安全**: IDE 自動完成準確度 100%，編譯時錯誤發現率提升 80%
2. **錯誤訊息**: 配置錯誤解決時間減少 60-80%，錯誤訊息清晰度提升 90%
3. **CLI 工具**: 新手上手時間減少 50-70%，工具實用性提升 80%
4. **調試能力**: 調試效率提升 50-70%，問題定位時間減少 60-80%
5. **文檔質量**: 開發效率整體提升 30-50%

### 新增項目（v2.0.0）
1. **StorageAdapter 擴展**: 為流式處理提供基礎設施
2. **並發寫入保護**: 確保多個寫入操作的安全性
3. **日誌輪替**: 自動管理日誌文件大小
4. **快取策略重新設計**: 使用 TTL + 寫入失效確保資料一致性

建議按照優先級順序逐步實施，每個 Phase 完成後進行驗證，確保穩定性。

---

## 附錄 A: 完整配置類型定義（更新版）

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

## 附錄 B: 新增檔案清單

實施本計劃後，預計新增以下檔案：

```
packages/luminosity/
├── bench/
│   ├── xml-builder.bench.ts      # Phase 0
│   ├── full-pipeline.bench.ts    # Phase 0
│   ├── memory-profiler.ts        # Phase 0
│   └── BASELINE.md               # Phase 0
├── src/
│   ├── storage/
│   │   ├── WriteMutex.ts         # Phase 3.3
│   │   └── SnapshotManager.ts    # Phase 2.3
│   ├── scanner/
│   │   └── RouteWatcher.ts       # Phase 5.1 (可選)
│   └── testing/
│       └── index.ts              # Phase 8.6
└── tests/
    ├── storage/
    │   ├── adapter-streaming.test.ts    # Phase 2.0
    │   ├── jsonl-logger-streaming.test.ts # Phase 2.1
    │   ├── compactor-streaming.test.ts  # Phase 2.2
    │   └── snapshot-manager.test.ts     # Phase 2.3
    ├── engine/
    │   └── strategies/
    │       ├── incremental-cache.test.ts     # Phase 3.1
    │       ├── incremental-concurrent.test.ts # Phase 3.3
    │       └── dynamic-batch.test.ts          # Phase 3.2
    ├── xml/
    │   └── escape.test.ts        # Phase 1.2
    └── scanner/
        └── sitemap-builder-cache.test.ts # Phase 5.1
```

---

**版本歷史**:
- v2.0.0 (2026-01-17): 基於程式碼審查的完整修正版
  - 新增 Phase 2.0 (StorageAdapter 擴展)
  - 新增 Phase 3.3 (並發寫入保護)
  - 新增 Phase 3.4 (日誌輪替)
  - 重新設計 Phase 3.1 快取策略
  - 調整優先級順序
  - 更新時間估計為 5-7 週
- v1.1.0 (2026-01-17): 新增 Phase 8 - 開發者體驗優化
- v1.0.0 (2026-01-17): 初始版本
