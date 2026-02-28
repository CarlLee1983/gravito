import type { ResolverManagementContext } from '../../Domain/DCI/Contexts/ResolverManagementContext'

/**
 * ListMetrics UseCase - 列出所有可用的指標
 * 薄殼委派模式：取得 management context 中的指標列表並轉換為字串陣列
 */
export class ListMetrics {
  constructor(private managementContext: ResolverManagementContext) {}

  execute(): string[] {
    return this.managementContext.listMetrics().map((metricId) => metricId.value)
  }
}
