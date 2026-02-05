import { beforeEach, describe, expect, it } from 'bun:test'
import { InMemoryLockProvider } from '../../src/storage/InMemoryLockProvider'

describe('InMemoryLockProvider', () => {
  let provider: InMemoryLockProvider

  beforeEach(() => {
    provider = new InMemoryLockProvider()
  })

  describe('createLock()', () => {
    it('should create a new lock for a given key', () => {
      const lock = provider.createLock('test-key', 30)
      expect(lock).toBeDefined()
      expect(typeof lock.block).toBe('function')
    })

    it('should return the same lock instance for the same key', () => {
      const lock1 = provider.createLock('same-key', 30)
      const lock2 = provider.createLock('same-key', 30)
      expect(lock1).toBe(lock2)
    })

    it('should return different lock instances for different keys', () => {
      const lock1 = provider.createLock('key-a', 30)
      const lock2 = provider.createLock('key-b', 30)
      expect(lock1).not.toBe(lock2)
    })
  })

  describe('InMemoryLock.block()', () => {
    it('should execute the function and return its result', async () => {
      const lock = provider.createLock('test', 30)

      const result = await lock.block(5, async () => {
        return 42
      })

      expect(result).toBe(42)
    })

    it('should execute the function with string return type', async () => {
      const lock = provider.createLock('test', 30)

      const result = await lock.block(5, async () => {
        return 'hello world'
      })

      expect(result).toBe('hello world')
    })

    it('should execute the function with complex return type', async () => {
      const lock = provider.createLock('test', 30)

      const result = await lock.block(5, async () => {
        return { name: 'test', items: [1, 2, 3] }
      })

      expect(result).toEqual({ name: 'test', items: [1, 2, 3] })
    })

    it('should release lock even if function throws', async () => {
      const lock = provider.createLock('test', 30)

      // 第一次呼叫拋錯
      await expect(
        lock.block(5, async () => {
          throw new Error('oops')
        })
      ).rejects.toThrow('oops')

      // 第二次呼叫應成功（鎖已釋放）
      const result = await lock.block(5, async () => 'recovered')
      expect(result).toBe('recovered')
    })

    it('should provide mutual exclusion', async () => {
      const lock = provider.createLock('mutex', 30)
      const executionOrder: string[] = []

      // 第一個任務獲取鎖
      const task1 = lock.block(5, async () => {
        executionOrder.push('task1-start')
        await new Promise((resolve) => setTimeout(resolve, 50))
        executionOrder.push('task1-end')
        return 'task1'
      })

      // 第二個任務應等待
      const task2 = lock.block(5, async () => {
        executionOrder.push('task2-start')
        await new Promise((resolve) => setTimeout(resolve, 10))
        executionOrder.push('task2-end')
        return 'task2'
      })

      const [result1, result2] = await Promise.all([task1, task2])

      expect(result1).toBe('task1')
      expect(result2).toBe('task2')

      // 確保互斥：task1 必須在 task2 開始前完成
      expect(executionOrder).toEqual(['task1-start', 'task1-end', 'task2-start', 'task2-end'])
    })

    it('should process queue in FIFO order', async () => {
      const lock = provider.createLock('fifo', 30)
      const order: number[] = []

      // 第一個任務獲取鎖並持有一段時間
      const task0 = lock.block(5, async () => {
        order.push(0)
        await new Promise((resolve) => setTimeout(resolve, 30))
      })

      // 等一小段時間確保 task0 已獲取鎖
      await new Promise((resolve) => setTimeout(resolve, 5))

      // 按順序排隊
      const task1 = lock.block(5, async () => {
        order.push(1)
      })
      const task2 = lock.block(5, async () => {
        order.push(2)
      })
      const task3 = lock.block(5, async () => {
        order.push(3)
      })

      await Promise.all([task0, task1, task2, task3])

      expect(order).toEqual([0, 1, 2, 3])
    })

    it('should timeout when lock cannot be acquired', async () => {
      const lock = provider.createLock('timeout-test', 30)

      // 第一個任務持有鎖很長時間
      const _longTask = lock.block(10, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000))
        return 'done'
      })

      // 第二個任務應超時（0.1 秒超時）
      await expect(lock.block(0.1, async () => 'should not reach')).rejects.toThrow(
        'Lock acquisition timeout'
      )

      // 清理：無法真正取消 longTask，但不影響測試
    })

    it('should handle rapid sequential lock/unlock cycles', async () => {
      const lock = provider.createLock('rapid', 30)
      const results: number[] = []

      for (let i = 0; i < 10; i++) {
        const result = await lock.block(5, async () => i)
        results.push(result)
      }

      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    })
  })

  describe('multiple locks independence', () => {
    it('should allow concurrent execution on different keys', async () => {
      const lockA = provider.createLock('key-a', 30)
      const lockB = provider.createLock('key-b', 30)
      const executionOrder: string[] = []

      const taskA = lockA.block(5, async () => {
        executionOrder.push('a-start')
        await new Promise((resolve) => setTimeout(resolve, 30))
        executionOrder.push('a-end')
      })

      const taskB = lockB.block(5, async () => {
        executionOrder.push('b-start')
        await new Promise((resolve) => setTimeout(resolve, 10))
        executionOrder.push('b-end')
      })

      await Promise.all([taskA, taskB])

      // 兩個鎖是獨立的，b 應能在 a 完成前結束
      expect(executionOrder[0]).toBe('a-start')
      expect(executionOrder[1]).toBe('b-start')
      // b 較短，應先結束
      expect(executionOrder[2]).toBe('b-end')
      expect(executionOrder[3]).toBe('a-end')
    })
  })
})
