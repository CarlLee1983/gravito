import { GraphQLScalarType, Kind, type ValueNode } from 'graphql'

/**
 * 將 GraphQL AST 節點解析為 JavaScript 值
 * 支援遞迴解析巢狀物件和陣列
 */
function parseLiteralValue(ast: ValueNode, variables: Record<string, unknown> | null): unknown {
  switch (ast.kind) {
    case Kind.STRING:
      // 嘗試解析 JSON 字串
      try {
        return JSON.parse(ast.value)
      } catch {
        return ast.value
      }

    case Kind.INT:
      return parseInt(ast.value, 10)

    case Kind.FLOAT:
      return parseFloat(ast.value)

    case Kind.BOOLEAN:
      return ast.value

    case Kind.NULL:
      return null

    case Kind.LIST:
      return ast.values.map((v) => parseLiteralValue(v, variables))

    case Kind.OBJECT: {
      const obj: Record<string, unknown> = {}
      for (const field of ast.fields) {
        obj[field.name.value] = parseLiteralValue(field.value, variables)
      }
      return obj
    }

    case Kind.VARIABLE:
      return variables?.[ast.name.value]

    default:
      throw new Error(`JSON Scalar: 不支援的 AST 節點類型: ${ast.kind}`)
  }
}

/**
 * JSON 自定義純量
 *
 * 用於處理任意 JSON 資料，支援：
 * - 物件、陣列、字串、數字、布林值、null
 * - 巢狀結構
 * - JSON 字串自動解析
 */
export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: '任意 JSON 值，可以是物件、陣列、字串、數字、布林值或 null',

  /**
   * 序列化：將內部值轉換為輸出格式
   * 從資料庫或程式碼中的值 -> GraphQL 回應
   */
  serialize(value: unknown): unknown {
    // 如果是字串，嘗試解析為 JSON
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }
    return value
  },

  /**
   * 解析值：將變數輸入轉換為內部值
   * GraphQL 變數 -> 程式碼中的值
   */
  parseValue(value: unknown): unknown {
    // 如果是字串，嘗試解析為 JSON
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }
    return value
  },

  /**
   * 解析字面值：將 AST 字面值轉換為內部值
   * GraphQL 查詢中的字面值 -> 程式碼中的值
   */
  parseLiteral(ast: ValueNode, variables: Record<string, unknown> | null): unknown {
    return parseLiteralValue(ast, variables)
  },
})
