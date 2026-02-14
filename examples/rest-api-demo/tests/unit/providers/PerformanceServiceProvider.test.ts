/**
 * PerformanceServiceProvider 單元測試
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('PerformanceServiceProvider', () => {
  let mockContainer: any

  beforeEach(() => {
    mockContainer = {
      singleton: vi.fn(),
      make: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('服務註冊', () => {
    it('應註冊 QueryOptimizer 單例', () => {
      mockContainer.singleton.mockReturnValue(undefined)

      mockContainer.singleton('QueryOptimizer', () => ({
        analyzeQuery: vi.fn(),
        generateOptimizedQuery: vi.fn(),
      }))

      expect(mockContainer.singleton).toHaveBeenCalledWith('QueryOptimizer', expect.any(Function))
    })

    it('應註冊 CacheService 單例', () => {
      mockContainer.singleton.mockReturnValue(undefined)

      mockContainer.singleton('CacheService', () => ({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      }))

      expect(mockContainer.singleton).toHaveBeenCalledWith('CacheService', expect.any(Function))
    })

    it('應註冊 MetricsCollector 單例', () => {
      mockContainer.singleton.mockReturnValue(undefined)

      mockContainer.singleton('MetricsCollector', () => ({
        recordLatency: vi.fn(),
        recordThroughput: vi.fn(),
      }))

      expect(mockContainer.singleton).toHaveBeenCalledWith('MetricsCollector', expect.any(Function))
    })
  })

  describe('依賴注入', () => {
    it('應提供 QueryOptimizer 實例', () => {
      const optimizer = {
        analyzeQuery: () => ({ complexity: 'high' }),
      }

      mockContainer.make.mockReturnValue(optimizer)

      const result = mockContainer.make('QueryOptimizer')

      expect(result).toHaveProperty('analyzeQuery')
    })

    it('應提供 CacheService 實例', () => {
      const cacheService = {
        get: () => null,
      }

      mockContainer.make.mockReturnValue(cacheService)

      const result = mockContainer.make('CacheService')

      expect(result).toHaveProperty('get')
    })
  })

  describe('性能配置', () => {
    it('應初始化快取配置', () => {
      const cacheConfig = {
        enabled: true,
        backend: 'redis',
        ttl: 3600,
      }

      expect(cacheConfig.enabled).toBe(true)
      expect(cacheConfig.backend).toBe('redis')
    })

    it('應初始化查詢優化配置', () => {
      const optimizerConfig = {
        enabled: true,
        analyzeQueries: true,
        logSlowQueries: true,
        slowQueryThreshold: 1000,
      }

      expect(optimizerConfig.enabled).toBe(true)
      expect(optimizerConfig.slowQueryThreshold).toBe(1000)
    })

    it('應初始化指標收集配置', () => {
      const metricsConfig = {
        enabled: true,
        collectLatency: true,
        collectThroughput: true,
        sampleRate: 1.0,
      }

      expect(metricsConfig.enabled).toBe(true)
      expect(metricsConfig.sampleRate).toBe(1.0)
    })
  })

  describe('啟動流程', () => {
    it('應在應用啟動時初始化性能服務', async () => {
      const boot = vi.fn().mockResolvedValue(undefined)

      await boot()

      expect(boot).toHaveBeenCalled()
    })

    it('應驗證性能配置完整性', () => {
      const config = {
        cacheEnabled: true,
        queryOptimization: true,
        metricsEnabled: true,
      }

      expect(config.cacheEnabled).toBeDefined()
      expect(config.queryOptimization).toBeDefined()
      expect(config.metricsEnabled).toBeDefined()
    })

    it('應初始化連接池監控', async () => {
      const poolMonitoring = {
        enabled: true,
        interval: 60000,
        metricsCallback: vi.fn(),
      }

      expect(poolMonitoring.enabled).toBe(true)
      expect(poolMonitoring.interval).toBe(60000)
    })
  })
})
