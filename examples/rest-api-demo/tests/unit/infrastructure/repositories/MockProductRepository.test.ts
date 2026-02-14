/**
 * MockProductRepository 單元測試
 */

import type { CreateProductInput } from '@domain/product/Product'
import { MockProductRepository } from '@infrastructure/repositories/MockProductRepository'

describe('MockProductRepository', () => {
  let repository: MockProductRepository

  beforeEach(() => {
    repository = new MockProductRepository()
  })

  describe('基本操作', () => {
    test('應該能夠創建商品', async () => {
      const input: CreateProductInput = {
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'A test product',
        categoryId: 'cat_001',
        price: 9999,
        stock: 10,
      }

      const product = await repository.create(input)

      expect(product).toMatchObject({
        ...input,
        rating: 0,
        ratingCount: 0,
        status: 'active',
      })
      expect(product.id).toBeDefined()
      expect(product.createdAt).toBeInstanceOf(Date)
      expect(product.updatedAt).toBeInstanceOf(Date)
    })

    test('應該能夠根據 ID 查找商品', async () => {
      const input: CreateProductInput = {
        sku: 'TEST-002',
        name: 'Product 2',
        description: 'Description',
        categoryId: 'cat_001',
        price: 5000,
        stock: 5,
      }

      const created = await repository.create(input)
      const found = await repository.findById(created.id)

      expect(found).toEqual(created)
    })

    test('應該返回 null 如果找不到商品', async () => {
      const found = await repository.findById('non_existent')
      expect(found).toBeNull()
    })

    test('應該能夠更新商品', async () => {
      const input: CreateProductInput = {
        sku: 'TEST-003',
        name: 'Original Name',
        description: 'Original Description',
        categoryId: 'cat_001',
        price: 1000,
        stock: 100,
      }

      const created = await repository.create(input)
      const updated = await repository.update(created.id, {
        name: 'Updated Name',
        price: 2000,
      })

      expect(updated).toMatchObject({
        name: 'Updated Name',
        price: 2000,
      })
      expect(updated?.id).toBe(created.id)
    })

    test('應該能夠刪除商品', async () => {
      const input: CreateProductInput = {
        sku: 'TEST-004',
        name: 'Product to Delete',
        description: 'Will be deleted',
        categoryId: 'cat_001',
        price: 1000,
        stock: 1,
      }

      const created = await repository.create(input)
      const deleted = await repository.delete(created.id)

      expect(deleted).toBe(true)
      expect(await repository.findById(created.id)).toBeNull()
    })
  })

  describe('SKU 操作', () => {
    test('應該能夠根據 SKU 查找商品', async () => {
      const input: CreateProductInput = {
        sku: 'UNIQUE-SKU-001',
        name: 'Product with SKU',
        description: 'Description',
        categoryId: 'cat_001',
        price: 1000,
        stock: 10,
      }

      const created = await repository.create(input)
      const found = await repository.findBySku('UNIQUE-SKU-001')

      expect(found).toEqual(created)
    })

    test('應該能夠檢查 SKU 是否已存在', async () => {
      const input: CreateProductInput = {
        sku: 'EXIST-CHECK-001',
        name: 'Product',
        description: 'Description',
        categoryId: 'cat_001',
        price: 1000,
        stock: 10,
      }

      await repository.create(input)
      const exists = await repository.existsBySku('EXIST-CHECK-001')

      expect(exists).toBe(true)
    })

    test('應該返回 false 如果 SKU 不存在', async () => {
      const exists = await repository.existsBySku('NON-EXISTENT-SKU')
      expect(exists).toBe(false)
    })
  })

  describe('庫存操作', () => {
    test('應該能夠減少庫存', async () => {
      const input: CreateProductInput = {
        sku: 'STOCK-001',
        name: 'Stock Product',
        description: 'Description',
        categoryId: 'cat_001',
        price: 1000,
        stock: 100,
      }

      const created = await repository.create(input)
      const decreased = await repository.decreaseStock(created.id, 10)

      expect(decreased).toBe(true)
      const updated = await repository.findById(created.id)
      expect(updated?.stock).toBe(90)
    })

    test('應該返回 false 如果庫存不足', async () => {
      const input: CreateProductInput = {
        sku: 'LOW-STOCK-001',
        name: 'Low Stock Product',
        description: 'Description',
        categoryId: 'cat_001',
        price: 1000,
        stock: 5,
      }

      const created = await repository.create(input)
      const decreased = await repository.decreaseStock(created.id, 10)

      expect(decreased).toBe(false)
    })

    test('應該能夠增加庫存', async () => {
      const input: CreateProductInput = {
        sku: 'INCREASE-STOCK-001',
        name: 'Product',
        description: 'Description',
        categoryId: 'cat_001',
        price: 1000,
        stock: 50,
      }

      const created = await repository.create(input)
      const increased = await repository.increaseStock(created.id, 30)

      expect(increased).toBe(true)
      const updated = await repository.findById(created.id)
      expect(updated?.stock).toBe(80)
    })

    test('應該能夠獲取庫存', async () => {
      const input: CreateProductInput = {
        sku: 'GET-STOCK-001',
        name: 'Product',
        description: 'Description',
        categoryId: 'cat_001',
        price: 1000,
        stock: 42,
      }

      const created = await repository.create(input)
      const stock = await repository.getStock(created.id)

      expect(stock).toBe(42)
    })

    test('應該返回 null 如果商品不存在', async () => {
      const stock = await repository.getStock('non_existent')
      expect(stock).toBeNull()
    })
  })

  describe('評分操作', () => {
    test('應該能夠更新評分', async () => {
      const input: CreateProductInput = {
        sku: 'RATING-001',
        name: 'Product',
        description: 'Description',
        categoryId: 'cat_001',
        price: 1000,
        stock: 10,
      }

      const created = await repository.create(input)
      await repository.updateRating(created.id, 4.5, 100)

      const updated = await repository.findById(created.id)
      expect(updated?.rating).toBe(4.5)
      expect(updated?.ratingCount).toBe(100)
    })
  })

  describe('查詢操作', () => {
    beforeEach(async () => {
      const products: CreateProductInput[] = [
        {
          sku: 'QUERY-001',
          name: 'Laptop',
          description: 'High performance laptop',
          categoryId: 'cat_001',
          price: 50000,
          stock: 10,
        },
        {
          sku: 'QUERY-002',
          name: 'Desktop',
          description: 'Gaming desktop',
          categoryId: 'cat_001',
          price: 40000,
          stock: 5,
        },
        {
          sku: 'QUERY-003',
          name: 'Monitor',
          description: '4K display monitor',
          categoryId: 'cat_002',
          price: 8000,
          stock: 20,
        },
      ]

      for (const input of products) {
        await repository.create(input)
      }
    })

    test('應該能夠獲取所有商品（分頁）', async () => {
      const result = await repository.findAll(1, 2)

      expect(result.data.length).toBe(2)
      expect(result.total).toBe(3)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(2)
    })

    test('應該能夠根據分類查找商品', async () => {
      const result = await repository.findByCategory('cat_001', 1, 10)

      expect(result.data.length).toBe(2)
      expect(result.total).toBe(2)
    })

    test('應該能夠搜索商品', async () => {
      const result = await repository.search('laptop', 1, 10)

      expect(result.data.length).toBe(1)
      expect(result.data[0]?.name).toBe('Laptop')
    })

    test('應該能夠搜索描述', async () => {
      const result = await repository.search('gaming', 1, 10)

      expect(result.data.length).toBe(1)
      expect(result.data[0]?.name).toBe('Desktop')
    })

    test('應該能夠獲取商品總數', async () => {
      const count = await repository.count()
      expect(count).toBe(3)
    })

    test('應該能夠獲取熱門商品', async () => {
      // 先設置評分
      const products = await repository.findAll(1, 10)
      const product1 = products.data[0]
      const product2 = products.data[1]

      if (product1 && product2) {
        await repository.updateRating(product1.id, 5, 100)
        await repository.updateRating(product2.id, 3, 50)
      }

      const popular = await repository.findPopular(2)
      expect(popular.length).toBeLessThanOrEqual(2)
    })

    test('應該能夠獲取最新商品', async () => {
      const latest = await repository.findLatest(2)
      expect(latest.length).toBeLessThanOrEqual(2)
    })
  })

  describe('seedTestProducts', () => {
    test('應該初始化 10 個測試商品', async () => {
      const repo = new MockProductRepository()
      repo.seedTestProducts()

      const count = await repo.count()
      expect(count).toBe(10)
    })

    test('應該能夠訪問初始化的商品', async () => {
      const repo = new MockProductRepository()
      repo.seedTestProducts()

      const products = await repo.findAll(1, 10)
      expect(products.data.length).toBe(10)
      expect(products.total).toBe(10)
    })
  })
})
