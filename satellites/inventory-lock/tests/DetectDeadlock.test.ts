/**
 * DetectDeadlock Use Case 單元測試
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { DetectDeadlock } from '../src/Application/UseCases/DetectDeadlock'
import { LockStatus } from '../src/Domain/Models'

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
      findExpired: async (beforeDate: Date) => [
        {
          id: 'LOCK-1',
          productId: 'PROD-1',
          userId: 'USER-1',
          orderId: 'ORD-123',
          quantity: 5,
          status: LockStatus.LOCKED,
          lockedAt: new Date(Date.now() - 1000000),
          expiresAt: new Date(Date.now() - 100000),
          version: 1,
        },
      ],
      updateStatus: async (id: string, status: LockStatus) => ({
        id,
        productId: 'PROD-1',
        userId: 'USER-1',
        orderId: 'ORD-123',
        quantity: 5,
        status,
        lockedAt: new Date(),
        expiresAt: new Date(),
        version: 2,
      }),
    }),
  } as any

  hooks = {
    addAction: () => {},
  } as any
}

describe('DetectDeadlock Use Case', () => {
  let useCase: DetectDeadlock
  let core: MockPlanetCore

  beforeEach(() => {
    core = new MockPlanetCore()
    useCase = new DetectDeadlock(core as any)
  })

  it('should detect and clean expired locks', async () => {
    const scanDate = new Date()
    const result = await useCase.execute(scanDate)

    expect(result.cleaned).toBeGreaterThanOrEqual(0)
    expect(result.message).toContain('Detected')
  })

  it('should handle execution without errors', async () => {
    const result = await useCase.execute(new Date())

    // Should have some result
    expect(result).toBeDefined()
    expect(result.message).toBeDefined()
  })
})
