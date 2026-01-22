# Phase 4: SSG 增強

> **目標**: 增量建置、動態路由生成、可配置並發控制
> **預估工時**: 2-3 天
> **向下相容**: ✅ 新增功能，可選參數

---

## 📋 任務清單

### 4.1 新增 `IncrementalBuilder` 類別

**檔案**: `src/ssg/IncrementalBuilder.ts` (新)
**向下相容**: ✅ 新增檔案，無影響

#### 實作規格

```typescript
/**
 * IncrementalBuilder - Manifest-based incremental SSG builds
 *
 * Features:
 * - Content hash tracking for change detection
 * - Build manifest persistence
 * - Skip unchanged pages
 * - Configurable concurrency and timeout
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { PlanetCore } from '@gravito/core'

interface BuildManifest {
  version: string
  baseUrl: string
  buildTime: number
  pages: Record<string, PageEntry>
}

interface PageEntry {
  path: string
  hash: string           // Content hash of rendered output
  sourceHash: string     // Hash of data/template sources
  lastBuilt: number
  size: number
}

interface IncrementalOptions {
  force?: boolean        // Force rebuild all pages
  manifestPath?: string  // Path to manifest file
  concurrency?: number   // Max concurrent renders
  timeout?: number       // Timeout per page (ms)
}

export class IncrementalBuilder {
  private manifest: BuildManifest | null = null
  private manifestPath: string

  constructor(
    private core: PlanetCore,
    private outputDir: string,
    options: IncrementalOptions = {}
  ) {
    this.manifestPath = options.manifestPath ?? `${outputDir}/.build-manifest.json`
  }

  /**
   * Load existing build manifest
   */
  private loadManifest(): BuildManifest {
    if (this.manifest) return this.manifest

    if (!existsSync(this.manifestPath)) {
      return this.createEmptyManifest()
    }

    try {
      const content = readFileSync(this.manifestPath, 'utf-8')
      this.manifest = JSON.parse(content)
      return this.manifest!
    } catch (error) {
      this.core.logger.warn('[IncrementalBuilder] Failed to load manifest, creating new one')
      return this.createEmptyManifest()
    }
  }

  /**
   * Create empty manifest
   */
  private createEmptyManifest(): BuildManifest {
    this.manifest = {
      version: '1.0',
      baseUrl: '',
      buildTime: Date.now(),
      pages: {}
    }
    return this.manifest
  }

  /**
   * Save manifest to disk
   */
  private saveManifest(): void {
    if (!this.manifest) return

    this.manifest.buildTime = Date.now()
    writeFileSync(this.manifestPath, JSON.stringify(this.manifest, null, 2), 'utf-8')
    this.core.logger.info(`[IncrementalBuilder] Manifest saved: ${this.manifestPath}`)
  }

  /**
   * Compute content hash for change detection
   */
  private computeHash(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16)
  }

  /**
   * Check if page needs rebuild
   */
  private needsRebuild(path: string, sourceHash: string): boolean {
    if (!this.manifest?.pages[path]) {
      return true // New page
    }

    const existing = this.manifest.pages[path]
    
    // Check if source changed
    if (existing.sourceHash !== sourceHash) {
      this.core.logger.debug(`[IncrementalBuilder] Source changed: ${path}`)
      return true
    }

    return false
  }

  /**
   * Export with incremental support
   */
  async export(
    routes: Array<{ path: string; getData?: () => Promise<any> }>,
    baseUrl: string,
    options: IncrementalOptions = {}
  ): Promise<{ built: number; skipped: number; failed: number }> {
    const manifest = this.loadManifest()
    manifest.baseUrl = baseUrl

    const force = options.force ?? false
    const concurrency = options.concurrency ?? 10
    const timeout = options.timeout ?? 30000

    let built = 0
    let skipped = 0
    let failed = 0

    const queue = [...routes]
    const total = routes.length

    this.core.logger.info(
      `[IncrementalBuilder] Starting ${force ? 'full' : 'incremental'} build (${total} routes)`
    )

    const worker = async () => {
      while (queue.length > 0) {
        const route = queue.shift()
        if (!route) break

        try {
          // Compute source hash (data + template)
          const data = route.getData ? await route.getData() : {}
          const dataString = JSON.stringify(data)
          const sourceHash = this.computeHash(dataString)

          // Check if rebuild needed
          if (!force && !this.needsRebuild(route.path, sourceHash)) {
            skipped++
            this.core.logger.debug(
              `[IncrementalBuilder] ⏭️  Skipped (${built + skipped + failed}/${total}): ${route.path}`
            )
            continue
          }

          // Render page
          const url = `http://localhost${route.path}`
          const request = new Request(url, {
            signal: AbortSignal.timeout(timeout)
          })

          const response = await this.core.adapter.fetch(request)

          if (!response.ok) {
            this.core.logger.warn(
              `[IncrementalBuilder] ⚠️  Failed ${route.path}: Status ${response.status}`
            )
            failed++
            continue
          }

          const html = await response.text()
          const contentHash = this.computeHash(html)

          // Update manifest
          manifest.pages[route.path] = {
            path: route.path,
            hash: contentHash,
            sourceHash,
            lastBuilt: Date.now(),
            size: Buffer.byteLength(html, 'utf-8')
          }

          built++
          this.core.logger.info(
            `[IncrementalBuilder] ✅ Built (${built + skipped + failed}/${total}): ${route.path}`
          )
        } catch (error: any) {
          failed++
          this.core.logger.error(
            `[IncrementalBuilder] ❌ Failed ${route.path}: ${error.message}`
          )
        }
      }
    }

    // Start workers
    const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker())
    await Promise.all(workers)

    // Save manifest
    this.saveManifest()

    this.core.logger.info(
      `[IncrementalBuilder] Build complete! Built: ${built}, Skipped: ${skipped}, Failed: ${failed}`
    )

    return { built, skipped, failed }
  }

  /**
   * Get manifest statistics
   */
  getStats() {
    const manifest = this.loadManifest()
    const pages = Object.values(manifest.pages)

    return {
      totalPages: pages.length,
      totalSize: pages.reduce((sum, p) => sum + p.size, 0),
      lastBuild: manifest.buildTime,
      oldestPage: Math.min(...pages.map(p => p.lastBuilt)),
      newestPage: Math.max(...pages.map(p => p.lastBuilt))
    }
  }
}
```

#### 驗收標準

- [ ] `bun test` 增量建置測試通過
- [ ] Manifest 正確追蹤變更
- [ ] 未變更頁面正確跳過
- [ ] `force: true` 可強制全量建置

#### 測試計劃

```typescript
// tests/incremental.test.ts (新檔案)
describe('IncrementalBuilder', () => {
  it('should create manifest on first build')
  it('should skip unchanged pages on second build')
  it('should rebuild when source data changes')
  it('should rebuild when template changes')
  it('should force rebuild with force=true')
  it('should track build statistics')
  it('should handle concurrent builds safely')
})
```

---

### 4.2 新增動態路由生成支援

**檔案**: `src/ssg/DynamicRouteResolver.ts` (新)
**向下相容**: ✅ 新增檔案，無影響

#### 實作規格

```typescript
/**
 * DynamicRouteResolver - Generate static paths from dynamic routes
 *
 * Supports patterns:
 * - /blog/[slug] → /blog/hello-world, /blog/getting-started
 * - /docs/[...path] → /docs/api/intro, /docs/guide/setup
 */

