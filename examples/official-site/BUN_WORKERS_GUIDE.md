# 🚀 Bun Workers 集成指南

> 如何在 Gravito 官網項目中使用高性能的 Bun Workers

---

## 概述

此項目集成了 `@gravito/stream` 的原生 Bun Workers 支持，提供以下特性：

✅ **高性能**：比 Node.js Worker Threads 快 2-241 倍
✅ **原生 TypeScript**：無需編譯，直接執行
✅ **自動運行時檢測**：在 Bun 和 Node.js 上都能工作
✅ **靈活配置**：支持 3 級配置策略
✅ **性能監測**：完整的性能基準測試框架

---

## 快速開始

### 1. 基本用法

在項目中使用 WorkerPool：

```typescript
// src/services/document-processor.ts
import { WorkerPool } from '@gravito/stream'

export class DocumentProcessor {
  private pool: WorkerPool

  constructor() {
    this.pool = new WorkerPool({
      runtime: 'auto',    // 自動選擇 Bun 或 Node.js
      poolSize: 4,
      minWorkers: 1,
    })
  }

  async processMarkdown(content: string) {
    const result = await this.pool.execute({
      type: 'markdown-process',
      data: JSON.stringify({ content }),
    })
    return JSON.parse(result.data)
  }

  async shutdown() {
    await this.pool.shutdown()
  }
}
```

### 2. 配置 gravito.config.ts

```typescript
// gravito.config.ts
import type { GravitoConfig as Config } from '@gravito/core'

export const GravitoConfig: Config & any = {
  // ... 其他配置 ...

  workers: {
    // 自動選擇最優 runtime
    runtime: process.env.WORKERS_RUNTIME ?? 'auto',

    pool: {
      poolSize: parseInt(process.env.WORKERS_POOL_SIZE ?? '4'),
      minWorkers: parseInt(process.env.WORKERS_MIN_WORKERS ?? '1'),
      healthCheckInterval: 30000,
    },

    execution: {
      maxExecutionTime: 30000,
      maxMemory: parseInt(process.env.WORKERS_MAX_MEMORY ?? '256'),
      idleTimeout: 60000,
      isolateContexts: false,
    },

    // Bun 特定優化
    bun: {
      smol: process.env.WORKERS_BUN_SMOL === 'true',
      preload: process.env.WORKERS_BUN_PRELOAD?.split(','),
      inspectPort: process.env.WORKERS_BUN_INSPECT_PORT,
    },
  },
}
```

### 3. 環境配置

在 `.env` 中配置：

```bash
# .env
WORKERS_RUNTIME=auto              # auto | bun | node
WORKERS_POOL_SIZE=4               # 最大 worker 數
WORKERS_MIN_WORKERS=1             # 最小熱備 worker
WORKERS_BUN_SMOL=true             # Bun 內存優化
WORKERS_MAX_MEMORY=256            # 每個 worker 最大內存 (MB)
```

---

## 使用場景

### 場景 1：Markdown 文檔處理

```typescript
// src/services/markdown-service.ts
import { WorkerPool } from '@gravito/stream'
import { GravitoConfig } from '../gravito.config'

export class MarkdownService {
  private pool: WorkerPool

  constructor() {
    this.pool = new WorkerPool({
      runtime: GravitoConfig.workers.runtime,
      poolSize: GravitoConfig.workers.pool.poolSize,
    })
  }

  /**
   * 異步處理 Markdown 文檔
   * 利用 Bun Workers 快速轉換
   */
  async process(markdown: string) {
    const result = await this.pool.execute({
      type: 'markdown-process',
      data: JSON.stringify({
        content: markdown,
        options: {
          highlight: true,
          toc: true,
        },
      }),
    })
    return JSON.parse(result.data)
  }

  async shutdown() {
    await this.pool.shutdown()
  }
}
```

### 場景 2：SEO 優化

```typescript
// src/services/seo-service.ts
export class SEOService {
  private pool: WorkerPool

  async generateMetaTags(page: Page) {
    // 在 worker 中生成複雜的 SEO 元數據
    const result = await this.pool.execute({
      type: 'seo-generate',
      data: JSON.stringify(page),
    })
    return JSON.parse(result.data)
  }

  async generateSitemap() {
    // 並行生成 sitemap 部分
    const results = await Promise.all([
      this.pool.execute({ type: 'sitemap-part1' }),
      this.pool.execute({ type: 'sitemap-part2' }),
      this.pool.execute({ type: 'sitemap-part3' }),
    ])
    return results.map(r => JSON.parse(r.data))
  }
}
```

### 場景 3：圖片優化

```typescript
// src/services/image-service.ts
export class ImageService {
  private pool: WorkerPool

  async optimizeImage(filePath: string) {
    // 在 worker 中執行 CPU 密集的圖片優化
    const result = await this.pool.execute({
      type: 'image-optimize',
      data: JSON.stringify({
        path: filePath,
        formats: ['webp', 'jpg', 'png'],
      }),
    })
    return JSON.parse(result.data)
  }

  async resizeImage(source: string, sizes: number[]) {
    // 並行生成多個尺寸
    const tasks = sizes.map(size =>
      this.pool.execute({
        type: 'image-resize',
        data: JSON.stringify({ source, size }),
      })
    )
    return Promise.all(tasks)
  }
}
```

---

## 性能監測

