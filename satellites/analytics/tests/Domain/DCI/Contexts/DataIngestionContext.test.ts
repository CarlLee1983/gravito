import { describe, expect, it } from 'bun:test'
import type { IDataPointRepository } from '../../../../src/Domain/Contracts/IAnalyticsRepository'
import { DataIngestionContext } from '../../../../src/Domain/DCI/Contexts/DataIngestionContext'
import type { DataPoint } from '../../../../src/Domain/Entities/DataPoint'

class InMemoryDataPointRepository implements IDataPointRepository {
  private dataPoints: DataPoint[] = []

  async save(dataPoint: DataPoint): Promise<void> {
    this.dataPoints.push(dataPoint)
  }

  async saveBatch(dataPoints: DataPoint[]): Promise<void> {
    this.dataPoints.push(...dataPoints)
  }

  async findByMetric() {
    return []
  }

  async findByMetricAndDimensions() {
    return []
  }

  async count() {
    return 0
  }

  async deleteByMetric() {}

  getAll(): DataPoint[] {
    return this.dataPoints
  }
}

describe('DataIngestionContext', () => {
  it('ingestEvent() commerce:order-placed', async () => {
    const repo = new InMemoryDataPointRepository()
    const ctx = new DataIngestionContext(repo)
    await ctx.ingestEvent({
      eventName: 'commerce:order-placed',
      payload: { totalAmount: 10000 },
    })
    expect(repo.getAll()).toHaveLength(2) // order_count + revenue
  })

  it('ingestEvent() membership:registered', async () => {
    const repo = new InMemoryDataPointRepository()
    const ctx = new DataIngestionContext(repo)
    await ctx.ingestEvent({
      eventName: 'membership:registered',
      payload: {},
    })
    expect(repo.getAll()).toHaveLength(1) // signups
  })

  it('ingestEvent() payment:succeeded', async () => {
    const repo = new InMemoryDataPointRepository()
    const ctx = new DataIngestionContext(repo)
    await ctx.ingestEvent({
      eventName: 'payment:succeeded',
      payload: { amount: 50000 },
    })
    expect(repo.getAll()).toHaveLength(2) // transactions + success_amount
  })

  it('ingestEvent() 未知事件被忽略', async () => {
    const repo = new InMemoryDataPointRepository()
    const ctx = new DataIngestionContext(repo)
    await ctx.ingestEvent({
      eventName: 'unknown:event',
      payload: {},
    })
    expect(repo.getAll()).toHaveLength(0)
  })

  it('ingestBatch() 批次寫入', async () => {
    const repo = new InMemoryDataPointRepository()
    const ctx = new DataIngestionContext(repo)
    await ctx.ingestBatch([
      { eventName: 'commerce:order-placed', payload: { totalAmount: 1000 } },
      { eventName: 'membership:registered', payload: {} },
      { eventName: 'payment:succeeded', payload: { amount: 5000 } },
    ])
    expect(repo.getAll().length).toBeGreaterThan(0)
  })

  it('ingestEvent() 記錄正確的 source', async () => {
    const repo = new InMemoryDataPointRepository()
    const ctx = new DataIngestionContext(repo)
    await ctx.ingestEvent({
      eventName: 'commerce:order-placed',
      payload: { totalAmount: 1000 },
    })
    const points = repo.getAll()
    expect(points.every((p) => p.source === 'commerce:order-placed')).toBe(true)
  })

  it('ingestEvent() 自定義時間戳', async () => {
    const repo = new InMemoryDataPointRepository()
    const ctx = new DataIngestionContext(repo)
    const customTime = new Date('2026-02-15T10:00:00Z')
    await ctx.ingestEvent({
      eventName: 'commerce:order-placed',
      payload: { totalAmount: 1000 },
      timestamp: customTime,
    })
    const points = repo.getAll()
    expect(points.every((p) => p.timestamp.getTime() === customTime.getTime())).toBe(true)
  })

  it('ingestEvent() commerce:order-refunded', async () => {
    const repo = new InMemoryDataPointRepository()
    const ctx = new DataIngestionContext(repo)
    await ctx.ingestEvent({
      eventName: 'commerce:order-refunded',
      payload: { refundAmount: 5000 },
    })
    expect(repo.getAll()).toHaveLength(2) // refund_count + refund_amount
  })

  it('ingestEvent() catalog:product-created', async () => {
    const repo = new InMemoryDataPointRepository()
    const ctx = new DataIngestionContext(repo)
    await ctx.ingestEvent({
      eventName: 'catalog:product-created',
      payload: {},
    })
    expect(repo.getAll()).toHaveLength(1) // new_products
  })
})
