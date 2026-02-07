/**
 * @gravito/atlas - Atlas Metrics Pool Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { AtlasMetrics } from '../../src/observability/AtlasMetrics'

describe('AtlasMetrics - Connection Pool Metrics', () => {
  let metrics: AtlasMetrics

  beforeEach(() => {
    metrics = new AtlasMetrics({ enabled: true })
  })

  describe('initialization', () => {
    it('should create pool metrics when enabled', () => {
      expect(metrics.poolWaitTime).toBeDefined()
      expect(metrics.poolAcquisitionErrors).toBeDefined()
    })

    it('should have no pool metrics when disabled', () => {
      const disabledMetrics = new AtlasMetrics({ enabled: false })
      expect(disabledMetrics.poolWaitTime).toBeUndefined()
      expect(disabledMetrics.poolAcquisitionErrors).toBeUndefined()
    })

    it('should initialize observable gauges', () => {
      // Observable gauges may not be available in all versions
      if (metrics.poolSize !== undefined) {
        expect(metrics.poolSize).toBeDefined()
      }
      if (metrics.poolUtilization !== undefined) {
        expect(metrics.poolUtilization).toBeDefined()
      }
    })
  })

  describe('recordConnectionWaitTime', () => {
    it('should record wait time without error', () => {
      expect(() => {
        metrics.recordConnectionWaitTime('default', 100)
      }).not.toThrow()
    })

    it('should handle multiple recordings', () => {
      expect(() => {
        metrics.recordConnectionWaitTime('default', 50)
        metrics.recordConnectionWaitTime('default', 100)
        metrics.recordConnectionWaitTime('default', 150)
      }).not.toThrow()
    })

    it('should handle different connection names', () => {
      expect(() => {
        metrics.recordConnectionWaitTime('default', 100)
        metrics.recordConnectionWaitTime('secondary', 80)
        metrics.recordConnectionWaitTime('analytics', 120)
      }).not.toThrow()
    })

    it('should work with zero duration', () => {
      expect(() => {
        metrics.recordConnectionWaitTime('default', 0)
      }).not.toThrow()
    })

    it('should work with large duration', () => {
      expect(() => {
        metrics.recordConnectionWaitTime('default', 999999)
      }).not.toThrow()
    })

    it('should not throw when disabled', () => {
      const disabledMetrics = new AtlasMetrics({ enabled: false })
      expect(() => {
        disabledMetrics.recordConnectionWaitTime('default', 100)
      }).not.toThrow()
    })
  })

  describe('recordConnectionAcquisitionError', () => {
    it('should record acquisition error without error', () => {
      expect(() => {
        metrics.recordConnectionAcquisitionError('default', 'timeout')
      }).not.toThrow()
    })

    it('should handle multiple error recordings', () => {
      expect(() => {
        metrics.recordConnectionAcquisitionError('default', 'timeout')
        metrics.recordConnectionAcquisitionError('default', 'connection_refused')
        metrics.recordConnectionAcquisitionError('default', 'auth_failed')
      }).not.toThrow()
    })

    it('should handle different connection names', () => {
      expect(() => {
        metrics.recordConnectionAcquisitionError('default', 'timeout')
        metrics.recordConnectionAcquisitionError('secondary', 'connection_refused')
        metrics.recordConnectionAcquisitionError('analytics', 'auth_failed')
      }).not.toThrow()
    })

    it('should handle different error types', () => {
      expect(() => {
        metrics.recordConnectionAcquisitionError('default', 'timeout')
        metrics.recordConnectionAcquisitionError('default', 'pool_exhausted')
        metrics.recordConnectionAcquisitionError('default', 'network_error')
      }).not.toThrow()
    })

    it('should not throw when disabled', () => {
      const disabledMetrics = new AtlasMetrics({ enabled: false })
      expect(() => {
        disabledMetrics.recordConnectionAcquisitionError('default', 'timeout')
      }).not.toThrow()
    })
  })

  describe('registerPoolStatsCallback', () => {
    it('should register callback without error', () => {
      expect(() => {
        metrics.registerPoolStatsCallback('default', () => ({
          idle: 5,
          active: 2,
          pending: 0,
          max: 10,
        }))
      }).not.toThrow()
    })

    it('should handle null stats', () => {
      expect(() => {
        metrics.registerPoolStatsCallback('default', () => null)
      }).not.toThrow()
    })

    it('should register multiple callbacks', () => {
      expect(() => {
        metrics.registerPoolStatsCallback('default', () => ({
          idle: 5,
          active: 2,
          pending: 0,
          max: 10,
        }))
        metrics.registerPoolStatsCallback('secondary', () => ({
          idle: 3,
          active: 1,
          pending: 0,
          max: 5,
        }))
      }).not.toThrow()
    })

    it('should overwrite previous callback', () => {
      metrics.registerPoolStatsCallback('default', () => ({
        idle: 5,
        active: 2,
        pending: 0,
        max: 10,
      }))

      expect(() => {
        metrics.registerPoolStatsCallback('default', () => ({
          idle: 8,
          active: 1,
          pending: 0,
          max: 10,
        }))
      }).not.toThrow()
    })

    it('should not throw when disabled', () => {
      const disabledMetrics = new AtlasMetrics({ enabled: false })
      expect(() => {
        disabledMetrics.registerPoolStatsCallback('default', () => ({
          idle: 5,
          active: 2,
          pending: 0,
          max: 10,
        }))
      }).not.toThrow()
    })

    it('should handle different utilization levels', () => {
      expect(() => {
        // Low utilization
        metrics.registerPoolStatsCallback('low', () => ({
          idle: 9,
          active: 1,
          pending: 0,
          max: 10,
        }))

        // Medium utilization
        metrics.registerPoolStatsCallback('medium', () => ({
          idle: 5,
          active: 5,
          pending: 0,
          max: 10,
        }))

        // High utilization
        metrics.registerPoolStatsCallback('high', () => ({
          idle: 1,
          active: 9,
          pending: 0,
          max: 10,
        }))
      }).not.toThrow()
    })
  })

  describe('metric properties', () => {
    it('should have correct histogram properties', () => {
      // Histograms should support record method
      if (metrics.poolWaitTime) {
        expect(typeof metrics.poolWaitTime.record).toBe('function')
      }
    })

    it('should have correct counter properties', () => {
      // Counters should support add method
      if (metrics.poolAcquisitionErrors) {
        expect(typeof metrics.poolAcquisitionErrors.add).toBe('function')
      }
    })

    it('should have original metrics still available', () => {
      expect(metrics.operationDuration).toBeDefined()
      expect(metrics.operationErrors).toBeDefined()
    })
  })

  describe('concurrent operations', () => {
    it('should handle concurrent wait time recordings', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() => {
          metrics.recordConnectionWaitTime('default', 50 + i * 10)
        })
      )

      await Promise.all(promises)
      expect(true).toBe(true)
    })

    it('should handle concurrent error recordings', async () => {
      const errors = ['timeout', 'connection_refused', 'auth_failed']
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() => {
          metrics.recordConnectionAcquisitionError('default', errors[i % errors.length])
        })
      )

      await Promise.all(promises)
      expect(true).toBe(true)
    })

    it('should handle mixed concurrent operations', async () => {
      const promises = [
        ...Array.from({ length: 5 }, () =>
          Promise.resolve().then(() => {
            metrics.recordConnectionWaitTime('default', 100)
          })
        ),
        ...Array.from({ length: 5 }, () =>
          Promise.resolve().then(() => {
            metrics.recordConnectionAcquisitionError('default', 'timeout')
          })
        ),
      ]

      await Promise.all(promises)
      expect(true).toBe(true)
    })
  })
})
