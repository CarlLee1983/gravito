import { describe, expect, it } from 'bun:test'
import { IngestData } from '../../../../../src/Application/UseCases/IngestData.ts'
import type { IDataPointRepository } from '../../../../../src/Domain/Contracts/IAnalyticsRepository'
import type { DataPoint } from '../../../../../src/Domain/Entities/DataPoint'

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
    return this.dataPoints.length
  }

  async deleteByMetric() {}
}

describe('IngestData UseCase', () => {
  it('execute() 寫入事件', async () => {
    const repo = new InMemoryDataPointRepository()
    const useCase = new IngestData(repo)

    const result = await useCase.execute({
      events: [
        { eventName: 'commerce:order-placed', payload: { totalAmount: 1000 } },
        { eventName: 'membership:registered', payload: {} },
      ],
    })

    expect(result.success).toBe(true)
    expect(result.count).toBe(2)
  })

  it('execute() 忽略未知事件', async () => {
    const repo = new InMemoryDataPointRepository()
    const useCase = new IngestData(repo)

    const result = await useCase.execute({
      events: [{ eventName: 'unknown:event', payload: {} }],
    })

    expect(result.success).toBe(true)
    expect(result.count).toBe(1)
  })

  it('execute() 批次寫入事件', async () => {
    const repo = new InMemoryDataPointRepository()
    const useCase = new IngestData(repo)

    const result = await useCase.execute({
      events: [
        { eventName: 'commerce:order-placed', payload: { totalAmount: 1000 } },
        { eventName: 'payment:succeeded', payload: { amount: 1000 } },
        { eventName: 'catalog:product-created', payload: {} },
      ],
    })

    expect(result.count).toBe(3)
  })
})
