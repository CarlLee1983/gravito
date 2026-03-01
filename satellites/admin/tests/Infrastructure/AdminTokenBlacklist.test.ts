import { beforeEach, describe, expect, it } from 'bun:test'
import { AdminTokenBlacklist } from '../../src/Infrastructure/TokenBlacklist/AdminTokenBlacklist'

describe('AdminTokenBlacklist', () => {
  let blacklist: AdminTokenBlacklist

  beforeEach(() => {
    blacklist = new AdminTokenBlacklist()
  })

  it('should add token to blacklist via addToBlacklist()', () => {
    // Arrange
    const token = 'jwt-token-abc-123'
    const expiryTime = Date.now() + 3600000 // 1 小時後過期

    // Act
    blacklist.addToBlacklist(token, expiryTime)

    // Assert
    const stats = blacklist.getStats()
    expect(stats.total).toBe(1)
    expect(stats.expired).toBe(0)
  })

  it('should return true for blacklisted tokens via isBlacklisted()', () => {
    // Arrange
    const token = 'blacklisted-token'
    const expiryTime = Date.now() + 3600000 // 未過期

    blacklist.addToBlacklist(token, expiryTime)

    // Act & Assert
    expect(blacklist.isBlacklisted(token)).toBe(true)
  })

  it('should return false for non-blacklisted tokens via isBlacklisted()', () => {
    // Arrange
    const token = 'known-token'
    blacklist.addToBlacklist(token, Date.now() + 3600000)

    // Act & Assert
    expect(blacklist.isBlacklisted('unknown-token')).toBe(false)
  })

  it('should remove expired tokens via cleanup()', () => {
    // Arrange - 新增一些過期和未過期的 token
    const expiredToken1 = 'expired-1'
    const expiredToken2 = 'expired-2'
    const validToken = 'valid-1'

    blacklist.addToBlacklist(expiredToken1, Date.now() - 1000) // 已過期
    blacklist.addToBlacklist(expiredToken2, Date.now() - 2000) // 已過期
    blacklist.addToBlacklist(validToken, Date.now() + 3600000) // 未過期

    // 驗證 cleanup 前狀態
    const statsBefore = blacklist.getStats()
    expect(statsBefore.total).toBe(3)
    expect(statsBefore.expired).toBe(2)

    // Act
    blacklist.cleanup()

    // Assert
    const statsAfter = blacklist.getStats()
    expect(statsAfter.total).toBe(1)
    expect(statsAfter.expired).toBe(0)

    // 已過期的 token 不再被視為黑名單
    expect(blacklist.isBlacklisted(expiredToken1)).toBe(false)
    expect(blacklist.isBlacklisted(expiredToken2)).toBe(false)

    // 未過期的 token 仍在黑名單中
    expect(blacklist.isBlacklisted(validToken)).toBe(true)
  })

  it('should return correct counts via getStats()', () => {
    // Arrange - 空狀態
    const emptyStats = blacklist.getStats()
    expect(emptyStats.total).toBe(0)
    expect(emptyStats.expired).toBe(0)

    // 新增混合過期和有效的 token
    blacklist.addToBlacklist('token-a', Date.now() + 3600000) // 有效
    blacklist.addToBlacklist('token-b', Date.now() + 7200000) // 有效
    blacklist.addToBlacklist('token-c', Date.now() - 1000) // 已過期
    blacklist.addToBlacklist('token-d', Date.now() - 5000) // 已過期
    blacklist.addToBlacklist('token-e', Date.now() - 10000) // 已過期

    // Act
    const stats = blacklist.getStats()

    // Assert
    expect(stats.total).toBe(5)
    expect(stats.expired).toBe(3)
  })
})
