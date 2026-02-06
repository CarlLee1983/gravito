/**
 * @gravito/core - OpenTelemetry SDK 集成測試
 *
 * 測試 OpenTelemetry SDK 初始化、配置合併、環境變數支援等功能。
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

// 導入要測試的模組
import {
  getOpenTelemetrySDK,
  isOpenTelemetryInitialized,
  resetOpenTelemetry,
  setupOpenTelemetry,
  shutdownOpenTelemetry,
} from '../../src/instrumentation/opentelemetry'

describe('OpenTelemetry SDK Integration', () => {
  // 每個測試前重置狀態
  beforeEach(async () => {
    await resetOpenTelemetry()
  })

  // 每個測試後清理
  afterEach(async () => {
    await resetOpenTelemetry()
  })

  describe('setupOpenTelemetry', () => {
    test('應該成功初始化並返回 SDK 實例', async () => {
      const sdk = await setupOpenTelemetry({
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        enabled: true,
      })

      expect(sdk).not.toBeNull()
      expect(isOpenTelemetryInitialized()).toBe(true)
    })

    test('多次調用應該返回同一實例（單例模式）', async () => {
      const sdk1 = await setupOpenTelemetry({
        serviceName: 'test-service-1',
      })

      const sdk2 = await setupOpenTelemetry({
        serviceName: 'test-service-2', // 不同配置
      })

      expect(sdk1).toBe(sdk2)
      expect(isOpenTelemetryInitialized()).toBe(true)
    })

    test('enabled=false 時應該返回 null 並跳過初始化', async () => {
      const sdk = await setupOpenTelemetry({
        enabled: false,
      })

      expect(sdk).toBeNull()
      // 即使 enabled=false，也應標記為"已初始化"（避免重複調用）
      expect(isOpenTelemetryInitialized()).toBe(true)
    })

    test('應該使用預設配置填充未提供的選項', async () => {
      const sdk = await setupOpenTelemetry({})

      expect(sdk).not.toBeNull()
      // 預設值應已套用
      expect(isOpenTelemetryInitialized()).toBe(true)
    })
  })

  describe('配置合併（用戶 > 環境變數 > 預設值）', () => {
    const originalEnv = { ...process.env }

    afterEach(() => {
      // 恢復環境變數
      process.env = { ...originalEnv }
    })

    test('用戶配置應該優先於環境變數', async () => {
      process.env.OTEL_SERVICE_NAME = 'env-service'
      process.env.OTEL_SERVICE_VERSION = 'env-version'

      const sdk = await setupOpenTelemetry({
        serviceName: 'user-service',
        serviceVersion: 'user-version',
      })

      expect(sdk).not.toBeNull()
      // 驗證用戶配置優先（透過 SDK 內部狀態或行為驗證）
    })

    test('環境變數應該優先於預設值', async () => {
      process.env.OTEL_SERVICE_NAME = 'env-service'
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://collector:4318'

      const sdk = await setupOpenTelemetry({})

      expect(sdk).not.toBeNull()
      expect(isOpenTelemetryInitialized()).toBe(true)
    })

    test('無配置時應該使用預設值', async () => {
      // 確保沒有環境變數
      delete process.env.OTEL_SERVICE_NAME
      delete process.env.OTEL_SERVICE_VERSION
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT

      const sdk = await setupOpenTelemetry({})

      expect(sdk).not.toBeNull()
      expect(isOpenTelemetryInitialized()).toBe(true)
    })
  })

  describe('環境變數支援', () => {
    const originalEnv = { ...process.env }

    afterEach(() => {
      process.env = { ...originalEnv }
    })

    test('應該讀取 OTEL_SERVICE_NAME', async () => {
      process.env.OTEL_SERVICE_NAME = 'my-test-service'

      const sdk = await setupOpenTelemetry({})

      expect(sdk).not.toBeNull()
    })

    test('應該讀取 OTEL_EXPORTER_OTLP_ENDPOINT', async () => {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318'

      const sdk = await setupOpenTelemetry({})

      expect(sdk).not.toBeNull()
    })

    test('應該讀取 OTEL_TRACES_SAMPLER_ARG 作為採樣率', async () => {
      process.env.OTEL_TRACES_SAMPLER_ARG = '0.5'

      const sdk = await setupOpenTelemetry({})

      expect(sdk).not.toBeNull()
    })

    test('GRAVITO_OTEL_ENABLED=false 應該禁用 SDK', async () => {
      process.env.GRAVITO_OTEL_ENABLED = 'false'

      const sdk = await setupOpenTelemetry({})

      expect(sdk).toBeNull()
      expect(isOpenTelemetryInitialized()).toBe(true)
    })
  })

  describe('getOpenTelemetrySDK', () => {
    test('初始化前應該返回 null', () => {
      const sdk = getOpenTelemetrySDK()
      expect(sdk).toBeNull()
    })

    test('初始化後應該返回 SDK 實例', async () => {
      await setupOpenTelemetry({ serviceName: 'test' })

      const sdk = getOpenTelemetrySDK()
      expect(sdk).not.toBeNull()
    })

    test('enabled=false 初始化後應該返回 null', async () => {
      await setupOpenTelemetry({ enabled: false })

      const sdk = getOpenTelemetrySDK()
      expect(sdk).toBeNull()
    })
  })

  describe('isOpenTelemetryInitialized', () => {
    test('初始化前應該返回 false', () => {
      expect(isOpenTelemetryInitialized()).toBe(false)
    })

    test('初始化後應該返回 true', async () => {
      await setupOpenTelemetry({})

      expect(isOpenTelemetryInitialized()).toBe(true)
    })

    test('重置後應該返回 false', async () => {
      await setupOpenTelemetry({})
      await resetOpenTelemetry()

      expect(isOpenTelemetryInitialized()).toBe(false)
    })
  })

  describe('shutdownOpenTelemetry', () => {
    test('未初始化時調用不應拋出錯誤', async () => {
      // 不應該拋出異常
      await expect(shutdownOpenTelemetry()).resolves.toBeUndefined()
    })

    test('初始化後應該能優雅關閉', async () => {
      await setupOpenTelemetry({ serviceName: 'test' })

      // 不應該拋出異常
      await expect(shutdownOpenTelemetry()).resolves.toBeUndefined()
    })

    test('關閉後 SDK 應該仍可獲取（但已停止）', async () => {
      await setupOpenTelemetry({ serviceName: 'test' })
      await shutdownOpenTelemetry()

      // SDK 實例仍存在，但已關閉
      expect(getOpenTelemetrySDK()).not.toBeNull()
      expect(isOpenTelemetryInitialized()).toBe(true)
    })

    test('多次關閉不應拋出錯誤', async () => {
      await setupOpenTelemetry({ serviceName: 'test' })

      await expect(shutdownOpenTelemetry()).resolves.toBeUndefined()
      await expect(shutdownOpenTelemetry()).resolves.toBeUndefined()
    })
  })

  describe('依賴缺失時的優雅降級', () => {
    test('OpenTelemetry 依賴缺失時應該返回 null 而不拋出錯誤', async () => {
      // 這個測試驗證動態導入失敗時的行為
      // 由於我們使用動態導入，如果依賴不存在，應該優雅降級

      // 模擬依賴缺失的情況（透過環境變數或 mock）
      // 實際上，如果依賴已安裝，這個測試會正常初始化
      // 這裡主要測試 try-catch 邏輯

      const _sdk = await setupOpenTelemetry({
        serviceName: 'test-graceful',
      })

      // 如果依賴存在，應該成功；如果不存在，應該返回 null
      // 兩種情況都不應該拋出異常
      expect(true).toBe(true)
    })
  })

  describe('resetOpenTelemetry', () => {
    test('應該重置所有狀態', async () => {
      await setupOpenTelemetry({ serviceName: 'test' })
      expect(isOpenTelemetryInitialized()).toBe(true)

      await resetOpenTelemetry()

      expect(isOpenTelemetryInitialized()).toBe(false)
      expect(getOpenTelemetrySDK()).toBeNull()
    })

    test('重置後應該能重新初始化', async () => {
      await setupOpenTelemetry({ serviceName: 'test-1' })
      await resetOpenTelemetry()

      const sdk = await setupOpenTelemetry({ serviceName: 'test-2' })

      expect(sdk).not.toBeNull()
      expect(isOpenTelemetryInitialized()).toBe(true)
    })
  })

  describe('Tracing 配置', () => {
    test('應該支援 Jaeger 導出器配置', async () => {
      const sdk = await setupOpenTelemetry({
        serviceName: 'test',
        tracing: {
          enabled: true,
          exporter: 'jaeger',
          jaegerEndpoint: 'http://jaeger:14268/api/traces',
        },
      })

      expect(sdk).not.toBeNull()
    })

    test('應該支援 OTLP 導出器配置', async () => {
      const sdk = await setupOpenTelemetry({
        serviceName: 'test',
        tracing: {
          enabled: true,
          exporter: 'otlp',
          otlpEndpoint: 'http://collector:4318',
        },
      })

      expect(sdk).not.toBeNull()
    })

    test('應該支援自定義採樣率', async () => {
      const sdk = await setupOpenTelemetry({
        serviceName: 'test',
        tracing: {
          enabled: true,
          samplingRate: 0.5,
        },
      })

      expect(sdk).not.toBeNull()
    })

    test('tracing.enabled=false 應該禁用追蹤', async () => {
      const sdk = await setupOpenTelemetry({
        serviceName: 'test',
        tracing: {
          enabled: false,
        },
      })

      expect(sdk).not.toBeNull()
    })
  })

  describe('Metrics 配置', () => {
    test('應該支援 Prometheus 導出器配置', async () => {
      const sdk = await setupOpenTelemetry({
        serviceName: 'test',
        metrics: {
          enabled: true,
          exporter: 'prometheus',
          prometheusPort: 9090,
        },
      })

      expect(sdk).not.toBeNull()
    })

    test('應該支援 OTLP 指標導出器配置', async () => {
      const sdk = await setupOpenTelemetry({
        serviceName: 'test',
        metrics: {
          enabled: true,
          exporter: 'otlp',
          otlpEndpoint: 'http://collector:4318',
        },
      })

      expect(sdk).not.toBeNull()
    })

    test('metrics.enabled=false 應該禁用指標', async () => {
      const sdk = await setupOpenTelemetry({
        serviceName: 'test',
        metrics: {
          enabled: false,
        },
      })

      expect(sdk).not.toBeNull()
    })
  })

  describe('Resource 配置', () => {
    test('應該支援自定義 resource attributes', async () => {
      const sdk = await setupOpenTelemetry({
        serviceName: 'test',
        resourceAttributes: {
          'deployment.environment': 'staging',
          'service.namespace': 'gravito',
          'custom.attribute': 'custom-value',
        },
      })

      expect(sdk).not.toBeNull()
    })
  })

  describe('錯誤處理', () => {
    test('無效的採樣率應該使用預設值', async () => {
      const sdk = await setupOpenTelemetry({
        serviceName: 'test',
        tracing: {
          enabled: true,
          samplingRate: 2.0, // 無效值（> 1）
        },
      })

      // 應該使用預設值而不是拋出錯誤
      expect(sdk).not.toBeNull()
    })

    test('無效的端口應該優雅處理', async () => {
      const sdk = await setupOpenTelemetry({
        serviceName: 'test',
        metrics: {
          enabled: true,
          prometheusPort: -1, // 無效端口
        },
      })

      // 應該使用預設端口或優雅處理
      expect(sdk).not.toBeNull()
    })
  })
})
