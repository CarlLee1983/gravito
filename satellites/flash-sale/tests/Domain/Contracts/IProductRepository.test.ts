import { describe, expect, it } from 'bun:test'
import type { Repository } from '@gravito/enterprise'
import type { IProductRepository } from '../../../src/Domain/Contracts/IProductRepository'
import type { Product } from '../../../src/Domain/Entities/Product'
import type { Stock } from '../../../src/Domain/ValueObjects/Stock'

/**
 * IProductRepository Contract 驗證測試
 *
 * 驗證介面繼承自 Repository<Product, string> 且包含額外方法
 */
describe('IProductRepository Contract', () => {
  it('應繼承 Repository<Product, string> 基礎介面', () => {
    const assertExtends = (_repo: Repository<Product, string>): void => {}

    const mockRepo: IProductRepository = {
      save: async () => {},
      findById: async () => null,
      findAll: async () => [],
      delete: async () => {},
      exists: async () => false,
      findBySku: async () => null,
      findByIds: async () => [],
      updateStock: async () => {},
    }

    assertExtends(mockRepo)
    expect(mockRepo).toBeDefined()
  })

  it('應包含 findBySku 方法', () => {
    const mockRepo: IProductRepository = {
      save: async () => {},
      findById: async () => null,
      findAll: async () => [],
      delete: async () => {},
      exists: async () => false,
      findBySku: async () => null,
      findByIds: async () => [],
      updateStock: async () => {},
    }

    expect(typeof mockRepo.findBySku).toBe('function')
  })

  it('應包含 findByIds 方法', () => {
    const mockRepo: IProductRepository = {
      save: async () => {},
      findById: async () => null,
      findAll: async () => [],
      delete: async () => {},
      exists: async () => false,
      findBySku: async () => null,
      findByIds: async () => [],
      updateStock: async () => {},
    }

    expect(typeof mockRepo.findByIds).toBe('function')
  })

  it('應包含 updateStock 方法', () => {
    const mockRepo: IProductRepository = {
      save: async () => {},
      findById: async () => null,
      findAll: async () => [],
      delete: async () => {},
      exists: async () => false,
      findBySku: async () => null,
      findByIds: async () => [],
      updateStock: async (_productId: string, _newStock: Stock) => {},
    }

    expect(typeof mockRepo.updateStock).toBe('function')
  })
})
