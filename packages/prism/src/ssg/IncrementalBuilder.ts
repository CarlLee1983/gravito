/**
 * IncrementalBuilder - Logic for incremental static exports.
 *
 * Optimizes the build process by tracking content hashes and only rebuilding
 * pages that have changed. Maintains a build manifest to persist state between builds.
 *
 * Key features:
 * - **Content Hashing**: Detects changes in data or template output.
 * - **Manifest persistence**: Tracks build history in `.build-manifest.json`.
 * - **Smart Skipping**: Skips generation for unchanged routes.
 *
 * @public
 * @since 3.1.0
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { PlanetCore } from '@gravito/core'

/**
 * Structure of the build manifest file.
 */
interface BuildManifest {
  version: string
  baseUrl: string
  buildTime: number
  pages: Record<string, PageEntry>
}

/**
 * Entry for a single page in the manifest.
 */
interface PageEntry {
  path: string
  hash: string
  sourceHash: string
  lastBuilt: number
  size: number
}

/**
 * Options for the incremental builder.
 */
interface IncrementalOptions {
  /** Force a full rebuild, ignoring the manifest. */
  force?: boolean
  /** Custom path for the manifest file. */
  manifestPath?: string
  /** Number of concurrent workers. */
  concurrency?: number
  /** Request timeout in milliseconds. */
  timeout?: number
}

/**
 * IncrementalBuilder manages the stateful export process.
 *
 * @example
 * ```typescript
 * const builder = new IncrementalBuilder(core, './dist');
 * const stats = await builder.export(routes, 'https://example.com');
 * console.log(`Built ${stats.built} pages.`);
 * ```
 */
export class IncrementalBuilder {
  private manifest: BuildManifest | null = null
  private manifestPath: string

  /**
   * Create a new IncrementalBuilder.
   *
   * @param core - PlanetCore instance.
   * @param outputDir - Directory for build output.
   * @param options - Configuration options.
   */
  constructor(
    private core: PlanetCore,
    private outputDir: string,
    options: IncrementalOptions = {}
  ) {
    this.manifestPath = options.manifestPath ?? `${outputDir}/.build-manifest.json`
  }

  private loadManifest(): BuildManifest {
    if (this.manifest) return this.manifest

    if (!existsSync(this.manifestPath)) {
      return this.createEmptyManifest()
    }

    try {
      const content = readFileSync(this.manifestPath, 'utf-8')
      this.manifest = JSON.parse(content)
      return this.manifest!
    } catch {
      this.core.logger.warn('[IncrementalBuilder] Failed to load manifest, creating new one')
      return this.createEmptyManifest()
    }
  }

  private createEmptyManifest(): BuildManifest {
    this.manifest = {
      version: '1.0',
      baseUrl: '',
      buildTime: Date.now(),
      pages: {},
    }
    return this.manifest
  }

  private saveManifest(): void {
    if (!this.manifest) return

    this.manifest.buildTime = Date.now()
    writeFileSync(this.manifestPath, JSON.stringify(this.manifest, null, 2), 'utf-8')
    this.core.logger.info(`[IncrementalBuilder] Manifest saved: ${this.manifestPath}`)
  }

  private computeHash(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16)
  }

  private needsRebuild(path: string, sourceHash: string): boolean {
    if (!this.manifest?.pages[path]) {
      return true
    }

    const existing = this.manifest.pages[path]

    if (existing.sourceHash !== sourceHash) {
      this.core.logger.debug(`[IncrementalBuilder] Source changed: ${path}`)
      return true
    }

    return false
  }

  /**
   * Execute the incremental export.
   *
   * @param routes - List of routes to process.
   * @param baseUrl - Site base URL.
   * @param options - Build options.
   * @returns Statistics about the build (built, skipped, failed counts).
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
          const data = route.getData ? await route.getData() : {}
          const dataString = JSON.stringify(data)
          const sourceHash = this.computeHash(dataString)

          if (!force && !this.needsRebuild(route.path, sourceHash)) {
            skipped++
            this.core.logger.debug(
              `[IncrementalBuilder] ⏭️  Skipped (${built + skipped + failed}/${total}): ${route.path}`
            )
            continue
          }

          const url = `http://localhost${route.path}`
          const request = new Request(url, {
            signal: AbortSignal.timeout(timeout),
          })

          const response = await this.core.adapter.fetch(request)

          let html: string

          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('Location')
            if (location) {
              html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${location}"></head><body>Redirecting to <a href="${location}">${location}</a>...</body></html>`
              this.core.logger.info(
                `[IncrementalBuilder] ↪️  Redirect (${built + skipped + failed}/${total}): ${route.path} -> ${location}`
              )
            } else {
              this.core.logger.warn(
                `[IncrementalBuilder] ⚠️  Redirect without Location header ${route.path}: Status ${response.status}`
              )
              failed++
              continue
            }
          } else if (!response.ok) {
            this.core.logger.warn(
              `[IncrementalBuilder] ⚠️  Failed ${route.path}: Status ${response.status}`
            )
            failed++
            continue
          } else {
            html = await response.text()
          }

          const contentHash = this.computeHash(html)

          const pathWithoutQuery = route.path.split('?')[0]
          let relativePath =
            pathWithoutQuery === '/'
              ? 'index.html'
              : `${pathWithoutQuery.replace(/^\//, '')}/index.html`

          if (pathWithoutQuery.endsWith('.html')) {
            relativePath = pathWithoutQuery.replace(/^\//, '')
          }

          const absolutePath = join(this.outputDir, relativePath)
          await mkdir(dirname(absolutePath), { recursive: true })
          await writeFile(absolutePath, html, 'utf-8')

          manifest.pages[route.path] = {
            path: route.path,
            hash: contentHash,
            sourceHash,
            lastBuilt: Date.now(),
            size: Buffer.byteLength(html, 'utf-8'),
          }

          built++
          this.core.logger.info(
            `[IncrementalBuilder] ✅ Built (${built + skipped + failed}/${total}): ${route.path}`
          )
        } catch (error: any) {
          failed++
          this.core.logger.error(`[IncrementalBuilder] ❌ Failed ${route.path}: ${error.message}`)
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker())
    await Promise.all(workers)

    this.saveManifest()

    this.core.logger.info(
      `[IncrementalBuilder] Build complete! Built: ${built}, Skipped: ${skipped}, Failed: ${failed}`
    )

    return { built, skipped, failed }
  }

  /**
   * Get statistics from the current manifest.
   *
   * @returns Stats object including total pages, size, and build times.
   */
  getStats() {
    const manifest = this.loadManifest()
    const pages = Object.values(manifest.pages)

    return {
      totalPages: pages.length,
      totalSize: pages.reduce((sum, p) => sum + p.size, 0),
      lastBuild: manifest.buildTime,
      oldestPage: Math.min(...pages.map((p) => p.lastBuilt)),
      newestPage: Math.max(...pages.map((p) => p.lastBuilt)),
    }
  }
}
