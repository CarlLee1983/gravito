import { GraphQLError, GraphQLScalarType, Kind, type ValueNode } from 'graphql'

/**
 * 驗證並建立 Date 物件
 * @throws GraphQLError 如果日期無效
 */
function validateAndCreateDate(value: unknown, context: string): Date {
  if (value === null || value === undefined) {
    throw new GraphQLError(`DateTime ${context}: 值不能為 null 或 undefined`)
  }

  let date: Date

  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'string') {
    date = new Date(value)
  } else if (typeof value === 'number') {
    date = new Date(value)
  } else {
    throw new GraphQLError(`DateTime ${context}: 預期為 Date、字串或數字，但收到 ${typeof value}`)
  }

  // 檢查日期是否有效
  if (Number.isNaN(date.getTime())) {
    throw new GraphQLError(`DateTime ${context}: 無效的日期值 "${value}"`)
  }

  return date
}

/**
 * DateTime 自定義純量
 *
 * 用於處理日期時間資料，支援：
 * - Date 物件
 * - ISO 8601 格式字串
 * - Unix 時間戳（毫秒）
 *
 * 輸出格式：ISO 8601 字串 (如: 2024-01-15T10:30:00.000Z)
 */
export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO 8601 格式的日期時間，如 2024-01-15T10:30:00.000Z',

  /**
   * 序列化：將內部值轉換為 ISO 字串輸出
   * 從資料庫或程式碼中的 Date -> GraphQL 回應中的字串
   */
  serialize(value: unknown): string {
    const date = validateAndCreateDate(value, 'serialize')
    return date.toISOString()
  },

  /**
   * 解析值：將變數輸入轉換為 Date 物件
   * GraphQL 變數 -> 程式碼中的 Date
   */
  parseValue(value: unknown): Date {
    return validateAndCreateDate(value, 'parseValue')
  },

  /**
   * 解析字面值：將 AST 字面值轉換為 Date 物件
   * GraphQL 查詢中的字面值 -> 程式碼中的 Date
   */
  parseLiteral(ast: ValueNode, _variables: Record<string, unknown> | null): Date {
    switch (ast.kind) {
      case Kind.STRING:
        return validateAndCreateDate(ast.value, 'parseLiteral')

      case Kind.INT:
        // 解析為時間戳
        return validateAndCreateDate(parseInt(ast.value, 10), 'parseLiteral')

      default:
        throw new GraphQLError(`DateTime parseLiteral: 預期為字串或整數，但收到 ${ast.kind}`)
    }
  },
})
