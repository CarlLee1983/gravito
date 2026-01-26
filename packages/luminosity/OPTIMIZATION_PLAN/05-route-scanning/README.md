# Phase 5: 路由掃描優化

> **總預估時間**: 2-3 天

[← 返回總覽](../README.md)

---


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

