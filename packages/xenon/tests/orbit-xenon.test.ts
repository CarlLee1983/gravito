import { describe, expect, it } from 'bun:test'
import { OrbitXenon } from '../src/OrbitXenon'
import { XenonManager } from '../src/XenonManager'

/**
 * Mock Context for testing
 */
class MockContext {
  [key: string]: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe('OrbitXenon', () => {
  describe('configuration', () => {
    it('should create with default config', () => {
      const orbit = OrbitXenon.configure()
      expect(orbit).toBeDefined()
      expect(orbit.name).toBe('orbit:xenon')
    })

    it('should accept custom config', () => {
      const orbit = OrbitXenon.configure({
        exposeAs: 'ffi',
        blockedPaths: ['/etc/sensitive.so'],
      })
      expect(orbit).toBeDefined()
    })

    it('should have bootstrap phase', () => {
      const orbit = new OrbitXenon()
      expect(orbit.phase).toBe('bootstrap')
    })
  })

  describe('install', () => {
    it('should install and expose manager', async () => {
      const orbit = new OrbitXenon()
      const ctx = new MockContext()

      await orbit.install(ctx)

      expect((ctx as any).xenon).toBeInstanceOf(XenonManager)
    })

    it('should use custom expose name', async () => {
      const orbit = new OrbitXenon({ exposeAs: 'ffi' })
      const ctx = new MockContext()

      await orbit.install(ctx)

      expect((ctx as any).ffi).toBeInstanceOf(XenonManager)
      expect((ctx as any).xenon).toBeUndefined()
    })

    it('should provide working manager instance', async () => {
      const orbit = new OrbitXenon()
      const ctx = new MockContext()

      await orbit.install(ctx)

      const manager = (ctx as any).xenon as XenonManager
      const buf = manager.allocBuffer(1024, 'test')
      expect(buf.length).toBe(1024)

      manager.freeBuffer(buf)
    })

    it('should pass config to manager', async () => {
      const orbit = new OrbitXenon({
        maxTotalMemory: 512,
      })
      const ctx = new MockContext()

      await orbit.install(ctx)

      const manager = (ctx as any).xenon as XenonManager
      // Try to allocate beyond limit
      manager.allocBuffer(256, 'buf1')
      expect(() => manager.allocBuffer(512, 'buf2')).toThrow()
    })
  })

  describe('uninstall', () => {
    it('should cleanup on uninstall', async () => {
      const orbit = new OrbitXenon()
      const ctx = new MockContext()

      await orbit.install(ctx)
      const manager = (ctx as any).xenon
      manager.allocBuffer(1024, 'test')

      await orbit.uninstall()

      expect(orbit.getManager()).toBeNull()
    })
  })

  describe('getManager', () => {
    it('should return manager after install', async () => {
      const orbit = new OrbitXenon()
      const ctx = new MockContext()

      await orbit.install(ctx)

      const manager = orbit.getManager()
      expect(manager).toBeInstanceOf(XenonManager)
    })

    it('should return null before install', () => {
      const orbit = new OrbitXenon()
      expect(orbit.getManager()).toBeNull()
    })

    it('should return null after uninstall', async () => {
      const orbit = new OrbitXenon()
      const ctx = new MockContext()

      await orbit.install(ctx)
      await orbit.uninstall()

      expect(orbit.getManager()).toBeNull()
    })
  })

  describe('integration', () => {
    it('should support full lifecycle', async () => {
      const orbit = OrbitXenon.configure({
        exposeAs: 'ffi',
        maxTotalMemory: 10240,
      })

      const ctx = new MockContext()

      // Install
      await orbit.install(ctx)
      expect((ctx as any).ffi).toBeInstanceOf(XenonManager)

      // Use
      const ffi = (ctx as any).ffi as XenonManager
      const buf1 = ffi.allocBuffer(1024, 'buf1')
      const buf2 = ffi.allocBuffer(1024, 'buf2')

      let stats = ffi.getMemoryStats()
      expect(stats.activeBuffers).toBe(2)

      // Cleanup
      ffi.freeBuffer(buf1)
      ffi.freeBuffer(buf2)

      stats = ffi.getMemoryStats()
      expect(stats.activeBuffers).toBe(0)

      // Uninstall
      await orbit.uninstall()
      expect(orbit.getManager()).toBeNull()
    })
  })
})
