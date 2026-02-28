/**
 * PlaceOrder UseCase 單元測試
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { PlaceOrder } from '../src/Application/UseCases/PlaceOrder'
import type { IOrderRepository } from '../src/Domain/Contracts/IOrderRepository'
import type { Order } from '../src/Domain/Entities/Order'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const createMockRepository = () => {
  const orders = new Map<string, Order>()

  return {
    findById: async (id: string) => orders.get(id) ?? null,
    findByUserId: async () => [],
    findByIdempotencyKey: async () => null,
    findAll: async () => ({ items: [], total: 0 }),
    exists: async (id: string) => orders.has(id),
    save: async (order: Order) => {
      orders.set(order.id, order)
    },
    delete: async () => {},
  } as IOrderRepository
}

const createMockCore = () => {
  const actions: Record<string, unknown[]> = {}
  return {
    logger: {
      info: (_msg: string) => {},
      error: (_msg: string) => {},
      debug: (_msg: string) => {},
      warn: (_msg: string) => {},
    },
    hooks: {
      doAction: async (event: string, payload: unknown) => {
        actions[event] = actions[event] || []
        actions[event].push(payload)
      },
      addAction: () => {},
      applyFilters: async (_event: string, defaultVal: unknown) => defaultVal,
    },
    _actions: actions,
  } as unknown as PlanetCore & { _actions: Record<string, unknown[]> }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('PlaceOrder UseCase', () => {
  let repo: IOrderRepository
  let core: ReturnType<typeof createMockCore>
  let useCase: PlaceOrder

  beforeEach(() => {
    repo = createMockRepository()
    core = createMockCore()
    useCase = new PlaceOrder(core, repo)
  })

  describe('execute - 基本流程', () => {
    it('應成功建立訂單並返回 DTO', async () => {
      const result = await useCase.execute({
        userId: 'mem-1',
        items: [
          {
            productId: 'prod-1',
            variantId: 'var-1',
            sku: 'SKU-001',
            name: 'T-Shirt',
            unitPrice: 500,
            quantity: 2,
          },
        ],
        currency: 'TWD',
      })

      expect(result.orderId).toBeDefined()
      expect(result.status).toBe('pending')
      expect(result.total).toBe(1000)
      expect(result.currency).toBe('TWD')
      expect(result.items).toHaveLength(1)
      expect(result.items[0].name).toBe('T-Shirt')
      expect(result.items[0].quantity).toBe(2)
      expect(result.items[0].totalPrice).toBe(1000)
    })

    it('應支持預設幣別 TWD', async () => {
      const result = await useCase.execute({
        userId: 'mem-1',
        items: [
          {
            productId: 'prod-1',
            variantId: 'var-1',
            sku: 'SKU-001',
            name: 'Item',
            unitPrice: 100,
            quantity: 1,
          },
        ],
      })

      expect(result.currency).toBe('TWD')
    })

    it('應支持無會員訂單', async () => {
      const result = await useCase.execute({
        userId: null,
        items: [
          {
            productId: 'prod-1',
            variantId: 'var-1',
            sku: 'SKU-001',
            name: 'Item',
            unitPrice: 200,
            quantity: 1,
          },
        ],
        currency: 'TWD',
      })

      expect(result.orderId).toBeDefined()
    })

    it('應正確計算多個項目的總金額', async () => {
      const result = await useCase.execute({
        userId: 'mem-1',
        items: [
          {
            productId: 'prod-1',
            variantId: 'var-1',
            sku: 'SKU-001',
            name: 'Item A',
            unitPrice: 300,
            quantity: 2,
          },
          {
            productId: 'prod-2',
            variantId: 'var-2',
            sku: 'SKU-002',
            name: 'Item B',
            unitPrice: 400,
            quantity: 1,
          },
        ],
        currency: 'TWD',
      })

      expect(result.total).toBe(1000) // 300*2 + 400*1
      expect(result.items).toHaveLength(2)
    })

    it('應透過 Hook 觸發 commerce:order-placed 事件', async () => {
      await useCase.execute({
        userId: 'mem-1',
        items: [
          {
            productId: 'prod-1',
            variantId: 'var-1',
            sku: 'SKU-001',
            name: 'Item',
            unitPrice: 100,
            quantity: 1,
          },
        ],
        currency: 'TWD',
      })

      const actions = core._actions['commerce:order-placed']
      expect(actions).toBeDefined()
      expect(actions).toHaveLength(1)
    })
  })

  describe('execute - 自定義 AdjustmentCalculator', () => {
    it('應使用注入的調整計算器', async () => {
      const { AdjustmentType } = await import('../src/Domain/ValueObjects/Adjustment')

      const mockCalculator = {
        calculate: async () => [
          {
            type: AdjustmentType.SHIPPING,
            label: 'Standard Shipping',
            amount: 60,
            sourceType: 'shipping',
            sourceId: 'standard',
          },
        ],
      }

      const useCaseWithCalculator = new PlaceOrder(core, repo, mockCalculator)

      const result = await useCaseWithCalculator.execute({
        userId: 'mem-1',
        items: [
          {
            productId: 'prod-1',
            variantId: 'var-1',
            sku: 'SKU-001',
            name: 'Item',
            unitPrice: 500,
            quantity: 1,
          },
        ],
        currency: 'TWD',
      })

      // 500 + 60 (shipping)
      expect(result.total).toBe(560)
    })
  })
})
