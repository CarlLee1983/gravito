import { type GravitoConfig, PlanetCore } from './PlanetCore'
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
export type ModuleResolver = () => Promise<any>
/**
 * Gravito 核心啟動引擎 (已解耦)
 */
export declare class GravitoServer {
  /**
   * 一鍵建立並組裝伺服器
   * @param manifest 站點描述清單
   * @param resolvers 模組解析器字典
   * @param baseOrbits 基礎軌道模組 (例如 OrbitMonolith)
   */
  static create(
    manifest: GravitoManifest,
    resolvers: Record<string, ModuleResolver>,
    baseOrbits?: any[]
  ): Promise<PlanetCore>
}
