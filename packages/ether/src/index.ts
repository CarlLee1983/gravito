/**
 * @gravito/ether - HTML Rewriter 核心入口
 * Bun 原生 HTMLRewriter API 的型別系統和封裝
 *
 * 階段 1.1 ：核心型別與基礎處理器
 * 詳細實作見 Phase 1.2-1.4
 */

// 核心型別導出
export type {
  TransformRule,
  DocumentRule,
  PipelineConfig,
  PipelineContext,
  EtherConfig,
  Element,
  Text,
  Comment,
  Doctype,
  EndTag,
  End,
} from './core/types'

// 處理器基礎類導出
export { ElementHandler, RuleBasedElementHandler } from './handlers/ElementHandler'
export { TextHandler, RuleBasedTextHandler } from './handlers/TextHandler'
export { DocumentHandler, RuleBasedDocumentHandler } from './handlers/DocumentHandler'
