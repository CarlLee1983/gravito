/**
 * OrbitXenon - PlanetCore Integration
 * Integrates Xenon FFI manager into Galaxy Architecture lifecycle
 */

import type { XenonConfig } from './types'
import { XenonManager } from './XenonManager'

/**
 * Configuration for OrbitXenon
 */
export interface OrbitXenonConfig extends XenonConfig {
  /**
   * Key to expose in context (default: 'xenon')
   */
  exposeAs?: string
}

/**
 * Xenon Orbit for PlanetCore
 * Manages FFI manager lifecycle within Galaxy Architecture
 */
export class OrbitXenon {
  name = 'orbit:xenon'
  phase = 'bootstrap'

  private config: OrbitXenonConfig
  private manager: XenonManager | null = null

  constructor(config: OrbitXenonConfig = {}) {
    this.config = {
      exposeAs: 'xenon',
      ...config,
    }
  }

  /**
   * Configure and create OrbitXenon
   * @param config Configuration
   * @returns OrbitXenon instance
   */
  static configure(config: OrbitXenonConfig = {}): OrbitXenon {
    return new OrbitXenon(config)
  }

  /**
   * Initialize orbit (PlanetCore bootstrap phase)
   * Creates XenonManager and registers with context
   * @param ctx PlanetCore context
   */
  async install(ctx: any): Promise<void> {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    this.manager = new XenonManager(this.config)

    // Expose manager in context
    const key = this.config.exposeAs || 'xenon'
    ctx[key] = this.manager
  }

  /**
   * Cleanup phase (PlanetCore shutdown)
   * Closes all resources
   */
  async uninstall(): Promise<void> {
    if (this.manager) {
      this.manager.close()
      this.manager = null
    }
  }

  /**
   * Get the manager instance (for testing/direct access)
   * @returns XenonManager instance
   */
  getManager(): XenonManager | null {
    return this.manager
  }
}
