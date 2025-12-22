import type { GravitoOrbit, PlanetCore } from 'gravito-core'
import { type CollectionConfig, ContentManager } from './ContentManager'

declare module 'gravito-core' {
  interface Variables {
    content: ContentManager
  }
}

export interface ContentConfig {
  root?: string // Defaults to process.cwd()
  collections?: Record<string, CollectionConfig>
}

export class OrbitMonolith implements GravitoOrbit {
  constructor(private config: ContentConfig = {}) {}

  install(core: PlanetCore): void {
    const root = this.config.root || process.cwd()
    const manager = new ContentManager(root)

    // Register Collections from Config
    if (this.config.collections) {
      for (const [name, config] of Object.entries(this.config.collections)) {
        manager.defineCollection(name, config)
      }
    }

    // Register Default 'docs' and 'blog' if folders exist?
    // Let's stick to explicit configuration for now to avoid magic.

    // Inject into request context
    core.adapter.use('*', async (c, next) => {
      c.set('content', manager)
      await next()
      return undefined
    })

    core.logger.info('Orbit Monolith installed ⬛️')
  }
}

export * from './ContentManager'
