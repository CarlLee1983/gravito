import type { IAdminModule } from '@gravito/admin-sdk'
import { AdminUserList } from './pages/AdminUserList'
import { RoleList } from './pages/RoleList'

/**
 * Access Control Module Definition
 */
export const AccessModule: IAdminModule = {
  id: 'access-control',
  title: '權限控管',
  routes: [
    {
      path: '/access/roles',
      component: RoleList,
    },
    {
      path: '/access/users',
      component: AdminUserList,
    },
  ],
  menu: [
    {
      id: 'access-group',
      title: '安全性與權限',
      type: 'group',
      icon: 'ShieldCheck', // 這裡會由 Shell 映射到 Lucide 組件
      sortOrder: 100,
      children: [
        {
          id: 'access-roles',
          title: '角色管理',
          type: 'item',
          path: '/access/roles',
          permission: 'access.roles.read',
        },
        {
          id: 'access-admins',
          title: '管理員設定',
          type: 'item',
          path: '/access/users',
          permission: 'access.users.read',
        },
      ],
    },
  ],
}

export default AccessModule
