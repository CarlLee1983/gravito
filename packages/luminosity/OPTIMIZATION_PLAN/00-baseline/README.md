# Phase 0: 基準測試與分析

> **依賴**: 無  
> **優先級**: 🔴 高（必須先完成）  
> **預估時間**: 2-3 天

[← 返回總覽](../README.md)

---

## 目標

建立可量化的性能基準，用於驗證優化效果，並**確認真正的性能瓶頸**

---

## 任務

1. 擴展現有 `bench/compactor.bench.ts` 基準測試
2. 新增 XML 構建性能基準測試
3. 新增完整流程端到端基準測試（10K, 100K, 1M URLs）
4. 建立內存使用監控腳本
5. **新增**：分析各階段耗時佔比，確認真正瓶頸

---

## 基準指標

- XML 構建吞吐量（entries/sec）
- Compactor 處理時間（ms）
- 內存峰值使用（MB）
- 完整 sitemap 生成時間（ms）
- 並發請求處理能力（req/sec）
- **新增**：各階段耗時佔比（%）

---

## 預期產出

- `bench/xml-builder.bench.ts` - XML 構建性能測試
- `bench/full-pipeline.bench.ts` - 端到端性能測試
- `bench/memory-profiler.ts` - 內存分析工具
- `bench/BASELINE.md` - 基準測試結果文檔

---

## 實現細節

### bench/xml-builder.bench.ts

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

### bench/full-pipeline.bench.ts

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

---

## 驗證清單

- [ ] 基準測試可重複執行
- [ ] 結果記錄於 `bench/BASELINE.md`
- [ ] 確認各階段耗時佔比
- [ ] **關鍵決策**: 根據結果決定 Phase 1.1 是否需要實施

---

## 下一步

完成基準測試後，根據結果決定：

- 如果 XML 構建階段耗時佔比 < 10%，**不實施** Phase 1.1
- 如果 XML 構建階段耗時佔比 > 20%，實施 Phase 1.1

然後繼續進行：
- [Phase 1.2: XML 轉義（安全性）](../01-xml-optimization/README.md#12-添加-xml-轉義安全性修復)
- [Phase 2.0: StorageAdapter 擴展](../02-storage-optimization/README.md#20-storageadapter-接口擴展前置項目)
