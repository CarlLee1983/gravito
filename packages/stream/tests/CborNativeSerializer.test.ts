import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { CborAccelerator } from '@gravito/core/ffi'
import { NativeAccelerator } from '@gravito/core/ffi'
import type { Job } from '../src/Job'
import { BinarySerializer } from '../src/serializers/BinarySerializer'
import { CborNativeSerializer } from '../src/serializers/CborNativeSerializer'
import type { SerializedJob } from '../src/types'

// ──────────────────────────────────────────────────────────────────────────────
// 測試輔助函數
// ──────────────────────────────────────────────────────────────────────────────

/** 建立一個測試用 Job 物件 */
const createTestJob = (overrides?: Partial<Job>): Job =>
  ({
    id: 'job-native-001',
    data: { userId: 42, action: 'process' },
    ...overrides,
  }) as Job

describe('CborNativeSerializer', () => {
  let serializer: CborNativeSerializer

  beforeEach(() => {
    // 每個測試前重置加速器快取，確保測試獨立
    NativeAccelerator.reset()
    serializer = new CborNativeSerializer()
  })

  afterEach(() => {
    NativeAccelerator.reset()
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 1. 基本序列化
  // ────────────────────────────────────────────────────────────────────────────
  describe('serialize() - 基本功能', () => {
    it('應將簡單 Job 序列化為 binary type 與 Uint8Array', () => {
      const job = createTestJob()
      const serialized = serializer.serialize(job)

      expect(serialized.type).toBe('binary')
      expect(serialized.data).toBeInstanceOf(Uint8Array)
      expect(serialized.id).toBe('job-native-001')
      expect(serialized.createdAt).toBeGreaterThan(0)
    })

    it('應產生非空的 Uint8Array 資料', () => {
      const job = createTestJob()
      const serialized = serializer.serialize(job)

      expect((serialized.data as Uint8Array).length).toBeGreaterThan(0)
    })

    it('應支援空 data 的 Job', () => {
      const job = createTestJob({ data: {} })
      const serialized = serializer.serialize(job)

      expect(serialized.type).toBe('binary')
      expect(serialized.data).toBeInstanceOf(Uint8Array)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 2. UUID 生成
  // ────────────────────────────────────────────────────────────────────────────
  describe('serialize() - UUID 生成', () => {
    it('應為空 ID 自動產生 UUID', () => {
      const job = createTestJob({ id: '' })
      const serialized = serializer.serialize(job)

      expect(serialized.id).toBeTruthy()
      expect(serialized.id.length).toBeGreaterThan(0)
      // 格式：timestamp-uuid
      expect(serialized.id).toMatch(/^\d+-[0-9a-f-]+$/)
    })

    it('應為 undefined ID 自動產生 UUID', () => {
      const job = createTestJob({ id: undefined })
      const serialized = serializer.serialize(job)

      expect(serialized.id).toBeTruthy()
      expect(serialized.id).toMatch(/^\d+-[0-9a-f-]+$/)
    })

    it('應保留已有的 ID', () => {
      const job = createTestJob({ id: 'my-custom-id' })
      const serialized = serializer.serialize(job)

      expect(serialized.id).toBe('my-custom-id')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 3. Metadata 保留
  // ────────────────────────────────────────────────────────────────────────────
  describe('serialize() - metadata 保留', () => {
    it('應包含所有 metadata 欄位', () => {
      const job = createTestJob({
        delaySeconds: 30,
        maxAttempts: 5,
        groupId: 'group-native',
        priority: 'high',
        retryAfterSeconds: 60,
        retryMultiplier: 2,
      })
      const serialized = serializer.serialize(job)

      expect(serialized.delaySeconds).toBe(30)
      expect(serialized.maxAttempts).toBe(5)
      expect(serialized.groupId).toBe('group-native')
      expect(serialized.priority).toBe('high')
      expect(serialized.retryAfterSeconds).toBe(60)
      expect(serialized.retryMultiplier).toBe(2)
    })

    it('應設定 attempts 預設為 0', () => {
      const job = createTestJob()
      const serialized = serializer.serialize(job)

      expect(serialized.attempts).toBe(0)
    })

    it('應保留已有的 attempts 值', () => {
      const job = createTestJob({ attempts: 3 })
      const serialized = serializer.serialize(job)

      expect(serialized.attempts).toBe(3)
    })

    it('不應包含未定義的可選 metadata', () => {
      const job = createTestJob()
      const serialized = serializer.serialize(job)

      // 這些欄位未在 job 中設定，不應出現
      expect(serialized.delaySeconds).toBeUndefined()
      expect(serialized.maxAttempts).toBeUndefined()
      expect(serialized.groupId).toBeUndefined()
      expect(serialized.retryAfterSeconds).toBeUndefined()
      expect(serialized.retryMultiplier).toBeUndefined()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 4. Function 排除
  // ────────────────────────────────────────────────────────────────────────────
  describe('serialize() - function 排除', () => {
    it('應排除 function 型別的屬性', () => {
      const job = createTestJob({
        handle: async () => {
          /* noop */
        },
      })
      const serialized = serializer.serialize(job)

      expect(serialized.data).toBeInstanceOf(Uint8Array)
      // 反序列化後不應包含 handle
      const deserialized = serializer.deserialize(serialized)
      expect(typeof (deserialized as any).handle).not.toBe('function')
    })

    it('應排除多個 function 屬性', () => {
      const job = createTestJob({
        handle: async () => {},
        failed: async () => {},
        customFn: () => 'test',
      } as any)
      const serialized = serializer.serialize(job)
      const deserialized = serializer.deserialize(serialized)

      expect(typeof (deserialized as any).handle).not.toBe('function')
      expect(typeof (deserialized as any).failed).not.toBe('function')
      expect(typeof (deserialized as any).customFn).not.toBe('function')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 5. 基本反序列化
  // ────────────────────────────────────────────────────────────────────────────
  describe('deserialize() - 基本功能', () => {
    it('應將 Uint8Array 格式的資料正確反序列化', () => {
      const original = createTestJob()
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.id).toBe('job-native-001')
      expect(deserialized.data).toEqual({ userId: 42, action: 'process' })
    })

    it('應支持 Base64 string 格式的 data（模擬 Redis 傳輸）', () => {
      const original = createTestJob()
      const serialized = serializer.serialize(original)

      // 模擬 Redis 傳輸：轉為 Base64 string
      const base64Encoded: SerializedJob = {
        ...serialized,
        data: Buffer.from(serialized.data as Uint8Array).toString('base64'),
      }

      const deserialized = serializer.deserialize(base64Encoded)
      expect(deserialized.id).toBe('job-native-001')
      expect(deserialized.data).toEqual({ userId: 42, action: 'process' })
    })

    it('應支持 ArrayBuffer 格式的 data（模擬 Worker Transferable）', () => {
      const original = createTestJob()
      const serialized = serializer.serialize(original)
      const uint8 = serialized.data as Uint8Array

      // 轉為 ArrayBuffer
      const arrayBuf = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength)

      const deserialized = serializer.deserialize({
        ...serialized,
        data: arrayBuf,
      } as any)

      expect(deserialized.id).toBe('job-native-001')
      expect(deserialized.data).toEqual({ userId: 42, action: 'process' })
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 6. 反序列化 metadata 還原
  // ────────────────────────────────────────────────────────────────────────────
  describe('deserialize() - metadata 還原', () => {
    it('應正確還原所有 metadata 欄位', () => {
      const original = createTestJob({
        delaySeconds: 45,
        attempts: 2,
        maxAttempts: 10,
        groupId: 'test-group',
        priority: 'high',
        retryAfterSeconds: 30,
        retryMultiplier: 3,
      })
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.delaySeconds).toBe(45)
      expect(deserialized.attempts).toBe(2)
      expect(deserialized.maxAttempts).toBe(10)
      expect(deserialized.groupId).toBe('test-group')
      expect(deserialized.priority).toBe('high')
      expect(deserialized.retryAfterSeconds).toBe(30)
      expect(deserialized.retryMultiplier).toBe(3)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 7. Round-trip 完整性
  // ────────────────────────────────────────────────────────────────────────────
  describe('Round-trip serialization', () => {
    it('應正確進行 serialize -> deserialize 往返', () => {
      const original = createTestJob({
        data: {
          nested: { deep: { value: 42 } },
          array: [1, 2, 3],
          string: 'hello world',
          number: 3.14,
          boolean: true,
          null: null,
        },
      })

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.data).toEqual(original.data)
    })

    it('應在 Base64 編碼後保持往返一致性', () => {
      const original = createTestJob({
        data: { key: 'value', count: 100 },
      })
      const serialized = serializer.serialize(original)

      // 模擬 Redis transport
      const base64: SerializedJob = {
        ...serialized,
        data: Buffer.from(serialized.data as Uint8Array).toString('base64'),
      }

      const deserialized = serializer.deserialize(base64)
      expect(deserialized.id).toBe(original.id)
      expect(deserialized.data).toEqual(original.data)
    })

    it('應在 ArrayBuffer 傳輸後保持往返一致性', () => {
      const original = createTestJob()
      const serialized = serializer.serialize(original)
      const uint8 = serialized.data as Uint8Array

      const arrayBuf = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength)

      const deserialized = serializer.deserialize({
        ...serialized,
        data: arrayBuf,
      } as any)

      expect(deserialized.id).toBe(original.id)
      expect(deserialized.data).toEqual(original.data)
    })

    it('應在大型 payload 上保持完整性', () => {
      const largeData = {
        items: Array.from({ length: 100 }, (_, i) => ({
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

    it('應支援 Unicode 字串的往返', () => {
      const original = createTestJob({
        data: {
          chinese: '你好世界',
          japanese: 'こんにちは',
          emoji: 'test',
          mixed: 'Hello 世界 123',
        },
      })

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.data).toEqual(original.data)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 8. 錯誤處理
  // ────────────────────────────────────────────────────────────────────────────
  describe('Error handling', () => {
    it('應拒絕非 binary type', () => {
      const serialized: SerializedJob = {
        id: 'test',
        type: 'json',
        data: '{}',
        createdAt: Date.now(),
      }

      expect(() => serializer.deserialize(serialized)).toThrow(TypeError)
    })

    it('應拒絕無效的 data 類型（Object）', () => {
      const serialized: SerializedJob = {
        id: 'test',
        type: 'binary',
        data: {} as any,
        createdAt: Date.now(),
      }

      expect(() => serializer.deserialize(serialized)).toThrow(TypeError)
    })

    it('應拒絕損壞的 CBOR 資料', () => {
      const serialized: SerializedJob = {
        id: 'test',
        type: 'binary',
        data: new Uint8Array([0xff, 0xff, 0xff]),
        createdAt: Date.now(),
      }

      expect(() => serializer.deserialize(serialized)).toThrow(Error)
    })

    it('應拒絕無效的 Base64 string', () => {
      const serialized: SerializedJob = {
        id: 'test',
        type: 'binary',
        data: '!!!invalid-base64!!!',
        createdAt: Date.now(),
      }

      expect(() => serializer.deserialize(serialized)).toThrow()
    })

    it('應提供有意義的錯誤訊息', () => {
      const serialized: SerializedJob = {
        id: 'test',
        type: 'binary',
        data: new Uint8Array([0xff, 0xfe]),
        createdAt: Date.now(),
      }

      expect(() => serializer.deserialize(serialized)).toThrow(/Failed to decode/)
    })

    it('應拒絕 number 類型的 data', () => {
      const serialized: SerializedJob = {
        id: 'test',
        type: 'binary',
        data: 12345 as any,
        createdAt: Date.now(),
      }

      expect(() => serializer.deserialize(serialized)).toThrow(TypeError)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 9. 加速器選擇
  // ────────────────────────────────────────────────────────────────────────────
  describe('加速器選擇', () => {
    it('應使用 NativeAccelerator 取得的加速器', () => {
      const job = createTestJob()
      const serialized = serializer.serialize(job)

      // 序列化應成功（無論使用 native 或 fallback）
      expect(serialized.type).toBe('binary')
      expect(serialized.data).toBeInstanceOf(Uint8Array)
    })

    it('應能報告當前使用的後端資訊', () => {
      const info = CborNativeSerializer.getBackendInfo()

      expect(info).toBeDefined()
      expect(info.runtime).toBeDefined()
      expect(['bun-ffi', 'js-fallback', 'cborg']).toContain(info.runtime)
    })

    it('應提供靜態方法查詢加速器狀態', () => {
      const info = CborNativeSerializer.getBackendInfo()

      expect(typeof info.available).toBe('boolean')
      expect(typeof info.version).toBe('string')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 10. 大型 Payload 效能
  // ────────────────────────────────────────────────────────────────────────────
  describe('大型 payload', () => {
    it('應能序列化 500B+ 的 payload', () => {
      const job = createTestJob({
        data: { content: 'a'.repeat(500) },
      })
      const serialized = serializer.serialize(job)

      expect(serialized.data).toBeInstanceOf(Uint8Array)
      expect((serialized.data as Uint8Array).length).toBeGreaterThan(100)
    })

    it('應能序列化 10KB 的 payload', () => {
      const job = createTestJob({
        data: {
          items: Array.from({ length: 200 }, (_, i) => ({
            id: i,
            name: `item-${i}`,
            description: 'x'.repeat(50),
          })),
        },
      })
      const serialized = serializer.serialize(job)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.data).toEqual(job.data)
    })

    it('應能序列化包含 1000 個元素的陣列', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        value: `test-${i}`,
      }))
      const job = createTestJob({ data: largeArray })
      const serialized = serializer.serialize(job)

      expect(serialized.data).toBeInstanceOf(Uint8Array)
      expect((serialized.data as Uint8Array).length).toBeGreaterThan(0)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 11. 與 BinarySerializer 的相容性
  // ────────────────────────────────────────────────────────────────────────────
  describe('與 BinarySerializer 相容性', () => {
    it('應實現相同的 JobSerializer 介面', () => {
      // 驗證 serialize 和 deserialize 方法存在
      expect(typeof serializer.serialize).toBe('function')
      expect(typeof serializer.deserialize).toBe('function')
    })

    it('序列化結果 type 應為 binary', () => {
      const job = createTestJob()
      const serialized = serializer.serialize(job)

      expect(serialized.type).toBe('binary')
    })

    it('應產生與 BinarySerializer 格式相容的 SerializedJob 結構', () => {
      const job = createTestJob({
        delaySeconds: 10,
        maxAttempts: 3,
        groupId: 'compat-group',
        priority: 'low',
      })
      const serialized = serializer.serialize(job)

      // 驗證 SerializedJob 的必要欄位
      expect(serialized.id).toBeDefined()
      expect(serialized.type).toBe('binary')
      expect(serialized.data).toBeDefined()
      expect(serialized.createdAt).toBeDefined()
      expect(serialized.delaySeconds).toBe(10)
      expect(serialized.maxAttempts).toBe(3)
      expect(serialized.groupId).toBe('compat-group')
      expect(serialized.priority).toBe('low')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 12. 邊界條件
  // ────────────────────────────────────────────────────────────────────────────
  describe('邊界條件', () => {
    it('應處理 data 為 null 的情況', () => {
      const job = createTestJob({ data: null as any })
      const serialized = serializer.serialize(job)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.data).toBeNull()
    })

    it('應處理數字 0 作為 priority', () => {
      const job = createTestJob({ priority: 0 })
      const serialized = serializer.serialize(job)

      // priority 為 0 時不應省略
      // 注意：0 是 falsy，需要特殊處理
      expect(serialized.priority).toBe(0)
    })

    it('應處理 delaySeconds 為 0 的情況', () => {
      const job = createTestJob({ delaySeconds: 0 })
      const serialized = serializer.serialize(job)

      expect(serialized.delaySeconds).toBe(0)
    })

    it('應處理極深的巢狀物件', () => {
      // 建構深度巢狀但不超過 CBOR 限制
      let nested: any = { value: 'deep' }
      for (let i = 0; i < 10; i++) {
        nested = { child: nested }
      }

      const job = createTestJob({ data: nested })
      const serialized = serializer.serialize(job)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.data).toEqual(nested)
    })

    it('應處理空字串的 groupId', () => {
      const job = createTestJob({ groupId: '' })
      const serialized = serializer.serialize(job)

      // 空字串是 falsy，不應包含在 SerializedJob 中
      expect(serialized.groupId).toBeUndefined()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 13. BinarySerializer 交叉相容性
  // ────────────────────────────────────────────────────────────────────────────
  describe('BinarySerializer 交叉相容性', () => {
    let binarySerializer: BinarySerializer

    beforeEach(() => {
      binarySerializer = new BinarySerializer()
    })

    it('CborNativeSerializer 序列化 -> BinarySerializer 反序列化', () => {
      const job = createTestJob({
        data: { key: 'cross-compat', count: 99 },
        groupId: 'cross-group',
        priority: 'high',
      })
      const serialized = serializer.serialize(job)
      const deserialized = binarySerializer.deserialize(serialized)

      expect(deserialized.id).toBe('job-native-001')
      expect(deserialized.data).toEqual({ key: 'cross-compat', count: 99 })
      expect(deserialized.groupId).toBe('cross-group')
      expect(deserialized.priority).toBe('high')
    })

    it('BinarySerializer 序列化 -> CborNativeSerializer 反序列化', () => {
      const job = createTestJob({
        data: { key: 'reverse-compat', value: 42 },
        delaySeconds: 15,
      })
      const serialized = binarySerializer.serialize(job)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.id).toBe('job-native-001')
      expect(deserialized.data).toEqual({ key: 'reverse-compat', value: 42 })
      expect(deserialized.delaySeconds).toBe(15)
    })

    it('雙向往返：CborNative -> Binary -> CborNative', () => {
      const original = createTestJob({
        data: { roundtrip: true, items: [1, 2, 3] },
      })

      // CborNative serialize
      const serialized1 = serializer.serialize(original)
      // Binary deserialize
      const deserialized1 = binarySerializer.deserialize(serialized1)
      // Binary serialize (再次序列化)
      const serialized2 = binarySerializer.serialize(deserialized1)
      // CborNative deserialize
      const deserialized2 = serializer.deserialize(serialized2)

      expect(deserialized2.data).toEqual(original.data)
    })

    it('BinarySerializer.getBackendInfo() 應返回與 CborNativeSerializer 相同的資訊', () => {
      const nativeInfo = CborNativeSerializer.getBackendInfo()
      const binaryInfo = BinarySerializer.getBackendInfo()

      expect(binaryInfo.runtime).toBe(nativeInfo.runtime)
      expect(binaryInfo.available).toBe(nativeInfo.available)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 14. NativeAccelerator 直接 encode/decode 交叉驗證
  // ────────────────────────────────────────────────────────────────────────────
  describe('NativeAccelerator 交叉驗證', () => {
    it('NativeAccelerator.encode -> CborNativeSerializer.deserialize 應相容', () => {
      const accelerator = NativeAccelerator.getCborAccelerator()
      const payload = {
        id: 'raw-encoded',
        data: { message: 'hello from accelerator' },
      }

      // 直接用加速器編碼
      const encoded = accelerator.encode(payload)

      // 用 CborNativeSerializer 解碼
      const serialized: SerializedJob = {
        id: 'raw-encoded',
        type: 'binary',
        data: encoded,
        createdAt: Date.now(),
      }
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.id).toBe('raw-encoded')
      expect(deserialized.data).toEqual({ message: 'hello from accelerator' })
    })

    it('CborNativeSerializer.serialize -> NativeAccelerator.decode 應相容', () => {
      const accelerator = NativeAccelerator.getCborAccelerator()
      const job = createTestJob({
        data: { message: 'hello from serializer' },
      })

      // 用 CborNativeSerializer 編碼
      const serialized = serializer.serialize(job)

      // 直接用加速器解碼
      const decoded = accelerator.decode(serialized.data as Uint8Array)

      expect(decoded.data).toEqual({ message: 'hello from serializer' })
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 15. 模擬驅動層傳輸往返
  // ────────────────────────────────────────────────────────────────────────────
  describe('驅動層傳輸模擬', () => {
    it('模擬 Redis 傳輸往返（Uint8Array -> Base64 -> Uint8Array）', () => {
      const job = createTestJob({
        data: { userId: 42, event: 'purchase' },
        groupId: 'user-42',
        priority: 'high',
        delaySeconds: 5,
      })

      // 1. 序列化（推入 queue 前）
      const serialized = serializer.serialize(job)

      // 2. 模擬 Redis 儲存：轉為 Base64 string
      const redisStored: SerializedJob = {
        ...serialized,
        data: Buffer.from(serialized.data as Uint8Array).toString('base64'),
      }

      // 3. 模擬 Redis 讀取：反序列化
      const deserialized = serializer.deserialize(redisStored)

      expect(deserialized.id).toBe('job-native-001')
      expect(deserialized.data).toEqual({ userId: 42, event: 'purchase' })
      expect(deserialized.groupId).toBe('user-42')
      expect(deserialized.priority).toBe('high')
      expect(deserialized.delaySeconds).toBe(5)
    })

    it('模擬 Worker Transferable 傳輸往返', () => {
      const job = createTestJob({
        data: { taskId: 'worker-task', payload: Array.from({ length: 50 }, (_, i) => i) },
      })

      // 1. 序列化
      const serialized = serializer.serialize(job)
      const uint8 = serialized.data as Uint8Array

      // 2. 模擬 Transferable：轉為 ArrayBuffer
      const transferred = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength)

      // 3. Worker 端反序列化
      const deserialized = serializer.deserialize({
        ...serialized,
        data: transferred,
      } as any)

      expect(deserialized.data).toEqual(job.data)
    })

    it('模擬 RabbitMQ/SQS JSON 封裝往返', () => {
      const job = createTestJob({
        data: { orderId: 'ORD-001', amount: 99.99 },
      })

      // 1. 序列化
      const serialized = serializer.serialize(job)

      // 2. 模擬 JSON 封裝（某些 Driver 會將整個 SerializedJob 用 JSON 傳輸）
      const jsonStr = JSON.stringify({
        ...serialized,
        // Uint8Array 在 JSON.stringify 時會變成 object，所以需要先轉 Base64
        data: Buffer.from(serialized.data as Uint8Array).toString('base64'),
      })

      // 3. 接收端解析
      const received = JSON.parse(jsonStr) as SerializedJob

      // 4. 反序列化
      const deserialized = serializer.deserialize(received)

      expect(deserialized.id).toBe('job-native-001')
      expect(deserialized.data).toEqual({ orderId: 'ORD-001', amount: 99.99 })
    })
  })
})
