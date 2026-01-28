import { describe, expect, it } from 'bun:test'
import { HasAttributes } from '../src/orm/model/concerns/HasAttributes'

class TestModel extends HasAttributes {
  static casts = {
    age: 'integer',
    is_active: 'boolean',
  }
  static table = 'tests'
  static strictMode = false
}

describe('HasAttributes', () => {
  it('should set and get attributes', () => {
    const model = new TestModel()
    model.setAttribute('name', 'Carl')
    expect(model.getAttribute('name')).toBe('Carl')
    expect(model.getAttributes()).toEqual({ name: 'Carl' })
  })

  it('should handle casts', () => {
    const model = new TestModel()
    model.setAttribute('age', '30')
    expect(model.getAttribute('age')).toBe(30)

    model.setAttribute('is_active', 1)
    expect(model.getAttribute('is_active')).toBe(true)
  })

  it('should fill attributes', () => {
    const model = new TestModel()
    model.fill({ name: 'John', age: 25 })
    expect(model.getAttribute('name')).toBe('John')
    expect(model.getAttribute('age')).toBe(25)
  })

  it('should handle dirty state tracking', () => {
    const model = new TestModel()
    model.setAttribute('name', 'Carl')
    expect(model.isDirty('name')).toBe(true)
  })

  it('should test all cast types', () => {
    const model = new TestModel()
    const casts = [
      { type: 'integer', val: '123', expected: 123 },
      { type: 'boolean', val: 'true', expected: true },
      { type: 'boolean', val: 0, expected: false },
      { type: 'string', val: 456, expected: '456' },
      { type: 'json', val: '{"a":1}', expected: { a: 1 } },
      { type: 'date', val: '2024-01-01', expected: new Date('2024-01-01') },
    ]

    for (const cast of casts) {
      const result: any = (model as any)._castAttribute('key', cast.val, cast.type)
      if (cast.type === 'date') {
        expect(result.getTime()).toBe((cast.expected as any).getTime())
      } else {
        expect(result).toEqual(cast.expected)
      }
    }
  })

  it('should handle collection and timestamp casts', () => {
    const model = new TestModel()
    expect((model as any)._castAttribute('key', 'val', 'collection')).toEqual(['val'])
    const now = new Date()
    expect((model as any)._castAttribute('key', now, 'timestamp')).toBe(now.getTime())
  })

  it('should get expected JS types', () => {
    const model = new TestModel()
    expect((model as any)._getExpectedJSTypes('integer')).toEqual(['number'])
    expect((model as any)._getExpectedJSTypes('string')).toEqual(['string'])
    expect((model as any)._getExpectedJSTypes('boolean')).toEqual(['boolean'])
    expect((model as any)._getExpectedJSTypes('unknown')).toEqual(['string'])
  })
})
