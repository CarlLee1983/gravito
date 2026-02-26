/**
 * @gravito/ether - HTML Rewriter 核心入口
 * Bun 原生 HTMLRewriter API 的型別系統和封裝
 *
 * Phase 1: 核心 HTML 轉換引擎
 * - Phase 1.1: 核心型別與基礎結構
 * - Phase 1.2: EtherRewriter 實作
 * - Phase 1.3: 轉換規則（Security、Sanitize、Link）
 * - Phase 1.4: 管道系統與公開導出
 */

export { EtherPipeline } from './core/EtherPipeline'

// 核心類導出
export { EtherRewriter } from './core/EtherRewriter'
export { EtherService } from './core/EtherService'
// 核心型別導出
export type {
  Comment,
  Doctype,
  DocumentRule,
  Element,
  End,
  EndTag,
  EtherConfig,
  PipelineConfig,
  PipelineContext,
  Text,
  TransformRule,
} from './core/types'
export { DocumentHandler, RuleBasedDocumentHandler } from './handlers/DocumentHandler'
// 處理器基礎類導出
export { ElementHandler, RuleBasedElementHandler } from './handlers/ElementHandler'
export { RuleBasedTextHandler, TextHandler } from './handlers/TextHandler'
// Middleware 導出 (Phase 2.2)
export {
  type CSPMiddlewareOptions,
  cspMiddleware,
  type EtherMiddlewareOptions,
  etherMiddleware,
} from './middleware'
export {
  createInjectRule,
  type InjectRuleOptions,
} from './rules/InjectRule'
export {
  createLinkRule,
  type LinkRuleOptions,
} from './rules/LinkRule'
export {
  createSanitizeRule,
  type SanitizeRuleOptions,
} from './rules/SanitizeRule'
// 預定義規則導出
export {
  createSecurityRule,
  type SecurityRuleOptions,
} from './rules/SecurityRule'
export {
  createSeoRule,
  type SeoRuleOptions,
} from './rules/SeoRule'