export interface DynamicRoute {
  pattern: string                // e.g., "/blog/[slug]"
  getPaths: () => Promise<Array<{ params: Record<string, string> }>>
  getData?: (params: Record<string, string>) => Promise<any>
}

export interface ResolvedRoute {
  path: string
  getData?: () => Promise<any>
}

export class DynamicRouteResolver {
  /**
   * Resolve dynamic routes to static paths
   */
  static async resolve(routes: DynamicRoute[]): Promise<ResolvedRoute[]> {
    const resolved: ResolvedRoute[] = []

    for (const route of routes) {
      const paths = await route.getPaths()

      for (const { params } of paths) {
        const path = this.interpolate(route.pattern, params)

        resolved.push({
          path,
          getData: route.getData ? () => route.getData!(params) : undefined
        })
      }
    }

    return resolved
  }

  /**
   * Interpolate dynamic segments
   * /blog/[slug] + { slug: "hello" } → /blog/hello
   */
  private static interpolate(pattern: string, params: Record<string, string>): string {
    let result = pattern

    // Handle [param] segments
    result = result.replace(/\[([^\]]+)\]/g, (_, key) => {
      if (!params[key]) {
        throw new Error(`Missing param: ${key} for pattern ${pattern}`)
      }
      return params[key]
    })

