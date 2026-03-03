import type { Router } from '@gravito/core'
import { ReportingController } from '../reporting/ReportingController'

/**
 * 註冊報表系統路由
 */
export function registerReportingRoutes(router: Router): void {
  router.prefix('/api').group((group) => {
    group.get('/reports', [ReportingController, 'index'])
    group.get('/reports/:id', [ReportingController, 'show'])
    group.post('/reports/generate', [ReportingController, 'generate'])
    group.get('/reports/status/:jobId', [ReportingController, 'jobStatus'])
    group.get('/reports/stats', [ReportingController, 'stats'])
  })
}
