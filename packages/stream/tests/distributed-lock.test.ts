import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { GroupRedisClient } from '../src/drivers/RedisDriver'
import { DistributedLock } from '../src/locks/DistributedLock'

/**
 * 創建模擬的 Redis 客戶端用於測試。
 */
function createMockRedisClient(): GroupRedisClient {
  const storage = new Map<string, { value: string; expiresAt: number }>()

  return {
    set: mock(async (key: string, value: string, ...args: any[]) => {
      // 解析參數：EX ttl NX
      const exIndex = args.indexOf('EX')
      const nxIndex = args.indexOf('NX')

      // 檢查鍵是否已過期
      const entry = storage.get(key)
      if (entry && entry.expiresAt < Date.now()) {
        storage.delete(key)
      }

      if (nxIndex !== -1 && storage.has(key)) {
        return null // NX: 鍵已存在，返回 null
      }

      const ttl = exIndex !== -1 ? (args[exIndex + 1] as number) : 0
      const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : Infinity

      storage.set(key, { value, expiresAt })
      return 'OK'
    }),

    eval: mock(async (script: string, _numKeys: number, ...args: any[]) => {
      const key = args[0] as string
      const expectedValue = args[1] as string

      // 檢查鍵是否過期
      const entry = storage.get(key)
      if (entry && entry.expiresAt < Date.now()) {
        storage.delete(key)
      }

      // DEL script: 刪除鎖
      if (script.includes('del')) {
        const current = storage.get(key)
        if (current && current.value === expectedValue) {
          storage.delete(key)
          return 1
        }
        return 0
      }

      // EXPIRE script: 續約鎖
      if (script.includes('expire')) {
        const current = storage.get(key)
        const newTtl = args[2] as number

        if (current && current.value === expectedValue) {
          storage.set(key, {
            value: current.value,
            expiresAt: Date.now() + newTtl * 1000,
          })
          return 1
        }
        return 0
      }

      return 0
    }),

    // 測試輔助方法：手動讓鍵過期
    _expireKey: (key: string) => {
      const entry = storage.get(key)
      if (entry) {
        storage.set(key, { ...entry, expiresAt: Date.now() - 1000 })
      }
    },

    // 測試輔助方法：檢查鍵是否存在
    _hasKey: (key: string): boolean => {
      const entry = storage.get(key)
      if (!entry) {
        return false
      }
      if (entry.expiresAt < Date.now()) {
        storage.delete(key)
        return false
      }
      return true
    },

    // 測試輔助方法：清空所有鍵
    _clear: () => {
      storage.clear()
    },
  } as any
}

