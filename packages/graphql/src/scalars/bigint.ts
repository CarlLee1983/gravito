import { GraphQLError, GraphQLScalarType, Kind, type ValueNode } from 'graphql'

/**
 * Validates and converts various input types into a JavaScript BigInt.
 *
 * @param value - The value to validate (bigint, number, or string)
 * @param context - Label for error reporting (e.g., 'serialize', 'parseValue')
 * @returns A valid bigint
 * @throws {GraphQLError} If the value is invalid or cannot be converted to a BigInt
 *
 * @internal
 */
function validateAndCreateBigInt(value: unknown, context: string): bigint {
  if (value === null || value === undefined) {
    throw new GraphQLError(`BigInt ${context}: Value cannot be null or undefined`)
  }

  if (typeof value === 'bigint') {
    return value
  }

  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new GraphQLError(`BigInt ${context}: Number must be an integer, but received ${value}`)
    }
    return BigInt(value)
  }

  if (typeof value === 'string') {
    if (value.includes('.')) {
      throw new GraphQLError(
        `BigInt ${context}: Value must be an integer, cannot contain a decimal point`
      )
    }

    try {
      return BigInt(value)
    } catch {
      throw new GraphQLError(`BigInt ${context}: Cannot convert "${value}" to BigInt`)
    }
  }

  throw new GraphQLError(
    `BigInt ${context}: Expected bigint, integer, or numeric string, but received ${typeof value}`
  )
}

/**
 * Custom BigInt scalar type for Gravito.
 *
 * Used for handling large integers that exceed the safe range for JavaScript Numbers
 * (above Number.MAX_SAFE_INTEGER: 9,007,199,254,740,991).
 *
 * Transmitted as a string to prevent precision loss in transit.
 *
 * @example
 * ```graphql
 * query {
 *   statistics {
 *     largeCounter # BigInt scalar
 *   }
 * }
 * ```
 */
export const BigIntScalar = new GraphQLScalarType({
  name: 'BigInt',
  description: 'A large integer that exceeds the safe range for Numbers. Transmitted as a string.',

  /**
   * Serializes an internal bigint into a string representation.
   */
  serialize(value: unknown): string {
    const bigintValue = validateAndCreateBigInt(value, 'serialize')
    return bigintValue.toString()
  },

  /**
   * Parses an external variable value into a bigint.
   */
  parseValue(value: unknown): bigint {
    return validateAndCreateBigInt(value, 'parseValue')
  },

  /**
   * Parses a GraphQL literal value from the AST into a bigint.
   */
  parseLiteral(ast: ValueNode, _variables?: Record<string, unknown> | null): bigint {
    switch (ast.kind) {
      case Kind.STRING:
        return validateAndCreateBigInt(ast.value, 'parseLiteral')

      case Kind.INT:
        return BigInt(ast.value)

      default:
        throw new GraphQLError(
          `BigInt parseLiteral: Expected string or integer, but received ${ast.kind}`
        )
    }
  },
})
