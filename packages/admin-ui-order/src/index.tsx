import type { IAdminModule } from '@gravito/admin-sdk'
import { OrderList } from './pages/OrderList'

/**
 * Commerce (Order) Management Module
 */
export const CommerceOrderModule: IAdminModule = {
  id: 'commerce-order-admin',
  title: '銷售管理',
  routes: [
    {
      path: '/commerce/orders',
      component: OrderList,
    },
  ],
  menu: [
    {
      id: 'commerce-group',
      title: '銷售營運',
      type: 'group',
      icon: 'ShoppingCart',
      sortOrder: 10,
      children: [
        {
          id: 'commerce-orders',
          title: '訂單列表',
          type: 'item',
          path: '/commerce/orders',
          permission: 'commerce.orders.read',
        },
      ],
    },
  ],
}

export default CommerceOrderModule
