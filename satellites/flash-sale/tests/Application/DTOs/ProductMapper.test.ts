/**
 * ProductMapper 單元測試
 *
 * 驗證 Product Entity <-> ProductDTO 的雙向轉換
 */

import { describe, expect, it } from 'bun:test'
import { ProductMapper } from '../../../src/Application/DTOs/ProductDTO'
import { Product } from '../../../src/Domain/Entities/Product'
import { ProductStatus } from '../../../src/Domain/Models'
import { Money } from '../../../src/Domain/ValueObjects/Money'
import { Stock } from '../../../src/Domain/ValueObjects/Stock'

describe('ProductMapper', () => {
  /**
   * 建立測試用 Product Entity
   */
  function createTestProduct(): Product {
    return Product.create(
      'prod-001',
      'Flash Sale Item',
      'SKU-001',
      'A great product for testing',
      Money.of(99.99),
      Money.of(50),
      Stock.of(100),
      ['https://example.com/img1.jpg', 'https://example.com/img2.jpg']
    )
  }

  describe('toDTO', () => {
    it('should convert Product entity to ProductDTO with correct fields', () => {
      const product = createTestProduct()
      const dto = ProductMapper.toDTO(product)

      expect(dto.id).toBe('prod-001')
      expect(dto.name).toBe('Flash Sale Item')
      expect(dto.sku).toBe('SKU-001')
      expect(dto.description).toBe('A great product for testing')
      expect(dto.status).toBe(ProductStatus.ACTIVE)
      expect(dto.createdAt).toBeInstanceOf(Date)
    })

    it('should convert Money price to decimal number', () => {
      const product = createTestProduct()
      const dto = ProductMapper.toDTO(product)

      expect(dto.price).toBe(99.99)
    })

    it('should convert Money cost to decimal number', () => {
      const product = createTestProduct()
      const dto = ProductMapper.toDTO(product)

      expect(dto.cost).toBe(50)
    })

    it('should convert Stock to stock object with quantity and isAvailable', () => {
      const product = createTestProduct()
      const dto = ProductMapper.toDTO(product)

      expect(dto.stock.quantity).toBe(100)
      expect(dto.stock.isAvailable).toBe(true)
    })

    it('should set isAvailable to false when stock is zero', () => {
      const product = Product.create(
        'prod-empty',
        'Empty Stock Item',
        'SKU-EMPTY',
        'No stock',
        Money.of(10),
        Money.of(5),
        Stock.of(0),
        []
      )

      const dto = ProductMapper.toDTO(product)

      expect(dto.stock.quantity).toBe(0)
      expect(dto.stock.isAvailable).toBe(false)
    })

    it('should copy images array', () => {
      const product = createTestProduct()
      const dto = ProductMapper.toDTO(product)

      expect(dto.images).toHaveLength(2)
      expect(dto.images[0]).toBe('https://example.com/img1.jpg')
      expect(dto.images[1]).toBe('https://example.com/img2.jpg')
    })

    it('should handle inactive product', () => {
      const product = createTestProduct()
      product.transitionToInactive()
      const dto = ProductMapper.toDTO(product)

      expect(dto.status).toBe(ProductStatus.INACTIVE)
    })
  })

  describe('toDTOList', () => {
    it('should convert array of Product entities to ProductDTO array', () => {
      const product1 = createTestProduct()
      const product2 = Product.create(
        'prod-002',
        'Another Product',
        'SKU-002',
        'Description',
        Money.of(200),
        Money.of(100),
        Stock.of(50),
        []
      )

      const dtos = ProductMapper.toDTOList([product1, product2])

      expect(dtos).toHaveLength(2)
      expect(dtos[0].id).toBe('prod-001')
      expect(dtos[1].id).toBe('prod-002')
      expect(dtos[1].price).toBe(200)
    })

    it('should return empty array for empty input', () => {
      const dtos = ProductMapper.toDTOList([])
      expect(dtos).toHaveLength(0)
    })
  })

  describe('toDomain', () => {
    it('should convert CreateProductDTO to Product entity', () => {
      const dto = {
        id: 'prod-new',
        name: 'New Product',
        sku: 'SKU-NEW',
        description: 'A brand new product',
        price: 150.5,
        cost: 75.25,
        stock: 200,
        images: ['https://example.com/new.jpg'],
      }

      const product = ProductMapper.toDomain(dto)

      expect(product.id).toBe('prod-new')
      expect(product.name).toBe('New Product')
      expect(product.sku).toBe('SKU-NEW')
      expect(product.description).toBe('A brand new product')
      expect(product.price.value).toBe(150.5)
      expect(product.cost.value).toBe(75.25)
      expect(product.stock.quantity).toBe(200)
      expect(product.images).toHaveLength(1)
      expect(product.status).toBe(ProductStatus.ACTIVE)
    })

    it('should handle zero stock', () => {
      const dto = {
        id: 'prod-zero',
        name: 'Zero Stock',
        sku: 'SKU-ZERO',
        description: 'No stock product',
        price: 10,
        cost: 5,
        stock: 0,
        images: [],
      }

      const product = ProductMapper.toDomain(dto)

      expect(product.stock.quantity).toBe(0)
      expect(product.stock.isAvailable).toBe(false)
    })

    it('should handle default empty images', () => {
      const dto = {
        id: 'prod-no-img',
        name: 'No Images',
        sku: 'SKU-NOIMG',
        description: 'Product without images',
        price: 50,
        cost: 25,
        stock: 10,
        images: [],
      }

      const product = ProductMapper.toDomain(dto)

      expect(product.images).toHaveLength(0)
    })
  })
})
