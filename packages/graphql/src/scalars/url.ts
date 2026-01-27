import { GraphQLScalarType, Kind } from 'graphql'

export const URLScalar = new GraphQLScalarType({
  name: 'URL',
  description: 'A field whose value conforms to the standard URL format.',
  serialize(value) {
    return value
  },
  parseValue(value) {
    if (typeof value !== 'string') {
      throw new Error('Invalid URL format')
    }
    try {
      new URL(value)
      return value
    } catch {
      throw new Error('Invalid URL format')
    }
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new Error('Invalid URL format')
    }
    try {
      new URL(ast.value)
      return ast.value
    } catch {
      throw new Error('Invalid URL format')
    }
  },
})
