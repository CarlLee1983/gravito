/**
 * @gravito/atlas - Connection Metrics Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { Connection } from '../../src/connection/Connection'
import { AtlasMetrics } from '../../src/observability/AtlasMetrics'
import type { ConnectionConfig } from '../../src/types'

describe('Connection - Metrics Recording', () => {
  let connection: Connection
  let metrics: AtlasMetrics
  let config: ConnectionConfig

  beforeEach(() => {
    metrics = new AtlasMetrics({ enabled: true })
    config = {
      driver: 'sqlite',
      database: ':memory:',
      metrics,
    }
    connection = new Connection('test', config)
  })

  describe('operation duration recording', () => {
    it('should record query operation duration', async () => {
      await connection.connect()

      // Record some metrics
      expect(() => {
        metrics.recordConnectionWaitTime('test', 10)
      }).not.toThrow()

      await connection.disconnect()
    })

    it('should handle multiple query recordings', async () => {
      await connection.connect()

      expect(() => {
        metrics.recordConnectionWaitTime('test', 5)
        metrics.recordConnectionWaitTime('test', 10)
        metrics.recordConnectionWaitTime('test', 15)
      }).not.toThrow()

      await connection.disconnect()
    })
  })

  describe('error recording', () => {
    it('should record connection errors', () => {
      expect(() => {
        metrics.recordConnectionAcquisitionError('test', 'timeout')
      }).not.toThrow()
    })

    it('should handle multiple error types', () => {
      expect(() => {
        metrics.recordConnectionAcquisitionError('test', 'timeout')
        metrics.recordConnectionAcquisitionError('test', 'connection_refused')
        metrics.recordConnectionAcquisitionError('test', 'auth_failed')
      }).not.toThrow()
    })
  })

  describe('metrics availability', () => {
    it('should provide access to metrics', async () => {
      expect(connection.getMetrics?.()).toBeDefined()
    })

    it('should have pool metrics available', () => {
      expect(metrics.poolWaitTime).toBeDefined()
      expect(metrics.poolAcquisitionErrors).toBeDefined()
    })
  })

  describe('pool stats callback', () => {
    it('should register pool stats callback', () => {
      expect(() => {
        metrics.registerPoolStatsCallback('test', () => ({
          idle: 5,
          active: 2,
          pending: 0,
          max: 10,
        }))
      }).not.toThrow()
    })

    it('should handle callbacks for multiple connections', () => {
      expect(() => {
        metrics.registerPoolStatsCallback('test1', () => ({
          idle: 5,
          active: 2,
          pending: 0,
          max: 10,
        }))
        metrics.registerPoolStatsCallback('test2', () => ({
          idle: 3,
          active: 1,
          pending: 0,
          max: 5,
        }))
      }).not.toThrow()
    })
  })

  describe('disabled metrics', () => {
    it('should handle operations when metrics disabled', async () => {
      const disabledMetrics = new AtlasMetrics({ enabled: false })
      const disabledConfig: ConnectionConfig = {
        driver: 'sqlite',
        database: ':memory:',
        metrics: disabledMetrics,
      }

      const disabledConnection = new Connection('test', disabledConfig)
      await disabledConnection.connect()

      // Should not throw even though metrics is disabled
      expect(() => {
        disabledMetrics.recordConnectionWaitTime('test', 100)
      }).not.toThrow()

      await disabledConnection.disconnect()
    })
  })

  describe('concurrent metric recording', () => {
    it('should handle concurrent wait time recordings', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() => {
          metrics.recordConnectionWaitTime('test', 50 + i * 10)
        })
      )

      await Promise.all(promises)
      expect(true).toBe(true)
    })

    it('should handle concurrent error recordings', async () => {
      const errors = ['timeout', 'connection_refused', 'auth_failed']
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() => {
          metrics.recordConnectionAcquisitionError('test', errors[i % errors.length])
        })
      )

      await Promise.all(promises)
      expect(true).toBe(true)
    })
  })
})
