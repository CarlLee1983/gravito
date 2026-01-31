import type { AstralRoute } from './OpenApiGenerator'

/**
 * 路由索引，提供 O(1) 的前綴查詢
 * 用於優化大量路由的匹配效能
 *
 * @public
 * @since 3.1.0
 */
export class RouteIndex {
  /** 精確路徑 -> 路由列表 */
  private exactIndex = new Map<string, AstralRoute[]>()
  /** 前綴 -> 路由列表（用於子路徑匹配） */
  private prefixIndex = new Map<string, AstralRoute[]>()

  constructor(routes: AstralRoute[]) {
    this.buildIndex(routes)
  }

  /**
   * 建立路由索引
   * 時間複雜度: O(N * M)，其中 N 是路由數量，M 是平均路徑深度
   *
   * @param routes - 路由陣列
   * @private
   */
  private buildIndex(routes: AstralRoute[]): void {
    for (const route of routes) {
      // 精確路徑索引
      if (!this.exactIndex.has(route.path)) {
        this.exactIndex.set(route.path, [])
      }
      this.exactIndex.get(route.path)?.push(route)

      // 前綴索引（處理巢狀路由）
      // 例如 /api/users/posts 會建立索引：/api, /api/users, /api/users/posts
      const segments = route.path.split('/').filter(Boolean)
      let prefix = ''
      for (const segment of segments) {
        prefix += `/${segment}`
        if (!this.prefixIndex.has(prefix)) {
          this.prefixIndex.set(prefix, [])
        }
        this.prefixIndex.get(prefix)?.push(route)
      }
    }
  }

  /**
   * 根據資源路徑找到所有匹配的路由
   * 時間複雜度: O(1) - 直接從索引中查詢
   *
   * @param resourcePath - 資源路徑前綴
   * @returns 匹配的路由陣列
   * @public
   */
  findByPrefix(resourcePath: string): AstralRoute[] {
    // 處理空前綴
    if (!resourcePath || resourcePath === '') {
      return []
    }

    const exactMatches = this.exactIndex.get(resourcePath) || []
    const prefixMatches = this.prefixIndex.get(resourcePath) || []

    // 合併並去重
    const seen = new Set<string>()
    const result: AstralRoute[] = []

    for (const route of [...exactMatches, ...prefixMatches]) {
      const key = `${route.method}:${route.path}:${route.name || ''}:${route.domain || ''}`
      if (!seen.has(key) && this.isValidMatch(route.path, resourcePath)) {
        seen.add(key)
        result.push(route)
      }
    }

    return result
  }

  /**
   * 驗證路由是否真正匹配資源路徑
   * 避免假陽性（例如 /users 不應該匹配到 /users2）
   *
   * @param routePath - 路由路徑
   * @param resourcePath - 資源路徑
   * @returns 是否匹配
   * @private
   */
  private isValidMatch(routePath: string, resourcePath: string): boolean {
    // 完全匹配
    if (routePath === resourcePath) {
      return true
    }

    // 路由路徑必須以資源路徑開頭
    if (!routePath.startsWith(resourcePath)) {
      return false
    }

    // 檢查剩餘部分是否以 / 開頭（確保是路徑分隔符）
    const remainder = routePath.slice(resourcePath.length)
    return remainder.startsWith('/')
  }
}
