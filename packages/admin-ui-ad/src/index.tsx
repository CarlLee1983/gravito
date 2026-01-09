import type { IAdminModule } from '@gravito/admin-sdk'
import { AdList } from './pages/AdList'

/**
 * Advertisement & Campaign Management Module
 */
export const AdModule: IAdminModule = {
  id: 'ad-admin',
  title: '站內廣告',
  routes: [
    {
      path: '/site/ads',
      component: AdList,
    },
  ],
  menu: [
    {
      id: 'site-parent',
      title: '網站管理',
      type: 'group',
      icon: 'Globe',
      sortOrder: 80,
      children: [
        {
          id: 'ad-item',
          title: '廣告投放',
          type: 'item',
          path: '/site/ads',
          icon: 'Image',
          sortOrder: 20,
        },
      ],
    },
  ],
}

export default AdModule
