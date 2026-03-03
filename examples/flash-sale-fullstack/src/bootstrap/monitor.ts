import type { PlanetCore } from '@gravito/core'
import { MonitorOrbit, type MonitorService } from '@gravito/monitor'
import { registerAllHealthChecks } from '../monitoring/health-checks'
import { type BusinessMetrics, registerBusinessMetrics } from '../monitoring/metrics-integration'
import { getMonitorConfig } from '../monitoring/monitor-config'

/**
 * 設置監控系統 (P0.1)
 */
export async function bootstrapMonitor(core: PlanetCore): Promise<BusinessMetrics> {
  // 從配置或環境變數中取得環境設定
  const env = (core.config.get('env') || process.env.NODE_ENV || 'development') as
    | 'development'
    | 'production'
    | 'testing'
  const monitorConfig = getMonitorConfig(env)
  const monitorOrbit = new MonitorOrbit(monitorConfig)

  await monitorOrbit.install(core)

  // 從容器取得 Monitor 服務
  const monitorService = core.container.make('monitor') as MonitorService

  // 註冊健康檢查
  registerAllHealthChecks(monitorService.health, core.logger)

  // 註冊業務指標
  const businessMetrics = registerBusinessMetrics(monitorService.metrics, core.logger)

  // 將業務指標註冊到容器中，以便後續整合使用
  core.container.instance('businessMetrics', businessMetrics)

  return businessMetrics
}
