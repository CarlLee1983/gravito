import type { IAdminModule } from '@gravito/admin-sdk'
import { ProductList } from './pages/ProductList'

/**
 * Catalog (Product) Management Module
 */
export const CatalogModule: IAdminModule = {
  id: 'catalog-admin',
  title: '商品目錄',
  routes: [
    {
      path: '/catalog/products',
      component: ProductList,
    },
  ],
  menu: [
    {
      id: 'catalog-group',
      title: '商品管理',
      type: 'group',
      icon: 'ShoppingBag',
      sortOrder: 20,
      children: [
        {
          id: 'catalog-products',
          title: '商品列表',
          type: 'item',
          path: '/catalog/products',
          permission: 'catalog.products.read',
        },
      ],
    },
  ],
}

export default CatalogModule
