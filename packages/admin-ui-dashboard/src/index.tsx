import type { IAdminModule } from '@gravito/admin-sdk'
import { Dashboard } from './pages/Dashboard'

/**
 * Main Operational Dashboard Module
 */
export const DashboardModule: IAdminModule = {
  id: 'dashboard-admin',
  title: '儀表板',
  routes: [
    {
      path: '/',
      component: Dashboard,
    },
  ],
  menu: [
    {
      id: 'dashboard-item',
      title: '營運總覽',
      type: 'item',
      path: '/',
      icon: 'LayoutDashboard',
      sortOrder: 0,
    },
  ],
}

export default DashboardModule
