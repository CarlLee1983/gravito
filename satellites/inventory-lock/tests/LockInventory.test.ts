/**
 * LockInventory Use Case 單元測試
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { LockInventory } from '../src/Application/UseCases/LockInventory'
import { LockInventoryRequest, LockStatus } from '../src/Domain/Models'

/**
 * Mock PlanetCore
 */
class MockPlanetCore implements Partial<PlanetCore> {
  logger = {
    info: (msg: string) => console.log(`[INFO] ${msg}`),
    error: (msg: string) => console.error(`[ERROR] ${msg}`),
    debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
    warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  }

  container = {
    make: () => ({
      findById: async () => null,
      findByOrderId: async () => null,
      countActive: async () => 0,
      sumLockedQuantity: async () => 0,
      create: async (data: any) => ({
        id: `LOCK-${Date.now()}`,
        version: 1,
        ...data,
      }),
    }),
  } as any

  events = {
    dispatch: async () => {},
  } as any

  hooks = {
    addAction: () => {},
  } as any
}

describe('LockInventory Use Case', () => {
  let useCase: LockInventory
  let core: MockPlanetCore

  beforeEach(() => {
    core = new MockPlanetCore()
    useCase = new LockInventory(core as any)
  })

  it('should successfully lock inventory', async () => {
    const request = new LockInventoryRequest('PROD-1', 'USER-1', 'ORD-123', 5, 900)
    const result = await useCase.execute(request)

    expect(result).toBeDefined()
    expect(result?.status).toBe(LockStatus.LOCKED)
    expect(result?.productId).toBe('PROD-1')
    expect(result?.quantity).toBe(5)
  })

  it('should reject with invalid productId', async () => {
    const request = new LockInventoryRequest('', 'USER-1', 'ORD-123', 5)
    const errors = request.validate()

    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('productId')
  })

  it('should reject with invalid quantity', async () => {
    const request = new LockInventoryRequest('PROD-1', 'USER-1', 'ORD-123', 0)
    const errors = request.validate()

    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('quantity')
  })

  it('should reject with invalid timeoutSeconds', async () => {
    const request = new LockInventoryRequest('PROD-1', 'USER-1', 'ORD-123', 5, -1)
    const errors = request.validate()

    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('timeoutSeconds')
  })
})
