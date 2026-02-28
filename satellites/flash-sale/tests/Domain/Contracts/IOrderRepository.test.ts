import { describe, expect, it } from 'bun:test'
import type { Repository } from '@gravito/enterprise'
import type { IOrderRepository } from '../../../src/Domain/Contracts/IOrderRepository'
import type { Order } from '../../../src/Domain/Entities/Order'

/**
 * IOrderRepository Contract 驗證測試
 *
 * 驗證介面繼承自 Repository<Order, string> 且包含額外方法
 */
describe('IOrderRepository Contract', () => {
  it('應繼承 Repository<Order, string> 基礎介面', () => {
    // 型別級驗證：IOrderRepository 可賦值給 Repository<Order, string>
    const assertExtends = (_repo: Repository<Order, string>): void => {
      // 此函式只驗證型別相容性，不需要實際執行
    }

    // 建立一個符合 IOrderRepository 介面的 mock
    const mockRepo: IOrderRepository = {
      save: async () => {},
      findById: async () => null,
      findAll: async () => [],
      delete: async () => {},
      exists: async () => false,
      findByUserId: async () => [],
      findByDateRange: async () => [],
    }

    // 若 IOrderRepository 正確繼承 Repository，此處不應有型別錯誤
    assertExtends(mockRepo)
    expect(mockRepo).toBeDefined()
  })

  it('應包含 findByUserId 方法', () => {
    const mockRepo: IOrderRepository = {
      save: async () => {},
      findById: async () => null,
      findAll: async () => [],
      delete: async () => {},
      exists: async () => false,
      findByUserId: async () => [],
      findByDateRange: async () => [],
    }

    expect(typeof mockRepo.findByUserId).toBe('function')
  })

  it('應包含 findByDateRange 方法', () => {
    const mockRepo: IOrderRepository = {
      save: async () => {},
      findById: async () => null,
      findAll: async () => [],
      delete: async () => {},
      exists: async () => false,
      findByUserId: async () => [],
      findByDateRange: async () => [],
    }

    expect(typeof mockRepo.findByDateRange).toBe('function')
  })
})
