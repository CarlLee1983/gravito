/**
 * KeyRotationManager 單元測試
 *
 * 測試密鑰輪換管理器的核心功能
 */

import { describe, expect, it, mock } from 'bun:test'
import { KeyRotationManager } from '../../../src/rotation/KeyRotationManager'
import type { ProviderKeyEntry } from '../../../src/types'

/**
 * 等待指定的毫秒數
 */
// Unused for now but kept for future async tests
// const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('KeyRotationManager', () => {
  describe('建構與配置', () => {
    it('應該使用預設配置建立', () => {
      const manager = new KeyRotationManager()
      expect(manager).toBeDefined()
    })

    it('應該接受自訂配置', () => {
      const manager = new KeyRotationManager({
        enabled: true,
        gracePeriod: 12 * 60 * 60 * 1000,
      })
      expect(manager).toBeDefined()
    })
  })

  describe('註冊密鑰', () => {
    it('應該成功註冊有效的密鑰', () => {
      const manager = new KeyRotationManager()

      const keys: ProviderKeyEntry[] = [
        {
          key: 'whsec_primary',
          version: 'v1',
          isPrimary: true,
          activeFrom: new Date('2026-01-01'),
        },
        {
          key: 'whsec_old',
          version: 'v0',
          isPrimary: false,
          activeFrom: new Date('2025-01-01'),
          expiresAt: new Date('2026-02-01'),
        },
      ]

      expect(() => {
        manager.registerKeys('stripe', keys)
      }).not.toThrow()
    })

    it('應該拒絕沒有主密鑰的註冊', () => {
      const manager = new KeyRotationManager()

      const keys: ProviderKeyEntry[] = [
        {
          key: 'whsec_1',
          version: 'v1',
          isPrimary: false,
          activeFrom: new Date(),
        },
      ]

      expect(() => {
        manager.registerKeys('stripe', keys)
      }).toThrow('must have exactly one primary key')
    })

    it('應該拒絕多個主密鑰的註冊', () => {
      const manager = new KeyRotationManager()

      const keys: ProviderKeyEntry[] = [
        {
          key: 'whsec_1',
          version: 'v1',
          isPrimary: true,
          activeFrom: new Date(),
        },
        {
          key: 'whsec_2',
          version: 'v2',
          isPrimary: true,
          activeFrom: new Date(),
        },
      ]

      expect(() => {
        manager.registerKeys('stripe', keys)
      }).toThrow('must have exactly one primary key')
    })
  })

  describe('獲取活動密鑰', () => {
    it('應該返回當前有效的密鑰', () => {
      const manager = new KeyRotationManager()

      const now = new Date()
      const keys: ProviderKeyEntry[] = [
        {
          key: 'whsec_current',
          version: 'v2',
          isPrimary: true,
          activeFrom: new Date(now.getTime() - 1000),
        },
        {
          key: 'whsec_old',
          version: 'v1',
          isPrimary: false,
          activeFrom: new Date('2025-01-01'),
          expiresAt: new Date(now.getTime() + 1000),
        },
        {
          key: 'whsec_expired',
          version: 'v0',
          isPrimary: false,
          activeFrom: new Date('2024-01-01'),
          expiresAt: new Date(now.getTime() - 1000),
        },
      ]

      manager.registerKeys('stripe', keys)

      const activeKeys = manager.getActiveKeys('stripe')

      expect(activeKeys.length).toBe(2)
      expect(activeKeys.some((k) => k.version === 'v2')).toBe(true)
      expect(activeKeys.some((k) => k.version === 'v1')).toBe(true)
      expect(activeKeys.some((k) => k.version === 'v0')).toBe(false)
    })

    it('應該過濾尚未生效的密鑰', () => {
      const manager = new KeyRotationManager()

      const now = new Date()
      const keys: ProviderKeyEntry[] = [
        {
          key: 'whsec_current',
          version: 'v1',
          isPrimary: true,
          activeFrom: new Date(now.getTime() - 1000),
        },
        {
          key: 'whsec_future',
          version: 'v2',
          isPrimary: false,
          activeFrom: new Date(now.getTime() + 10000),
        },
      ]

      manager.registerKeys('stripe', keys)

      const activeKeys = manager.getActiveKeys('stripe')

      expect(activeKeys.length).toBe(1)
      expect(activeKeys[0].version).toBe('v1')
    })

    it('未註冊的 Provider 應該返回空陣列', () => {
      const manager = new KeyRotationManager()

      const activeKeys = manager.getActiveKeys('unknown')

      expect(activeKeys.length).toBe(0)
    })
  })

  describe('獲取主密鑰', () => {
    it('應該返回主密鑰', () => {
      const manager = new KeyRotationManager()

      const keys: ProviderKeyEntry[] = [
        {
          key: 'whsec_primary',
          version: 'v2',
          isPrimary: true,
          activeFrom: new Date('2026-01-01'),
        },
        {
          key: 'whsec_old',
          version: 'v1',
          isPrimary: false,
          activeFrom: new Date('2025-01-01'),
        },
      ]

      manager.registerKeys('stripe', keys)

      const primaryKey = manager.getPrimaryKey('stripe')

      expect(primaryKey).not.toBeNull()
      expect(primaryKey?.version).toBe('v2')
      expect(primaryKey?.isPrimary).toBe(true)
    })

    it('未註冊的 Provider 應該返回 null', () => {
      const manager = new KeyRotationManager()

      const primaryKey = manager.getPrimaryKey('unknown')

      expect(primaryKey).toBeNull()
    })
  })

  describe('輪換主密鑰', () => {
    it('應該成功輪換主密鑰', async () => {
      const onRotate = mock(() => {
        /* Noop */
      })
      const manager = new KeyRotationManager({ onRotate })

      const keys: ProviderKeyEntry[] = [
        {
          key: 'whsec_old',
          version: 'v1',
          isPrimary: true,
          activeFrom: new Date('2025-01-01'),
        },
      ]

      manager.registerKeys('stripe', keys)

      await manager.rotatePrimaryKey('stripe', {
        key: 'whsec_new',
        version: 'v2',
        activeFrom: new Date(),
      })

      const primaryKey = manager.getPrimaryKey('stripe')
      expect(primaryKey?.version).toBe('v2')
      expect(primaryKey?.key).toBe('whsec_new')

      expect(onRotate).toHaveBeenCalledWith(
        'stripe',
        expect.objectContaining({
          version: 'v2',
          isPrimary: true,
        })
      )
    })

    it('輪換後應該設定舊主密鑰的過期時間', async () => {
      const manager = new KeyRotationManager({
        gracePeriod: 1000,
      })

      const keys: ProviderKeyEntry[] = [
        {
          key: 'whsec_old',
          version: 'v1',
          isPrimary: true,
          activeFrom: new Date('2025-01-01'),
        },
      ]

      manager.registerKeys('stripe', keys)

      await manager.rotatePrimaryKey('stripe', {
        key: 'whsec_new',
        version: 'v2',
        activeFrom: new Date(),
      })

      const allKeys = manager.getAllProviderKeys().get('stripe')
      const oldKey = allKeys?.find((k) => k.version === 'v1')

      expect(oldKey?.isPrimary).toBe(false)
      expect(oldKey?.expiresAt).toBeInstanceOf(Date)
    })

    it('輪換後應該保留非主密鑰的過期時間', async () => {
      const manager = new KeyRotationManager()

      const customExpiry = new Date('2027-01-01')
      const keys: ProviderKeyEntry[] = [
        {
          key: 'whsec_primary',
          version: 'v2',
          isPrimary: true,
          activeFrom: new Date('2026-01-01'),
        },
        {
          key: 'whsec_old',
          version: 'v1',
          isPrimary: false,
          activeFrom: new Date('2025-01-01'),
          expiresAt: customExpiry,
        },
      ]

      manager.registerKeys('stripe', keys)

      await manager.rotatePrimaryKey('stripe', {
        key: 'whsec_newest',
        version: 'v3',
        activeFrom: new Date(),
      })

      const allKeys = manager.getAllProviderKeys().get('stripe')
      const oldKey = allKeys?.find((k) => k.version === 'v1')

      expect(oldKey?.expiresAt).toEqual(customExpiry)
    })
  })

  describe('清理過期密鑰', () => {
    it('應該清理過期的密鑰', () => {
      const manager = new KeyRotationManager()

      const now = new Date()
      const keys: ProviderKeyEntry[] = [
        {
          key: 'whsec_current',
          version: 'v2',
          isPrimary: true,
          activeFrom: new Date('2026-01-01'),
        },
        {
          key: 'whsec_expired',
          version: 'v1',
          isPrimary: false,
          activeFrom: new Date('2025-01-01'),
          expiresAt: new Date(now.getTime() - 1000),
        },
      ]

      manager.registerKeys('stripe', keys)

      const cleaned = manager.cleanupExpiredKeys()

      expect(cleaned).toBe(1)

      const remainingKeys = manager.getAllProviderKeys().get('stripe')
      expect(remainingKeys?.length).toBe(1)
      expect(remainingKeys?.[0].version).toBe('v2')
    })

    it('應該保留未過期的密鑰', () => {
      const manager = new KeyRotationManager()

      const now = new Date()
      const keys: ProviderKeyEntry[] = [
        {
          key: 'whsec_current',
          version: 'v2',
          isPrimary: true,
          activeFrom: new Date('2026-01-01'),
        },
        {
          key: 'whsec_valid',
          version: 'v1',
          isPrimary: false,
          activeFrom: new Date('2025-01-01'),
          expiresAt: new Date(now.getTime() + 10000),
        },
      ]

      manager.registerKeys('stripe', keys)

      const cleaned = manager.cleanupExpiredKeys()

      expect(cleaned).toBe(0)

      const remainingKeys = manager.getAllProviderKeys().get('stripe')
      expect(remainingKeys?.length).toBe(2)
    })
  })

  describe('Provider 檢查', () => {
    it('hasProvider 應該正確檢測已註冊的 Provider', () => {
      const manager = new KeyRotationManager()

      const keys: ProviderKeyEntry[] = [
        {
          key: 'whsec_test',
          version: 'v1',
          isPrimary: true,
          activeFrom: new Date(),
        },
      ]

      manager.registerKeys('stripe', keys)

      expect(manager.hasProvider('stripe')).toBe(true)
      expect(manager.hasProvider('unknown')).toBe(false)
    })
  })

  describe('自動清理', () => {
    it('啟用自動清理時應該創建定時器', () => {
      const manager = new KeyRotationManager({
        enabled: true,
        autoCleanup: true,
      })

      expect(manager).toBeDefined()

      // 清理
      manager.destroy()
    })

    it('停用自動清理時不應該創建定時器', () => {
      const manager = new KeyRotationManager({
        enabled: true,
        autoCleanup: false,
      })

      expect(manager).toBeDefined()
    })

    it('啟用自動清理時應該 unref 定時器', () => {
      const originalSetInterval = globalThis.setInterval
      let unrefCalled = false

      globalThis.setInterval = ((handler: TimerHandler, timeout?: number, ...args: any[]) => {
        const timer = originalSetInterval(handler, timeout, ...args) as ReturnType<
          typeof setInterval
        >
        return Object.assign(timer, {
          unref: () => {
            unrefCalled = true
            return timer
          },
        })
      }) as unknown as typeof setInterval

      const manager = new KeyRotationManager({
        enabled: true,
        autoCleanup: true,
      })

      expect(unrefCalled).toBe(true)

      manager.destroy()
      globalThis.setInterval = originalSetInterval
    })
  })

  describe('getAllProviderKeys', () => {
    it('應該返回所有 Provider 的密鑰', () => {
      const manager = new KeyRotationManager()

      const keys1: ProviderKeyEntry[] = [
        {
          key: 'whsec_stripe',
          version: 'v1',
          isPrimary: true,
          activeFrom: new Date(),
        },
      ]

      const keys2: ProviderKeyEntry[] = [
        {
          key: 'whsec_github',
          version: 'v1',
          isPrimary: true,
          activeFrom: new Date(),
        },
      ]

      manager.registerKeys('stripe', keys1)
      manager.registerKeys('github', keys2)

      const allKeys = manager.getAllProviderKeys()

      expect(allKeys.size).toBe(2)
      expect(allKeys.has('stripe')).toBe(true)
      expect(allKeys.has('github')).toBe(true)
    })
  })
})
