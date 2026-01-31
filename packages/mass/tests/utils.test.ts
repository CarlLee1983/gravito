import { beforeAll, describe, expect, test } from 'bun:test'
import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { registerAllFormats } from '../src/formats'
import { partial } from '../src/utils'

describe('utils.ts', () => {
  beforeAll(() => {
    // 註冊所有格式以支援格式驗證
    registerAllFormats()
  })

  describe('partial', () => {
    test('should make all properties optional', () => {
      const schema = Type.Object({
        name: Type.String(),
        email: Type.String(),
        age: Type.Number(),
      })

      const partialSchema = partial(schema)

      // 空物件應該是有效的
      expect(Value.Check(partialSchema, {})).toBe(true)

      // 只提供部分欄位也應該是有效的
      expect(Value.Check(partialSchema, { name: 'John' })).toBe(true)
      expect(Value.Check(partialSchema, { email: 'test@example.com' })).toBe(true)
      expect(Value.Check(partialSchema, { name: 'John', age: 25 })).toBe(true)

      // 提供所有欄位也應該是有效的
      expect(
        Value.Check(partialSchema, {
          name: 'John',
          email: 'test@example.com',
          age: 25,
        })
      ).toBe(true)
    })

    test('should preserve type validation', () => {
      const schema = Type.Object({
        name: Type.String(),
        age: Type.Number(),
      })

      const partialSchema = partial(schema)

      // 型別錯誤仍然應該被捕捉
      expect(Value.Check(partialSchema, { name: 123 })).toBe(false)
      expect(Value.Check(partialSchema, { age: 'not a number' })).toBe(false)
    })

    test('should work with nested objects', () => {
      const schema = Type.Object({
        user: Type.Object({
          name: Type.String(),
          email: Type.String(),
        }),
        settings: Type.Object({
          theme: Type.String(),
        }),
      })

      const partialSchema = partial(schema)

      // 只提供 user 或 settings 都應該是有效的
      expect(
        Value.Check(partialSchema, {
          user: { name: 'John', email: 'test@example.com' },
        })
      ).toBe(true)

      expect(
        Value.Check(partialSchema, {
          settings: { theme: 'dark' },
        })
      ).toBe(true)

      // 空物件也應該是有效的
      expect(Value.Check(partialSchema, {})).toBe(true)
    })

    test('should preserve constraints on optional fields', () => {
      const schema = Type.Object({
        email: Type.String({ format: 'email' }),
        age: Type.Number({ minimum: 0, maximum: 150 }),
      })

      const partialSchema = partial(schema)

      // 如果提供值，仍然需要符合約束
      expect(Value.Check(partialSchema, { email: 'invalid' })).toBe(false)
      expect(Value.Check(partialSchema, { age: -1 })).toBe(false)
      expect(Value.Check(partialSchema, { age: 200 })).toBe(false)

      // 有效的值應該通過
      expect(Value.Check(partialSchema, { email: 'test@example.com' })).toBe(true)
      expect(Value.Check(partialSchema, { age: 25 })).toBe(true)
    })

    test('should work with complex schemas', () => {
      const schema = Type.Object({
        id: Type.String({ format: 'uuid' }),
        name: Type.String({ minLength: 1 }),
        tags: Type.Array(Type.String()),
        metadata: Type.Object({
          createdAt: Type.String({ format: 'date-time' }),
          updatedAt: Type.String({ format: 'date-time' }),
        }),
      })

      const partialSchema = partial(schema)

      // 部分更新場景
      expect(
        Value.Check(partialSchema, {
          name: 'Updated Name',
        })
      ).toBe(true)

      expect(
        Value.Check(partialSchema, {
          tags: ['tag1', 'tag2'],
        })
      ).toBe(true)
    })
  })
})
