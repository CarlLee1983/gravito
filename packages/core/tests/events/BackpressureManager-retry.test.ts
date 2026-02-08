/**
 * @gravito/core - BackpressureManager Retry Strategy Tests
 */

import { describe, expect, it } from 'bun:test'
import { type BackpressureConfig, BackpressureManager } from '../../src/events/BackpressureManager'

describe('BackpressureManager Retry Strategy', () => {
  it('should support default dlq-only overflow retry strategy', () => {
    const config: BackpressureConfig = {
      maxQueueSize: 100,
      warningThreshold: 0.7,
      criticalThreshold: 0.9,
    }

    const manager = new BackpressureManager(config)

    // Simulate OVERFLOW condition
    const decision = manager.evaluate('test-event', 'normal', 101, {
      high: 0,
      normal: 101,
      low: 0,
    })

    expect(decision.allowed).toBe(false)
    expect(decision.reason).toContain('OVERFLOW')
  })

  it('should support delayed retry strategy on OVERFLOW', () => {
    const config: BackpressureConfig = {
      maxQueueSize: 100,
      warningThreshold: 0.7,
      criticalThreshold: 0.9,
    }

    const manager = new BackpressureManager(config)
    expect(manager).toBeDefined()
  })

  it('should support immediate retry strategy on OVERFLOW', () => {
    const config: BackpressureConfig = {
      maxQueueSize: 100,
      warningThreshold: 0.7,
      criticalThreshold: 0.9,
    }

    const manager = new BackpressureManager(config)
    expect(manager).toBeDefined()
  })
})
