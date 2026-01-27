import { GraphQLError, GraphQLScalarType, Kind, type ValueNode } from 'graphql'

/**
 * Validates and creates a JavaScript Date object from various input types.
 *
 * @param value - The value to validate (Date, string, or number)
 * @param context - Label for error reporting (e.g., 'serialize', 'parseValue')
 * @returns A valid Date object
 * @throws {GraphQLError} If the value is invalid or cannot be converted to a Date
 *
 * @internal
 */
function validateAndCreateDate(value: unknown, context: string): Date {
  if (value === null || value === undefined) {
    throw new GraphQLError(`DateTime ${context}: Value cannot be null or undefined`)
  }

  let date: Date

  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'string') {
    date = new Date(value)
  } else if (typeof value === 'number') {
    date = new Date(value)
  } else {
    throw new GraphQLError(
      `DateTime ${context}: Expected Date, string, or number, but received ${typeof value}`
    )
  }

  if (Number.isNaN(date.getTime())) {
    throw new GraphQLError(`DateTime ${context}: Invalid date value "${value}"`)
  }

  return date
}

/**
 * Custom DateTime scalar type for Gravito.
 *
 * Handles date and time information as ISO-8601 strings.
 * Supports Date objects, ISO strings, and Unix timestamps (ms) as input.
 * Always serializes to an ISO-8601 string.
 *
 * @example
 * ```graphql
 * query {
 *   posts(where: { created_at: { gt: "2024-01-01T00:00:00Z" } }) {
 *     title
 *   }
 * }
 * ```
 */
export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO-8601 compliant date-time string, e.g., 2024-01-15T10:30:00.000Z',

  /**
   * Serializes an internal Date object or timestamp into an ISO-8601 string.
   */
  serialize(value: unknown): string {
    const date = validateAndCreateDate(value, 'serialize')
    return date.toISOString()
  },

  /**
   * Parses an external variable value (ISO string or timestamp) into a Date object.
   */
  parseValue(value: unknown): Date {
    return validateAndCreateDate(value, 'parseValue')
  },

  /**
   * Parses a GraphQL literal value from the AST into a Date object.
   */
  parseLiteral(ast: ValueNode, _variables?: Record<string, unknown> | null): Date {
    switch (ast.kind) {
      case Kind.STRING:
        return validateAndCreateDate(ast.value, 'parseLiteral')

      case Kind.INT:
        return validateAndCreateDate(parseInt(ast.value, 10), 'parseLiteral')

      default:
        throw new GraphQLError(
          `DateTime parseLiteral: Expected string or integer, but received ${ast.kind}`
        )
    }
  },
})
