import { beforeEach, describe, expect, it } from 'bun:test'
import { PlanetCore } from '@gravito/core'
import { ArrangeShipment } from '../src/Application/UseCases/ArrangeShipment'
import { LogisticsManager } from '../src/Infrastructure/LogisticsManager'
import { AtlasShipmentRepository } from '../src/Infrastructure/Persistence/AtlasShipmentRepository'

// Mock PlanetCore
class MockCore extends PlanetCore {
  constructor() {
    super({} as any) // Pass minimal config
    this.logger = {
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {},
    } as any
    this.config = {
      get: (_key: string, def: any) => def,
    } as any
  }
}

describe('Logistics Satellite', () => {
  let repository: AtlasShipmentRepository
  let manager: LogisticsManager
  let useCase: ArrangeShipment

  beforeEach(() => {
    // Reset singleton if necessary, but here we just instantiate new ones
    repository = new AtlasShipmentRepository()
    manager = new LogisticsManager(new MockCore())
    useCase = new ArrangeShipment(repository, manager)
  })

  it('should arrange a shipment successfully', async () => {
    const input = {
      orderId: 'ORD-123',
      recipientName: 'Test User',
      address: 'Taipei City',
    }

    const result = await useCase.execute(input)

    expect(result.shipmentId).toBeDefined()
    expect(result.trackingNumber).toStartWith('LOC-ORD-123')
    expect(result.status).toBe('shipped')

    // Verify persistence
    const saved = await repository.findById(result.shipmentId)
    expect(saved).toBeDefined()
    expect(saved?.orderId).toBe('ORD-123')
  })

  it('should prevent duplicate shipments for the same order', async () => {
    const input = {
      orderId: 'ORD-DUP',
      recipientName: 'Test User',
      address: 'Taipei City',
    }

    await useCase.execute(input)

    // Second attempt should fail
    try {
      await useCase.execute(input)
      expect(true).toBe(false) // Should not reach here
    } catch (e: any) {
      expect(e.message).toContain('already exists')
    }
  })
})
