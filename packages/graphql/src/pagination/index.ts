/**
 * 分頁模組入口
 * 匯出 Relay Connection 分頁功能
 */

export * from './cursor'
// 方便使用的工具函數
export {
  decodeCursor,
  encodeCursor,
  isValidCursor,
} from './cursor'
export * from './relay-connection'

export {
  type Connection,
  type ConnectionArgs,
  createConnectionResolver,
  type Edge,
  generateConnectionQuery,
  generateConnectionTypes,
  type PageInfo,
} from './relay-connection'
