/**
 * NativeHasher SHA-512 / BLAKE2b 測試 (TDD)
 *
 * 測試涵蓋：
 * 1. SHA-512 已知值正確性（128 字元十六進制）
 * 2. SHA-512 支援 Uint8Array 輸入
 * 3. BLAKE2b-256 輸出長度（64 字元十六進制）
 * 4. 狀態報告（在 Bun 環境中應為 bun-crypto-hasher）
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { NativeHasher } from '@gravito/core/ffi'

describe('NativeHasher sha512 / blake2b', () => {
  beforeEach(() => {
    NativeHasher.reset()
  })

  // ========== SHA-512 ==========
  describe('sha512()', () => {
    it('should return a 128-char hex string', () => {
      const result = NativeHasher.sha512('hello')
      expect(typeof result).toBe('string')
      expect(result).toMatch(/^[a-f0-9]{128}$/)
    })

    it('should return the known SHA-512 value for "hello"', () => {
      const result = NativeHasher.sha512('hello')
      // Known SHA-512 value for "hello"
      expect(result).toBe(
        '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7' +
          '2323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043',
      )
    })

    it('should accept Uint8Array input', () => {
      const input = new TextEncoder().encode('hello')
      const result = NativeHasher.sha512(input)
      expect(result).toMatch(/^[a-f0-9]{128}$/)
    })

    it('should return consistent results for the same input', () => {
      const result1 = NativeHasher.sha512('consistent-input')
      const result2 = NativeHasher.sha512('consistent-input')
      expect(result1).toBe(result2)
    })

    it('should handle empty string', () => {
      const result = NativeHasher.sha512('')
      expect(result).toMatch(/^[a-f0-9]{128}$/)
    })
  })

  // ========== BLAKE2b ==========
  describe('blake2b()', () => {
    it('should return a 64-char hex string (blake2b256)', () => {
      const result = NativeHasher.blake2b('hello')
      expect(typeof result).toBe('string')
      expect(result).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should accept Uint8Array input', () => {
      const input = new TextEncoder().encode('hello')
      const result = NativeHasher.blake2b(input)
      expect(result).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should return consistent results for the same input', () => {
      const result1 = NativeHasher.blake2b('consistent-input')
      const result2 = NativeHasher.blake2b('consistent-input')
      expect(result1).toBe(result2)
    })
  })

  // ========== Status ==========
  describe('getStatus() after sha512 call', () => {
    it('should report bun-crypto-hasher runtime on Bun', () => {
      if (typeof Bun !== 'undefined') {
        NativeHasher.sha512('probe')
        const status = NativeHasher.getStatus()
        expect(status.runtime).toBe('bun-crypto-hasher')
        expect(status.available).toBe(true)
      }
    })
  })
})
