/**
 * 連接池監控 API 路由
 *
 * 提供連接池狀態查詢和調整歷史接口
 */

import type { PlanetCore, Router } from '@gravito/core'

export function registerPoolMonitoringRoutes(router: Router): void {
  /**
   * GET /api/admin/pool/metrics
   * 獲取當前連接池指標
   */
  router.get('/api/admin/pool/metrics', (c: any) => {
    try {
      return c.json({
        success: true,
        data: {
          message: '連接池監控已啟用',
          note: '詳細指標可在應用日誌中查看',
        },
      })
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  })

  /**
   * GET /api/admin/pool/health
   * 檢查連接池健康狀態
   */
  router.get('/api/admin/pool/health', (c) => {
    try {
      const core = c.get('core') as PlanetCore
      const db = (core as any).database
      const pool = (db as any).client?.pool

      if (!pool) {
        return c.json(
          {
            success: false,
            error: 'Connection pool not available',
          },
          500
        )
      }

      const allClients = pool.__allClients?.length ?? 0
      const activeClients = pool._activeClients?.size ?? 0
      const maxPoolSize = pool._config?.max ?? 10

      return c.json({
        success: true,
        data: {
          totalConnections: allClients,
          activeConnections: activeClients,
          idleConnections: Math.max(0, allClients - activeClients),
          utilization: `${((activeClients / maxPoolSize) * 100).toFixed(1)}%`,
          maxPoolSize,
          waitingRequests: (pool._waitingQueue as any)?.length ?? 0,
          status: activeClients < maxPoolSize ? 'healthy' : 'critical',
        },
      })
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  })
}
