import type { IAdminModule } from '@gravito/admin-sdk'
import { InvoiceList } from './pages/InvoiceList'

/**
 * Invoice Management Module
 */
export const InvoiceModule: IAdminModule = {
  id: 'invoice-admin',
  title: '電子發票',
  routes: [
    {
      path: '/invoices',
      component: InvoiceList,
    },
  ],
  menu: [
    {
      id: 'finance-group',
      title: '財務管理',
      type: 'group',
      icon: 'CreditCard',
      sortOrder: 50,
      children: [
        {
          id: 'invoice-list',
          title: '電子發票清單',
          type: 'item',
          path: '/invoices',
          permission: 'finance.invoices.read',
        },
      ],
    },
  ],
}

export default InvoiceModule
