/**
 * GraphQL 自定義純量模組
 *
 * 提供三種常用的自定義純量：
 * - JSON：任意 JSON 資料
 * - DateTime：ISO 8601 日期時間
 * - BigInt：大整數
 */

export { BigIntScalar } from './bigint'
export { DateTimeScalar } from './datetime'
export { JSONScalar } from './json'

// 類型定義（供 schema 使用）
export const SCALAR_TYPE_DEFS = `
  """任意 JSON 值，可以是物件、陣列、字串、數字、布林值或 null"""
  scalar JSON

  """ISO 8601 格式的日期時間，如 2024-01-15T10:30:00.000Z"""
  scalar DateTime

  """大整數純量，用於處理超出 JavaScript Number 安全範圍的整數值。以字串形式傳輸以保持精度。"""
  scalar BigInt
`

import { BigIntScalar } from './bigint'
import { DateTimeScalar } from './datetime'
// Resolvers 物件（供 schema 使用）
import { JSONScalar } from './json'

export const SCALAR_RESOLVERS = {
  JSON: JSONScalar,
  DateTime: DateTimeScalar,
  BigInt: BigIntScalar,
}
