import { GraphQLScalarType, Kind } from 'graphql'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const UUIDScalar = new GraphQLScalarType({
  name: 'UUID',
  description: 'A universally unique identifier (UUID) string.',
  serialize(value) {
    return value
  },
  parseValue(value) {
    if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
      throw new Error('Invalid UUID format')
    }
    return value
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING || !UUID_REGEX.test(ast.value)) {
      throw new Error('Invalid UUID format')
    }
    return ast.value
  },
})