    // Handle [...param] catch-all segments
    result = result.replace(/\[\.\.\.([^\]]+)\]/g, (_, key) => {
      if (!params[key]) {
        throw new Error(`Missing catch-all param: ${key} for pattern ${pattern}`)
      }
      return params[key]
    })

    return result
  }

  /**
   * Extract dynamic segments from pattern
   * /blog/[slug]/[id] → ['slug', 'id']
   */
  static extractParams(pattern: string): string[] {
    const params: string[] = []
    const regex = /\[([^\]]+)\]/g
    let match: RegExpExecArray | null

    while ((match = regex.exec(pattern)) !== null) {
      params.push(match[1].replace('...', ''))
    }

    return params
  }
}
```

#### 使用範例

```typescript
// Usage in SSG export
const dynamicRoutes: DynamicRoute[] = [
  {
    pattern: '/blog/[slug]',
    getPaths: async () => {
      const posts = await db.select('posts').all()
      return posts.map(p => ({ params: { slug: p.slug } }))
    },
    getData: async (params) => {
      return await db.select('posts').where('slug', params.slug).first()
    }
  },
  {
    pattern: '/docs/[...path]',
    getPaths: async () => {
      return [
        { params: { path: 'api/intro' } },
        { params: { path: 'guide/setup' } },
        { params: { path: 'guide/deployment' } }
      ]
    }
  }
]

const ssg = new StaticSiteGenerator(core)
await ssg.exportDynamic(dynamicRoutes, './dist', 'https://example.com')
```

#### 驗收標準

- [ ] `[slug]` 單段參數正確解析
- [ ] `[...path]` 多段參數正確解析
- [ ] 缺少參數時拋出錯誤
- [ ] `getData` 正確傳遞參數

---

### 4.3 更新 `StaticSiteGenerator` 整合功能

**檔案**: `src/SSG.ts`
**向下相容**: ✅ 新增方法，現有 API 不變

#### 新增方法

```typescript
import { IncrementalBuilder } from './ssg/IncrementalBuilder'
import { DynamicRouteResolver, type DynamicRoute } from './ssg/DynamicRouteResolver'

export interface ExportOptions {
  baseUrl?: string
  concurrency?: number
  timeout?: number
  incremental?: boolean
  force?: boolean
  manifestPath?: string
}

export class StaticSiteGenerator {
  constructor(private core: PlanetCore) {}

  /**
   * Export with dynamic routes support (NEW)
   */
  async exportDynamic(
    dynamicRoutes: DynamicRoute[],
    outputDir: string,
    options: ExportOptions = {}
  ): Promise<void> {
    const baseUrl = options.baseUrl ?? 'https://gravito.dev'

    this.core.logger.info('[SSG] Resolving dynamic routes...')
    const resolved = await DynamicRouteResolver.resolve(dynamicRoutes)
    this.core.logger.info(`[SSG] Resolved ${resolved.length} static paths from dynamic routes`)

    // Use incremental builder if enabled
    if (options.incremental) {
      const builder = new IncrementalBuilder(this.core, outputDir, options)
      await builder.export(resolved, baseUrl, options)
    } else {
      // Fallback to legacy export
      await this.exportRoutes(resolved, outputDir, baseUrl, options)
    }
  }

  /**
   * Export with incremental support (NEW)
   */
  async exportIncremental(
    outputDir: string,
    options: ExportOptions = {}
  ): Promise<void> {
    const baseUrl = options.baseUrl ?? 'https://gravito.dev'

    // Get static routes from router
    const routes = this.getStaticRoutes()
    const resolved = routes.map(r => ({ path: r.path }))

    const builder = new IncrementalBuilder(this.core, outputDir, options)
    await builder.export(resolved, baseUrl, options)

    // Generate sitemap & robots.txt
    await this.generateSitemap(outputDir, resolved, baseUrl)
    await this.generateRobotsTxt(outputDir, baseUrl)
  }

