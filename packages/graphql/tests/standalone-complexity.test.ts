import { describe, expect, it } from 'bun:test'
import { buildSchema, parse, validate } from 'graphql'
import { createComplexityLimitRule } from 'graphql-complexity-validation'

describe('Standalone Complexity', () => {
  it('should validate complexity', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        simple: String
        complex: String
      }
    `)
    const query = parse('{ simple complex }')
    const rule = createComplexityLimitRule({
      maxComplexity: 1,
    })

    const errors = validate(schema, query, [rule])
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].message).toMatch(/complexity/i)
  })
})
