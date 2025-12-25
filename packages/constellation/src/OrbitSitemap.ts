import { randomUUID } from 'node:crypto'
import type { GravitoContext, PlanetCore } from 'gravito-core'
import { IncrementalGenerator } from './core/IncrementalGenerator'
import { ProgressTracker } from './core/ProgressTracker'
import { SitemapGenerator } from './core/SitemapGenerator'
import { GenerateSitemapJob } from './jobs/GenerateSitemapJob'
import { RedirectHandler } from './redirect/RedirectHandler'
import { MemorySitemapStorage } from './storage/MemorySitemapStorage'
import type {
  ChangeTracker,
  RedirectManager,
  SitemapLock,
  SitemapProgressStorage,
  SitemapProvider,
  SitemapStorage,
  SitemapStreamOptions,
} from './types'

export interface DynamicSitemapOptions extends SitemapStreamOptions {
  path?: string | undefined // default: '/sitemap.xml'
  providers: SitemapProvider[]
  cacheSeconds?: number | undefined
  storage?: SitemapStorage | undefined
  lock?: SitemapLock | undefined
}

export interface StaticSitemapOptions extends SitemapStreamOptions {
  outDir: string
  filename?: string | undefined // default: 'sitemap.xml'
  providers: SitemapProvider[]
  storage?: SitemapStorage | undefined
  // 增量生成配置
  incremental?: {
    enabled: boolean
    changeTracker: ChangeTracker
    autoTrack?: boolean
  }
  // 301 轉址配置
  redirect?: {
    enabled: boolean
    manager: RedirectManager
    strategy?: 'remove_old_add_new' | 'keep_relation' | 'update_url' | 'dual_mark'
    followChains?: boolean
    maxChainLength?: number
  }
  // 影子處理配置
  shadow?: {
    enabled: boolean
    mode: 'atomic' | 'versioned'
  }
  // 進度追蹤配置
  progressStorage?: SitemapProgressStorage
}

export class OrbitSitemap {
  private options: DynamicSitemapOptions | StaticSitemapOptions
  private mode: 'dynamic' | 'static'

  private constructor(
    mode: 'dynamic' | 'static',
    options: DynamicSitemapOptions | StaticSitemapOptions
  ) {
    this.mode = mode
    this.options = options
  }

  /**
   * Create a dynamic sitemap configuration.
   *
   * @param options - The dynamic sitemap options.
   * @returns An OrbitSitemap instance configured for dynamic generation.
   */
  static dynamic(options: DynamicSitemapOptions): OrbitSitemap {
    return new OrbitSitemap('dynamic', {
      path: '/sitemap.xml',
      ...options,
    })
  }

  /**
   * Create a static sitemap configuration.
   *
   * @param options - The static sitemap options.
   * @returns An OrbitSitemap instance configured for static generation.
   */
  static static(options: StaticSitemapOptions): OrbitSitemap {
    return new OrbitSitemap('static', {
      filename: 'sitemap.xml',
      ...options,
    })
  }

  /**
   * Install the sitemap module into PlanetCore.
   *
   * @param core - The PlanetCore instance.
   */
  install(core: PlanetCore): void {
    if (this.mode === 'dynamic') {
      this.installDynamic(core)
    } else {
      // Static generation is usually triggered via a build script,
      // but we can also expose a route to trigger it or just log usage.
      console.log('[OrbitSitemap] Static mode configured. Use generate() to build sitemaps.')
    }
  }

