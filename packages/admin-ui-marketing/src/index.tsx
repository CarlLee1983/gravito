import type { IAdminModule } from '@gravito/admin-sdk'
import { CouponList } from './pages/CouponList'

/**
 * Marketing (Coupon/Promotion) Management Module
 */
export const MarketingModule: IAdminModule = {
  id: 'marketing-admin',
  title: '行銷推廣',
  routes: [
    {
      path: '/marketing/coupons',
      component: CouponList,
    },
  ],
  menu: [
    {
      id: 'marketing-group',
      title: '行銷管理',
      type: 'group',
      icon: 'Ticket',
      sortOrder: 40,
      children: [
        {
          id: 'marketing-coupons',
          title: '優惠券設定',
          type: 'item',
          path: '/marketing/coupons',
          permission: 'marketing.coupons.read',
        },
      ],
    },
  ],
}

export default MarketingModule
