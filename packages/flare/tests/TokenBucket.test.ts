import { describe, expect, it } from 'bun:test'
import { TokenBucket } from '../src/utils/TokenBucket'

describe('TokenBucket', () => {
  describe('基本功能', () => {
    it('應該初始化時擁有滿容量的 tokens', () => {
      const bucket = new TokenBucket(10, 1)
      expect(bucket.getTokens()).toBe(10)
    })

    it('應該成功消耗 token', () => {
      const bucket = new TokenBucket(10, 1)
      const result = bucket.tryConsume()
      expect(result).toBe(true)
      expect(bucket.getTokens()).toBe(9)
    })

    it('應該能消耗多個 tokens', () => {
      const bucket = new TokenBucket(10, 1)
      const result = bucket.tryConsume(3)
      expect(result).toBe(true)
      expect(bucket.getTokens()).toBe(7)
    })

    it('當 tokens 不足時應該拒絕消耗', () => {
      const bucket = new TokenBucket(5, 1)
      bucket.tryConsume(5) // 消耗所有 tokens
      const result = bucket.tryConsume()
      expect(result).toBe(false)
      expect(bucket.getTokens()).toBe(0)
    })

    it('當請求的 tokens 超過剩餘數量時應該拒絕', () => {
      const bucket = new TokenBucket(10, 1)
      const result = bucket.tryConsume(15)
      expect(result).toBe(false)
      expect(bucket.getTokens()).toBe(10) // 不應該改變
    })
  })

  describe('Token 補充機制', () => {
    it('應該隨時間補充 tokens', async () => {
      // 每秒 10 tokens
      const bucket = new TokenBucket(10, 10)
      bucket.tryConsume(10) // 清空
      expect(bucket.getTokens()).toBe(0)

      // 等待 100ms = 應該補充 1 token
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(bucket.tryConsume()).toBe(true)
    })

    it('補充的 tokens 不應超過容量上限', async () => {
      const bucket = new TokenBucket(5, 10) // 容量 5，每秒 10 tokens
      bucket.tryConsume(3) // 剩下 2

      // 等待 1 秒，應該補充到上限 5
      await new Promise((resolve) => setTimeout(resolve, 1000))
      expect(bucket.getTokens()).toBeLessThanOrEqual(5)
    })

    it('應該根據 refillRate 正確計算補充速率', async () => {
      // 每秒 100 tokens
      const bucket = new TokenBucket(200, 100)
      bucket.tryConsume(200) // 清空

      // 等待 50ms = 應該補充 5 tokens
      await new Promise((resolve) => setTimeout(resolve, 50))
      const tokens = bucket.getTokens()
      expect(tokens).toBeGreaterThanOrEqual(4) // 允許一些誤差
      expect(tokens).toBeLessThanOrEqual(6)
    })
  })

  describe('邊界條件', () => {
    it('應該處理容量為 0 的情況', () => {
      const bucket = new TokenBucket(0, 1)
      expect(bucket.tryConsume()).toBe(false)
      expect(bucket.getTokens()).toBe(0)
    })

    it('應該處理 refillRate 為 0 的情況', async () => {
      const bucket = new TokenBucket(5, 0)
      bucket.tryConsume(5)
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(bucket.getTokens()).toBe(0) // 不應該補充
    })

    it('應該處理消耗 0 個 tokens 的請求', () => {
      const bucket = new TokenBucket(10, 1)
      const result = bucket.tryConsume(0)
      expect(result).toBe(true)
      expect(bucket.getTokens()).toBe(10) // 不變
    })

    it('應該處理負數 tokens 請求（視為 0）', () => {
      const bucket = new TokenBucket(10, 1)
      const result = bucket.tryConsume(-5)
      expect(result).toBe(true)
      expect(bucket.getTokens()).toBe(10)
    })
  })

  describe('併發場景', () => {
    it('應該正確處理連續的消耗請求', () => {
      const bucket = new TokenBucket(10, 1)
      const results = []
      for (let i = 0; i < 12; i++) {
        results.push(bucket.tryConsume())
      }

      const successCount = results.filter((r) => r).length
      expect(successCount).toBe(10) // 只有前 10 次成功
      // 由於時間流逝可能會有微量補充，允許小誤差
      expect(bucket.getTokens()).toBeLessThan(0.1)
    })

    it('應該在補充後允許新的消耗', async () => {
      const bucket = new TokenBucket(5, 10) // 每秒 10 tokens
      bucket.tryConsume(5) // 清空
      expect(bucket.tryConsume()).toBe(false)

      // 等待補充
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(bucket.tryConsume()).toBe(true) // 應該成功
    })
  })
})
