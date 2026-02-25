import { beforeEach, describe, expect, test } from 'bun:test'
import { RingBuffer } from '../../../../src/drivers/kafka/RingBuffer'

describe('RingBuffer', () => {
  let buffer: RingBuffer<number>

  beforeEach(() => {
    buffer = new RingBuffer<number>(5)
  })

  describe('Initialization', () => {
    test('should create buffer with specified capacity', () => {
      expect(buffer.getCapacity()).toBe(5)
      expect(buffer.length).toBe(0)
      expect(buffer.isEmpty).toBe(true)
      expect(buffer.isFull).toBe(false)
    })

    test('should throw on zero capacity', () => {
      expect(() => new RingBuffer(0)).toThrow('capacity must be positive')
    })

    test('should throw on negative capacity', () => {
      expect(() => new RingBuffer(-1)).toThrow('capacity must be positive')
    })

    test('should create buffer with capacity of 1', () => {
      const tiny = new RingBuffer<string>(1)
      expect(tiny.getCapacity()).toBe(1)
      expect(tiny.push('a')).toBe(true)
      expect(tiny.isFull).toBe(true)
      expect(tiny.shift()).toBe('a')
    })
  })

  describe('Push', () => {
    test('should push items and increase length', () => {
      expect(buffer.push(1)).toBe(true)
      expect(buffer.length).toBe(1)

      expect(buffer.push(2)).toBe(true)
      expect(buffer.length).toBe(2)
    })

    test('should return false when buffer is full', () => {
      for (let i = 0; i < 5; i++) {
        expect(buffer.push(i)).toBe(true)
      }
      expect(buffer.isFull).toBe(true)
      expect(buffer.push(99)).toBe(false)
      expect(buffer.length).toBe(5)
    })

    test('should allow push after shift frees space', () => {
      for (let i = 0; i < 5; i++) {
        buffer.push(i)
      }
      expect(buffer.push(99)).toBe(false)

      buffer.shift()
      expect(buffer.push(99)).toBe(true)
      expect(buffer.length).toBe(5)
    })
  })

  describe('Shift', () => {
    test('should return items in FIFO order', () => {
      buffer.push(10)
      buffer.push(20)
      buffer.push(30)

      expect(buffer.shift()).toBe(10)
      expect(buffer.shift()).toBe(20)
      expect(buffer.shift()).toBe(30)
    })

    test('should return undefined when empty', () => {
      expect(buffer.shift()).toBeUndefined()
    })

    test('should decrease length on shift', () => {
      buffer.push(1)
      buffer.push(2)
      expect(buffer.length).toBe(2)

      buffer.shift()
      expect(buffer.length).toBe(1)

      buffer.shift()
      expect(buffer.length).toBe(0)
      expect(buffer.isEmpty).toBe(true)
    })
  })

  describe('Peek', () => {
    test('should return head element without removing', () => {
      buffer.push(42)
      buffer.push(99)

      expect(buffer.peek()).toBe(42)
      expect(buffer.length).toBe(2)
      expect(buffer.peek()).toBe(42)
    })

    test('should return undefined when empty', () => {
      expect(buffer.peek()).toBeUndefined()
    })
  })

  describe('ShiftMany', () => {
    test('should dequeue requested number of items', () => {
      for (let i = 0; i < 5; i++) {
        buffer.push(i)
      }

      const result = buffer.shiftMany(3)
      expect(result).toEqual([0, 1, 2])
      expect(buffer.length).toBe(2)
    })

    test('should return fewer items if not enough available', () => {
      buffer.push(1)
      buffer.push(2)

      const result = buffer.shiftMany(5)
      expect(result).toEqual([1, 2])
      expect(buffer.length).toBe(0)
    })

    test('should return empty array when buffer is empty', () => {
      const result = buffer.shiftMany(3)
      expect(result).toEqual([])
    })

    test('should return all items when count equals length', () => {
      buffer.push(10)
      buffer.push(20)
      buffer.push(30)

      const result = buffer.shiftMany(3)
      expect(result).toEqual([10, 20, 30])
      expect(buffer.isEmpty).toBe(true)
    })
  })

  describe('Wrap-around behavior', () => {
    test('should handle wrap-around correctly', () => {
      // 填滿緩衝區
      for (let i = 0; i < 5; i++) {
        buffer.push(i)
      }

      // 移除前 3 個（head 前進到 index 3）
      expect(buffer.shift()).toBe(0)
      expect(buffer.shift()).toBe(1)
      expect(buffer.shift()).toBe(2)

      // 再推入 3 個（tail 應該環繞）
      buffer.push(5)
      buffer.push(6)
      buffer.push(7)

      // 驗證 FIFO 順序
      expect(buffer.shift()).toBe(3)
      expect(buffer.shift()).toBe(4)
      expect(buffer.shift()).toBe(5)
      expect(buffer.shift()).toBe(6)
      expect(buffer.shift()).toBe(7)
      expect(buffer.isEmpty).toBe(true)
    })

    test('should handle multiple wrap-around cycles', () => {
      // 反覆推入和移除，讓指標環繞多次
      for (let cycle = 0; cycle < 10; cycle++) {
        for (let i = 0; i < 5; i++) {
          expect(buffer.push(cycle * 5 + i)).toBe(true)
        }
        for (let i = 0; i < 5; i++) {
          expect(buffer.shift()).toBe(cycle * 5 + i)
        }
        expect(buffer.isEmpty).toBe(true)
      }
    })

    test('should handle interleaved push/shift with wrap-around', () => {
      // 交替推入和移除
      for (let i = 0; i < 20; i++) {
        buffer.push(i)
        expect(buffer.shift()).toBe(i)
      }
      expect(buffer.isEmpty).toBe(true)
    })
  })

  describe('Clear', () => {
    test('should remove all elements', () => {
      buffer.push(1)
      buffer.push(2)
      buffer.push(3)

      buffer.clear()

      expect(buffer.length).toBe(0)
      expect(buffer.isEmpty).toBe(true)
      expect(buffer.shift()).toBeUndefined()
    })

    test('should allow reuse after clear', () => {
      for (let i = 0; i < 5; i++) {
        buffer.push(i)
      }
      buffer.clear()

      expect(buffer.push(100)).toBe(true)
      expect(buffer.shift()).toBe(100)
    })

    test('should reset pointers after clear with wrap-around', () => {
      // 製造環繞狀態
      buffer.push(1)
      buffer.push(2)
      buffer.push(3)
      buffer.shift()
      buffer.shift()
      buffer.push(4)
      buffer.push(5)

      buffer.clear()

      // 從清空狀態重新推入應正常工作
      for (let i = 0; i < 5; i++) {
        expect(buffer.push(i * 10)).toBe(true)
      }
      for (let i = 0; i < 5; i++) {
        expect(buffer.shift()).toBe(i * 10)
      }
    })
  })

  describe('ToArray', () => {
    test('should return elements in FIFO order', () => {
      buffer.push(3)
      buffer.push(1)
      buffer.push(4)

      expect(buffer.toArray()).toEqual([3, 1, 4])
    })

    test('should return empty array when empty', () => {
      expect(buffer.toArray()).toEqual([])
    })

    test('should not modify buffer contents', () => {
      buffer.push(1)
      buffer.push(2)

      buffer.toArray()

      expect(buffer.length).toBe(2)
      expect(buffer.shift()).toBe(1)
    })

    test('should handle wrap-around state correctly', () => {
      buffer.push(1)
      buffer.push(2)
      buffer.push(3)
      buffer.push(4)
      buffer.push(5)

      buffer.shift() // 移除 1
      buffer.shift() // 移除 2
      buffer.push(6) // 環繞推入
      buffer.push(7) // 環繞推入

      expect(buffer.toArray()).toEqual([3, 4, 5, 6, 7])
    })
  })

  describe('Object storage', () => {
    test('should store and retrieve objects correctly', () => {
      const objBuffer = new RingBuffer<{ id: string; value: number }>(3)

      objBuffer.push({ id: 'a', value: 1 })
      objBuffer.push({ id: 'b', value: 2 })

      const first = objBuffer.shift()
      expect(first).toEqual({ id: 'a', value: 1 })

      const second = objBuffer.shift()
      expect(second).toEqual({ id: 'b', value: 2 })
    })

    test('should release references on shift', () => {
      const objBuffer = new RingBuffer<{ data: string }>(2)
      objBuffer.push({ data: 'hello' })
      objBuffer.push({ data: 'world' })

      objBuffer.shift()
      objBuffer.shift()

      // 推入新元素不應保留舊引用
      objBuffer.push({ data: 'new' })
      expect(objBuffer.shift()).toEqual({ data: 'new' })
    })
  })

  describe('High-throughput simulation', () => {
    test('should handle 100,000 operations correctly', () => {
      const largeBuffer = new RingBuffer<number>(1000)

      // 混合推入和移除模擬高吞吐量場景
      let pushCount = 0
      let shiftCount = 0

      for (let i = 0; i < 100_000; i++) {
        if (largeBuffer.length < 900) {
          largeBuffer.push(pushCount++)
        }
        if (largeBuffer.length > 100) {
          const val = largeBuffer.shift()
          expect(val).toBe(shiftCount++)
        }
      }

      // 清空剩餘
      while (!largeBuffer.isEmpty) {
        const val = largeBuffer.shift()
        expect(val).toBe(shiftCount++)
      }

      expect(pushCount).toBe(shiftCount)
    })

    test('should maintain FIFO order under stress', () => {
      const stressBuffer = new RingBuffer<number>(10)

      for (let round = 0; round < 1000; round++) {
        const batchSize = (round % 10) + 1
        for (let i = 0; i < batchSize && !stressBuffer.isFull; i++) {
          stressBuffer.push(round * 100 + i)
        }

        const drainCount = Math.min(batchSize, stressBuffer.length)
        const batch = stressBuffer.shiftMany(drainCount)
        expect(batch.length).toBe(drainCount)

        // 驗證批次內部是遞增的
        for (let i = 1; i < batch.length; i++) {
          expect(batch[i]).toBeGreaterThan(batch[i - 1])
        }
      }
    })
  })

  describe('Edge cases', () => {
    test('should handle shiftMany with count of 0', () => {
      buffer.push(1)
      const result = buffer.shiftMany(0)
      expect(result).toEqual([])
      expect(buffer.length).toBe(1)
    })

    test('should handle push and immediate shift repeatedly', () => {
      for (let i = 0; i < 100; i++) {
        expect(buffer.push(i)).toBe(true)
        expect(buffer.shift()).toBe(i)
        expect(buffer.isEmpty).toBe(true)
      }
    })

    test('should handle filling and emptying repeatedly', () => {
      for (let round = 0; round < 50; round++) {
        for (let i = 0; i < 5; i++) {
          buffer.push(round * 5 + i)
        }
        expect(buffer.isFull).toBe(true)

        const items = buffer.shiftMany(5)
        expect(items.length).toBe(5)
        expect(buffer.isEmpty).toBe(true)
      }
    })
  })
})