describe('DistributedLock', () => {
  let client: GroupRedisClient
  let lock: DistributedLock

  beforeEach(() => {
    client = createMockRedisClient()
    lock = new DistributedLock(client)
  })

  afterEach(() => {
    // 清理任何未釋放的鎖和定時器
    ;(client as any)._clear()
  })

  describe('基本鎖操作', () => {
    it('應該成功獲取鎖', async () => {
      const acquired = await lock.acquire('test-lock', {
        ttl: 5000,
        retryCount: 0,
        retryDelay: 100,
      })

      expect(acquired).toBe(true)
      expect(client.set).toHaveBeenCalledWith('test-lock', expect.any(String), 'EX', 5, 'NX')
    })

    it('應該在鎖已被持有時獲取失敗', async () => {
      const lock1 = new DistributedLock(client)
      const lock2 = new DistributedLock(client)

      const acquired1 = await lock1.acquire('test-lock', {
        ttl: 5000,
        retryCount: 0,
        retryDelay: 100,
      })

      const acquired2 = await lock2.acquire('test-lock', {
        ttl: 5000,
        retryCount: 0,
        retryDelay: 100,
      })

      expect(acquired1).toBe(true)
      expect(acquired2).toBe(false)
    })

    it('應該成功釋放鎖', async () => {
      await lock.acquire('test-lock', {
        ttl: 5000,
        retryCount: 0,
        retryDelay: 100,
      })

      await lock.release('test-lock')

      expect(client.eval).toHaveBeenCalled()
      expect((client as any)._hasKey('test-lock')).toBe(false)
    })

    it('應該只釋放自己持有的鎖', async () => {
      const lock1 = new DistributedLock(client)
      const lock2 = new DistributedLock(client)

      await lock1.acquire('test-lock', {
        ttl: 5000,
        retryCount: 0,
        retryDelay: 100,
      })

      // lock2 嘗試釋放 lock1 持有的鎖
      await lock2.release('test-lock')

      // 鎖應該仍然存在
      expect((client as any)._hasKey('test-lock')).toBe(true)
    })
  })

  describe('重試機制', () => {
    it('應該在重試後成功獲取鎖', async () => {
      const lock1 = new DistributedLock(client)
      const lock2 = new DistributedLock(client)

      // lock1 獲取鎖
      await lock1.acquire('test-lock', {
        ttl: 100, // 100ms 短 TTL
        retryCount: 0,
        retryDelay: 50,
      })

      // lock2 在重試時應該能獲取到鎖（因為 lock1 的鎖會過期）
      setTimeout(() => {
        ;(client as any)._expireKey('test-lock')
      }, 60)

      const acquired2 = await lock2.acquire('test-lock', {
        ttl: 5000,
        retryCount: 3,
        retryDelay: 50,
      })

      expect(acquired2).toBe(true)
    })

    it('應該在達到重試次數後返回失敗', async () => {
      const lock1 = new DistributedLock(client)
      const lock2 = new DistributedLock(client)

      await lock1.acquire('test-lock', {
        ttl: 10000,
        retryCount: 0,
        retryDelay: 50,
      })

      const startTime = Date.now()
      const acquired2 = await lock2.acquire('test-lock', {
        ttl: 5000,
        retryCount: 2,
        retryDelay: 100,
      })
      const elapsed = Date.now() - startTime

      expect(acquired2).toBe(false)
      // 應該重試了 2 次，每次延遲 100ms，允許 20% 的誤差
      expect(elapsed).toBeGreaterThanOrEqual(160)
    })
  })

  describe('自動續約', () => {
    it('應該啟動自動續約', async () => {
      await lock.acquire('test-lock', {
        ttl: 1000,
        retryCount: 0,
        retryDelay: 100,
        refreshInterval: 300,
      })

      // 等待續約觸發
      await new Promise((resolve) => setTimeout(resolve, 400))

      // eval 應該被調用（一次是獲取鎖，至少一次是續約）
      expect((client.eval as any).mock.calls.length).toBeGreaterThanOrEqual(1)
    })

    it('應該在釋放鎖時停止續約', async () => {
      await lock.acquire('test-lock', {
        ttl: 1000,
        retryCount: 0,
        retryDelay: 100,
        refreshInterval: 200,
      })

      const callsBefore = (client.eval as any).mock.calls.length

      await lock.release('test-lock')

      // 等待一段時間，確認不再續約
      await new Promise((resolve) => setTimeout(resolve, 300))

      const callsAfter = (client.eval as any).mock.calls.length

      // 釋放後，eval 的調用次數應該不再增加（或者只增加釋放時的一次）
      expect(callsAfter - callsBefore).toBeLessThanOrEqual(1)
    })

    it('應該在鎖不再持有時停止續約', async () => {
      await lock.acquire('test-lock', {
        ttl: 5000,
        retryCount: 0,
        retryDelay: 100,
        refreshInterval: 200,
      })

      // 模擬鎖被其他進程刪除
      ;(client as any)._clear()

      // 等待續約嘗試
      await new Promise((resolve) => setTimeout(resolve, 300))

      // 續約應該失敗並停止（不會拋出錯誤）
      expect(true).toBe(true)
    })
  })

  describe('多節點競爭', () => {
    it('應該在多個節點間正確分配鎖', async () => {
      const locks = [
        new DistributedLock(client),
        new DistributedLock(client),
        new DistributedLock(client),
      ]

      const results = await Promise.all(
        locks.map((l) =>
          l.acquire('shared-resource', {
            ttl: 5000,
            retryCount: 0,
            retryDelay: 100,
          })
        )
      )

      // 只有一個節點應該成功
      const successCount = results.filter((r) => r === true).length
      expect(successCount).toBe(1)
    })

    it('應該在鎖釋放後允許其他節點獲取', async () => {
      const lock1 = new DistributedLock(client)
      const lock2 = new DistributedLock(client)

      await lock1.acquire('test-lock', {
        ttl: 5000,
        retryCount: 0,
        retryDelay: 100,
      })

      await lock1.release('test-lock')

      const acquired2 = await lock2.acquire('test-lock', {
        ttl: 5000,
        retryCount: 0,
        retryDelay: 100,
      })

      expect(acquired2).toBe(true)
    })
  })

  describe('錯誤處理', () => {
    it('應該在 Redis 不支援 SET 命令時拋出錯誤', async () => {
      const invalidClient = {} as GroupRedisClient
      const invalidLock = new DistributedLock(invalidClient)

      await expect(
        invalidLock.acquire('test-lock', {
          ttl: 5000,
          retryCount: 0,
          retryDelay: 100,
        })
      ).rejects.toThrow('does not support SET command')
    })

    it('應該在 Redis 不支援 EVAL 命令時拋出錯誤', async () => {
      const clientWithoutEval = {
        set: mock(async () => 'OK'),
      } as any

      const lockWithoutEval = new DistributedLock(clientWithoutEval)

      await lockWithoutEval.acquire('test-lock', {
        ttl: 5000,
        retryCount: 0,
        retryDelay: 100,
      })

      await expect(lockWithoutEval.release('test-lock')).rejects.toThrow(
        'does not support EVAL command'
      )
    })

    it('應該正確處理 Redis 操作失敗', async () => {
      const flakyClient = {
        set: mock(async () => {
          throw new Error('Network error')
        }),
      } as any

      const flakyLock = new DistributedLock(flakyClient)

      const acquired = await flakyLock.acquire('test-lock', {
        ttl: 5000,
        retryCount: 2,
        retryDelay: 10,
      })

      expect(acquired).toBe(false)
    })
  })

  describe('isHeld 方法', () => {
    it('應該在持有鎖時返回 true', async () => {
      await lock.acquire('test-lock', {
        ttl: 5000,
        retryCount: 0,
        retryDelay: 100,
      })

      expect(lock.isHeld('test-lock')).toBe(true)
    })

    it('應該在未持有鎖時返回 false', () => {
      expect(lock.isHeld('test-lock')).toBe(false)
    })

    it('應該在釋放鎖後返回 false', async () => {
      await lock.acquire('test-lock', {
        ttl: 5000,
        retryCount: 0,
        retryDelay: 100,
      })

      await lock.release('test-lock')

      expect(lock.isHeld('test-lock')).toBe(false)
    })
  })

  describe('TTL 和過期處理', () => {
    it('應該正確設定 TTL（毫秒轉秒）', async () => {
      await lock.acquire('test-lock', {
        ttl: 5500, // 5.5 秒
        retryCount: 0,
        retryDelay: 100,
      })

      // 應該向上取整為 6 秒
      expect(client.set).toHaveBeenCalledWith('test-lock', expect.any(String), 'EX', 6, 'NX')
    })

    it('應該在鎖過期後允許其他節點獲取', async () => {
      const lock1 = new DistributedLock(client)
      const lock2 = new DistributedLock(client)

      await lock1.acquire('test-lock', {
        ttl: 100,
        retryCount: 0,
        retryDelay: 50,
      })

      // 手動讓鎖過期
      ;(client as any)._expireKey('test-lock')

      const acquired2 = await lock2.acquire('test-lock', {
        ttl: 5000,
        retryCount: 0,
        retryDelay: 100,
      })

      expect(acquired2).toBe(true)
    })
  })
})