### 集成性能報告

```typescript
// src/services/performance-monitor.ts
import { PerformanceReporter } from '@gravito/stream'

export class PerformanceMonitor {
  private reporter = new PerformanceReporter()

  recordWorkerMetric(
    metric: string,
    value: number,
    unit: string = 'ms'
  ) {
    this.reporter.recordResult({
      name: `official-site-${metric}`,
      runtime: 'auto',
      metric,
      value,
      unit,
      timestamp: Date.now(),
    })
  }

  generateReport() {
    return this.reporter.generateReport()
  }

  printMarkdownReport() {
    console.log(this.reporter.generateMarkdown())
  }

  exportJSON() {
    return this.reporter.generateJSON()
  }
}
```

### 在控制器中使用

```typescript
// src/controllers/api-controller.ts
export class ApiController {
  constructor(
    private documentService: DocumentService,
    private performanceMonitor: PerformanceMonitor
  ) {}

  async processDocument(request: Request) {
    const startTime = performance.now()

    const result = await this.documentService.process(
      request.body.content
    )

    const duration = performance.now() - startTime
    this.performanceMonitor.recordWorkerMetric(
      'document-processing',
      duration
    )

    return { success: true, result }
  }
}
```

---

## 開發技巧

### 1. 本地開發

在開發環境中，使用較小的 pool 以節省資源：

```typescript
// 開發環境配置
if (process.env.NODE_ENV === 'development') {
  pool = new WorkerPool({
    poolSize: 2,        // 更小的 pool
    minWorkers: 0,      # 無熱備
    runtime: 'auto',
  })
}
```

### 2. 監測運行時

```typescript
import { RuntimeAwareWorkerFactory } from '@gravito/stream'

const factory = new RuntimeAwareWorkerFactory('auto')
console.log(`Running on: ${factory.getRuntime()}`)

if (factory.isBun()) {
  console.log('✨ Using high-performance Bun Workers')
} else {
  console.log('🔧 Using Node.js Worker Threads')
}
```

### 3. 優雅關閉

```typescript
// bootstrap.ts
const pool = new WorkerPool(config.workers)

process.on('SIGTERM', async () => {
  console.log('Shutting down...')
  await pool.shutdown()
  process.exit(0)
})
```

---

## 故障排除

### 問題 1：Worker 不可用

**症狀**：`Error: No worker available`

**解決**：
```typescript
// 增加 pool 大小
pool = new WorkerPool({
  poolSize: 8,        // 從 4 增加到 8
  minWorkers: 2,      # 保持 2 個熱備
})
```

### 問題 2：內存持續增長

**症狀**：內存占用越來越大

**解決**：
```typescript
// 啟用 Bun 優化
bun: {
  smol: true,         // 啟用內存優化模式
}
execution: {
  idleTimeout: 30000, // 更快的 worker 回收
}
```

### 問題 3：在 Node.js 上執行失敗

**症狀**：某些任務在 Node.js 上失敗

**解決**：檢查 runtime 特定的代碼

```typescript
import { RuntimeAwareWorkerFactory } from '@gravito/stream'

const factory = new RuntimeAwareWorkerFactory('auto')

if (factory.isBun()) {
  // Bun 特定的優化
  await optimizeBun()
} else {
  // Node.js 備選方案
  await optimizeNode()
}
```

---

## 性能基準

在 Bun 上運行基準測試：

```bash
# 運行所有性能測試
bun test ../../packages/stream/tests/benchmarks/

# 查看性能報告
bun test ../../packages/stream/tests/benchmarks/ --reporter=spec
```

### 預期性能指標

| 操作 | Bun | Node.js | 改進 |
|------|-----|---------|------|
| Markdown 處理 | ~45ms | ~180ms | **75% 快** |
| 圖片優化 | ~100ms | ~250ms | **60% 快** |
| SEO 生成 | ~50ms | ~150ms | **67% 快** |

---

## 集成到 CI/CD

### GitHub Actions 示例

```yaml
# .github/workflows/performance.yml
name: Performance Benchmark

on: [push, pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Run benchmarks
        run: |
          bun test packages/stream/tests/benchmarks/

      - name: Generate report
        run: |
          bun run generate:performance-report

      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('performance-report.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });
```

---

## 最佳實踐

### DO ✅

- ✅ 使用 `runtime: 'auto'` 自動選擇最優 runtime
- ✅ 根據環境設置不同的 pool 大小
- ✅ 監測和記錄性能指標
- ✅ 在生產環境啟用 `smol: true`
- ✅ 設置 `maxMemory` 防止 OOM

### DON'T ❌

- ❌ 不要硬編碼 `runtime: 'bun'`（降低通用性）
- ❌ 不要在池中執行阻塞操作
- ❌ 不要忘記調用 `pool.shutdown()`
- ❌ 不要忽視內存限制

---

## 相關資源

| 資源 | 鏈接 |
|------|------|
| 快速開始 | `../../QUICK_START_BUN_WORKERS.md` |
| 配置示例 | `../../WORKERS_CONFIG_EXAMPLES.md` |
| 性能詳情 | `../../PHASE_4_PERFORMANCE_BENCHMARKING.md` |
| Bun 文檔 | https://bun.com/docs/runtime/workers |

---

**最後更新**：2026-02-23
**版本**：1.0.0
**狀態**：生產就緒 ✅

