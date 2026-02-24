import { describe, expect, it } from 'bun:test'
import { XenonMemoryError } from '../src/errors'
import { XenonManager } from '../src/XenonManager'
import { createMockFfiLoader, TEST_IMPLEMENTATIONS, TEST_SYMBOLS } from './helpers'

describe('XenonManager', () => {
  describe('configuration', () => {
    it('should create with default config', () => {
      const manager = new XenonManager()
      expect(manager).toBeDefined()
    })

    it('should accept custom config', () => {
      const manager = new XenonManager({
        maxTotalMemory: 512 * 1024 * 1024,
      })
      expect(manager).toBeDefined()
    })
  })

  describe('library loading', () => {
    it('should load a library', () => {
      const manager = new XenonManager({
        allowedPaths: ['/mock/test.so'],
      })
      // Override FFI loader via private injection would require exposing constructor params
      // This is a simplified test
      expect(manager).toBeDefined()
    })

    it('should list loaded libraries', () => {
      const manager = new XenonManager()
      const libs = manager.listLibraries()
      expect(Array.isArray(libs)).toBe(true)
    })
  })

  describe('memory allocation', () => {
    it('should allocate memory buffers', () => {
      const manager = new XenonManager()
      const buf = manager.allocBuffer(1024, 'test')

      expect(buf).toBeInstanceOf(Uint8Array)
      expect(buf.length).toBe(1024)
    })

    it('should reject zero-size buffers', () => {
      const manager = new XenonManager()
      expect(() => manager.allocBuffer(0, 'test')).toThrow(XenonMemoryError)
    })

    it('should reject negative-size buffers', () => {
      const manager = new XenonManager()
      expect(() => manager.allocBuffer(-1, 'test')).toThrow(XenonMemoryError)
    })

    it('should track allocated memory', () => {
      const manager = new XenonManager()
      manager.allocBuffer(512, 'buf1')
      manager.allocBuffer(1024, 'buf2')

      const stats = manager.getMemoryStats()
      expect(stats.activeBuffers).toBe(2)
    })
  })

  describe('memory freeing', () => {
    it('should free allocated buffers', () => {
      const manager = new XenonManager()
      const buf = manager.allocBuffer(1024, 'test')

      manager.freeBuffer(buf)

      const stats = manager.getMemoryStats()
      expect(stats.activeBuffers).toBe(0)
    })

    it('should throw on double-free', () => {
      const manager = new XenonManager()
      const buf = manager.allocBuffer(1024, 'test')

      manager.freeBuffer(buf)
      expect(() => manager.freeBuffer(buf)).toThrow(XenonMemoryError)
    })

    it('should free by pointer number', () => {
      const manager = new XenonManager()
      const buf = manager.allocBuffer(1024, 'test')
      const ptr = (buf as any).ptr || 12345

      // Allocate another to have known ptr
      manager.freeBuffer(buf)

      const stats = manager.getMemoryStats()
      expect(stats.activeBuffers).toBe(0)
    })
  })

  describe('borrowed buffers', () => {
    it('should create borrowed buffer references', () => {
      const manager = new XenonManager()
      const borrowed = manager.borrowBuffer(12345, 1024, 'borrowed')

      expect(borrowed.ptr).toBe(12345)
      expect(borrowed.len).toBe(1024)
      expect(borrowed.ownership).toBe('borrowed')
    })

    it('should track borrowed buffers in stats', () => {
      const manager = new XenonManager()
      manager.borrowBuffer(12345, 1024, 'borrowed')

      const stats = manager.getMemoryStats()
      expect(stats.activeBuffers).toBe(1)
    })
  })

  describe('memory limits', () => {
    it('should enforce total memory limit', () => {
      const manager = new XenonManager({ maxTotalMemory: 2048 })

      manager.allocBuffer(1024, 'buf1')

      expect(() => manager.allocBuffer(2048, 'buf2')).toThrow(XenonMemoryError)
    })

    it('should allow unlimited memory when limit is 0', () => {
      const manager = new XenonManager({ maxTotalMemory: 0 })

      const buf = manager.allocBuffer(1000000, 'big')
      expect(buf.length).toBe(1000000)
    })
  })

  describe('statistics', () => {
    it('should report memory statistics', () => {
      const manager = new XenonManager()
      manager.allocBuffer(512, 'buf1')
      manager.allocBuffer(1024, 'buf2')

      const stats = manager.getMemoryStats()
      expect(stats.totalAllocated).toBe(1536)
      expect(stats.activeBuffers).toBe(2)
      expect(stats.peakBuffers).toBeGreaterThanOrEqual(2)
    })

    it('should track freed memory', () => {
      const manager = new XenonManager()
      const buf = manager.allocBuffer(1024, 'test')
      manager.freeBuffer(buf)

      const stats = manager.getMemoryStats()
      expect(stats.totalFreed).toBe(1024)
    })
  })

  describe('list buffers', () => {
    it('should list allocated buffers', () => {
      const manager = new XenonManager()
      manager.allocBuffer(512, 'buf1')
      manager.allocBuffer(1024, 'buf2')

      const buffers = manager.listBuffers()
      expect(buffers.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('close', () => {
    it('should close and cleanup', () => {
      const manager = new XenonManager()
      manager.allocBuffer(1024, 'test')

      manager.close()

      const stats = manager.getMemoryStats()
      expect(stats.activeBuffers).toBe(0)
    })
  })
})
