/**
 * DeductInventory Use Case 單元測試
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { DeductInventory } from '../src/Application/UseCases/DeductInventory'
import { DeductInventoryRequest } from '../src/Domain/Models'
import type { PlanetCore } from '@gravito/core'

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
    make: () => ({}),
  } as any

  events = {
    dispatch: async () => {},
  } as any

  hooks = {
    addAction: () => {},
  } as any
}

describe('DeductInventory Use Case', () => {
  let useCase: DeductInventory
  let core: MockPlanetCore

  beforeEach(() => {
    core = new MockPlanetCore()
    useCase = new DeductInventory(core as any)
  })

  it('should successfully deduct inventory', async () => {
    const result = await useCase.execute('ORD-123', 'PROD-1', 2)

    expect(result.success).toBe(true)
    expect(result.orderId).toBe('ORD-123')
    expect(result.newStatus).toBe('CONFIRMED')
  })

  it('should reject with invalid orderId', async () => {
    const request = new DeductInventoryRequest('', 'PROD-1', 1)

    try {
      request.validate()
      expect.unreachable('Should have validation errors')
    } catch {
      // Expected
    }
  })

  it('should reject with invalid quantity', async () => {
    const request = new DeductInventoryRequest('ORD-123', 'PROD-1', 0)
    const errors = request.validate()

    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('quantity')
  })

  it('should track order status transition', async () => {
    const result = await useCase.execute('ORD-456', 'PROD-2', 5)

    expect(result.newStatus).toBe('CONFIRMED')
    expect(result.message).toContain('successfully')
  })
})
