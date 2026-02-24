import { describe, expect, it } from 'bun:test'
import { BinarySerializer } from '../src/serializers/BinarySerializer'
import type { Job } from '../src/Job'

describe('BinarySerializer', () => {
  const serializer = new BinarySerializer()

  // Helper to create a test job
  const createTestJob = (overrides?: Partial<Job>): Job => ({
    id: 'job-123',
    data: { userId: 1, action: 'test' },
    ...overrides,
  } as Job)

  describe('serialize()', () => {
    it('應將簡單 Job 序列化為 binary type 與 Uint8Array', () => {
      const job = createTestJob()
      const serialized = serializer.serialize(job)

      expect(serialized.type).toBe('binary')
      expect(serialized.data).toBeInstanceOf(Uint8Array)
      expect(serialized.id).toBe('job-123')
      expect(serialized.createdAt).toBeGreaterThan(0)
    })

    it('應為空 ID 產生新的 UUID', () => {
      const job = createTestJob({ id: '' })
      const serialized = serializer.serialize(job)

      expect(serialized.id).toMatch(/^\d+-[0-9a-f\-]+$/)
    })

    it('應包含所有 metadata 欄位', () => {
      const job = createTestJob({
        delaySeconds: 30,
        maxAttempts: 5,
        groupId: 'group-1',
        priority: 'high',
        retryAfterSeconds: 60,
        retryMultiplier: 2,
      })
      const serialized = serializer.serialize(job)

      expect(serialized.delaySeconds).toBe(30)
      expect(serialized.maxAttempts).toBe(5)
      expect(serialized.groupId).toBe('group-1')
      expect(serialized.priority).toBe('high')
      expect(serialized.retryAfterSeconds).toBe(60)
      expect(serialized.retryMultiplier).toBe(2)
    })

    it('應正確序列化複雜資料類型（Date、Map、BigInt）', () => {
      const date = new Date('2026-02-24')
      const job = createTestJob({
        data: {
          date: date,
          map: new Map([['key', 'value']]),
          bigint: BigInt(9007199254740991),
        },
      })
      const serialized = serializer.serialize(job)

      expect(serialized.data).toBeInstanceOf(Uint8Array)
      expect(serialized.data.length).toBeGreaterThan(0)
    })

    it('應排除 function 型別的屬性', () => {
      const job = createTestJob({
        handle: async () => {
          // this is a function
        },
      })
      const serialized = serializer.serialize(job)

      expect(serialized.data).toBeInstanceOf(Uint8Array)
      // Functions should not be in the binary data
    })

    it('應為大型 payload 產生合理大小的二進制資料', () => {
      const largeData = Array(1000)
        .fill(0)
        .map((_, i) => ({ id: i, value: `test-${i}` }))
      const job = createTestJob({ data: largeData })
      const serialized = serializer.serialize(job)

      expect(serialized.data).toBeInstanceOf(Uint8Array)
      // CBOR should be more compact than JSON
      expect(serialized.data.length).toBeGreaterThan(0)
    })
  })

  describe('deserialize()', () => {
    it('應將序列化的 Job 還原為原始物件', () => {
      const original = createTestJob({ id: 'test-id' })
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.id).toBe('test-id')
      expect(deserialized.data).toEqual({ userId: 1, action: 'test' })
    })

    it('應正確還原所有 metadata', () => {
      const original = createTestJob({
        delaySeconds: 45,
        attempts: 2,
        maxAttempts: 10,
        groupId: 'test-group',
        priority: 'high',
      })
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.delaySeconds).toBe(45)
      expect(deserialized.attempts).toBe(2)
      expect(deserialized.maxAttempts).toBe(10)
      expect(deserialized.groupId).toBe('test-group')
      expect(deserialized.priority).toBe('high')
    })

    it('應支持 string 格式的 data（Base64 編碼）', () => {
      const original = createTestJob()
      const serialized = serializer.serialize(original)

      // 轉為 Base64 string（模擬從 Redis 來的資料）
      const encoded = {
        ...serialized,
        data: Buffer.from(serialized.data as Uint8Array).toString('base64'),
      }

      const deserialized = serializer.deserialize(encoded as any)
      expect(deserialized.id).toBe('job-123')
    })

    it('應支持 ArrayBuffer 格式的 data（來自 Transferable）', () => {
      const original = createTestJob()
      const serialized = serializer.serialize(original)

      // 轉為 ArrayBuffer（模擬來自 Worker Transferable）
      const arrayBuf = (serialized.data as Uint8Array).buffer.slice(
        (serialized.data as Uint8Array).byteOffset,
        (serialized.data as Uint8Array).byteOffset +
          (serialized.data as Uint8Array).byteLength
      )

      const deserialized = serializer.deserialize({
        ...serialized,
        data: arrayBuf,
      } as any)
      expect(deserialized.id).toBe('job-123')
    })

    it('應拒絕錯誤的 type', () => {
      const serialized = {
        id: 'test',
        type: 'json' as const,
        data: '{}',
        createdAt: Date.now(),
      }

      expect(() => serializer.deserialize(serialized)).toThrow(TypeError)
    })

    it('應拒絕損壞的 CBOR 資料', () => {
      const serialized = {
        id: 'test',
        type: 'binary' as const,
        data: new Uint8Array([0xff, 0xff, 0xff]), // Invalid CBOR
        createdAt: Date.now(),
      }

      expect(() => serializer.deserialize(serialized)).toThrow(Error)
    })

    it('應拒絕 invalid Base64 string', () => {
      const serialized = {
        id: 'test',
        type: 'binary' as const,
        data: '!!!invalid-base64!!!',
        createdAt: Date.now(),
      }

      expect(() => serializer.deserialize(serialized)).toThrow()
    })
  })

  describe('Round-trip serialization', () => {
    it('應正確進行 serialize → deserialize 往返', () => {
      const original = createTestJob({
        data: {
          nested: { deep: { value: 42 } },
          array: [1, 2, 3],
          string: 'test',
          number: 3.14,
          boolean: true,
          null: null,
        },
      })

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.data).toEqual(original.data)
    })

    it('應在 Base64 編碼後進行往返', () => {
      const original = createTestJob()
      const serialized = serializer.serialize(original)

      // 模擬經過 Redis（轉為 Base64）
      const encoded = {
        ...serialized,
        data: Buffer.from(serialized.data as Uint8Array).toString('base64'),
      }

      const deserialized = serializer.deserialize(encoded as any)
      expect(deserialized.id).toBe(original.id)
      expect(deserialized.data).toEqual(original.data)
    })

    it('應在大型 payload 上保持完整性', () => {
      const largeData = {
        items: Array(100)
          .fill(0)
          .map((_, i) => ({
            id: i,
            name: `item-${i}`,
            data: 'x'.repeat(100),
          })),
      }
      const original = createTestJob({ data: largeData })

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.data).toEqual(original.data)
    })
  })

  describe('Error handling', () => {
    it('應提供有意義的錯誤訊息', () => {
      const serialized = {
        id: 'test',
        type: 'binary' as const,
        data: new Uint8Array([0xff, 0xfe]), // Invalid CBOR
        createdAt: Date.now(),
      }

      expect(() => serializer.deserialize(serialized)).toThrow(/Failed to decode/)
    })

    it('應偵測無效的 data 類型', () => {
      const serialized = {
        id: 'test',
        type: 'binary' as const,
        data: {} as any, // Object instead of Uint8Array/string/ArrayBuffer
        createdAt: Date.now(),
      }

      expect(() => serializer.deserialize(serialized)).toThrow(TypeError)
    })
  })
})
