import { type Container, type PlanetCore, ServiceProvider } from '@gravito/core'
import { AsyncInvalidationEngine } from '../cache/async/AsyncInvalidationEngine'
import { EventAggregator } from '../cache/events/EventAggregator'
import { DynamicPoolManager } from '../database/DynamicPoolManager'
import { setupCacheIntegration } from '../integrations/cache-integration'
import { setupMonitoringIntegration } from '../integrations/monitor-integration'
import { setupOrderQueueIntegration } from '../integrations/order-queue-handler'
import { setupPaymentQueueIntegration } from '../integrations/payment-queue-handler'
import type { BusinessMetrics } from '../monitoring/metrics-integration'
import { registerAllRoutes } from '../routes'

/**
 * 應用程式核心服務提供者
 * 管理基礎設施元件的生命週期與整合
 */
export class AppServiceProvider extends ServiceProvider {
  /**
   * 註冊服務到 IoC 容器
   */
  override async register(container: Container): Promise<void> {
    // 註冊資料庫連接池管理器
    container.singleton('poolManager', () => {
      return new DynamicPoolManager({}, this.core?.logger)
    })

    // 註冊快取事件聚合器
    container.singleton('eventAggregator', () => {
      return new EventAggregator()
    })

    // 註冊異步失效引擎
    container.singleton('invalidationEngine', () => {
      return new AsyncInvalidationEngine()
    })
  }

  /**
   * 啟動服務邏輯
   */
  override async boot(core: PlanetCore): Promise<void> {
    // 取得業務指標 (假設已經由 bootstrapMonitor 設置)
    const businessMetrics = core.container.has('businessMetrics')
      ? core.container.make<BusinessMetrics>('businessMetrics')
      : undefined

    // 啟動組件
    const poolManager = core.container.make('poolManager') as DynamicPoolManager
    const aggregator = core.container.make('eventAggregator') as EventAggregator
    const invalidationEngine = core.container.make('invalidationEngine') as AsyncInvalidationEngine

    poolManager.startMonitoring(core)
    aggregator.start()
    invalidationEngine.start()

    // 設置各項整合
    setupCacheIntegration(core)

    if (businessMetrics) {
      setupMonitoringIntegration(core, businessMetrics)
    }

    setupOrderQueueIntegration(core)
    setupPaymentQueueIntegration(core)

    // 註冊路由
    registerAllRoutes(core)
  }

  /**
   * 當系統準備就緒時調用
   */
  override async onReady(core: PlanetCore): Promise<void> {
    core.logger.info('[AppServiceProvider] Application services are ready')
  }

  /**
   * 當系統關閉時調用
   */
  override async onShutdown(core: PlanetCore): Promise<void> {
    const poolManager = core.container.make('poolManager') as DynamicPoolManager
    const aggregator = core.container.make('eventAggregator') as EventAggregator
    const invalidationEngine = core.container.make('invalidationEngine') as AsyncInvalidationEngine

    poolManager.stopMonitoring()
    await aggregator.stop()
    await invalidationEngine.stop()

    core.logger.info('[AppServiceProvider] Application services shut down')
  }
}
