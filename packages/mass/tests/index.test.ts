import { describe, expect, it } from 'bun:test'
import { Schema, validate } from '../src/index'

describe('@gravito/mass', () => {
  it('should export Schema from TypeBox', () => {
    expect(Schema).toBeDefined()
    expect(Schema.String).toBeDefined()
    expect(Schema.Number).toBeDefined()
    expect(Schema.Object).toBeDefined()
  })

  it('should export validate function', () => {
    expect(validate).toBeDefined()
    expect(typeof validate).toBe('function')
  })

  it('should create validator middleware', () => {
    const schema = Schema.Object({
      name: Schema.String(),
    })

    const middleware = validate('json', schema)
    expect(middleware).toBeDefined()
    expect(typeof middleware).toBe('function')
  })
})
