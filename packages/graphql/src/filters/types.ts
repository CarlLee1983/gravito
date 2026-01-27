/**
 * 過濾器類型定義
 */

import type { DateFilter, LogicalOperators, NumberFilter, StringFilter } from './operators'

export type { StringFilter, NumberFilter, DateFilter, LogicalOperators }

/**
 * 通用 WHERE 輸入類型
 */
export interface WhereInput {
  _and?: WhereInput[]
  _or?: WhereInput[]
  _not?: WhereInput
  [field: string]: unknown
}

/**
 * ORDER BY 輸入類型
 */
export type OrderDirection = 'asc' | 'desc'

export interface OrderByInput {
  [field: string]: OrderDirection
}

/**
 * 分頁輸入類型
 */
export interface PaginationInput {
  limit?: number
  offset?: number
}

/**
 * Relay Cursor 分頁輸入
 */
export interface ConnectionInput {
  first?: number
  after?: string
  last?: number
  before?: string
}
