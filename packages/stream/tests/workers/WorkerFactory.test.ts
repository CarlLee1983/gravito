/**
 * Unit tests for RuntimeAwareWorkerFactory.
 */

import { afterEach, describe, expect, it } from 'bun:test'
import { BunWorker } from '../../src/workers/BunWorker'
import { SandboxedWorker } from '../../src/workers/SandboxedWorker'
import { createWorkerFactory, RuntimeAwareWorkerFactory } from '../../src/workers/WorkerFactory'

describe('RuntimeAwareWorkerFactory', () => {
  let factory: RuntimeAwareWorkerFactory

  afterEach(() => {
    // Cleanup
    factory = undefined as any
  })

  describe('auto-detection', () => {
    it('should detect Bun runtime when available', () => {
      factory = new RuntimeAwareWorkerFactory()

      // In Bun environment, should detect Bun
      if (typeof Bun !== 'undefined') {
        expect(factory.getRuntime()).toBe('bun')
        expect(factory.isBun()).toBe(true)
        expect(factory.isNode()).toBe(false)
      }
    })

    it('should have a valid runtime', () => {
      factory = new RuntimeAwareWorkerFactory()

      const runtime = factory.getRuntime()
      expect(['bun', 'node']).toContain(runtime)
    })
  })

  describe('runtime override', () => {
    it('should allow forcing Bun runtime', () => {
      factory = new RuntimeAwareWorkerFactory('bun')

      expect(factory.getRuntime()).toBe('bun')
      expect(factory.isBun()).toBe(true)
      expect(factory.isNode()).toBe(false)
    })

    it('should allow forcing Node.js runtime', () => {
      factory = new RuntimeAwareWorkerFactory('node')

      expect(factory.getRuntime()).toBe('node')
      expect(factory.isBun()).toBe(false)
      expect(factory.isNode()).toBe(true)
    })

    it('should treat undefined as auto-detection', () => {
      factory = new RuntimeAwareWorkerFactory(undefined)

      const runtime = factory.getRuntime()
      expect(['bun', 'node']).toContain(runtime)
    })

    it('should treat auto as auto-detection', () => {
      factory = new RuntimeAwareWorkerFactory('auto')

      const runtime = factory.getRuntime()
      expect(['bun', 'node']).toContain(runtime)
    })
  })

  describe('worker creation', () => {
    it('should create BunWorker when Bun runtime is forced', () => {
      factory = new RuntimeAwareWorkerFactory('bun')
      const worker = factory.create({ maxExecutionTime: 5000 })

      expect(worker).toBeInstanceOf(BunWorker)
    })

    it('should create SandboxedWorker when Node.js runtime is forced', () => {
      factory = new RuntimeAwareWorkerFactory('node')
      const worker = factory.create({ maxExecutionTime: 5000 })

      expect(worker).toBeInstanceOf(SandboxedWorker)
    })

    it('should create appropriate worker based on detected runtime', () => {
      factory = new RuntimeAwareWorkerFactory()
      const worker = factory.create({ maxExecutionTime: 5000 })

      if (factory.isBun()) {
        expect(worker).toBeInstanceOf(BunWorker)
      } else {
        expect(worker).toBeInstanceOf(SandboxedWorker)
      }
    })

    it('should pass config to created worker', () => {
      factory = new RuntimeAwareWorkerFactory('node')
      const config = {
        maxExecutionTime: 10000,
        maxMemory: 256,
        idleTimeout: 5000,
      }
      const worker = factory.create(config)

      const workerConfig = (worker as any).config
      expect(workerConfig.maxExecutionTime).toBe(10000)
      expect(workerConfig.idleTimeout).toBe(5000)
    })

    it('should support Bun-specific config options when creating BunWorker', () => {
      factory = new RuntimeAwareWorkerFactory('bun')
      const config = {
        maxExecutionTime: 10000,
        smol: true,
        preload: ['./module.ts'],
      }
      const worker = factory.create(config)

      const workerConfig = (worker as any).config
      expect(workerConfig.smol).toBe(true)
      expect(workerConfig.preload).toEqual(['./module.ts'])
    })
  })

  describe('createWorkerFactory helper', () => {
    it('should create factory with auto-detection', () => {
      factory = createWorkerFactory()

      const runtime = factory.getRuntime()
      expect(['bun', 'node']).toContain(runtime)
    })

    it('should create factory with runtime override', () => {
      factory = createWorkerFactory('bun')
      expect(factory.isBun()).toBe(true)

      factory = createWorkerFactory('node')
      expect(factory.isNode()).toBe(true)
    })

    it('should create workers from helper factory', () => {
      factory = createWorkerFactory('node')
      const worker = factory.create({ maxExecutionTime: 5000 })

      expect(worker).toBeInstanceOf(SandboxedWorker)
    })
  })

  describe('runtime queries', () => {
    it('should report runtime correctly', () => {
      factory = new RuntimeAwareWorkerFactory('bun')
      expect(factory.getRuntime()).toBe('bun')
      expect(factory.isBun()).toBe(true)
      expect(factory.isNode()).toBe(false)

      factory = new RuntimeAwareWorkerFactory('node')
      expect(factory.getRuntime()).toBe('node')
      expect(factory.isBun()).toBe(false)
      expect(factory.isNode()).toBe(true)
    })

    it('should have consistent state across multiple queries', () => {
      factory = new RuntimeAwareWorkerFactory('bun')

      for (let i = 0; i < 10; i++) {
        expect(factory.getRuntime()).toBe('bun')
        expect(factory.isBun()).toBe(true)
        expect(factory.isNode()).toBe(false)
      }
    })
  })

  describe('multiple factory instances', () => {
    it('should allow multiple factories with different runtimes', () => {
      const bunFactory = new RuntimeAwareWorkerFactory('bun')
      const nodeFactory = new RuntimeAwareWorkerFactory('node')

      expect(bunFactory.isBun()).toBe(true)
      expect(nodeFactory.isNode()).toBe(true)
    })

    it('should create workers independently', () => {
      const factory1 = new RuntimeAwareWorkerFactory('bun')
      const factory2 = new RuntimeAwareWorkerFactory('node')

      const worker1 = factory1.create({ maxExecutionTime: 5000 })
      const worker2 = factory2.create({ maxExecutionTime: 5000 })

      expect(worker1).toBeInstanceOf(BunWorker)
      expect(worker2).toBeInstanceOf(SandboxedWorker)
      expect(worker1).not.toBe(worker2)
    })
  })
})
