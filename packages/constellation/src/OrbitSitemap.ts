import type { GravitoContext, GravitoOrbit, PlanetCore } from '@gravito/core'
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

function sanitizeFilename(value: string): string | null {
  if (!value) {
    return null
  }
  if (value.includes('\0')) {
    return null
  }
  if (value.includes('/') || value.includes('\\')) {
    return null
  }
  if (value.includes('..')) {
    return null
  }
  return value
}

/**
 * Configuration for a dynamically generated sitemap that is built upon request.
 *
 * Useful for small to medium sites where fresh data is critical. Dynamic sitemaps
 * are generated on-the-fly and can be cached at the HTTP level.
 *
 * @public
 * @since 3.0.0
 */
export interface DynamicSitemapOptions extends SitemapStreamOptions {
  /** The URL path where the sitemap will be exposed. @default '/sitemap.xml' */
  path?: string | undefined
  /** List of sitemap entry providers to scan for content. */
  providers: SitemapProvider[]
  /** Cache duration in seconds for the HTTP response. @default undefined (no-cache) */
  cacheSeconds?: number | undefined
  /** Persistence backend for cached XML files. Defaults to MemorySitemapStorage. */
  storage?: SitemapStorage | undefined
  /** Optional distributed lock to prevent "cache stampede" during heavy generation. */
  lock?: SitemapLock | undefined
}

/**
 * Configuration for a statically pre-generated sitemap.
 *
 * Recommended for large sites or high-traffic applications. Static sitemaps
 * are built (usually as part of a build process) and served as static files.
 *
 * @public
 * @since 3.0.0
 */
export interface StaticSitemapOptions extends SitemapStreamOptions {
  /** Local directory where generated XML files will be saved. */
  outDir: string
  /** The name of the root sitemap file. @default 'sitemap.xml' */
  filename?: string | undefined
  /** List of sitemap entry providers to scan for content. */
  providers: SitemapProvider[]
  /** Maximum number of entries per individual sitemap file. @default 50000 */
  maxEntriesPerFile?: number | undefined
  /** Custom storage backend. Defaults to DiskSitemapStorage using `outDir`. */
  storage?: SitemapStorage | undefined
  /** Optional incremental generation settings to only update changed URLs. */
  incremental?: {
    /** Whether to enable incremental builds. */
    enabled: boolean
    /** Backend for tracking structural site changes. */
    changeTracker: ChangeTracker
    /** Whether to automatically record new changes during scan. @default false */
    autoTrack?: boolean
  }
  /** Optional SEO redirect orchestration settings. */
  redirect?: {
    /** Whether to automatically handle 301/302 redirects found in sitemap. */
    enabled: boolean
    /** Backend for managing and resolving redirect rules. */
    manager: RedirectManager
    /** Strategy for resolving conflicting or chained redirects. @default 'remove_old_add_new' */
    strategy?: 'remove_old_add_new' | 'keep_relation' | 'update_url' | 'dual_mark'
    /** Whether to resolve redirect chains into a single jump. @default false */
    followChains?: boolean
    /** Maximum number of redirect jumps to follow. @default 5 */
    maxChainLength?: number
  }
  /** Deployment settings for atomic sitemap updates via shadow staging. */
  shadow?: {
    /** Whether to enable "shadow" (atomic staging) mode. */
    enabled: boolean
    /** The update strategy: 'atomic' (full swap) or 'versioned' (archived). @default 'atomic' */
    mode: 'atomic' | 'versioned'
  }
  /** Persistence backend for long-running job progress tracking. */
  progressStorage?: SitemapProgressStorage
}

/**
 * OrbitSitemap is the enterprise SEO orchestration module for Gravito.
 *
 * It provides advanced sitemap generation supporting large-scale indexing,
 * automatic 301/302 redirect handling, and atomic sitemap deployments.
 *
 * It can operate in two modes:
 * 1. **Dynamic**: Sitemaps are generated on-the-fly and cached.
 * 2. **Static**: Sitemaps are pre-built (e.g., during CI/CD) and served from disk or cloud storage.
 *
 * @example Dynamic Mode
 * ```typescript
 * const sitemap = OrbitSitemap.dynamic({
 *   baseUrl: 'https://example.com',
 *   providers: [new PostSitemapProvider()]
 * });
 * core.addOrbit(sitemap);
 * ```
 *
 * @example Static Mode
 * ```typescript
 * const sitemap = OrbitSitemap.static({
 *   baseUrl: 'https://example.com',
 *   outDir: './public',
 *   shadow: { enabled: true, mode: 'atomic' }
 * });
 * await sitemap.generate();
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class OrbitSitemap implements GravitoOrbit {
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
   * Installs the sitemap module into PlanetCore.
   *
   * @param core - The PlanetCore instance.
   */
  install(core: PlanetCore): void {
    if (this.mode === 'dynamic') {
      this.installDynamic(core)
    } else {
      // Static generation is usually triggered via a build script,
      // but we can also expose a route to trigger it or just log usage.
      core.logger.info('[OrbitSitemap] Static mode configured. Use generate() to build sitemaps.')
    }
  }

  /**
   * Internal method to set up dynamic sitemap routes.
   */
  private installDynamic(core: PlanetCore) {
    const opts = this.options as DynamicSitemapOptions
    const storage = opts.storage ?? new MemorySitemapStorage(opts.baseUrl)
    const indexFilename = opts.path?.split('/').pop() ?? 'sitemap.xml'
    const baseDir = opts.path ? opts.path.substring(0, opts.path.lastIndexOf('/')) : undefined

    const handler = async (ctx: GravitoContext) => {
      // Determine filename from request
      const reqPath = ctx.req.path
      const rawName = reqPath.split('/').pop() || indexFilename
      const filename = sanitizeFilename(rawName)
      if (!filename) {
        return ctx.text('Not Found', 404)
      }
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
   * Generates the sitemap (static mode only).
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

    // Handle redirects (if enabled)
    let providers = opts.providers
    if (opts.redirect?.enabled && opts.redirect.manager) {
      const handler = new RedirectHandler({
        manager: opts.redirect.manager,
        strategy: opts.redirect.strategy || 'remove_old_add_new',
        followChains: opts.redirect.followChains,
        maxChainLength: opts.redirect.maxChainLength,
      })

      // Wrap providers to handle redirects
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
   * Generates incremental sitemap updates (static mode only).
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
   * Generates sitemap asynchronously in the background (static mode only).
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
    const jobId = crypto.randomUUID()

    let storage = opts.storage
    if (!storage) {
      const { DiskSitemapStorage } = await import('./storage/DiskSitemapStorage')
      storage = new DiskSitemapStorage(opts.outDir, opts.baseUrl)
    }

    // Handle redirects (if enabled)
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

    // Create progress tracker
    let progressTracker: ProgressTracker | undefined
    if (opts.progressStorage) {
      progressTracker = new ProgressTracker({
        storage: opts.progressStorage,
      })
    }

    // Create background job
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

    // Execute job asynchronously
    job.handle().catch((error) => {
      if (options?.onError) {
        options.onError(error)
      }
    })

    return jobId
  }

  /**
   * Installs API endpoints for triggering and monitoring sitemap generation.
   *
   * @param core - The PlanetCore instance.
   * @param basePath - The base path for the API endpoints (default: '/admin/sitemap').
   */
  installApiEndpoints(core: PlanetCore, basePath = '/admin/sitemap'): void {
    const opts = this.options as StaticSitemapOptions

    // Trigger generation
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

    // Query progress
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

    // Query history
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
