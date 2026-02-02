import { beforeEach, describe, expect, it } from 'bun:test'
import { MemoryLock } from '../../src/locks/MemoryLock'

describe('MemoryLock', () => {
  let lock: MemoryLock

  beforeEach(() => {
    lock = new MemoryLock()
  })

  describe('acquire', () => {
    it('should acquire lock when resource is not locked', async () => {
      const acquired = await lock.acquire('test-resource', 1000)
      expect(acquired).toBe(true)
    })

    it('should not acquire lock when resource is already locked', async () => {
      await lock.acquire('test-resource', 1000)
      const acquired = await lock.acquire('test-resource', 1000)
      expect(acquired).toBe(false)
    })

    it('should acquire lock after TTL expires', async () => {
      await lock.acquire('test-resource', 50)
      await new Promise((resolve) => setTimeout(resolve, 60))
      const acquired = await lock.acquire('test-resource', 1000)
      expect(acquired).toBe(true)
    })

    it('should handle multiple resources independently', async () => {
      const acquired1 = await lock.acquire('resource-1', 1000)
      const acquired2 = await lock.acquire('resource-2', 1000)
      expect(acquired1).toBe(true)
      expect(acquired2).toBe(true)
    })
  })

  describe('release', () => {
    it('should release lock and allow reacquisition', async () => {
      await lock.acquire('test-resource', 1000)
      await lock.release('test-resource')
      const acquired = await lock.acquire('test-resource', 1000)
      expect(acquired).toBe(true)
    })

    it('should be safe to release non-existent lock', async () => {
      await expect(lock.release('non-existent')).resolves.toBeUndefined()
    })
  })

  describe('isLocked', () => {
    it('should return false for unlocked resource', async () => {
      const locked = await lock.isLocked('test-resource')
      expect(locked).toBe(false)
    })

    it('should return true for locked resource', async () => {
      await lock.acquire('test-resource', 1000)
      const locked = await lock.isLocked('test-resource')
      expect(locked).toBe(true)
    })

    it('should return false after TTL expires', async () => {
      await lock.acquire('test-resource', 50)
      await new Promise((resolve) => setTimeout(resolve, 60))
      const locked = await lock.isLocked('test-resource')
      expect(locked).toBe(false)
    })

    it('should clean up expired locks on check', async () => {
      await lock.acquire('test-resource', 50)
      expect(lock.size()).toBe(1)
      await new Promise((resolve) => setTimeout(resolve, 60))
      await lock.isLocked('test-resource')
      expect(lock.size()).toBe(0)
    })
  })

  describe('clear', () => {
    it('should clear all locks', async () => {
      await lock.acquire('resource-1', 1000)
      await lock.acquire('resource-2', 1000)
      expect(lock.size()).toBe(2)
      await lock.clear()
      expect(lock.size()).toBe(0)
    })
  })

  describe('size', () => {
    it('should return correct lock count', async () => {
      expect(lock.size()).toBe(0)
      await lock.acquire('resource-1', 1000)
      expect(lock.size()).toBe(1)
      await lock.acquire('resource-2', 1000)
      expect(lock.size()).toBe(2)
      await lock.release('resource-1')
      expect(lock.size()).toBe(1)
    })
  })

  describe('concurrent access', () => {
    it('should prevent concurrent access to same resource', async () => {
      const results = await Promise.all([
        lock.acquire('test-resource', 1000),
        lock.acquire('test-resource', 1000),
        lock.acquire('test-resource', 1000),
      ])

      const acquiredCount = results.filter((r) => r === true).length
      expect(acquiredCount).toBe(1)
    })
  })
})
