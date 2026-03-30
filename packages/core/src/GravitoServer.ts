import { type GravitoConfig, type GravitoOrbit, PlanetCore } from './PlanetCore'
import { ServiceProvider } from './ServiceProvider'

/**
 * Manifest describing a Gravito application structure.
 * @public
 */
export interface GravitoManifest {
  name: string
  version?: string
  modules: string[]
  config?: GravitoConfig
}

/**
 * Function type for asynchronous module resolution.
 * @public
 */
export type ModuleResolver = () => Promise<unknown>

/**
 * Gravito core boot engine (decoupled).
 */
export class GravitoServer {
  /**
   * Create and assemble a server in one step.
   * @param manifest - Application manifest describing the site structure.
   * @param resolvers - Dictionary of module resolvers.
   * @param baseOrbits - Base orbit modules (e.g., OrbitMonolith).
   */
  static async create(
    manifest: GravitoManifest,
    resolvers: Record<string, ModuleResolver>,
    baseOrbits: (GravitoOrbit | (new () => GravitoOrbit))[] = []
  ): Promise<PlanetCore> {
    const core = new PlanetCore(manifest.config || {})

    // 掛載基礎設施軌道
    for (const Orbit of baseOrbits) {
      core.orbit(Orbit)
    }

    console.log(`
🌌 [Gravito Core] 正在點燃: ${manifest.name} v${manifest.version || '1.0.0'}`)

    for (const moduleId of manifest.modules) {
      const resolver = resolvers[moduleId]
      if (!resolver) {
        continue
      }

      try {
        const exported = await resolver()
        let instance: ServiceProvider

        if (typeof exported === 'function' && exported.prototype instanceof ServiceProvider) {
          instance = new (exported as new () => ServiceProvider)()
        } else if (exported instanceof ServiceProvider) {
          instance = exported
        } else {
          continue
        }

        core.register(instance)
        console.log(`   ✅ 模組點火成功: [${moduleId}]`)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`   ❌ 模組 [${moduleId}] 點火失敗: ${message}`)
      }
    }

    return core
  }
}
