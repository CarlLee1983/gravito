/**
 * TokenBlacklist 單元測試
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('TokenBlacklist', () => {
  let blacklist: any

  beforeEach(() => {
    blacklist = {
      add: vi.fn(),
      isBlacklisted: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('令牌黑名單管理', () => {
    it('應添加令牌到黑名單', async () => {
      blacklist.add.mockResolvedValue(true)

      await blacklist.add('token-123', 3600)

      expect(blacklist.add).toHaveBeenCalledWith('token-123', 3600)
    })

    it('應檢查令牌是否在黑名單中', async () => {
      blacklist.isBlacklisted.mockResolvedValue(true)

      const result = await blacklist.isBlacklisted('token-123')

      expect(result).toBe(true)
    })

    it('應檢查未添加的令牌不在黑名單中', async () => {
      blacklist.isBlacklisted.mockResolvedValue(false)

      const result = await blacklist.isBlacklisted('token-unknown')

      expect(result).toBe(false)
    })
  })

  describe('過期管理', () => {
    it('應自動移除過期的令牌', async () => {
      blacklist.remove.mockResolvedValue(true)

      await blacklist.remove('expired-token')

      expect(blacklist.remove).toHaveBeenCalledWith('expired-token')
    })

    it('應清空所有黑名單令牌', async () => {
      blacklist.clear.mockResolvedValue(true)

      await blacklist.clear()

      expect(blacklist.clear).toHaveBeenCalled()
    })
  })

  describe('並發操作', () => {
    it('應支持並發添加令牌', async () => {
      blacklist.add.mockResolvedValue(true)

      const tokens = ['token-1', 'token-2', 'token-3']
      const results = await Promise.all(tokens.map((token) => blacklist.add(token, 3600)))

      expect(results).toHaveLength(3)
      expect(blacklist.add).toHaveBeenCalledTimes(3)
    })

    it('應支持並發檢查令牌', async () => {
      blacklist.isBlacklisted.mockResolvedValue(true)

      const tokens = ['token-1', 'token-2', 'token-3']
      const results = await Promise.all(tokens.map((token) => blacklist.isBlacklisted(token)))

      expect(results).toHaveLength(3)
      expect(blacklist.isBlacklisted).toHaveBeenCalledTimes(3)
    })
  })
})
