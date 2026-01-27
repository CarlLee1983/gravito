import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import { type CollectionConfig, ContentManager } from './ContentManager'
import { ContentWatcher } from './ContentWatcher'
import type { ContentDriver } from './driver/ContentDriver'
import { LocalDriver } from './driver/LocalDriver'

declare module '@gravito/core' {
  interface Variables {
    content: ContentManager
  }
}

/**
 * Configuration for Orbit Monolith (Content Engine).
 * @public
 */
export interface ContentConfig {
  root?: string // Defaults to process.cwd()
  driver?: ContentDriver
  collections?: Record<string, CollectionConfig>
}

/**
 * Orbit Monolith Service.
 * Provides flat-file CMS capabilities to Gravito applications.
 * @public
 */
export class OrbitMonolith implements GravitoOrbit {
  constructor(private config: ContentConfig = {}) {}

  install(core: PlanetCore): void {
    const root = this.config.root || process.cwd()
    let driver: ContentDriver
    let isLocal = false

    if (this.config.driver) {
      driver = this.config.driver
      isLocal = driver instanceof LocalDriver
    } else {
      driver = new LocalDriver(root)
      isLocal = true
    }

    const manager = new ContentManager(driver)

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
      return await next()
    })

    if (process.env.NODE_ENV === 'development' && isLocal) {
      const watcher = new ContentWatcher(manager, root)
      if (this.config.collections) {
        for (const name of Object.keys(this.config.collections)) {
          watcher.watch(name)
        }
      }
      core.logger.info('Orbit Monolith Hot Reload Active 🔥')
    }

    core.logger.info('Orbit Monolith installed ⬛️')
  }
}

export { Schema } from '@gravito/mass'
export * from './ContentManager'
export * from './Controller'
export * from './driver/ContentDriver'
export * from './driver/GitHubDriver'
export * from './driver/LocalDriver'
export * from './FormRequest'
export { RouterHelper as Route } from './Router'
