import { GraphQLScalarType, Kind } from 'graphql'
import { GraphqlError } from '../errors/GraphqlError'
import { GraphqlErrorCodes } from '../errors/codes'

export const URLScalar = new GraphQLScalarType({
  name: 'URL',
  description: 'A field whose value conforms to the standard URL format.',
  serialize(value) {
    return value
  },
  parseValue(value) {
    if (typeof value !== 'string') {
      throw new GraphqlError(GraphqlErrorCodes.INVALID_SCALAR, 'Invalid URL format')
    }
    try {
      new URL(value)
      return value
    } catch {
      throw new GraphqlError(GraphqlErrorCodes.INVALID_SCALAR, 'Invalid URL format')
    }
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new GraphqlError(GraphqlErrorCodes.INVALID_SCALAR, 'Invalid URL format')
    }
    try {
      new URL(ast.value)
      return ast.value
    } catch {
      throw new GraphqlError(GraphqlErrorCodes.INVALID_SCALAR, 'Invalid URL format')
    }
  },
})
