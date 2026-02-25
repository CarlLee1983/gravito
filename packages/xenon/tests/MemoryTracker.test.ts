import { describe, expect, it } from 'bun:test'
import { XenonMemoryError } from '../src/errors'
import { createBorrowedBuffer, createOwnedBuffer } from '../src/memory/BufferOwnership'
import { MemoryTracker } from '../src/memory/MemoryTracker'

describe('MemoryTracker', () => {
  describe('registration and tracking', () => {
    it('should register and track buffers', () => {
      const tracker = new MemoryTracker()
      const buf = createOwnedBuffer(12345, 1024, 'test')

      tracker.register(buf)
      expect(tracker.get(12345)).toBe(buf)
    })

    it('should track active buffers', () => {
      const tracker = new MemoryTracker()
      const buf = createOwnedBuffer(12345, 1024, 'test')
      tracker.register(buf)

      expect(tracker.isActive(12345)).toBe(true)
    })

    it('should return undefined for unknown buffer', () => {
      const tracker = new MemoryTracker()
      expect(tracker.get(99999)).toBeUndefined()
    })
  })

  describe('free operations', () => {
    it('should mark buffer as freed', () => {
      const tracker = new MemoryTracker()
      const buf = createOwnedBuffer(12345, 1024, 'test')
      tracker.register(buf)

      tracker.free(12345)
      expect(tracker.isActive(12345)).toBe(false)
    })

    it('should throw on double-free', () => {
      const tracker = new MemoryTracker()
      const buf = createOwnedBuffer(12345, 1024, 'test')
      tracker.register(buf)

      tracker.free(12345)
      expect(() => tracker.free(12345)).toThrow(XenonMemoryError)
      // Buffer is still in tracker after free, but marked as freed
      const freedBuf = tracker.get(12345)
      expect(freedBuf?.freed).toBe(true)
    })

    it('should throw on freeing untracked buffer', () => {
      const tracker = new MemoryTracker()
      expect(() => tracker.free(99999)).toThrow(XenonMemoryError)
    })
  })

  describe('statistics', () => {
    it('should track memory statistics', () => {
      const tracker = new MemoryTracker()
      const buf1 = createOwnedBuffer(100, 1024, 'buf1')
      const buf2 = createOwnedBuffer(200, 512, 'buf2')

      tracker.register(buf1)
      tracker.register(buf2)

      const stats = tracker.getStats()
      expect(stats.totalAllocated).toBe(1536)
      expect(stats.activeBuffers).toBe(2)
    })

    it('should track freed memory', () => {
      const tracker = new MemoryTracker()
      const buf = createOwnedBuffer(12345, 1024, 'test')
      tracker.register(buf)

      tracker.free(12345)

      const stats = tracker.getStats()
      expect(stats.totalFreed).toBe(1024)
    })

    it('should track peak buffers', () => {
      const tracker = new MemoryTracker()
      const buf1 = createOwnedBuffer(100, 1024, 'buf1')
      tracker.register(buf1)

      const buf2 = createOwnedBuffer(200, 512, 'buf2')
      tracker.register(buf2)

      const stats = tracker.getStats()
      expect(stats.peakBuffers).toBe(2)
    })
  })

  describe('memory limits', () => {
    it('should enforce memory limit', () => {
      const tracker = new MemoryTracker(1000)
      const buf = createOwnedBuffer(12345, 500, 'test')
      tracker.register(buf)

      const bigBuf = createOwnedBuffer(54321, 600, 'big')
      expect(() => tracker.register(bigBuf)).toThrow(XenonMemoryError)
    })

    it('should allow unlimited memory when limit is 0', () => {
      const tracker = new MemoryTracker(0)
      const buf = createOwnedBuffer(12345, 999999999, 'test')
      expect(() => tracker.register(buf)).not.toThrow()
    })
  })

  describe('list buffers', () => {
    it('should list active buffers', () => {
      const tracker = new MemoryTracker()
      const buf1 = createOwnedBuffer(100, 1024, 'buf1')
      const buf2 = createOwnedBuffer(200, 512, 'buf2')

      tracker.register(buf1)
      tracker.register(buf2)

      const buffers = tracker.listBuffers(false)
      expect(buffers).toHaveLength(2)
    })

    it('should list all buffers including freed', () => {
      const tracker = new MemoryTracker()
      const buf1 = createOwnedBuffer(100, 1024, 'buf1')
      tracker.register(buf1)
      tracker.free(100)

      const active = tracker.listBuffers(false)
      expect(active).toHaveLength(0)

      const all = tracker.listBuffers(true)
      expect(all).toHaveLength(1)
      expect(all[0]?.freed).toBe(true)
    })
  })

  describe('borrowed buffers', () => {
    it('should track borrowed buffers', () => {
      const tracker = new MemoryTracker()
      const buf = createBorrowedBuffer(12345, 1024, 'borrowed')

      tracker.register(buf)
      expect(tracker.get(12345)).toBe(buf)
    })

    it('should not require free for borrowed buffers', () => {
      const tracker = new MemoryTracker()
      const buf = createBorrowedBuffer(12345, 1024, 'borrowed')
      tracker.register(buf)

      // Borrowed buffer can still be freed explicitly
      tracker.free(12345)
      expect(tracker.isActive(12345)).toBe(false)
    })
  })

  describe('clear', () => {
    it('should clear all buffers', () => {
      const tracker = new MemoryTracker()
      const buf1 = createOwnedBuffer(100, 1024, 'buf1')
      const buf2 = createOwnedBuffer(200, 512, 'buf2')

      tracker.register(buf1)
      tracker.register(buf2)
      tracker.clear()

      expect(tracker.listBuffers()).toHaveLength(0)
      const stats = tracker.getStats()
      expect(stats.activeBuffers).toBe(0)
      expect(stats.totalAllocated).toBe(0)
    })
  })
})
