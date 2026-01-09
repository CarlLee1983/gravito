import type { IAdminModule } from '@gravito/admin-sdk'
import { SupportWorkbench } from './pages/SupportWorkbench'

/**
 * Support & Real-time Chat Module
 */
export const SupportModule: IAdminModule = {
  id: 'support-admin',
  title: '客服系統',
  routes: [
    {
      path: '/support/inbox',
      component: SupportWorkbench,
    },
  ],
  menu: [
    {
      id: 'support-item',
      title: '即時客服',
      type: 'item',
      path: '/support/inbox',
      icon: 'Headset',
      sortOrder: 100, // 放在下方
    },
  ],
}

export default SupportModule
