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
 * Gravito 核心啟動引擎 (已解耦)
 */
export class GravitoServer {
  /**
   * 一鍵建立並組裝伺服器
   * @param manifest 站點描述清單
   * @param resolvers 模組解析器字典
   * @param baseOrbits 基礎軌道模組 (例如 OrbitMonolith)
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
