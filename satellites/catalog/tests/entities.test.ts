import { describe, expect, it } from 'bun:test'
import { CategoryMapper } from '../src/Application/DTOs/CategoryDTO'
import { Category } from '../src/Domain/Entities/Category'
import { Product, Variant } from '../src/Domain/Entities/Product'

describe('Catalog Domain Entities', () => {
  describe('Category Tree Logic', () => {
    it('應該能正確計算分類路徑', () => {
      const root = Category.create('c1', { zh: '男裝' }, 'men')
      root.updatePath(null)
      expect(root.path).toBe('men')

      const sub = Category.create('c2', { zh: '上衣' }, 'tops', root.id)
      sub.updatePath(root.path)
      expect(sub.path).toBe('men/tops')

      const leaf = Category.create('c3', { zh: '襯衫' }, 'shirts', sub.id)
      leaf.updatePath(sub.path)
      expect(leaf.path).toBe('men/tops/shirts')
    })

    it('CategoryMapper 應該能將扁平數據轉換為樹狀結構', () => {
      const flatCategories = [
        { id: '1', parentId: null, path: 'a', name: { zh: 'A' }, slug: 'a', sortOrder: 1 },
        { id: '2', parentId: '1', path: 'a/b', name: { zh: 'B' }, slug: 'b', sortOrder: 1 },
        { id: '3', parentId: '2', path: 'a/b/c', name: { zh: 'C' }, slug: 'c', sortOrder: 1 },
        { id: '4', parentId: null, path: 'd', name: { zh: 'D' }, slug: 'd', sortOrder: 2 },
      ]

      const tree = CategoryMapper.buildTree(flatCategories as any)

      expect(tree.length).toBe(2) // A 和 D
      expect(tree[0].id).toBe('1')
      expect(tree[0].children?.length).toBe(1) // B
      expect(tree[0].children?.[0].children?.length).toBe(1) // C
      expect(tree[1].id).toBe('4')
    })
  })

  describe('Product & Variant Logic', () => {
    it('變體應該能正確扣減庫存', () => {
      const variant = new Variant('v1', {
        productId: 'p1',
        sku: 'TSHIRT-RED-L',
        name: '紅色 L 號',
        price: 500,
        compareAtPrice: 600,
        stock: 10,
        options: { color: 'Red', size: 'L' },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      variant.reduceStock(3)
      expect(variant.stock).toBe(7)

      expect(() => variant.reduceStock(10)).toThrow('Insufficient stock')
    })

    it('商品應該能正確管理變體與分類', () => {
      const product = Product.create('p1', { zh: '極簡 T-Shirt' }, 'minimal-tshirt')

      product.assignToCategory('c1')
      expect(product.categoryIds).toContain('c1')

      const variant = new Variant('v1', { productId: product.id } as any)
      product.addVariant(variant)
      expect(product.variants.length).toBe(1)
    })
  })
})
