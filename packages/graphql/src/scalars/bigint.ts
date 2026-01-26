import { GraphQLError, GraphQLScalarType, Kind, type ValueNode } from 'graphql'

/**
 * 驗證並轉換為 BigInt
 * @throws GraphQLError 如果值無效
 */
function validateAndCreateBigInt(value: unknown, context: string): bigint {
  if (value === null || value === undefined) {
    throw new GraphQLError(`BigInt ${context}: 值不能為 null 或 undefined`)
  }

  // 已經是 bigint
  if (typeof value === 'bigint') {
    return value
  }

  // 數字
  if (typeof value === 'number') {
    // 檢查是否為整數
    if (!Number.isInteger(value)) {
      throw new GraphQLError(`BigInt ${context}: 數字必須是整數，但收到 ${value}`)
    }
    return BigInt(value)
  }

  // 字串
  if (typeof value === 'string') {
    // 檢查是否包含小數點
    if (value.includes('.')) {
      throw new GraphQLError(`BigInt ${context}: 值必須是整數，不能包含小數點`)
    }

    try {
      return BigInt(value)
    } catch {
      throw new GraphQLError(`BigInt ${context}: 無法將 "${value}" 轉換為 BigInt`)
    }
  }

  throw new GraphQLError(`BigInt ${context}: 預期為 bigint、整數或數字字串，但收到 ${typeof value}`)
}

/**
 * BigInt 自定義純量
 *
 * 用於處理超出 JavaScript Number 安全範圍的大整數
 * (超過 Number.MAX_SAFE_INTEGER 即 9007199254740991)
 *
 * 輸入格式：bigint、整數、數字字串
 * 輸出格式：字串（避免精度損失）
 */
export const BigIntScalar = new GraphQLScalarType({
  name: 'BigInt',
  description:
    '大整數純量，用於處理超出 JavaScript Number 安全範圍的整數值。以字串形式傳輸以保持精度。',

  /**
   * 序列化：將內部值轉換為字串輸出
   * 從資料庫或程式碼中的 bigint -> GraphQL 回應中的字串
   */
  serialize(value: unknown): string {
    const bigintValue = validateAndCreateBigInt(value, 'serialize')
    return bigintValue.toString()
  },

  /**
   * 解析值：將變數輸入轉換為 bigint
   * GraphQL 變數 -> 程式碼中的 bigint
   */
  parseValue(value: unknown): bigint {
    return validateAndCreateBigInt(value, 'parseValue')
  },

  /**
   * 解析字面值：將 AST 字面值轉換為 bigint
   * GraphQL 查詢中的字面值 -> 程式碼中的 bigint
   */
  parseLiteral(ast: ValueNode, _variables: Record<string, unknown> | null): bigint {
    switch (ast.kind) {
      case Kind.STRING:
        return validateAndCreateBigInt(ast.value, 'parseLiteral')

      case Kind.INT:
        // GraphQL INT 在 AST 中是字串形式
        return BigInt(ast.value)

      default:
        throw new GraphQLError(`BigInt parseLiteral: 預期為字串或整數，但收到 ${ast.kind}`)
    }
  },
})
