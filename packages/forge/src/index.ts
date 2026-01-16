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
 * Forge configuration options
 */
export interface ForgeConfig extends ForgeServiceConfig {
  /**
   * Expose service as (default: 'forge')
   */
  exposeAs?: string

  /**
   * Status store type
   */
  status?: {
    store?: 'memory' | 'redis'
    ttl?: number
  }

  /**
   * SSE configuration
   */
  sse?: {
    enabled?: boolean
    path?: string // Default: /forge/status/:jobId/stream
  }
}

/**
 * OrbitForge - File Processing Orbit
 *
 * Provides file processing capabilities with real-time status tracking.
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