  private installDynamic(core: PlanetCore) {
    const opts = this.options as DynamicSitemapOptions
    const storage = opts.storage ?? new MemorySitemapStorage(opts.baseUrl)
    const indexFilename = opts.path?.split('/').pop() ?? 'sitemap.xml'
    const baseDir = opts.path ? opts.path.substring(0, opts.path.lastIndexOf('/')) : undefined

    const handler = async (ctx: GravitoContext) => {
      // Determine filename from request
      const reqPath = ctx.req.path
      const filename = reqPath.split('/').pop() || indexFilename
      const isIndex = filename === indexFilename

      // Check storage
      let content = await storage.read(filename)

      // If missing and is index, generate
      if (!content && isIndex) {
        // Locking
        if (opts.lock) {
          const locked = await opts.lock.acquire(filename, 60)
          if (!locked) {
            return new Response('Generating...', {
              status: 503,
              headers: { 'Retry-After': '5' },
            })
          }
        }

        try {
          const generator = new SitemapGenerator({
            ...opts,
            storage,
            filename: indexFilename,
          })
          await generator.run()
        } finally {
          if (opts.lock) {
            await opts.lock.release(filename)
          }
        }

        content = await storage.read(filename)
      }

      if (!content) {
        // If it's a shard and missing, return 404.
        // If index is missing after generation attempt, return 404 (or 500?)
        return ctx.text('Not Found', 404)
      }

      return new Response(content, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': opts.cacheSeconds ? `public, max-age=${opts.cacheSeconds}` : 'no-cache',
        },
      })
    }

    // Register Index Route
    if (opts.path) {
      core.router.get(opts.path, handler)
    }

    // Register Shard Route (e.g., sitemap-1.xml)
    // We assume shards are in same directory and follow pattern {basename}-*.xml
    // Route param pattern: /path/basename-:shard.xml
    const basename = indexFilename.replace('.xml', '')
    const shardRoute = `${baseDir}/${basename}-:shard.xml`
    core.router.get(shardRoute, handler)
  }

  /**
   * Generate the sitemap (static mode only).
   *
   * @returns A promise that resolves when generation is complete.
   * @throws {Error} If called in dynamic mode.
   */
  async generate(): Promise<void> {
    if (this.mode !== 'static') {
      throw new Error('generate() can only be called in static mode')
    }

    const opts = this.options as StaticSitemapOptions

    let storage = opts.storage
    if (!storage) {
      const { DiskSitemapStorage } = await import('./storage/DiskSitemapStorage')
      storage = new DiskSitemapStorage(opts.outDir, opts.baseUrl)
    }

    // 處理轉址（如果啟用）
    let providers = opts.providers
    if (opts.redirect?.enabled && opts.redirect.manager) {
      const handler = new RedirectHandler({
        manager: opts.redirect.manager,
        strategy: opts.redirect.strategy || 'remove_old_add_new',
        followChains: opts.redirect.followChains,
        maxChainLength: opts.redirect.maxChainLength,
      })

      // 包裝 providers 以處理轉址
      providers = opts.providers.map((provider) => ({
        getEntries: async () => {
          const entries = await provider.getEntries()
          const entriesArray = Array.isArray(entries) ? entries : await this.toArray(entries)
          return handler.processEntries(entriesArray)
        },
      }))
    }

    const generator = new SitemapGenerator({
      ...opts,
      providers,
      storage,
      filename: opts.filename || 'sitemap.xml',
      shadow: opts.shadow,
    })

    await generator.run()

    console.log(`[OrbitSitemap] Generated sitemap in ${opts.outDir}`)
  }

  /**
   * Generate incremental sitemap updates (static mode only).
   *
   * @param since - Only include items modified since this date.
   * @returns A promise that resolves when incremental generation is complete.
   * @throws {Error} If called in dynamic mode, or if incremental generation is not enabled/configured.
   */
  async generateIncremental(since?: Date): Promise<void> {
    if (this.mode !== 'static') {
      throw new Error('generateIncremental() can only be called in static mode')
    }

    const opts = this.options as StaticSitemapOptions

    if (!opts.incremental?.enabled || !opts.incremental.changeTracker) {
      throw new Error('Incremental generation is not enabled or changeTracker is not configured')
    }

    let storage = opts.storage
    if (!storage) {
      const { DiskSitemapStorage } = await import('./storage/DiskSitemapStorage')
      storage = new DiskSitemapStorage(opts.outDir, opts.baseUrl)
    }

    const incrementalGenerator = new IncrementalGenerator({
      ...opts,
      storage,
      filename: opts.filename || 'sitemap.xml',
      changeTracker: opts.incremental.changeTracker,
      autoTrack: opts.incremental.autoTrack,
      shadow: opts.shadow,
    })

    await incrementalGenerator.generateIncremental(since)
    console.log(`[OrbitSitemap] Generated incremental sitemap in ${opts.outDir}`)
  }

  /**
   * Generate sitemap asynchronously in the background (static mode only).
   *
   * @param options - Options for the async generation job.
   * @returns A promise resolving to the job ID.
   * @throws {Error} If called in dynamic mode.
   */
  async generateAsync(options?: {
    incremental?: boolean
    since?: Date
    onProgress?: (progress: { processed: number; total: number; percentage: number }) => void
    onComplete?: () => void
    onError?: (error: Error) => void
  }): Promise<string> {
    if (this.mode !== 'static') {
      throw new Error('generateAsync() can only be called in static mode')
    }

    const opts = this.options as StaticSitemapOptions
    const jobId = randomUUID()

    let storage = opts.storage
    if (!storage) {
      const { DiskSitemapStorage } = await import('./storage/DiskSitemapStorage')
      storage = new DiskSitemapStorage(opts.outDir, opts.baseUrl)
    }

    // 處理轉址（如果啟用）
    let providers = opts.providers
    if (opts.redirect?.enabled && opts.redirect.manager) {
      const handler = new RedirectHandler({
        manager: opts.redirect.manager,
        strategy: opts.redirect.strategy || 'remove_old_add_new',
        followChains: opts.redirect.followChains,
        maxChainLength: opts.redirect.maxChainLength,
      })

      providers = opts.providers.map((provider) => ({
        getEntries: async () => {
          const entries = await provider.getEntries()
          const entriesArray = Array.isArray(entries) ? entries : await this.toArray(entries)
          return handler.processEntries(entriesArray)
        },
      }))
    }

    // 建立進度追蹤器
    let progressTracker: ProgressTracker | undefined
    if (opts.progressStorage) {
      progressTracker = new ProgressTracker({
        storage: opts.progressStorage,
      })
    }

    // 建立背景任務
    const job = new GenerateSitemapJob({
      jobId,
      generatorOptions: {
        ...opts,
        providers,
        storage,
        filename: opts.filename || 'sitemap.xml',
        shadow: opts.shadow,
      },
      progressTracker,
      onProgress: options?.onProgress,
      onComplete: options?.onComplete,
      onError: options?.onError,
    })

    // 如果配置了 queue，推送到 queue；否則直接執行
    // 這裡假設有 queue 可用（需要從 core 取得）
    // 簡化實作：直接執行
    job.handle().catch((error) => {
      if (options?.onError) {
        options.onError(error)
      }
    })

    return jobId
  }

  /**
   * Install API endpoints for triggering and monitoring sitemap generation.
   *
   * @param core - The PlanetCore instance.
   * @param basePath - The base path for the API endpoints (default: '/admin/sitemap').
   */
  installApiEndpoints(core: PlanetCore, basePath = '/admin/sitemap'): void {
    const opts = this.options as StaticSitemapOptions

    // 觸發生成
    core.router.post(`${basePath}/generate`, async (ctx: GravitoContext) => {
      try {
        const body = (await ctx.req.json().catch(() => ({}))) as {
          incremental?: boolean
          since?: string
        }
        const jobId = await this.generateAsync({
          incremental: body.incremental,
          since: body.since ? new Date(body.since) : undefined,
        })

        return ctx.json({ jobId, status: 'started' })
      } catch (error) {
        return ctx.json({ error: error instanceof Error ? error.message : String(error) }, 500)
      }
    })

    // 查詢進度
    core.router.get(`${basePath}/status/:jobId`, async (ctx: GravitoContext) => {
      const jobId = ctx.req.param('jobId')
      if (!opts.progressStorage) {
        return ctx.json({ error: 'Progress tracking is not enabled' }, 400)
      }
      if (!jobId) {
        return ctx.json({ error: 'Job ID is required' }, 400)
      }

      const progress = await opts.progressStorage.get(jobId)
      if (!progress) {
        return ctx.json({ error: 'Job not found' }, 404)
      }

      return ctx.json(progress)
    })

    // 查詢歷史記錄
    core.router.get(`${basePath}/history`, async (ctx: GravitoContext) => {
      if (!opts.progressStorage) {
        return ctx.json({ error: 'Progress tracking is not enabled' }, 400)
      }

      const limit = Number.parseInt(ctx.req.query('limit') ?? '10', 10)
      const history = await opts.progressStorage.list(limit)

      return ctx.json(history)
    })
  }

  /**
   * Convert an AsyncIterable to an array.
   */
  private async toArray<T>(iterable: AsyncIterable<T>): Promise<T[]> {
    const array: T[] = []
    for await (const item of iterable) {
      array.push(item)
    }
    return array
  }
}
