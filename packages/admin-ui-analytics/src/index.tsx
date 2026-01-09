import type { IAdminModule } from '@gravito/admin-sdk'
import { AnalyticsDashboard } from './pages/AnalyticsDashboard'

/**
 * Extensible Sales Analytics Framework
 */
export const AnalyticsModule: IAdminModule = {
  id: 'analytics-admin',
  title: '銷售分析',
  routes: [
    {
      path: '/analytics/dashboard',
      component: AnalyticsDashboard,
    },
  ],
  menu: [
    {
      id: 'analytics-item',
      title: '數據指標',
      type: 'item',
      path: '/analytics/dashboard',
      icon: 'BarChartBig',
      sortOrder: 10,
    },
  ],
}

export default AnalyticsModule
