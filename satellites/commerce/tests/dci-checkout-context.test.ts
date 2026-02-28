/**
 * CheckoutContext 單元測試
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { CommerceError } from '../src/Application/Errors/CommerceError'
import type { IOrderRepository } from '../src/Domain/Contracts/IOrderRepository'
import { CheckoutContext } from '../src/Domain/DCI/Contexts/CheckoutContext'
import type { Order } from '../src/Domain/Entities/Order'
import { AdjustmentType } from '../src/Domain/ValueObjects/Adjustment'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const createMockRepository = () => {
  const orders = new Map<string, Order>()
  const idempotencyKeys = new Map<string, Order>()
  let savedOrder: Order | null = null

  return {
    findById: async (id: string) => orders.get(id) ?? null,
    findByUserId: async (_userId: string) => [],
    findByIdempotencyKey: async (key: string) => idempotencyKeys.get(key) ?? null,
    findAll: async () => ({ items: [], total: 0 }),
    exists: async (id: string) => orders.has(id),
    save: async (order: Order) => {
      orders.set(order.id, order)
      // 若訂單有冪等鑰匙，同時記錄到 idempotencyKeys
      if (order.idempotencyKey) {
        idempotencyKeys.set(order.idempotencyKey, order)
      }
      savedOrder = order
    },
    delete: async (_id: string) => {},
    getSavedOrder: () => savedOrder,
  } as IOrderRepository & { getSavedOrder: () => Order | null }
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

describe('CheckoutContext', () => {
  let repo: IOrderRepository & { getSavedOrder: () => Order | null }
  let core: ReturnType<typeof createMockCore>
  let context: CheckoutContext

  beforeEach(() => {
    repo = createMockRepository()
    core = createMockCore()
    context = new CheckoutContext(repo, core)
  })

  describe('execute - 基本結帳流程', () => {
    it('應成功建立訂單並返回結果', async () => {
      const result = await context.execute({
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
    })

    it('應觸發 commerce:order-placed Hook', async () => {
      await context.execute({
        userId: 'mem-1',
        items: [
          {
            productId: 'prod-1',
            variantId: 'var-1',
            sku: 'SKU-001',
            name: 'T-Shirt',
            unitPrice: 300,
            quantity: 1,
          },
        ],
        currency: 'TWD',
      })

      const actions = core._actions['commerce:order-placed']
      expect(actions).toBeDefined()
      expect(actions).toHaveLength(1)
      expect((actions[0] as { currency: string }).currency).toBe('TWD')
    })

    it('應支持無會員的訂單', async () => {
      const result = await context.execute({
        userId: null,
        items: [
          {
            productId: 'prod-1',
            variantId: 'var-1',
            sku: 'SKU-001',
            name: 'Product',
            unitPrice: 100,
            quantity: 1,
          },
        ],
        currency: 'TWD',
      })

      expect(result.orderId).toBeDefined()
      expect(result.status).toBe('pending')
    })

    it('應應用調整項目並計算正確金額', async () => {
      const result = await context.execute({
        userId: 'mem-1',
        items: [
          {
            productId: 'prod-1',
            variantId: 'var-1',
            sku: 'SKU-001',
            name: 'T-Shirt',
            unitPrice: 1000,
            quantity: 1,
          },
        ],
        adjustments: [
          {
            type: AdjustmentType.DISCOUNT,
            label: '10% off',
            amount: -100,
          },
        ],
        currency: 'TWD',
      })

      expect(result.total).toBe(900)
    })

    it('空項目列表應拋出 CommerceError', async () => {
      await expect(
        context.execute({
          userId: 'mem-1',
          items: [],
          currency: 'TWD',
        })
      ).rejects.toThrow(CommerceError)
    })
  })

  describe('execute - 冪等性', () => {
    it('相同 idempotencyKey 應返回已存在的訂單', async () => {
      // 第一次下單
      const first = await context.execute({
        userId: 'mem-1',
        idempotencyKey: 'idem-key-123',
        items: [
          {
            productId: 'prod-1',
            variantId: 'var-1',
            sku: 'SKU-001',
            name: 'T-Shirt',
            unitPrice: 500,
            quantity: 1,
          },
        ],
        currency: 'TWD',
      })

      // 第二次下單（相同 key）
      const second = await context.execute({
        userId: 'mem-1',
        idempotencyKey: 'idem-key-123',
        items: [
          {
            productId: 'prod-2',
            variantId: 'var-2',
            sku: 'SKU-002',
            name: 'Different',
            unitPrice: 999,
            quantity: 5,
          },
        ],
        currency: 'TWD',
      })

      expect(second.orderId).toBe(first.orderId)
    })
  })
})