  /**
   * Export routes (internal helper)
   */
  private async exportRoutes(
    routes: Array<{ path: string; getData?: () => Promise<any> }>,
    outputDir: string,
    baseUrl: string,
    options: ExportOptions = {}
  ): Promise<void> {
    const concurrency = options.concurrency ?? 10
    const timeout = options.timeout ?? 30000

    const queue = [...routes]
    const total = routes.length
    let success = 0
    let failed = 0

    const worker = async () => {
      while (queue.length > 0) {
        const route = queue.shift()
        if (!route) break

        try {
          const url = `http://localhost${route.path}`
          const request = new Request(url, {
            signal: AbortSignal.timeout(timeout)
          })

          const response = await this.core.adapter.fetch(request)

          if (!response.ok) {
            this.core.logger.warn(`[SSG] ⚠️ Skipping ${route.path}: Status ${response.status}`)
            failed++
            continue
          }

          const html = await response.text()

          // Determine file path
          const pathWithoutQuery = route.path.split('?')[0]
          let relativePath =
            pathWithoutQuery === '/'
              ? 'index.html'
              : `${pathWithoutQuery.replace(/^\//, '')}/index.html`

          if (pathWithoutQuery.endsWith('.html')) {
            relativePath = pathWithoutQuery.replace(/^\//, '')
          }

          const absolutePath = join(outputDir, relativePath)
          await mkdir(dirname(absolutePath), { recursive: true })
          await writeFile(absolutePath, html, 'utf-8')

          success++
          this.core.logger.info(`[SSG] ✅ Rendered (${success + failed}/${total}): ${route.path}`)
        } catch (error: any) {
          failed++
          this.core.logger.error(`[SSG] ❌ Failed ${route.path}: ${error.message}`)
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker())
    await Promise.all(workers)

    this.core.logger.info(`[SSG] Export complete! Success: ${success}, Failed: ${failed}`)
  }

  /**
   * Get static routes from router (internal helper)
   */
  private getStaticRoutes(): Array<{ path: string; method: string }> {
    const router = this.core.router as any
    let routes: any[] = []

    if (Array.isArray(router.routes)) {
      routes = router.routes
    } else if (typeof router.getRoutes === 'function') {
      routes = router.getRoutes()
    }

    return routes.filter(
      (r: any) =>
        r?.method?.toLowerCase() === 'get' &&
        r.path &&
        !r.path.includes(':') &&
        !r.path.includes('*') &&
        !r.path.includes('[')
    )
  }

  // Existing methods remain unchanged for backward compatibility
  async export(
    outputDir: string,
    baseUrl = 'https://gravito.dev',
    extraPaths: string[] = []
  ): Promise<void> {
    // ... existing implementation unchanged
  }

  private async generateSitemap(/* ... */) { /* unchanged */ }
  private async generateRobotsTxt(/* ... */) { /* unchanged */ }
}
```

#### 驗收標準

- [ ] `export()` 現有功能完全不變
- [ ] `exportDynamic()` 正確處理動態路由
- [ ] `exportIncremental()` 正確跳過未變更頁面
- [ ] `ExportOptions` 可配置並發、超時、增量模式

---

### 4.4 新增 SSG 配置到 `OrbitPrism`

**檔案**: `src/index.ts`
**向下相容**: ✅ 新增可選參數

```typescript
import type { CacheOptions } from './core/TemplateCache'

export interface SSGOptions {
  concurrency?: number   // Default: 10
  timeout?: number       // Default: 30000 (30s)
  incremental?: boolean  // Default: false
  manifestPath?: string  // Default: {outputDir}/.build-manifest.json
}

export interface OrbitPrismOptions {
  cache?: CacheOptions
  ssg?: SSGOptions
}

export class OrbitPrism implements GravitoOrbit {
  private options: OrbitPrismOptions

  constructor(options?: OrbitPrismOptions) {
    this.options = options ?? {}
  }

  install(core: PlanetCore): void {
    // ... existing TemplateEngine setup

    // Expose SSG with configured options
    const ssgOptions = this.options.ssg ?? {}
    const ssg = new StaticSiteGenerator(core)

    core.container.singleton('ssg', () => ssg)
    core.logger.info('[OrbitPrism] SSG registered (Exposed as: ssg)')
  }
}
```

#### 使用範例

```typescript
// gravito.config.ts
export default defineConfig({
  orbits: [
    new OrbitPrism({
      cache: { maxSize: 1000, enabled: true },
      ssg: { concurrency: 20, incremental: true }
    })
  ]
})
```

#### 驗收標準

- [ ] `new OrbitPrism()` 預設行為不變
- [ ] `ssg` 選項正確傳遞到 `StaticSiteGenerator`
- [ ] 並發、超時設定正常運作

---

## 📊 預期成果

### 功能改善

| 功能 | 現狀 | 目標 |
|------|------|------|
| SSG 模式 | 全量建置 | 增量 + 全量可選 |
| 動態路由 | 不支援 | 支援 `[slug]` 和 `[...path]` |
| 並發控制 | 固定 10 | 可配置 (1-100) |
| 超時控制 | 固定 30s | 可配置 |
| 建置追蹤 | 無 | Manifest 追蹤變更 |

### 效能改善

| 指標 | 現狀 | 目標 | 測量方法 |
|------|------|------|---------|
| 增量建置時間 | N/A | <10% 全量時間 | `IncrementalBuilder` 日誌 |
| 建置跳過率 | 0% | >80% (無變更時) | Manifest 統計 |
| 並發處理量 | 10 | 可配置 1-100 | `ExportOptions.concurrency` |

---

## ✅ 驗收檢查清單

完成 Phase 4 後,請檢查:

### 功能驗收

- [ ] `IncrementalBuilder` 類別實作完成
- [ ] `DynamicRouteResolver` 類別實作完成
- [ ] `StaticSiteGenerator` 新增 `exportDynamic()` 和 `exportIncremental()`
- [ ] `OrbitPrism` 新增 `ssg` 配置選項
- [ ] Manifest 正確追蹤頁面變更
- [ ] 動態路由正確解析

### 測試驗收

- [ ] 現有 SSG 測試全部通過
- [ ] 新增增量建置測試通過 (至少 7 個)
- [ ] 新增動態路由測試通過 (至少 4 個)
- [ ] 測試覆蓋率 >85%
- [ ] `bun test --coverage` 顯示 improvement

### LSP 驗收

- [ ] `bun run typecheck` 無錯誤
- [ ] 無新警告產生
- [ ] 所有新類型正確導出

### 相容性驗收

- [ ] `ssg.export()` 預設行為完全不變
- [ ] 新方法為可選功能 (opt-in)
- [ ] 現有專案無需修改配置
- [ ] Manifest 檔案不影響現有建置流程

### 效能驗收

- [ ] 增量建置跳過未變更頁面 >80%
- [ ] 並發控制正常運作
- [ ] 超時機制正確觸發
- [ ] Manifest 大小合理 (<1MB for 1000 pages)

---

## 🔄 整合範例

### 基礎用法 (向下相容)

```typescript
// 完全不變
const ssg = new StaticSiteGenerator(core)
await ssg.export('./dist', 'https://example.com')
```

### 增量建置

```typescript
const ssg = new StaticSiteGenerator(core)
await ssg.exportIncremental('./dist', {
  baseUrl: 'https://example.com',
  incremental: true,
  force: false  // 僅建置變更的頁面
})
```

### 動態路由

```typescript
const ssg = new StaticSiteGenerator(core)

const dynamicRoutes: DynamicRoute[] = [
  {
    pattern: '/blog/[slug]',
    getPaths: async () => {
      const posts = await getPosts()
      return posts.map(p => ({ params: { slug: p.slug } }))
    },
    getData: async (params) => {
      return await getPostBySlug(params.slug)
    }
  }
]

await ssg.exportDynamic(dynamicRoutes, './dist', {
  baseUrl: 'https://blog.example.com',
  incremental: true,
  concurrency: 20
})
```

---

## 📚 參考資料

- [Next.js ISG (Incremental Static Generation)](https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration)
- [Astro Dynamic Routes](https://docs.astro.build/en/core-concepts/routing/#dynamic-routes)
- [SvelteKit Prerendering](https://kit.svelte.dev/docs/page-options#prerender)

---

**上一文檔**: [← Phase 3: 程式碼品質](./PHASE3_CODE_QUALITY.md)
**下一文檔**: [Phase 5: 架構重構](./PHASE5_ARCHITECTURE_REFACTOR.md) →
