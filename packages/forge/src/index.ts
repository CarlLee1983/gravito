/**
 * @fileoverview @gravito/forge - File Processing Orbit
 */

import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import type { StorageProvider } from '@gravito/nebula'
import type { ForgeServiceConfig } from './ForgeService'
import { ForgeService } from './ForgeService'
import { SSEHandler } from './status/SSEHandler'
import { MemoryStatusStore } from './status/StatusStore'

/**
 * Full configuration for the Forge file processing orbit.
 * @public
 */
export interface ForgeConfig extends ForgeServiceConfig {
  /**
   * The key used to expose the service in the context (default: 'forge').
   * Allows accessing the service via `ctx.get('forge')`.
   */
  exposeAs?: string

  /** Configuration for the job status persistence layer */
  status?: {
    /** The storage backend type (default: 'memory') */
    store?: 'memory' | 'redis'
    /** Time-to-live for status records in seconds */
    ttl?: number
  }

  /** Server-Sent Events (SSE) configuration for real-time progress tracking */
  sse?: {
    /** Whether to enable the SSE status endpoint (default: true) */
    enabled?: boolean
    /** Custom URL path for status streaming. Use ':jobId' as a placeholder. */
    path?: string
  }
}

/**
 * OrbitForge is the official asset processing and media engine for Gravito.
 * It provides a unified API for image manipulation, video transcoding, and
 * document processing with integrated real-time status tracking via SSE.
 *
 * @example
 * ```typescript
 * const forge = new OrbitForge({
 *   image: { driver: 'sharp' },
 *   video: { driver: 'ffmpeg' }
 * });
 * core.addOrbit(forge);
 * ```
 * @public
 */
export class OrbitForge implements GravitoOrbit {
  constructor(private options?: ForgeConfig) {}

  /**
   * Install the orbit into PlanetCore
   */
  install(core: PlanetCore): void {
    const config = this.options || core.config.get<ForgeConfig>('forge')
    const { exposeAs = 'forge' } = config || {}

    core.logger.info(`[OrbitForge] Initializing File Processing (Exposed as: ${exposeAs})`)

    // Create status store
    const statusStore = config?.statusStore || new MemoryStatusStore()

    // Create forge service
    const forgeService = new ForgeService({
      statusStore,
      video: config?.video,
      image: config?.image,
    })

    // Inject forge service into context via middleware
    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      // Try to get storage from context (Nebula)
      const storageProvider = c.get('storage') as StorageProvider | undefined
      if (storageProvider) {
        // Update forge service with storage
        forgeService.setStorage(storageProvider)
      }

      c.set(exposeAs, forgeService)
      return await next()
    })

    // Register in core container for global access (CLI, Jobs)
    core.container.instance(exposeAs, forgeService)

    // Register SSE endpoint if enabled
    if (config?.sse?.enabled !== false) {
      const ssePath = config?.sse?.path || '/forge/status/:jobId/stream'
      const sseHandler = new SSEHandler(statusStore)

      core.router.get(ssePath, async (c: GravitoContext) => {
        const jobId = c.req.param('jobId')
        if (!jobId) {
          return c.json({ error: 'Job ID is required' }, 400)
        }
        return sseHandler.createStream(jobId)
      })

      core.logger.info(`[OrbitForge] SSE endpoint registered at ${ssePath}`)
    }

    // Trigger hook
    core.hooks.doAction('forge:init', forgeService)
  }
}

export { FFmpegAdapter } from './adapters/FFmpegAdapter'
export { ImageMagickAdapter } from './adapters/ImageMagickAdapter'
export type { AdapterOptions, ProcessorAdapter } from './adapters/ProcessorAdapter'
export type { ForgeServiceConfig } from './ForgeService'
// Export all types and classes
export { ForgeService } from './ForgeService'
export type { ProcessFileJobData } from './jobs/ProcessFileJob'
export { ProcessFileJob } from './jobs/ProcessFileJob'
export { BasePipeline } from './pipelines/BasePipeline'
export { ImagePipeline } from './pipelines/ImagePipeline'
export type { Pipeline, PipelineStep } from './pipelines/Pipeline'
export { VideoPipeline } from './pipelines/VideoPipeline'
export { ImageProcessor } from './processors/ImageProcessor'
export { VideoProcessor } from './processors/VideoProcessor'
export type { StatusChangeCallback } from './status/ProcessingStatus'
export { ProcessingStatusManager } from './status/ProcessingStatus'
export { SSEHandler } from './status/SSEHandler'
export type { StatusStore } from './status/StatusStore'
export { MemoryStatusStore } from './status/StatusStore'
export type {
  FileInput,
  FileOutput,
  PackageResultsOptions,
  PackageResultsOutput,
  ProcessingProgress,
  ProcessingStatus,
  ProcessOptions,
} from './types'

// Module augmentation for GravitoVariables
declare module '@gravito/core' {
  interface GravitoVariables {
    /** Forge service for file processing */
    forge?: ForgeService
  }
}
