import { GraphQLScalarType, Kind, type ValueNode } from 'graphql'
import { GraphqlError } from '../errors/GraphqlError'
import { GraphqlErrorCodes } from '../errors/codes'

/**
 * Parses a GraphQL AST node into a plain JavaScript value.
 *
 * Recursively traverses object and list nodes to reconstruct the original data structure.
 *
 * @param ast - The GraphQL AST node to parse
 * @param variables - Optional variables for resolving referenced variables in the AST
 * @returns The parsed JavaScript value (object, array, string, number, etc.)
 * @throws {Error} If an unsupported AST node kind is encountered
 *
 * @internal
 */
function parseLiteralValue(ast: ValueNode, variables?: Record<string, unknown> | null): unknown {
  switch (ast.kind) {
    case Kind.STRING:
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
      throw new GraphqlError(
        GraphqlErrorCodes.UNSUPPORTED_AST_NODE,
        `JSON Scalar: Unsupported AST node kind: ${ast.kind}`
      )
  }
}

/**
 * Custom JSON scalar type for Gravito.
 *
 * Handles arbitrary JSON structures including nested objects and arrays.
 * Automatically attempts to parse strings as JSON for better compatibility
 * with various database drivers.
 *
 * @example
 * ```graphql
 * mutation {
 *   updateSettings(data: { theme: "dark", notifications: true })
 * }
 * ```
 */
export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value (object, array, string, number, boolean, or null)',

  /**
   * Serializes an internal value into a JSON-compatible format for output.
   */
  serialize(value: unknown): unknown {
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
   * Parses an external variable value into its internal representation.
   */
  parseValue(value: unknown): unknown {
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
   * Parses a GraphQL literal value from the AST.
   */
  parseLiteral(ast: ValueNode, variables?: Record<string, unknown> | null): unknown {
    return parseLiteralValue(ast, variables)
  },
})
