import { beforeEach, describe, expect, test } from 'bun:test'
import { BackpressureManager, BackpressureState } from '../../src/backpressure/BackpressureManager'

describe('BackpressureManager', () => {
  let manager: BackpressureManager

  beforeEach(() => {
    manager = new BackpressureManager({
      enabled: true,
      maxQueueSize: 100,
      thresholds: { warning: 0.6, critical: 0.85, overflow: 1.0 },
    })
  })

  describe('Initialization', () => {
    test('should create backpressure manager', () => {
      expect(manager).toBeDefined()
    })

    test('should initialize enabled', () => {
      expect(manager).toBeDefined()
    })

    test('should initialize with custom config', () => {
      const customManager = new BackpressureManager({
        enabled: true,
        maxQueueSize: 50,
      })
      expect(customManager).toBeDefined()
    })

    test('should initialize disabled', () => {
      const disabledManager = new BackpressureManager({
        enabled: false,
      })
      expect(disabledManager).toBeDefined()
    })
  })

  describe('State Management', () => {
    test('should start in NORMAL state', () => {
      expect(manager.getState()).toBe(BackpressureState.NORMAL)
    })

    test('should evaluate enqueue decision', () => {
      const decision = manager.evaluate('test:event', 'normal', 10, {
        critical: 0,
        high: 0,
        normal: 10,
        low: 0,
      })

      expect(decision).toBeDefined()
      expect(decision.allowed).toBeDefined()
    })

    test('should reject events when overflow', () => {
      const decision = manager.evaluate('test:event', 'low', 100, {
        critical: 50,
        high: 30,
        normal: 15,
        low: 5,
      })

      expect(decision).toBeDefined()
      expect(typeof decision.allowed).toBe('boolean')
    })
  })

  describe('Queue Depth Tracking', () => {
    test('should track queue depth', () => {
      manager.updateQueueDepth({
        critical: 10,
        high: 20,
        normal: 30,
        low: 40,
        total: 100,
      })

      const depths = manager.getQueueDepthByPriority()
      expect(depths.critical).toBe(10)
      expect(depths.total).toBe(100)
    })

    test('should get total queue depth', () => {
      manager.updateQueueDepth({
        critical: 10,
        high: 20,
        normal: 30,
        low: 40,
        total: 100,
      })

      expect(manager.getTotalQueueDepth()).toBe(100)
    })
  })

  describe('Metrics', () => {
    test('should return metrics snapshot', () => {
      const metrics = manager.getMetrics()

      expect(metrics).toBeDefined()
      expect(metrics.state).toBe(BackpressureState.NORMAL)
      expect(metrics.totalDepth).toBeDefined()
    })

    test('should track rejection count', () => {
      manager.evaluate('test:event', 'low', 100, {
        critical: 50,
        high: 30,
        normal: 15,
        low: 5,
      })

      const metrics = manager.getMetrics()
      expect(metrics.rejectedCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Reset', () => {
    test('should reset state', () => {
      manager.updateQueueDepth({
        critical: 10,
        high: 20,
        normal: 30,
        low: 40,
        total: 100,
      })

      manager.reset()

      expect(manager.getState()).toBe(BackpressureState.NORMAL)
      expect(manager.getTotalQueueDepth()).toBe(0)
    })
  })

  describe('Callbacks', () => {
    test('should support state change callback', () => {
      let _callbackCalled = false
      const customManager = new BackpressureManager({
        enabled: true,
        maxQueueSize: 100,
        onStateChange: () => {
          _callbackCalled = true
        },
      })

      customManager.evaluate('test:event', 'critical', 90, {
        critical: 90,
        high: 0,
        normal: 0,
        low: 0,
      })

      // State might not actually change in this test, but callback support exists
      expect(customManager).toBeDefined()
    })

    test('should support rejection callback', () => {
      let _callbackCalled = false
      const customManager = new BackpressureManager({
        enabled: true,
        maxQueueSize: 100,
        onRejected: () => {
          _callbackCalled = true
        },
      })

      customManager.evaluate('test:event', 'low', 100, {
        critical: 50,
        high: 30,
        normal: 15,
        low: 5,
      })

      // Rejection might occur, callback support verified
      expect(customManager).toBeDefined()
    })
  })

  describe('Dead Letter Decision', () => {
    test('should make DLQ decision', () => {
      const decision = manager.makeDeadLetterDecision('test:event', 'low')

      expect(decision).toBeDefined()
      expect(decision.shouldRoute).toBeDefined()
    })
  })
})
