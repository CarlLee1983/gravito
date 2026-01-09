import type { IAdminModule } from '@gravito/admin-sdk'
import { AnnouncementList } from './pages/AnnouncementList'

/**
 * Website Announcement Management Module
 */
export const AnnouncementModule: IAdminModule = {
  id: 'announcement-admin',
  title: '網站公告',
  routes: [
    {
      path: '/site/announcements',
      component: AnnouncementList,
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
          id: 'announcement-item',
          title: '公告管理',
          type: 'item',
          path: '/site/announcements',
          icon: 'Megaphone',
          sortOrder: 0,
        },
      ],
    },
  ],
}

export default AnnouncementModule
