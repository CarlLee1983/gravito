/**
 * ReleaseInventory Use Case 單元測試
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { ReleaseInventory } from '../src/Application/UseCases/ReleaseInventory'
import { LockStatus, ReleaseLockRequest } from '../src/Domain/Models'

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
      findById: async (id: string) => ({
        id,
        productId: 'PROD-1',
        userId: 'USER-1',
        orderId: 'ORD-123',
        quantity: 5,
        status: LockStatus.LOCKED,
        lockedAt: new Date(),
        expiresAt: new Date(Date.now() + 900000),
        version: 1,
      }),
      updateStatus: async (id: string, status: LockStatus) => ({
        id,
        productId: 'PROD-1',
        userId: 'USER-1',
        orderId: 'ORD-123',
        quantity: 5,
        status,
        lockedAt: new Date(),
        expiresAt: new Date(Date.now() + 900000),
        releasedAt: new Date(),
        version: 2,
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

describe('ReleaseInventory Use Case', () => {
  let useCase: ReleaseInventory
  let core: MockPlanetCore

  beforeEach(() => {
    core = new MockPlanetCore()
    useCase = new ReleaseInventory(core as any)
  })

  it('should successfully release inventory', async () => {
    const request = new ReleaseLockRequest('LOCK-123', 'User requested release')
    const result = await useCase.execute(request)

    expect(result).toBeDefined()
    expect(result?.status).toBe(LockStatus.RELEASED)
    expect(result?.releasedAt).toBeDefined()
  })

  it('should reject with invalid lockId', async () => {
    const request = new ReleaseLockRequest('', 'Test release')
    const errors = request.validate()

    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('lockId')
  })

  it('should reject with empty reason', async () => {
    const request = new ReleaseLockRequest('LOCK-123', '')
    const errors = request.validate()

    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('reason')
  })
})
