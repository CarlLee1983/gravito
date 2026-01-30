import type { OpenAPIV3_1 } from 'openapi-types'
import type { AstralRoute } from './OpenApiGenerator'

/**
 * 快取管理器，用於快取 OpenAPI 規格生成結果
 * 透過路由指紋檢測來判斷快取是否有效
 *
 * @public
 * @since 3.1.0
 */
export class SpecCache {
  /** 快取的 OpenAPI 規格 */
  private cachedSpec: OpenAPIV3_1.Document | null = null
  /** 路由指紋，用於檢測路由變化 */
  private routeFingerprint = ''

  /**
   * 產生路由的指紋（用於檢測變化）
   * 使用排序後的 method:path:name:domain 組合來確保順序無關
   *
   * @param routes - 路由陣列
   * @returns 路由指紋字串
   * @private
   */
  private computeFingerprint(routes: AstralRoute[]): string {
    const sorted = [...routes].sort((a, b) => {
      const aKey = `${a.method}:${a.path}:${a.name || ''}:${a.domain || ''}`
      const bKey = `${b.method}:${b.path}:${b.name || ''}:${b.domain || ''}`
      return aKey.localeCompare(bKey)
    })

    return sorted.map((r) => `${r.method}:${r.path}:${r.name || ''}:${r.domain || ''}`).join('|')
  }

  /**
   * 取得快取的 spec（若存在且有效）
   *
   * @param routes - 當前路由陣列
   * @returns 快取的 OpenAPI 文件，若不存在或已失效則返回 null
   * @public
   */
  get(routes: AstralRoute[]): OpenAPIV3_1.Document | null {
    const fingerprint = this.computeFingerprint(routes)
    if (fingerprint === this.routeFingerprint && this.cachedSpec !== null) {
      return this.cachedSpec
    }
    return null
  }

  /**
   * 設定快取
   *
   * @param routes - 路由陣列
   * @param spec - OpenAPI 規格文件
   * @public
   */
  set(routes: AstralRoute[], spec: OpenAPIV3_1.Document): void {
    this.routeFingerprint = this.computeFingerprint(routes)
    this.cachedSpec = spec
  }

  /**
   * 清除快取
   *
   * @public
   */
  invalidate(): void {
    this.cachedSpec = null
    this.routeFingerprint = ''
  }
}
