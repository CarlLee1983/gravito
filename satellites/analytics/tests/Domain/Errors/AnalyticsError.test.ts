import { describe, expect, it } from 'bun:test'
import {
  AnalyticsError,
  AnalyticsErrorFactory,
} from '../../../src/Application/Errors/AnalyticsError'

describe('AnalyticsError', () => {
  describe('metricNotFound', () => {
    it('應該建立正確的錯誤實例', () => {
      const error = AnalyticsErrorFactory.metricNotFound('order_volume')

      expect(error).toBeInstanceOf(AnalyticsError)
      expect(error.code).toBe('METRIC_NOT_FOUND')
      expect(error.statusCode).toBe(404)
      expect(error.message).toContain('order_volume')
    })

    it('應該包含 context 信息', () => {
      const error = AnalyticsErrorFactory.metricNotFound('order_volume', {
        context: { timestamp: Date.now() },
      })

      expect(error.context).toBeDefined()
      expect(error.context?.metric).toBe('order_volume')
    })
  })

  describe('invalidPeriod', () => {
    it('應該建立正確的錯誤實例', () => {
      const error = AnalyticsErrorFactory.invalidPeriod('invalid_period')

      expect(error).toBeInstanceOf(AnalyticsError)
      expect(error.code).toBe('INVALID_PERIOD')
      expect(error.statusCode).toBe(400)
      expect(error.message).toContain('invalid_period')
    })
  })

  describe('invalidMetricId', () => {
    it('應該建立正確的錯誤實例', () => {
      const error = AnalyticsErrorFactory.invalidMetricId('Invalid-ID')

      expect(error).toBeInstanceOf(AnalyticsError)
      expect(error.code).toBe('INVALID_METRIC_ID')
      expect(error.statusCode).toBe(400)
      expect(error.message).toContain('Invalid-ID')
    })
  })

  describe('invalidFilter', () => {
    it('應該建立正確的錯誤實例', () => {
      const error = AnalyticsErrorFactory.invalidFilter('region', null)

      expect(error).toBeInstanceOf(AnalyticsError)
      expect(error.code).toBe('INVALID_FILTER')
      expect(error.statusCode).toBe(400)
      expect(error.context?.key).toBe('region')
    })
  })

  describe('resolverExecutionFailed', () => {
    it('應該建立正確的錯誤實例', () => {
      const cause = new Error('Database connection failed')
      const error = AnalyticsErrorFactory.resolverExecutionFailed('order_volume', cause)

      expect(error).toBeInstanceOf(AnalyticsError)
      expect(error.code).toBe('RESOLVER_EXECUTION_FAILED')
      expect(error.statusCode).toBe(500)
      expect(error.cause).toBe(cause)
      expect(error.message).toContain('Database connection failed')
    })
  })

  describe('resolverAlreadyRegistered', () => {
    it('應該建立正確的錯誤實例', () => {
      const error = AnalyticsErrorFactory.resolverAlreadyRegistered('order_volume')

      expect(error).toBeInstanceOf(AnalyticsError)
      expect(error.code).toBe('RESOLVER_ALREADY_REGISTERED')
      expect(error.statusCode).toBe(409)
      expect(error.message).toContain('order_volume')
    })
  })
})
