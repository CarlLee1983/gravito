import type { PlanetCore } from 'gravito-core'
import type { Context } from 'hono'
import { SitemapGenerator } from './core/SitemapGenerator'
import { MemorySitemapStorage } from './storage/MemorySitemapStorage'
import type { SitemapLock, SitemapProvider, SitemapStorage, SitemapStreamOptions } from './types'

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
}

export class OrbitSitemap {
  private options: DynamicSitemapOptions | StaticSitemapOptions
  private mode: 'dynamic' | 'static'

  private constructor(mode: 'dynamic' | 'static', options: any) {
    this.mode = mode
    this.options = options
  }

  static dynamic(options: DynamicSitemapOptions): OrbitSitemap {
    return new OrbitSitemap('dynamic', {
      path: '/sitemap.xml',
      ...options,
    })
  }

  static static(options: StaticSitemapOptions): OrbitSitemap {
    return new OrbitSitemap('static', {
      filename: 'sitemap.xml',
      ...options,
    })
  }

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
    const indexFilename = opts.path!.split('/').pop()!
    const baseDir = opts.path!.substring(0, opts.path!.lastIndexOf('/'))

    const handler = async (ctx: Context) => {
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
            return ctx.text('Generating...', 503, { 'Retry-After': '5' })
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
          if (opts.lock) await opts.lock.release(filename)
        }

        content = await storage.read(filename)
      }

      if (!content) {
        // If it's a shard and missing, return 404.
        // If index is missing after generation attempt, return 404 (or 500?)
        return ctx.text('Not Found', 404)
      }

      return ctx.body(content, 200, {
        'Content-Type': 'application/xml',
        'Cache-Control': opts.cacheSeconds ? `public, max-age=${opts.cacheSeconds}` : 'no-cache',
      })
    }

    // Register Index Route
    core.router.get(opts.path!, handler)

    // Register Shard Route (e.g., sitemap-1.xml)
    // We assume shards are in same directory and follow pattern {basename}-*.xml
    // Hono pattern: /path/basename-:shard.xml
    const basename = indexFilename.replace('.xml', '')
    const shardRoute = `${baseDir}/${basename}-:shard.xml`
    core.router.get(shardRoute, handler)
  }

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

    const generator = new SitemapGenerator({
      ...opts,
      storage,
      filename: opts.filename || 'sitemap.xml',
    })

    await generator.run()

    console.log(`[OrbitSitemap] Generated sitemap in ${opts.outDir}`)
  }
}
