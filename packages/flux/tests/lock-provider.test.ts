import { beforeEach, describe, expect, it } from 'bun:test'
import type { Lock } from '../src/core/LockProvider'
import { MemoryLockProvider } from '../src/core/LockProvider'

describe('MemoryLockProvider', () => {
  let provider: MemoryLockProvider

  beforeEach(() => {
    provider = new MemoryLockProvider()
  })

  describe('acquire', () => {
    it('should acquire a lock successfully', async () => {
      const lock = await provider.acquire('resource-1', 'node-a', 5000)

      expect(lock).not.toBeNull()
      expect(lock!.id).toBe('resource-1')
      expect(lock!.owner).toBe('node-a')
      expect(lock!.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should reject lock acquisition by a different owner', async () => {
      await provider.acquire('resource-1', 'node-a', 5000)

      const secondLock = await provider.acquire('resource-1', 'node-b', 5000)
      expect(secondLock).toBeNull()
    })

    it('should allow same owner to re-acquire (refresh)', async () => {
      const firstLock = await provider.acquire('resource-1', 'node-a', 5000)
      expect(firstLock).not.toBeNull()

      const secondLock = await provider.acquire('resource-1', 'node-a', 10000)
      expect(secondLock).not.toBeNull()
      expect(secondLock!.owner).toBe('node-a')
      // 新的過期時間應更長
      expect(secondLock!.expiresAt).toBeGreaterThanOrEqual(firstLock!.expiresAt)
    })

    it('should allow acquisition after lock expires', async () => {
      // 設定 1ms TTL
      await provider.acquire('resource-1', 'node-a', 1)

      // 等待過期
      await new Promise((resolve) => setTimeout(resolve, 10))

      const newLock = await provider.acquire('resource-1', 'node-b', 5000)
      expect(newLock).not.toBeNull()
      expect(newLock!.owner).toBe('node-b')
    })

    it('should acquire locks for different resources independently', async () => {
      const lock1 = await provider.acquire('resource-1', 'node-a', 5000)
      const lock2 = await provider.acquire('resource-2', 'node-b', 5000)

      expect(lock1).not.toBeNull()
      expect(lock2).not.toBeNull()
    })

    it('should provide a release function on the lock', async () => {
      const lock = await provider.acquire('resource-1', 'node-a', 5000)
      expect(lock).not.toBeNull()
      expect(typeof lock!.release).toBe('function')

      await lock!.release()

      // 釋放後其他 owner 可以取得鎖
      const newLock = await provider.acquire('resource-1', 'node-b', 5000)
      expect(newLock).not.toBeNull()
      expect(newLock!.owner).toBe('node-b')
    })
  })

  describe('refresh', () => {
    it('should refresh an active lock', async () => {
      await provider.acquire('resource-1', 'node-a', 5000)

      const result = await provider.refresh('resource-1', 'node-a', 10000)
      expect(result).toBe(true)
    })

    it('should fail to refresh a lock owned by another node', async () => {
      await provider.acquire('resource-1', 'node-a', 5000)

      const result = await provider.refresh('resource-1', 'node-b', 10000)
      expect(result).toBe(false)
    })

    it('should fail to refresh a non-existent lock', async () => {
      const result = await provider.refresh('non-existent', 'node-a', 10000)
      expect(result).toBe(false)
    })

    it('should fail to refresh an expired lock', async () => {
      await provider.acquire('resource-1', 'node-a', 1)

      // 等待過期
      await new Promise((resolve) => setTimeout(resolve, 10))

      const result = await provider.refresh('resource-1', 'node-a', 10000)
      expect(result).toBe(false)
    })
  })

  describe('release', () => {
    it('should release an existing lock', async () => {
      await provider.acquire('resource-1', 'node-a', 5000)

      await provider.release('resource-1')

      // 釋放後可以被其他人取得
      const newLock = await provider.acquire('resource-1', 'node-b', 5000)
      expect(newLock).not.toBeNull()
    })

    it('should handle releasing a non-existent lock gracefully', async () => {
      // 不應拋出錯誤
      await provider.release('non-existent')
    })
  })

  describe('createLock (private, tested via acquire)', () => {
    it('should create lock with correct properties', async () => {
      const lock = (await provider.acquire('my-resource', 'owner-1', 5000)) as Lock

      expect(lock.id).toBe('my-resource')
      expect(lock.owner).toBe('owner-1')
      expect(typeof lock.expiresAt).toBe('number')
      expect(lock.expiresAt).toBeGreaterThan(Date.now())
    })
  })

  describe('concurrent scenarios', () => {
    it('should handle rapid acquire-release cycles', async () => {
      for (let i = 0; i < 10; i++) {
        const lock = await provider.acquire('resource', `node-${i}`, 5000)
        expect(lock).not.toBeNull()
        await lock!.release()
      }
    })

    it('should handle multiple resources with multiple owners', async () => {
      const locks: Array<Lock | null> = []

      for (let r = 0; r < 5; r++) {
        const lock = await provider.acquire(`resource-${r}`, `node-${r}`, 5000)
        locks.push(lock)
      }

      expect(locks.every((l) => l !== null)).toBe(true)

      // 每個資源的 owner 都不同
      for (let r = 0; r < 5; r++) {
        const conflictLock = await provider.acquire(`resource-${r}`, 'another-node', 5000)
        expect(conflictLock).toBeNull()
      }
    })
  })
})
