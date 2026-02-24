/**
 * NativeHasher 單元測試 (TDD)
 * 測試 SHA-256 和 HMAC-SHA256 加速層
 *
 * 測試涵蓋：
 * 1. SHA-256 基本正確性
 * 2. HMAC-SHA256 正確性
 * 3. Bun vs Fallback 交叉相容性
 * 4. 邊界情況（空字串、Unicode、Uint8Array）
 * 5. 大 payload 正確性
 * 6. 狀態報告正確性
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { createHash, createHmac } from 'node:crypto'
import { NativeHasher } from '@gravito/core/ffi'

describe('NativeHasher', () => {
  beforeEach(() => {
    // 重置狀態，確保每個測試獨立
    NativeHasher.reset()
  })

  // ========== SHA-256 基本測試 ==========
  describe('sha256()', () => {
    it('應該對簡單字串進行正確的 SHA-256 雜湊', () => {
      const input = 'hello'
      const result = NativeHasher.sha256(input)
      const expected = createHash('sha256').update(input).digest('hex')

      expect(result).toBe(expected)
    })

    it('應該對複雜字串進行正確的 SHA-256 雜湊', () => {
      const input = 'the quick brown fox jumps over the lazy dog'
      const result = NativeHasher.sha256(input)
      const expected = createHash('sha256').update(input).digest('hex')

      expect(result).toBe(expected)
    })

    it('應該處理空字串', () => {
      const result = NativeHasher.sha256('')
      const expected = createHash('sha256').update('').digest('hex')

      expect(result).toBe(expected)
      // 空字串的已知 SHA-256 雜湊值
      expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    })

    it('應該支援 Uint8Array 輸入', () => {
      const input = new TextEncoder().encode('hello')
      const result = NativeHasher.sha256(input)
      const expected = createHash('sha256').update('hello').digest('hex')

      expect(result).toBe(expected)
    })

    it('應該正確處理 Unicode 字元', () => {
      const input = '你好世界🚀'
      const result = NativeHasher.sha256(input)
      const expected = createHash('sha256').update(input).digest('hex')

      expect(result).toBe(expected)
    })

    it('應該返回小寫十六進制格式', () => {
      const result = NativeHasher.sha256('test')

      expect(typeof result).toBe('string')
      expect(result).toMatch(/^[a-f0-9]{64}$/)
    })

    it('應該處理大 payload（10KB）', () => {
      const input = 'x'.repeat(10240) // 10KB
      const result = NativeHasher.sha256(input)
      const expected = createHash('sha256').update(input).digest('hex')

      expect(result).toBe(expected)
    })

    it('應該對相同輸入返回相同輸出', () => {
      const input = 'consistent'
      const result1 = NativeHasher.sha256(input)
      const result2 = NativeHasher.sha256(input)

      expect(result1).toBe(result2)
    })
  })

  // ========== HMAC-SHA256 基本測試 ==========
  describe('hmacSha256()', () => {
    it('應該對簡單鍵和數據進行正確的 HMAC-SHA256', () => {
      const key = 'secret'
      const data = 'message'
      const result = NativeHasher.hmacSha256(key, data)
      const expected = createHmac('sha256', key).update(data).digest('hex')

      expect(result).toBe(expected)
    })

    it('應該對複雜鍵進行正確的 HMAC-SHA256', () => {
      const key = 'base64:TWF0amFoIENvZGVz'
      const data = 'sensitive-data'
      const result = NativeHasher.hmacSha256(key, data)
      const expected = createHmac('sha256', key).update(data).digest('hex')

      expect(result).toBe(expected)
    })

    it('應該處理空字符串鍵', () => {
      const key = ''
      const data = 'message'
      const result = NativeHasher.hmacSha256(key, data)
      const expected = createHmac('sha256', key).update(data).digest('hex')

      expect(result).toBe(expected)
    })

    it('應該處理空字符串數據', () => {
      const key = 'secret'
      const data = ''
      const result = NativeHasher.hmacSha256(key, data)
      const expected = createHmac('sha256', key).update(data).digest('hex')

      expect(result).toBe(expected)
    })

    it('應該處理較長的鍵（HMAC 會截斷 > 塊大小的鍵）', () => {
      const key = 'k'.repeat(200) // > 64 位元組，標準 SHA-256 塊大小
      const data = 'message'
      const result = NativeHasher.hmacSha256(key, data)
      const expected = createHmac('sha256', key).update(data).digest('hex')

      expect(result).toBe(expected)
    })

    it('應該返回小寫十六進制格式', () => {
      const result = NativeHasher.hmacSha256('key', 'data')

      expect(typeof result).toBe('string')
      expect(result).toMatch(/^[a-f0-9]{64}$/)
    })

    it('應該對相同鍵和數據返回相同輸出', () => {
      const key = 'consistent-key'
      const data = 'consistent-data'
      const result1 = NativeHasher.hmacSha256(key, data)
      const result2 = NativeHasher.hmacSha256(key, data)

      expect(result1).toBe(result2)
    })
  })

  // ========== 交叉相容性測試 ==========
  describe('Bun vs Fallback 相容性', () => {
    it('多次呼叫應使用同一加速器實例', () => {
      const status1 = NativeHasher.getStatus()
      NativeHasher.sha256('test1')
      const status2 = NativeHasher.getStatus()

      expect(status1.runtime).toBe(status2.runtime)
    })

    it('不同的 sha256 呼叫應使用相同的加速器', () => {
      NativeHasher.sha256('input1')
      NativeHasher.sha256('input2')
      const status = NativeHasher.getStatus()

      // 兩個呼叫都應該已執行，狀態應一致
      expect(status.available).toBe(status.runtime === 'bun-crypto-hasher')
    })

    it('sha256 和 hmacSha256 應使用同一加速器', () => {
      NativeHasher.sha256('test')
      const status1 = NativeHasher.getStatus()

      NativeHasher.hmacSha256('key', 'data')
      const status2 = NativeHasher.getStatus()

      expect(status1.runtime).toBe(status2.runtime)
    })
  })

  // ========== 實際使用案例 ==========
  describe('實際使用案例', () => {
    it('應支援 FileStore.hashKey 模式', () => {
      const key = 'cache:user:123'
      const result = NativeHasher.sha256(key)

      expect(result).toBeDefined()
      expect(result.length).toBe(64)
      expect(result).toMatch(/^[a-f0-9]{64}$/)
    })

    it('應支援 Encrypter.hash 模式 (IV + encrypted)', () => {
      const iv = Buffer.from('initialization-vector-16bytes').toString('base64')
      const encrypted = 'base64-encrypted-value'
      const key = 'encryption-key'
      const combined = iv + encrypted

      const result = NativeHasher.hmacSha256(key, combined)

      expect(result).toBeDefined()
      expect(result.length).toBe(64)
      expect(result).toMatch(/^[a-f0-9]{64}$/)
    })

    it('應支援 Hash 驗證模式（生成 + 驗證）', () => {
      const key = 'cache-key'
      const hash1 = NativeHasher.sha256(key)
      const hash2 = NativeHasher.sha256(key)

      expect(hash1).toBe(hash2) // 可用於驗證
    })
  })

  // ========== 狀態和配置測試 ==========
  describe('getStatus()', () => {
    it('應返回有效的狀態物件', () => {
      const status = NativeHasher.getStatus()

      expect(status).toBeDefined()
      expect(typeof status.available).toBe('boolean')
      expect(typeof status.runtime).toBe('string')
    })

    it('應報告正確的運行時', () => {
      const status = NativeHasher.getStatus()

      expect(['bun-crypto-hasher', 'node-crypto']).toContain(status.runtime)
    })

    it('應在 Bun 環境中報告 bun-crypto-hasher', () => {
      // 這個測試在 Bun 環境中執行
      if (typeof Bun !== 'undefined') {
        const status = NativeHasher.getStatus()
        expect(status.runtime).toBe('bun-crypto-hasher')
        expect(status.available).toBe(true)
      }
    })

    it('reset() 應重置狀態', () => {
      NativeHasher.sha256('test')
      const status1 = NativeHasher.getStatus()

      NativeHasher.reset()
      const status2 = NativeHasher.getStatus()

      // 重置後再次取得應重新初始化
      expect(status1).toBeDefined()
      expect(status2).toBeDefined()
    })
  })

  // ========== 性能和邊界測試 ==========
  describe('邊界情況', () => {
    it('應處理特殊字元', () => {
      const input = '!@#$%^&*()'
      const result = NativeHasher.sha256(input)
      const expected = createHash('sha256').update(input).digest('hex')

      expect(result).toBe(expected)
    })

    it('應處理換行字元', () => {
      const input = 'line1\nline2\nline3'
      const result = NativeHasher.sha256(input)
      const expected = createHash('sha256').update(input).digest('hex')

      expect(result).toBe(expected)
    })

    it('應處理 Tab 字元', () => {
      const input = 'col1\tcol2\tcol3'
      const result = NativeHasher.sha256(input)
      const expected = createHash('sha256').update(input).digest('hex')

      expect(result).toBe(expected)
    })

    it('應處理各種二進制 Uint8Array', () => {
      const bytes = new Uint8Array([0, 1, 2, 255, 254, 128])
      const result = NativeHasher.sha256(bytes)

      expect(result).toBeDefined()
      expect(result.length).toBe(64)
    })
  })
})
