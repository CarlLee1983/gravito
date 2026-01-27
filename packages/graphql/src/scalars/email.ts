import { GraphQLScalarType, Kind } from 'graphql'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export const EmailScalar = new GraphQLScalarType({
  name: 'Email',
  description: 'A field whose value conforms to the standard internet email address format.',
  serialize(value) {
    return value
  },
  parseValue(value) {
    if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
      throw new Error('Invalid email format')
    }
    return value
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING || !EMAIL_REGEX.test(ast.value)) {
      throw new Error('Invalid email format')
    }
    return ast.value
  },
})
