/**
 * DeductInventory Use Case 單元測試
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { CommerceError } from '../src/Application/Errors/CommerceError'
import { DeductInventory } from '../src/Application/UseCases/DeductInventory'

/**
 * Mock PlanetCore
 */
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
    },
    _actions: actions,
  } as unknown as PlanetCore & { _actions: Record<string, unknown[]> }
}

describe('DeductInventory Use Case', () => {
  let useCase: DeductInventory
  let core: ReturnType<typeof createMockCore>

  beforeEach(() => {
    core = createMockCore()
    useCase = new DeductInventory(core)
  })

  it('應成功觸發庫存扣減 Hook', async () => {
    await useCase.execute({
      orderId: 'ORD-123',
      items: [{ variantId: 'VAR-1', quantity: 2 }],
    })

    const actions = core._actions['catalog.inventory.deduct']
    expect(actions).toBeDefined()
    expect(actions).toHaveLength(1)
    expect((actions[0] as { orderId: string }).orderId).toBe('ORD-123')
  })

  it('應帶入正確的明細項目', async () => {
    await useCase.execute({
      orderId: 'ORD-456',
      items: [
        { variantId: 'VAR-1', quantity: 3 },
        { variantId: 'VAR-2', quantity: 1 },
      ],
    })

    const actions = core._actions['catalog.inventory.deduct']
    expect(actions).toHaveLength(1)
    const payload = actions[0] as {
      orderId: string
      items: Array<{ variantId: string; quantity: number }>
    }
    expect(payload.items).toHaveLength(2)
    expect(payload.items[0].variantId).toBe('VAR-1')
    expect(payload.items[0].quantity).toBe(3)
    expect(payload.items[1].variantId).toBe('VAR-2')
    expect(payload.items[1].quantity).toBe(1)
  })

  it('orderId 為空時應拋出 CommerceError', async () => {
    await expect(
      useCase.execute({
        orderId: '',
        items: [{ variantId: 'VAR-1', quantity: 1 }],
      })
    ).rejects.toThrow(CommerceError)
  })

  it('items 為空陣列時應拋出 CommerceError', async () => {
    await expect(
      useCase.execute({
        orderId: 'ORD-789',
        items: [],
      })
    ).rejects.toThrow(CommerceError)
  })
})
