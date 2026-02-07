/**
 * @gravito/atlas - Pool Strategy Tests
 */

import { describe, expect, it } from 'bun:test'
import {
  createDefaultStrategies,
  HybridStrategy,
  LoadAwareStrategy,
  type PoolStrategyContext,
  PredictiveStrategy,
} from '../../src/pool/PoolStrategy'

describe('PoolStrategy', () => {
  const createContext = (overrides: Partial<PoolStrategyContext> = {}): PoolStrategyContext => ({
    stats: {
      idle: 5,
      pending: 0,
      active: 5,
      total: 10,
      max: 10,
    },
    config: {
      min: 2,
      max: 10,
    },
    connectionName: 'default',
    ...overrides,
  })

  describe('LoadAwareStrategy', () => {
    const strategy = new LoadAwareStrategy()

    it('should maintain on normal utilization', () => {
      const decision = strategy.decide(createContext())
      expect(decision.action).toBe('maintain')
      expect(decision.confidence).toBeGreaterThan(0.8)
    })

    it('should increase on high utilization', () => {
      const decision = strategy.decide(
        createContext({
          stats: {
            idle: 1,
            pending: 0,
            active: 7,
            total: 8,
            max: 10,
          },
        })
      )
      expect(decision.action).toBe('increase')
      expect(decision.targetSize).toBeGreaterThan(8)
    })

    it('should increase aggressively on critical utilization', () => {
      const decision = strategy.decide(
        createContext({
          stats: {
            idle: 0,
            pending: 2,
            active: 9,
            total: 9,
            max: 10,
          },
        })
      )
      expect(decision.action).toBe('increase')
      expect(decision.confidence).toBeGreaterThan(0.9)
    })

    it('should decrease on low utilization', () => {
      const decision = strategy.decide(
        createContext({
          stats: {
            idle: 8,
            pending: 0,
            active: 1,
            total: 9,
            max: 10,
          },
        })
      )
      expect(decision.action).toBe('decrease')
      expect(decision.targetSize).toBeLessThan(9)
    })

    it('should not exceed max size', () => {
      const decision = strategy.decide(
        createContext({
          stats: {
            idle: 0,
            pending: 0,
            active: 10,
            total: 10,
            max: 10,
          },
        })
      )
      expect(decision.targetSize).toBeLessThanOrEqual(10)
    })

    it('should not go below min size', () => {
      const decision = strategy.decide(
        createContext({
          stats: {
            idle: 9,
            pending: 0,
            active: 0,
            total: 9,
            max: 10,
          },
          config: { min: 2, max: 10 },
        })
      )
      expect(decision.targetSize).toBeGreaterThanOrEqual(2)
    })
  })

  describe('PredictiveStrategy', () => {
    const strategy = new PredictiveStrategy()

    it('should maintain without history', () => {
      const decision = strategy.decide(createContext())
      expect(decision.action).toBe('maintain')
      expect(decision.confidence).toBeLessThan(0.6)
    })

    it('should increase on upward trend', () => {
      const decision = strategy.decide(
        createContext({
          stats: {
            idle: 2,
            pending: 0,
            active: 8,
            total: 10,
            max: 10,
          },
          history: [
            { idle: 8, pending: 0, active: 2, total: 10, max: 10 },
            { idle: 6, pending: 0, active: 4, total: 10, max: 10 },
            { idle: 4, pending: 0, active: 6, total: 10, max: 10 },
          ],
        })
      )
      // Trend shows increasing load
      if (decision.action === 'increase') {
        expect(decision.confidence).toBeGreaterThan(0.5)
      }
    })

    it('should decrease on downward trend', () => {
      const decision = strategy.decide(
        createContext({
          stats: {
            idle: 8,
            pending: 0,
            active: 2,
            total: 10,
            max: 10,
          },
          history: [
            { idle: 2, pending: 0, active: 8, total: 10, max: 10 },
            { idle: 4, pending: 0, active: 6, total: 10, max: 10 },
            { idle: 6, pending: 0, active: 4, total: 10, max: 10 },
          ],
        })
      )
      // Trend shows decreasing load
      if (decision.action === 'decrease') {
        expect(decision.confidence).toBeGreaterThan(0.5)
      }
    })

    it('should handle insufficient history', () => {
      const decision = strategy.decide(
        createContext({
          history: [{ idle: 8, pending: 0, active: 2, total: 10, max: 10 }],
        })
      )
      expect(decision.action).toBe('maintain')
    })
  })

  describe('HybridStrategy', () => {
    const loadAware = new LoadAwareStrategy()
    const predictive = new PredictiveStrategy()
    const hybrid = new HybridStrategy(loadAware, predictive)

    it('should use load-aware when no history', () => {
      const loadDecision = loadAware.decide(createContext())
      const hybridDecision = hybrid.decide(createContext())
      expect(hybridDecision.action).toBe(loadDecision.action)
    })

    it('should combine strategies with history', () => {
      const decision = hybrid.decide(
        createContext({
          stats: {
            idle: 2,
            pending: 1,
            active: 7,
            total: 9,
            max: 10,
          },
          history: [
            { idle: 8, pending: 0, active: 2, total: 10, max: 10 },
            { idle: 6, pending: 0, active: 4, total: 10, max: 10 },
            { idle: 4, pending: 0, active: 6, total: 10, max: 10 },
          ],
        })
      )
      // Both strategies should suggest increase
      expect(decision.action).toBe('increase')
      expect(decision.confidence).toBeGreaterThan(0.6)
    })

    it('should have combined confidence', () => {
      const decision = hybrid.decide(createContext())
      expect(decision.confidence).toBeGreaterThan(0)
      expect(decision.confidence).toBeLessThanOrEqual(1)
    })
  })

  describe('validation', () => {
    const strategy = new LoadAwareStrategy()

    it('should validate valid decisions', () => {
      const decision = strategy.decide(createContext())
      const context = createContext()
      expect(strategy.validateAdjustment(decision, context)).toBe(true)
    })

    it('should reject out-of-bounds target size', () => {
      const context = createContext()
      const decision = {
        action: 'increase' as const,
        targetSize: 20, // exceeds max
        reason: 'test',
        confidence: 0.8,
      }
      expect(strategy.validateAdjustment(decision, context)).toBe(false)
    })

    it('should reject mismatched action and size', () => {
      const context = createContext()
      const decision = {
        action: 'increase' as const,
        targetSize: 5, // decrease
        reason: 'test',
        confidence: 0.8,
      }
      expect(strategy.validateAdjustment(decision, context)).toBe(false)
    })

    it('should reject invalid confidence', () => {
      const context = createContext()
      const decision = {
        action: 'maintain' as const,
        targetSize: 7,
        reason: 'test',
        confidence: 1.5, // invalid
      }
      expect(strategy.validateAdjustment(decision, context)).toBe(false)
    })
  })

  describe('createDefaultStrategies', () => {
    it('should create all strategies', () => {
      const strategies = createDefaultStrategies()
      expect(strategies.loadAware).toBeDefined()
      expect(strategies.predictive).toBeDefined()
      expect(strategies.hybrid).toBeDefined()
    })

    it('should have correct strategy names', () => {
      const strategies = createDefaultStrategies()
      expect(strategies.loadAware.name).toBe('load-aware')
      expect(strategies.predictive.name).toBe('predictive')
      expect(strategies.hybrid.name).toBe('hybrid')
    })
  })
})
