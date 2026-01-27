/**
 * Federation 模組入口
 * 匯出所有 Apollo Federation 2.0 相關功能
 */

export * from './directives'
// 方便使用的工具函數
export {
  externalDirective,
  getFederationDirectives,
  keyDirective,
  providesDirective,
  requiresDirective,
  shareableDirective,
} from './directives'
export * from './entities'

export {
  createEntitiesResolver,
  type EntitiesResolverConfig,
  type EntityReference,
  generateEntitiesQuery,
} from './entities'
