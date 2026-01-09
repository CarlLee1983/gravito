import type { IAdminModule } from '@gravito/admin-sdk'
import { NewsList } from './pages/NewsList'

/**
 * Latest News & CMS Management Module
 */
export const NewsModule: IAdminModule = {
  id: 'news-admin',
  title: '最新消息',
  routes: [
    {
      path: '/site/news',
      component: NewsList,
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
          id: 'news-item',
          title: '最新消息',
          type: 'item',
          path: '/site/news',
          icon: 'FileText',
          sortOrder: 10,
        },
      ],
    },
  ],
}

export default NewsModule
