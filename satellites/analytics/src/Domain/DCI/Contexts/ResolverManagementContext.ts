import type { IMetricResolver } from '../../Contracts/IAnalyticsResolver'
import type { MetricId } from '../../ValueObjects/MetricId'
import { injectResolverRegistry, type ResolverRegistry } from '../Roles/ResolverRegistryRole'

/**
 * ResolverManagementContext - 管理解析器的生命週期
 * 責任：
 * - 初始化 resolver 儲存層
 * - 向 registry 註冊新 resolver
 * - 列出已註冊的指標
 */
export class ResolverManagementContext {
  private storage: Map<string, IMetricResolver> = new Map()
  private registry: ResolverRegistry

  constructor(initialResolvers?: IMetricResolver[]) {
    this.registry = injectResolverRegistry(this.storage)

    if (initialResolvers && initialResolvers.length > 0) {
      for (const resolver of initialResolvers) {
        this.registerResolver(resolver)
      }
    }
  }

  /**
   * 向 registry 註冊新的 resolver
   * @throws AnalyticsError 如果 metric 已被註冊
   */
  registerResolver(resolver: IMetricResolver): void {
    this.registry.register(resolver)
  }

  /**
   * 取得已註冊的所有指標 ID
   */
  listMetrics(): MetricId[] {
    return this.registry.getAll()
  }

  /**
   * 取得 registry 供 Context 使用
   * @internal
   */
  getRegistry(): ResolverRegistry {
    return this.registry
  }
}
