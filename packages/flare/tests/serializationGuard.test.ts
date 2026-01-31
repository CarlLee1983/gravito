import { describe, expect, it } from 'bun:test'
import { assertSerializable, checkSerializable } from '../src/utils/serializationGuard'

describe('序列化守衛 (Serialization Guard)', () => {
  describe('checkSerializable', () => {
    it('應該通過可序列化的簡單物件', () => {
      const obj = {
        name: 'John',
        age: 30,
        active: true,
      }

      const result = checkSerializable(obj)

      expect(result.serializable).toBe(true)
      expect(result.problematicPaths).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('應該通過可序列化的巢狀物件', () => {
      const obj = {
        user: {
          profile: {
            name: 'John',
            createdAt: new Date(),
          },
        },
        tags: ['admin', 'user'],
      }

      const result = checkSerializable(obj)

      expect(result.serializable).toBe(true)
      expect(result.problematicPaths).toHaveLength(0)
    })

    it('應該偵測到函式並標記為不可序列化', () => {
      const obj = {
        name: 'Test',
        callback: () => {
          console.log('test')
        },
      }

      const result = checkSerializable(obj)

      expect(result.serializable).toBe(false)
      expect(result.problematicPaths).toContain('callback')
      expect(result.warnings).toContain('發現不可序列化的 Function 於路徑: callback')
    })

    it('應該偵測到巢狀物件中的函式', () => {
      const obj = {
        user: {
          name: 'John',
          onSave: () => {},
        },
      }

      const result = checkSerializable(obj)

      expect(result.serializable).toBe(false)
      expect(result.problematicPaths).toContain('user.onSave')
    })

    it('應該偵測到 Symbol 並標記為不可序列化', () => {
      const obj = {
        name: 'Test',
        id: Symbol('unique'),
      }

      const result = checkSerializable(obj)

      expect(result.serializable).toBe(false)
      expect(result.problematicPaths).toContain('id')
      expect(result.warnings).toContain('發現不可序列化的 Symbol 於路徑: id')
    })

    it('應該偵測到循環引用', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: any = { name: 'Test' }
      obj.self = obj

      const result = checkSerializable(obj)

      expect(result.serializable).toBe(false)
      expect(result.problematicPaths).toContain('self')
      expect(result.warnings).toContain('發現循環引用於路徑: self')
    })

    it('應該允許 undefined 和 null', () => {
      const obj = {
        name: 'Test',
        optional: undefined,
        nullable: null,
      }

      const result = checkSerializable(obj)

      expect(result.serializable).toBe(true)
      expect(result.problematicPaths).toHaveLength(0)
    })

    it('應該允許 Date, Map, Set', () => {
      const obj = {
        createdAt: new Date(),
        tags: new Set(['admin', 'user']),
        metadata: new Map([['key', 'value']]),
      }

      const result = checkSerializable(obj)

      expect(result.serializable).toBe(true)
      expect(result.problematicPaths).toHaveLength(0)
    })

    it('應該偵測到複雜類型（如 Promise, WeakMap）', () => {
      const obj = {
        name: 'Test',
        promise: Promise.resolve(1),
        weakMap: new WeakMap(),
      }

      const result = checkSerializable(obj)

      expect(result.serializable).toBe(false)
      expect(result.problematicPaths.length).toBeGreaterThan(0)
    })

    it('應該偵測到多個問題並回報所有路徑', () => {
      const obj = {
        name: 'Test',
        callback: () => {},
        data: {
          onUpdate: () => {},
          id: Symbol('id'),
        },
      }

      const result = checkSerializable(obj)

      expect(result.serializable).toBe(false)
      expect(result.problematicPaths).toHaveLength(3)
      expect(result.problematicPaths).toContain('callback')
      expect(result.problematicPaths).toContain('data.onUpdate')
      expect(result.problematicPaths).toContain('data.id')
    })
  })

  describe('assertSerializable', () => {
    it('應該不拋出錯誤當物件可序列化', () => {
      const obj = {
        name: 'Test',
        age: 30,
      }

      expect(() => {
        assertSerializable(obj)
      }).not.toThrow()
    })

    it('應該拋出錯誤當物件不可序列化', () => {
      const obj = {
        name: 'Test',
        callback: () => {},
      }

      expect(() => {
        assertSerializable(obj)
      }).toThrow('物件包含不可序列化的屬性')
    })

    it('拋出的錯誤應該包含問題路徑資訊', () => {
      const obj = {
        user: {
          onSave: () => {},
        },
      }

      expect(() => {
        assertSerializable(obj)
      }).toThrow('user.onSave')
    })
  })
})
